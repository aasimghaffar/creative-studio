<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database;
use PDO;

final class NotificationRepository
{
    public const CATEGORIES = ['generation', 'credits', 'subscription', 'payment', 'system'];

    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /** @param array<string, mixed> $data */
    public function create(int $userId, string $category, string $title, string $body, array $data = []): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO notifications (user_id, category, title, body, data, created_at)
             VALUES (:user_id, :category, :title, :body, :data, NOW())',
        );
        $stmt->execute([
            'user_id'  => $userId,
            'category' => $category,
            'title'    => mb_substr($title, 0, 160),
            'body'     => mb_substr($body, 0, 500),
            'data'     => $data === [] ? null : json_encode($data, JSON_UNESCAPED_SLASHES),
        ]);

        return (int) $this->db->lastInsertId();
    }

    /**
     * Newest first, optionally filtered by category, paginated.
     *
     * @return array{rows: list<array<string, mixed>>, total: int}
     */
    public function listForUser(int $userId, ?string $category, int $page, int $perPage): array
    {
        $where = 'user_id = :user_id';
        $params = ['user_id' => $userId];
        if ($category !== null) {
            $where .= ' AND category = :category';
            $params['category'] = $category;
        }

        $count = $this->db->prepare("SELECT COUNT(*) FROM notifications WHERE {$where}");
        $count->execute($params);
        $total = (int) $count->fetchColumn();

        $offset = ($page - 1) * $perPage;
        $stmt = $this->db->prepare(
            "SELECT id, category, title, body, data, read_at, created_at
             FROM notifications
             WHERE {$where}
             ORDER BY created_at DESC, id DESC
             LIMIT {$perPage} OFFSET {$offset}",
        );
        $stmt->execute($params);

        $rows = array_map(static function (array $row): array {
            $row['data'] = json_decode((string) ($row['data'] ?? 'null'), true);
            $row['read'] = $row['read_at'] !== null;

            return $row;
        }, $stmt->fetchAll());

        return ['rows' => $rows, 'total' => $total];
    }

    public function unreadCount(int $userId): int
    {
        $stmt = $this->db->prepare(
            'SELECT COUNT(*) FROM notifications WHERE user_id = :user_id AND read_at IS NULL',
        );
        $stmt->execute(['user_id' => $userId]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Push one notification to every active user in the audience with a
     * single INSERT..SELECT ('all' or a plan slug).
     *
     * @return int Number of users notified.
     */
    public function createForAudience(string $audience, string $title, string $body): int
    {
        if ($audience === 'all') {
            $stmt = $this->db->prepare(
                "INSERT INTO notifications (user_id, category, title, body, read_at, created_at)
                 SELECT id, 'system', :title, :body, NULL, NOW()
                 FROM users WHERE status = 'active'",
            );
            $stmt->execute(['title' => $title, 'body' => $body]);
        } elseif ($audience === 'sketch') {
            // Sketch is the free fallback: users WITHOUT an active paid
            // subscription, plus anyone actually subscribed to the sketch plan.
            $stmt = $this->db->prepare(
                "INSERT INTO notifications (user_id, category, title, body, read_at, created_at)
                 SELECT u.id, 'system', :title, :body, NULL, NOW()
                 FROM users u
                 WHERE u.status = 'active'
                   AND NOT EXISTS (
                       SELECT 1 FROM subscriptions s
                       INNER JOIN plans pl ON pl.id = s.plan_id
                       WHERE s.user_id = u.id
                         AND s.status IN ('active', 'trialing')
                         AND pl.slug <> 'sketch'
                   )",
            );
            $stmt->execute(['title' => $title, 'body' => $body]);
        } else {
            $stmt = $this->db->prepare(
                "INSERT INTO notifications (user_id, category, title, body, read_at, created_at)
                 SELECT DISTINCT u.id, 'system', :title, :body, NULL, NOW()
                 FROM users u
                 INNER JOIN subscriptions s ON s.user_id = u.id AND s.status IN ('active', 'trialing')
                 INNER JOIN plans pl ON pl.id = s.plan_id
                 WHERE u.status = 'active' AND pl.slug = :plan_slug",
            );
            $stmt->execute(['title' => $title, 'body' => $body, 'plan_slug' => $audience]);
        }

        return $stmt->rowCount();
    }

    /** @return bool Whether a row belonging to the user was updated. */
    public function markRead(int $id, int $userId): bool
    {
        $stmt = $this->db->prepare(
            'UPDATE notifications SET read_at = NOW()
             WHERE id = :id AND user_id = :user_id AND read_at IS NULL',
        );
        $stmt->execute(['id' => $id, 'user_id' => $userId]);

        return $stmt->rowCount() > 0;
    }

    public function markAllRead(int $userId): int
    {
        $stmt = $this->db->prepare(
            'UPDATE notifications SET read_at = NOW() WHERE user_id = :user_id AND read_at IS NULL',
        );
        $stmt->execute(['user_id' => $userId]);

        return $stmt->rowCount();
    }

    /** @return bool Whether a row belonging to the user was deleted. */
    public function delete(int $id, int $userId): bool
    {
        $stmt = $this->db->prepare('DELETE FROM notifications WHERE id = :id AND user_id = :user_id');
        $stmt->execute(['id' => $id, 'user_id' => $userId]);

        return $stmt->rowCount() > 0;
    }
}
