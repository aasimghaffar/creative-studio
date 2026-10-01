<?php

declare(strict_types=1);

/**
 * Promote an account to admin (CLI):
 *
 *   php database/make-admin.php user@example.com
 *   composer make-admin -- user@example.com
 */

use App\Config\Config;
use App\Core\Database;
use Dotenv\Dotenv;

require dirname(__DIR__) . '/vendor/autoload.php';

if (PHP_SAPI !== 'cli') {
    exit("Run from the command line.\n");
}

$email = strtolower(trim($argv[1] ?? ''));
if ($email === '') {
    exit("Usage: php database/make-admin.php <email>\n");
}

$root = dirname(__DIR__);
if (is_file($root . '/.env')) {
    Dotenv::createImmutable($root)->safeLoad();
}
Config::init();

$db = Database::connection();
$stmt = $db->prepare("UPDATE users SET role = 'admin', updated_at = NOW() WHERE email = :email");
$stmt->execute(['email' => $email]);

echo $stmt->rowCount() > 0
    ? "Done — {$email} is now an admin. Sign out and back in to refresh the token.\n"
    : "No account found for {$email}.\n";
