<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database;
use PDO;

/**
 * All SQL for the users table lives here. Prepared statements only.
 */
final class UserRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /** @return array<string, mixed>|null */
    public function findByEmail(string $email): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();

        return $user === false ? null : $user;
    }

    /** @return array<string, mixed>|null */
    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();

        return $user === false ? null : $user;
    }

    public function create(string $name, string $email, string $passwordHash): int
    {
        // Credits start at 0 — the welcome grant goes through the credit
        // ledger so every credit on the platform has a transaction record.
        $stmt = $this->db->prepare(
            'INSERT INTO users (name, email, password_hash, role, status, credits, created_at, updated_at)
             VALUES (:name, :email, :password_hash, :role, :status, 0, NOW(), NOW())',
        );
        $stmt->execute([
            'name'          => $name,
            'email'         => $email,
            'password_hash' => $passwordHash,
            'role'          => 'user',
            'status'        => 'active',
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function updateAccount(int $userId, string $name, string $email): void
    {
        $stmt = $this->db->prepare(
            'UPDATE users SET name = :name, email = :email, updated_at = NOW() WHERE id = :id',
        );
        $stmt->execute(['name' => $name, 'email' => $email, 'id' => $userId]);
    }

    public function deleteById(int $userId): void
    {
        // CASCADEs wipe profiles, settings, sessions, tokens, generations, history…
        $this->db->prepare('DELETE FROM users WHERE id = :id')->execute(['id' => $userId]);
    }

    public function updatePassword(int $userId, string $passwordHash): void
    {
        $stmt = $this->db->prepare(
            'UPDATE users SET password_hash = :hash, updated_at = NOW() WHERE id = :id',
        );
        $stmt->execute(['hash' => $passwordHash, 'id' => $userId]);
    }

    public function markEmailVerified(int $userId): void
    {
        $stmt = $this->db->prepare(
            'UPDATE users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = :id',
        );
        $stmt->execute(['id' => $userId]);
    }

    public function touchLastLogin(int $userId): void
    {
        $stmt = $this->db->prepare('UPDATE users SET last_login_at = NOW() WHERE id = :id');
        $stmt->execute(['id' => $userId]);
    }

    /**
     * Public shape of a user — the only shape controllers may return.
     *
     * @param array<string, mixed> $user
     *
     * @return array<string, mixed>
     */
    public static function toPublic(array $user): array
    {
        // The header avatar needs the profile photo everywhere the user
        // object travels (login, refresh, /auth/me).
        $avatarUrl = null;
        $stmt = \App\Core\Database::connection()->prepare(
            'SELECT avatar_path FROM user_profiles WHERE user_id = :id LIMIT 1',
        );
        $stmt->execute(['id' => (int) $user['id']]);
        $path = $stmt->fetchColumn();
        if (is_string($path) && $path !== '') {
            $avatarUrl = (new \App\Services\ImageStorageService())->toUrl($path);
        }

        return [
            'id'         => (int) $user['id'],
            'name'       => $user['name'],
            'email'      => $user['email'],
            'role'       => $user['role'],
            'status'     => $user['status'],
            'email_verified' => $user['email_verified_at'] !== null,
            'credits'    => (int) $user['credits'],
            'avatar_url' => $avatarUrl,
            'created_at' => $user['created_at'],
        ];
    }
}
