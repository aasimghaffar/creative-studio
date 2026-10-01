<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Logger;
use App\Exceptions\HttpException;
use App\Exceptions\ValidationException;
use App\Repositories\AiToolRepository;
use App\Repositories\CreditRepository;
use App\Repositories\GenerationRepository;
use App\Repositories\UserRepository;
use App\Services\AI\AIProviderManager;

/**
 * The reusable generation engine — the template for EVERY image tool.
 *
 * Flow: load tool config -> validate input against it -> reserve credits ->
 * record the generation -> call Google AI once per image -> store files ->
 * write history -> return URLs (+ new balance). Failures refund credits.
 *
 * A future tool (avatar, tattoo, image, flyer, interior) is: a seeded
 * ai_tools row + a prompt recipe in buildPrompt() + a 10-line controller.
 */
final class AiGenerationService
{
    public function __construct(
        private readonly AiToolRepository $tools = new AiToolRepository(),
        private readonly GenerationRepository $generations = new GenerationRepository(),
        private readonly CreditRepository $credits = new CreditRepository(),
        private readonly UserRepository $users = new UserRepository(),
        private readonly AIProviderManager $providers = new AIProviderManager(),
        private readonly ImageStorageService $storage = new ImageStorageService(),
    ) {
    }

    /**
     * @param array<string, mixed> $input Validated request input.
     *
     * @return array<string, mixed>
     */
    public function generate(int $userId, string $toolSlug, array $input): array
    {
        $tool = $this->tools->findBySlug($toolSlug);
        if ($tool === null || $tool['status'] !== 'live') {
            // Rejected BEFORE credits, provider calls, or history rows.
            throw new HttpException(403, 'This tool is currently unavailable.');
        }

        // Upload support is a per-tool switch: reject reference images at
        // the door when the tool doesn't accept them.
        $referenceImages = $input['images'] ?? $input['reference_images'] ?? [];
        if (!(bool) $tool['upload_support'] && $referenceImages !== [] && $referenceImages !== null) {
            throw new HttpException(422, 'This tool does not accept reference images.');
        }

        $input = $this->sanitize($input, (int) $tool['prompt_limit']);

        $quantity = (int) $input['quantity'];

        $settings = new \App\Repositories\PlatformSettingRepository();

        // Security: verified email required before generating (admin toggle).
        if ($settings->getBool('require_email_verification', false)) {
            $account = $this->users->findById($userId);
            if ($account !== null && ($account['email_verified_at'] ?? null) === null) {
                throw new HttpException(403, 'Please verify your email address before generating.');
            }
        }

        // Per-user storage/file caps from the global upload rules.
        (new \App\Services\Storage\StorageManager())->enforceUserLimits($userId, 0, $quantity);

        // Unlimited plans bypass credit deduction and the daily limit.
        $unlimited = (new BillingService())->isUnlimited($userId);
        $cost = $unlimited ? 0 : (int) $tool['credits_per_generation'] * $quantity;

        // Daily credit limit (0 = no limit) — checked before anything is charged.
        $dailyLimit = $settings->getInt('daily_credit_limit', 0);
        if (!$unlimited && $dailyLimit > 0 && $this->credits->spentToday($userId) + $cost > $dailyLimit) {
            throw new HttpException(429, 'Daily credit limit reached. Try again tomorrow or ask an admin to raise the limit.');
        }

        // Reserve credits up front (row-locked); refunded on failure below.
        $balance = $cost > 0
            ? $this->credits->spend($userId, $cost, null, $tool['name'] . ' — ' . $quantity . ' image(s)')
            : $this->credits->balance($userId);

        // Low-credits warning email: only on crossing below the threshold.
        if ($cost > 0 && $balance < 10 && ($balance + $cost) >= 10) {
            $owner = $this->users->findById($userId);
            if ($owner !== null) {
                (new \App\Services\Mail\MailService())->sendTemplate('low_credits', (string) $owner['email'], [
                    'name'    => (string) $owner['name'],
                    'credits' => $balance,
                ]);
            }
        }

        $generationId = $this->generations->createGeneration($userId, (int) $tool['id'], $input, $cost);

        $images = [];

        try {
            $prompt = $this->buildPrompt($toolSlug, $input);

            for ($i = 0; $i < $quantity; $i++) {
                // Transient provider hiccups (rate limits, gateway blips)
                // get ONE retry after a short pause before failing the
                // whole batch — the top cause of sporadic
                // "Generation Failed" reports.
                try {
                    $result = $this->providers->generateImage($prompt, (string) $input['ratio'], (int) $tool['timeout_sec']);
                } catch (\Throwable $transient) {
                    Logger::channel('ai')->warning('Generation attempt failed — retrying once', ['error' => $transient->getMessage()]);
                    usleep(1500000);
                    $result = $this->providers->generateImage($prompt, (string) $input['ratio'], (int) $tool['timeout_sec']);
                }
                $saved = $this->storage->saveBase64($toolSlug, $result['data'], $result['mime']);
                $ext = pathinfo($saved['path'], PATHINFO_EXTENSION) ?: 'png';
                $fileId = $this->generations->createFile($userId, $generationId, (string) $tool['name'], $saved, $ext);

                $images[] = [
                    'file_id' => $fileId,
                    'url'     => $saved['url'],
                    'path'    => $saved['path'],
                ];
            }
        } catch (\Throwable $e) {
            // Full refund, clean failure record, delete any partial files.
            foreach ($images as $image) {
                $this->storage->delete((string) $image['path']);
            }
            $this->generations->markFailed($generationId, $e->getMessage());
            $balance = $cost > 0
                ? $this->credits->refund($userId, $cost, $generationId, 'Auto-refund — generation failed')
                : $this->credits->balance($userId);

            // Generation-failed email (template-gated, failure-safe).
            $owner = $this->users->findById($userId);
            if ($owner !== null) {
                (new \App\Services\Mail\MailService())->sendTemplate('generation_failed', (string) $owner['email'], [
                    'name'    => (string) $owner['name'],
                    'tool'    => (string) $tool['name'],
                    'credits' => $cost,
                ]);
            }
            (new NotificationService())->credits(
                $userId,
                'Credits refunded',
                sprintf('%d credits were returned — the %s generation failed.', $cost, $tool['name']),
            );

            Logger::channel('ai')->error('Generation failed', [
                'generation_id' => $generationId,
                'tool'          => $toolSlug,
                'error'         => $e->getMessage(),
            ]);

            throw $e instanceof HttpException
                ? $e
                : new HttpException(502, 'AI generation failed. Your credits were refunded.');
        }

        $this->generations->markCompleted($generationId);
        $historyId = $this->generations->createHistory(
            $userId,
            $generationId,
            (int) $tool['id'],
            $input,
            $cost,
            (string) ($images[0]['url'] ?? ''),
        );

        Logger::channel('ai')->info('Generation completed', [
            'generation_id' => $generationId,
            'tool'          => $toolSlug,
            'images'        => count($images),
        ]);

        $notifier = new NotificationService();
        $notifier->generation(
            $userId,
            sprintf('%s generated successfully', $tool['name']),
            sprintf('%d image(s) are ready in your history and files.', count($images)),
            ['generation_id' => $generationId, 'history_id' => $historyId, 'tool' => $toolSlug],
        );
        $notifier->credits(
            $userId,
            'Credits deducted',
            sprintf('%d credits used for %s. Balance: %d.', $cost, $tool['name'], $balance),
        );

        return [
            'generation_id'   => $generationId,
            'history_id'      => $historyId,
            'tool'            => $toolSlug,
            'prompt'          => $input['prompt'],
            'style'           => $input['style'],
            'color'           => $input['color'],
            'ratio'           => $input['ratio'],
            'credits_used'    => $cost,
            'credits_balance' => $balance,
            'images'          => array_map(
                static fn (array $img): array => ['file_id' => $img['file_id'], 'url' => $img['url']],
                $images,
            ),
        ];
    }

    /** @return array<string, mixed> */
    public function config(string $toolSlug): array
    {
        $tool = $this->tools->findBySlug($toolSlug);
        if ($tool === null) {
            throw new HttpException(404, 'Unknown tool.');
        }

        return [
            'slug'                   => $tool['slug'],
            'name'                   => $tool['name'],
            'status'                 => $tool['status'],
            'credits_per_generation' => (int) $tool['credits_per_generation'],
            'prompt_limit'           => (int) $tool['prompt_limit'],
            'upload_support'         => (bool) $tool['upload_support'],
            'max_upload_mb'          => (int) $tool['max_upload_mb'],
            'allowed_types'          => $tool['allowed_types'],
        ];
    }

    /** @return list<array<string, mixed>> */
    public function history(int $userId, string $toolSlug): array
    {
        $tool = $this->tools->findBySlug($toolSlug);
        if ($tool === null) {
            throw new HttpException(404, 'Unknown tool.');
        }

        return array_map(
            fn (array $row): array => $this->withImages($row),
            $this->generations->listHistory($userId, (int) $tool['id']),
        );
    }

    /** Decode the aggregated files into ready-to-render image URLs. */
    private function withImages(array $row): array
    {
        $favIds = array_filter(array_map('intval', explode(',', (string) ($row['fav_file_ids'] ?? ''))));
        $images = [];
        $concat = (string) ($row['files_concat'] ?? '');
        if ($concat !== '') {
            foreach (explode('||', $concat) as $pair) {
                [$fileId, $path] = array_pad(explode('|', $pair, 2), 2, '');
                if ($path !== '') {
                    $images[] = [
                        'file_id'  => (int) $fileId,
                        'url'      => $this->storage->toUrl($path),
                        'favorite' => in_array((int) $fileId, $favIds, true),
                    ];
                }
            }
        }
        unset($row['files_concat'], $row['fav_file_ids']);
        $row['images'] = $images;

        return $row;
    }

    /** @return array<string, mixed> History entry + all its image files. */
    public function detail(int $userId, int $historyId): array
    {
        $row = $this->requireOwned($historyId, $userId);
        $files = $this->generations->filesForGeneration((int) $row['generation_id']);

        $row['images'] = array_map(fn (array $f): array => [
            'file_id' => (int) $f['id'],
            'name'    => $f['name'] . '.' . $f['ext'],
            'url'     => $this->storage->toUrl((string) $f['storage_path']),
            'size'    => (int) $f['size_bytes'],
        ], $files);

        return $row;
    }

    public function setFavorite(int $userId, int $historyId, bool $favorite, ?int $fileId = null): void
    {
        $row = $this->requireOwned($historyId, $userId);

        // File-level favorites: each generated image favorites on its own.
        $favorites = new \App\Repositories\FavoriteRepository();
        if ($favorite) {
            $favorites->addImage($userId, (int) $row['generation_id'], (int) $row['tool_id'], $fileId);
        } else {
            $favorites->removeImage($userId, (int) $row['generation_id'], $fileId);
        }

        // The history flag reflects "any draft of this run is favorited".
        $this->generations->setFavorite(
            $historyId,
            $favorites->generationHasFavorites($userId, (int) $row['generation_id']),
        );
    }

    public function delete(int $userId, int $historyId): void
    {
        $row = $this->requireOwned($historyId, $userId);

        foreach ($this->generations->filesForGeneration((int) $row['generation_id']) as $file) {
            $this->storage->delete((string) $file['storage_path']);
        }

        (new \App\Repositories\FavoriteRepository())->removeImage($userId, (int) $row['generation_id']);
        $this->generations->deleteGeneration((int) $row['generation_id'], $historyId);
    }

    /** Re-run a past generation with its original settings. */
    /** @return array<string, mixed> */
    public function regenerate(int $userId, string $toolSlug, int $historyId): array
    {
        $row = $this->requireOwned($historyId, $userId);

        return $this->generate($userId, $toolSlug, [
            'prompt'          => (string) $row['prompt'],
            'negative_prompt' => $row['negative_prompt'] ?? '',
            'template'        => (string) ($row['template'] ?? ''),
            'style'           => (string) ($row['style'] ?? ''),
            'color'           => (string) ($row['color'] ?? '#B8823C'),
            'colors'          => $row['colors'] !== null && $row['colors'] !== '' ? explode(',', (string) $row['colors']) : [],
            'options'         => $row['options'] !== null && $row['options'] !== '' ? (json_decode((string) $row['options'], true) ?? []) : [],
            'ratio'           => (string) ($row['ratio'] ?? '1:1'),
            'quantity'        => (int) ($row['quantity'] ?? 1),
            'quality'         => (string) ($row['quality'] ?? 'Standard'),
        ]);
    }

    /* ---------------- internals ---------------- */

    /** @return array<string, mixed> */
    private function requireOwned(int $historyId, int $userId): array
    {
        $row = $this->generations->findHistoryForUser($historyId, $userId);
        if ($row === null) {
            throw new HttpException(404, 'Generation not found.');
        }

        return $row;
    }

    /**
     * @param array<string, mixed> $input
     *
     * @return array<string, mixed> Sanitized, defaulted input.
     */
    private function sanitize(array $input, int $promptLimit): array
    {
        $prompt = trim(strip_tags((string) ($input['prompt'] ?? '')));
        if ($prompt === '') {
            throw new ValidationException(['prompt' => ['Describe what you want to generate.']]);
        }
        if ($promptLimit > 0 && mb_strlen($prompt) > $promptLimit) {
            throw new ValidationException(['prompt' => [sprintf('Prompt must be at most %d characters.', $promptLimit)]]);
        }

        $quantity = (int) ($input['quantity'] ?? 1);
        if ($quantity < 1 || $quantity > 4) {
            throw new ValidationException(['quantity' => ['Quantity must be between 1 and 4.']]);
        }

        $ratio = (string) ($input['ratio'] ?? '1:1');
        if (!in_array($ratio, ['1:1', '16:9', '4:5', '3:2', '9:16'], true)) {
            $ratio = '1:1';
        }

        // Brand colors: multi-select, up to 3, valid hex only, de-duplicated.
        // Tools with a single-color picker send 'color'; fold it in.
        $rawColors = (array) ($input['colors'] ?? []);
        if ($rawColors === [] && isset($input['color'])) {
            $rawColors = [(string) $input['color']];
        }
        $colors = [];
        foreach ($rawColors as $candidate) {
            $candidate = trim((string) $candidate);
            if (preg_match('/^#[0-9a-fA-F]{6}$/', $candidate) && !in_array($candidate, $colors, true)) {
                $colors[] = $candidate;
            }
        }
        if (count($colors) > 3) {
            throw new ValidationException(['colors' => ['Select up to 3 brand colors.']]);
        }

        $quality = trim((string) ($input['quality'] ?? 'Standard'));
        if (!in_array($quality, ['Draft', 'Standard', 'High'], true)) {
            $quality = 'Standard';
        }

        return [
            'prompt'          => $prompt,
            'negative_prompt' => trim(strip_tags((string) ($input['negative_prompt'] ?? ''))),
            'template'        => mb_substr(trim(strip_tags((string) ($input['template'] ?? ''))), 0, 80),
            'style'           => mb_substr(trim(strip_tags((string) ($input['style'] ?? ''))), 0, 80),
            'colors'          => $colors,
            'color'           => $colors[0] ?? null,   // history thumbnails
            'ratio'           => $ratio,
            'quantity'        => $quantity,
            'quality'         => $quality,
            'transparent'     => (bool) ($input['transparent'] ?? false),
            'options'         => $this->sanitizeOptions($input),
        ];
    }

    /**
     * Tool-specific extras (avatar framing/expression, tattoo placement/
     * line weight, …). Whitelisted keys only, short strings only.
     *
     * @param array<string, mixed> $input
     *
     * @return array<string, string>
     */
    private function sanitizeOptions(array $input): array
    {
        $options = [];
        foreach (['framing', 'expression', 'placement', 'line_weight'] as $key) {
            $value = mb_substr(trim(strip_tags((string) ($input[$key] ?? ''))), 0, 40);
            if ($value !== '') {
                $options[$key] = $value;
            }
        }

        return $options;
    }

    /** Friendly names for the studio palette; unknown hexes stay as hex. */
    private const COLOR_NAMES = [
        '#B8823C' => 'Brass',
        '#4C9186' => 'Teal',
        '#8C6329' => 'Bronze',
        '#5B584E' => 'Slate',
        '#C9A45C' => 'Gold',
        '#3A5A54' => 'Pine',
    ];

    /**
     * Per-tool prompt recipes — the ONLY place the final AI prompt is
     * built. The frontend sends raw selections and never concatenates.
     *
     * @param array<string, mixed> $input
     */
    private function buildPrompt(string $toolSlug, array $input): string
    {
        $colorNames = array_map(
            static fn (string $hex): string => self::COLOR_NAMES[strtoupper($hex)] ?? self::COLOR_NAMES[$hex] ?? $hex,
            (array) $input['colors'],
        );
        $options = (array) ($input['options'] ?? []);

        $sections = [];
        $push = static function (string $label, string $value) use (&$sections): void {
            if (trim($value) !== '') {
                $sections[] = $label . ":\n" . trim($value);
            }
        };

        switch ($toolSlug) {
            case 'logo':
                $sections[] = 'Create a professional logo.';
                $push('Company Description', (string) $input['prompt']);
                $push('Template', (string) $input['template']);
                $push('Style', (string) $input['style']);
                $push('Preferred Brand Colors', implode(', ', $colorNames));
                $push('Aspect Ratio', (string) $input['ratio']);
                $push('Background', ($input['transparent'] ?? false) ? 'Transparent' : 'Solid');
                $push('Quality', (string) $input['quality']);
                $push('Negative Prompt', (string) $input['negative_prompt']);
                $sections[] = 'Flat vector style, clean shapes, centered composition, suitable for a brand identity. '
                    . 'No photograph, no text unless the name is part of the brief.';
                break;

            case 'avatar':
                $sections[] = 'Create a portrait avatar.';
                $push('Person Description', (string) $input['prompt']);
                $push('Art Style', (string) $input['style']);
                $push('Framing', (string) ($options['framing'] ?? ''));
                $push('Expression', (string) ($options['expression'] ?? ''));
                $push('Color Palette', implode(', ', $colorNames));
                $push('Aspect Ratio', (string) $input['ratio']);
                $push('Quality', (string) $input['quality']);
                $push('Negative Prompt', (string) $input['negative_prompt']);
                $sections[] = 'Single subject, centered head and shoulders, clean simple background, '
                    . 'suitable as a profile picture. No text, no watermark.';
                break;

            case 'tattoo':
                $sections[] = 'Create a tattoo design.';
                $push('Design Description', (string) $input['prompt']);
                $push('Tattoo Style', (string) $input['style']);
                $push('Body Placement', (string) ($options['placement'] ?? ''));
                $push('Line Weight', (string) ($options['line_weight'] ?? ''));
                $push('Ink Color', implode(', ', $colorNames));
                $push('Aspect Ratio', (string) $input['ratio']);
                $push('Quality', (string) $input['quality']);
                $push('Negative Prompt', (string) $input['negative_prompt']);
                $sections[] = 'Clean linework on a plain white background, presented as tattoo flash art. '
                    . 'The design only — no body, no skin, no photograph, no watermark.';
                break;

            case 'image':
                $sections[] = 'Create a high-quality image.';
                $push('Image Description', (string) $input['prompt']);
                $push('Style', (string) $input['style']);
                $push('Color Palette', implode(', ', $colorNames));
                $push('Aspect Ratio', (string) $input['ratio']);
                $push('Quality', (string) $input['quality']);
                $push('Negative Prompt', (string) $input['negative_prompt']);
                $sections[] = 'Sharp focus, coherent composition, no watermark, no text overlay '
                    . 'unless the description asks for it.';
                break;

            case 'flyer':
                $sections[] = 'Create a promotional flyer design.';
                $push('Flyer Content', (string) $input['prompt']);
                $push('Design Style', (string) $input['style']);
                $push('Brand Colors', implode(', ', $colorNames));
                $push('Aspect Ratio', (string) $input['ratio']);
                $push('Quality', (string) $input['quality']);
                $push('Negative Prompt', (string) $input['negative_prompt']);
                $sections[] = 'Poster-style layout with clear visual hierarchy, bold headline space, '
                    . 'balanced margins, print-ready composition. Keep any text short and legible.';
                break;

            default:
                return (string) $input['prompt'];
        }

        return implode("\n\n", $sections);
    }
}
