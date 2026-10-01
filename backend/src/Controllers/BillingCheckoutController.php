<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Config\Config;
use App\Core\Request;
use App\Core\Response;
use App\Exceptions\HttpException;
use App\Repositories\PlanRepository;
use App\Repositories\PlatformSettingRepository;
use App\Services\Payments\InvoiceService;
use App\Services\Payments\PaymentService;

/** Checkout: context, start (redirect), confirm (server-verified). */
final class BillingCheckoutController extends Controller
{
    // NOTE: the base Controller has no constructor — do not call
    // parent::__construct() here (it fatals with "Cannot call constructor").
    private function payments(): PaymentService
    {
        return new PaymentService();
    }

    /** GET /api/v1/billing/checkout-context?plan=&cycle= */
    public function context(Request $request): Response
    {
        $planSlug = $request->queryParam('plan');
        $cycle = $request->queryParam('cycle', 'monthly');
        $plan = (new PlanRepository())->findBySlug($planSlug);
        if ($plan === null || !(bool) $plan['is_active']) {
            throw new HttpException(404, 'That plan is not available.');
        }
        $price = $cycle === 'yearly' ? $plan['yearly_price'] : $plan['monthly_price'];
        if ($price === null || (float) $price <= 0) {
            throw new HttpException(409, 'Only paid plans go through checkout.');
        }
        // Single source of truth: plans.yearly_price IS the yearly total
        // (migration 028) — charged exactly as stored, never recalculated.
        $amount = (float) $price;
        $currency = (string) ((new PlatformSettingRepository())->all()['currency'] ?? 'USD');

        return Response::success([
            'plan' => [
                'slug'              => (string) $plan['slug'],
                'name'              => (string) $plan['name'],
                'credits_per_cycle' => $plan['credits_per_cycle'] !== null ? (int) $plan['credits_per_cycle'] : null,
            ],
            'cycle'    => $cycle,
            'price'    => $amount,
            'tax'      => 0.0,          // future-ready
            'total'    => $amount,
            'currency' => $currency,
            'gateways' => $this->payments()->enabledGateways(),
        ]);
    }

    /** POST /api/v1/billing/checkout  { plan, cycle, gateway } */
    public function start(Request $request): Response
    {
        $origin = (string) ($request->header('origin') ?? '');
        $base = $origin !== '' ? $origin : (string) Config::get('APP_URL');

        return Response::success($this->payments()->startCheckout(
            (int) $this->user($request)['id'],
            (string) $request->input('plan', ''),
            (string) $request->input('cycle', 'monthly'),
            (string) $request->input('gateway', ''),
            $base,
        ));
    }

    /** POST /api/v1/billing/checkout/confirm  { payment_id, ...gateway params } */
    public function confirm(Request $request): Response
    {
        return Response::success($this->payments()->confirm(
            (int) $this->user($request)['id'],
            (int) $request->input('payment_id', 0),
            (array) $request->all(),
        ));
    }

    /** GET /api/v1/billing/invoices/{id} — printable HTML invoice. */
    public function invoice(Request $request): Response
    {
        $user = $this->user($request);
        $html = (new InvoiceService())->render(
            (int) $request->param('id'),
            (int) $user['id'],
            ($user['role'] ?? '') === 'admin',
        );

        return Response::html($html);
    }

    /** POST /api/v1/billing/cancel */
    public function cancel(Request $request): Response
    {
        (new \App\Services\BillingService())->cancelSubscription((int) $this->user($request)['id']);

        return Response::success(['status' => 'canceled']);
    }
}
