<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Controllers\Controller;
use App\Core\Logger;
use App\Core\Request;
use App\Core\Response;
use App\Exceptions\HttpException;
use App\Exceptions\ValidationException;
use App\Repositories\AiProviderRepository;
use App\Services\AI\AIProviderManager;

/**
 * Admin → AI Providers: keys, enable/disable, priority, live tests.
 * Raw keys are write-only — responses always mask them.
 */
final class AdminAiProviderController extends Controller
{
    private AiProviderRepository $providers;

    private AIProviderManager $manager;

    public function __construct()
    {
        $this->providers = new AiProviderRepository();
        $this->manager = new AIProviderManager();
    }

    /** GET /api/v1/admin/ai-providers */
    public function index(Request $request): Response
    {
        return Response::success([
            'providers' => array_map([$this, 'shape'], $this->providers->all()),
        ]);
    }

    /** PUT /api/v1/admin/ai-providers/{id}  { api_key?, enabled?, priority?, model?, timeout_sec? } */
    public function update(Request $request): Response
    {
        $row = $this->requireProvider($request);
        $input = $request->all();

        $fields = [];

        // Key semantics: absent = keep, non-empty = replace, "" = clear.
        if (array_key_exists('api_key', $input)) {
            $key = trim((string) $input['api_key']);
            if ($key !== '' && mb_strlen($key) < 10) {
                throw new ValidationException(['api_key' => ['That API key looks too short.']]);
            }
            $fields['api_key'] = $key === '' ? null : $key;
            Logger::channel('app')->info('AI provider key ' . ($key === '' ? 'cleared' : 'saved'), [
                'provider'   => (string) $row['slug'],
                'key_length' => mb_strlen($key),
            ]);
        }

        if (array_key_exists('enabled', $input)) {
            $fields['enabled'] = (bool) $input['enabled'];
        }

        if (array_key_exists('timeout_sec', $input)) {
            $timeout = (int) $input['timeout_sec'];
            if ($timeout < 10 || $timeout > 300) {
                throw new ValidationException(['timeout_sec' => ['Timeout must be between 10 and 300 seconds.']]);
            }
            $fields['timeout_sec'] = $timeout;
        }

        if (array_key_exists('model', $input)) {
            $model = trim((string) $input['model']);
            if ($model === '' || mb_strlen($model) > 80) {
                throw new ValidationException(['model' => ['Model is required (max 80 characters).']]);
            }
            $fields['model'] = $model;
        }

        $this->providers->updateConfig((int) $row['id'], $fields);

        // Priority: only value 1 is actionable — the swap makes every other
        // provider Priority 2 atomically, so duplicates are impossible.
        if (array_key_exists('priority', $input)) {
            $priority = (int) $input['priority'];
            if (!in_array($priority, [1, 2, 3], true)) {
                throw new ValidationException(['priority' => ['Priority must be 1, 2, or 3.']]);
            }
            if ($priority === 1) {
                $this->providers->setPrimary((int) $row['id']);
            } elseif ((int) $row['priority'] === 1) {
                throw new ValidationException([
                    'priority' => ['Make the other provider Priority 1 instead — one provider must always be primary.'],
                ]);
            }
        }

        Logger::channel('app')->info('Provider config updated', [
            'admin_id' => (int) $this->user($request)['id'],
            'provider' => $row['slug'],
            'fields'   => array_keys($fields),
        ]);

        return Response::success([
            'providers' => array_map([$this, 'shape'], $this->providers->all()),
        ], 'Provider saved.');
    }

    /** POST /api/v1/admin/ai-providers/{id}/test — a REAL connectivity check. */
    public function test(Request $request): Response
    {
        $row = $this->requireProvider($request);

        $result = $this->manager->testProvider($row);
        $this->providers->recordStatus((int) $row['id'], $result['ok'], $result['ok'] ? null : $result['message'], tested: true);

        $fresh = $this->providers->findById((int) $row['id']) ?? $row;

        return Response::success([
            'ok'       => $result['ok'],
            'message'  => $result['message'],
            'provider' => $this->shape($fresh),
        ], $result['ok'] ? 'Connected.' : 'Connection failed.');
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
        $key = (string) ($row['api_key'] ?? '');

        return [
            'id'             => (int) $row['id'],
            'slug'           => $row['slug'],
            'name'           => $row['name'],
            'enabled'        => (bool) $row['enabled'],
            'priority'       => (int) $row['priority'],
            'status'         => $row['status'],
            'has_key'        => $key !== '',
            'masked_key'     => $key === '' ? null : substr($key, 0, 4) . str_repeat('•', 10) . substr($key, -3),
            'model'          => $row['model'],
            'timeout_sec'    => (int) $row['timeout_sec'],
            'last_error'     => $row['last_error'],
            'last_tested_at' => $row['last_tested_at'],
        ];
    }
}
