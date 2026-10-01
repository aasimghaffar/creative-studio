<?php

declare(strict_types=1);

/**
 * Credit lifecycle runner — monthly reset + credit expiry.
 * Run from cron (daily is fine; both rules are idempotent):
 *
 *   0 1 * * *  cd /path/to/backend && composer credits-cycle
 *
 * Monthly reset (admin toggle): for every ACTIVE subscription whose period
 * has ended, the remaining balance is cleared, the plan's cycle credits are
 * granted fresh, and the period advances — "reset balances on the billing
 * date" exactly as the admin screen describes.
 *
 * Credit expiry (admin setting, 0 = never): any part of a user's balance
 * NOT covered by credits granted within the last N days expires, with an
 * audited 'expiry' ledger entry.
 */

use App\Config\Config;
use App\Core\Database;
use App\Repositories\CreditRepository;
use App\Repositories\PlatformSettingRepository;
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
$settings = new PlatformSettingRepository();
$credits = new CreditRepository();

echo "== Credits cycle run — " . date('Y-m-d H:i:s') . " ==\n";

/* ---------- Monthly reset ---------- */
if ($settings->getBool('monthly_credit_reset', false)) {
    $due = $db->query(
        "SELECT s.id, s.user_id, s.billing_cycle, s.current_period_end,
                p.name AS plan_name, p.credits_per_cycle
         FROM subscriptions s
         JOIN plans p ON p.id = s.plan_id
         WHERE s.status = 'active' AND s.current_period_end <= NOW()",
    )->fetchAll();

    foreach ($due as $sub) {
        $userId = (int) $sub['user_id'];

        $removed = $credits->clearBalance($userId, sprintf('Monthly reset — %s billing date', $sub['plan_name']));

        $granted = 0;
        if ($sub['credits_per_cycle'] !== null && (int) $sub['credits_per_cycle'] > 0) {
            $granted = (int) $sub['credits_per_cycle'];
            $credits->grant($userId, $granted, sprintf('%s plan credits (monthly reset)', $sub['plan_name']));
        }

        $interval = $sub['billing_cycle'] === 'yearly' ? '1 YEAR' : '1 MONTH';
        $db->prepare(
            "UPDATE subscriptions
             SET current_period_start = current_period_end,
                 current_period_end = DATE_ADD(current_period_end, INTERVAL {$interval}),
                 updated_at = NOW()
             WHERE id = :id",
        )->execute(['id' => (int) $sub['id']]);

        printf("reset user %d: cleared %d, granted %d (%s)\n", $userId, $removed, $granted, $sub['plan_name']);
    }
    echo count($due) . " subscription(s) reset.\n";
} else {
    echo "Monthly reset: disabled.\n";
}

/* ---------- Credit expiry ---------- */
$expiryDays = $settings->getInt('credit_expiry_days', 0);
if ($expiryDays > 0) {
    $since = date('Y-m-d H:i:s', strtotime("-{$expiryDays} days"));
    $holders = $db->query('SELECT id FROM users WHERE credits > 0')->fetchAll();

    $expiredUsers = 0;
    foreach ($holders as $holder) {
        $userId = (int) $holder['id'];
        $balance = $credits->balance($userId);
        $freshGrants = $credits->grantedSince($userId, $since);

        // Whatever the recent grants can't cover is older than the window.
        $expirable = max(0, $balance - $freshGrants);
        if ($expirable > 0) {
            $credits->expire($userId, $expirable, sprintf('Credit expiry — older than %d days', $expiryDays));
            printf("expired %d credit(s) for user %d\n", $expirable, $userId);
            $expiredUsers++;
        }
    }
    echo $expiredUsers . " user(s) had credits expire.\n";
} else {
    echo "Credit expiry: disabled (0 days).\n";
}

echo "Done.\n";
