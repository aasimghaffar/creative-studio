<?php

declare(strict_types=1);

namespace App\Core;

use App\Config\Config;

/**
 * Minimal PSR-3-style file logger with daily rotation by filename.
 * storage/logs/{channel}-YYYY-MM-DD.log
 */
final class Logger
{
    private const LEVELS = ['debug' => 0, 'info' => 1, 'warning' => 2, 'error' => 3];

    /** @var array<string, self> */
    private static array $channels = [];

    private function __construct(private readonly string $channel)
    {
    }

    public static function channel(string $name = 'app'): self
    {
        return self::$channels[$name] ??= new self($name);
    }

    /** @param array<string, mixed> $context */
    public function debug(string $message, array $context = []): void
    {
        $this->log('debug', $message, $context);
    }

    /** @param array<string, mixed> $context */
    public function info(string $message, array $context = []): void
    {
        $this->log('info', $message, $context);
    }

    /** @param array<string, mixed> $context */
    public function warning(string $message, array $context = []): void
    {
        $this->log('warning', $message, $context);
    }

    /** @param array<string, mixed> $context */
    public function error(string $message, array $context = []): void
    {
        $this->log('error', $message, $context);
    }

    /** @param array<string, mixed> $context */
    private function log(string $level, string $message, array $context): void
    {
        $threshold = self::LEVELS[Config::get('LOG_LEVEL', 'debug')] ?? 0;
        if ((self::LEVELS[$level] ?? 0) < $threshold) {
            return;
        }

        $dir = dirname(__DIR__, 2) . '/storage/logs';
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        $line = sprintf(
            "[%s] %s.%s: %s %s\n",
            date('Y-m-d H:i:s'),
            $this->channel,
            strtoupper($level),
            $message,
            $context === [] ? '' : json_encode($context, JSON_UNESCAPED_SLASHES),
        );

        file_put_contents(
            sprintf('%s/%s-%s.log', $dir, $this->channel, date('Y-m-d')),
            $line,
            FILE_APPEND | LOCK_EX,
        );
    }
}
