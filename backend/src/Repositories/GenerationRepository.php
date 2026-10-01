<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database;
use PDO;

/**
 * ai_generations + generation_history + files — the persistence trio
 * behind every AI tool. Tool-agnostic by design.
 */
final class GenerationRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /** @param array<string, mixed> $input */
    public function createGeneration(int $userId, int $toolId, array $input, int $creditsUsed): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO ai_generations
                (user_id, tool_id, prompt, negative_prompt, template, style, color, colors, options, ratio,
                 quantity, quality, status, credits_used, started_at, created_at)
             VALUES
                (:user_id, :tool_id, :prompt, :negative_prompt, :template, :style, :color, :colors, :options, :ratio,
                 :quantity, :quality, \'processing\', :credits_used, NOW(), NOW())',
        );
        $stmt->execute([
            'user_id'         => $userId,
            'tool_id'         => $toolId,
            'prompt'          => $input['prompt'],
            'negative_prompt' => $input['negative_prompt'] ?? null,
            'template'        => $input['template'] ?? null,
            'style'           => $input['style'] ?? null,
            'color'           => $input['color'] ?? null,
            'colors'          => $input['colors'] !== [] ? implode(',', $input['colors']) : null,
            'options'         => ($input['options'] ?? []) !== [] ? json_encode($input['options']) : null,
            'ratio'           => $input['ratio'] ?? '1:1',
            'quantity'        => $input['quantity'] ?? 1,
            'quality'         => $input['quality'] ?? null,
            'credits_used'    => $creditsUsed,
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function markCompleted(int $generationId): void
    {
        $this->db->prepare(
            "UPDATE ai_generations SET status = 'completed', completed_at = NOW() WHERE id = :id",
        )->execute(['id' => $generationId]);
    }

    public function markFailed(int $generationId, string $error): void
    {
        $this->db->prepare(
            "UPDATE ai_generations
             SET status = 'failed', error_message = :error, completed_at = NOW()
             WHERE id = :id",
        )->execute(['id' => $generationId, 'error' => mb_substr($error, 0, 255)]);
    }

    /** @param array{path: string, url: string, size: int} $image */
    public function createFile(int $userId, int $generationId, string $toolName, array $image, string $ext): int
    {
        $name = strtolower(str_replace(' ', '-', $toolName)) . '-' . $generationId . '-' . bin2hex(random_bytes(3));

        $stmt = $this->db->prepare(
            'INSERT INTO files
                (user_id, generation_id, name, ext, mime_type, type, size_bytes,
                 storage_disk, storage_path, created_at, updated_at)
             VALUES
                (:user_id, :generation_id, :name, :ext, :mime, \'image\', :size,
                 \'local\', :path, NOW(), NOW())',
        );
        $stmt->execute([
            'user_id'       => $userId,
            'generation_id' => $generationId,
            'name'          => $name,
            'ext'           => $ext,
            'mime'          => $ext === 'jpg' ? 'image/jpeg' : 'image/' . $ext,
            'size'          => $image['size'],
            'path'          => $image['path'],
        ]);

        return (int) $this->db->lastInsertId();
    }

    /** @param array<string, mixed> $input */
    public function createHistory(int $userId, int $generationId, int $toolId, array $input, int $creditsUsed, string $thumbUrl): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO generation_history
                (user_id, generation_id, tool_id, prompt, thumb, credits_used, status, created_at)
             VALUES
                (:user_id, :generation_id, :tool_id, :prompt, :thumb, :credits_used, \'completed\', NOW())',
        );
        $stmt->execute([
            'user_id'       => $userId,
            'generation_id' => $generationId,
            'tool_id'       => $toolId,
            'prompt'        => $input['prompt'],
            'thumb'         => json_encode([
                'image_url' => $thumbUrl,
                'colors'    => [$input['color'] ?? '#B8823C', '#12232B'],
                'variant'   => 0,
            ], JSON_UNESCAPED_SLASHES),
            'credits_used'  => $creditsUsed,
        ]);

        return (int) $this->db->lastInsertId();
    }

    /**
     * History list for a user + tool (newest first), thumb JSON decoded.
     *
     * @return list<array<string, mixed>>
     */
    public function listHistory(int $userId, int $toolId, int $limit = 20): array
    {
        $stmt = $this->db->prepare(
            'SELECT h.id, h.generation_id, h.prompt, h.thumb, h.credits_used, h.status,
                    h.is_favorite, h.created_at,
                    g.style, g.color, g.ratio, g.quantity, g.quality,
                    GROUP_CONCAT(f.id, \'|\', f.storage_path ORDER BY f.id SEPARATOR \'||\') AS files_concat,
                    (SELECT GROUP_CONCAT(fv.file_id) FROM favorites fv WHERE fv.user_id = h.user_id AND fv.type = \'image\' AND fv.generation_id = h.generation_id) AS fav_file_ids
             FROM generation_history h
             INNER JOIN ai_generations g ON g.id = h.generation_id
             LEFT JOIN files f ON f.generation_id = h.generation_id
             WHERE h.user_id = :user_id AND h.tool_id = :tool_id AND h.deleted_at IS NULL
             GROUP BY h.id
             ORDER BY h.created_at DESC
             LIMIT ' . max(1, min($limit, 50)),
        );
        $stmt->execute(['user_id' => $userId, 'tool_id' => $toolId]);

        return array_map(static function (array $row): array {
            $row['thumb'] = json_decode((string) $row['thumb'], true) ?? [];
            $row['is_favorite'] = (bool) $row['is_favorite'];

            return $row;
        }, $stmt->fetchAll());
    }

    /**
     * Global history across ALL tools, filtered + sorted + paginated.
     *
     * @return array{rows: list<array<string, mixed>>, total: int}
     */
    public function listHistoryAll(
        int $userId,
        ?string $toolSlug,
        ?string $since,
        string $sort,
        int $page,
        int $perPage,
    ): array {
        $where = 'h.user_id = :user_id AND h.deleted_at IS NULL';
        $params = ['user_id' => $userId];

        if ($toolSlug !== null) {
            $where .= ' AND t.slug = :tool_slug';
            $params['tool_slug'] = $toolSlug;
        }
        if ($since !== null) {
            $where .= ' AND h.created_at >= :since';
            $params['since'] = $since;
        }

        $count = $this->db->prepare(
            "SELECT COUNT(*)
             FROM generation_history h
             INNER JOIN ai_tools t ON t.id = h.tool_id
             WHERE {$where}",
        );
        $count->execute($params);
        $total = (int) $count->fetchColumn();

        $direction = $sort === 'oldest' ? 'ASC' : 'DESC';
        $offset = ($page - 1) * $perPage;

        $stmt = $this->db->prepare(
            "SELECT h.id, h.generation_id, h.prompt, h.thumb, h.credits_used, h.status,
                    h.is_favorite, h.created_at,
                    t.slug AS tool_slug, t.name AS tool_name,
                    g.style, g.color, g.ratio,
                    GROUP_CONCAT(f.id, '|', f.storage_path ORDER BY f.id SEPARATOR '||') AS files_concat,
                    (SELECT GROUP_CONCAT(fv.file_id) FROM favorites fv WHERE fv.user_id = h.user_id AND fv.type = 'image' AND fv.generation_id = h.generation_id) AS fav_file_ids
             FROM generation_history h
             INNER JOIN ai_tools t ON t.id = h.tool_id
             INNER JOIN ai_generations g ON g.id = h.generation_id
             LEFT JOIN files f ON f.generation_id = h.generation_id
             WHERE {$where}
             GROUP BY h.id
             ORDER BY h.created_at {$direction}, h.id {$direction}
             LIMIT {$perPage} OFFSET {$offset}",
        );
        $stmt->execute($params);

        $rows = array_map(static function (array $row): array {
            $row['thumb'] = json_decode((string) $row['thumb'], true) ?? [];
            $row['is_favorite'] = (bool) $row['is_favorite'];

            return $row;
        }, $stmt->fetchAll());

        return ['rows' => $rows, 'total' => $total];
    }

    /** @return array<string, mixed>|null History row (with generation) owned by the user. */
    public function findHistoryForUser(int $historyId, int $userId): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT h.*, g.template, g.style, g.color, g.colors, g.ratio, g.quantity, g.quality, g.negative_prompt
             FROM generation_history h
             INNER JOIN ai_generations g ON g.id = h.generation_id
             WHERE h.id = :id AND h.user_id = :user_id AND h.deleted_at IS NULL
             LIMIT 1',
        );
        $stmt->execute(['id' => $historyId, 'user_id' => $userId]);
        $row = $stmt->fetch();
        if ($row === false) {
            return null;
        }

        $row['thumb'] = json_decode((string) $row['thumb'], true) ?? [];
        $row['is_favorite'] = (bool) $row['is_favorite'];

        return $row;
    }

    /** @return array<string, mixed>|null */
    public function findHistoryByGenerationId(int $generationId, int $userId): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT id FROM generation_history
             WHERE generation_id = :generation_id AND user_id = :user_id
             LIMIT 1',
        );
        $stmt->execute(['generation_id' => $generationId, 'user_id' => $userId]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    /** @return list<array<string, mixed>> files belonging to a generation. */
    public function filesForGeneration(int $generationId): array
    {
        $stmt = $this->db->prepare(
            'SELECT id, name, ext, mime_type, size_bytes, storage_path
             FROM files
             WHERE generation_id = :id AND deleted_at IS NULL
             ORDER BY id ASC',
        );
        $stmt->execute(['id' => $generationId]);

        return $stmt->fetchAll();
    }

    /** Completed generations since a datetime. */
    public function countCompletedSince(int $userId, string $since): int
    {
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) FROM ai_generations
             WHERE user_id = :user_id AND status = 'completed' AND created_at >= :since",
        );
        $stmt->execute(['user_id' => $userId, 'since' => $since]);

        return (int) $stmt->fetchColumn();
    }

    /** Generations still queued or processing. */
    public function countOpen(int $userId): int
    {
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) FROM ai_generations
             WHERE user_id = :user_id AND status IN ('queued', 'processing')",
        );
        $stmt->execute(['user_id' => $userId]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Per-day completed generation counts for the last N days (gaps = 0).
     *
     * @return list<array{date: string, count: int}>
     */
    public function dailyCounts(int $userId, int $days = 14): array
    {
        $stmt = $this->db->prepare(
            "SELECT DATE(created_at) AS day, COUNT(*) AS n
             FROM ai_generations
             WHERE user_id = :user_id AND status = 'completed'
               AND created_at >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
             GROUP BY DATE(created_at)",
        );
        $stmt->execute(['user_id' => $userId, 'days' => $days - 1]);

        $byDay = [];
        foreach ($stmt->fetchAll() as $row) {
            $byDay[(string) $row['day']] = (int) $row['n'];
        }

        $series = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-{$i} days"));
            $series[] = ['date' => $date, 'count' => $byDay[$date] ?? 0];
        }

        return $series;
    }

    /**
     * Credits consumed per tool (completed generations only).
     *
     * @return list<array{tool_slug: string, tool_name: string, credits: int}>
     */
    public function creditUsageByTool(int $userId, ?string $since = null): array
    {
        $sql = "SELECT t.slug AS tool_slug, t.name AS tool_name,
                       COALESCE(SUM(g.credits_used), 0) AS credits
                FROM ai_generations g
                INNER JOIN ai_tools t ON t.id = g.tool_id
                WHERE g.user_id = :user_id AND g.status = 'completed'";
        $params = ['user_id' => $userId];
        if ($since !== null) {
            $sql .= ' AND g.created_at >= :since';
            $params['since'] = $since;
        }
        $sql .= ' GROUP BY t.id, t.slug, t.name ORDER BY credits DESC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return array_map(static fn (array $row): array => [
            'tool_slug' => (string) $row['tool_slug'],
            'tool_name' => (string) $row['tool_name'],
            'credits'   => (int) $row['credits'],
        ], $stmt->fetchAll());
    }

    public function setFavorite(int $historyId, bool $favorite): void
    {
        $this->db->prepare(
            'UPDATE generation_history SET is_favorite = :fav WHERE id = :id',
        )->execute(['fav' => $favorite ? 1 : 0, 'id' => $historyId]);
    }

    /** Hard-delete a generation, its history row and file rows. */
    public function deleteGeneration(int $generationId, int $historyId): void
    {
        $this->db->prepare('DELETE FROM files WHERE generation_id = :id')->execute(['id' => $generationId]);
        $this->db->prepare('DELETE FROM generation_history WHERE id = :id')->execute(['id' => $historyId]);
        $this->db->prepare('DELETE FROM ai_generations WHERE id = :id')->execute(['id' => $generationId]);
    }
}
