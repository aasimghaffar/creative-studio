<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Services\Payments\WebhookService;

/**
 * PUBLIC webhook intake — no auth middleware (gateways can't log in);
 * security = signature verification inside each gateway + dedupe.
 */
final class WebhookController extends Controller
{
    /** POST /api/v1/webhooks/{gateway} */
    public function handle(Request $request): Response
    {
        $headers = [];
        foreach ((function_exists('getallheaders') ? getallheaders() : []) as $k => $v) {
            $headers[strtolower((string) $k)] = (string) $v;
        }
        $raw = file_get_contents('php://input') ?: '';

        $result = (new WebhookService())->handle(
            (string) $request->param('gateway'),
            $headers,
            $raw,
        );

        return Response::json($result['body'], $result['http']);
    }
}
