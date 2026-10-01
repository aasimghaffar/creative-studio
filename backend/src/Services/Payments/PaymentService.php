<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Core\Database;
use App\Core\Logger;
use App\Exceptions\HttpException;
use App\Exceptions\ValidationException;
use App\Repositories\PlanRepository;
use App\Repositories\PlatformSettingRepository;
use App\Services\BillingService;
use App\Services\NotificationService;
use App\Services\Storage\CredentialCrypto;

/**
 * Orchestrates the paid-plan checkout: pending payment -> hosted
 * gateway checkout -> server-side verification -> idempotent
 * finalization (subscription + credits + invoice + notifications).
 * Nothing activates without a gateway-verified payment.
 */
final class PaymentService
{
    public function __construct(
        private readonly PlanRepository $plans = new PlanRepository(),
    ) {
    }

    /** Enabled gateways for the checkout page (safe fields only). */
    public function enabledGateways(): array
    {
        $rows = Database::connection()
            ->query("SELECT slug, name, environment FROM payment_gateways WHERE enabled = 1 ORDER BY id")
            ->fetchAll();

        return array_map(static fn (array $r): array => [
            'slug'        => (string) $r['slug'],
            'name'        => (string) $r['name'],
            'environment' => (string) $r['environment'],
        ], $rows);
    }

    /** @return array{payment_id: int, redirect_url: string} */
    public function startCheckout(int $userId, string $planSlug, string $cycle, string $gatewaySlug, string $frontendBase): array
    {
        if (!in_array($cycle, ['monthly', 'yearly'], true)) {
            throw new ValidationException(['billing_cycle' => ['Billing cycle must be monthly or yearly.']]);
        }
        $plan = $this->plans->findBySlug($planSlug);
        if ($plan === null || !(bool) $plan['is_active']) {
            throw new HttpException(404, 'That plan is not available.');
        }
        $price = $cycle === 'yearly' ? $plan['yearly_price'] : $plan['monthly_price'];
        if ($price === null) {
            throw new HttpException(409, 'This plan is quoted per team — contact sales.');
        }
        // yearly_price stores the TOTAL per year (migration 028) — never multiply.
        $amount = (float) $price;
        if ($amount <= 0) {
            throw new HttpException(409, 'Free plans do not need checkout — switch directly from Billing.');
        }

        [$row, $gateway] = $this->gatewayFor($gatewaySlug, true);

        $db = Database::connection();
        $settings = (new PlatformSettingRepository())->all();
        $prefix = (string) ($settings['invoice_prefix'] ?? 'INV') ?: 'INV';
        $currency = (string) ($settings['currency'] ?? 'USD');
        $invoiceNo = sprintf('%s-%s-%s', $prefix, date('Y'), strtoupper(bin2hex(random_bytes(3))));
        $description = sprintf('%s plan — %s billing', $plan['name'], $cycle);

        $db->prepare(
            "INSERT INTO payments
                (user_id, plan_id, billing_cycle, gateway, invoice_no, description, amount, currency, status, created_at)
             VALUES (:user_id, :plan_id, :cycle, :gateway, :invoice_no, :description, :amount, :currency, 'pending', NOW())",
        )->execute([
            'user_id'     => $userId,
            'plan_id'     => (int) $plan['id'],
            'cycle'       => $cycle,
            'gateway'     => $gatewaySlug,
            'invoice_no'  => $invoiceNo,
            'description' => $description,
            'amount'      => $amount,
            'currency'    => $currency,
        ]);
        $paymentId = (int) $db->lastInsertId();

        $base = rtrim($frontendBase, '/');
        try {
            $checkout = $gateway->createCheckout(
                ['id' => $paymentId, 'invoice_no' => $invoiceNo, 'amount' => $amount, 'currency' => $currency, 'description' => $description],
                [
                    'success' => $base . '/app/checkout?payment=' . $paymentId . '&gw=' . $gatewaySlug . '&outcome=return',
                    'cancel'  => $base . '/app/checkout?payment=' . $paymentId . '&gw=' . $gatewaySlug . '&outcome=cancel',
                ],
            );
        } catch (\RuntimeException $e) {
            $this->markFailed($paymentId, $e->getMessage());
            throw new HttpException(502, $e->getMessage());
        }

        $db->prepare('UPDATE payments SET gateway_payment_id = :ref WHERE id = :id')
            ->execute(['ref' => $checkout['gateway_ref'], 'id' => $paymentId]);

        Logger::channel('payments')->info('Checkout started', [
            'payment_id' => $paymentId, 'gateway' => $gatewaySlug, 'amount' => $amount,
        ]);

        return ['payment_id' => $paymentId, 'redirect_url' => $checkout['redirect_url']];
    }

    /**
     * Verify with the gateway and finalize. Idempotent and safe to call
     * repeatedly (return-URL AND webhook can both land here).
     *
     * @return array{status: string, message: string}
     */
    public function confirm(int $userId, int $paymentId, array $params): array
    {
        $payment = $this->find($paymentId);
        if ($payment === null || (int) $payment['user_id'] !== $userId) {
            throw new HttpException(404, 'Payment not found.');
        }
        if ($payment['status'] === 'paid') {
            return ['status' => 'paid', 'message' => 'Payment already confirmed.'];
        }
        if ($payment['status'] !== 'pending') {
            return ['status' => (string) $payment['status'], 'message' => 'This payment is ' . $payment['status'] . '.'];
        }

        if (($params['outcome'] ?? '') === 'cancel') {
            $this->markFailed($paymentId, 'Canceled by the user at the gateway.');

            return ['status' => 'failed', 'message' => 'Checkout canceled — nothing was charged or activated.'];
        }

        [, $gateway] = $this->gatewayFor((string) $payment['gateway'], false);
        $verdict = $gateway->verifyPayment((string) $payment['gateway_payment_id'], $params);

        return match ($verdict['status']) {
            'paid'     => $this->finalizePaid($paymentId, null) ?
                ['status' => 'paid', 'message' => 'Payment verified — your plan is active.'] :
                ['status' => 'paid', 'message' => 'Payment already confirmed.'],
            'pending'  => ['status' => 'pending', 'message' => $verdict['message']],
            'canceled' => $this->markFailed($paymentId, $verdict['message'])
                ?: ['status' => 'failed', 'message' => 'Checkout canceled — nothing was activated.'],
            default    => $this->markFailed($paymentId, $verdict['message'])
                ?: ['status' => 'failed', 'message' => $verdict['message']],
        };
    }

    /**
     * The ONE place a payment becomes paid. Idempotent via a guarded
     * UPDATE: only the caller that flips pending->paid runs activation,
     * so a racing webhook + return-URL cannot double-grant credits.
     */
    public function finalizePaid(int $paymentId, ?string $webhookRef): bool
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "UPDATE payments SET status = 'paid', paid_at = NOW(), webhook_ref = COALESCE(:ref, webhook_ref)
             WHERE id = :id AND status = 'pending'",
        );
        $stmt->execute(['id' => $paymentId, 'ref' => $webhookRef]);
        if ($stmt->rowCount() === 0) {
            return false; // someone else finalized it — do not re-activate
        }

        $payment = $this->find($paymentId);
        if ($payment === null || $payment['plan_id'] === null) {
            return true;
        }

        (new BillingService())->activatePaidPlan(
            (int) $payment['user_id'],
            (int) $payment['plan_id'],
            (string) $payment['billing_cycle'],
            (string) $payment['gateway'],
            (string) ($payment['gateway_payment_id'] ?? ''),
            $paymentId,
        );

        Logger::channel('payments')->info('Payment finalized', ['payment_id' => $paymentId]);

        return true;
    }

    public function markFailed(int $paymentId, string $reason): ?array
    {
        Database::connection()->prepare(
            "UPDATE payments SET status = 'failed', meta = :meta WHERE id = :id AND status = 'pending'",
        )->execute(['id' => $paymentId, 'meta' => mb_substr($reason, 0, 500)]);
        Logger::channel('payments')->warning('Payment failed', ['payment_id' => $paymentId, 'reason' => $reason]);

        return null;
    }

    public function markRefunded(int $paymentId): void
    {
        Database::connection()->prepare(
            "UPDATE payments SET status = 'refunded' WHERE id = :id AND status = 'paid'",
        )->execute(['id' => $paymentId]);

        $payment = $this->find($paymentId);
        if ($payment !== null) {
            Database::connection()->prepare(
                'INSERT INTO subscription_history (user_id, plan_name, action, note, created_at)
                 VALUES (:user_id, :plan, :action, :note, NOW())',
            )->execute([
                'user_id' => (int) $payment['user_id'],
                'plan'    => mb_substr((string) $payment['description'], 0, 80),
                'action'  => 'canceled',
                'note'    => 'Refund processed for ' . $payment['invoice_no'],
            ]);
            (new NotificationService())->payment(
                (int) $payment['user_id'],
                'Payment refunded',
                sprintf('Invoice %s was refunded by your payment provider.', $payment['invoice_no']),
            );
        }
    }

    /** @return array<string, mixed>|null */
    public function find(int $paymentId): ?array
    {
        $stmt = Database::connection()->prepare('SELECT * FROM payments WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $paymentId]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    /** @return array<string, mixed>|null */
    public function findByGatewayRef(string $gateway, string $ref): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT * FROM payments WHERE gateway = :gateway AND gateway_payment_id = :ref LIMIT 1',
        );
        $stmt->execute(['gateway' => $gateway, 'ref' => $ref]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    /**
     * Gateway instance from its DB row — credentials decrypted here and
     * nowhere else. $mustBeEnabled guards checkout; webhooks/verification
     * work for any configured gateway.
     *
     * @return array{0: array<string, mixed>, 1: GatewayInterface}
     */
    public function gatewayFor(string $slug, bool $mustBeEnabled): array
    {
        $stmt = Database::connection()->prepare('SELECT * FROM payment_gateways WHERE slug = :slug LIMIT 1');
        $stmt->execute(['slug' => $slug]);
        $row = $stmt->fetch();
        if ($row === false) {
            throw new HttpException(404, 'Unknown payment gateway.');
        }
        if ($mustBeEnabled && !(bool) $row['enabled']) {
            throw new HttpException(409, 'That payment gateway is not enabled.');
        }

        $credentials = CredentialCrypto::decrypt($row['credentials'] ?? null);
        $environment = (string) ($row['environment'] ?? 'sandbox');

        $gateway = match ((string) $row['slug']) {
            'stripe'   => new StripeGateway($credentials, $environment),
            'paypal'   => new PayPalGateway($credentials, $environment),
            default    => throw new HttpException(409, 'Unsupported gateway.'),
        };

        return [$row, $gateway];
    }
}
