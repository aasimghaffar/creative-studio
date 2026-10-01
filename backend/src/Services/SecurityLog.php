<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database;

/** Append-only security audit trail — must never break a request. */
final class SecurityLog
{
    public static function record(?int $userId, string $event, string $actor, string $tone = 'default'): void
    {
        try {
            Database::connection()->prepare(
                'INSERT INTO security_events (user_id, event, actor, ip, tone, created_at)
                 VALUES (:user_id, :event, :actor, :ip, :tone, NOW())',
            )->execute([
                'user_id' => $userId,
                'event'   => mb_substr($event, 0, 190),
                'actor'   => mb_substr($actor, 0, 190),
                'ip'      => (string) ($_SERVER['REMOTE_ADDR'] ?? ''),
                'tone'    => in_array($tone, ['default', 'teal', 'brass', 'destructive'], true) ? $tone : 'default',
            ]);
        } catch (\Throwable) {
            // Auditing is best-effort by design.
        }
    }
}
