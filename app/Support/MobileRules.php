<?php

namespace App\Support;

/**
 * Parses a country's Phone Code / Mobile Length / Starts With, as entered in the
 * WhatsApp community Excel import or the admin country form.
 */
final class MobileRules
{
    public const PHONE_CODE_ERROR = 'Invalid Phone Code. Use a format like +971.';

    public const LENGTH_ERROR = 'Invalid Mobile Length. Use a number like 9 or a range like 10-11 (between 4 and 15).';

    public const STARTS_WITH_ERROR = 'Invalid Starts With. Use digits like 5 or 6,7,8,9.';

    /** "971" or "+971" → "+971"; null when invalid. */
    public static function phoneCode(string $value): ?string
    {
        if (! preg_match('/^\+?\s*\d{1,4}$/', trim($value))) {
            return null;
        }

        return '+'.preg_replace('/\D/', '', $value);
    }

    /**
     * "9" → [9, 9], "10-11" → [10, 11]; null when invalid.
     *
     * @return array{0: int, 1: int}|null
     */
    public static function length(string $value): ?array
    {
        if (! preg_match('/^(\d{1,2})(?:\s*-\s*(\d{1,2}))?$/', trim($value), $m)) {
            return null;
        }

        $min = (int) $m[1];
        $max = isset($m[2]) && $m[2] !== '' ? (int) $m[2] : $min;
        if ($min < 4 || $max > 15 || $min > $max) {
            return null;
        }

        return [$min, $max];
    }

    /** "6, 7,8,9" → "6,7,8,9"; null when invalid. */
    public static function startsWith(string $value): ?string
    {
        $parts = array_values(array_filter(
            preg_split('/[\s,\/|]+/', trim($value)) ?: [],
            fn (string $part) => $part !== ''
        ));

        foreach ($parts as $part) {
            if (! preg_match('/^\d{1,4}$/', $part)) {
                return null;
            }
        }

        return $parts === [] ? null : implode(',', array_unique($parts));
    }

    /**
     * Validation closure for a nullable form field using one of the parsers above.
     */
    public static function rule(string $parser, string $message): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail) use ($parser, $message) {
            if ($value === null || trim((string) $value) === '') {
                return;
            }
            if (! is_scalar($value) || call_user_func([self::class, $parser], (string) $value) === null) {
                $fail($message);
            }
        };
    }

    /**
     * Turns validated admin form input (phone_code, mobile_length, mobile_starts_with)
     * into country columns. Keys that were not sent are left out, so existing values stay.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function toCountryColumns(array $data): array
    {
        if (array_key_exists('phone_code', $data)) {
            $code = trim((string) $data['phone_code']);
            $data['phone_code'] = $code === '' ? null : self::phoneCode($code);
        }

        if (array_key_exists('mobile_length', $data)) {
            $length = trim((string) $data['mobile_length']);
            [$min, $max] = $length === '' ? [null, null] : self::length($length);
            $data['mobile_min_length'] = $min;
            $data['mobile_max_length'] = $max;
            unset($data['mobile_length']);
        }

        if (array_key_exists('mobile_starts_with', $data)) {
            $starts = trim((string) $data['mobile_starts_with']);
            $data['mobile_starts_with'] = $starts === '' ? null : self::startsWith($starts);
        }

        return $data;
    }
}
