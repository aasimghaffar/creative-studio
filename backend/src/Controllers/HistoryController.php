<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Exceptions\HttpException;
use App\Repositories\AiToolRepository;
use App\Repositories\GenerationRepository;
use App\Services\AiGenerationService;

/**
 * Global History — every generation across every tool. Detail, delete,
 * favorite, and regenerate all reuse the shared AiGenerationService, so
 * future tools appear here with zero extra code.
 */
final class HistoryController extends Controller
{
    private const RANGES = [
        '24h' => '-24 hours',
        '7d'  => '-7 days',
        '30d' => '-30 days',
    ];

    private GenerationRepository $generations;

    private AiGenerationService $engine;

    public function __construct()
    {
        $this->generations = new GenerationRepository();
        $this->engine = new AiGenerationService();
    }

    /** GET /api/v1/history?tool=&range=&sort=&page=&per_page= */
    public function index(Request $request): Response
    {
        $userId = (int) $this->user($request)['id'];

        $tool = $request->queryParam('tool');
        $toolSlug = $tool !== '' ? preg_replace('/[^a-z0-9\-]/', '', strtolower($tool)) : null;
        $toolSlug = $toolSlug !== '' ? $toolSlug : null;

        $range = $request->queryParam('range');
        $since = isset(self::RANGES[$range]) ? date('Y-m-d H:i:s', strtotime(self::RANGES[$range])) : null;

        $sort = $request->queryParam('sort') === 'oldest' ? 'oldest' : 'newest';
        $page = max(1, (int) $request->queryParam('page', '1'));
        $perPage = min(100, max(1, (int) $request->queryParam('per_page', '60')));

        $result = $this->generations->listHistoryAll($userId, $toolSlug, $since, $sort, $page, $perPage);

        $storage = new \App\Services\ImageStorageService();
        $rows = array_map(static function (array $row) use ($storage): array {
            $favIds = array_filter(array_map('intval', explode(',', (string) ($row['fav_file_ids'] ?? ''))));
            $images = [];
            $concat = (string) ($row['files_concat'] ?? '');
            if ($concat !== '') {
                foreach (explode('||', $concat) as $pair) {
                    [$fileId, $path] = array_pad(explode('|', $pair, 2), 2, '');
                    if ($path !== '') {
                        $images[] = [
                            'file_id'  => (int) $fileId,
                            'url'      => $storage->toUrl($path),
                            'favorite' => in_array((int) $fileId, $favIds, true),
                        ];
                    }
                }
            }
            unset($row['files_concat'], $row['fav_file_ids']);
            $row['images'] = $images;

            return $row;
        }, $result['rows']);

        return Response::success([
            'history'    => $rows,
            'pagination' => [
                'page'     => $page,
                'per_page' => $perPage,
                'total'    => $result['total'],
                'has_more' => $page * $perPage < $result['total'],
            ],
        ]);
    }

    /** GET /api/v1/history/{id} — full generation details + image files. */
    public function show(Request $request): Response
    {
        return Response::success(
            $this->engine->detail((int) $this->user($request)['id'], $this->id($request)),
        );
    }

    /** DELETE /api/v1/history/{id} */
    public function destroy(Request $request): Response
    {
        $this->engine->delete((int) $this->user($request)['id'], $this->id($request));

        return Response::success(null, 'Generation deleted.');
    }

    /** POST /api/v1/history/{id}/favorite  { favorite } */
    public function favorite(Request $request): Response
    {
        $favorite = (bool) $request->input('favorite', true);
        $fileId = (int) $request->input('file_id', 0);
        $this->engine->setFavorite((int) $this->user($request)['id'], $this->id($request), $favorite, $fileId > 0 ? $fileId : null);

        return Response::success(
            ['id' => $this->id($request), 'favorite' => $favorite],
            $favorite ? 'Added to favorites.' : 'Removed from favorites.',
        );
    }

    /** POST /api/v1/history/{id}/regenerate — re-runs with the entry's own tool. */
    public function regenerate(Request $request): Response
    {
        $userId = (int) $this->user($request)['id'];
        $historyId = $this->id($request);

        $row = $this->generations->findHistoryForUser($historyId, $userId);
        if ($row === null) {
            throw new HttpException(404, 'Generation not found.');
        }

        // Resolve the entry's own tool so ANY tool's history can regenerate here.
        $toolSlug = (new AiToolRepository())->findSlugById((int) $row['tool_id']);
        if ($toolSlug === null) {
            throw new HttpException(404, 'Unknown tool.');
        }

        $result = $this->engine->regenerate($userId, $toolSlug, $historyId);

        return Response::created($result, 'Regenerated.');
    }

    private function id(Request $request): int
    {
        $id = (int) $request->param('id');
        if ($id <= 0) {
            throw new HttpException(422, 'Invalid id.');
        }

        return $id;
    }
}
