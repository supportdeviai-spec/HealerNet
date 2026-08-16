<?php

namespace Database\Factories;

use App\Models\Banner;
use Illuminate\Database\Eloquent\Factories\Factory;

class BannerFactory extends Factory
{
    protected $model = Banner::class;

    public function definition(): array
    {
        return [
            'title' => $this->faker->sentence(4),
            'description' => $this->faker->paragraph(2),
            'image' => 'banners/sample-banner.jpg',
            'page' => $this->faker->randomElement(['login', 'registration']),
            'is_active' => true,
        ];
    }
}
