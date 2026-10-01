<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database;
use PDO;

final class EmailVerificationRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    public function store(int $userId, string $tokenHash, int $ttlSeconds = 86400): void
    {
        $this->db->prepare('DELETE FROM email_verifications WHERE user_id = :user_id')
            ->execute(['user_id' => $userId]);

        $stmt = $this->db->prepare(
            'INSERT INTO email_verifications (user_id, token_hash, expires_at, created_at)
             VALUES (:user_id, :token_hash, DATE_ADD(NOW(), INTERVAL :ttl SECOND), NOW())',
        );
        $stmt->execute(['user_id' => $userId, 'token_hash' => $tokenHash, 'ttl' => $ttlSeconds]);
    }

    /** @return array<string, mixed>|null */
    public function findValid(string $tokenHash): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM email_verifications WHERE token_hash = :hash AND expires_at > NOW() LIMIT 1',
        );
        $stmt->execute(['hash' => $tokenHash]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    public function consume(string $tokenHash): void
    {
        $this->db->prepare('DELETE FROM email_verifications WHERE token_hash = :hash')
            ->execute(['hash' => $tokenHash]);
    }
}
