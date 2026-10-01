<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Validator;
use App\Exceptions\HttpException;
use App\Repositories\FileRepository;
use App\Services\ImageStorageService;
use App\Services\SettingsService;

/** My Files — the same rows the AI tools write; no second storage system. */
final class FileController extends Controller
{
    private const TYPES = ['image', 'video', 'audio', 'document'];

    private FileRepository $files;

    private ImageStorageService $storage;

    public function __construct()
    {
        $this->files = new FileRepository();
        $this->storage = new ImageStorageService();
    }

    /** GET /api/v1/files?type=&search= — list + live storage usage in one call. */
    public function index(Request $request): Response
    {
        $userId = (int) $this->user($request)['id'];

        $type = $request->queryParam('type');
        $type = in_array($type, self::TYPES, true) ? $type : null;
        $search = trim($request->queryParam('search'));

        $rows = $this->files->listForUser($userId, $type, $search !== '' ? $search : null);

        return Response::success([
            'files'   => array_map(fn (array $row): array => $this->shape($row), $rows),
            'storage' => (new SettingsService())->storageOverview($userId),
        ]);
    }

    /** GET /api/v1/files/{id} */
    public function show(Request $request): Response
    {
        $row = $this->requireOwned($request);

        return Response::success($this->shape($row));
    }

    /** PATCH /api/v1/files/{id}  { name } */
    public function rename(Request $request): Response
    {
        $row = $this->requireOwned($request);

        $data = Validator::validate($request->all(), [
            'name' => 'required|string|min:1|max:180',
        ]);

        // File names live on disk paths too — keep DB names filesystem-safe.
        $name = preg_replace('/[^\w\- ]/u', '', $data['name']) ?: (string) $row['name'];
        $this->files->rename((int) $row['id'], trim($name));

        return Response::success(['id' => (int) $row['id'], 'name' => trim($name)], 'File renamed.');
    }

    /** DELETE /api/v1/files/{id} — row + physical file, one transaction. */
    public function destroy(Request $request): Response
    {
        $row = $this->requireOwned($request);

        $db = \App\Core\Database::connection();
        $db->beginTransaction();
        try {
            $this->files->hardDelete((int) $row['id']);
            $this->storage->delete((string) $row['storage_path']);
            $db->commit();
        } catch (\Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }

        return Response::success(null, 'File deleted.');
    }

    /** POST /api/v1/files/{id}/download — counts the download, returns the URL. */
    public function download(Request $request): Response
    {
        $row = $this->requireOwned($request);
        $this->files->incrementDownloads((int) $row['id']);

        return Response::success([
            'url'      => $this->storage->toUrl((string) $row['storage_path']),
            'filename' => $row['name'] . '.' . $row['ext'],
        ]);
    }

    /** @return array<string, mixed> */
    private function requireOwned(Request $request): array
    {
        $id = (int) $request->param('id');
        if ($id <= 0) {
            throw new HttpException(422, 'Invalid file id.');
        }

        $row = $this->files->findForUser($id, (int) $this->user($request)['id']);
        if ($row === null) {
            throw new HttpException(404, 'File not found.');
        }

        return $row;
    }

    /** @param array<string, mixed> $row */
    private function shape(array $row): array
    {
        return [
            'id'             => (int) $row['id'],
            'generation_id'  => $row['generation_id'] !== null ? (int) $row['generation_id'] : null,
            'name'           => $row['name'],
            'ext'            => $row['ext'],
            'mime_type'      => $row['mime_type'],
            'type'           => $row['type'],
            'size_bytes'     => (int) $row['size_bytes'],
            'url'            => $this->storage->toUrl((string) $row['storage_path']),
            'download_count' => (int) ($row['download_count'] ?? 0),
            'created_at'     => $row['created_at'],
        ];
    }

    /**
     * GET /api/v1/files/download?src={file url or storage path}
     *
     * Streams a stored file THROUGH the API so downloads work from the
     * browser: direct fetch() of /storage/* fails CORS (static files
     * carry no CORS headers — <img> rendering works, fetch+blob does
     * not). Ownership is enforced via the files table.
     */
    public function downloadBySrc(Request $request): Response
    {
        $src = trim($request->queryParam('src'));
        if ($src === '') {
            throw new HttpException(422, 'Missing file reference.');
        }

        // Absolute URL -> public-relative storage path.
        $path = parse_url($src, PHP_URL_PATH) ?: $src;
        $path = ltrim($path, '/');

        // If served from a subdirectory (e.g. XAMPP), isolate the part of
        // the path starting with 'storage/'.
        $pos = strpos($path, 'storage/');
        if ($pos !== false) {
            $path = substr($path, $pos);
        }

        if (!str_starts_with($path, 'storage/') || str_contains($path, '..')) {
            throw new HttpException(422, 'Invalid file reference.');
        }

        $user = $this->user($request);
        $db = \App\Core\Database::connection();
        $stmt = $db->prepare(
            'SELECT f.name, f.ext, f.mime_type, f.storage_path, g.user_id
             FROM files f
             LEFT JOIN ai_generations g ON g.id = f.generation_id
             WHERE f.storage_path = :path AND f.deleted_at IS NULL
             LIMIT 1',
        );
        $stmt->execute(['path' => $path]);
        $file = $stmt->fetch();
        if ($file === false) {
            throw new HttpException(404, 'File not found.');
        }
        if ((int) $file['user_id'] !== (int) $user['id'] && ($user['role'] ?? '') !== 'admin') {
            throw new HttpException(403, 'This file belongs to another account.');
        }

        if (str_starts_with($path, 'storage/')) {
            $full = dirname(__DIR__, 2) . '/public/' . $path;
            $bytes = is_file($full) ? file_get_contents($full) : false;
            if ($bytes === false) {
                throw new HttpException(404, 'The file is missing from storage.');
            }
            $filename = ($file['name'] ?: 'download') . '.' . ($file['ext'] ?: 'png');

            return Response::download($bytes, (string) ($file['mime_type'] ?: 'application/octet-stream'), $filename);
        }

        throw new HttpException(409, 'Remote-storage downloads use the direct provider URL.');
    }
}
