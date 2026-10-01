<?php

declare(strict_types=1);

namespace App\Controllers;

/** Tattoo Generator — same shared engine, same thin shape as Logo. */
final class AiTattooController extends AiToolController
{
    protected string $toolSlug = 'tattoo';
}
