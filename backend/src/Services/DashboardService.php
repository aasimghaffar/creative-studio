<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\FileRepository;
use App\Repositories\GenerationRepository;
use App\Repositories\NotificationRepository;

/**
 * Dashboard Home — one aggregated payload. Credits, subscription, and
 * storage REUSE the billing and settings services (no duplicated logic).
 */
final class DashboardService
{
    public function __construct(
        private readonly GenerationRepository $generations = new GenerationRepository(),
        private readonly FileRepository $files = new FileRepository(),
        private readonly NotificationRepository $notifications = new NotificationRepository(),
        private readonly BillingService $billing = new BillingService(),
        private readonly SettingsService $settings = new SettingsService(),
        private readonly ImageStorageService $storage = new ImageStorageService(),
    ) {
    }

    /** @return array<string, mixed> */
    public function overview(int $userId): array
    {
        $usage = $this->generations->dailyCounts($userId, 14);
        $counts = array_column($usage, 'count');
        $total = array_sum($counts);
        $peakValue = $counts === [] ? 0 : max($counts);
        $peakIndex = $peakValue > 0 ? (int) array_search($peakValue, $counts, true) : null;

        $latest = array_map(fn (array $row): array => [
            'id'    => (int) $row['id'],
            'title' => $row['prompt'] !== null
                ? mb_substr((string) $row['prompt'], 0, 60)
                : (string) $row['name'],
            'tool'  => $row['tool_name'] ?? 'Upload',
            'url'   => $this->storage->toUrl((string) $row['storage_path']),
        ], $this->files->latestImages($userId, 6));

        $activity = array_map(static fn (array $row): array => [
            'id'       => (int) $row['id'],
            'actor'    => $row['category'] === 'system' ? 'System' : 'You',
            'action'   => (string) $row['title'],
            'target'   => '',
            'time'     => (string) $row['created_at'],
            'category' => (string) $row['category'],
        ], $this->notifications->listForUser($userId, null, 1, 6)['rows']);

        return [
            'stats' => [
                'renders_today' => $this->generations->countCompletedSince($userId, date('Y-m-d 00:00:00')),
                'renders_week'  => $this->generations->countCompletedSince($userId, date('Y-m-d 00:00:00', strtotime('-6 days'))),
                'drafts_open'   => $this->generations->countOpen($userId),
            ],
            'usage' => [
                'points'      => $usage,
                'total'       => $total,
                'avg_per_day' => (int) round($total / max(count($usage), 1)),
                'peak'        => $peakIndex !== null
                    ? ['count' => $peakValue, 'date' => $usage[$peakIndex]['date']]
                    : null,
            ],
            'latest_images'   => $latest,
            'recent_activity' => $activity,
            'credits'         => $this->billing->creditsOverview($userId),
            'subscription'    => $this->billing->currentPlan($userId),
            'storage'         => $this->settings->storageOverview($userId),
        ];
    }
}
