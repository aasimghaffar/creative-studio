<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Repositories\AiToolRepository;

/**
 * The user dashboard's tool catalog — every tool with its availability,
 * straight from ai_tools. Live tools are usable; everything else shows
 * as coming soon. No providers, no models — users never see those.
 */
final class AiCatalogController extends Controller
{
    /** GET /api/v1/ai/tools */
    public function index(Request $request): Response
    {
        $tools = array_map(static fn (array $tool): array => [
            'slug'                   => $tool['slug'],
            'name'                   => $tool['name'],
            'category'               => $tool['category'],
            'status'                 => $tool['status'] === 'live' ? 'live' : 'coming_soon',
            'credits_per_generation' => (int) $tool['credits_per_generation'],
            'prompt_limit'           => (int) $tool['prompt_limit'],
            'upload_support'         => (bool) $tool['upload_support'],
        ], (new AiToolRepository())->all());

        return Response::success(['tools' => $tools]);
    }
}
