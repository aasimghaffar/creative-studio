<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database;
use PDO;

/** The provider configuration system — everything the manager reads. */
final class AiProviderRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /** @return list<array<string, mixed>> All providers, primary first. */
    public function all(): array
    {
        return $this->db
            ->query('SELECT * FROM ai_providers ORDER BY priority ASC, id ASC')
            ->fetchAll();
    }

    /** @return array<string, mixed>|null */
    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM ai_providers WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    /** @return list<array<string, mixed>> Enabled providers in fallback order. */
    public function enabledByPriority(): array
    {
        return $this->db
            ->query('SELECT * FROM ai_providers WHERE enabled = 1 ORDER BY priority ASC, id ASC')
            ->fetchAll();
    }

    /**
     * @param array<string, mixed> $fields Whitelisted config columns.
     */
    public function updateConfig(int $id, array $fields): void
    {
        $allowed = ['api_key', 'enabled', 'model', 'timeout_sec'];

        $sets = [];
        $params = ['id' => $id];
        foreach ($fields as $column => $value) {
            if (!in_array($column, $allowed, true)) {
                continue;
            }
            $sets[] = $column . ' = :' . $column;
            $params[$column] = is_bool($value) ? (int) $value : $value;
        }

        if ($sets === []) {
            return;
        }

        $stmt = $this->db->prepare(
            'UPDATE ai_providers SET ' . implode(', ', $sets) . ', updated_at = NOW() WHERE id = :id',
        );
        $stmt->execute($params);
    }

    /**
     * Make one provider Priority 1; every other provider becomes 2.
     * A transaction guarantees no duplicate Priority 1 can ever persist.
     */
    public function setPrimary(int $id): void
    {
        $this->db->beginTransaction();
        try {
            $this->db->prepare('UPDATE ai_providers SET priority = 2, updated_at = NOW() WHERE id <> :id')
                ->execute(['id' => $id]);
            $this->db->prepare('UPDATE ai_providers SET priority = 1, updated_at = NOW() WHERE id = :id')
                ->execute(['id' => $id]);
            $this->db->commit();
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    /** Record a REAL test/runtime outcome — never a fake status. */
    public function recordStatus(int $id, bool $ok, ?string $error, bool $tested = false): void
    {
        $stmt = $this->db->prepare(
            'UPDATE ai_providers
             SET status = :status, last_error = :error' .
            ($tested ? ', last_tested_at = NOW()' : '') .
            ', updated_at = NOW()
             WHERE id = :id',
        );
        $stmt->execute([
            'status' => $ok ? 'connected' : 'failed',
            'error'  => $error !== null ? mb_substr($error, 0, 2000) : null,
            'id'     => $id,
        ]);
    }
}
