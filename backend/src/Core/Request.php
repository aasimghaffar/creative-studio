<?php

declare(strict_types=1);

namespace App\Core;

use App\Exceptions\HttpException;

/**
 * Immutable snapshot of the incoming HTTP request.
 */
final class Request
{
    /** @var array<string, mixed> */
    private array $attributes = [];

    /**
     * @param array<string, mixed>  $body
     * @param array<string, string> $query
     * @param array<string, string> $headers
     * @param array<string, string> $params Route parameters, set by the router.
     */
    private function __construct(
        private readonly string $method,
        private readonly string $path,
        private readonly array $body,
        private readonly array $query,
        private readonly array $headers,
        private array $params,
        private readonly string $id,
    ) {
    }

    public static function capture(): self
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $path = rtrim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/', '/') ?: '/';

        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $name = str_replace('_', '-', strtolower(substr($key, 5)));
                $headers[$name] = (string) $value;
            }
        }
        if (isset($_SERVER['CONTENT_TYPE'])) {
            $headers['content-type'] = (string) $_SERVER['CONTENT_TYPE'];
        }

        $body = [];
        $raw = file_get_contents('php://input') ?: '';
        if ($raw !== '' && str_contains($headers['content-type'] ?? '', 'application/json')) {
            $decoded = json_decode($raw, true);
            if (!is_array($decoded)) {
                throw new HttpException(400, 'Malformed JSON body.');
            }
            $body = $decoded;
        }

        return new self(
            $method,
            $path,
            $body,
            array_map('strval', $_GET),
            $headers,
            [],
            bin2hex(random_bytes(8)),
        );
    }

    public function method(): string
    {
        return $this->method;
    }

    public function path(): string
    {
        return $this->path;
    }

    public function id(): string
    {
        return $this->id;
    }

    public function ip(): string
    {
        return (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    }

    public function header(string $name): ?string
    {
        return $this->headers[strtolower($name)] ?? null;
    }

    /** Bearer token from the Authorization header, if present. */
    public function bearerToken(): ?string
    {
        $auth = $this->header('authorization') ?? '';

        return str_starts_with($auth, 'Bearer ') ? substr($auth, 7) : null;
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $default;
    }

    /** @return array<string, mixed> */
    public function all(): array
    {
        return $this->body;
    }

    public function queryParam(string $key, string $default = ''): string
    {
        return $this->query[$key] ?? $default;
    }

    public function param(string $key): string
    {
        return $this->params[$key] ?? '';
    }

    /** @param array<string, string> $params */
    public function withParams(array $params): self
    {
        $clone = clone $this;
        $clone->params = $params;

        return $clone;
    }

    /** Attach data for later handlers (e.g. the authenticated user). */
    public function setAttribute(string $key, mixed $value): void
    {
        $this->attributes[$key] = $value;
    }

    public function attribute(string $key): mixed
    {
        return $this->attributes[$key] ?? null;
    }
}
