<?php

use App\Models\Banner;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Move legacy storage/app/public/banners/* uploads into public/banner/uploads
     * so Vite /banner proxy and nginx can serve them reliably.
     */
    public function up(): void
    {
        $destDir = public_path('banner/uploads');
        if (!is_dir($destDir)) {
            File::makeDirectory($destDir, 0755, true);
        }

        Banner::query()
            ->whereNotNull('image')
            ->orderBy('id')
            ->each(function (Banner $banner) use ($destDir) {
                $image = str_replace('\\', '/', (string) $banner->image);

                // Already web-public under /banner/...
                if (str_starts_with($image, '/banner/') || str_starts_with($image, 'banner/')) {
                    return;
                }

                // Absolute URL — skip
                if (filter_var($image, FILTER_VALIDATE_URL)) {
                    return;
                }

                // Legacy public-disk path: banners/xyz.png
                if (!Storage::disk('public')->exists($image)) {
                    return;
                }

                $extension = pathinfo($image, PATHINFO_EXTENSION) ?: 'png';
                $filename = Str::uuid()->toString() . '.' . strtolower($extension);
                $absoluteDest = $destDir . DIRECTORY_SEPARATOR . $filename;

                File::copy(Storage::disk('public')->path($image), $absoluteDest);
                @chmod($absoluteDest, 0644);

                $banner->image = '/banner/uploads/' . $filename;
                $banner->save();
            });
    }

    public function down(): void
    {
        // Data migration — not reversed.
    }
};
