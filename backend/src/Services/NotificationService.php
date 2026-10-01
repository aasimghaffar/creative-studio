<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Logger;
use App\Repositories\NotificationRepository;

/**
 * The one way every module creates notifications:
 *
 *   (new NotificationService())->notify($userId, 'credits', 'Credits deducted', '…');
 *
 * Failure-safe by contract: a notification must NEVER break the flow that
 * triggered it, so errors are logged and swallowed. Convenience helpers
 * exist per category; future modules just call them.
 */
final class NotificationService
{
    public function __construct(
        private readonly NotificationRepository $notifications = new NotificationRepository(),
    ) {
    }

    /** @param array<string, mixed> $data Optional deep-link payload. */
    public function notify(int $userId, string $category, string $title, string $body = '', array $data = []): void
    {
        try {
            if (!in_array($category, NotificationRepository::CATEGORIES, true)) {
                $category = 'system';
            }

            // Platform master switches (admin → Notifications). 'system' is
            // exempt: announcements and admin actions are deliberate sends.
            if ($category !== 'system') {
                $enabled = (new \App\Repositories\PlatformSettingRepository())
                    ->getBool('notify_user_' . $category, true);
                if (!$enabled) {
                    return;
                }
            }

            $this->notifications->create($userId, $category, $title, $body, $data);
        } catch (\Throwable $e) {
            Logger::channel('app')->warning('Notification create failed', [
                'user_id' => $userId,
                'title'   => $title,
                'error'   => $e->getMessage(),
            ]);
        }
    }

    /** @param array<string, mixed> $data */
    public function generation(int $userId, string $title, string $body = '', array $data = []): void
    {
        $this->notify($userId, 'generation', $title, $body, $data);
    }

    /** @param array<string, mixed> $data */
    public function credits(int $userId, string $title, string $body = '', array $data = []): void
    {
        $this->notify($userId, 'credits', $title, $body, $data);
    }

    /** @param array<string, mixed> $data */
    public function subscription(int $userId, string $title, string $body = '', array $data = []): void
    {
        $this->notify($userId, 'subscription', $title, $body, $data);
    }

    /** @param array<string, mixed> $data */
    public function payment(int $userId, string $title, string $body = '', array $data = []): void
    {
        $this->notify($userId, 'payment', $title, $body, $data);
    }

    /** @param array<string, mixed> $data */
    public function system(int $userId, string $title, string $body = '', array $data = []): void
    {
        $this->notify($userId, 'system', $title, $body, $data);
    }
}
