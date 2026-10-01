<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Controllers\Controller;
use App\Core\Logger;
use App\Core\Request;
use App\Core\Response;
use App\Exceptions\HttpException;
use App\Exceptions\ValidationException;
use App\Repositories\PlatformSettingRepository;
use App\Repositories\StorageProviderRepository;
use App\Services\Storage\CredentialCrypto;
use App\Services\Storage\StorageManager;

/**
 * Admin → Storage Provider. Credentials are encrypted at rest and are
 * write-only through this API — responses only say which fields are set.
 */
final class AdminStorageController extends Controller
{
    /** Credential fields per provider (whitelist). */
    private const FIELDS = [
        'local' => [],
        's3'    => ['access_key', 'secret_key', 'bucket', 'region'],
        'gcs'   => ['bucket', 'service_account_json'],
    ];

    private StorageProviderRepository $providers;

    public function __construct()
    {
        $this->providers = new StorageProviderRepository();
    }

    /** GET /api/v1/admin/storage-providers */
    public function index(Request $request): Response
    {
        return Response::success([
            'providers' => array_map([$this, 'shape'], $this->providers->all()),
            'rules'     => $this->rules(),
        ]);
    }

    /** PUT /api/v1/admin/storage-providers/{id}  { credentials?: {...}, enable?: bool } */
    public function update(Request $request): Response
    {
        $row = $this->requireProvider($request);
        $slug = (string) $row['slug'];

        $incoming = (array) $request->input('credentials', []);
        if ($incoming !== []) {
            $allowed = self::FIELDS[$slug] ?? [];
            $current = CredentialCrypto::decrypt($row['credentials'] ?? null);
            foreach ($allowed as $field) {
                if (!array_key_exists($field, $incoming)) {
                    continue;
                }
                $value = trim((string) $incoming[$field]);
                if ($value === '') {
                    continue; // empty input = keep the stored secret
                }
                if ($field === 'service_account_json' && json_decode($value, true) === null) {
                    throw new ValidationException(['service_account_json' => ['That is not valid JSON.']]);
                }
                $current[$field] = $value;
            }
            $this->providers->saveCredentials((int) $row['id'], CredentialCrypto::encrypt($current));
        }

        if ((bool) $request->input('enable', false) && !(bool) $row['enabled']) {
            // One active provider — switching affects only future uploads.
            $this->providers->activate((int) $row['id']);
            Logger::channel('app')->warning('Storage provider switched', [
                'admin_id' => (int) $this->user($request)['id'],
                'provider' => $slug,
            ]);
        }

        return Response::success([
            'providers' => array_map([$this, 'shape'], $this->providers->all()),
        ], 'Storage settings saved.');
    }

    /** POST /api/v1/admin/storage-providers/{id}/test — a REAL connection. */
    public function test(Request $request): Response
    {
        $row = $this->requireProvider($request);

        $result = (new StorageManager())->testProvider($row);
        $this->providers->recordStatus((int) $row['id'], $result['ok'], $result['ok'] ? null : $result['message']);

        $fresh = $this->providers->findById((int) $row['id']) ?? $row;

        return Response::success([
            'ok'       => $result['ok'],
            'message'  => $result['message'],
            'provider' => $this->shape($fresh),
        ], $result['ok'] ? 'Connected.' : 'Connection failed.');
    }

    /** PUT /api/v1/admin/storage-settings — the four global upload rules. */
    public function updateRules(Request $request): Response
    {
        $errors = [];

        $maxUpload = (int) $request->input('max_upload_size_mb', 50);
        if ($maxUpload < 1 || $maxUpload > 500) {
            $errors['max_upload_size_mb'][] = 'Upload size must be between 1 and 500 MB.';
        }

        $types = array_values(array_filter(array_map(
            static fn ($t): string => strtoupper(trim((string) $t)),
            (array) $request->input('allowed_file_types', []),
        )));
        $valid = ['JPG', 'PNG', 'WEBP', 'SVG', 'PDF', 'MP4', 'MP3'];
        $types = array_values(array_intersect($types, $valid));
        if ($types === []) {
            $errors['allowed_file_types'][] = 'Pick at least one allowed file type.';
        }

        $maxStorage = (int) $request->input('max_storage_per_user_gb', 0);
        if ($maxStorage < 0 || $maxStorage > 10000) {
            $errors['max_storage_per_user_gb'][] = 'Per-user storage must be 0 (plan limit) to 10,000 GB.';
        }

        $maxFiles = (int) $request->input('max_files_per_user', 0);
        if ($maxFiles < 0 || $maxFiles > 1000000) {
            $errors['max_files_per_user'][] = 'Per-user files must be 0 (unlimited) to 1,000,000.';
        }

        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        (new PlatformSettingRepository())->setMany([
            'max_upload_size_mb'      => (string) $maxUpload,
            'allowed_file_types'      => implode(',', $types),
            'max_storage_per_user_gb' => (string) $maxStorage,
            'max_files_per_user'      => (string) $maxFiles,
        ]);

        return Response::success($this->rules(), 'Upload rules saved.');
    }

    /** @return array<string, mixed> */
    private function requireProvider(Request $request): array
    {
        $id = (int) $request->param('id');
        $row = $id > 0 ? $this->providers->findById($id) : null;
        if ($row === null) {
            throw new HttpException(404, 'Provider not found.');
        }

        return $row;
    }

    /** @param array<string, mixed> $row */
    private function shape(array $row): array
    {
        $credentials = CredentialCrypto::decrypt($row['credentials'] ?? null);
        $fields = [];
        foreach (self::FIELDS[(string) $row['slug']] ?? [] as $field) {
            $fields[$field] = isset($credentials[$field]) && $credentials[$field] !== '';
        }

        return [
            'id'             => (int) $row['id'],
            'slug'           => $row['slug'],
            'name'           => $row['name'],
            'enabled'        => (bool) $row['enabled'],
            'status'         => $row['status'],
            'last_error'     => $row['last_error'],
            'last_tested_at' => $row['last_tested_at'],
            'fields_set'     => $fields, // presence only — never the secrets
        ];
    }

    /** @return array<string, mixed> */
    private function rules(): array
    {
        $settings = new PlatformSettingRepository();

        return [
            'max_upload_size_mb'      => $settings->getInt('max_upload_size_mb', 50),
            'allowed_file_types'      => array_filter(explode(',', strtoupper(
                (string) ($settings->all()['allowed_file_types'] ?? 'JPG,PNG,WEBP'),
            ))),
            'max_storage_per_user_gb' => $settings->getInt('max_storage_per_user_gb', 0),
            'max_files_per_user'      => $settings->getInt('max_files_per_user', 0),
        ];
    }
}
