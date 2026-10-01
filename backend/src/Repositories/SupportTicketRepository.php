<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database;
use PDO;

final class SupportTicketRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    public function create(int $userId, string $subject, string $topic, string $message, string $priority): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO support_tickets
                (user_id, subject, topic, message, priority, status, created_at, updated_at)
             VALUES (:user_id, :subject, :topic, :message, :priority, 'open', NOW(), NOW())",
        );
        $stmt->execute([
            'user_id'  => $userId,
            'subject'  => mb_substr($subject, 0, 190),
            'topic'    => $topic,
            'message'  => $message,
            'priority' => $priority,
        ]);

        return (int) $this->db->lastInsertId();
    }

    /** @return list<array<string, mixed>> */
    public function listForUser(int $userId): array
    {
        $stmt = $this->db->prepare(
            'SELECT id, subject, topic, priority, status, created_at, resolved_at
             FROM support_tickets
             WHERE user_id = :user_id
             ORDER BY created_at DESC
             LIMIT 50',
        );
        $stmt->execute(['user_id' => $userId]);

        return $stmt->fetchAll();
    }
}
