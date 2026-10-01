<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Controllers\Controller;
use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Repositories\PlatformSettingRepository;

/**
 * Admin → Dashboard Overview: every number is a live database
 * aggregate; every service row is a real check. No mock data.
 */
final class AdminOverviewController extends Controller
{
    /** GET /api/v1/admin/overview */
    public function index(Request $request): Response
    {
        $db = Database::connection();

        return Response::success([
            'stats'          => $this->stats($db),
            'revenue_series' => $this->revenueSeries($db),
            'signup_series'  => $this->signupSeries($db),
            'tool_usage'     => $this->toolUsage($db),
            'storage'        => $this->storage($db),
            'services'       => $this->services($db),
            'recent'         => $this->recents($db),
        ]);
    }

    /** @return list<array<string, mixed>> */
    private function stats(\PDO $db): array
    {
        $count = static fn (string $sql): int => (int) $db->query($sql)->fetchColumn();
        $pct = static function (float $current, float $previous): string {
            if ($previous <= 0) {
                return $current > 0 ? '+100%' : '0%';
            }
            $change = (($current - $previous) / $previous) * 100;

            return sprintf('%s%.1f%%', $change >= 0 ? '+' : '', $change);
        };

        $totalUsers = $count("SELECT COUNT(*) FROM users WHERE role = 'user'");
        $usersThisMonth = $count("SELECT COUNT(*) FROM users WHERE role = 'user' AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')");
        $usersLastMonth = $count("SELECT COUNT(*) FROM users WHERE role = 'user' AND created_at >= DATE_FORMAT(NOW() - INTERVAL 1 MONTH, '%Y-%m-01') AND created_at < DATE_FORMAT(NOW(), '%Y-%m-01')");

        $activeSubs = $count("SELECT COUNT(*) FROM subscriptions WHERE status = 'active'");
        $subsThisMonth = $count("SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')");

        $revenueThisMonth = (float) $db->query("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'paid' AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')")->fetchColumn();
        $revenueLastMonth = (float) $db->query("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'paid' AND created_at >= DATE_FORMAT(NOW() - INTERVAL 1 MONTH, '%Y-%m-01') AND created_at < DATE_FORMAT(NOW(), '%Y-%m-01')")->fetchColumn();

        $generationsToday = $count("SELECT COUNT(*) FROM ai_generations WHERE created_at >= CURDATE()");
        $generationsYesterday = $count("SELECT COUNT(*) FROM ai_generations WHERE created_at >= CURDATE() - INTERVAL 1 DAY AND created_at < CURDATE()");

        $currency = (string) ((new PlatformSettingRepository())->all()['currency'] ?? 'USD');

        return [
            ['id' => 'users',         'label' => 'Total users',          'value' => number_format($totalUsers),                      'delta' => $pct($usersThisMonth, $usersLastMonth) . ' MoM', 'up' => $usersThisMonth >= $usersLastMonth],
            ['id' => 'subscriptions', 'label' => 'Active subscriptions', 'value' => number_format($activeSubs),                      'delta' => '+' . $subsThisMonth . ' this month',            'up' => true],
            ['id' => 'revenue',       'label' => 'Revenue this month',   'value' => number_format($revenueThisMonth, 2) . ' ' . $currency, 'delta' => $pct($revenueThisMonth, $revenueLastMonth) . ' MoM', 'up' => $revenueThisMonth >= $revenueLastMonth],
            ['id' => 'generations',   'label' => 'Generations today',    'value' => number_format($generationsToday),                'delta' => $pct($generationsToday, $generationsYesterday) . ' DoD', 'up' => $generationsToday >= $generationsYesterday],
        ];
    }

    /** @return list<array{label: string, value: float}> Paid revenue, last 12 months. */
    private function revenueSeries(\PDO $db): array
    {
        $rows = $db->query(
            "SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym, COALESCE(SUM(amount), 0) AS total
             FROM payments
             WHERE status = 'paid' AND created_at >= DATE_FORMAT(NOW() - INTERVAL 11 MONTH, '%Y-%m-01')
             GROUP BY ym",
        )->fetchAll();
        $byMonth = array_column($rows, 'total', 'ym');

        $series = [];
        for ($i = 11; $i >= 0; $i--) {
            $ts = strtotime(date('Y-m-01') . " -{$i} months");
            $series[] = [
                'label' => date('M', $ts),
                'value' => round((float) ($byMonth[date('Y-m', $ts)] ?? 0), 2),
            ];
        }

        return $series;
    }

    /** @return list<array{label: string, value: int}> New users, last 7 days. */
    private function signupSeries(\PDO $db): array
    {
        $rows = $db->query(
            "SELECT DATE(created_at) AS d, COUNT(*) AS n
             FROM users
             WHERE role = 'user' AND created_at >= CURDATE() - INTERVAL 6 DAY
             GROUP BY d",
        )->fetchAll();
        $byDay = array_column($rows, 'n', 'd');

        $series = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = date('Y-m-d', strtotime("-{$i} days"));
            $series[] = ['label' => date('D', strtotime($day)), 'value' => (int) ($byDay[$day] ?? 0)];
        }

        return $series;
    }

    /** @return list<array{label: string, value: int}> Generations per tool, last 30 days. */
    private function toolUsage(\PDO $db): array
    {
        $rows = $db->query(
            'SELECT t.name AS label, COUNT(g.id) AS value
             FROM ai_generations g
             JOIN ai_tools t ON t.id = g.tool_id
             WHERE g.created_at >= NOW() - INTERVAL 30 DAY
             GROUP BY t.id, t.name
             ORDER BY value DESC
             LIMIT 6',
        )->fetchAll();

        return array_map(static fn (array $r): array => ['label' => (string) $r['label'], 'value' => (int) $r['value']], $rows);
    }

    /** @return array<string, int> Platform-wide bytes from the files table. */
    private function storage(\PDO $db): array
    {
        $rows = $db->query(
            'SELECT type, COALESCE(SUM(size_bytes), 0) AS bytes
             FROM files WHERE deleted_at IS NULL GROUP BY type',
        )->fetchAll();
        $byType = array_column($rows, 'bytes', 'type');

        return [
            'total_bytes'     => (int) array_sum($byType),
            'images_bytes'    => (int) ($byType['image'] ?? 0),
            'videos_bytes'    => (int) ($byType['video'] ?? 0),
            'audio_bytes'     => (int) ($byType['audio'] ?? 0),
            'documents_bytes' => (int) ($byType['document'] ?? 0),
            'files_count'     => (int) $db->query('SELECT COUNT(*) FROM files WHERE deleted_at IS NULL')->fetchColumn(),
        ];
    }

    /** @return list<array<string, string>> REAL health checks, not invented uptimes. */
    private function services(\PDO $db): array
    {
        $services = [];

        // Database: measured round-trip.
        $started = microtime(true);
        $db->query('SELECT 1');
        $dbMs = (int) round((microtime(true) - $started) * 1000);
        $services[] = ['id' => 'db', 'name' => 'Database', 'status' => 'operational', 'uptime' => 'live', 'latency' => max(1, $dbMs) . ' ms'];

        // AI providers: worst runtime status among enabled rows.
        $providers = $db->query('SELECT name, status FROM ai_providers WHERE enabled = 1')->fetchAll();
        if ($providers === []) {
            $services[] = ['id' => 'ai', 'name' => 'AI providers', 'status' => 'down', 'uptime' => 'none enabled', 'latency' => '—'];
        } else {
            $failed = array_filter($providers, static fn (array $p): bool => $p['status'] === 'failed');
            $services[] = [
                'id'      => 'ai',
                'name'    => 'AI providers',
                'status'  => $failed === [] ? 'operational' : (count($failed) === count($providers) ? 'down' : 'degraded'),
                'uptime'  => count($providers) . ' enabled',
                'latency' => $failed === [] ? 'healthy' : count($failed) . ' failing',
            ];
        }

        // Storage: the ACTIVE provider's recorded status.
        $storage = $db->query('SELECT name, status FROM storage_providers WHERE enabled = 1 LIMIT 1')->fetch();
        $services[] = [
            'id'      => 'storage',
            'name'    => 'File storage (' . ($storage['name'] ?? 'Local') . ')',
            'status'  => ($storage['status'] ?? 'connected') === 'failed' ? 'down' : 'operational',
            'uptime'  => (string) ($storage['status'] ?? 'connected'),
            'latency' => '—',
        ];

        // Email: configured or not.
        $settings = (new PlatformSettingRepository())->all();
        $smtpReady = ($settings['smtp_host'] ?? '') !== '' && ($settings['mail_from_email'] ?? '') !== '';
        $services[] = ['id' => 'mail', 'name' => 'Email (SMTP)', 'status' => $smtpReady ? 'operational' : 'degraded', 'uptime' => $smtpReady ? 'configured' : 'not configured', 'latency' => '—'];

        // Maintenance flag.
        $maintenance = ($settings['maintenance_mode'] ?? '0') === '1';
        $services[] = ['id' => 'app', 'name' => 'Web app', 'status' => $maintenance ? 'degraded' : 'operational', 'uptime' => $maintenance ? 'maintenance ON' : 'open', 'latency' => '—'];

        return $services;
    }

    /** @return array<string, list<array<string, mixed>>> */
    private function recents(\PDO $db): array
    {
        $registrations = $db->query(
            "SELECT u.id, u.name, u.email, u.created_at, COALESCE(p.name, 'Free') AS plan
             FROM users u
             LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
             LEFT JOIN plans p ON p.id = s.plan_id
             WHERE u.role = 'user'
             ORDER BY u.id DESC LIMIT 5",
        )->fetchAll();

        $activity = $db->query(
            'SELECT g.id, g.status, g.created_at, t.name AS tool, u.name AS user_name
             FROM ai_generations g
             JOIN ai_tools t ON t.id = g.tool_id
             LEFT JOIN users u ON u.id = g.user_id
             ORDER BY g.id DESC LIMIT 5',
        )->fetchAll();

        $payments = $db->query(
            'SELECT pay.id, pay.amount, pay.currency, pay.invoice_no, pay.created_at, u.name AS user_name
             FROM payments pay
             LEFT JOIN users u ON u.id = pay.user_id
             ORDER BY pay.id DESC LIMIT 5',
        )->fetchAll();

        return [
            'registrations' => array_map(static fn (array $r): array => [
                'id'         => 'u' . $r['id'],
                'primary'    => (string) $r['name'],
                'secondary'  => $r['email'] . ' · ' . $r['plan'],
                'created_at' => (string) $r['created_at'],
                'tone'       => $r['plan'] !== 'Free' ? 'teal' : null,
            ], $registrations),
            'activity' => array_map(static fn (array $r): array => [
                'id'         => 'g' . $r['id'],
                'primary'    => $r['tool'] . ' — ' . ($r['user_name'] ?? 'Deleted account'),
                'secondary'  => 'Generation ' . $r['status'],
                'created_at' => (string) $r['created_at'],
                'tone'       => $r['status'] === 'failed' ? 'destructive' : ($r['status'] === 'completed' ? 'teal' : null),
            ], $activity),
            'payments' => array_map(static fn (array $r): array => [
                'id'         => 'p' . $r['id'],
                'primary'    => ($r['user_name'] ?? 'Deleted account') . ' — ' . number_format((float) $r['amount'], 2) . ' ' . $r['currency'],
                'secondary'  => (string) $r['invoice_no'],
                'created_at' => (string) $r['created_at'],
                'tone'       => 'teal',
            ], $payments),
        ];
    }
}
