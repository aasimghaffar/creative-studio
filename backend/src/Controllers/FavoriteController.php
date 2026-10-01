<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Exceptions\HttpException;
use App\Repositories\FavoriteRepository;
use App\Repositories\GenerationRepository;

/** Favorites — images (saved generations) and prompts, own-data only. */
final class FavoriteController extends Controller
{
    private FavoriteRepository $favorites;

    public function __construct()
    {
        $this->favorites = new FavoriteRepository();
    }

    /** GET /api/v1/favorites?type=images|prompts (default both) */
    public function index(Request $request): Response
    {
        $userId = (int) $this->user($request)['id'];
        $type = $request->queryParam('type');

        $data = [];
        if ($type === '' || $type === 'images') {
            $data['images'] = $this->favorites->listImages($userId);
        }
        if ($type === '' || $type === 'prompts') {
            $data['prompts'] = $this->favorites->listPrompts($userId);
        }

        return Response::success($data);
    }

    /**
     * DELETE /api/v1/favorites/{id} — removes the favorite and, for image
     * favorites, clears the history entry's flag so every page agrees.
     */
    public function destroy(Request $request): Response
    {
        $id = (int) $request->param('id');
        if ($id <= 0) {
            throw new HttpException(422, 'Invalid favorite id.');
        }

        $userId = (int) $this->user($request)['id'];
        $row = $this->favorites->findForUser($id, $userId);
        if ($row === null) {
            throw new HttpException(404, 'Favorite not found.');
        }

        $this->favorites->deleteById($id);

        if ($row['type'] === 'image' && $row['generation_id'] !== null) {
            $generations = new GenerationRepository();
            $history = $generations->findHistoryByGenerationId((int) $row['generation_id'], $userId);
            if ($history !== null) {
                $generations->setFavorite((int) $history['id'], false);
            }
        }

        return Response::success(null, 'Removed from favorites.');
    }
}
