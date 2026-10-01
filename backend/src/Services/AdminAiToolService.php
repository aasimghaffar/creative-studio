<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Logger;
use App\Exceptions\HttpException;
use App\Exceptions\ValidationException;
use App\Repositories\AiToolRepository;

/**
 * Admin → AI Tools: per-tool configuration management. Pure config phase —
 * no token-cost calculations or provider usage checks here by design.
 */
final class AdminAiToolService
{
    // NOTE: model/provider is NOT configurable per tool — the AI Providers
    // module owns provider selection globally via priority + fallback.
    private const ALLOWED_FILE_TYPES = ['JPG', 'PNG', 'WEBP', 'PDF'];
    private const ALLOWED_UPLOAD_MB = [10, 20, 50];

    public function __construct(
        private readonly AiToolRepository $tools = new AiToolRepository(),
    ) {
    }

    /** @return list<array<string, mixed>> */
    public function list(): array
    {
        return array_map([$this, 'shape'], $this->tools->all());
    }

    /** @return array<string, mixed> */
    public function get(int $toolId): array
    {
        $tool = $this->tools->findById($toolId);
        if ($tool === null) {
            throw new HttpException(404, 'Tool not found.');
        }

        return $this->shape($tool);
    }

    /**
     * @param array<string, mixed> $input
     *
     * @return array<string, mixed> Fresh tool after saving.
     */
    public function update(int $adminId, int $toolId, array $input): array
    {
        $current = $this->tools->findById($toolId);
        if ($current === null) {
            throw new HttpException(404, 'Tool not found.');
        }

        $errors = [];
        $fields = [];

        if (array_key_exists('credits_per_generation', $input)) {
            $credits = (int) $input['credits_per_generation'];
            if ($credits < 0 || $credits > 100) {
                $errors['credits_per_generation'][] = 'Credits must be between 0 and 100.';
            }
            $fields['credits_per_generation'] = $credits;
        }

        if (array_key_exists('prompt_limit', $input)) {
            $limit = (int) $input['prompt_limit'];
            if ($limit < 100 || $limit > 5000) {
                $errors['prompt_limit'][] = 'Prompt limit must be between 100 and 5000 characters.';
            }
            $fields['prompt_limit'] = $limit;
        }

        if (array_key_exists('timeout_sec', $input)) {
            $timeout = (int) $input['timeout_sec'];
            if ($timeout < 10 || $timeout > 300) {
                $errors['timeout_sec'][] = 'Timeout must be between 10 and 300 seconds.';
            }
            $fields['timeout_sec'] = $timeout;
        }

        if (array_key_exists('upload_support', $input)) {
            $fields['upload_support'] = (bool) $input['upload_support'];
        }

        if (array_key_exists('max_upload_mb', $input)) {
            $mb = (int) $input['max_upload_mb'];
            if (!in_array($mb, self::ALLOWED_UPLOAD_MB, true)) {
                $errors['max_upload_mb'][] = 'Upload size must be 10, 20, or 50 MB.';
            }
            $fields['max_upload_mb'] = $mb;
        }

        if (array_key_exists('allowed_types', $input)) {
            $types = array_values(array_intersect(
                array_map('strtoupper', (array) $input['allowed_types']),
                self::ALLOWED_FILE_TYPES,
            ));
            if (($fields['upload_support'] ?? (bool) $current['upload_support']) && $types === []) {
                $errors['allowed_types'][] = 'Pick at least one allowed file type.';
            }
            $fields['allowed_types'] = $types;
        }

        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        $this->tools->updateSettings($toolId, $fields);

        if (array_key_exists('enabled', $input)) {
            $this->tools->setEnabled($toolId, (bool) $input['enabled']);
        }

        Logger::channel('app')->info('Tool settings updated', [
            'admin_id' => $adminId,
            'tool_id'  => $toolId,
            'fields'   => array_keys($fields),
        ]);

        return $this->get($toolId);
    }

    /** @return array<string, mixed> Fresh tool after toggling. */
    public function toggle(int $adminId, int $toolId, bool $enabled): array
    {
        $tool = $this->tools->findById($toolId);
        if ($tool === null) {
            throw new HttpException(404, 'Tool not found.');
        }

        $this->tools->setEnabled($toolId, $enabled);

        Logger::channel('app')->info($enabled ? 'Tool enabled' : 'Tool disabled', [
            'admin_id' => $adminId,
            'tool_id'  => $toolId,
            'slug'     => $tool['slug'],
        ]);

        return $this->get($toolId);
    }

    /** @param array<string, mixed> $tool */
    private function shape(array $tool): array
    {
        return [
            'id'                     => (int) $tool['id'],
            'slug'                   => $tool['slug'],
            'name'                   => $tool['name'],
            'category'               => $tool['category'],
            'enabled'                => $tool['status'] === 'live',
            'status'                 => $tool['status'],
            'credits_per_generation' => (int) $tool['credits_per_generation'],
            'prompt_limit'           => (int) $tool['prompt_limit'],
            'upload_support'         => (bool) $tool['upload_support'],
            'max_upload_mb'          => (int) $tool['max_upload_mb'],
            'allowed_types'          => $tool['allowed_types'],
            'model'                  => $tool['model'],
            'timeout_sec'            => (int) $tool['timeout_sec'],
        ];
    }
}
