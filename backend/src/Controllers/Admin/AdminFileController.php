<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Controllers\Controller;
use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Core\Response;
use App\Exceptions\HttpException;
use App\Services\ImageStorageService;

/** Admin → File Manager: the central view over the ONE files table. */
final class AdminFileController extends Controller
{
    private const TYPES = ['image', 'video', 'audio', 'document'];

    /** GET /api/v1/admin/files?search=&tool=&type=&page=&per_page= */
    public function index(Request $request): Response
    {
        $db = Database::connection();
        $storage = new ImageStorageService();

        $where = ['f.deleted_at IS NULL'];
        $params = [];

        $search = trim($request->queryParam('search'));
        if ($search !== '') {
            $where[] = '(f.name LIKE :s_file OR u.name LIKE :s_user OR u.email LIKE :s_email OR t.name LIKE :s_tool)';
            $params['s_file'] = '%' . $search . '%';
            $params['s_user'] = '%' . $search . '%';
            $params['s_email'] = '%' . $search . '%';
            $params['s_tool'] = '%' . $search . '%';
        }
        $tool = strtolower(trim($request->queryParam('tool')));
        if ($tool !== '') {
            $where[] = 't.slug = :tool';
            $params['tool'] = $tool;
        }
        $type = strtolower(trim($request->queryParam('type')));
        if (in_array($type, self::TYPES, true)) {
            $where[] = 'f.type = :type';
            $params['type'] = $type;
        } elseif ($type !== '') {
            $where[] = 'f.ext = :ext';
            $params['ext'] = $type;
        }

        $joins = ' FROM files f
             LEFT JOIN users u ON u.id = f.user_id
             LEFT JOIN ai_generations g ON g.id = f.generation_id
             LEFT JOIN ai_tools t ON t.id = g.tool_id';
        $whereSql = ' WHERE ' . implode(' AND ', $where);

        $count = $db->prepare('SELECT COUNT(*)' . $joins . $whereSql);
        $count->execute($params);
        $total = (int) $count->fetchColumn();

        $page = max(1, (int) $request->queryParam('page', '1'));
        $perPage = min(100, max(1, (int) $request->queryParam('per_page', '50')));
        $offset = ($page - 1) * $perPage;

        $stmt = $db->prepare(
            'SELECT f.id, f.name, f.ext, f.type, f.size_bytes, f.storage_path,
                    f.download_count, f.generation_id, f.created_at, f.updated_at,
                    u.name AS user_name, u.email AS user_email,
                    t.name AS tool_name, t.slug AS tool_slug
             ' . $joins . $whereSql . "
             ORDER BY f.created_at DESC, f.id DESC
             LIMIT {$perPage} OFFSET {$offset}",
        );
        $stmt->execute($params);

        $files = array_map(static fn (array $r): array => [
            'id'             => (int) $r['id'],
            'name'           => $r['name'],
            'ext'            => $r['ext'],
            'type'           => $r['type'],
            'size_bytes'     => (int) $r['size_bytes'],
            'url'            => $storage->toUrl((string) $r['storage_path']),
            'download_count' => (int) $r['download_count'],
            'generation_id'  => $r['generation_id'] !== null ? (int) $r['generation_id'] : null,
            'user'           => $r['user_name'] ?? 'Deleted account',
            'user_email'     => $r['user_email'],
            'tool'           => $r['tool_name'] ?? 'Upload',
            'tool_slug'      => $r['tool_slug'],
            'created_at'     => $r['created_at'],
            'updated_at'     => $r['updated_at'],
        ], $stmt->fetchAll());

        return Response::success([
            'files' => $files,
            'stats' => $this->stats($db),
            'pagination' => [
                'page'     => $page,
                'per_page' => $perPage,
                'total'    => $total,
                'has_more' => $page * $perPage < $total,
            ],
        ]);
    }

    /** DELETE /api/v1/admin/files/{id} — DB row + physical file, one transaction. */
    public function destroy(Request $request): Response
    {
        $id = (int) $request->param('id');
        $db = Database::connection();

        $stmt = $db->prepare('SELECT id, storage_path FROM files WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        if ($row === false) {
            throw new HttpException(404, 'File not found.');
        }

        $db->beginTransaction();
        try {
            $db->prepare('DELETE FROM files WHERE id = :id')->execute(['id' => $id]);
            (new ImageStorageService())->delete((string) $row['storage_path']);
            $db->commit();
        } catch (\Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }

        Logger::channel('app')->warning('Admin deleted file', [
            'admin_id' => (int) $this->user($request)['id'],
            'file_id'  => $id,
        ]);

        return Response::success(null, 'File deleted from storage and database.');
    }

    /** POST /api/v1/admin/files/{id}/download */
    public function download(Request $request): Response
    {
        $id = (int) $request->param('id');
        $db = Database::connection();

        $stmt = $db->prepare('SELECT name, ext, storage_path FROM files WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        if ($row === false) {
            throw new HttpException(404, 'File not found.');
        }

        $db->prepare('UPDATE files SET download_count = download_count + 1 WHERE id = :id')->execute(['id' => $id]);

        return Response::success([
            'url'      => (new ImageStorageService())->toUrl((string) $row['storage_path']),
            'filename' => $row['name'] . '.' . $row['ext'],
        ]);
    }

    /** @return array<string, mixed> Live storage aggregates from the files table. */
    private function stats(\PDO $db): array
    {
        $totalBytes = (int) $db->query(
            'SELECT COALESCE(SUM(size_bytes), 0) FROM files WHERE deleted_at IS NULL',
        )->fetchColumn();

        $byTool = $db->query(
            "SELECT COALESCE(t.name, 'Upload') AS label, COALESCE(SUM(f.size_bytes), 0) AS bytes
             FROM files f
             LEFT JOIN ai_generations g ON g.id = f.generation_id
             LEFT JOIN ai_tools t ON t.id = g.tool_id
             WHERE f.deleted_at IS NULL
             GROUP BY t.id, t.name
             ORDER BY bytes DESC
             LIMIT 6",
        )->fetchAll();

        $byUser = $db->query(
            "SELECT COALESCE(u.name, 'Deleted account') AS label, COALESCE(SUM(f.size_bytes), 0) AS bytes
             FROM files f
             LEFT JOIN users u ON u.id = f.user_id
             WHERE f.deleted_at IS NULL
             GROUP BY u.id, u.name
             ORDER BY bytes DESC
             LIMIT 5",
        )->fetchAll();

        $shape = static fn (array $rows): array => array_map(static fn (array $r): array => [
            'label' => (string) $r['label'],
            'bytes' => (int) $r['bytes'],
        ], $rows);

        return [
            'total_bytes' => $totalBytes,
            'by_tool'     => $shape($byTool),
            'by_user'     => $shape($byUser),
        ];
    }
}
