<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Page;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminPageController extends Controller
{
    public function index()
    {
        $pages = Page::latest()->get();
        return response()->json([
            'status' => 'success',
            'pages' => $pages,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:pages,slug',
            'content' => 'required|string',
            'status' => 'nullable|in:published,draft',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['title']);
        }

        if (isset($validated['status'])) {
            $validated['status'] = strtolower($validated['status']);
        }

        $page = Page::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Page created successfully',
            'page' => $page,
        ], 201);
    }

    public function show(Page $page)
    {
        return response()->json([
            'status' => 'success',
            'page' => $page,
        ]);
    }

    public function update(Request $request, Page $page)
    {
        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'slug' => 'sometimes|required|string|max:255|unique:pages,slug,' . $page->id,
            'content' => 'sometimes|required|string',
            'status' => 'nullable|in:published,draft,Published,Draft',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
        ]);

        if (isset($validated['status'])) {
            $validated['status'] = strtolower($validated['status']);
        }

        $page->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Page updated successfully',
            'page' => $page,
        ]);
    }

    public function destroy(Page $page)
    {
        $page->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Page deleted successfully',
        ]);
    }

    public function getBySlug($slug)
    {
        $cleanSlug = trim($slug);
        $slugAliases = [
            'terms' => 'terms-and-conditions',
            'privacy' => 'privacy-policy',
            'terms-conditions' => 'terms-and-conditions',
        ];

        $normalizedSlug = $slugAliases[strtolower(ltrim($cleanSlug, '/'))] ?? ltrim($cleanSlug, '/');

        $slugVariants = [
            $normalizedSlug,
            $cleanSlug,
            '/' . ltrim($normalizedSlug, '/'),
            ltrim($cleanSlug, '/'),
        ];

        $page = Page::whereIn('slug', $slugVariants)
            ->where('status', 'published')
            ->first();

        if (!$page) {
            return response()->json([
                'status' => 'error',
                'message' => 'Page not found or not published',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'page' => $page,
        ]);
    }
}
