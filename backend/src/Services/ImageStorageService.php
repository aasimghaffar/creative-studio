<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\HttpException;
use App\Services\Storage\StorageManager;

/**
 * Image storage facade — the public API (saveBase64 / delete / toUrl) is
 * unchanged for every caller, but the physical destination is now decided
 * by the StorageManager and the ACTIVE storage provider. Callers (and
 * users) never know where files live.
 */
final class ImageStorageService
{
    public function __construct(
        private readonly StorageManager $manager = new StorageManager(),
    ) {
    }

    /**
     * @return array{path: string, url: string, size: int}
     */
    public function saveBase64(string $toolSlug, string $base64, string $mime): array
    {
        $bytes = base64_decode($base64, true);
        if ($bytes === false || $bytes === '') {
            throw new HttpException(502, 'The AI returned an unreadable image.');
        }

        $ext = match ($mime) {
            'image/jpeg' => 'jpg',
            'image/webp' => 'webp',
            default      => 'png',
        };

        $slug = preg_replace('/[^a-z0-9\-]/', '', strtolower($toolSlug)) ?: 'tool';
        $key = 'generated-images/' . $slug . '/' . date('Ymd-His') . '-' . bin2hex(random_bytes(8)) . '.' . $ext;

        try {
            $path = $this->manager->store($bytes, $key, $mime);
        } catch (\RuntimeException $e) {
            throw new HttpException(502, 'Could not store the generated image: ' . $e->getMessage());
        }

        return [
            'path' => $path,
            'url'  => $this->manager->toUrl($path),
            'size' => strlen($bytes),
        ];
    }

    public function delete(string $storagePath): void
    {
        if ($storagePath === '') {
            return;
        }
        $this->manager->delete($storagePath);
    }

    public function toUrl(string $storagePath): string
    {
        return $this->manager->toUrl($storagePath);
    }

    /**
     * Store a user-uploaded avatar. Unlike saveBase64 (AI output), this
     * is untrusted USER input: validated (2 MB cap, mime whitelist)
     * and stored under avatars/{userId}/.
     *
     * @return array{path: string, url: string, size: int}
     */
    public function saveAvatar(int $userId, string $base64, string $mime): array
    {
        $bytes = base64_decode($base64, true);
        if ($bytes === false || $bytes === '') {
            throw new HttpException(422, 'That image could not be read — please upload a PNG or JPG.');
        }
        if (strlen($bytes) > 2 * 1024 * 1024) {
            throw new HttpException(422, 'Profile photos can be up to 2 MB.');
        }
        if (!in_array($mime, ['image/png', 'image/jpeg', 'image/webp'], true)) {
            throw new HttpException(422, 'Only PNG, JPG, or WEBP photos are supported.');
        }

        $ext = match ($mime) {
            'image/jpeg' => 'jpg',
            'image/webp' => 'webp',
            default      => 'png',
        };
        $key = 'avatars/' . $userId . '/' . date('Ymd-His') . '-' . bin2hex(random_bytes(6)) . '.' . $ext;

        try {
            $path = $this->manager->store($bytes, $key, $mime);
        } catch (\RuntimeException $e) {
            throw new HttpException(502, 'Could not store the photo: ' . $e->getMessage());
        }

        return [
            'path' => $path,
            'url'  => $this->manager->toUrl($path),
            'size' => strlen($bytes),
        ];
    }
}
