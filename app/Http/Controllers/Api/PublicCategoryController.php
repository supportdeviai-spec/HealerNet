<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Services\WhatsAppGroupResolver;
use Illuminate\Http\JsonResponse;

class PublicCategoryController extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly WhatsAppGroupResolver $groupResolver)
    {
    }

    public function index(): JsonResponse
    {
        $categories = $this->groupResolver->registrationEligibleCategories()
            ->map(fn ($category) => $category->only(['id', 'name', 'description', 'icon', 'sort_order']))
            ->values();

        return $this->successResponse('Categories fetched successfully.', $categories);
    }
}
