<?php

declare(strict_types=1);

namespace App\Services\AI;

use App\Core\Logger;
use App\Exceptions\HttpException;

/**
 * Pollinations.ai image provider — free image generation
 * (image.pollinations.ai), using the proven request shape (plain curl,
 * no custom User-Agent), fully independent of the other providers.
 *
 * IMPORTANT — Pollinations changed sides of the deal in 2025/26: the
 * anonymous tier is now METERED ("Insufficient balance … 402", often
 * surfaced as HTTP 500 via their Gen/Sana gateway). API access needs a
 * registered token — free to create at https://auth.pollinations.ai —
 * passed as a Bearer header + token param. This service reads it from
 * the provider row's API key field; when it is empty we still try
 * anonymously (model ladder: flux -> turbo -> server default), and if
 * Pollinations answers with a balance/402 error we throw a message that
 * says exactly how to fix it instead of a bare HTTP 500.
 */
final class PollinationsAIService implements AIProviderInterface
{
    private const BASE_URL = 'https://image.pollinations.ai';
    private const MAX_PROMPT_CHARS = 1500; // URL safety; longer tails add nothing

    /** Aspect ratios map to explicit pixel dimensions. */
    private const RATIO_SIZES = [
        '1:1'  => [1024, 1024],
        '16:9' => [1344, 768],
        '9:16' => [768, 1344],
        '4:5'  => [896, 1120],
        '4x5'  => [896, 1120],
        '3:2'  => [1216, 832],
        '2:3'  => [832, 1216],
    ];

    public function generateImage(string $prompt, string $aspectRatio, array $config): array
    {
        [$width, $height] = self::RATIO_SIZES[$aspectRatio] ?? self::RATIO_SIZES['1:1'];
        $timeout = max(10, (int) ($config['timeout_sec'] ?? 120));
        $model = trim((string) ($config['model'] ?? ''));
        $token = trim((string) ($config['api_key'] ?? ''));

        // Single-line, capped prompt — identical content, URL-safe shape.
        $compact = preg_replace('/\s*\n+\s*/', ', ', trim($prompt)) ?? $prompt;
        $compact = trim(preg_replace('/\s{2,}/', ' ', $compact) ?? $compact, ' ,');
        if (mb_strlen($compact) > self::MAX_PROMPT_CHARS) {
            $compact = mb_substr($compact, 0, self::MAX_PROMPT_CHARS);
        }

        // Model ladder: the admin-configured model (or 'flux', their free
        // flagship) first; 'turbo' second; the server default last — the
        // default currently routes to their failing Sana backend, so it
        // is only a last resort. Duplicate final rung = transient retry.
        $primary = $model !== '' ? $model : 'flux';
        $attempts = [[$primary, 'model "' . $primary . '"']];
        if ($primary !== 'turbo') {
            $attempts[] = ['turbo', 'model "turbo"'];
        }
        $attempts[] = ['', 'server default model'];
        $attempts[] = $attempts[count($attempts) - 1];

        $lastStatus = 0;
        $lastBody = '';
        $lastError = '';
        foreach ($attempts as $i => [$attemptModel, $label]) {
            if ($i > 0) {
                sleep(2);
            }

            $url = self::BASE_URL . '/prompt/' . rawurlencode($compact)
                . '?width=' . $width
                . '&height=' . $height
                . '&nologo=true'
                . '&seed=' . random_int(1, 999999)
                . ($attemptModel !== '' ? '&model=' . rawurlencode($attemptModel) : '')
                . ($token !== '' ? '&token=' . rawurlencode($token) : '');

            $started = microtime(true);
            [$status, $bytes, $contentType, $curlError] = $this->request($url, $timeout, $token);
            $elapsedMs = (int) round((microtime(true) - $started) * 1000);

            if ($bytes !== null && $status >= 200 && $status < 300 && $bytes !== '' && str_starts_with($contentType, 'image/')) {
                Logger::channel('ai')->info('Pollinations image generated', [
                    'size_bytes' => strlen($bytes),
                    'elapsed_ms' => $elapsedMs,
                    'ratio'      => $aspectRatio,
                    'attempt'    => $label,
                ]);

                return [
                    'mime' => str_contains($contentType, 'jpeg') ? 'image/jpeg' : 'image/png',
                    'data' => base64_encode($bytes),
                ];
            }

            if ($status === 429) {
                throw new HttpException(429, 'Pollinations rate limit reached. Please try again shortly.');
            }

            $lastStatus = $status;
            $lastBody = $bytes !== null ? trim(strip_tags(substr($bytes, 0, 160))) : '';
            $lastError = $curlError;

            // Their new anonymous-tier metering: name the actual fix.
            if ($status === 402 || stripos($lastBody, 'insufficient balance') !== false) {
                throw new HttpException(402, $token === ''
                    ? 'Pollinations now meters anonymous API use. Create a FREE token at auth.pollinations.ai and paste it into the Pollinations provider\'s API key field (Admin → AI Providers), then retry.'
                    : 'Pollinations rejected the token for balance/tier reasons — check your account at auth.pollinations.ai.');
            }

            Logger::channel('ai')->warning('Pollinations attempt failed', [
                'http'       => $status,
                'attempt'    => $label,
                'elapsed_ms' => $elapsedMs,
                'body'       => $lastBody,
                'error'      => $curlError,
            ]);

            if ($bytes === null && $i === count($attempts) - 1) {
                throw new HttpException(502, 'Pollinations is unreachable: ' . ($curlError ?: 'connection failed.'));
            }
            if ($status >= 400 && $status < 500) {
                break; // our request is malformed for them — retrying won't help
            }
        }

        throw new HttpException(502, 'Pollinations error (HTTP ' . $lastStatus . ')'
            . ($lastBody !== '' ? ' — ' . $lastBody : ($lastError !== '' ? ' — ' . $lastError : '')) . '.');
    }

    public function testConnection(array $config): array
    {
        // Real end-to-end probe: a tiny 64px generation.
        $token = trim((string) ($config['api_key'] ?? ''));
        $url = self::BASE_URL . '/prompt/' . rawurlencode('test dot')
            . '?width=64&height=64&nologo=true&model=flux'
            . ($token !== '' ? '&token=' . rawurlencode($token) : '');

        [$status, $bytes, $contentType, $curlError] = $this->request($url, 30, $token);

        if ($bytes === null) {
            return ['ok' => false, 'message' => 'Pollinations is unreachable: ' . ($curlError ?: 'connection failed.')];
        }
        if ($status >= 200 && $status < 300 && str_starts_with($contentType, 'image/')) {
            return ['ok' => true, 'message' => 'Connected — Pollinations is generating' . ($token !== '' ? ' (token accepted).' : ' (anonymous tier).')];
        }
        if ($status === 429) {
            return ['ok' => false, 'message' => 'Reachable, but rate-limited right now (HTTP 429).'];
        }

        $snippet = trim(strip_tags(substr((string) $bytes, 0, 120)));
        if ($status === 402 || stripos($snippet, 'insufficient balance') !== false) {
            return ['ok' => false, 'message' => $token === ''
                ? 'Pollinations now requires a FREE registered token for API use — create one at auth.pollinations.ai and paste it into this provider\'s API key field.'
                : 'Pollinations rejected the token (balance/tier) — check your account at auth.pollinations.ai.'];
        }

        return ['ok' => false, 'message' => 'Pollinations error (HTTP ' . $status . ')' . ($snippet !== '' ? ' — ' . $snippet : '') . '.'];
    }

    /** @return array{0: int, 1: string|null, 2: string, 3: string} status, body, content-type, curl error */
    private function request(string $url, int $timeout, string $token = ''): array
    {
        // The proven request shape, plus the Bearer token when configured
        // (Pollinations accepts the token as a header and/or query param).
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTPHEADER     => $token !== '' ? ['Authorization: Bearer ' . $token] : [],
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $contentType = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        $error = curl_error($ch);
        curl_close($ch);

        return [$status, $body === false ? null : (string) $body, $contentType, $error];
    }
}
