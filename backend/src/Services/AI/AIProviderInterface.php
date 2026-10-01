<?php

declare(strict_types=1);

namespace App\Services\AI;

/**
 * Contract every image provider implements. Future providers (OpenAI,
 * Stability, Claude…) plug in here without touching tools or frontend.
 */
interface AIProviderInterface
{
    /**
     * Generate one image from a text prompt.
     *
     * @param array<string, mixed> $config The provider's DB row (api_key, model, timeout_sec).
     *
     * @return array{mime: string, data: string} data = base64-encoded bytes
     *
     * @throws \App\Exceptions\HttpException On any provider failure (triggers fallback).
     */
    public function generateImage(string $prompt, string $aspectRatio, array $config): array;

    /**
     * Lightweight, real connectivity + key check (no image generated).
     *
     * @param array<string, mixed> $config
     *
     * @return array{ok: bool, message: string}
     */
    public function testConnection(array $config): array;
}
