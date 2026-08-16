<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed production-safe structural data only.
     * Dummy users, notifications, and demo WhatsApp groups are not seeded.
     */
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            LocationSeeder::class,
            CategorySeeder::class,
            AdminSeeder::class,
            PageSeeder::class,
            BannerSeeder::class,
            EmailTemplateSeeder::class,
        ]);
    }
}
