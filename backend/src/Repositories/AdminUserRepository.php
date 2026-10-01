<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database;
use PDO;

/**
 * Admin-side user queries: accounts joined with their plan and usage
 * aggregates (credits spent, completed generations, live storage bytes).
 */
final class AdminUserRepository
{
    private const BASE_SELECT = "
        SELECT u.id, u.name, u.email, u.role, u.status, u.credits,
               u.created_at, u.last_login_at,
               p.country,
               COALESCE(pl.name, 'Sketch') AS plan_name,
               (SELECT COALESCE(SUM(ABS(ct.amount)), 0)
                  FROM credit_transactions ct
                 WHERE ct.user_id = u.id AND ct.type = 'spend') AS credits_used,
               (SELECT COUNT(*)
                  FROM ai_generations g
                 WHERE g.user_id = u.id AND g.status = 'completed') AS generations,
               (SELECT COALESCE(SUM(f.size_bytes), 0)
                  FROM files f
                 WHERE f.user_id = u.id AND f.deleted_at IS NULL) AS storage_bytes
        FROM users u
        LEFT JOIN user_profiles p ON p.user_id = u.id
        LEFT JOIN subscriptions s
               ON s.id = (SELECT s2.id FROM subscriptions s2
                           WHERE s2.user_id = u.id AND s2.status IN ('active', 'trialing')
                           ORDER BY s2.id DESC LIMIT 1)
        LEFT JOIN plans pl ON pl.id = s.plan_id
    ";

    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /**
     * @return array{rows: list<array<string, mixed>>, total: int}
     */
    public function list(?string $search, ?string $status, ?string $planSlug, int $page, int $perPage): array
    {
        $where = [];
        $params = [];

        if ($search !== null && $search !== '') {
            $where[] = '(u.name LIKE :search_name OR u.email LIKE :search_email)';
            $params['search_name'] = '%' . $search . '%';
            $params['search_email'] = '%' . $search . '%';
        }
        if ($status !== null) {
            $where[] = 'u.status = :status';
            $params['status'] = $status;
        }
        if ($planSlug !== null) {
            // Sketch = the free fallback, i.e. no active paid subscription.
            $where[] = $planSlug === 'sketch'
                ? "(pl.slug IS NULL OR pl.slug = 'sketch')"
                : 'pl.slug = :plan_slug';
            if ($planSlug !== 'sketch') {
                $params['plan_slug'] = $planSlug;
            }
        }

        $whereSql = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);

        $count = $this->db->prepare(
            "SELECT COUNT(*) FROM users u
             LEFT JOIN user_profiles p ON p.user_id = u.id
             LEFT JOIN subscriptions s
                    ON s.id = (SELECT s2.id FROM subscriptions s2
                                WHERE s2.user_id = u.id AND s2.status IN ('active', 'trialing')
                                ORDER BY s2.id DESC LIMIT 1)
             LEFT JOIN plans pl ON pl.id = s.plan_id" . $whereSql,
        );
        try {
            $count->execute($params);
        } catch (\PDOException $e) {
            \App\Core\Logger::channel('app')->error('User list query failed', [
                'error' => $e->getMessage(), 'params' => array_keys($params),
            ]);
            throw $e;
        }
        $total = (int) $count->fetchColumn();

        $offset = ($page - 1) * $perPage;
        $stmt = $this->db->prepare(
            self::BASE_SELECT . $whereSql . "
             ORDER BY u.created_at DESC, u.id DESC
             LIMIT {$perPage} OFFSET {$offset}",
        );
        $stmt->execute($params);

        return ['rows' => $stmt->fetchAll(), 'total' => $total];
    }

    /** @return array<string, mixed>|null */
    public function findDetail(int $userId): ?array
    {
        $stmt = $this->db->prepare(self::BASE_SELECT . ' WHERE u.id = :id LIMIT 1');
        $stmt->execute(['id' => $userId]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    /** @return array{tool_name: string, count: int}|null The user's most-used studio. */
    public function topTool(int $userId): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT t.name AS tool_name, COUNT(*) AS n
             FROM ai_generations g
             INNER JOIN ai_tools t ON t.id = g.tool_id
             WHERE g.user_id = :user_id AND g.status = 'completed'
             GROUP BY t.id, t.name
             ORDER BY n DESC
             LIMIT 1",
        );
        $stmt->execute(['user_id' => $userId]);
        $row = $stmt->fetch();

        return $row === false ? null : ['tool_name' => (string) $row['tool_name'], 'count' => (int) $row['n']];
    }

    public function setStatus(int $userId, string $status): void
    {
        $stmt = $this->db->prepare('UPDATE users SET status = :status, updated_at = NOW() WHERE id = :id');
        $stmt->execute(['status' => $status, 'id' => $userId]);
    }

    /** Average completed batch size (quantity per generation). */
    public function averageBatchSize(int $userId): float
    {
        $stmt = $this->db->prepare(
            "SELECT COALESCE(AVG(quantity), 0) FROM ai_generations
             WHERE user_id = :user_id AND status = 'completed'",
        );
        $stmt->execute(['user_id' => $userId]);

        return round((float) $stmt->fetchColumn(), 1);
    }
}
