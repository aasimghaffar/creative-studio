<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Repositories\PlatformSettingRepository;

/**
 * PUBLIC platform config — the single source the frontend reads for
 * branding (navbar, footer, dashboard, page titles) and maintenance state.
 */
final class PlatformController extends Controller
{
    /** GET /api/v1/platform */
    public function index(Request $request): Response
    {
        $all = (new PlatformSettingRepository())->all();

        return Response::success([
            'site_name'        => (string) ($all['site_name'] ?? 'AI Creative Studio'),
            'contact_email'    => (string) ($all['contact_email'] ?? ''),
            'currency'         => (string) ($all['currency'] ?? 'USD'),
            'maintenance_mode' => ($all['maintenance_mode'] ?? '0') === '1',
        ]);
    }
}
