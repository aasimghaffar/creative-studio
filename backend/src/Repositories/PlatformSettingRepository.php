<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database;
use PDO;

/** Global key-value platform settings (credit rules live here). */
final class PlatformSettingRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /** @return array<string, string> setting_key => setting_value */
    public function all(): array
    {
        $rows = $this->db->query('SELECT setting_key, setting_value FROM platform_settings')->fetchAll();

        $map = [];
        foreach ($rows as $row) {
            $map[(string) $row['setting_key']] = (string) $row['setting_value'];
        }

        return $map;
    }

    public function getInt(string $key, int $default): int
    {
        $stmt = $this->db->prepare('SELECT setting_value FROM platform_settings WHERE setting_key = :k LIMIT 1');
        $stmt->execute(['k' => $key]);
        $value = $stmt->fetchColumn();

        return $value === false ? $default : (int) $value;
    }

    public function getBool(string $key, bool $default): bool
    {
        $stmt = $this->db->prepare('SELECT setting_value FROM platform_settings WHERE setting_key = :k LIMIT 1');
        $stmt->execute(['k' => $key]);
        $value = $stmt->fetchColumn();

        return $value === false ? $default : $value === '1';
    }

    /** Upsert a batch of settings. @param array<string, string> $values */
    public function setMany(array $values): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO platform_settings (setting_key, setting_value, updated_at)
             VALUES (:k, :v, NOW())
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()',
        );
        foreach ($values as $key => $value) {
            $stmt->execute(['k' => $key, 'v' => $value]);
        }
    }
}
