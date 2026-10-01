<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Validator;
use App\Exceptions\HttpException;
use App\Services\AiGenerationService;

/**
 * Generic controller for image-generation tools. A concrete tool is a
 * subclass that sets $toolSlug — see AiLogoController. Routes decide paths.
 */
abstract class AiToolController extends Controller
{
    protected string $toolSlug = '';

    private AiGenerationService $service;

    public function __construct()
    {
        $this->service = new AiGenerationService();
    }

    /** POST /api/v1/ai/{tool}/generate */
    public function generate(Request $request): Response
    {
        $data = Validator::validate($request->all(), [
            'prompt'   => 'required|string|min:3|max:2000',
            'style'    => 'string|max:80',
            'color'    => 'string|max:16',
            'ratio'    => 'string|max:10',
            'quality'  => 'string|max:40',
        ]);

        $result = $this->service->generate(
            (int) $this->user($request)['id'],
            $this->toolSlug,
            array_merge($request->all(), $data),
        );

        return Response::created($result, 'Generation complete.');
    }

    /** GET /api/v1/ai/{tool}/config */
    public function config(Request $request): Response
    {
        return Response::success([
            'tool'            => $this->service->config($this->toolSlug),
            'credits_balance' => (int) ($this->user($request)['credits'] ?? 0),
        ]);
    }

    /** GET /api/v1/ai/{tool}/history */
    public function history(Request $request): Response
    {
        return Response::success([
            'history' => $this->service->history((int) $this->user($request)['id'], $this->toolSlug),
        ]);
    }

    /** GET /api/v1/ai/{tool}/{id} */
    public function show(Request $request): Response
    {
        return Response::success(
            $this->service->detail((int) $this->user($request)['id'], $this->id($request)),
        );
    }

    /** DELETE /api/v1/ai/{tool}/{id} */
    public function destroy(Request $request): Response
    {
        $this->service->delete((int) $this->user($request)['id'], $this->id($request));

        return Response::success(null, 'Generation deleted.');
    }

    /** POST /api/v1/ai/{tool}/favorite  { id, favorite } */
    public function favorite(Request $request): Response
    {
        $id = (int) $request->input('id', 0);
        if ($id <= 0) {
            throw new HttpException(422, 'A generation id is required.');
        }

        $favorite = (bool) $request->input('favorite', true);
        $fileId = (int) $request->input('file_id', 0);
        $this->service->setFavorite((int) $this->user($request)['id'], $id, $favorite, $fileId > 0 ? $fileId : null);

        return Response::success(['id' => $id, 'favorite' => $favorite], $favorite ? 'Added to favorites.' : 'Removed from favorites.');
    }

    /** POST /api/v1/ai/{tool}/regenerate  { id } */
    public function regenerate(Request $request): Response
    {
        $id = (int) $request->input('id', 0);
        if ($id <= 0) {
            throw new HttpException(422, 'A generation id is required.');
        }

        $result = $this->service->regenerate(
            (int) $this->user($request)['id'],
            $this->toolSlug,
            $id,
        );

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
