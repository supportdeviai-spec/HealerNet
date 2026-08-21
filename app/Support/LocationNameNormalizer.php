<?php

namespace App\Support;

class LocationNameNormalizer
{
    public static function name(?string $value): string
    {
        $trimmed = trim((string) $value);
        if ($trimmed === '') {
            return '';
        }

        $collapsed = preg_replace('/\s+/u', ' ', $trimmed) ?? $trimmed;

        return mb_strtolower($collapsed, 'UTF-8');
    }

    public static function display(?string $value): string
    {
        $trimmed = trim((string) $value);
        if ($trimmed === '') {
            return '';
        }

        return preg_replace('/\s+/u', ' ', $trimmed) ?? $trimmed;
    }

    public static function whatsappUrl(?string $value): string
    {
        $trimmed = trim((string) $value);
        if ($trimmed === '') {
            return '';
        }

        $collapsed = preg_replace('/\s+/u', '', $trimmed) ?? $trimmed;

        return mb_strtolower(rtrim($collapsed, '/'), 'UTF-8');
    }
}
