<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminCategoryController extends Controller
{
    /**
     * List all categories (Step 10)
     */
    public function index(): JsonResponse
    {
        $categories = Category::withCount('whatsappGroups')
            ->orderBy('name')
            ->get();

        return response()->json([
            'status' => 'success',
            'success' => true,
            'data' => $categories
        ]);
    }

    /**
     * Create a new healthcare category
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('categories', 'name')->whereNull('deleted_at')],
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:50',
            'status' => 'required|in:active,inactive',
        ]);

        $validated['icon'] = $validated['icon'] ?? null;
        $validated['description'] = $validated['description'] ?? null;

        $category = Category::create($validated);

        return response()->json([
            'status' => 'success',
            'success' => true,
            'message' => 'Category created successfully.',
            'data' => $category
        ], 201);
    }

    /**
     * Update an existing category
     */
    public function update(Request $request, Category $category): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('categories', 'name')->ignore($category->id)->whereNull('deleted_at')],
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:50',
            'status' => 'required|in:active,inactive',
        ]);

        if (array_key_exists('icon', $validated) && $validated['icon'] === '') {
            $validated['icon'] = null;
        }

        $category->update($validated);

        return response()->json([
            'status' => 'success',
            'success' => true,
            'message' => 'Category updated successfully.',
            'data' => $category
        ]);
    }

    /**
     * Soft delete category (Blocked if references exist)
     */
    public function destroy(Category $category): JsonResponse
    {
        // Strict relational integrity check
        if ($category->whatsappGroups()->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Conflict: Cannot delete this category because it has WhatsApp community groups assigned.'
            ], 409);
        }

        $category->delete();

        return response()->json([
            'status' => 'success',
            'success' => true,
            'message' => 'Category safely deleted.'
        ]);
    }
}
