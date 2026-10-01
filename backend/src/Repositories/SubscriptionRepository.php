<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database;
use PDO;

final class SubscriptionRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /** @return array<string, mixed>|null Active/trialing subscription with its plan joined. */
    public function activeForUser(int $userId): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT s.*, p.slug AS plan_slug, p.name AS plan_name,
                    p.monthly_price, p.yearly_price, p.credits_per_cycle, p.seats
             FROM subscriptions s
             INNER JOIN plans p ON p.id = s.plan_id
             WHERE s.user_id = :user_id AND s.status IN ('active', 'trialing')
             ORDER BY s.id DESC
             LIMIT 1",
        );
        $stmt->execute(['user_id' => $userId]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    /** How many subscriptions (any status) reference this plan. */
    public function countByPlan(int $planId): int
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM subscriptions WHERE plan_id = :plan_id');
        $stmt->execute(['plan_id' => $planId]);

        return (int) $stmt->fetchColumn();
    }

    /** Close out any currently active subscription (plan change). */
    public function expireActive(int $userId): void
    {
        $this->db->prepare(
            "UPDATE subscriptions
             SET status = 'canceled', updated_at = NOW()
             WHERE user_id = :user_id AND status IN ('active', 'trialing')",
        )->execute(['user_id' => $userId]);
    }

    /** Gateway-agnostic create: 'manual' now; Stripe/PayPal later set gateway ids. */
    public function create(int $userId, int $planId, string $cycle, string $gateway = 'manual', ?string $gatewayRef = null): int
    {
        $interval = $cycle === 'yearly' ? '1 YEAR' : '1 MONTH';

        $stmt = $this->db->prepare(
            "INSERT INTO subscriptions
                (user_id, plan_id, billing_cycle, status, current_period_start,
                 current_period_end, cancel_at_period_end, gateway, gateway_subscription_id, created_at, updated_at)
             VALUES
                (:user_id, :plan_id, :cycle, 'active', NOW(),
                 DATE_ADD(NOW(), INTERVAL {$interval}), 0, :gateway, :gateway_ref, NOW(), NOW())",
        );
        $stmt->execute([
            'user_id'     => $userId,
            'plan_id'     => $planId,
            'cycle'       => $cycle,
            'gateway'     => $gateway,
            'gateway_ref' => $gatewayRef !== null && $gatewayRef !== '' ? $gatewayRef : null,
        ]);

        return (int) $this->db->lastInsertId();
    }
}
