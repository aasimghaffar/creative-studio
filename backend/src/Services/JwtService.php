<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\Config;
use App\Exceptions\HttpException;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * Access tokens are short-lived stateless JWTs.
 * Refresh tokens are opaque random strings stored hashed in the database.
 */
final class JwtService
{
    private const ALGO = 'HS256';

    /** @return array{token: string, expires_in: int} */
    public function issueAccessToken(int $userId, string $role): array
    {
        $now = time();
        $ttl = Config::int('JWT_ACCESS_TTL', 900);

        $token = JWT::encode([
            'iss'  => Config::get('JWT_ISSUER', 'ai-creative-studio'),
            'sub'  => (string) $userId,
            'role' => $role,
            'iat'  => $now,
            'nbf'  => $now,
            'exp'  => $now + $ttl,
            'jti'  => bin2hex(random_bytes(8)),
        ], $this->secret(), self::ALGO);

        return ['token' => $token, 'expires_in' => $ttl];
    }

    /** @return array{sub: string, role: string} */
    public function decodeAccessToken(string $token): array
    {
        try {
            $payload = (array) JWT::decode($token, new Key($this->secret(), self::ALGO));
        } catch (ExpiredException) {
            throw new HttpException(401, 'Access token has expired.');
        } catch (\Throwable) {
            throw new HttpException(401, 'Invalid access token.');
        }

        return ['sub' => (string) ($payload['sub'] ?? ''), 'role' => (string) ($payload['role'] ?? 'user')];
    }

    /** Opaque refresh token: returned raw to the client, stored hashed. */
    public function generateRefreshToken(): string
    {
        return bin2hex(random_bytes(40));
    }

    public function hashToken(string $raw): string
    {
        return hash('sha256', $raw);
    }

    private function secret(): string
    {
        $secret = Config::get('JWT_SECRET');
        if ($secret === '' || $secret === 'change-me-64-hex-chars') {
            throw new HttpException(500, 'JWT_SECRET is not configured.');
        }

        return $secret;
    }
}
