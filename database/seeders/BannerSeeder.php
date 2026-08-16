<?php

namespace Database\Seeders;

use App\Models\Banner;
use App\Support\BannerPages;
use Illuminate\Database\Seeder;

class BannerSeeder extends Seeder
{
    public function run(): void
    {
        Banner::updateOrCreate(
            ['page' => BannerPages::LOGIN],
            [
                'title' => 'Clinical Collaboration & Evidence Network',
                'description' => 'Connect with accredited healthcare professionals, access peer-reviewed research, and streamline clinical workflows.',
                'image' => '/banner/login-banner.png',
                'is_active' => true,
            ]
        );

        Banner::updateOrCreate(
            ['page' => BannerPages::REGISTRATION],
            [
                'title' => 'Join the HealerNet Healthcare Community',
                'description' => 'Register your profile to access global medical research, collaborate with practitioners, and empower patient care.',
                'image' => '/banner/sign-banner.png',
                'is_active' => true,
            ]
        );

        Banner::updateOrCreate(
            ['page' => BannerPages::FORGOT_PASSWORD],
            [
                'title' => 'Secure Password Recovery',
                'description' => 'Reset your HealerNet credentials safely and get back to your clinical workspace.',
                'image' => '/banner/login-banner.png',
                'is_active' => true,
            ]
        );

        Banner::updateOrCreate(
            ['page' => BannerPages::RESET_LINK_SENT],
            [
                'title' => 'Check Your Inbox',
                'description' => 'We sent a secure reset link. Follow the email instructions to continue.',
                'image' => '/banner/login-banner.png',
                'is_active' => true,
            ]
        );

        Banner::updateOrCreate(
            ['page' => BannerPages::RESET_PASSWORD],
            [
                'title' => 'Create a New Password',
                'description' => 'Choose a strong password to protect your HealerNet account.',
                'image' => '/banner/login-banner.png',
                'is_active' => true,
            ]
        );

        Banner::updateOrCreate(
            ['page' => BannerPages::THANKS],
            [
                'title' => 'Welcome to HealerNet',
                'description' => 'Your registration is complete. Join your local WhatsApp community and start collaborating.',
                'image' => '/banner/sign-banner.png',
                'is_active' => true,
            ]
        );

        Banner::updateOrCreate(
            ['page' => BannerPages::LOGO],
            [
                'title' => 'HealerNet Logo',
                'description' => 'Primary site logo used across authentication pages.',
                'image' => '/images/logo.png',
                'is_active' => true,
            ]
        );
    }
}
