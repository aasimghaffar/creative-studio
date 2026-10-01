<?php

declare(strict_types=1);

namespace App\Services\Storage;

use App\Config\Config;
use RuntimeException;

/** AES-256-GCM for provider credentials — secrets never leave the backend. */
final class CredentialCrypto
{
    private static function key(): string
    {
        $secret = Config::get('APP_KEY') ?: Config::get('JWT_SECRET');
        if ($secret === '') {
            throw new RuntimeException('APP_KEY or JWT_SECRET must be set to encrypt credentials.');
        }

        return hash('sha256', 'storage-credentials:' . $secret, true);
    }

    /** @param array<string, mixed> $data */
    public static function encrypt(array $data): string
    {
        $iv = random_bytes(12);
        $tag = '';
        $cipher = openssl_encrypt(
            json_encode($data, JSON_UNESCAPED_SLASHES) ?: '{}',
            'aes-256-gcm',
            self::key(),
            OPENSSL_RAW_DATA,
            $iv,
            $tag,
        );
        if ($cipher === false) {
            throw new RuntimeException('Credential encryption failed.');
        }

        return base64_encode($iv . $tag . $cipher);
    }

    /** @return array<string, mixed> */
    public static function decrypt(?string $blob): array
    {
        if ($blob === null || $blob === '') {
            return [];
        }
        $raw = base64_decode($blob, true);
        if ($raw === false || strlen($raw) < 29) {
            return [];
        }
        $plain = openssl_decrypt(
            substr($raw, 28),
            'aes-256-gcm',
            self::key(),
            OPENSSL_RAW_DATA,
            substr($raw, 0, 12),
            substr($raw, 12, 16),
        );

        return $plain === false ? [] : (json_decode($plain, true) ?? []);
    }
}
