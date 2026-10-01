<?php

declare(strict_types=1);

namespace App\Config;

/**
 * Typed, cached access to environment configuration.
 * Every env read goes through here so defaults live in one place.
 */
final class Config
{
    /** @var array<string, string> */
    private static array $values = [];

    public static function init(): void
    {
        // $_ENV is populated by vlucas/phpdotenv (immutable) + real env vars.
        self::$values = array_map('strval', array_merge(getenv(), $_ENV));
    }

    public static function get(string $key, string $default = ''): string
    {
        return self::$values[$key] ?? $default;
    }

    public static function int(string $key, int $default = 0): int
    {
        return (int) (self::$values[$key] ?? $default);
    }

    public static function bool(string $key, bool $default = false): bool
    {
        $raw = strtolower(self::$values[$key] ?? '');
        if ($raw === '') {
            return $default;
        }

        return in_array($raw, ['1', 'true', 'yes', 'on'], true);
    }

    public static function isProduction(): bool
    {
        return self::get('APP_ENV', 'local') === 'production';
    }
}
