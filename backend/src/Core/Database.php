<?php

declare(strict_types=1);

namespace App\Core;

use App\Config\Config;
use PDO;

/**
 * Lazy PDO connection (single instance per request).
 * Prepared statements + real exceptions everywhere.
 */
final class Database
{
    private static ?PDO $pdo = null;

    private function __construct()
    {
    }

    public static function connection(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            Config::get('DB_HOST', '127.0.0.1'),
            Config::int('DB_PORT', 3306),
            Config::get('DB_DATABASE', 'ai_creative_studio'),
            Config::get('DB_CHARSET', 'utf8mb4'),
        );

        self::$pdo = new PDO(
            $dsn,
            Config::get('DB_USERNAME', 'root'),
            Config::get('DB_PASSWORD', ''),
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false, // native prepares — true parameter binding
                PDO::ATTR_STRINGIFY_FETCHES  => false,
            ],
        );

        return self::$pdo;
    }
}
