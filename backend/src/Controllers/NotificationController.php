<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Exceptions\HttpException;
use App\Repositories\NotificationRepository;

/** Notifications inbox — own-data only. */
final class NotificationController extends Controller
{
    private NotificationRepository $notifications;

    public function __construct()
    {
        $this->notifications = new NotificationRepository();
    }

    /** GET /api/v1/notifications?type=&page=&per_page= */
    public function index(Request $request): Response
    {
        $userId = (int) $this->user($request)['id'];

        $type = $request->queryParam('type');
        $category = in_array($type, NotificationRepository::CATEGORIES, true) ? $type : null;

        $page = max(1, (int) ($request->queryParam('page', '1')));
        $perPage = min(50, max(1, (int) ($request->queryParam('per_page', '20'))));

        $result = $this->notifications->listForUser($userId, $category, $page, $perPage);

        return Response::success([
            'notifications' => $result['rows'],
            'pagination'    => [
                'page'     => $page,
                'per_page' => $perPage,
                'total'    => $result['total'],
                'has_more' => $page * $perPage < $result['total'],
            ],
            'unread' => $this->notifications->unreadCount($userId),
        ]);
    }

    /** GET /api/v1/notifications/unread-count */
    public function unreadCount(Request $request): Response
    {
        return Response::success([
            'unread' => $this->notifications->unreadCount((int) $this->user($request)['id']),
        ]);
    }

    /** PATCH /api/v1/notifications/{id}/read */
    public function markRead(Request $request): Response
    {
        $id = (int) $request->param('id');
        if ($id <= 0) {
            throw new HttpException(422, 'Invalid notification id.');
        }

        $this->notifications->markRead($id, (int) $this->user($request)['id']);

        return Response::success(['id' => $id, 'read' => true], 'Notification marked as read.');
    }

    /** PATCH /api/v1/notifications/read-all */
    public function markAllRead(Request $request): Response
    {
        $updated = $this->notifications->markAllRead((int) $this->user($request)['id']);

        return Response::success(['updated' => $updated], 'All notifications marked as read.');
    }

    /** DELETE /api/v1/notifications/{id} */
    public function destroy(Request $request): Response
    {
        $id = (int) $request->param('id');
        if ($id <= 0) {
            throw new HttpException(422, 'Invalid notification id.');
        }

        if (!$this->notifications->delete($id, (int) $this->user($request)['id'])) {
            throw new HttpException(404, 'Notification not found.');
        }

        return Response::success(null, 'Notification deleted.');
    }
}
