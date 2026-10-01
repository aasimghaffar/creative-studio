<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Core\Database;
use App\Core\Logger;

/**
 * Webhook intake for all gateways: signature verification (delegated to
 * the gateway), duplicate suppression via UNIQUE(gateway, event_id),
 * and the same idempotent finalization the return-URL path uses.
 */
final class WebhookService
{
    public function __construct(
        private readonly PaymentService $payments = new PaymentService(),
    ) {
    }

    /** @param array<string, string> $headers @return array{http: int, body: array<string, string>} */
    public function handle(string $gatewaySlug, array $headers, string $rawBody): array
    {
        try {
            [, $gateway] = $this->payments->gatewayFor($gatewaySlug, false);
        } catch (\Throwable) {
            return ['http' => 404, 'body' => ['status' => 'unknown_gateway']];
        }

        $event = $gateway->parseWebhook($headers, $rawBody);
        if ($event === null) {
            $this->log($gatewaySlug, 'unverified-' . bin2hex(random_bytes(6)), 'signature', 'invalid', 'Signature verification failed.');
            Logger::channel('payments')->warning('Webhook rejected — bad signature', ['gateway' => $gatewaySlug]);

            return ['http' => 400, 'body' => ['status' => 'invalid_signature']];
        }

        // Duplicate / replay suppression: the UNIQUE key does the work.
        if (!$this->log($gatewaySlug, $event['event_id'], $event['type'], 'processed', null)) {
            return ['http' => 200, 'body' => ['status' => 'duplicate_ignored']];
        }

        if ($event['gateway_ref'] === null || $event['status'] === 'other') {
            return ['http' => 200, 'body' => ['status' => 'ignored']];
        }

        $payment = $this->payments->findByGatewayRef($gatewaySlug, $event['gateway_ref']);
        if ($payment === null) {
            Logger::channel('payments')->info('Webhook for unknown payment', ['gateway' => $gatewaySlug, 'ref' => $event['gateway_ref']]);

            return ['http' => 200, 'body' => ['status' => 'payment_not_found']];
        }

        switch ($event['status']) {
            case 'paid':
                $this->payments->finalizePaid((int) $payment['id'], $event['event_id']);
                break;
            case 'failed':
            case 'canceled':
                $this->payments->markFailed((int) $payment['id'], 'Gateway webhook: ' . $event['type']);
                break;
            case 'refunded':
                $this->payments->markRefunded((int) $payment['id']);
                break;
        }

        return ['http' => 200, 'body' => ['status' => 'ok']];
    }

    /** True when this event id was seen for the first time. */
    private function log(string $gateway, string $eventId, string $type, string $status, ?string $message): bool
    {
        try {
            Database::connection()->prepare(
                'INSERT INTO webhook_logs (gateway, event_id, event_type, status, message, created_at)
                 VALUES (:gateway, :event_id, :type, :status, :message, NOW())',
            )->execute([
                'gateway'  => $gateway,
                'event_id' => mb_substr($eventId, 0, 190),
                'type'     => mb_substr($type, 0, 120),
                'status'   => $status,
                'message'  => $message,
            ]);

            return true;
        } catch (\PDOException) {
            return false; // duplicate event id — already handled
        }
    }
}
