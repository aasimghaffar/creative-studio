<?php

declare(strict_types=1);

namespace App\Core;

use App\Config\Config;

/**
 * The single API response format. Every endpoint returns this envelope:
 *
 * {
 *   "success": bool,
 *   "message": string,
 *   "data":    object|array|null,
 *   "errors":  object|null,          // field => [messages] on validation failure
 *   "meta":    { "timestamp": ISO-8601, "request_id": string }
 * }
 */
final class Response
{
    /** @param array<string, mixed> $headers */
    private function __construct(
        private readonly int $status,
        private readonly bool $success,
        private readonly string $message,
        private readonly mixed $data,
        private readonly ?array $errors,
        private array $headers = [],
        private readonly ?string $rawBody = null,
        private readonly string $contentType = 'application/json; charset=utf-8',
    ) {
    }

    /** Raw HTML response (printable invoices). */
    public static function html(string $html, int $status = 200): self
    {
        return new self($status, true, 'OK', null, null, [], $html, 'text/html; charset=utf-8');
    }

    /** Binary file download with attachment disposition. */
    public static function download(string $bytes, string $mime, string $filename): self
    {
        $safe = preg_replace('/[^A-Za-z0-9._-]/', '_', $filename) ?? 'download';

        return (new self(200, true, 'OK', null, null, [], $bytes, $mime))
            ->withHeader('Content-Disposition', 'attachment; filename="' . $safe . '"');
    }

    /** Raw JSON body with an explicit status (webhook replies). */
    public static function json(array $body, int $status = 200): self
    {
        return new self($status, $status < 400, 'OK', null, null, [], json_encode($body) ?: '{}');
    }

    public static function success(mixed $data = null, string $message = 'OK', int $status = 200): self
    {
        return new self($status, true, $message, $data, null);
    }

    public static function created(mixed $data = null, string $message = 'Created'): self
    {
        return self::success($data, $message, 201);
    }

    /** @param array<string, array<int, string>>|null $errors */
    public static function error(string $message, int $status = 400, ?array $errors = null): self
    {
        return new self($status, false, $message, null, $errors);
    }

    public function withHeader(string $name, string $value): self
    {
        $clone = clone $this;
        $clone->headers[$name] = $value;

        return $clone;
    }

    public function statusCode(): int
    {
        return $this->status;
    }

    public function send(Request $request): void
    {
        http_response_code($this->status);

        header('Content-Type: ' . $this->contentType);
        header('X-Request-Id: ' . $request->id());

        // CORS — the React app's origin, configured per environment.
        $origin = Config::get('CORS_ALLOWED_ORIGIN', '*');
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Max-Age: 86400');

        foreach ($this->headers as $name => $value) {
            header($name . ': ' . $value);
        }

        if ($this->rawBody !== null) {
            echo $this->rawBody;

            return;
        }

        echo json_encode([
            'success' => $this->success,
            'message' => $this->message,
            'data'    => $this->data,
            'errors'  => $this->errors,
            'meta'    => [
                'timestamp'  => date('c'),
                'request_id' => $request->id(),
            ],
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
}
