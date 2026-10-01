<?php

declare(strict_types=1);

namespace App\Services\Storage;

/**
 * Contract every storage backend implements. Future providers plug in
 * without touching upload callers — they only ever see storage paths.
 */
interface StorageProviderInterface
{
    /**
     * Persist binary content; returns the storage_path recorded in the
     * files table (scheme-prefixed for remote providers).
     */
    public function store(string $binary, string $relativePath, string $mime): string;

    /** Publicly reachable URL for a storage_path this provider owns. */
    public function publicUrl(string $storagePath): string;

    /** Remove the physical object (missing objects are not an error). */
    public function delete(string $storagePath): void;

    /** @return array{ok: bool, message: string} Real connectivity check. */
    public function testConnection(): array;
}
