<?php

declare(strict_types=1);

namespace App\Core;

use App\Exceptions\ValidationException;

/**
 * Compact request validator.
 *
 *   Validator::validate($request->all(), [
 *       'email'    => 'required|email|max:190',
 *       'password' => 'required|min:8',
 *   ]);
 *
 * Throws ValidationException (422) with a field => [messages] map.
 */
final class Validator
{
    /**
     * @param array<string, mixed>  $data
     * @param array<string, string> $rules
     *
     * @return array<string, mixed> The validated subset of $data.
     */
    public static function validate(array $data, array $rules): array
    {
        $errors = [];
        $clean = [];

        foreach ($rules as $field => $ruleString) {
            $value = $data[$field] ?? null;
            $isString = is_string($value);
            $trimmed = $isString ? trim($value) : $value;

            foreach (explode('|', $ruleString) as $rule) {
                [$name, $arg] = array_pad(explode(':', $rule, 2), 2, null);

                $message = match ($name) {
                    'required' => ($trimmed === null || $trimmed === '')
                        ? 'This field is required.' : null,
                    'email' => ($trimmed !== null && $trimmed !== '' && !filter_var($trimmed, FILTER_VALIDATE_EMAIL))
                        ? 'Enter a valid email address.' : null,
                    'min' => ($isString && mb_strlen($trimmed) > 0 && mb_strlen($trimmed) < (int) $arg)
                        ? sprintf('Must be at least %d characters.', (int) $arg) : null,
                    'max' => ($isString && mb_strlen($trimmed) > (int) $arg)
                        ? sprintf('Must be at most %d characters.', (int) $arg) : null,
                    'string' => ($value !== null && !$isString)
                        ? 'Must be a string.' : null,
                    default => null,
                };

                if ($message !== null) {
                    $errors[$field][] = $message;
                }
            }

            if (!isset($errors[$field]) && $value !== null) {
                $clean[$field] = $trimmed;
            }
        }

        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        return $clean;
    }
}
