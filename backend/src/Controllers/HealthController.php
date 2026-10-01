<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Config\Config;
use App\Core\Database;
use App\Core\Request;
use App\Core\Response;

final class HealthController extends Controller
{
    /** GET /api/v1/health — liveness + database reachability. */
    public function index(Request $request): Response
    {
        $database = 'ok';
        try {
            Database::connection()->query('SELECT 1');
        } catch (\Throwable) {
            $database = 'unreachable';
        }

        return Response::success([
            'app'      => Config::get('APP_NAME', 'API'),
            'env'      => Config::get('APP_ENV', 'local'),
            'php'      => PHP_VERSION,
            'database' => $database,
        ], 'Service healthy');
    }
}
