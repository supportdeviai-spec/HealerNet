<?php

/**
 * One-shot repair: move legacy storage banners into public/banner/uploads
 * and update DB image paths. Run inside the app container:
 *   php artisan migrate --force
 * or:
 *   php scripts/repair_banner_uploads.php
 */

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Banner;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

$destDir = public_path('banner/uploads');
if (!is_dir($destDir)) {
    File::makeDirectory($destDir, 0755, true);
}

$fixed = 0;
$skipped = 0;

foreach (Banner::query()->orderBy('id')->get() as $banner) {
    $image = str_replace('\\', '/', (string) $banner->image);

    if ($image === '' || filter_var($image, FILTER_VALIDATE_URL)) {
        $skipped++;
        echo "skip #{$banner->id} {$banner->page}: empty/url\n";
        continue;
    }

    if (str_starts_with($image, '/banner/') || str_starts_with($image, 'banner/')) {
        $skipped++;
        echo "ok   #{$banner->id} {$banner->page}: {$image}\n";
        continue;
    }

    if (!Storage::disk('public')->exists($image)) {
        $skipped++;
        echo "miss #{$banner->id} {$banner->page}: {$image}\n";
        continue;
    }

    $extension = pathinfo($image, PATHINFO_EXTENSION) ?: 'png';
    $filename = Str::uuid()->toString() . '.' . strtolower($extension);
    $absoluteDest = $destDir . DIRECTORY_SEPARATOR . $filename;
    File::copy(Storage::disk('public')->path($image), $absoluteDest);
    @chmod($absoluteDest, 0644);

    $banner->image = '/banner/uploads/' . $filename;
    $banner->save();
    $fixed++;
    echo "fix #{$banner->id} {$banner->page}: {$banner->image} => {$banner->image_url}\n";
}

echo "\nDone. fixed={$fixed} skipped={$skipped}\n";
