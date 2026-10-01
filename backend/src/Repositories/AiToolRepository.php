<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database;
use PDO;

final class AiToolRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /** @return list<array<string, mixed>> All tools in display order. */
    public function all(): array
    {
        return array_map(
            [$this, 'decode'],
            $this->db->query('SELECT * FROM ai_tools ORDER BY sort_order ASC, id ASC')->fetchAll(),
        );
    }

    /** @return array<string, mixed>|null */
    public function findById(int $toolId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM ai_tools WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $toolId]);
        $row = $stmt->fetch();

        return $row === false ? null : $this->decode($row);
    }

    /**
     * Update whitelisted settings columns (pre-validated by the service).
     *
     * @param array<string, mixed> $fields
     */
    public function updateSettings(int $toolId, array $fields): void
    {
        $allowed = [
            'credits_per_generation', 'prompt_limit', 'upload_support',
            'max_upload_mb', 'allowed_types', 'model', 'timeout_sec',
        ];

        $sets = [];
        $params = ['id' => $toolId];
        foreach ($fields as $column => $value) {
            if (!in_array($column, $allowed, true)) {
                continue;
            }
            $sets[] = $column . ' = :' . $column;
            $params[$column] = match (true) {
                is_bool($value)  => (int) $value,
                is_array($value) => json_encode(array_values($value), JSON_UNESCAPED_SLASHES),
                default          => $value,
            };
        }

        if ($sets === []) {
            return;
        }

        $stmt = $this->db->prepare(
            'UPDATE ai_tools SET ' . implode(', ', $sets) . ', updated_at = NOW() WHERE id = :id',
        );
        $stmt->execute($params);
    }

    public function setEnabled(int $toolId, bool $enabled): void
    {
        $stmt = $this->db->prepare(
            'UPDATE ai_tools SET status = :status, updated_at = NOW() WHERE id = :id',
        );
        $stmt->execute(['status' => $enabled ? 'live' : 'disabled', 'id' => $toolId]);
    }

    /** @param array<string, mixed> $row */
    private function decode(array $row): array
    {
        $row['allowed_types'] = json_decode((string) ($row['allowed_types'] ?? '[]'), true) ?? [];

        return $row;
    }

    public function findSlugById(int $toolId): ?string
    {
        $stmt = $this->db->prepare('SELECT slug FROM ai_tools WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $toolId]);
        $slug = $stmt->fetchColumn();

        return $slug === false ? null : (string) $slug;
    }

    /** @return array<string, mixed>|null */
    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM ai_tools WHERE slug = :slug LIMIT 1');
        $stmt->execute(['slug' => $slug]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }
}
