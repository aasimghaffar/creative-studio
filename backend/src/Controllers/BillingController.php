<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Validator;
use App\Services\BillingService;

/** Billing & Credits module — own-data only; /plans is public catalogue. */
final class BillingController extends Controller
{
    private BillingService $billing;

    public function __construct()
    {
        $this->billing = new BillingService();
    }

    /** GET /api/v1/plans (public) */
    public function plans(Request $request): Response
    {
        return Response::success(['plans' => $this->billing->planCatalogue()]);
    }

    /** GET /api/v1/billing/current-plan */
    public function currentPlan(Request $request): Response
    {
        return Response::success($this->billing->currentPlan((int) $this->user($request)['id']));
    }

    /** GET /api/v1/billing/credits */
    public function credits(Request $request): Response
    {
        return Response::success($this->billing->creditsOverview((int) $this->user($request)['id']));
    }

    /** GET /api/v1/billing/payments */
    public function payments(Request $request): Response
    {
        return Response::success(['payments' => $this->billing->paymentHistory((int) $this->user($request)['id'])]);
    }

    /** GET /api/v1/billing/credit-usage */
    public function creditUsage(Request $request): Response
    {
        return Response::success(['usage' => $this->billing->creditUsage((int) $this->user($request)['id'])]);
    }

    /** POST /api/v1/billing/upgrade  { plan_slug, billing_cycle } */
    public function upgrade(Request $request): Response
    {
        $data = Validator::validate($request->all(), [
            'plan_slug'     => 'required|string|max:60',
            'billing_cycle' => 'required|string|max:10',
        ]);

        $result = $this->billing->changePlan(
            (int) $this->user($request)['id'],
            $data['plan_slug'],
            $data['billing_cycle'],
        );

        return Response::success($result, 'Plan updated.');
    }
}
