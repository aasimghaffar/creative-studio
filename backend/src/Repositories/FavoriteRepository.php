<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database;
use PDO;

/**
 * Favorites — image favorites point at a generation; prompt favorites
 * store text. The shape CHECK in the schema enforces correctness.
 */
final class FavoriteRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /** Idempotent: the unique key absorbs double-favorites. */
    public function addImage(int $userId, int $generationId, int $toolId, ?int $fileId = null): void
    {
        $stmt = $this->db->prepare(
            "INSERT IGNORE INTO favorites (user_id, type, generation_id, file_id, tool_id, created_at)
             VALUES (:user_id, 'image', :generation_id, :file_id, :tool_id, NOW())",
        );
        $stmt->execute(['user_id' => $userId, 'generation_id' => $generationId, 'file_id' => $fileId, 'tool_id' => $toolId]);
    }

    public function removeImage(int $userId, int $generationId, ?int $fileId = null): void
    {
        if ($fileId !== null) {
            $stmt = $this->db->prepare(
                "DELETE FROM favorites WHERE user_id = :user_id AND type = 'image' AND file_id = :file_id",
            );
            $stmt->execute(['user_id' => $userId, 'file_id' => $fileId]);

            return;
        }
        $stmt = $this->db->prepare(
            "DELETE FROM favorites WHERE user_id = :user_id AND type = 'image' AND generation_id = :generation_id",
        );
        $stmt->execute(['user_id' => $userId, 'generation_id' => $generationId]);
    }

    /** Any favorite rows left for this generation? (drives the history flag) */
    public function generationHasFavorites(int $userId, int $generationId): bool
    {
        $stmt = $this->db->prepare(
            "SELECT 1 FROM favorites WHERE user_id = :user_id AND type = 'image' AND generation_id = :generation_id LIMIT 1",
        );
        $stmt->execute(['user_id' => $userId, 'generation_id' => $generationId]);

        return $stmt->fetch() !== false;
    }

    /** For future "save prompt" features — same table, prompt shape. */
    public function addPrompt(int $userId, ?int $toolId, string $promptText): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO favorites (user_id, type, tool_id, prompt_text, created_at)
             VALUES (:user_id, 'prompt', :tool_id, :prompt_text, NOW())",
        );
        $stmt->execute(['user_id' => $userId, 'tool_id' => $toolId, 'prompt_text' => $promptText]);

        return (int) $this->db->lastInsertId();
    }

    /** @return array<string, mixed>|null */
    public function findForUser(int $favoriteId, int $userId): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM favorites WHERE id = :id AND user_id = :user_id LIMIT 1',
        );
        $stmt->execute(['id' => $favoriteId, 'user_id' => $userId]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    public function deleteById(int $favoriteId): void
    {
        $this->db->prepare('DELETE FROM favorites WHERE id = :id')->execute(['id' => $favoriteId]);
    }

    /**
     * Image favorites joined with their history entry for rendering.
     *
     * @return list<array<string, mixed>>
     */
    public function listImages(int $userId): array
    {
        $stmt = $this->db->prepare(
            "SELECT f.id AS favorite_id, f.created_at AS favorited_at, f.file_id,
                    fi.storage_path AS file_path,
                    h.id AS history_id, h.prompt, h.thumb, h.credits_used, h.status, h.created_at,
                    t.slug AS tool_slug, t.name AS tool_name,
                    g.style, g.color, g.ratio
             FROM favorites f
             INNER JOIN ai_generations g ON g.id = f.generation_id
             LEFT JOIN files fi ON fi.id = f.file_id AND fi.deleted_at IS NULL
             INNER JOIN generation_history h ON h.generation_id = g.id AND h.deleted_at IS NULL
             INNER JOIN ai_tools t ON t.id = g.tool_id
             WHERE f.user_id = :user_id AND f.type = 'image'
             ORDER BY f.created_at DESC",
        );
        $stmt->execute(['user_id' => $userId]);

        $storage = new \App\Services\ImageStorageService();

        return array_map(static function (array $row) use ($storage): array {
            if (!empty($row['file_path'])) {
                $thumb = json_decode((string) ($row['thumb'] ?? '{}'), true) ?: [];
                $thumb['image_url'] = $storage->toUrl((string) $row['file_path']);
                $row['thumb'] = json_encode($thumb);
            }
            $row['thumb'] = json_decode((string) $row['thumb'], true) ?? [];

            return $row;
        }, $stmt->fetchAll());
    }

    /** @return list<array<string, mixed>> */
    public function listPrompts(int $userId): array
    {
        $stmt = $this->db->prepare(
            "SELECT f.id AS favorite_id, f.prompt_text, f.created_at AS favorited_at,
                    t.slug AS tool_slug, t.name AS tool_name
             FROM favorites f
             LEFT JOIN ai_tools t ON t.id = f.tool_id
             WHERE f.user_id = :user_id AND f.type = 'prompt'
             ORDER BY f.created_at DESC",
        );
        $stmt->execute(['user_id' => $userId]);

        return $stmt->fetchAll();
    }
}
