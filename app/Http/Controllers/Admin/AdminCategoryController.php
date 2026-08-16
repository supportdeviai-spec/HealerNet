<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

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
            'name' => 'required|string|max:255|unique:categories',
            'description' => 'required|string',
            'icon' => 'nullable|string|max:50',
            'status' => 'required|in:active,inactive',
        ]);

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
            'name' => 'required|string|max:255|unique:categories,name,' . $category->id,
            'description' => 'required|string',
            'icon' => 'nullable|string|max:50',
            'status' => 'required|in:active,inactive',
        ]);

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
