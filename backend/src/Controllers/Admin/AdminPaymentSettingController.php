<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Controllers\Controller;
use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Core\Response;
use App\Exceptions\HttpException;
use App\Exceptions\ValidationException;
use App\Repositories\PlatformSettingRepository;
use App\Services\Storage\CredentialCrypto;

/** Admin → Payment Settings: gateways (one active), currency, invoicing. */
final class AdminPaymentSettingController extends Controller
{
    private const FIELDS = [
        'stripe'   => ['publishable_key', 'secret_key', 'webhook_secret'],
        'paypal'   => ['client_id', 'client_secret', 'webhook_id'],
        'razorpay' => ['key_id', 'key_secret', 'webhook_secret'],
    ];
    private const CURRENCIES = ['USD', 'EUR', 'GBP', 'PKR', 'INR', 'AED', 'CAD', 'AUD'];

    /** GET /api/v1/admin/payment-settings */
    public function index(Request $request): Response
    {
        $settings = (new PlatformSettingRepository())->all();
        $rows = Database::connection()->query('SELECT * FROM payment_gateways ORDER BY id ASC')->fetchAll();

        return Response::success([
            'gateways'       => array_map([$this, 'shape'], $rows),
            'currency'       => (string) ($settings['currency'] ?? 'USD'),
            'currencies'     => self::CURRENCIES,
            'invoice_prefix' => (string) ($settings['invoice_prefix'] ?? 'INV'),
            'invoice_auto'   => ($settings['invoice_auto'] ?? '1') === '1',
        ]);
    }

    /** PUT /api/v1/admin/payment-gateways/{id}  { credentials?, enable? } */
    public function updateGateway(Request $request): Response
    {
        $id = (int) $request->param('id');
        $db = Database::connection();
        $stmt = $db->prepare('SELECT * FROM payment_gateways WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        if ($row === false) {
            throw new HttpException(404, 'Gateway not found.');
        }

        $incoming = (array) $request->input('credentials', []);
        if ($incoming !== []) {
            $current = CredentialCrypto::decrypt($row['credentials'] ?? null);
            foreach (self::FIELDS[(string) $row['slug']] ?? [] as $field) {
                $value = trim((string) ($incoming[$field] ?? ''));
                if ($value !== '') {
                    $current[$field] = $value; // empty input keeps the stored secret
                }
            }
            $db->prepare('UPDATE payment_gateways SET credentials = :c, updated_at = NOW() WHERE id = :id')
                ->execute(['c' => CredentialCrypto::encrypt($current), 'id' => $id]);
        }

        if ($request->input('environment') !== null) {
            $environment = (string) $request->input('environment');
            if (!in_array($environment, ['sandbox', 'production'], true)) {
                throw new HttpException(422, 'Environment must be sandbox or production.');
            }
            $db->prepare('UPDATE payment_gateways SET environment = :env, updated_at = NOW() WHERE id = :id')
                ->execute(['env' => $environment, 'id' => $id]);
        }

        if ($request->input('enabled') !== null) {
            // Independent toggles — one OR multiple gateways can be live;
            // the checkout page lists whatever is enabled.
            $db->prepare('UPDATE payment_gateways SET enabled = :on, updated_at = NOW() WHERE id = :id')
                ->execute(['on' => (bool) $request->input('enabled') ? 1 : 0, 'id' => $id]);
        }

        if ((bool) $request->input('enable', false) && !(bool) $row['enabled']) {
            // Legacy exclusive path kept for backwards compatibility.
            $db->beginTransaction();
            try {
                $db->exec('UPDATE payment_gateways SET enabled = 0, updated_at = NOW()');
                $db->prepare('UPDATE payment_gateways SET enabled = 1, updated_at = NOW() WHERE id = :id')->execute(['id' => $id]);
                $db->commit();
            } catch (\Throwable $e) {
                if ($db->inTransaction()) {
                    $db->rollBack();
                }
                throw $e;
            }
            Logger::channel('app')->warning('Payment gateway switched', [
                'admin_id' => (int) $this->user($request)['id'],
                'gateway'  => $row['slug'],
            ]);
        }

        $fresh = $db->query('SELECT * FROM payment_gateways ORDER BY id ASC')->fetchAll();

        return Response::success(['gateways' => array_map([$this, 'shape'], $fresh)], 'Gateway saved.');
    }

    /** PUT /api/v1/admin/payment-settings  { currency, invoice_prefix, invoice_auto } */
    public function updateSettings(Request $request): Response
    {
        $errors = [];

        $currency = strtoupper(trim((string) $request->input('currency', 'USD')));
        if (!in_array($currency, self::CURRENCIES, true)) {
            $errors['currency'][] = 'Unsupported currency.';
        }
        $prefix = strtoupper(trim((string) $request->input('invoice_prefix', 'INV')));
        if (!preg_match('/^[A-Z0-9]{2,10}$/', $prefix)) {
            $errors['invoice_prefix'][] = 'Prefix must be 2–10 letters or numbers.';
        }
        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        (new PlatformSettingRepository())->setMany([
            'currency'       => $currency,
            'invoice_prefix' => $prefix,
            'invoice_auto'   => $request->input('invoice_auto', true) ? '1' : '0',
        ]);

        return Response::success(null, 'Payment settings saved — future invoices use ' . $prefix . ' and ' . $currency . '.');
    }

    /** @param array<string, mixed> $row */
    private function shape(array $row): array
    {
        $credentials = CredentialCrypto::decrypt($row['credentials'] ?? null);
        $fields = [];
        foreach (self::FIELDS[(string) $row['slug']] ?? [] as $field) {
            $fields[$field] = isset($credentials[$field]) && $credentials[$field] !== '';
        }

        return [
            'id'         => (int) $row['id'],
            'slug'       => $row['slug'],
            'name'       => $row['name'],
            'enabled'    => (bool) $row['enabled'],
            'environment' => (string) ($row['environment'] ?? 'sandbox'),
            'fields_set' => $fields, // presence only — never secrets
        ];
    }

    /** POST /api/v1/admin/payment-gateways/{id}/test — REAL credential check. */
    public function testGateway(Request $request): Response
    {
        $id = (int) $request->param('id');
        $stmt = Database::connection()->prepare('SELECT * FROM payment_gateways WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        if ($row === false) {
            throw new HttpException(404, 'Gateway not found.');
        }

        [, $gateway] = (new \App\Services\Payments\PaymentService())->gatewayFor((string) $row['slug'], false);
        $result = $gateway->testConnection();

        try {
            Database::connection()->prepare('UPDATE payment_gateways SET status = :s, updated_at = NOW() WHERE id = :id')
                ->execute(['s' => $result['ok'] ? 'connected' : 'failed', 'id' => $id]);
        } catch (\PDOException $e) {
            // The status column is cosmetic — never let it break the test.
            \App\Core\Logger::channel('app')->warning('Could not persist gateway test status', ['error' => $e->getMessage()]);
        }

        return Response::success($result);
    }
}
