<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Models\Category;
use Illuminate\Http\JsonResponse;

class PublicCategoryController extends Controller
{
    use RespondsWithJson;

    public function index(): JsonResponse
    {
        $categories = Category::active()
            ->select('id', 'name', 'description', 'icon', 'sort_order')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return $this->successResponse('Categories fetched successfully.', $categories);
    }
}
