<?php

namespace App\Http\Controllers;

use App\Models\Page;
use Database\Seeders\PageSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Schema;

class CmsPageController extends Controller
{
    private const DEFAULT_SLUGS = [
        'privacy-policy',
        'terms-and-conditions',
        'terms-conditions',
        'faq',
        'refund-policy',
        'cookie-policy',
        'contact-us',
    ];

    public function show(string $slug): JsonResponse
    {
        $normalized = $this->normalizeSlug($slug);
        $page = $this->findPublishedPage($normalized, $slug);

        if (!$page && Schema::hasTable('pages')) {
            $shouldSeed = Page::query()->count() === 0
                || in_array($normalized, self::DEFAULT_SLUGS, true);

            if ($shouldSeed) {
                (new PageSeeder())->run();
                $page = $this->findPublishedPage($normalized, $slug);
            }
        }

        if (!$page) {
            return response()->json([
                'status' => 'error',
                'message' => 'Page not found or not published.',
                'slug' => $normalized,
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'page' => $page,
        ]);
    }

    private function normalizeSlug(string $slug): string
    {
        $aliases = [
            'terms' => 'terms-and-conditions',
            'privacy' => 'privacy-policy',
            'terms-conditions' => 'terms-and-conditions',
        ];

        $clean = strtolower(trim($slug, '/'));

        return $aliases[$clean] ?? $clean;
    }

    private function findPublishedPage(string $normalized, string $originalSlug): ?Page
    {
        $variants = array_unique([
            $normalized,
            $originalSlug,
            '/' . ltrim($normalized, '/'),
            ltrim($originalSlug, '/'),
        ]);

        return Page::query()
            ->whereIn('slug', $variants)
            ->whereRaw('LOWER(status) = ?', ['published'])
            ->first();
    }
}
