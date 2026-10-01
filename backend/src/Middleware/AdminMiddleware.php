<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Core\Response;
use App\Exceptions\HttpException;

/**
 * Runs after AuthMiddleware; allows only role=admin.
 * (No admin endpoints yet — ready for the next phase.)
 */
final class AdminMiddleware extends AuthMiddleware
{
    /** @param callable(Request): Response $next */
    public function handle(Request $request, callable $next): Response
    {
        return parent::handle($request, function (Request $req) use ($next): Response {
            /** @var array<string, mixed>|null $user */
            $user = $req->attribute('user');
            if (($user['role'] ?? '') !== 'admin') {
                throw new HttpException(403, 'Admin access required.');
            }

            return $next($req);
        });
    }
}
