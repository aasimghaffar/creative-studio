<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Logger;
use App\Exceptions\HttpException;
use App\Exceptions\ValidationException;
use App\Repositories\AdminUserRepository;
use App\Repositories\CreditRepository;
use App\Repositories\RefreshTokenRepository;
use App\Repositories\UserRepository;
use App\Repositories\UserSessionRepository;

/**
 * Admin → User Management. Guard rails: admins cannot suspend or delete
 * themselves, and cannot act on other admin accounts.
 */
final class AdminUserService
{
    public function __construct(
        private readonly AdminUserRepository $adminUsers = new AdminUserRepository(),
        private readonly UserRepository $users = new UserRepository(),
        private readonly CreditRepository $credits = new CreditRepository(),
        private readonly RefreshTokenRepository $refreshTokens = new RefreshTokenRepository(),
        private readonly UserSessionRepository $sessions = new UserSessionRepository(),
        private readonly AuthService $auth = new AuthService(),
        private readonly NotificationService $notifications = new NotificationService(),
    ) {
    }

    /** @return array{users: list<array<string, mixed>>, pagination: array<string, int|bool>} */
    public function list(?string $search, ?string $status, ?string $plan, int $page, int $perPage): array
    {
        // No hardcoded slug lists — any plan/status the database knows is
        // filterable (previously custom plans silently broke the filter).
        $status = $status !== null && preg_match('/^[a-z0-9_-]{1,40}$/', $status) ? $status : null;
        $plan = $plan !== null && preg_match('/^[a-z0-9_-]{1,40}$/', $plan) ? $plan : null;

        $result = $this->adminUsers->list($search, $status, $plan, $page, $perPage);

        return [
            'users' => array_map([$this, 'shape'], $result['rows']),
            'pagination' => [
                'page'     => $page,
                'per_page' => $perPage,
                'total'    => $result['total'],
                'has_more' => $page * $perPage < $result['total'],
            ],
        ];
    }

    /** @return array<string, mixed> */
    public function detail(int $userId): array
    {
        $row = $this->adminUsers->findDetail($userId);
        if ($row === null) {
            throw new HttpException(404, 'User not found.');
        }

        $shaped = $this->shape($row);
        $top = $this->adminUsers->topTool($userId);
        $shaped['top_tool'] = $top['tool_name'] ?? null;
        $shaped['avg_batch_size'] = $this->adminUsers->averageBatchSize($userId);

        return $shaped;
    }

    /** @return array<string, mixed> Fresh detail after the status change. */
    public function setSuspended(int $adminId, int $userId, bool $suspend): array
    {
        $target = $this->requireManageable($adminId, $userId);

        $this->adminUsers->setStatus($userId, $suspend ? 'suspended' : 'active');

        if ($suspend) {
            // A suspended account must not keep working sessions.
            $this->refreshTokens->revokeAllForUser($userId);
            $this->sessions->revokeAllForUser($userId);
        }

        $this->notifications->system(
            $userId,
            $suspend ? 'Your account has been suspended' : 'Your account has been reactivated',
            $suspend ? 'Contact support if you believe this is a mistake.' : 'Welcome back.',
        );

        Logger::channel('app')->warning($suspend ? 'User suspended' : 'User unsuspended', [
            'admin_id' => $adminId,
            'user_id'  => $userId,
        ]);

        return $this->detail($userId);
    }

    /** @return array<string, mixed> { balance } */
    public function grantCredits(int $adminId, int $userId, int $amount, string $note): array
    {
        $this->requireManageable($adminId, $userId, allowAdmins: true);

        if ($amount === 0 || $amount < -100000 || $amount > 100000) {
            throw new ValidationException(['amount' => ['Amount must be between -100,000 and 100,000 and not zero.']]);
        }

        try {
            $balance = $this->credits->adjust($userId, $amount, $adminId, $note !== '' ? $note : 'Admin adjustment');
        } catch (HttpException $e) {
            if ($e->status === 402) {
                throw new ValidationException(['amount' => ['This deduction exceeds the user\'s current balance.']]);
            }
            throw $e;
        }

        $this->notifications->credits(
            $userId,
            $amount > 0 ? 'Credits added' : 'Credits adjusted',
            sprintf('%+d credits by the support team. New balance: %d.', $amount, $balance),
        );

        Logger::channel('app')->info('Admin credit adjustment', [
            'admin_id' => $adminId,
            'user_id'  => $userId,
            'amount'   => $amount,
        ]);

        return ['balance' => $balance];
    }

    /** Sends the standard reset email through the existing auth flow. */
    public function sendPasswordReset(int $adminId, int $userId): void
    {
        $target = $this->users->findById($userId);
        if ($target === null) {
            throw new HttpException(404, 'User not found.');
        }

        $this->auth->requestPasswordReset((string) $target['email']);

        Logger::channel('app')->info('Admin triggered password reset', [
            'admin_id' => $adminId,
            'user_id'  => $userId,
        ]);
    }

    /**
     * @param array<string, mixed> $row
     *
     * @return array<string, mixed>
     */
    private function shape(array $row): array
    {
        return [
            'id'            => (int) $row['id'],
            'name'          => $row['name'],
            'email'         => $row['email'],
            'role'          => $row['role'],
            'plan'          => $row['plan_name'],
            'status'        => $row['status'],
            'credits'       => (int) $row['credits'],
            'credits_used'  => (int) $row['credits_used'],
            'generations'   => (int) $row['generations'],
            'storage_gb'    => round(((int) $row['storage_bytes']) / (1024 ** 3), 2),
            'country'       => $row['country'],
            'joined_at'     => $row['created_at'],
            'last_active'   => $row['last_login_at'] ?? $row['created_at'],
        ];
    }

    /** @return array<string, mixed> The manageable target user. */
    private function requireManageable(int $adminId, int $userId, bool $allowAdmins = false): array
    {
        if ($userId === $adminId) {
            throw new HttpException(409, 'You cannot perform this action on your own account.');
        }

        $target = $this->users->findById($userId);
        if ($target === null) {
            throw new HttpException(404, 'User not found.');
        }
        if (!$allowAdmins && $target['role'] === 'admin') {
            throw new HttpException(403, 'Admin accounts can only be managed from the database.');
        }

        return $target;
    }
}
