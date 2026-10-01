<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database;
use PDO;

/**
 * Hashed refresh tokens with expiry + revocation (rotation on every refresh).
 */
final class RefreshTokenRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    public function store(int $userId, string $tokenHash, int $ttlSeconds): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at)
             VALUES (:user_id, :token_hash, DATE_ADD(NOW(), INTERVAL :ttl SECOND), NOW())',
        );
        $stmt->execute(['user_id' => $userId, 'token_hash' => $tokenHash, 'ttl' => $ttlSeconds]);

        return (int) $this->db->lastInsertId();
    }

    /** @return array<string, mixed>|null Valid (unexpired, unrevoked) token row. */
    public function findValid(string $tokenHash): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM refresh_tokens
             WHERE token_hash = :hash AND revoked_at IS NULL AND expires_at > NOW()
             LIMIT 1',
        );
        $stmt->execute(['hash' => $tokenHash]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    public function revoke(string $tokenHash): void
    {
        $stmt = $this->db->prepare(
            'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = :hash AND revoked_at IS NULL',
        );
        $stmt->execute(['hash' => $tokenHash]);
    }

    public function revokeById(int $tokenId): void
    {
        $stmt = $this->db->prepare(
            'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = :id AND revoked_at IS NULL',
        );
        $stmt->execute(['id' => $tokenId]);
    }

    public function revokeAllForUser(int $userId): void
    {
        $stmt = $this->db->prepare(
            'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = :user_id AND revoked_at IS NULL',
        );
        $stmt->execute(['user_id' => $userId]);
    }
}
