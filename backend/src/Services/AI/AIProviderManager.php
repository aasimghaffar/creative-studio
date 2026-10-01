<?php

declare(strict_types=1);

namespace App\Services\AI;

use App\Config\Config;
use App\Core\Logger;
use App\Exceptions\HttpException;
use App\Repositories\AiProviderRepository;

/**
 * The one place provider selection happens.
 *
 * Loads ENABLED providers from the database, ordered by priority, and
 * tries them one by one: invalid keys, quota/rate limits, timeouts, and
 * server errors all trigger automatic fallback to the next provider.
 * Stops at the first success. The caller (and the frontend) never learns
 * which provider produced the image.
 */
final class AIProviderManager
{
    /** @var array<string, class-string<AIProviderInterface>> */
    private const PROVIDERS = [
        'gemini'       => GoogleAIService::class,
        'flux'         => FluxAIService::class,
        'pollinations' => PollinationsAIService::class,
    ];

    public function __construct(
        private readonly AiProviderRepository $providers = new AiProviderRepository(),
    ) {
    }

    /** @return array{mime: string, data: string} */
    public function generateImage(string $prompt, string $aspectRatio, ?int $timeoutSec = null): array
    {
        $rows = $this->providers->enabledByPriority();

        if ($rows === []) {
            throw new HttpException(503, 'No AI providers are enabled. Ask an administrator to enable one.');
        }

        $lastError = null;

        $failures = [];
        foreach ($rows as $row) {
            $provider = $this->resolve((string) $row['slug']);
            if ($provider === null) {
                continue; // Unknown slug in DB — skip, never crash the chain.
            }

            try {
                $result = $provider->generateImage($prompt, $aspectRatio, $this->config($row, $timeoutSec));

                // Record the REAL runtime outcome.
                $this->providers->recordStatus((int) $row['id'], true, null);
                Logger::channel('ai')->info('Provider served the request', [
                    'provider' => (string) $row['slug'],
                    'priority' => (int) $row['priority'],
                ]);

                return $result;
            } catch (HttpException $e) {
                $lastError = $e;
                $failures[] = ucfirst((string) $row['slug']) . ': ' . $e->getMessage();
                $this->providers->recordStatus((int) $row['id'], false, $e->getMessage());
                Logger::channel('ai')->warning('Provider failed — falling back', [
                    'provider' => $row['slug'],
                    'priority' => (int) $row['priority'],
                    'error'    => $e->getMessage(),
                ]);
                // Try the next enabled provider.
            }
        }

        Logger::channel('ai')->error('All providers failed', [
            'tried' => array_map(static fn (array $r): string => (string) $r['slug'], $rows),
        ]);

        // Surface the REAL provider responses — no generic mask. Credits
        // are still refunded by the engine on failure.
        $detail = $failures === []
            ? 'No AI provider is enabled.'
            : implode(' | ', $failures);

        throw new HttpException(502, 'All providers failed — ' . $detail . ' (Your credits were not lost.)');
    }

    /** @return array{ok: bool, message: string} Real connectivity test for one provider row. */
    public function testProvider(array $row): array
    {
        $provider = $this->resolve((string) $row['slug']);
        if ($provider === null) {
            return ['ok' => false, 'message' => 'Unknown provider.'];
        }

        return $provider->testConnection($this->config($row));
    }

    private function resolve(string $slug): ?AIProviderInterface
    {
        $class = self::PROVIDERS[$slug] ?? null;

        return $class === null ? null : new $class();
    }

    /**
     * @param array<string, mixed> $row
     * @param int|null             $timeoutSec Per-tool override — the tool's
     *                             configured timeout wins over the provider default.
     *
     * @return array<string, mixed>
     */
    private function config(array $row, ?int $timeoutSec = null): array
    {
        $apiKey = trim((string) ($row['api_key'] ?? ''));

        // Migration convenience: Gemini falls back to the .env key when the
        // DB field is empty, so existing installs keep working untouched.
        if ($apiKey === '' && $row['slug'] === 'gemini') {
            $apiKey = Config::get('GOOGLE_AI_API_KEY');
        }

        return [
            'api_key'     => $apiKey,
            'model'       => (string) ($row['model'] ?? ''),
            'timeout_sec' => $timeoutSec !== null && $timeoutSec >= 10
                ? $timeoutSec
                : (int) ($row['timeout_sec'] ?? 120),
        ];
    }
}
