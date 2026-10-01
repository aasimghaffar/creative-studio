<?php

declare(strict_types=1);

namespace App\Services\Payments;

/**
 * Contract every payment gateway implements. Credentials + environment
 * come from the payment_gateways row (decrypted by the caller); nothing
 * is hardcoded — the client enters keys in admin and it works.
 */
interface GatewayInterface
{
    /**
     * Create a hosted checkout and return where to send the user.
     *
     * @param array{id: int, invoice_no: string, amount: float, currency: string, description: string} $payment
     * @param array{success: string, cancel: string} $urls
     *
     * @return array{redirect_url: string, gateway_ref: string}
     */
    public function createCheckout(array $payment, array $urls): array;

    /**
     * Server-to-server verification — NEVER trust the browser redirect.
     *
     * @param array<string, mixed> $params request params from the return URL
     *
     * @return array{status: 'paid'|'pending'|'failed'|'canceled', gateway_ref: string, message: string}
     */
    public function verifyPayment(string $gatewayRef, array $params): array;

    /**
     * Validate + parse a webhook. Returns null when the signature is bad.
     *
     * @param array<string, string> $headers lower-cased header map
     *
     * @return array{event_id: string, type: string, gateway_ref: string|null, status: 'paid'|'failed'|'refunded'|'canceled'|'other'}|null
     */
    public function parseWebhook(array $headers, string $rawBody): ?array;

    /** @return array{ok: bool, message: string} Live credential check. */
    public function testConnection(): array;
}
