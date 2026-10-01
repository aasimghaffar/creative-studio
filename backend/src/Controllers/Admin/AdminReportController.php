<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Controllers\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Repositories\AdminReportRepository;

/**
 * Admin → Reports: AI Usage and Credits Usage. STRICTLY read-only —
 * there are no write endpoints; every figure is computed live from
 * real platform activity.
 */
final class AdminReportController extends Controller
{
    private AdminReportRepository $reports;

    public function __construct()
    {
        $this->reports = new AdminReportRepository();
    }

    /** GET /api/v1/admin/reports/ai-usage */
    public function aiUsage(Request $request): Response
    {
        return Response::success([
            'totals' => [
                'today'    => $this->reports->generationsSince(date('Y-m-d 00:00:00')),
                'week'     => $this->reports->generationsSince(date('Y-m-d 00:00:00', strtotime('-6 days'))),
                'lifetime' => $this->reports->generationsSince(null),
            ],
            'by_tool' => $this->reports->generationsByTool(),
        ]);
    }

    /** GET /api/v1/admin/reports/credit-usage */
    public function creditUsage(Request $request): Response
    {
        return Response::success([
            'totals' => [
                'today'    => $this->reports->creditsConsumedSince(date('Y-m-d 00:00:00')),
                'week'     => $this->reports->creditsConsumedSince(date('Y-m-d 00:00:00', strtotime('-6 days'))),
                'month'    => $this->reports->creditsConsumedSince(date('Y-m-d 00:00:00', strtotime('-29 days'))),
                'lifetime' => $this->reports->creditsConsumedSince(null),
            ],
            'by_tool'       => $this->reports->creditsByTool(),
            'weekly_series' => $this->reports->weeklyConsumption(),
        ]);
    }
}
