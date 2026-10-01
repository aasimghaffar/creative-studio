<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Controllers\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Exceptions\HttpException;
use App\Services\AdminAiToolService;

/** Admin → AI Tools + AI Providers (AdminMiddleware on every route). */
final class AdminAiToolController extends Controller
{
    private AdminAiToolService $service;

    public function __construct()
    {
        $this->service = new AdminAiToolService();
    }

    /** GET /api/v1/admin/ai-tools */
    public function index(Request $request): Response
    {
        return Response::success(['tools' => $this->service->list()]);
    }

    /** GET /api/v1/admin/ai-tools/{id} */
    public function show(Request $request): Response
    {
        return Response::success($this->service->get($this->id($request)));
    }

    /** PUT /api/v1/admin/ai-tools/{id} */
    public function update(Request $request): Response
    {
        $tool = $this->service->update(
            (int) $this->user($request)['id'],
            $this->id($request),
            $request->all(),
        );

        return Response::success($tool, 'Tool settings saved.');
    }

    /** POST /api/v1/admin/ai-tools/{id}/toggle  { enabled } */
    public function toggle(Request $request): Response
    {
        $enabled = (bool) $request->input('enabled', false);
        $tool = $this->service->toggle((int) $this->user($request)['id'], $this->id($request), $enabled);

        return Response::success($tool, $enabled ? 'Tool enabled.' : 'Tool disabled.');
    }

    private function id(Request $request): int
    {
        $id = (int) $request->param('id');
        if ($id <= 0) {
            throw new HttpException(422, 'Invalid tool id.');
        }

        return $id;
    }
}
