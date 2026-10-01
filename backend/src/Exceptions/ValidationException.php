<?php

declare(strict_types=1);

namespace App\Exceptions;

/**
 * 422 Unprocessable Entity with a field => [messages] error bag.
 */
final class ValidationException extends HttpException
{
    /** @param array<string, array<int, string>> $errors */
    public function __construct(array $errors)
    {
        parent::__construct(422, 'The given data was invalid.', $errors);
    }
}
