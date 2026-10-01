<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Controllers\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Core\Validator;
use App\Exceptions\HttpException;
use App\Services\AdminUserService;

/** Admin → User Management (AdminMiddleware on every route). */
final class AdminUserController extends Controller
{
    private AdminUserService $service;

    public function __construct()
    {
        $this->service = new AdminUserService();
    }

    /** GET /api/v1/admin/users?search=&status=&plan=&page=&per_page= */
    public function index(Request $request): Response
    {
        $page = max(1, (int) $request->queryParam('page', '1'));
        $perPage = min(100, max(1, (int) $request->queryParam('per_page', '50')));

        return Response::success($this->service->list(
            trim($request->queryParam('search')),
            strtolower($request->queryParam('status')) ?: null,
            strtolower($request->queryParam('plan')) ?: null,
            $page,
            $perPage,
        ));
    }

    /** GET /api/v1/admin/users/{id} */
    public function show(Request $request): Response
    {
        return Response::success($this->service->detail($this->id($request)));
    }

    /** POST /api/v1/admin/users/{id}/suspend  { suspend: bool } */
    public function suspend(Request $request): Response
    {
        $suspend = (bool) $request->input('suspend', true);

        $detail = $this->service->setSuspended(
            (int) $this->user($request)['id'],
            $this->id($request),
            $suspend,
        );

        return Response::success($detail, $suspend ? 'User suspended.' : 'User reactivated.');
    }

    /** POST /api/v1/admin/users/{id}/credits  { amount, note? } */
    public function credits(Request $request): Response
    {
        $data = Validator::validate($request->all(), [
            'note' => 'string|max:190',
        ]);

        $result = $this->service->grantCredits(
            (int) $this->user($request)['id'],
            $this->id($request),
            (int) $request->input('amount', 0),
            $data['note'] ?? '',
        );

        return Response::success($result, 'Credits updated.');
    }

    /** POST /api/v1/admin/users/{id}/reset-password */
    public function resetPassword(Request $request): Response
    {
        $this->service->sendPasswordReset((int) $this->user($request)['id'], $this->id($request));

        return Response::success(null, 'Password reset email sent.');
    }

    private function id(Request $request): int
    {
        $id = (int) $request->param('id');
        if ($id <= 0) {
            throw new HttpException(422, 'Invalid user id.');
        }

        return $id;
    }
}
