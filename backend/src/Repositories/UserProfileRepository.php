<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database;
use PDO;

final class UserProfileRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /** Idempotent: creates the 1:1 profile row if it doesn't exist yet. */
    public function createDefaults(int $userId): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO user_profiles (user_id, created_at, updated_at)
             VALUES (:user_id, NOW(), NOW())
             ON DUPLICATE KEY UPDATE updated_at = updated_at',
        );
        $stmt->execute(['user_id' => $userId]);
    }

    /** @return array<string, mixed>|null */
    public function findByUserId(int $userId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM user_profiles WHERE user_id = :user_id LIMIT 1');
        $stmt->execute(['user_id' => $userId]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    /** @param array{company: ?string, country: ?string, timezone: string, language: string, phone: ?string} $data */
    public function update(int $userId, array $data): void
    {
        $stmt = $this->db->prepare(
            'UPDATE user_profiles
             SET company = :company, country = :country, timezone = :timezone,
                 language = :language, phone = :phone, updated_at = NOW()
             WHERE user_id = :user_id',
        );
        $stmt->execute([
            'company'  => $data['company'],
            'country'  => $data['country'],
            'timezone' => $data['timezone'],
            'language' => $data['language'],
            'phone'    => $data['phone'],
            'user_id'  => $userId,
        ]);
    }

    public function setAvatarPath(int $userId, ?string $path): void
    {
        $stmt = $this->db->prepare(
            'UPDATE user_profiles SET avatar_path = :path, updated_at = NOW() WHERE user_id = :user_id',
        );
        $stmt->execute(['path' => $path, 'user_id' => $userId]);
    }
}
