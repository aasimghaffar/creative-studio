<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Logger;
use App\Exceptions\HttpException;
use App\Exceptions\ValidationException;
use App\Repositories\ContentRepository;
use App\Repositories\NotificationRepository;

/** Admin → Content: announcements, help articles, FAQs. */
final class AdminContentService
{
    private const AUDIENCES = ['all', 'sketch', 'studio', 'agency'];

    public function __construct(
        private readonly ContentRepository $content = new ContentRepository(),
        private readonly NotificationRepository $notifications = new NotificationRepository(),
    ) {
    }

    /* ---------------- Announcements ---------------- */

    /** @return list<array<string, mixed>> */
    public function announcements(): array
    {
        return array_map([$this, 'shapeAnnouncement'], $this->content->announcements());
    }

    /** @return array<string, mixed> */
    public function createAnnouncement(int $adminId, array $input): array
    {
        $fields = $this->validateAnnouncement($input);
        $id = $this->content->createAnnouncement($fields, $adminId);

        $notified = 0;
        if ($fields['status'] === 'published') {
            $notified = $this->notifications->createForAudience(
                $fields['audience'],
                $fields['title'],
                mb_substr($fields['body'], 0, 190),
            );
        }
        Logger::channel('app')->info('Announcement created', [
            'admin_id' => $adminId, 'id' => $id, 'status' => $fields['status'], 'notified' => $notified,
        ]);

        return $this->oneAnnouncement($id) + ['notified' => $notified];
    }

    /** @return array<string, mixed> */
    public function updateAnnouncement(int $adminId, int $id, array $input): array
    {
        $current = $this->requireAnnouncement($id);
        $fields = $this->validateAnnouncement($input);

        // Publishing is a deliberate action via publish(); editing keeps status
        // unless moving between draft/scheduled.
        if ($current['status'] === 'published') {
            $fields['status'] = 'published';
        }
        $this->content->updateAnnouncement($id, $fields);

        return $this->oneAnnouncement($id);
    }

    /** Publish now + notify the audience. @return array<string, mixed> */
    public function publishAnnouncement(int $adminId, int $id): array
    {
        $row = $this->requireAnnouncement($id);
        if ($row['status'] === 'published') {
            throw new HttpException(409, 'This announcement is already published.');
        }

        $this->content->markPublished($id);
        $notified = $this->notifications->createForAudience(
            (string) $row['audience'],
            (string) $row['title'],
            mb_substr((string) $row['body'], 0, 190),
        );

        Logger::channel('app')->info('Announcement published', [
            'admin_id' => $adminId, 'id' => $id, 'notified' => $notified,
        ]);

        return $this->oneAnnouncement($id) + ['notified' => $notified];
    }

    public function deleteAnnouncement(int $adminId, int $id): void
    {
        $this->requireAnnouncement($id);
        $this->content->deleteAnnouncement($id);
        Logger::channel('app')->warning('Announcement deleted', ['admin_id' => $adminId, 'id' => $id]);
    }

    /* ---------------- Help articles ---------------- */

    /** @return list<array<string, mixed>> */
    public function articles(): array
    {
        return array_map([$this, 'shapeArticle'], $this->content->articles());
    }

    /** @return list<array<string, mixed>> Published only (public surface). */
    public function publishedArticles(): array
    {
        return array_map([$this, 'shapeArticle'], $this->content->articles('published'));
    }

    /** @return array<string, mixed> */
    public function createArticle(int $adminId, array $input): array
    {
        $fields = $this->validateArticle($input, null);
        $fields['slug'] = $this->uniqueSlug($fields['title']);
        $id = $this->content->createArticle($fields);
        Logger::channel('app')->info('Help article created', ['admin_id' => $adminId, 'id' => $id]);

        return $this->shapeArticle($this->content->findArticle($id) ?? []);
    }

    /** @return array<string, mixed> */
    public function updateArticle(int $adminId, int $id, array $input): array
    {
        if ($this->content->findArticle($id) === null) {
            throw new HttpException(404, 'Article not found.');
        }
        $this->content->updateArticle($id, $this->validateArticle($input, $id));

        return $this->shapeArticle($this->content->findArticle($id) ?? []);
    }

    public function deleteArticle(int $adminId, int $id): void
    {
        if ($this->content->findArticle($id) === null) {
            throw new HttpException(404, 'Article not found.');
        }
        $this->content->deleteArticle($id);
        Logger::channel('app')->warning('Help article deleted', ['admin_id' => $adminId, 'id' => $id]);
    }

    /* ---------------- FAQs ---------------- */

    /** @return list<array<string, mixed>> */
    public function faqs(bool $activeOnly = false): array
    {
        return array_map([$this, 'shapeFaq'], $this->content->faqs($activeOnly));
    }

    /** @return array<string, mixed> */
    public function createFaq(int $adminId, array $input): array
    {
        $fields = $this->validateFaq($input);
        $id = $this->content->createFaq($fields);
        Logger::channel('app')->info('FAQ created', ['admin_id' => $adminId, 'id' => $id]);

        return $this->shapeFaq($this->content->findFaq($id) ?? []);
    }

    /** @return array<string, mixed> */
    public function updateFaq(int $adminId, int $id, array $input): array
    {
        if ($this->content->findFaq($id) === null) {
            throw new HttpException(404, 'FAQ not found.');
        }
        $this->content->updateFaq($id, $this->validateFaq($input));

        return $this->shapeFaq($this->content->findFaq($id) ?? []);
    }

    public function deleteFaq(int $adminId, int $id): void
    {
        if ($this->content->findFaq($id) === null) {
            throw new HttpException(404, 'FAQ not found.');
        }
        $this->content->deleteFaq($id);
        Logger::channel('app')->warning('FAQ deleted', ['admin_id' => $adminId, 'id' => $id]);
    }

    /* ---------------- validation + shapes ---------------- */

    /** @return array<string, mixed> */
    private function validateAnnouncement(array $input): array
    {
        $errors = [];

        $title = trim((string) ($input['title'] ?? ''));
        if ($title === '' || mb_strlen($title) > 190) {
            $errors['title'][] = 'Title is required (max 190 characters).';
        }

        $body = trim((string) ($input['body'] ?? ''));
        if ($body === '' || mb_strlen($body) > 5000) {
            $errors['body'][] = 'Body is required (max 5000 characters).';
        }

        $audience = strtolower(trim((string) ($input['audience'] ?? 'all')));
        if (!in_array($audience, self::AUDIENCES, true)) {
            $errors['audience'][] = 'Audience must be all, sketch, studio, or agency.';
        }

        $status = (string) ($input['status'] ?? 'draft');
        if (!in_array($status, ['draft', 'scheduled', 'published'], true)) {
            $errors['status'][] = 'Status must be draft, scheduled, or published.';
        }

        $publishAt = null;
        $rawPublishAt = trim((string) ($input['publish_at'] ?? ''));
        if ($status === 'scheduled') {
            $ts = strtotime($rawPublishAt);
            if ($rawPublishAt === '' || $ts === false) {
                $errors['publish_at'][] = 'Scheduled announcements need a valid publish date.';
            } else {
                $publishAt = date('Y-m-d H:i:s', $ts);
            }
        }

        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        return [
            'title'      => $title,
            'body'       => $body,
            'audience'   => $audience,
            'status'     => $status,
            'publish_at' => $publishAt,
        ];
    }

    /** @return array<string, mixed> */
    private function validateArticle(array $input, ?int $exceptId): array
    {
        $errors = [];

        $title = trim((string) ($input['title'] ?? ''));
        if ($title === '' || mb_strlen($title) > 190) {
            $errors['title'][] = 'Title is required (max 190 characters).';
        }

        $category = trim((string) ($input['category'] ?? 'General')) ?: 'General';
        if (mb_strlen($category) > 80) {
            $errors['category'][] = 'Category max 80 characters.';
        }

        $body = trim((string) ($input['body'] ?? ''));
        if ($body === '' || mb_strlen($body) > 100000) {
            $errors['body'][] = 'Body is required (max 100,000 characters).';
        }

        $status = (string) ($input['status'] ?? 'draft');
        if (!in_array($status, ['draft', 'published'], true)) {
            $errors['status'][] = 'Status must be draft or published.';
        }

        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        return ['title' => $title, 'category' => $category, 'body' => $body, 'status' => $status];
    }

    /** @return array<string, mixed> */
    private function validateFaq(array $input): array
    {
        $errors = [];

        $question = trim((string) ($input['question'] ?? ''));
        if ($question === '' || mb_strlen($question) > 255) {
            $errors['question'][] = 'Question is required (max 255 characters).';
        }

        $answer = trim((string) ($input['answer'] ?? ''));
        if ($answer === '' || mb_strlen($answer) > 3000) {
            $errors['answer'][] = 'Answer is required (max 3000 characters).';
        }

        $sortOrder = (int) ($input['sort_order'] ?? 0);
        if ($sortOrder < 0 || $sortOrder > 99) {
            $errors['sort_order'][] = 'Display order must be between 0 and 99.';
        }

        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        return [
            'question'   => $question,
            'answer'     => $answer,
            'sort_order' => $sortOrder,
            'is_active'  => (bool) ($input['is_active'] ?? true),
        ];
    }

    private function uniqueSlug(string $title): string
    {
        $base = trim(preg_replace('/-+/', '-', preg_replace('/[^a-z0-9]+/', '-', strtolower($title)) ?? ''), '-') ?: 'article';
        $slug = $base;
        $n = 2;
        while ($this->content->articleSlugExists($slug)) {
            $slug = $base . '-' . $n++;
        }

        return $slug;
    }

    /** @return array<string, mixed> */
    private function oneAnnouncement(int $id): array
    {
        return $this->shapeAnnouncement($this->requireAnnouncement($id));
    }

    /** @return array<string, mixed> */
    private function requireAnnouncement(int $id): array
    {
        $row = $this->content->findAnnouncement($id);
        if ($row === null) {
            throw new HttpException(404, 'Announcement not found.');
        }

        return $row;
    }

    /** @param array<string, mixed> $row */
    private function shapeAnnouncement(array $row): array
    {
        return [
            'id'           => (int) $row['id'],
            'title'        => $row['title'],
            'body'         => $row['body'],
            'audience'     => $row['audience'],
            'status'       => $row['status'],
            'publish_at'   => $row['publish_at'],
            'published_at' => $row['published_at'],
            'created_at'   => $row['created_at'],
        ];
    }

    /** @param array<string, mixed> $row */
    private function shapeArticle(array $row): array
    {
        return [
            'id'         => (int) $row['id'],
            'title'      => $row['title'],
            'slug'       => $row['slug'],
            'category'   => $row['category'],
            'body'       => $row['body'],
            'status'     => $row['status'],
            'views'      => (int) ($row['views'] ?? 0),
            'updated_at' => $row['updated_at'],
        ];
    }

    /** @param array<string, mixed> $row */
    private function shapeFaq(array $row): array
    {
        return [
            'id'         => (int) $row['id'],
            'question'   => $row['question'],
            'answer'     => $row['answer'],
            'sort_order' => (int) $row['sort_order'],
            'is_active'  => (bool) $row['is_active'],
        ];
    }
}
