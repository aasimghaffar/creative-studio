<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Exceptions\HttpException;
use App\Exceptions\ValidationException;
use App\Repositories\CreditRepository;
use App\Services\AI\GoogleAIService;
use App\Services\BillingService;
use App\Services\NotificationService;

/**
 * Image Description — image IN, text OUT. Reuses the ai_tools row
 * (slug image-description) for enable/credits/admin config and the
 * shared credit ledger, but skips file storage: the result is text,
 * stored on the generation row's options JSON.
 */
final class AiDescribeController extends Controller
{
    private const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

    /** GET /api/v1/ai/image-description/config */
    public function config(Request $request): Response
    {
        $tool = $this->tool();
        $credits = new CreditRepository();

        return Response::success([
            'tool' => [
                'credits_per_generation' => (int) $tool['credits_per_generation'],
                'prompt_limit'           => 500,
                'upload_support'         => true,
            ],
            'credits_balance' => $credits->balance((int) $this->user($request)['id']),
        ]);
    }

    /** POST /api/v1/ai/image-description/generate  { image: base64, mime, note? } */
    public function describe(Request $request): Response
    {
        $userId = (int) $this->user($request)['id'];
        $tool = $this->tool();

        $base64 = trim((string) $request->input('image', ''));
        $mime = strtolower(trim((string) $request->input('mime', '')));
        $note = mb_substr(trim(strip_tags((string) $request->input('note', ''))), 0, 500);

        if ($base64 === '' || base64_decode($base64, true) === false) {
            throw new ValidationException(['image' => ['Upload a valid image.']]);
        }
        if (strlen((string) base64_decode($base64, true)) > self::MAX_IMAGE_BYTES) {
            throw new ValidationException(['image' => ['Images up to 8 MB are supported.']]);
        }
        if (!in_array($mime, ['image/png', 'image/jpeg', 'image/webp'], true)) {
            throw new ValidationException(['image' => ['Only PNG, JPG, or WEBP images are supported.']]);
        }

        $credits = new CreditRepository();
        $billing = new BillingService();
        $cost = $billing->isUnlimited($userId) ? 0 : (int) $tool['credits_per_generation'];
        if ($cost > 0) {
            $credits->spend($userId, $cost, null, 'Image Description');
        }

        $db = Database::connection();
        $db->prepare(
            "INSERT INTO ai_generations
                (user_id, tool_id, prompt, status, credits_used, started_at, created_at)
             VALUES (:user_id, :tool_id, :prompt, 'processing', :credits, NOW(), NOW())",
        )->execute([
            'user_id' => $userId,
            'tool_id' => (int) $tool['id'],
            'prompt'  => $note !== '' ? $note : 'Describe this image',
            'credits' => $cost,
        ]);
        $generationId = (int) $db->lastInsertId();

        try {
            $config = $this->geminiConfig();
            $instructions = 'Describe this image in clear, useful detail: subject, style, colors, '
                . 'composition, mood, and any text visible.'
                . ($note !== '' ? ' Focus on: ' . $note : '');
            $description = (new GoogleAIService())->describeImage($base64, $mime, $instructions, $config);
        } catch (\Throwable $e) {
            $db->prepare(
                "UPDATE ai_generations SET status = 'failed', error_message = :err, completed_at = NOW() WHERE id = :id",
            )->execute(['err' => mb_substr($e->getMessage(), 0, 255), 'id' => $generationId]);
            if ($cost > 0) {
                $credits->refund($userId, $cost, $generationId, 'Image Description failed — refunded');
            }
            throw $e instanceof HttpException ? $e : new HttpException(502, 'Description failed: ' . $e->getMessage());
        }

        $db->prepare(
            "UPDATE ai_generations
             SET status = 'completed', options = :options, completed_at = NOW()
             WHERE id = :id",
        )->execute([
            'options' => json_encode(['description' => mb_substr($description, 0, 4000)]),
            'id'      => $generationId,
        ]);

        (new NotificationService())->generation($userId, 'Image described', 'Your image description is ready.');

        return Response::success([
            'generation_id'   => $generationId,
            'description'     => $description,
            'credits_used'    => $cost,
            'credits_balance' => $credits->balance($userId),
        ]);
    }

    /** GET /api/v1/ai/image-description/history */
    public function history(Request $request): Response
    {
        $tool = $this->tool();
        $stmt = Database::connection()->prepare(
            'SELECT id, prompt, options, status, credits_used, created_at
             FROM ai_generations
             WHERE user_id = :user_id AND tool_id = :tool_id
             ORDER BY id DESC LIMIT 20',
        );
        $stmt->execute(['user_id' => (int) $this->user($request)['id'], 'tool_id' => (int) $tool['id']]);

        return Response::success(['history' => array_map(static function (array $row): array {
            $options = json_decode((string) ($row['options'] ?? ''), true) ?? [];

            return [
                'id'           => (int) $row['id'],
                'prompt'       => (string) $row['prompt'],
                'description'  => (string) ($options['description'] ?? ''),
                'status'       => (string) $row['status'],
                'credits_used' => (int) $row['credits_used'],
                'created_at'   => (string) $row['created_at'],
            ];
        }, $stmt->fetchAll())]);
    }

    /** DELETE /api/v1/ai/image-description/{id} */
    public function destroy(Request $request): Response
    {
        $tool = $this->tool();
        $stmt = Database::connection()->prepare(
            'DELETE FROM ai_generations WHERE id = :id AND user_id = :user_id AND tool_id = :tool_id',
        );
        $stmt->execute([
            'id'      => (int) $request->param('id'),
            'user_id' => (int) $this->user($request)['id'],
            'tool_id' => (int) $tool['id'],
        ]);

        return Response::success(null, 'Deleted.');
    }

    /** @return array<string, mixed> */
    private function tool(): array
    {
        $stmt = Database::connection()->prepare("SELECT * FROM ai_tools WHERE slug = 'image-description' LIMIT 1");
        $stmt->execute();
        $tool = $stmt->fetch();
        if ($tool === false || $tool['status'] !== 'live') {
            throw new HttpException(403, 'Image Description is not live yet.');
        }

        return $tool;
    }

    /** @return array<string, mixed> Gemini row config (env-fallback key). */
    private function geminiConfig(): array
    {
        $row = Database::connection()->query("SELECT * FROM ai_providers WHERE slug = 'gemini' LIMIT 1")->fetch() ?: [];
        $apiKey = trim((string) ($row['api_key'] ?? ''));
        if ($apiKey === '') {
            $apiKey = \App\Config\Config::get('GOOGLE_AI_API_KEY');
        }
        if ($apiKey === '') {
            throw new HttpException(409, 'Image Description needs the Gemini provider key (Admin → AI Providers).');
        }

        // Deliberately NOT inheriting the row's model (it holds the
        // IMAGE-GENERATION model). Empty model = the service walks its
        // ladder of current vision-capable text models.
        return ['api_key' => $apiKey, 'model' => '', 'timeout_sec' => (int) ($row['timeout_sec'] ?? 60)];
    }
}
