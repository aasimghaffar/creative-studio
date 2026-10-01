<?php

declare(strict_types=1);

namespace App\Services\AI;

use App\Core\Logger;
use App\Exceptions\HttpException;

/**
 * FLUX image provider — served through TOGETHER AI (api.together.xyz).
 * Same service name, same AIProviderInterface contract, same admin row;
 * only the backing API changed from Black Forest Labs to Together AI.
 * The admin "API key" field now takes a Together AI key, and the model
 * field selects which FLUX model Together runs (default FLUX.1-schnell).
 * Together's endpoint is synchronous — no job polling needed.
 */
final class FluxAIService implements AIProviderInterface
{
    private const BASE_URL = 'https://api.together.xyz/v1';
    private const DEFAULT_MODEL = 'black-forest-labs/FLUX.1-schnell';

    private const RATIO_SIZES = [
        '1:1'  => [1024, 1024],
        '16:9' => [1344, 768],
        '9:16' => [768, 1344],
        '4:5'  => [896, 1120],
        '3:2'  => [1216, 832],
        '2:3'  => [832, 1216],
    ];

    public function generateImage(string $prompt, string $aspectRatio, array $config): array
    {
        $apiKey = trim((string) ($config['api_key'] ?? ''));
        if ($apiKey === '') {
            throw new HttpException(500, 'FLUX (Together AI) API key is not configured.');
        }

        $model = trim((string) ($config['model'] ?? '')) ?: self::DEFAULT_MODEL;
        $timeout = max(10, (int) ($config['timeout_sec'] ?? 120));
        [$width, $height] = self::RATIO_SIZES[$aspectRatio] ?? self::RATIO_SIZES['1:1'];

        $started = microtime(true);
        $body = $this->call('POST', '/images/generations', $apiKey, [
            'model'           => $model,
            'prompt'          => $prompt,
            'width'           => $width,
            'height'          => $height,
            'n'               => 1,
            'response_format' => 'b64_json',
        ], $timeout);
        $elapsedMs = (int) round((microtime(true) - $started) * 1000);

        $image = $body['data'][0] ?? [];

        // Preferred: base64 straight from the API.
        $b64 = (string) ($image['b64_json'] ?? '');
        if ($b64 !== '') {
            Logger::channel('ai')->info('FLUX (Together) image generated', [
                'model' => $model, 'elapsed_ms' => $elapsedMs,
            ]);

            return ['mime' => 'image/png', 'data' => $b64];
        }

        // Fallback: some models answer with a URL instead.
        $url = (string) ($image['url'] ?? '');
        if ($url !== '') {
            return $this->download($url, min(60, $timeout));
        }

        throw new HttpException(502, 'FLUX (Together AI) finished without an image.');
    }

    public function testConnection(array $config): array
    {
        $apiKey = trim((string) ($config['api_key'] ?? ''));
        if ($apiKey === '') {
            return ['ok' => false, 'message' => 'No API key set.'];
        }

        // Authenticated probe: list models. Valid key -> 200; bad -> 401.
        $ch = curl_init(self::BASE_URL . '/models');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $apiKey],
            CURLOPT_TIMEOUT        => 20,
            CURLOPT_CONNECTTIMEOUT => 15,
        ]);
        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        if ($raw === false) {
            return ['ok' => false, 'message' => 'Could not reach Together AI.'];
        }
        if ($status === 401 || $status === 403) {
            return ['ok' => false, 'message' => 'Together AI rejected the API key.'];
        }
        if ($status >= 200 && $status < 300) {
            return ['ok' => true, 'message' => 'Connected — Together AI accepted the key (FLUX ready).'];
        }

        return ['ok' => false, 'message' => 'Together AI answered HTTP ' . $status . '.'];
    }

    /**
     * @param array<string, mixed>|null $payload
     *
     * @return array<string, mixed>
     */
    private function call(string $method, string $path, string $apiKey, ?array $payload, int $timeout): array
    {
        $ch = curl_init(self::BASE_URL . $path);
        $options = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $apiKey,
            ],
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_CONNECTTIMEOUT => 15,
        ];
        if ($method === 'POST') {
            $options[CURLOPT_POST] = true;
            $options[CURLOPT_POSTFIELDS] = json_encode($payload, JSON_UNESCAPED_SLASHES);
        }
        curl_setopt_array($ch, $options);

        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $errno = curl_errno($ch);
        curl_close($ch);

        if ($raw === false || $errno !== 0) {
            throw new HttpException(
                504,
                $errno === CURLE_OPERATION_TIMEDOUT ? 'FLUX (Together AI) request timed out.' : 'Could not reach Together AI.',
            );
        }

        /** @var array<string, mixed> $body */
        $body = json_decode((string) $raw, true) ?? [];
        if ($status >= 200 && $status < 300) {
            return $body;
        }

        $message = (string) ($body['error']['message'] ?? $body['message'] ?? 'Unknown Together AI error');
        Logger::channel('ai')->error('FLUX (Together) error', ['http' => $status, 'message' => $message]);

        throw match (true) {
            $status === 401, $status === 403 => new HttpException(500, 'Together AI rejected the API key.'),
            $status === 402, $status === 429 => new HttpException(429, 'Together AI is rate-limited or out of credits.'),
            $status >= 500                    => new HttpException(502, 'Together AI is temporarily unavailable.'),
            default                           => new HttpException(502, 'FLUX (Together AI) generation failed: ' . $message),
        };
    }

    /** @return array{mime: string, data: string} */
    private function download(string $url, int $timeout): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_FOLLOWLOCATION => true,
        ]);
        $bytes = curl_exec($ch);
        $contentType = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        curl_close($ch);

        if ($bytes === false || $bytes === '') {
            throw new HttpException(502, 'Could not download the FLUX image from Together AI.');
        }

        return [
            'mime' => str_contains($contentType, 'jpeg') ? 'image/jpeg' : 'image/png',
            'data' => base64_encode((string) $bytes),
        ];
    }
}
