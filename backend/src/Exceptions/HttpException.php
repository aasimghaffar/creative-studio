<?php

declare(strict_types=1);

namespace App\Exceptions;

/**
 * An exception that maps directly to an HTTP error response.
 */
class HttpException extends \RuntimeException
{
    /** @param array<string, array<int, string>>|null $errors */
    public function __construct(
        private readonly int $statusCode,
        string $message,
        private readonly ?array $errors = null,
    ) {
        parent::__construct($message);
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    /** @return array<string, array<int, string>>|null */
    public function getErrors(): ?array
    {
        return $this->errors;
    }
}
