<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Services\DashboardService;

final class DashboardController extends Controller
{
    /** GET /api/v1/dashboard — everything the home page needs, one call. */
    public function index(Request $request): Response
    {
        return Response::success(
            (new DashboardService())->overview((int) $this->user($request)['id']),
        );
    }
}
