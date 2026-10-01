<?php

declare(strict_types=1);

namespace App\Controllers;

/** Avatar Generator — same shared engine, same thin shape as Logo. */
final class AiAvatarController extends AiToolController
{
    protected string $toolSlug = 'avatar';
}
