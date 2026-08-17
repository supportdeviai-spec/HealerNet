<?php

namespace App\Support;

use App\Models\Banner;
use Illuminate\Mail\Message;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Mime\Email;
use Throwable;

class EmailLogo
{
    public const CID = 'healernet-logo';

    public static function cidSrc(): string
    {
        return 'cid:' . self::CID;
    }

    public static function publicUrl(): string
    {
        return rtrim((string) config('app.url'), '/') . '/images/logo.png';
    }

    public static function path(): ?string
    {
        $candidates = [
            public_path('images/logo.png'),
            public_path('assest/immage/logo.png'),
        ];

        try {
            $banner = Banner::query()
                ->where('page', BannerPages::LOGO)
                ->where('is_active', true)
                ->orderByDesc('id')
                ->first();

            if ($banner?->image && !filter_var($banner->image, FILTER_VALIDATE_URL)) {
                $image = ltrim(str_replace('\\', '/', $banner->image), '/');
                $candidates[] = public_path($image);
                $candidates[] = public_path('storage/' . $image);
                $candidates[] = Storage::disk('public')->path($image);
            }
        } catch (Throwable) {
            // Banners table may be unavailable in some environments.
        }

        foreach ($candidates as $path) {
            if (is_string($path) && is_file($path)) {
                return $path;
            }
        }

        return null;
    }

    public static function embedder(): \Closure
    {
        return static function (Email $message): void {
            self::embedInto($message);
        };
    }

    public static function embedInto(Email|Message $message): void
    {
        $path = self::path();
        if (!$path) {
            return;
        }

        $email = $message instanceof Message ? $message->getSymfonyMessage() : $message;
        $email->embedFromPath($path, self::CID, 'image/png');
    }

    public static function imgTag(string $src): string
    {
        return '<img src="' . e($src) . '" alt="HealerNet Logo" width="56" height="56" style="max-height:55px;margin-bottom:10px;border:0;display:inline-block;">';
    }
}
