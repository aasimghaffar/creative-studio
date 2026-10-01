<?php

declare(strict_types=1);

namespace App\Services\Storage;

use App\Config\Config;
use RuntimeException;

/** Files under public/storage — the default and the existing behavior. */
final class LocalStorageProvider implements StorageProviderInterface
{
    public function store(string $binary, string $relativePath, string $mime): string
    {
        // $relativePath is a clean key like generated-images/logo/x.png;
        // the stored path keeps the legacy 'storage/' prefix so every
        // existing files row keeps resolving unchanged.
        $key = ltrim($relativePath, '/');
        $full = $this->baseDir() . '/' . $key;

        $dir = dirname($full);
        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new RuntimeException('Could not create the storage directory.');
        }
        if (file_put_contents($full, $binary) === false) {
            throw new RuntimeException('Could not write the file to local storage.');
        }

        return 'storage/' . $key;
    }

    public function publicUrl(string $storagePath): string
    {
        return rtrim(Config::get('APP_URL', 'http://localhost:8000'), '/') . '/' . ltrim($storagePath, '/');
    }

    public function delete(string $storagePath): void
    {
        // storage_path is public-relative (storage/...), files live in public/.
        $full = dirname($this->baseDir()) . '/' . ltrim($storagePath, '/');
        if (is_file($full)) {
            @unlink($full);
        }
    }

    public function testConnection(): array
    {
        $base = $this->baseDir();
        if (!is_dir($base) && !mkdir($base, 0775, true) && !is_dir($base)) {
            return ['ok' => false, 'message' => 'Storage directory cannot be created.'];
        }

        return is_writable($base)
            ? ['ok' => true, 'message' => 'Local storage directory is writable.']
            : ['ok' => false, 'message' => 'Storage directory is not writable.'];
    }

    private function baseDir(): string
    {
        return dirname(__DIR__, 3) . '/public/storage';
    }
}
