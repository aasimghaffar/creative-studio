<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database;
use PDO;

/**
 * Reports: read-only aggregates over the tables the platform already
 * writes (ai_generations, credit_transactions, ai_tools). Nothing here
 * is stored or editable — every number is computed live, so any tool
 * (current or future) that goes through the generation engine appears
 * automatically.
 */
final class AdminReportRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /** Completed generations since a datetime (platform-wide). */
    public function generationsSince(?string $since): int
    {
        $sql = "SELECT COUNT(*) FROM ai_generations WHERE status = 'completed'";
        $params = [];
        if ($since !== null) {
            $sql .= ' AND created_at >= :since';
            $params['since'] = $since;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Completed generations and images per tool — every tool, lifetime.
     *
     * @return list<array{tool: string, slug: string, generations: int, images: int}>
     */
    public function generationsByTool(): array
    {
        $rows = $this->db->query(
            "SELECT t.name AS tool, t.slug, COUNT(g.id) AS generations,
                    COALESCE(SUM(g.quantity), 0) AS images
             FROM ai_tools t
             LEFT JOIN ai_generations g ON g.tool_id = t.id AND g.status = 'completed'
             GROUP BY t.id, t.name, t.slug
             ORDER BY generations DESC, t.sort_order ASC",
        )->fetchAll();

        return array_map(static fn (array $r): array => [
            'tool'        => (string) $r['tool'],
            'slug'        => (string) $r['slug'],
            'generations' => (int) $r['generations'],
            'images'      => (int) $r['images'],
        ], $rows);
    }

    /**
     * True credits consumed since a datetime: spends net of refunds.
     * spend amounts are negative and refunds positive in the ledger, so
     * -SUM over both types = consumed.
     */
    public function creditsConsumedSince(?string $since): int
    {
        $sql = "SELECT COALESCE(-SUM(amount), 0) FROM credit_transactions
                WHERE type IN ('spend', 'refund')";
        $params = [];
        if ($since !== null) {
            $sql .= ' AND created_at >= :since';
            $params['since'] = $since;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return max(0, (int) $stmt->fetchColumn());
    }

    /**
     * Credits consumed per tool, lifetime (completed generations only —
     * failed ones are refunded, so they don't count as consumption).
     *
     * @return list<array{tool: string, credits: int}>
     */
    public function creditsByTool(): array
    {
        $rows = $this->db->query(
            "SELECT t.name AS tool, COALESCE(SUM(g.credits_used), 0) AS credits
             FROM ai_tools t
             LEFT JOIN ai_generations g ON g.tool_id = t.id AND g.status = 'completed'
             GROUP BY t.id, t.name
             ORDER BY credits DESC, t.sort_order ASC",
        )->fetchAll();

        return array_map(static fn (array $r): array => [
            'tool'    => (string) $r['tool'],
            'credits' => (int) $r['credits'],
        ], $rows);
    }

    /**
     * Weekly consumed-credits buckets for the last four weeks
     * (oldest first), from the ledger.
     *
     * @return list<array{label: string, value: int}>
     */
    public function weeklyConsumption(): array
    {
        $series = [];
        for ($week = 3; $week >= 0; $week--) {
            $start = date('Y-m-d 00:00:00', strtotime(sprintf('-%d days', ($week + 1) * 7 - 1)));
            $end = date('Y-m-d 23:59:59', strtotime(sprintf('-%d days', $week * 7)));

            $stmt = $this->db->prepare(
                "SELECT COALESCE(-SUM(amount), 0) FROM credit_transactions
                 WHERE type IN ('spend', 'refund') AND created_at BETWEEN :start AND :end",
            );
            $stmt->execute(['start' => $start, 'end' => $end]);

            $series[] = [
                'label' => 'W' . (4 - $week),
                'value' => max(0, (int) $stmt->fetchColumn()),
            ];
        }

        return $series;
    }
}
