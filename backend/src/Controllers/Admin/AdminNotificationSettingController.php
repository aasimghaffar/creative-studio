<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Controllers\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Repositories\PlatformSettingRepository;

/** Admin → Notifications: platform master switches per event. */
final class AdminNotificationSettingController extends Controller
{
    /** UI event -> setting-key stem. */
    private const EVENTS = [
        ['id' => 'registration', 'label' => 'New user registration'],
        ['id' => 'payment',      'label' => 'Payment received / failed'],
        ['id' => 'generation',   'label' => 'AI generation completed'],
        ['id' => 'credits',      'label' => 'Credits low / updated'],
        ['id' => 'subscription', 'label' => 'Subscription started / renewed / cancelled'],
    ];

    /** GET /api/v1/admin/notification-settings */
    public function index(Request $request): Response
    {
        $settings = new PlatformSettingRepository();
        $events = array_map(static fn (array $event): array => [
            'id'    => $event['id'],
            'label' => $event['label'],
            'admin' => $settings->getBool('notify_admin_' . $event['id'], true),
            'user'  => $settings->getBool('notify_user_' . $event['id'], true),
        ], self::EVENTS);

        return Response::success(['events' => $events]);
    }

    /** PUT /api/v1/admin/notification-settings  { events: [{id, admin, user}] } */
    public function update(Request $request): Response
    {
        $known = array_column(self::EVENTS, 'id');
        $values = [];
        foreach ((array) $request->input('events', []) as $event) {
            $id = (string) ($event['id'] ?? '');
            if (!in_array($id, $known, true)) {
                continue;
            }
            $values['notify_admin_' . $id] = !empty($event['admin']) ? '1' : '0';
            $values['notify_user_' . $id]  = !empty($event['user']) ? '1' : '0';
        }
        if ($values !== []) {
            (new PlatformSettingRepository())->setMany($values);
        }

        return Response::success(null, 'Notification preferences saved.');
    }
}
