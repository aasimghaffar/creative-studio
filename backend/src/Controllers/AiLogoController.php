<?php

declare(strict_types=1);

namespace App\Controllers;

/**
 * The Logo Generator — first concrete tool on the shared engine.
 * Future tools are this small: subclass + routes + a prompt recipe.
 */
final class AiLogoController extends AiToolController
{
    protected string $toolSlug = 'logo';
}
