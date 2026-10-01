<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\Config;
use App\Core\Logger;
use App\Exceptions\HttpException;
use App\Repositories\EmailVerificationRepository;
use App\Repositories\PasswordResetRepository;
use App\Repositories\RefreshTokenRepository;
use App\Repositories\UserProfileRepository;
use App\Repositories\UserRepository;
use App\Repositories\UserSessionRepository;
use App\Repositories\UserSettingsRepository;

/**
 * All authentication business logic. Controllers stay thin;
 * this service is the future seam for tests and new auth flows.
 */
final class AuthService
{
    public function __construct(
        private readonly UserRepository $users = new UserRepository(),
        private readonly RefreshTokenRepository $refreshTokens = new RefreshTokenRepository(),
        private readonly PasswordResetRepository $passwordResets = new PasswordResetRepository(),
        private readonly EmailVerificationRepository $emailVerifications = new EmailVerificationRepository(),
        private readonly UserProfileRepository $profiles = new UserProfileRepository(),
        private readonly UserSettingsRepository $settings = new UserSettingsRepository(),
        private readonly UserSessionRepository $sessions = new UserSessionRepository(),
        private readonly JwtService $jwt = new JwtService(),
        private readonly MailService $mail = new MailService(),
    ) {
    }

    /**
     * @param array{ip: string, user_agent: string} $ctx
     *
     * @return array<string, mixed>
     */
    public function register(string $name, string $email, string $password, array $ctx): array
    {
        if ($this->users->findByEmail($email) !== null) {
            throw new HttpException(409, 'An account with this email already exists.');
        }

        $userId = $this->users->create(
            $name,
            $email,
            password_hash($password, PASSWORD_ARGON2ID),
        );

        // 1:1 rows every account owns from day one.
        $this->profiles->createDefaults($userId);
        $this->settings->createDefaults($userId);

        // Every new account starts with the admin-configured welcome
        // credits (Admin -> Credits Management -> default free credits).
        // No plan is auto-assigned: credits change only when the user
        // picks a plan, which clears the balance and grants that plan's
        // cycle allowance.
        $defaultCredits = (new \App\Repositories\PlatformSettingRepository())->getInt('default_free_credits', 10);
        if ($defaultCredits > 0) {
            (new \App\Repositories\CreditRepository())->grant($userId, $defaultCredits, 'Welcome credits');
        }

        Logger::channel('auth')->info('User registered', ['user_id' => $userId]);

        $user = $this->users->findById($userId) ?? [];

        \App\Services\SecurityLog::record($userId, 'New account registered', $email, 'default');

        // Welcome email (skipped automatically if the template is disabled).
        (new \App\Services\Mail\MailService())->sendTemplate('welcome', $email, [
            'name'    => $name,
            'credits' => (int) ($user['credits'] ?? 0),
        ]);
        $this->sendEmailVerification($user);

        (new NotificationService())->system(
            $userId,
            'Welcome to AI Creative Studio',
            'Your account is ready. You have ' . (int) ($user['credits'] ?? 0) . ' credits to start creating.',
        );

        return $this->tokenBundle($user, $ctx);
    }

    /**
     * @param array{ip: string, user_agent: string} $ctx
     *
     * @return array<string, mixed>
     */
    public function login(string $email, string $password, array $ctx): array
    {
        $user = $this->users->findByEmail($email);

        // One generic message for both wrong email and wrong password.
        if ($user === null || !password_verify($password, (string) $user['password_hash'])) {
            Logger::channel('auth')->warning('Failed login attempt', ['email' => $email]);
            \App\Services\SecurityLog::record($user !== null ? (int) $user['id'] : null, 'Failed login attempt', $email, 'destructive');
            throw new HttpException(401, 'Invalid email or password.');
        }

        if ($user['status'] !== 'active') {
            throw new HttpException(403, 'This account is suspended.');
        }

        if (password_needs_rehash((string) $user['password_hash'], PASSWORD_ARGON2ID)) {
            $this->users->updatePassword((int) $user['id'], password_hash($password, PASSWORD_ARGON2ID));
        }

        $this->users->touchLastLogin((int) $user['id']);
        Logger::channel('auth')->info('User logged in', ['user_id' => (int) $user['id']]);
        \App\Services\SecurityLog::record((int) $user['id'], 'User login', $email, 'teal');

        return $this->tokenBundle($user, $ctx);
    }

    /**
     * Rotate: validate the old refresh token, revoke it and its session,
     * then issue a fresh pair with a fresh session row.
     *
     * @param array{ip: string, user_agent: string} $ctx
     *
     * @return array<string, mixed>
     */
    public function refresh(string $rawRefreshToken, array $ctx): array
    {
        $hash = $this->jwt->hashToken($rawRefreshToken);
        $row = $this->refreshTokens->findValid($hash);

        if ($row === null) {
            throw new HttpException(401, 'Invalid or expired refresh token.');
        }

        $user = $this->users->findById((int) $row['user_id']);
        if ($user === null || $user['status'] !== 'active') {
            throw new HttpException(401, 'Account unavailable.');
        }

        $this->refreshTokens->revoke($hash);
        $this->sessions->revokeByRefreshTokenId((int) $row['id']);

        return $this->tokenBundle($user, $ctx);
    }

    public function logout(string $rawRefreshToken): void
    {
        $hash = $this->jwt->hashToken($rawRefreshToken);

        $row = $this->refreshTokens->findValid($hash);
        if ($row !== null) {
            $this->sessions->revokeByRefreshTokenId((int) $row['id']);
        }

        $this->refreshTokens->revoke($hash);
    }

    /**
     * Always responds identically whether or not the email exists —
     * no account enumeration through this endpoint.
     */
    public function requestPasswordReset(string $email): void
    {
        $user = $this->users->findByEmail($email);
        if ($user === null) {
            return;
        }

        $raw = bin2hex(random_bytes(32));
        $this->passwordResets->store((int) $user['id'], $this->jwt->hashToken($raw));

        $appUrl = Config::get('APP_URL', 'http://localhost:8000');
        $link = $appUrl . '/reset-password?token=' . $raw;

        $this->mail->send(
            (string) $user['email'],
            (string) $user['name'],
            'Reset your password',
            sprintf(
                '<p>Hello %s,</p><p>We received a request to reset your password. ' .
                'This link is valid for one hour:</p><p><a href="%s">%s</a></p>' .
                '<p>If you didn\'t ask for this, you can safely ignore this email.</p>',
                htmlspecialchars((string) $user['name'], ENT_QUOTES),
                $link,
                $link,
            ),
        );

        Logger::channel('auth')->info('Password reset requested', ['user_id' => (int) $user['id']]);
    }

    public function resetPassword(string $rawToken, string $newPassword): void
    {
        $hash = $this->jwt->hashToken($rawToken);
        $row = $this->passwordResets->findValid($hash);

        if ($row === null) {
            throw new HttpException(400, 'Invalid or expired reset token.');
        }

        $userId = (int) $row['user_id'];
        $this->users->updatePassword($userId, password_hash($newPassword, PASSWORD_ARGON2ID));
        $this->passwordResets->consume($hash);

        // Force re-login everywhere after a password change.
        $this->refreshTokens->revokeAllForUser($userId);
        $this->sessions->revokeAllForUser($userId);

        Logger::channel('auth')->info('Password reset completed', ['user_id' => $userId]);
    }

    /** Email a fresh verification link (also used by resend). */
    /** @param array<string, mixed> $user */
    public function sendEmailVerification(array $user): void
    {
        if (($user['email_verified_at'] ?? null) !== null) {
            return;
        }

        $raw = bin2hex(random_bytes(32));
        $this->emailVerifications->store((int) $user['id'], $this->jwt->hashToken($raw));

        $link = Config::get('APP_URL', 'http://localhost:8000') . '/verify-email?token=' . $raw;

        $this->mail->send(
            (string) $user['email'],
            (string) $user['name'],
            'Verify your email address',
            sprintf(
                '<p>Hello %s,</p><p>Welcome to %s! Confirm your email address ' .
                'to finish setting up your account (link valid for 24 hours):</p>' .
                '<p><a href="%s">%s</a></p>',
                htmlspecialchars((string) $user['name'], ENT_QUOTES),
                htmlspecialchars(Config::get('APP_NAME', 'AI Creative Studio'), ENT_QUOTES),
                $link,
                $link,
            ),
        );
    }

    public function verifyEmail(string $rawToken): void
    {
        $hash = $this->jwt->hashToken($rawToken);
        $row = $this->emailVerifications->findValid($hash);

        if ($row === null) {
            throw new HttpException(400, 'Invalid or expired verification token.');
        }

        $this->users->markEmailVerified((int) $row['user_id']);
        $this->emailVerifications->consume($hash);

        Logger::channel('auth')->info('Email verified', ['user_id' => (int) $row['user_id']]);
    }

    /** "Chrome · Windows 11"-style label from a raw User-Agent. */
    private function deviceLabel(string $userAgent): string
    {
        $browser = match (true) {
            str_contains($userAgent, 'Edg/')     => 'Edge',
            str_contains($userAgent, 'OPR/')     => 'Opera',
            str_contains($userAgent, 'Firefox/') => 'Firefox',
            str_contains($userAgent, 'Chrome/')  => 'Chrome',
            str_contains($userAgent, 'Safari/')  => 'Safari',
            default                              => 'Unknown browser',
        };

        $os = match (true) {
            str_contains($userAgent, 'Windows NT 11') || str_contains($userAgent, 'Windows NT 10') => 'Windows',
            str_contains($userAgent, 'Mac OS X')  => 'macOS',
            str_contains($userAgent, 'Android')   => 'Android',
            str_contains($userAgent, 'iPhone') || str_contains($userAgent, 'iPad') => 'iOS',
            str_contains($userAgent, 'Linux')     => 'Linux',
            default                               => 'Unknown OS',
        };

        return $browser . ' - ' . $os;
    }

    /**
     * Issue access + refresh tokens and record the device session.
     *
     * @param array<string, mixed>                 $user
     * @param array{ip: string, user_agent: string} $ctx
     *
     * @return array<string, mixed> user + access_token + refresh_token
     */
    private function tokenBundle(array $user, array $ctx): array
    {
        $access = $this->jwt->issueAccessToken((int) $user['id'], (string) $user['role']);

        $rawRefresh = $this->jwt->generateRefreshToken();
        $refreshTokenId = $this->refreshTokens->store(
            (int) $user['id'],
            $this->jwt->hashToken($rawRefresh),
            Config::int('JWT_REFRESH_TTL', 2592000),
        );

        $this->sessions->create(
            (int) $user['id'],
            $refreshTokenId,
            $this->deviceLabel($ctx['user_agent']),
            $ctx['ip'],
            $ctx['user_agent'],
        );

        return [
            'user'          => UserRepository::toPublic($user),
            'access_token'  => $access['token'],
            'token_type'    => 'Bearer',
            'expires_in'    => $access['expires_in'],
            'refresh_token' => $rawRefresh,
        ];
    }
}
