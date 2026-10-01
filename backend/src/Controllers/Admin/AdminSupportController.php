<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Controllers\Controller;
use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Exceptions\HttpException;

/**
 * Admin → Support Inbox: every ticket users submit from Help & Support,
 * with the sender's account details, newest first.
 */
final class AdminSupportController extends Controller
{
    /** GET /api/v1/admin/support/tickets */
    public function index(Request $request): Response
    {
        $rows = Database::connection()->query(
            'SELECT t.id, t.topic, t.priority, t.subject, t.message, t.status, t.created_at,
                    u.name AS user_name, u.email AS user_email
             FROM support_tickets t
             LEFT JOIN users u ON u.id = t.user_id
             ORDER BY t.created_at DESC
             LIMIT 200',
        )->fetchAll();

        return Response::success(['tickets' => array_map(static fn (array $t): array => [
            'id'         => (int) $t['id'],
            'topic'      => (string) $t['topic'],
            'priority'   => (string) $t['priority'],
            'subject'    => (string) $t['subject'],
            'message'    => (string) $t['message'],
            'status'     => (string) $t['status'],
            'created_at' => (string) $t['created_at'],
            'user_name'  => (string) ($t['user_name'] ?? 'Deleted account'),
            'user_email' => (string) ($t['user_email'] ?? ''),
        ], $rows)]);
    }

    /** PATCH /api/v1/admin/support/tickets/{id}  { status: open|resolved } */
    public function updateStatus(Request $request): Response
    {
        $status = (string) $request->input('status', '');
        if (!in_array($status, ['open', 'resolved'], true)) {
            throw new HttpException(422, 'Status must be open or resolved.');
        }

        $stmt = Database::connection()->prepare(
            'UPDATE support_tickets SET status = :status, updated_at = NOW() WHERE id = :id',
        );
        $stmt->execute(['status' => $status, 'id' => (int) $request->param('id')]);

        return Response::success(null, 'Ticket updated.');
    }
}
