<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database;
use PDO;

final class PlanRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /** @return list<array<string, mixed>> ALL plans (admin view), display order. */
    public function all(): array
    {
        $rows = $this->db
            ->query('SELECT * FROM plans ORDER BY sort_order ASC, id ASC')
            ->fetchAll();

        return array_map([$this, 'decode'], $rows);
    }

    /** Case-insensitive name lookup for duplicate prevention. */
    public function nameExists(string $name, ?int $exceptId = null): bool
    {
        $sql = 'SELECT COUNT(*) FROM plans WHERE LOWER(name) = LOWER(:name)';
        $params = ['name' => $name];
        if ($exceptId !== null) {
            $sql .= ' AND id <> :id';
            $params['id'] = $exceptId;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return (int) $stmt->fetchColumn() > 0;
    }

    public function slugExists(string $slug): bool
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM plans WHERE slug = :slug');
        $stmt->execute(['slug' => $slug]);

        return (int) $stmt->fetchColumn() > 0;
    }

    /** @param array<string, mixed> $fields */
    public function create(array $fields): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO plans
                (slug, name, tagline, monthly_price, yearly_price, credits_per_cycle, seats,
                 storage_gb, max_generations, allowed_tools, features, is_popular, badge,
                 is_active, sort_order, created_at, updated_at)
             VALUES
                (:slug, :name, :tagline, :monthly_price, :yearly_price, :credits_per_cycle, :seats,
                 :storage_gb, :max_generations, :allowed_tools, :features, :is_popular, :badge,
                 :is_active, :sort_order, NOW(), NOW())',
        );
        $stmt->execute($this->bind($fields));

        return (int) $this->db->lastInsertId();
    }

    /** @param array<string, mixed> $fields */
    public function update(int $id, array $fields): void
    {
        $stmt = $this->db->prepare(
            'UPDATE plans SET
                name = :name, tagline = :tagline, monthly_price = :monthly_price,
                yearly_price = :yearly_price, credits_per_cycle = :credits_per_cycle,
                seats = :seats, storage_gb = :storage_gb, max_generations = :max_generations,
                allowed_tools = :allowed_tools, features = :features, is_popular = :is_popular,
                badge = :badge, is_active = :is_active, sort_order = :sort_order,
                updated_at = NOW()
             WHERE id = :id',
        );
        $params = $this->bind($fields);
        unset($params['slug']);
        $params['id'] = $id;
        $stmt->execute($params);
    }

    public function deleteById(int $id): void
    {
        $this->db->prepare('DELETE FROM plans WHERE id = :id')->execute(['id' => $id]);
    }

    public function setActive(int $id, bool $active): void
    {
        $this->db->prepare('UPDATE plans SET is_active = :active, updated_at = NOW() WHERE id = :id')
            ->execute(['active' => $active ? 1 : 0, 'id' => $id]);
    }

    /**
     * @param array<string, mixed> $fields
     *
     * @return array<string, mixed>
     */
    private function bind(array $fields): array
    {
        return [
            'slug'              => $fields['slug'] ?? '',
            'name'              => $fields['name'],
            'tagline'           => $fields['tagline'],
            'monthly_price'     => $fields['monthly_price'],
            'yearly_price'      => $fields['yearly_price'],
            'credits_per_cycle' => $fields['credits_per_cycle'],
            'seats'             => $fields['seats'],
            'storage_gb'        => $fields['storage_gb'],
            'max_generations'   => $fields['max_generations'],
            'allowed_tools'     => json_encode($fields['allowed_tools'] ?? [], JSON_UNESCAPED_SLASHES),
            'features'          => json_encode($fields['features'] ?? [], JSON_UNESCAPED_SLASHES),
            'is_popular'        => ($fields['badge'] ?? '') === 'Popular' ? 1 : 0,
            'badge'             => ($fields['badge'] ?? '') !== '' ? $fields['badge'] : null,
            'is_active'         => !empty($fields['is_active']) ? 1 : 0,
            'sort_order'        => $fields['sort_order'],
        ];
    }

    /** @return list<array<string, mixed>> Active plans in display order. */
    public function allActive(): array
    {
        $rows = $this->db
            ->query('SELECT * FROM plans WHERE is_active = 1 ORDER BY sort_order ASC, id ASC')
            ->fetchAll();

        return array_map([$this, 'decode'], $rows);
    }

    /** @return array<string, mixed>|null */
    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM plans WHERE slug = :slug LIMIT 1');
        $stmt->execute(['slug' => $slug]);
        $row = $stmt->fetch();

        return $row === false ? null : $this->decode($row);
    }

    /** @return array<string, mixed>|null */
    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM plans WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        return $row === false ? null : $this->decode($row);
    }

    /** @param array<string, mixed> $row */
    private function decode(array $row): array
    {
        $row['features'] = json_decode((string) ($row['features'] ?? '[]'), true) ?? [];
        $row['monthly_price'] = $row['monthly_price'] !== null ? (float) $row['monthly_price'] : null;
        $row['yearly_price'] = $row['yearly_price'] !== null ? (float) $row['yearly_price'] : null;
        $row['credits_per_cycle'] = $row['credits_per_cycle'] !== null ? (int) $row['credits_per_cycle'] : null;
        $row['allowed_tools'] = json_decode((string) ($row['allowed_tools'] ?? '[]'), true) ?? [];
        $row['storage_gb'] = isset($row['storage_gb']) && $row['storage_gb'] !== null ? (int) $row['storage_gb'] : null;
        $row['max_generations'] = isset($row['max_generations']) && $row['max_generations'] !== null ? (int) $row['max_generations'] : null;
        $row['badge'] = $row['badge'] ?? null;

        return $row;
    }
}
