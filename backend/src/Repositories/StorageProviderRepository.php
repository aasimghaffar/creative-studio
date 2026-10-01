<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database;
use PDO;

final class StorageProviderRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /** @return list<array<string, mixed>> */
    public function all(): array
    {
        return $this->db->query('SELECT * FROM storage_providers ORDER BY id ASC')->fetchAll();
    }

    /** @return array<string, mixed>|null */
    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM storage_providers WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    /** @return array<string, mixed>|null */
    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM storage_providers WHERE slug = :slug LIMIT 1');
        $stmt->execute(['slug' => $slug]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    /** @return array<string, mixed> The single active provider (local as safety net). */
    public function active(): array
    {
        $row = $this->db->query('SELECT * FROM storage_providers WHERE enabled = 1 LIMIT 1')->fetch();
        if ($row !== false) {
            return $row;
        }

        return $this->findBySlug('local') ?? ['slug' => 'local', 'credentials' => null];
    }

    public function saveCredentials(int $id, string $encryptedBlob): void
    {
        $this->db->prepare('UPDATE storage_providers SET credentials = :c, updated_at = NOW() WHERE id = :id')
            ->execute(['c' => $encryptedBlob, 'id' => $id]);
    }

    /** Exactly one active provider — the swap is one transaction. */
    public function activate(int $id): void
    {
        $this->db->beginTransaction();
        try {
            $this->db->exec('UPDATE storage_providers SET enabled = 0, updated_at = NOW()');
            $this->db->prepare('UPDATE storage_providers SET enabled = 1, updated_at = NOW() WHERE id = :id')
                ->execute(['id' => $id]);
            $this->db->commit();
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    public function recordStatus(int $id, bool $ok, ?string $error): void
    {
        $this->db->prepare(
            'UPDATE storage_providers
             SET status = :s, last_error = :e, last_tested_at = NOW(), updated_at = NOW()
             WHERE id = :id',
        )->execute([
            's'  => $ok ? 'connected' : 'failed',
            'e'  => $error !== null ? mb_substr($error, 0, 255) : null,
            'id' => $id,
        ]);
    }
}
