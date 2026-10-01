<?php

declare(strict_types=1);

namespace App\Services\Storage;

use App\Exceptions\HttpException;
use App\Repositories\PlatformSettingRepository;
use App\Repositories\StorageProviderRepository;

/**
 * The one place storage-provider selection happens. Writes go to the
 * ACTIVE provider; reads and deletes dispatch by the storage_path scheme,
 * so switching providers affects only future uploads while existing
 * files stay where they already are. Callers never learn the provider.
 */
final class StorageManager
{
    public function __construct(
        private readonly StorageProviderRepository $providers = new StorageProviderRepository(),
        private readonly PlatformSettingRepository $settings = new PlatformSettingRepository(),
    ) {
    }

    /** Store via the active provider; returns the storage_path to persist. */
    public function store(string $binary, string $relativePath, string $mime): string
    {
        $row = $this->providers->active();

        return $this->instance((string) $row['slug'], $row)->store($binary, $relativePath, $mime);
    }

    /** Resolve a storage_path (any scheme, any era) to a public URL. */
    public function toUrl(string $storagePath): string
    {
        return $this->forPath($storagePath)->publicUrl($storagePath);
    }

    /** Remove the physical object wherever it lives. */
    public function delete(string $storagePath): void
    {
        $this->forPath($storagePath)->delete($storagePath);
    }

    /** @return array{ok: bool, message: string} */
    public function testProvider(array $row): array
    {
        return $this->instance((string) $row['slug'], $row)->testConnection();
    }

    /**
     * Global upload rules (platform_settings). Throws when a limit is hit.
     * $addBytes/$addFiles = what the pending operation would add.
     */
    public function enforceUserLimits(int $userId, int $addBytes, int $addFiles): void
    {
        $maxStorageGb = $this->settings->getInt('max_storage_per_user_gb', 0);
        $maxFiles = $this->settings->getInt('max_files_per_user', 0);
        if ($maxStorageGb <= 0 && $maxFiles <= 0) {
            return;
        }

        $db = \App\Core\Database::connection();
        $stmt = $db->prepare(
            'SELECT COALESCE(SUM(size_bytes), 0) AS bytes, COUNT(*) AS n
             FROM files WHERE user_id = :user_id AND deleted_at IS NULL',
        );
        $stmt->execute(['user_id' => $userId]);
        $current = $stmt->fetch() ?: ['bytes' => 0, 'n' => 0];

        if ($maxStorageGb > 0 && ((int) $current['bytes'] + $addBytes) > $maxStorageGb * (1024 ** 3)) {
            throw new HttpException(403, 'Storage limit reached. Delete some files or upgrade your plan.');
        }
        if ($maxFiles > 0 && ((int) $current['n'] + $addFiles) > $maxFiles) {
            throw new HttpException(403, 'File limit reached. Delete some files to continue.');
        }
    }

    /** Validate one upload against the global size/type rules. */
    public function validateUpload(int $sizeBytes, string $ext): void
    {
        $maxMb = $this->settings->getInt('max_upload_size_mb', 50);
        if ($maxMb > 0 && $sizeBytes > $maxMb * 1024 * 1024) {
            throw new HttpException(422, sprintf('Files are limited to %d MB.', $maxMb));
        }

        $allowed = array_filter(array_map('trim', explode(',', strtoupper(
            (string) ($this->settings->all()['allowed_file_types'] ?? 'JPG,PNG,WEBP'),
        ))));
        if ($allowed !== [] && !in_array(strtoupper($ext), $allowed, true)) {
            throw new HttpException(422, 'This file type is not allowed. Accepted: ' . implode(', ', $allowed) . '.');
        }
    }

    private function forPath(string $storagePath): StorageProviderInterface
    {
        $slug = match (true) {
            default                                  => 'local',
        };

        return $this->instance($slug, $this->providers->findBySlug($slug) ?? []);
    }

    /** @param array<string, mixed> $row */
    private function instance(string $slug, array $row): StorageProviderInterface
    {
        $credentials = CredentialCrypto::decrypt($row['credentials'] ?? null);

        return match ($slug) {
            default => new LocalStorageProvider(),
        };
    }
}
