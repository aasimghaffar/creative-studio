<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database;
use PDO;

/** Content module: announcements, help articles, FAQs (one domain). */
final class ContentRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /* ---------------- Announcements ---------------- */

    /** @return list<array<string, mixed>> */
    public function announcements(): array
    {
        return $this->db
            ->query('SELECT * FROM announcements ORDER BY created_at DESC, id DESC')
            ->fetchAll();
    }

    /** @return array<string, mixed>|null */
    public function findAnnouncement(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM announcements WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    /** @param array<string, mixed> $f */
    public function createAnnouncement(array $f, int $adminId): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO announcements (title, body, audience, status, publish_at, published_at, created_by, created_at, updated_at)
             VALUES (:title, :body, :audience, :status, :publish_at, :published_at, :created_by, NOW(), NOW())',
        );
        $stmt->execute([
            'title'        => $f['title'],
            'body'         => $f['body'],
            'audience'     => $f['audience'],
            'status'       => $f['status'],
            'publish_at'   => $f['publish_at'],
            'published_at' => $f['status'] === 'published' ? date('Y-m-d H:i:s') : null,
            'created_by'   => $adminId,
        ]);

        return (int) $this->db->lastInsertId();
    }

    /** @param array<string, mixed> $f */
    public function updateAnnouncement(int $id, array $f): void
    {
        $stmt = $this->db->prepare(
            'UPDATE announcements
             SET title = :title, body = :body, audience = :audience, status = :status,
                 publish_at = :publish_at, updated_at = NOW()
             WHERE id = :id',
        );
        $stmt->execute([
            'title'      => $f['title'],
            'body'       => $f['body'],
            'audience'   => $f['audience'],
            'status'     => $f['status'],
            'publish_at' => $f['publish_at'],
            'id'         => $id,
        ]);
    }

    public function markPublished(int $id): void
    {
        $this->db->prepare(
            "UPDATE announcements SET status = 'published', published_at = NOW(), updated_at = NOW() WHERE id = :id",
        )->execute(['id' => $id]);
    }

    public function deleteAnnouncement(int $id): void
    {
        $this->db->prepare('DELETE FROM announcements WHERE id = :id')->execute(['id' => $id]);
    }

    /* ---------------- Help articles ---------------- */

    /** @return list<array<string, mixed>> */
    public function articles(?string $status = null): array
    {
        if ($status !== null) {
            $stmt = $this->db->prepare('SELECT * FROM help_articles WHERE status = :s ORDER BY updated_at DESC, id DESC');
            $stmt->execute(['s' => $status]);

            return $stmt->fetchAll();
        }

        return $this->db->query('SELECT * FROM help_articles ORDER BY updated_at DESC, id DESC')->fetchAll();
    }

    /** @return array<string, mixed>|null */
    public function findArticle(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM help_articles WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    public function articleSlugExists(string $slug, ?int $exceptId = null): bool
    {
        $sql = 'SELECT COUNT(*) FROM help_articles WHERE slug = :slug';
        $params = ['slug' => $slug];
        if ($exceptId !== null) {
            $sql .= ' AND id <> :id';
            $params['id'] = $exceptId;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return (int) $stmt->fetchColumn() > 0;
    }

    /** @param array<string, mixed> $f */
    public function createArticle(array $f): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO help_articles (title, slug, category, body, status, created_at, updated_at)
             VALUES (:title, :slug, :category, :body, :status, NOW(), NOW())',
        );
        $stmt->execute([
            'title'    => $f['title'],
            'slug'     => $f['slug'],
            'category' => $f['category'],
            'body'     => $f['body'],
            'status'   => $f['status'],
        ]);

        return (int) $this->db->lastInsertId();
    }

    /** @param array<string, mixed> $f */
    public function updateArticle(int $id, array $f): void
    {
        $stmt = $this->db->prepare(
            'UPDATE help_articles
             SET title = :title, category = :category, body = :body, status = :status, updated_at = NOW()
             WHERE id = :id',
        );
        $stmt->execute([
            'title'    => $f['title'],
            'category' => $f['category'],
            'body'     => $f['body'],
            'status'   => $f['status'],
            'id'       => $id,
        ]);
    }

    public function deleteArticle(int $id): void
    {
        $this->db->prepare('DELETE FROM help_articles WHERE id = :id')->execute(['id' => $id]);
    }

    /* ---------------- FAQs ---------------- */

    /** @return list<array<string, mixed>> */
    public function faqs(bool $activeOnly = false): array
    {
        $sql = 'SELECT * FROM faqs'
            . ($activeOnly ? ' WHERE is_active = 1' : '')
            . ' ORDER BY sort_order ASC, id ASC';

        return $this->db->query($sql)->fetchAll();
    }

    /** @return array<string, mixed>|null */
    public function findFaq(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM faqs WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    /** @param array<string, mixed> $f */
    public function createFaq(array $f): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO faqs (question, answer, sort_order, is_active, created_at, updated_at)
             VALUES (:question, :answer, :sort_order, :is_active, NOW(), NOW())',
        );
        $stmt->execute([
            'question'   => $f['question'],
            'answer'     => $f['answer'],
            'sort_order' => $f['sort_order'],
            'is_active'  => $f['is_active'] ? 1 : 0,
        ]);

        return (int) $this->db->lastInsertId();
    }

    /** @param array<string, mixed> $f */
    public function updateFaq(int $id, array $f): void
    {
        $stmt = $this->db->prepare(
            'UPDATE faqs SET question = :question, answer = :answer, sort_order = :sort_order,
                    is_active = :is_active, updated_at = NOW()
             WHERE id = :id',
        );
        $stmt->execute([
            'question'   => $f['question'],
            'answer'     => $f['answer'],
            'sort_order' => $f['sort_order'],
            'is_active'  => $f['is_active'] ? 1 : 0,
            'id'         => $id,
        ]);
    }

    public function deleteFaq(int $id): void
    {
        $this->db->prepare('DELETE FROM faqs WHERE id = :id')->execute(['id' => $id]);
    }
}
