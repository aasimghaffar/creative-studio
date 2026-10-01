<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database;
use PDO;

/** Aggregate file statistics for the Settings > Storage tab. */
final class FileStatsRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /** @return array<string, int> type => total bytes (live files only). */
    public function usageByType(int $userId): array
    {
        $stmt = $this->db->prepare(
            'SELECT type, COALESCE(SUM(size_bytes), 0) AS bytes
             FROM files
             WHERE user_id = :user_id AND deleted_at IS NULL
             GROUP BY type',
        );
        $stmt->execute(['user_id' => $userId]);

        $usage = [];
        foreach ($stmt->fetchAll() as $row) {
            $usage[(string) $row['type']] = (int) $row['bytes'];
        }

        return $usage;
    }
}
