<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database;
use App\Exceptions\HttpException;
use PDO;

/**
 * Credit balance + append-only ledger, guarded by row locks so two
 * concurrent generations can't overdraw an account.
 */
final class CreditRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    public function balance(int $userId): int
    {
        $stmt = $this->db->prepare('SELECT credits FROM users WHERE id = :id');
        $stmt->execute(['id' => $userId]);

        return (int) $stmt->fetchColumn();
    }

    /** @return int The balance after spending. */
    public function spend(int $userId, int $amount, ?int $generationId, string $note): int
    {
        return $this->apply($userId, -$amount, 'spend', $generationId, $note);
    }

    /** @return int The balance after granting (plan credits, bonuses). */
    public function grant(int $userId, int $amount, string $note): int
    {
        return $this->apply($userId, $amount, 'grant', null, $note);
    }

    /** Admin adjustment (signed amount) with the acting admin recorded. */
    public function adjust(int $userId, int $signedAmount, int $adminId, string $note): int
    {
        return $this->apply($userId, $signedAmount, 'adjustment', null, $note, $adminId);
    }

    /**
     * Ledger truth for the dashboard: lifetime granted, lifetime used,
     * and the current balance — all from database records.
     *
     * @return array{granted: int, used: int, balance: int}
     */
    public function totals(int $userId): array
    {
        // "used" = what generations actually consumed: spends net of
        // refunds. Internal bookkeeping (plan-change clearing, monthly
        // reset, expiry) must NOT read as usage, and a refund must not
        // read as a new grant — otherwise a failed-and-refunded
        // generation inflates both sides of the bar.
        $stmt = $this->db->prepare(
            "SELECT
                COALESCE(SUM(CASE WHEN type = 'spend'  AND amount < 0 THEN -amount END), 0) AS spent,
                COALESCE(SUM(CASE WHEN type = 'refund' AND amount > 0 THEN  amount END), 0) AS refunded
             FROM credit_transactions
             WHERE user_id = :user_id",
        );
        $stmt->execute(['user_id' => $userId]);
        $row = $stmt->fetch() ?: ['spent' => 0, 'refunded' => 0];

        $balance = $this->balance($userId);
        $used = max(0, (int) $row['spent'] - (int) $row['refunded']);

        // total = balance + used, so total − used = balance ALWAYS holds,
        // and "total" reads as "credits you actually had to spend".
        return [
            'granted' => $balance + $used,
            'used'    => $used,
            'balance' => $balance,
        ];
    }

    /** Credits spent today (for the daily limit). */
    public function spentToday(int $userId): int
    {
        return $this->spentSince($userId, date('Y-m-d 00:00:00'));
    }

    /** Zero the remaining balance (plan change / monthly reset). Returns the amount removed. */
    public function clearBalance(int $userId, string $note): int
    {
        $balance = $this->balance($userId);
        if ($balance > 0) {
            $this->apply($userId, -$balance, 'adjustment', null, $note);
        }

        return max(0, $balance);
    }

    /** Expire a specific amount (credit expiry rule). */
    public function expire(int $userId, int $amount, string $note): void
    {
        if ($amount > 0) {
            $this->apply($userId, -$amount, 'expiry', null, $note);
        }
    }

    /** Credits granted within a window (for the expiry rule). */
    public function grantedSince(int $userId, string $since): int
    {
        $stmt = $this->db->prepare(
            'SELECT COALESCE(SUM(amount), 0)
             FROM credit_transactions
             WHERE user_id = :user_id AND amount > 0 AND created_at >= :since',
        );
        $stmt->execute(['user_id' => $userId, 'since' => $since]);

        return (int) $stmt->fetchColumn();
    }

    /** Total credits spent since a datetime (for cycle usage). */
    public function spentSince(int $userId, string $since): int
    {
        $stmt = $this->db->prepare(
            "SELECT COALESCE(SUM(ABS(amount)), 0)
             FROM credit_transactions
             WHERE user_id = :user_id AND type = 'spend' AND created_at >= :since",
        );
        $stmt->execute(['user_id' => $userId, 'since' => $since]);

        return (int) $stmt->fetchColumn();
    }

    /** @return int The balance after refunding. */
    public function refund(int $userId, int $amount, ?int $generationId, string $note): int
    {
        return $this->apply($userId, $amount, 'refund', $generationId, $note);
    }

    private function apply(
        int $userId,
        int $signedAmount,
        string $type,
        ?int $generationId,
        string $note,
        ?int $adminId = null,
    ): int {
        $this->db->beginTransaction();

        try {
            $stmt = $this->db->prepare('SELECT credits FROM users WHERE id = :id FOR UPDATE');
            $stmt->execute(['id' => $userId]);
            $current = (int) $stmt->fetchColumn();

            $after = $current + $signedAmount;
            if ($after < 0) {
                $this->db->rollBack();
                throw new HttpException(402, 'Not enough credits for this generation.');
            }

            $this->db->prepare('UPDATE users SET credits = :credits, updated_at = NOW() WHERE id = :id')
                ->execute(['credits' => $after, 'id' => $userId]);

            $this->db->prepare(
                'INSERT INTO credit_transactions
                    (user_id, amount, balance_after, type, generation_id, admin_id, note, created_at)
                 VALUES (:user_id, :amount, :balance_after, :type, :generation_id, :admin_id, :note, NOW())',
            )->execute([
                'user_id'       => $userId,
                'amount'        => $signedAmount,
                'balance_after' => $after,
                'type'          => $type,
                'generation_id' => $generationId,
                'admin_id'      => $adminId,
                'note'          => $note,
            ]);

            $this->db->commit();

            return $after;
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }
}
