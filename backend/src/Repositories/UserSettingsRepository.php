<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database;
use PDO;

final class UserSettingsRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /** Idempotent: creates the 1:1 settings row with schema defaults. */
    public function createDefaults(int $userId): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO user_settings (user_id, created_at, updated_at)
             VALUES (:user_id, NOW(), NOW())
             ON DUPLICATE KEY UPDATE updated_at = updated_at',
        );
        $stmt->execute(['user_id' => $userId]);
    }

    /** @return array<string, mixed>|null */
    public function findByUserId(int $userId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM user_settings WHERE user_id = :user_id LIMIT 1');
        $stmt->execute(['user_id' => $userId]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    /**
     * Update a whitelisted subset of columns — one method, every tab.
     *
     * @param array<string, mixed> $fields column => value (pre-validated)
     */
    public function updateFields(int $userId, array $fields): void
    {
        if ($fields === []) {
            return;
        }

        $allowed = [
            'theme', 'language', 'timezone',
            'default_image_size', 'default_style', 'auto_save_history',
            'email_generation', 'email_billing', 'email_product', 'push_enabled',
            'two_factor_enabled',
        ];

        $sets = [];
        $params = ['user_id' => $userId];
        foreach ($fields as $column => $value) {
            if (!in_array($column, $allowed, true)) {
                continue;
            }
            $sets[] = $column . ' = :' . $column;
            $params[$column] = is_bool($value) ? (int) $value : $value;
        }

        if ($sets === []) {
            return;
        }

        $stmt = $this->db->prepare(
            'UPDATE user_settings SET ' . implode(', ', $sets) . ', updated_at = NOW() WHERE user_id = :user_id',
        );
        $stmt->execute($params);
    }
}
