<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;

/**
 * Base controller: shared helpers for all endpoints.
 */
abstract class Controller
{
    /** @return array<string, mixed> The authenticated user (set by AuthMiddleware). */
    protected function user(Request $request): array
    {
        /** @var array<string, mixed> $user */
        $user = $request->attribute('user') ?? [];

        return $user;
    }
}
