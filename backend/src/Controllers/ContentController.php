<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Services\AdminContentService;

/** Public content: active FAQs and published help articles. */
final class ContentController extends Controller
{
    /** GET /api/v1/faqs — active FAQs for the landing + support pages. */
    public function faqs(Request $request): Response
    {
        return Response::success(['faqs' => (new AdminContentService())->faqs(activeOnly: true)]);
    }

    /** GET /api/v1/help/articles — published help center articles. */
    public function articles(Request $request): Response
    {
        return Response::success(['articles' => (new AdminContentService())->publishedArticles()]);
    }
}
