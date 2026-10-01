<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Controllers\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Exceptions\HttpException;
use App\Services\AdminPlanService;

/** Admin → Subscription Plans (AdminMiddleware on every route). */
final class AdminPlanController extends Controller
{
    private AdminPlanService $service;

    public function __construct()
    {
        $this->service = new AdminPlanService();
    }

    /** GET /api/v1/admin/plans */
    public function index(Request $request): Response
    {
        return Response::success(['plans' => $this->service->list()]);
    }

    /** POST /api/v1/admin/plans */
    public function store(Request $request): Response
    {
        $plan = $this->service->create((int) $this->user($request)['id'], $request->all());

        return Response::created($plan, 'Plan created.');
    }

    /** PUT /api/v1/admin/plans/{id} */
    public function update(Request $request): Response
    {
        $plan = $this->service->update(
            (int) $this->user($request)['id'],
            $this->id($request),
            $request->all(),
        );

        return Response::success($plan, 'Plan saved.');
    }

    /** DELETE /api/v1/admin/plans/{id} — refused with 409 while in use. */
    public function destroy(Request $request): Response
    {
        $this->service->delete((int) $this->user($request)['id'], $this->id($request));

        return Response::success(null, 'Plan deleted.');
    }

    /** POST /api/v1/admin/plans/{id}/toggle  { active } */
    public function toggle(Request $request): Response
    {
        $active = (bool) $request->input('active', true);
        $plan = $this->service->setActive((int) $this->user($request)['id'], $this->id($request), $active);

        return Response::success($plan, $active ? 'Plan enabled.' : 'Plan disabled.');
    }

    private function id(Request $request): int
    {
        $id = (int) $request->param('id');
        if ($id <= 0) {
            throw new HttpException(422, 'Invalid plan id.');
        }

        return $id;
    }
}
