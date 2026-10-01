<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Controllers\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Exceptions\HttpException;
use App\Services\AdminContentService;

/** Admin → Content: announcements, help articles, FAQs. */
final class AdminContentController extends Controller
{
    private AdminContentService $service;

    public function __construct()
    {
        $this->service = new AdminContentService();
    }

    /* ---- Announcements ---- */

    public function announcements(Request $request): Response
    {
        return Response::success(['announcements' => $this->service->announcements()]);
    }

    public function storeAnnouncement(Request $request): Response
    {
        return Response::created(
            $this->service->createAnnouncement($this->adminId($request), $request->all()),
            'Announcement created.',
        );
    }

    public function updateAnnouncement(Request $request): Response
    {
        return Response::success(
            $this->service->updateAnnouncement($this->adminId($request), $this->id($request), $request->all()),
            'Announcement saved.',
        );
    }

    public function publishAnnouncement(Request $request): Response
    {
        $result = $this->service->publishAnnouncement($this->adminId($request), $this->id($request));

        return Response::success($result, sprintf('Published — %d users notified.', (int) ($result['notified'] ?? 0)));
    }

    public function destroyAnnouncement(Request $request): Response
    {
        $this->service->deleteAnnouncement($this->adminId($request), $this->id($request));

        return Response::success(null, 'Announcement deleted.');
    }

    /* ---- Help articles ---- */

    public function articles(Request $request): Response
    {
        return Response::success(['articles' => $this->service->articles()]);
    }

    public function storeArticle(Request $request): Response
    {
        return Response::created(
            $this->service->createArticle($this->adminId($request), $request->all()),
            'Article created.',
        );
    }

    public function updateArticle(Request $request): Response
    {
        return Response::success(
            $this->service->updateArticle($this->adminId($request), $this->id($request), $request->all()),
            'Article saved.',
        );
    }

    public function destroyArticle(Request $request): Response
    {
        $this->service->deleteArticle($this->adminId($request), $this->id($request));

        return Response::success(null, 'Article deleted.');
    }

    /* ---- FAQs ---- */

    public function faqs(Request $request): Response
    {
        return Response::success(['faqs' => $this->service->faqs()]);
    }

    public function storeFaq(Request $request): Response
    {
        return Response::created(
            $this->service->createFaq($this->adminId($request), $request->all()),
            'FAQ created.',
        );
    }

    public function updateFaq(Request $request): Response
    {
        return Response::success(
            $this->service->updateFaq($this->adminId($request), $this->id($request), $request->all()),
            'FAQ saved.',
        );
    }

    public function destroyFaq(Request $request): Response
    {
        $this->service->deleteFaq($this->adminId($request), $this->id($request));

        return Response::success(null, 'FAQ deleted.');
    }

    /* ---- helpers ---- */

    private function adminId(Request $request): int
    {
        return (int) $this->user($request)['id'];
    }

    private function id(Request $request): int
    {
        $id = (int) $request->param('id');
        if ($id <= 0) {
            throw new HttpException(422, 'Invalid id.');
        }

        return $id;
    }
}
