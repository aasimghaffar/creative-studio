<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Core\Response;
use App\Exceptions\HttpException;
use App\Repositories\UserRepository;
use App\Services\JwtService;

/**
 * Requires a valid Bearer access token; attaches the user to the request.
 */
class AuthMiddleware
{
    /** @param callable(Request): Response $next */
    public function handle(Request $request, callable $next): Response
    {
        $token = $request->bearerToken();
        if ($token === null) {
            throw new HttpException(401, 'Authentication required.');
        }

        $claims = (new JwtService())->decodeAccessToken($token);

        $user = (new UserRepository())->findById((int) $claims['sub']);
        if ($user === null || $user['status'] !== 'active') {
            throw new HttpException(401, 'Account unavailable.');
        }

        // Maintenance mode: the whole app closes for non-admins, while
        // admins keep full access to manage the platform (and turn it off).
        if ($user['role'] !== 'admin'
            && (new \App\Repositories\PlatformSettingRepository())->getBool('maintenance_mode', false)
        ) {
            throw new HttpException(503, 'The platform is under maintenance. Please check back soon.');
        }

        $request->setAttribute('user', $user);

        return $next($request);
    }
}
