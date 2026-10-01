<?php

declare(strict_types=1);

/**
 * CLI migration runner: applies database/migrations/*.sql in order, once each.
 *
 *   composer migrate        (or: php database/migrate.php)
 *
 * Tracked in a `migrations` table; safe to run repeatedly.
 */

use App\Config\Config;
use App\Core\Database;
use Dotenv\Dotenv;

require dirname(__DIR__) . '/vendor/autoload.php';

if (PHP_SAPI !== 'cli') {
    exit("Run from the command line.\n");
}

$root = dirname(__DIR__);
if (is_file($root . '/.env')) {
    Dotenv::createImmutable($root)->safeLoad();
}
Config::init();

$db = Database::connection();

$db->exec(
    'CREATE TABLE IF NOT EXISTS migrations (
        id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
        migration   VARCHAR(190) NOT NULL,
        executed_at DATETIME     NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_migrations_name (migration)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4',
);

$applied = $db->query('SELECT migration FROM migrations')->fetchAll(PDO::FETCH_COLUMN);

$files = glob(__DIR__ . '/migrations/*.sql') ?: [];
sort($files);

$ran = 0;
foreach ($files as $file) {
    $name = basename($file);
    if (in_array($name, $applied, true)) {
        continue;
    }

    echo "Migrating: {$name}\n";
    $sql = (string) file_get_contents($file);

    // MySQL DDL auto-commits, so no transaction wrapper. Execute
    // statement-by-statement so a failure surfaces with its statement.
    $chunks = preg_split('/;\s*(?:\r?\n|$)/', $sql) ?: [];
    $statements = [];
    foreach ($chunks as $chunk) {
        $lines = array_filter(
            explode("\n", $chunk),
            static fn (string $line): bool => trim($line) !== '' && !str_starts_with(trim($line), '--'),
        );
        $stmt = trim(implode("\n", $lines));
        if ($stmt !== '') {
            $statements[] = $stmt;
        }
    }

    try {
        foreach ($statements as $statement) {
            $db->exec($statement);
        }
        $stmt = $db->prepare('INSERT INTO migrations (migration, executed_at) VALUES (:name, NOW())');
        $stmt->execute(['name' => $name]);
        $ran++;
    } catch (\Throwable $e) {
        exit("FAILED {$name}: {$e->getMessage()}\n");
    }
}

echo $ran === 0 ? "Nothing to migrate — database is up to date.\n" : "Done: {$ran} migration(s) applied.\n";