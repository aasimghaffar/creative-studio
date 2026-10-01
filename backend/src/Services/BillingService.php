<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Logger;
use App\Exceptions\HttpException;
use App\Exceptions\ValidationException;
use App\Repositories\CreditRepository;
use App\Repositories\GenerationRepository;
use App\Repositories\PaymentRepository;
use App\Repositories\PlanRepository;
use App\Repositories\SubscriptionRepository;

/**
 * Billing & Credits module.
 *
 * Gateway-agnostic by design: plan changes go through changePlan(), which
 * today records a 'manual' subscription + paid invoice. A Stripe / PayPal /
 * LemonSqueezy / Paddle integration later only replaces the payment step
 * (and fills gateway/gateway_subscription_id) — no schema or API changes.
 */
final class BillingService
{
    private const FREE_PLAN_SLUG = 'sketch';

    public function __construct(
        private readonly PlanRepository $plans = new PlanRepository(),
        private readonly SubscriptionRepository $subscriptions = new SubscriptionRepository(),
        private readonly PaymentRepository $payments = new PaymentRepository(),
        private readonly CreditRepository $credits = new CreditRepository(),
        private readonly GenerationRepository $generations = new GenerationRepository(),
    ) {
    }

    /** @return list<array<string, mixed>> Public plan catalogue. */
    public function planCatalogue(): array
    {
        return array_map(static fn (array $plan): array => [
            'slug'              => $plan['slug'],
            'name'              => $plan['name'],
            'tagline'           => $plan['tagline'],
            'monthly_price'     => $plan['monthly_price'],
            'yearly_price'      => $plan['yearly_price'],
            'credits_per_cycle' => $plan['credits_per_cycle'],
            'seats'             => (int) $plan['seats'],
            'features'          => $plan['features'],
            'is_popular'        => (bool) $plan['is_popular'],
            'badge'             => $plan['badge'] ?? '',
            'sort_order'        => (int) $plan['sort_order'],
        ], $this->plans->allActive());
    }

    /** @return array<string, mixed> Current plan + subscription details (free fallback). */
    public function currentPlan(int $userId): array
    {
        $sub = $this->subscriptions->activeForUser($userId);

        if ($sub === null) {
            $free = $this->plans->findBySlug(self::FREE_PLAN_SLUG);

            return [
                'plan_slug'         => $free['slug'] ?? self::FREE_PLAN_SLUG,
                'plan_name'         => $free['name'] ?? 'Sketch',
                'billing_cycle'     => 'monthly',
                'status'            => 'active',
                'price'             => 0.0,
                'credits_per_cycle' => $free['credits_per_cycle'] !== null ? (int) $free['credits_per_cycle'] : 0,
                'seats'             => (int) ($free['seats'] ?? 1),
                'started_on'        => null,
                'renews_on'         => null,
                'auto_renew'        => false,
                'is_free'           => true,
            ];
        }

        // yearly_price stores the TOTAL per year (migration 028) — the
        // current-plan card shows the per-month equivalent.
        $price = $sub['billing_cycle'] === 'yearly'
            ? ($sub['yearly_price'] !== null ? round((float) $sub['yearly_price'] / 12, 2) : null)
            : ($sub['monthly_price'] !== null ? (float) $sub['monthly_price'] : null);

        return [
            'plan_slug'         => $sub['plan_slug'],
            'plan_name'         => $sub['plan_name'],
            'billing_cycle'     => $sub['billing_cycle'],
            'status'            => $sub['status'],
            'price'             => $price,
            'credits_per_cycle' => $sub['credits_per_cycle'] !== null ? (int) $sub['credits_per_cycle'] : null,
            'seats'             => (int) $sub['seats'],
            'started_on'        => $sub['current_period_start'],
            'renews_on'         => $sub['current_period_end'],
            'auto_renew'        => !(bool) $sub['cancel_at_period_end'],
            'is_free'           => false,
        ];
    }

    /**
     * @return array<string, mixed> All four figures from ledger records —
     *         balance, used, and total always satisfy total - used = balance.
     */
    public function creditsOverview(int $userId): array
    {
        $plan = $this->currentPlan($userId);
        $totals = $this->credits->totals($userId);

        $cycleStart = $plan['started_on'] ?? date('Y-m-01 00:00:00');

        return [
            'balance'           => $totals['balance'],
            'total_granted'     => $totals['granted'],
            'used_total'        => $totals['used'],
            'used_this_cycle'   => $this->credits->spentSince($userId, (string) $cycleStart),
            'credits_per_cycle' => $plan['credits_per_cycle'],
            'unlimited'         => $this->planIsUnlimited($plan),
            'resets_on'         => $plan['renews_on'],
        ];
    }

    /** A PAID plan with no credit allowance = unlimited generations. */
    public function isUnlimited(int $userId): bool
    {
        return $this->planIsUnlimited($this->currentPlan($userId));
    }

    /** @param array<string, mixed> $plan */
    private function planIsUnlimited(array $plan): bool
    {
        return !(bool) $plan['is_free'] && $plan['credits_per_cycle'] === null;
    }

    /** @return list<array<string, mixed>> */
    public function paymentHistory(int $userId): array
    {
        return array_map(static fn (array $row): array => [
            'id'          => (int) $row['id'],
            'invoice_no'  => $row['invoice_no'],
            'description' => $row['description'],
            'amount'      => (float) $row['amount'],
            'currency'    => $row['currency'],
            'status'      => $row['status'],
            'gateway'     => (string) ($row['gateway'] ?? 'manual'),
            'transaction' => $row['gateway_payment_id'] ?? null,
            'date'        => $row['paid_at'] ?? $row['created_at'],
        ], $this->payments->listForUser($userId));
    }

    /** @return list<array{tool_slug: string, tool_name: string, credits: int}> */
    public function creditUsage(int $userId): array
    {
        $plan = $this->currentPlan($userId);
        $since = $plan['started_on'] !== null ? (string) $plan['started_on'] : null;

        return $this->generations->creditUsageByTool($userId, $since);
    }

    /**
     * Change plan (testing mode: no gateway).
     *
     * @return array<string, mixed> Fresh current-plan + credits payload.
     */
    public function changePlan(int $userId, string $planSlug, string $billingCycle): array
    {
        if (!in_array($billingCycle, ['monthly', 'yearly'], true)) {
            throw new ValidationException(['billing_cycle' => ['Billing cycle must be monthly or yearly.']]);
        }

        $plan = $this->plans->findBySlug($planSlug);
        if ($plan === null || !(bool) $plan['is_active']) {
            throw new HttpException(404, 'That plan is not available.');
        }

        $price = $billingCycle === 'yearly' ? $plan['yearly_price'] : $plan['monthly_price'];
        if ($price === null) {
            throw new HttpException(409, 'This plan is quoted per team — contact sales to enable it.');
        }

        $current = $this->subscriptions->activeForUser($userId);
        if ($current !== null && $current['plan_slug'] === $planSlug && $current['billing_cycle'] === $billingCycle) {
            throw new HttpException(409, 'You are already on this plan.');
        }

        // PAID plans never activate here — they go through checkout and
        // only activatePaidPlan() (called after gateway verification)
        // can switch them on. This endpoint remains the direct path for
        // free plans only.
        // yearly_price stores the TOTAL per year (migration 028) — never multiply.
        $chargedAmount = (float) $price;
        if ($chargedAmount > 0) {
            throw new HttpException(402, 'This plan requires payment — complete checkout to activate it.');
        }

        $this->subscriptions->expireActive($userId);
        $subscriptionId = $this->subscriptions->create($userId, (int) $plan['id'], $billingCycle);
        $paymentId = null;

        // Subscription receipt email (template-gated, failure-safe).
        if ($paymentId !== null) {
            $buyer = (new \App\Repositories\UserRepository())->findById($userId);
            $invoiceNo = $this->payments->invoiceNumber($paymentId);
            if ($buyer !== null && $invoiceNo !== null) {
                $currency = (string) ((new \App\Repositories\PlatformSettingRepository())->all()['currency'] ?? 'USD');
                (new \App\Services\Mail\MailService())->sendTemplate('subscription_receipt', (string) $buyer['email'], [
                    'name'    => (string) $buyer['name'],
                    'plan'    => (string) $plan['name'],
                    'invoice' => $invoiceNo,
                    'amount'  => number_format($chargedAmount, 2) . ' ' . $currency,
                ]);
            }
        }

        // Previous plan credits do not carry over: clear the remaining
        // balance (audited ledger entry) before granting the new cycle.
        $removed = $this->credits->clearBalance($userId, sprintf('Plan change — unused credits removed (switched to %s)', $plan['name']));
        if ($removed > 0) {
            Logger::channel('app')->info('Plan change cleared credits', ['user_id' => $userId, 'removed' => $removed]);
        }

        // Grant the cycle's credits immediately.
        if ($plan['credits_per_cycle'] !== null && (int) $plan['credits_per_cycle'] > 0) {
            $this->credits->grant(
                $userId,
                (int) $plan['credits_per_cycle'],
                sprintf('%s plan credits (%s cycle)', $plan['name'], $billingCycle),
            );
        }

        $notifier = new NotificationService();
        $notifier->subscription(
            $userId,
            sprintf('Plan upgraded to %s', $plan['name']),
            sprintf('Billed %s. Your new cycle starts today.', $billingCycle === 'yearly' ? 'yearly' : 'monthly'),
        );
        if ($chargedAmount > 0) {
            $notifier->payment(
                $userId,
                'Payment successful',
                sprintf('$%.2f charged for the %s plan (%s billing).', $chargedAmount, $plan['name'], $billingCycle),
            );
        }
        if ($plan['credits_per_cycle'] !== null && (int) $plan['credits_per_cycle'] > 0) {
            $notifier->credits(
                $userId,
                'Credits added',
                sprintf('%d plan credits were added to your balance.', (int) $plan['credits_per_cycle']),
            );
        }

        Logger::channel('app')->info('Plan changed', [
            'user_id' => $userId,
            'plan'    => $planSlug,
            'cycle'   => $billingCycle,
        ]);

        return [
            'current_plan' => $this->currentPlan($userId),
            'credits'      => $this->creditsOverview($userId),
        ];
    }

    /**
     * Activate a plan after a gateway-verified payment. Called ONLY by
     * PaymentService::finalizePaid — the single trusted path for paid
     * activations. Applies the existing credit business logic: previous
     * balance is cleared (audited), then the new cycle is granted.
     */
    public function activatePaidPlan(int $userId, int $planId, string $billingCycle, string $gateway, string $gatewayRef, int $paymentId): void
    {
        $plan = $this->plans->findById($planId);
        if ($plan === null) {
            return;
        }

        $this->subscriptions->expireActive($userId);
        $subscriptionId = $this->subscriptions->create($userId, (int) $plan['id'], $billingCycle, $gateway, $gatewayRef);

        $db = \App\Core\Database::connection();
        $db->prepare('UPDATE payments SET subscription_id = :sub WHERE id = :id')
            ->execute(['sub' => $subscriptionId, 'id' => $paymentId]);
        $db->prepare(
            'INSERT INTO subscription_history (user_id, plan_name, action, note, created_at)
             VALUES (:user_id, :plan, :action, :note, NOW())',
        )->execute([
            'user_id' => $userId,
            'plan'    => (string) $plan['name'],
            'action'  => 'activated',
            'note'    => sprintf('%s billing via %s', $billingCycle, $gateway),
        ]);

        // Receipt email (template-gated, failure-safe).
        $buyer = (new \App\Repositories\UserRepository())->findById($userId);
        $invoiceNo = $this->payments->invoiceNumber($paymentId);
        $payment = null;
        $stmt = $db->prepare('SELECT amount, currency FROM payments WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $paymentId]);
        $payment = $stmt->fetch() ?: null;
        if ($buyer !== null && $invoiceNo !== null && $payment !== null) {
            (new \App\Services\Mail\MailService())->sendTemplate('subscription_receipt', (string) $buyer['email'], [
                'name'    => (string) $buyer['name'],
                'plan'    => (string) $plan['name'],
                'invoice' => $invoiceNo,
                'amount'  => number_format((float) $payment['amount'], 2) . ' ' . (string) $payment['currency'],
            ]);
        }

        // Credit business logic — unchanged: clear, then grant.
        $removed = $this->credits->clearBalance($userId, sprintf('Plan change — unused credits removed (switched to %s)', $plan['name']));
        if ($removed > 0) {
            Logger::channel('app')->info('Plan change cleared credits', ['user_id' => $userId, 'removed' => $removed]);
        }
        if ($plan['credits_per_cycle'] !== null && (int) $plan['credits_per_cycle'] > 0) {
            $this->credits->grant(
                $userId,
                (int) $plan['credits_per_cycle'],
                sprintf('%s plan credits (%s cycle)', $plan['name'], $billingCycle),
            );
        }

        $notifier = new NotificationService();
        $notifier->subscription(
            $userId,
            sprintf('Plan upgraded to %s', $plan['name']),
            sprintf('Billed %s. Your new cycle starts today.', $billingCycle === 'yearly' ? 'yearly' : 'monthly'),
        );
        $notifier->payment($userId, 'Payment successful', sprintf('Invoice %s is paid — thank you!', (string) $invoiceNo));
    }

    /** Cancel the active subscription (stays active semantics: immediate). */
    public function cancelSubscription(int $userId): void
    {
        $current = $this->subscriptions->activeForUser($userId);
        if ($current === null) {
            throw new HttpException(409, 'There is no active subscription to cancel.');
        }
        $this->subscriptions->expireActive($userId);
        \App\Core\Database::connection()->prepare(
            'INSERT INTO subscription_history (user_id, plan_name, action, note, created_at)
             VALUES (:user_id, :plan, :action, :note, NOW())',
        )->execute([
            'user_id' => $userId,
            'plan'    => (string) $current['plan_name'],
            'action'  => 'canceled',
            'note'    => 'Canceled by the user',
        ]);
        (new NotificationService())->subscription($userId, 'Subscription canceled', 'Your plan was canceled. You are back on the free tier.');
    }
}
