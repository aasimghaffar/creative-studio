<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Controllers\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Exceptions\HttpException;
use App\Repositories\PaymentRepository;

/**
 * Admin → Payments. STRICTLY read-only: records are created by the
 * billing flows (subscription/credit purchases), never by admins.
 */
final class AdminPaymentController extends Controller
{
    private const STATUSES = ['paid', 'pending', 'failed', 'refunded'];
    private const GATEWAYS = ['stripe', 'paypal', 'razorpay', 'manual'];

    private PaymentRepository $payments;

    public function __construct()
    {
        $this->payments = new PaymentRepository();
    }

    /** GET /api/v1/admin/payments?search=&status=&gateway=&page=&per_page= */
    public function index(Request $request): Response
    {
        $status = strtolower($request->queryParam('status'));
        $gateway = strtolower($request->queryParam('gateway'));
        $page = max(1, (int) $request->queryParam('page', '1'));
        $perPage = min(100, max(1, (int) $request->queryParam('per_page', '25')));

        $result = $this->payments->adminList(
            trim($request->queryParam('search')) ?: null,
            in_array($status, self::STATUSES, true) ? $status : null,
            in_array($gateway, self::GATEWAYS, true) ? $gateway : null,
            $page,
            $perPage,
        );

        return Response::success([
            'payments' => array_map(static fn (array $row): array => [
                'id'             => (int) $row['id'],
                'invoice_no'     => $row['invoice_no'],
                'customer'       => $row['customer_name'] ?? 'Deleted account',
                'customer_email' => $row['customer_email'],
                'description'    => $row['description'],
                'plan'           => $row['plan_name'],
                'amount'         => (float) $row['amount'],
                'currency'       => $row['currency'],
                'gateway'        => $row['gateway'],
                'transaction'    => $row['gateway_payment_id'] ?? null,
                'webhook_ref'    => $row['webhook_ref'] ?? null,
                'status'         => $row['status'],
                'date'           => $row['paid_at'] ?? $row['created_at'],
            ], $result['rows']),
            'pagination' => [
                'page'     => $page,
                'per_page' => $perPage,
                'total'    => $result['total'],
                'has_more' => $page * $perPage < $result['total'],
            ],
        ]);
    }

    /** GET /api/v1/admin/payments/{id}/invoice — invoice built from the stored record. */
    public function invoice(Request $request): Response
    {
        // Same printable HTML invoice users get — admin can open any.
        $html = (new \App\Services\Payments\InvoiceService())->render(
            (int) $request->param('id'),
            (int) $this->user($request)['id'],
            true,
        );

        return Response::html($html);
    }
}
