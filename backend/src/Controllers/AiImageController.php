<?php

declare(strict_types=1);

namespace App\Controllers;

/** Image Generator — same shared engine, same thin shape as Logo. */
final class AiImageController extends AiToolController
{
    protected string $toolSlug = 'image';
}
