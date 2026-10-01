<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database;
use PDO;

/**
 * Device sessions — one row per issued refresh token, shown in
 * Settings > Security > Active Sessions.
 */
final class UserSessionRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    public function create(int $userId, ?int $refreshTokenId, string $device, string $ip, string $userAgent): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO user_sessions
                (user_id, refresh_token_id, device, ip_address, user_agent, last_active_at, created_at)
             VALUES (:user_id, :refresh_token_id, :device, :ip, :user_agent, NOW(), NOW())',
        );
        $stmt->execute([
            'user_id'          => $userId,
            'refresh_token_id' => $refreshTokenId,
            'device'           => mb_substr($device, 0, 160),
            'ip'               => mb_substr($ip, 0, 45),
            'user_agent'       => mb_substr($userAgent, 0, 255),
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function revokeByRefreshTokenId(int $refreshTokenId): void
    {
        $stmt = $this->db->prepare(
            'UPDATE user_sessions SET revoked_at = NOW()
             WHERE refresh_token_id = :id AND revoked_at IS NULL',
        );
        $stmt->execute(['id' => $refreshTokenId]);
    }

    public function revokeAllForUser(int $userId): void
    {
        $stmt = $this->db->prepare(
            'UPDATE user_sessions SET revoked_at = NOW()
             WHERE user_id = :user_id AND revoked_at IS NULL',
        );
        $stmt->execute(['user_id' => $userId]);
    }

    /** @return array<string, mixed>|null */
    public function findForUser(int $sessionId, int $userId): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM user_sessions
             WHERE id = :id AND user_id = :user_id AND revoked_at IS NULL
             LIMIT 1',
        );
        $stmt->execute(['id' => $sessionId, 'user_id' => $userId]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    public function revokeById(int $sessionId): void
    {
        $stmt = $this->db->prepare(
            'UPDATE user_sessions SET revoked_at = NOW() WHERE id = :id AND revoked_at IS NULL',
        );
        $stmt->execute(['id' => $sessionId]);
    }

    /** @return list<array<string, mixed>> */
    public function activeForUser(int $userId): array
    {
        $stmt = $this->db->prepare(
            'SELECT id, device, ip_address, location, last_active_at, created_at
             FROM user_sessions
             WHERE user_id = :user_id AND revoked_at IS NULL
             ORDER BY last_active_at DESC',
        );
        $stmt->execute(['user_id' => $userId]);

        return $stmt->fetchAll();
    }
}
