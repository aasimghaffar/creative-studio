<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Validator;
use App\Repositories\SupportTicketRepository;
use App\Services\NotificationService;

final class SupportController extends Controller
{
    private const TOPICS = ['general', 'bug', 'feature', 'billing'];
    private const PRIORITIES = ['low', 'normal', 'high'];

    private SupportTicketRepository $tickets;

    public function __construct()
    {
        $this->tickets = new SupportTicketRepository();
    }

    /** GET /api/v1/support/tickets */
    public function index(Request $request): Response
    {
        return Response::success([
            'tickets' => $this->tickets->listForUser((int) $this->user($request)['id']),
        ]);
    }

    /** POST /api/v1/support/tickets  { subject, topic, message, priority? } */
    public function store(Request $request): Response
    {
        $data = Validator::validate($request->all(), [
            'subject' => 'required|string|min:3|max:190',
            'message' => 'required|string|min:10|max:5000',
            'topic'   => 'string|max:20',
            'priority' => 'string|max:10',
        ]);

        $topic = in_array($data['topic'] ?? '', self::TOPICS, true) ? $data['topic'] : 'general';
        $priority = in_array($data['priority'] ?? '', self::PRIORITIES, true) ? $data['priority'] : 'normal';

        $userId = (int) $this->user($request)['id'];
        $ticketId = $this->tickets->create($userId, $data['subject'], $topic, $data['message'], $priority);

        (new NotificationService())->system(
            $userId,
            'Support ticket received',
            sprintf('Ticket #%d — "%s". A person answers within a day.', $ticketId, mb_substr($data['subject'], 0, 60)),
        );

        // Alert every admin: a badge + entry in their notifications menu.
        $admins = \App\Core\Database::connection()
            ->query("SELECT id FROM users WHERE role = 'admin' AND status = 'active'")
            ->fetchAll();
        $notifications = new \App\Repositories\NotificationRepository();
        foreach ($admins as $admin) {
            $notifications->create(
                (int) $admin['id'],
                'system',
                'New support ticket',
                sprintf('%s: %s', (string) ($this->user($request)['name'] ?? 'A user'), mb_substr((string) $data['subject'], 0, 120)),
                ['ticket_id' => $ticketId],
            );
        }

        return Response::created(['id' => $ticketId, 'status' => 'open'], 'Ticket submitted.');
    }
}
