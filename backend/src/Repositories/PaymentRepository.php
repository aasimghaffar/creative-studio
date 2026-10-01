<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database;
use PDO;

final class PaymentRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /** @return list<array<string, mixed>> Newest first. */
    public function listForUser(int $userId, int $limit = 24): array
    {
        $stmt = $this->db->prepare(
            'SELECT id, invoice_no, description, amount, currency, status, gateway, gateway_payment_id, paid_at, created_at
             FROM payments
             WHERE user_id = :user_id
             ORDER BY created_at DESC, id DESC
             LIMIT ' . max(1, min($limit, 100)),
        );
        $stmt->execute(['user_id' => $userId]);

        return $stmt->fetchAll();
    }

    /**
     * Admin list: payments joined with customer + plan, filtered + paginated.
     *
     * @return array{rows: list<array<string, mixed>>, total: int}
     */
    public function adminList(?string $search, ?string $status, ?string $gateway, int $page, int $perPage): array
    {
        $where = [];
        $params = [];

        if ($search !== null && $search !== '') {
            $where[] = '(u.name LIKE :s_name OR u.email LIKE :s_email OR pay.invoice_no LIKE :s_invoice)';
            $params['s_name'] = '%' . $search . '%';
            $params['s_email'] = '%' . $search . '%';
            $params['s_invoice'] = '%' . $search . '%';
        }
        if ($status !== null) {
            $where[] = 'pay.status = :status';
            $params['status'] = $status;
        }
        if ($gateway !== null) {
            $where[] = 'pay.gateway = :gateway';
            $params['gateway'] = $gateway;
        }

        $whereSql = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);
        $joins = ' FROM payments pay
             LEFT JOIN users u ON u.id = pay.user_id
             LEFT JOIN subscriptions s ON s.id = pay.subscription_id
             LEFT JOIN plans pl ON pl.id = s.plan_id';

        $count = $this->db->prepare('SELECT COUNT(*)' . $joins . $whereSql);
        $count->execute($params);
        $total = (int) $count->fetchColumn();

        $offset = ($page - 1) * $perPage;
        $stmt = $this->db->prepare(
            'SELECT pay.id, pay.invoice_no, pay.description, pay.amount, pay.currency,
                    pay.gateway, pay.gateway_payment_id, pay.webhook_ref, pay.status, pay.paid_at, pay.created_at,
                    u.name AS customer_name, u.email AS customer_email,
                    pl.name AS plan_name'
            . $joins . $whereSql .
            " ORDER BY pay.created_at DESC, pay.id DESC
             LIMIT {$perPage} OFFSET {$offset}",
        );
        $stmt->execute($params);

        return ['rows' => $stmt->fetchAll(), 'total' => $total];
    }

    /** @return array<string, mixed>|null Single payment with customer + plan (admin). */
    public function adminFind(int $paymentId): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT pay.*, u.name AS customer_name, u.email AS customer_email, pl.name AS plan_name
             FROM payments pay
             LEFT JOIN users u ON u.id = pay.user_id
             LEFT JOIN subscriptions s ON s.id = pay.subscription_id
             LEFT JOIN plans pl ON pl.id = s.plan_id
             WHERE pay.id = :id
             LIMIT 1',
        );
        $stmt->execute(['id' => $paymentId]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    /** Record a completed manual payment (gateway integrations come later). */
    public function createPaid(int $userId, ?int $subscriptionId, string $description, float $amount): int
    {
        $prefix = (string) ((new PlatformSettingRepository())->all()['invoice_prefix'] ?? 'INV') ?: 'INV';
        $invoiceNo = sprintf('%s-%s-%s', $prefix, date('Y'), strtoupper(bin2hex(random_bytes(3))));

        $stmt = $this->db->prepare(
            "INSERT INTO payments
                (user_id, subscription_id, gateway, invoice_no, description,
                 amount, currency, status, paid_at, created_at)
             VALUES
                (:user_id, :subscription_id, 'manual', :invoice_no, :description,
                 :amount, :currency, 'paid', NOW(), NOW())",
        );
        $stmt->execute([
            'user_id'         => $userId,
            'subscription_id' => $subscriptionId,
            'invoice_no'      => $invoiceNo,
            'currency'        => (string) ((new PlatformSettingRepository())->all()['currency'] ?? 'USD'),
            'description'     => mb_substr($description, 0, 190),
            'amount'          => $amount,
        ]);

        return (int) $this->db->lastInsertId();
    }

    /** Invoice number for a payment id (used by the receipt email). */
    public function invoiceNumber(int $paymentId): ?string
    {
        $stmt = $this->db->prepare('SELECT invoice_no FROM payments WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $paymentId]);
        $value = $stmt->fetchColumn();

        return $value === false ? null : (string) $value;
    }

}
