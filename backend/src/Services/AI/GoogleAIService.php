<?php

declare(strict_types=1);

namespace App\Services\AI;

use App\Core\Logger;
use App\Exceptions\HttpException;

/** Google Gemini image provider (generativelanguage.googleapis.com). */
final class GoogleAIService implements AIProviderInterface
{
    private const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

    public function generateImage(string $prompt, string $aspectRatio, array $config): array
    {
        $apiKey = trim((string) ($config['api_key'] ?? ''));
        if ($apiKey === '') {
            throw new HttpException(500, 'Gemini API key is not configured.');
        }

        $model = (string) ($config['model'] ?: 'gemini-2.5-flash-image');
        $timeout = max(10, (int) ($config['timeout_sec'] ?? 120));

        $body = $this->request(
            'POST',
            self::BASE_URL . '/models/' . $model . ':generateContent',
            $apiKey,
            [
                'contents'         => [['parts' => [['text' => $prompt]]]],
                'generationConfig' => [
                    'responseModalities' => ['IMAGE'],
                    'imageConfig'        => ['aspectRatio' => $aspectRatio],
                ],
            ],
            $timeout,
        );

        foreach ($body['candidates'][0]['content']['parts'] ?? [] as $part) {
            if (isset($part['inlineData']['data'])) {
                return [
                    'mime' => (string) ($part['inlineData']['mimeType'] ?? 'image/png'),
                    'data' => (string) $part['inlineData']['data'],
                ];
            }
        }

        $finish = (string) ($body['candidates'][0]['finishReason'] ?? 'NO_IMAGE');
        Logger::channel('ai')->warning('Gemini returned no image', ['finish_reason' => $finish]);
        throw new HttpException(422, 'Gemini could not produce an image for this prompt.');
    }

    public function testConnection(array $config): array
    {
        $apiKey = trim((string) ($config['api_key'] ?? ''));
        if ($apiKey === '') {
            return ['ok' => false, 'message' => 'No API key set.'];
        }

        try {
            // Cheap authenticated call: list models (no generation cost).
            $this->request('GET', self::BASE_URL . '/models?pageSize=1', $apiKey, null, 20);

            return ['ok' => true, 'message' => 'Key accepted by Google AI.'];
        } catch (HttpException $e) {
            return ['ok' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * @param array<string, mixed>|null $payload
     *
     * @return array<string, mixed>
     */
    private function request(string $method, string $url, string $apiKey, ?array $payload, int $timeout): array
    {
        $ch = curl_init($url);
        $options = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'x-goog-api-key: ' . $apiKey],
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
                $errno === CURLE_OPERATION_TIMEDOUT ? 'Gemini request timed out.' : 'Could not reach Google AI.',
            );
        }

        /** @var array<string, mixed> $body */
        $body = json_decode((string) $raw, true) ?? [];
        if ($status >= 200 && $status < 300) {
            return $body;
        }

        $message = (string) ($body['error']['message'] ?? 'Unknown Gemini error');
        Logger::channel('ai')->error('Gemini error', ['http' => $status, 'message' => $message]);

        throw match (true) {
            $status === 401, $status === 403,
            $status === 400 && str_contains($message, 'API key')
                            => new HttpException(500, 'Gemini rejected the API key.'),
            $status === 429 => new HttpException(429, 'Gemini is rate-limited or out of quota.'),
            $status >= 500  => new HttpException(502, 'Gemini is temporarily unavailable.'),
            default         => new HttpException(502, 'Gemini generation failed.'),
        };
    }

    /**
     * Image -> text description via Gemini's multimodal endpoint.
     * Additive: only the Image Description tool calls this.
     *
     * @param array<string, mixed> $config
     */
    public function describeImage(string $base64Image, string $mime, string $instructions, array $config): string
    {
        $apiKey = trim((string) ($config['api_key'] ?? ''));
        if ($apiKey === '') {
            throw new HttpException(500, 'Gemini API key is not configured.');
        }
        $timeout = max(10, (int) ($config['timeout_sec'] ?? 60));

        // Google retires model names over time (gemini-2.0-flash was
        // decommissioned mid-2026) — walk a ladder of current vision-
        // capable text models and fall through on "no longer available"
        // / not-found answers, so a retirement never bricks the tool.
        $configured = trim((string) ($config['model'] ?? ''));
        $ladder = array_values(array_unique(array_filter([
            $configured,
            'gemini-2.5-flash',
            'gemini-flash-latest',
            'gemini-2.5-flash-lite',
        ])));

        $lastError = 'no model attempted';
        foreach ($ladder as $model) {
            try {
                return $this->describeWithModel($model, $base64Image, $mime, $instructions, $apiKey, $timeout);
            } catch (HttpException $e) {
                $lastError = $e->getMessage();
                $retired = str_contains($lastError, 'no longer available')
                    || str_contains($lastError, 'not found')
                    || str_contains($lastError, 'NOT_FOUND');
                Logger::channel('ai')->warning('Gemini describe model unavailable — trying next', [
                    'model' => $model, 'error' => mb_substr($lastError, 0, 140),
                ]);
                if (!$retired) {
                    throw $e; // quota/auth/etc — a different model won't help
                }
            }
        }

        throw new HttpException(502, 'No available Gemini vision model — last answer: ' . $lastError);
    }

    /** One describe attempt against a specific model. */
    private function describeWithModel(string $model, string $base64Image, string $mime, string $instructions, string $apiKey, int $timeout): string
    {
        $url = 'https://generativelanguage.googleapis.com/v1beta/models/'
            . rawurlencode($model) . ':generateContent?key=' . rawurlencode($apiKey);

        $payload = [
            'contents' => [[
                'parts' => [
                    ['text' => $instructions],
                    ['inline_data' => ['mime_type' => $mime, 'data' => $base64Image]],
                ],
            ]],
        ];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS     => json_encode($payload) ?: '{}',
        ]);
        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        if ($raw === false) {
            throw new HttpException(504, 'Gemini is unreachable.');
        }
        $body = json_decode((string) $raw, true) ?? [];
        if ($status < 200 || $status >= 300) {
            throw new HttpException(
                $status === 429 ? 429 : 502,
                'Gemini error: ' . (string) ($body['error']['message'] ?? ('HTTP ' . $status)),
            );
        }

        $text = trim((string) ($body['candidates'][0]['content']['parts'][0]['text'] ?? ''));
        if ($text === '') {
            throw new HttpException(502, 'Gemini returned no description.');
        }

        return $text;
    }
}
