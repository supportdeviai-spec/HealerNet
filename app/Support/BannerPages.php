<?php

namespace App\Support;

class BannerPages
{
    public const LOGIN = 'login';

    public const REGISTRATION = 'registration';

    public const FORGOT_PASSWORD = 'forgot_password';

    public const RESET_LINK_SENT = 'reset_link_sent';

    public const RESET_PASSWORD = 'reset_password';

    public const THANKS = 'thanks';

    public const LOGO = 'logo';

    public const ALL = [
        self::LOGIN,
        self::REGISTRATION,
        self::FORGOT_PASSWORD,
        self::RESET_LINK_SENT,
        self::RESET_PASSWORD,
        self::THANKS,
        self::LOGO,
    ];

    /**
     * Normalize route/page slugs to canonical banner page keys.
     */
    public static function normalize(string $page): ?string
    {
        $key = strtolower(trim(str_replace('-', '_', $page)));

        $aliases = [
            'register' => self::REGISTRATION,
            'register_thanks' => self::THANKS,
            'register_success' => self::THANKS,
            'register_success_page' => self::THANKS,
            'forgotpassword' => self::FORGOT_PASSWORD,
            'reset_password_page' => self::RESET_PASSWORD,
        ];

        $normalized = $aliases[$key] ?? $key;

        return in_array($normalized, self::ALL, true) ? $normalized : null;
    }

    public static function isValid(string $page): bool
    {
        return self::normalize($page) !== null;
    }

    public static function validationRule(): string
    {
        return 'in:' . implode(',', self::ALL);
    }

    /**
     * Recommended upload dimensions (width × height) per banner page.
     */
    public static function recommendedSize(?string $page): string
    {
        $normalized = $page ? self::normalize($page) : null;

        return match ($normalized) {
            self::LOGO => '512 × 512',
            self::THANKS => '1600 × 520',
            default => '1080 × 1440',
        };
    }
}
