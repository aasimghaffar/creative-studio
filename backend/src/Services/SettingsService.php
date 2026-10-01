<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Logger;
use App\Exceptions\HttpException;
use App\Exceptions\ValidationException;
use App\Repositories\FileStatsRepository;
use App\Repositories\RefreshTokenRepository;
use App\Repositories\UserRepository;
use App\Repositories\UserSessionRepository;
use App\Repositories\UserSettingsRepository;

/**
 * Settings module: every tab of the Settings page, backed by
 * user_settings / users / user_sessions / files. One service, no
 * duplicated logic — each tab is a thin section update.
 */
final class SettingsService
{
    /** Storage plan rules surfaced on the Storage tab. */

    public function __construct(
        private readonly UserSettingsRepository $settings = new UserSettingsRepository(),
        private readonly UserRepository $users = new UserRepository(),
        private readonly UserSessionRepository $sessions = new UserSessionRepository(),
        private readonly RefreshTokenRepository $refreshTokens = new RefreshTokenRepository(),
        private readonly FileStatsRepository $fileStats = new FileStatsRepository(),
    ) {
    }

    /** @return array<string, mixed> */
    public function get(int $userId): array
    {
        $row = $this->settings->findByUserId($userId);
        if ($row === null) {
            // Self-healing for accounts created before settings existed.
            $this->settings->createDefaults($userId);
            $row = $this->settings->findByUserId($userId) ?? [];
        }

        return [
            'theme'              => $row['theme'] ?? 'system',
            'timezone'           => $row['timezone'] ?? 'Europe/London',
            'default_image_size' => $row['default_image_size'] ?? '1024 px',
            'default_style'      => $row['default_style'] ?? 'Minimal',
            'auto_save_history'  => (bool) ($row['auto_save_history'] ?? true),
            'email_generation'   => (bool) ($row['email_generation'] ?? true),
            'email_billing'      => (bool) ($row['email_billing'] ?? true),
            'email_product'      => (bool) ($row['email_product'] ?? false),
            'push_enabled'       => (bool) ($row['push_enabled'] ?? true),
            'two_factor_enabled' => (bool) ($row['two_factor_enabled'] ?? false),
        ];
    }

    /** @param array<string, mixed> $data */
    public function updateGeneral(int $userId, array $data): void
    {
        $fields = [];
        if (isset($data['theme'])) {
            if (!in_array($data['theme'], ['light', 'dark', 'system'], true)) {
                throw new ValidationException(['theme' => ['Theme must be light, dark, or system.']]);
            }
            $fields['theme'] = $data['theme'];
        }
        if (isset($data['timezone'])) {
            $fields['timezone'] = mb_substr(trim((string) $data['timezone']), 0, 64);
        }

        $this->settings->updateFields($userId, $fields);
    }

    /** @param array<string, mixed> $data */
    public function updateGeneration(int $userId, array $data): void
    {
        $fields = [];
        if (isset($data['default_image_size'])) {
            $fields['default_image_size'] = mb_substr(trim((string) $data['default_image_size']), 0, 20);
        }
        if (isset($data['default_style'])) {
            $fields['default_style'] = mb_substr(trim((string) $data['default_style']), 0, 60);
        }
        if (array_key_exists('auto_save_history', $data)) {
            $fields['auto_save_history'] = (bool) $data['auto_save_history'];
        }

        $this->settings->updateFields($userId, $fields);
    }

    /** @param array<string, mixed> $data */
    public function updateNotifications(int $userId, array $data): void
    {
        $fields = [];
        foreach (['email_generation', 'email_billing', 'email_product', 'push_enabled'] as $key) {
            if (array_key_exists($key, $data)) {
                $fields[$key] = (bool) $data[$key];
            }
        }

        $this->settings->updateFields($userId, $fields);
    }

    public function setTwoFactor(int $userId, bool $enabled): void
    {
        $this->settings->updateFields($userId, ['two_factor_enabled' => $enabled]);
        (new NotificationService())->system(
            $userId,
            $enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled',
        );
        Logger::channel('auth')->info('Two-factor preference changed', [
            'user_id' => $userId,
            'enabled' => $enabled,
        ]);
    }

    public function changePassword(int $userId, string $currentPassword, string $newPassword): void
    {
        $user = $this->users->findById($userId);
        if ($user === null) {
            throw new HttpException(404, 'Account not found.');
        }

        if (!password_verify($currentPassword, (string) $user['password_hash'])) {
            throw new ValidationException(['current_password' => ['Your current password is incorrect.']]);
        }

        $this->users->updatePassword($userId, password_hash($newPassword, PASSWORD_ARGON2ID));

        $account = $this->users->findById($userId);
        \App\Services\SecurityLog::record($userId, 'Password change', (string) ($account['email'] ?? 'user'), 'teal');
        Logger::channel('auth')->info('Password changed via settings', ['user_id' => $userId]);
        (new NotificationService())->system(
            $userId,
            'Password changed successfully',
            'If this was not you, reset your password immediately.',
        );
    }

    /** @return list<array<string, mixed>> Newest first; first entry flagged as this device. */
    public function sessions(int $userId): array
    {
        $rows = $this->sessions->activeForUser($userId);

        return array_map(static function (array $row, int $index): array {
            return [
                'id'          => (int) $row['id'],
                'device'      => $row['device'] ?? 'Unknown device',
                'ip_address'  => $row['ip_address'],
                'location'    => $row['location'],
                'last_active' => $row['last_active_at'],
                'created_at'  => $row['created_at'],
                // Heuristic: the most recently active session is this one.
                'current'     => $index === 0,
            ];
        }, $rows, array_keys($rows));
    }

    public function revokeSession(int $userId, int $sessionId): void
    {
        $session = $this->sessions->findForUser($sessionId, $userId);
        if ($session === null) {
            throw new HttpException(404, 'Session not found.');
        }

        $this->sessions->revokeById($sessionId);
        if (!empty($session['refresh_token_id'])) {
            $this->refreshTokens->revokeById((int) $session['refresh_token_id']);
        }

        Logger::channel('auth')->info('Session revoked from settings', [
            'user_id'    => $userId,
            'session_id' => $sessionId,
        ]);
    }

    /** @return array<string, mixed> Storage tab payload. */
    public function storageOverview(int $userId): array
    {
        $usage = $this->fileStats->usageByType($userId);
        $totalBytes = array_sum($usage);

        // FULL-PRECISION floats — never round server-side. A 100 KB file
        // is 0.0000954 GB; rounding to 2 decimals here is what made every
        // storage widget read 0.0. The frontend formats KB/MB/GB.
        $toGb = static fn (int $bytes): float => $bytes / (1024 ** 3);

        // Storage limit: admin upload rule (if set) -> the user's plan ->
        // 10 GB default. Nothing hardcoded in normal operation.
        $platform = (new \App\Repositories\PlatformSettingRepository())->all();
        $limitGb = (int) ($platform['max_storage_per_user_gb'] ?? 0);
        if ($limitGb <= 0) {
            $stmt = \App\Core\Database::connection()->prepare(
                "SELECT p.storage_gb
                 FROM subscriptions s
                 JOIN plans p ON p.id = s.plan_id
                 WHERE s.user_id = :user_id AND s.status = 'active'
                 ORDER BY s.id DESC LIMIT 1",
            );
            $stmt->execute(['user_id' => $userId]);
            $planStorage = $stmt->fetchColumn();
            $limitGb = $planStorage !== false && $planStorage !== null ? (int) $planStorage : 0;
        }
        if ($limitGb <= 0) {
            $limitGb = 10;
        }

        $allowedTypes = array_values(array_filter(array_map('trim', explode(',', strtoupper(
            (string) (($platform['allowed_file_types'] ?? '') !== '' ? $platform['allowed_file_types'] : 'JPG,PNG,WEBP'),
        )))));

        return [
            'used_bytes'  => $totalBytes,
            'used_gb'     => $toGb($totalBytes),
            'limit_gb'    => $limitGb,
            'breakdown' => [
                'images'    => $toGb($usage['image'] ?? 0),
                'videos'    => $toGb($usage['video'] ?? 0),
                'audio'     => $toGb($usage['audio'] ?? 0),
                'documents' => $toGb($usage['document'] ?? 0),
            ],
            'breakdown_bytes' => [
                'images'    => (int) ($usage['image'] ?? 0),
                'videos'    => (int) ($usage['video'] ?? 0),
                'audio'     => (int) ($usage['audio'] ?? 0),
                'documents' => (int) ($usage['document'] ?? 0),
            ],
            'rules' => [
                'upload_limit_mb' => max(1, (int) ($platform['max_upload_size_mb'] ?? 50)),
                'allowed_types'   => $allowedTypes,
            ],
        ];
    }

    public function deleteAccount(int $userId): void
    {
        Logger::channel('auth')->warning('Account deletion requested', ['user_id' => $userId]);

        // FK CASCADEs remove profile, settings, sessions, tokens, generations,
        // history, favorites, folders, notifications; payments keep records
        // with user_id nulled (accounting survives, per schema design).
        $this->users->deleteById($userId);
    }
}
