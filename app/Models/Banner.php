<?php

namespace App\Models;

use App\Support\BannerPages;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Banner extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'image',
        'page',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected $appends = [
        'image_url',
        'size',
        'recommended_size',
    ];

    /**
     * Scope for active banners
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for page (login or registration)
     */
    public function scopeForPage($query, string $page)
    {
        return $query->where('page', strtolower($page));
    }

    /**
     * Scope for ordering
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('id', 'desc');
    }

    /**
     * Accessor for full image URL (cache-busted with updated_at so replacements show immediately).
     */
    public function getImageUrlAttribute(): string
    {
        if (!$this->image) {
            return '';
        }

        $url = '';

        if (filter_var($this->image, FILTER_VALIDATE_URL)) {
            $url = $this->image;
        } elseif (str_starts_with($this->image, '/')) {
            $url = $this->image;
        } elseif (str_starts_with($this->image, 'banner/')) {
            $url = '/' . $this->image;
        } else {
            // Public disk path (e.g. banners/xyz.png) — always relative so Vite/nginx can serve it.
            $url = '/storage/' . ltrim($this->image, '/');
        }

        $version = $this->updated_at?->timestamp ?? $this->id;
        $separator = str_contains($url, '?') ? '&' : '?';

        return $url . $separator . 'v=' . $version;
    }

    /**
     * Actual image dimensions when the file can be read (e.g. "1920 × 1080").
     */
    public function getSizeAttribute(): ?string
    {
        $path = $this->resolveLocalImagePath();
        if (!$path) {
            return null;
        }

        $info = @getimagesize($path);
        if (!$info || empty($info[0]) || empty($info[1])) {
            return null;
        }

        return $info[0] . ' × ' . $info[1];
    }

    /**
     * Recommended upload size for this banner's target page.
     */
    public function getRecommendedSizeAttribute(): string
    {
        return BannerPages::recommendedSize($this->page);
    }

    private function resolveLocalImagePath(): ?string
    {
        if (!$this->image || filter_var($this->image, FILTER_VALIDATE_URL)) {
            return null;
        }

        $image = ltrim(str_replace('\\', '/', $this->image), '/');

        $candidates = [
            public_path($image),
            public_path('storage/' . $image),
            Storage::disk('public')->path($image),
        ];

        foreach ($candidates as $candidate) {
            if (is_string($candidate) && is_file($candidate)) {
                return $candidate;
            }
        }

        return null;
    }
}
