<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Core\Logger;
use RuntimeException;

/**
 * Stripe via the REST API (Checkout Sessions) — no SDK. Sandbox vs
 * production is simply which secret key the admin enters (test/live);
 * the environment field documents which mode the keys belong to.
 */
final class StripeGateway implements GatewayInterface
{
    private const API = 'https://api.stripe.com/v1';

    public function __construct(
        /** @var array{secret_key?: string, publishable_key?: string, webhook_secret?: string} */
        private readonly array $credentials,
        private readonly string $environment = 'sandbox',
    ) {
    }

    public function createCheckout(array $payment, array $urls): array
    {
        $body = http_build_query([
            'mode'                                     => 'payment',
            'client_reference_id'                      => (string) $payment['id'],
            'success_url'                              => $urls['success'] . '&session_id={CHECKOUT_SESSION_ID}',
            'cancel_url'                               => $urls['cancel'],
            'line_items[0][quantity]'                  => 1,
            'line_items[0][price_data][currency]'      => strtolower((string) $payment['currency']),
            'line_items[0][price_data][unit_amount]'   => (int) round($payment['amount'] * 100),
            'line_items[0][price_data][product_data][name]' => $payment['description'],
            'metadata[invoice_no]'                     => $payment['invoice_no'],
            'metadata[payment_id]'                     => (string) $payment['id'],
        ]);

        $res = $this->request('POST', '/checkout/sessions', $body);
        if (($res['id'] ?? '') === '' || ($res['url'] ?? '') === '') {
            throw new RuntimeException('Stripe error: ' . ($res['error']['message'] ?? 'could not create the checkout session.'));
        }

        return ['redirect_url' => (string) $res['url'], 'gateway_ref' => (string) $res['id']];
    }

    public function verifyPayment(string $gatewayRef, array $params): array
    {
        $sessionId = (string) ($params['session_id'] ?? $gatewayRef);
        $res = $this->request('GET', '/checkout/sessions/' . rawurlencode($sessionId));

        $paymentStatus = (string) ($res['payment_status'] ?? '');
        $status = (string) ($res['status'] ?? '');

        if ($paymentStatus === 'paid') {
            return ['status' => 'paid', 'gateway_ref' => $sessionId, 'message' => 'Verified paid with Stripe.'];
        }
        if ($status === 'expired' || $paymentStatus === 'canceled') {
            return ['status' => 'canceled', 'gateway_ref' => $sessionId, 'message' => 'Stripe session ' . ($status ?: $paymentStatus) . '.'];
        }
        if ($status === 'open') {
            return ['status' => 'pending', 'gateway_ref' => $sessionId, 'message' => 'Stripe session still open.'];
        }

        return ['status' => 'failed', 'gateway_ref' => $sessionId, 'message' => 'Stripe reports: ' . ($res['error']['message'] ?? ($paymentStatus ?: 'unknown state'))];
    }

    public function parseWebhook(array $headers, string $rawBody): ?array
    {
        $secret = (string) ($this->credentials['webhook_secret'] ?? '');
        $signature = (string) ($headers['stripe-signature'] ?? '');
        if ($secret === '' || $signature === '') {
            return null;
        }

        // Stripe-Signature: t=timestamp,v1=hexhmac
        $parts = [];
        foreach (explode(',', $signature) as $pair) {
            [$k, $v] = array_pad(explode('=', trim($pair), 2), 2, '');
            $parts[$k][] = $v;
        }
        $timestamp = (string) ($parts['t'][0] ?? '');
        $expected = hash_hmac('sha256', $timestamp . '.' . $rawBody, $secret);
        $valid = false;
        foreach ($parts['v1'] ?? [] as $candidate) {
            if (hash_equals($expected, $candidate)) {
                $valid = true;
                break;
            }
        }
        // Replay window: 5 minutes.
        if (!$valid || $timestamp === '' || abs(time() - (int) $timestamp) > 300) {
            return null;
        }

        $event = json_decode($rawBody, true) ?? [];
        $type = (string) ($event['type'] ?? '');
        $object = $event['data']['object'] ?? [];

        $status = match (true) {
            $type === 'checkout.session.completed'
                && (($object['payment_status'] ?? '') === 'paid') => 'paid',
            $type === 'checkout.session.async_payment_failed',
            $type === 'payment_intent.payment_failed'            => 'failed',
            str_starts_with($type, 'charge.refund'),
            $type === 'charge.refunded'                          => 'refunded',
            $type === 'checkout.session.expired'                 => 'canceled',
            default                                              => 'other',
        };

        return [
            'event_id'    => (string) ($event['id'] ?? ''),
            'type'        => $type,
            'gateway_ref' => (string) ($object['id'] ?? '') ?: null,
            'status'      => $status,
        ];
    }

    public function testConnection(): array
    {
        if (trim((string) ($this->credentials['secret_key'] ?? '')) === '') {
            return ['ok' => false, 'message' => 'Secret key is not set.'];
        }
        $res = $this->request('GET', '/balance');
        if (isset($res['object']) && $res['object'] === 'balance') {
            return ['ok' => true, 'message' => 'Connected — Stripe accepted the secret key (' . $this->environment . ').'];
        }

        return ['ok' => false, 'message' => 'Stripe rejected the credentials: ' . ($res['error']['message'] ?? 'unknown error.')];
    }

    /** @return array<string, mixed> */
    private function request(string $method, string $path, string $body = ''): array
    {
        $ch = curl_init(self::API . $path);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST  => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . (string) ($this->credentials['secret_key'] ?? '')],
        ]);
        if ($body !== '') {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }
        $raw = curl_exec($ch);
        $error = curl_error($ch);
        curl_close($ch);

        if ($raw === false) {
            Logger::channel('payments')->error('Stripe unreachable', ['error' => $error]);
            throw new RuntimeException('Stripe is unreachable: ' . ($error ?: 'connection failed.'));
        }

        return json_decode((string) $raw, true) ?? [];
    }
}
