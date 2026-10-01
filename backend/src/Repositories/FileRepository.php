<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database;
use PDO;

/** My Files — reads/manages the same rows the AI tools write. */
final class FileRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /** @return list<array<string, mixed>> Live files, newest first. */
    public function listForUser(int $userId, ?string $type, ?string $search): array
    {
        $where = 'user_id = :user_id AND deleted_at IS NULL';
        $params = ['user_id' => $userId];

        if ($type !== null) {
            $where .= ' AND type = :type';
            $params['type'] = $type;
        }
        if ($search !== null && $search !== '') {
            $where .= ' AND name LIKE :search';
            $params['search'] = '%' . $search . '%';
        }

        $stmt = $this->db->prepare(
            "SELECT id, generation_id, name, ext, mime_type, type, size_bytes,
                    storage_path, download_count, created_at
             FROM files
             WHERE {$where}
             ORDER BY created_at DESC, id DESC
             LIMIT 200",
        );
        $stmt->execute($params);

        return $stmt->fetchAll();
    }

    /**
     * Latest image files with tool + prompt context (Dashboard grid).
     *
     * @return list<array<string, mixed>>
     */
    public function latestImages(int $userId, int $limit = 6): array
    {
        $stmt = $this->db->prepare(
            "SELECT f.id, f.name, f.ext, f.storage_path, f.created_at,
                    g.prompt, t.name AS tool_name
             FROM files f
             LEFT JOIN ai_generations g ON g.id = f.generation_id
             LEFT JOIN ai_tools t ON t.id = g.tool_id
             WHERE f.user_id = :user_id AND f.type = 'image' AND f.deleted_at IS NULL
             ORDER BY f.created_at DESC, f.id DESC
             LIMIT " . max(1, min($limit, 12)),
        );
        $stmt->execute(['user_id' => $userId]);

        return $stmt->fetchAll();
    }

    /** @return array<string, mixed>|null */
    public function findForUser(int $fileId, int $userId): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM files WHERE id = :id AND user_id = :user_id AND deleted_at IS NULL LIMIT 1',
        );
        $stmt->execute(['id' => $fileId, 'user_id' => $userId]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    public function rename(int $fileId, string $name): void
    {
        $stmt = $this->db->prepare('UPDATE files SET name = :name, updated_at = NOW() WHERE id = :id');
        $stmt->execute(['name' => $name, 'id' => $fileId]);
    }

    /**
     * Hard delete — the row leaves the database entirely (spec: deleted
     * files disappear from storage, database, and every surface).
     */
    public function hardDelete(int $fileId): void
    {
        $this->db->prepare('DELETE FROM files WHERE id = :id')->execute(['id' => $fileId]);
    }

    public function incrementDownloads(int $fileId): void
    {
        $this->db->prepare('UPDATE files SET download_count = download_count + 1 WHERE id = :id')
            ->execute(['id' => $fileId]);
    }
}
