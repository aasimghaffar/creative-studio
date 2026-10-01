<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Core\Logger;
use RuntimeException;

/**
 * PayPal via the Orders v2 REST API — no SDK. The environment field
 * switches between the sandbox and live API hosts automatically.
 */
final class PayPalGateway implements GatewayInterface
{
    public function __construct(
        /** @var array{client_id?: string, client_secret?: string, webhook_id?: string} */
        private readonly array $credentials,
        private readonly string $environment = 'sandbox',
    ) {
    }

    private function base(): string
    {
        return $this->environment === 'production'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';
    }

    public function createCheckout(array $payment, array $urls): array
    {
        $res = $this->request('POST', '/v2/checkout/orders', [
            'intent'         => 'CAPTURE',
            'purchase_units' => [[
                'reference_id' => (string) $payment['id'],
                'invoice_id'   => $payment['invoice_no'],
                'description'  => mb_substr((string) $payment['description'], 0, 120),
                'amount'       => [
                    'currency_code' => (string) $payment['currency'],
                    'value'         => number_format((float) $payment['amount'], 2, '.', ''),
                ],
            ]],
            'application_context' => [
                'return_url'  => $urls['success'],
                'cancel_url'  => $urls['cancel'],
                'user_action' => 'PAY_NOW',
            ],
        ]);

        $approve = null;
        foreach ((array) ($res['links'] ?? []) as $link) {
            if (($link['rel'] ?? '') === 'approve') {
                $approve = (string) $link['href'];
            }
        }
        if (($res['id'] ?? '') === '' || $approve === null) {
            throw new RuntimeException('PayPal error: ' . ($res['message'] ?? 'could not create the order.'));
        }

        return ['redirect_url' => $approve, 'gateway_ref' => (string) $res['id']];
    }

    public function verifyPayment(string $gatewayRef, array $params): array
    {
        $orderId = (string) ($params['token'] ?? $gatewayRef);

        // Capture (idempotent: an already-captured order reports COMPLETED).
        $capture = $this->request('POST', '/v2/checkout/orders/' . rawurlencode($orderId) . '/capture', new \stdClass());
        $status = (string) ($capture['status'] ?? '');
        if ($status === '' || isset($capture['name'])) {
            $order = $this->request('GET', '/v2/checkout/orders/' . rawurlencode($orderId));
            $status = (string) ($order['status'] ?? '');
        }

        return match ($status) {
            'COMPLETED'          => ['status' => 'paid', 'gateway_ref' => $orderId, 'message' => 'Verified captured with PayPal.'],
            'APPROVED', 'CREATED', 'SAVED', 'PAYER_ACTION_REQUIRED'
                                 => ['status' => 'pending', 'gateway_ref' => $orderId, 'message' => 'PayPal order not captured yet (' . $status . ').'],
            'VOIDED'             => ['status' => 'canceled', 'gateway_ref' => $orderId, 'message' => 'PayPal order voided.'],
            default              => ['status' => 'failed', 'gateway_ref' => $orderId, 'message' => 'PayPal reports: ' . ($status ?: 'unknown state')],
        };
    }

    public function parseWebhook(array $headers, string $rawBody): ?array
    {
        $webhookId = trim((string) ($this->credentials['webhook_id'] ?? ''));
        if ($webhookId === '') {
            return null; // verification impossible without the webhook id
        }

        // PayPal verification is an API call with the transmission headers.
        $verify = $this->request('POST', '/v1/notifications/verify-webhook-signature', [
            'auth_algo'         => (string) ($headers['paypal-auth-algo'] ?? ''),
            'cert_url'          => (string) ($headers['paypal-cert-url'] ?? ''),
            'transmission_id'   => (string) ($headers['paypal-transmission-id'] ?? ''),
            'transmission_sig'  => (string) ($headers['paypal-transmission-sig'] ?? ''),
            'transmission_time' => (string) ($headers['paypal-transmission-time'] ?? ''),
            'webhook_id'        => $webhookId,
            'webhook_event'     => json_decode($rawBody, true) ?? new \stdClass(),
        ]);
        if (($verify['verification_status'] ?? '') !== 'SUCCESS') {
            return null;
        }

        $event = json_decode($rawBody, true) ?? [];
        $type = (string) ($event['event_type'] ?? '');
        $resource = $event['resource'] ?? [];

        // Try to trace back to our order id.
        $ref = (string) ($resource['supplementary_data']['related_ids']['order_id']
            ?? $resource['id']
            ?? '');

        $status = match (true) {
            $type === 'CHECKOUT.ORDER.APPROVED',
            $type === 'PAYMENT.CAPTURE.COMPLETED'  => 'paid',
            $type === 'PAYMENT.CAPTURE.DENIED',
            $type === 'PAYMENT.CAPTURE.DECLINED'   => 'failed',
            $type === 'PAYMENT.CAPTURE.REFUNDED'   => 'refunded',
            $type === 'CHECKOUT.ORDER.VOIDED'      => 'canceled',
            default                                => 'other',
        };

        return [
            'event_id'    => (string) ($event['id'] ?? ''),
            'type'        => $type,
            'gateway_ref' => $ref !== '' ? $ref : null,
            'status'      => $status,
        ];
    }

    public function testConnection(): array
    {
        try {
            $token = $this->accessToken();
        } catch (RuntimeException $e) {
            return ['ok' => false, 'message' => $e->getMessage()];
        }

        return $token !== ''
            ? ['ok' => true, 'message' => 'Connected — PayPal accepted the credentials (' . $this->environment . ').']
            : ['ok' => false, 'message' => 'PayPal rejected the credentials.'];
    }

    private ?string $token = null;

    private function accessToken(): string
    {
        if ($this->token !== null) {
            return $this->token;
        }
        $id = trim((string) ($this->credentials['client_id'] ?? ''));
        $secret = trim((string) ($this->credentials['client_secret'] ?? ''));
        if ($id === '' || $secret === '') {
            throw new RuntimeException('PayPal client id / secret are not set.');
        }

        $ch = curl_init($this->base() . '/v1/oauth2/token');
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_USERPWD        => $id . ':' . $secret,
            CURLOPT_POSTFIELDS     => 'grant_type=client_credentials',
        ]);
        $raw = curl_exec($ch);
        $error = curl_error($ch);
        curl_close($ch);
        if ($raw === false) {
            throw new RuntimeException('PayPal is unreachable: ' . ($error ?: 'connection failed.'));
        }
        $data = json_decode((string) $raw, true) ?? [];
        $token = (string) ($data['access_token'] ?? '');
        if ($token === '') {
            throw new RuntimeException('PayPal rejected the credentials: ' . ($data['error_description'] ?? 'no token returned.'));
        }

        return $this->token = $token;
    }

    /** @param array<string, mixed>|\stdClass $body @return array<string, mixed> */
    private function request(string $method, string $path, array|\stdClass|null $body = null): array
    {
        $ch = curl_init($this->base() . $path);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST  => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $this->accessToken(),
                'Content-Type: application/json',
            ],
        ]);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body) ?: '{}');
        }
        $raw = curl_exec($ch);
        $error = curl_error($ch);
        curl_close($ch);
        if ($raw === false) {
            Logger::channel('payments')->error('PayPal unreachable', ['error' => $error]);
            throw new RuntimeException('PayPal is unreachable: ' . ($error ?: 'connection failed.'));
        }

        return json_decode((string) $raw, true) ?? [];
    }
}
