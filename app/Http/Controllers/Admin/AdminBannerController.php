<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use App\Support\BannerPages;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class AdminBannerController extends Controller
{
    /**
     * Display a listing of all banners.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Banner::query();

        if ($request->has('page') && !empty($request->page)) {
            $query->forPage($request->page);
        }

        if ($request->has('status') && $request->status !== '') {
            $query->where('is_active', filter_var($request->status, FILTER_VALIDATE_BOOLEAN));
        }

        $banners = $query->ordered()->get();

        return response()->json([
            'status' => 'success',
            'data' => $banners,
        ]);
    }

    /**
     * Store a newly created banner.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'page' => 'required|string|' . BannerPages::validationRule(),
            'is_active' => 'nullable|boolean',
            'image' => 'required|image|mimes:jpg,jpeg,png,webp|max:20480',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $imagePath = $this->storeBannerImage($request->file('image'));

        $banner = Banner::create([
            'title' => $request->input('title'),
            'description' => $request->input('description'),
            'page' => BannerPages::normalize($request->input('page')) ?? strtolower($request->input('page')),
            'is_active' => $request->has('is_active') ? filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN) : true,
            'image' => $imagePath,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Banner created successfully.',
            'data' => $banner,
        ], 201);
    }

    /**
     * Display the specified banner.
     */
    public function show(int $id): JsonResponse
    {
        $banner = Banner::find($id);

        if (!$banner) {
            return response()->json([
                'status' => 'error',
                'message' => 'Banner not found.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $banner,
        ]);
    }

    /**
     * Update the specified banner.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $banner = Banner::find($id);

        if (!$banner) {
            return response()->json([
                'status' => 'error',
                'message' => 'Banner not found.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'page' => 'nullable|string|' . BannerPages::validationRule(),
            'is_active' => 'nullable|boolean',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:20480',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error.',
                'errors' => $validator->errors(),
            ], 422);
        }

        if ($request->hasFile('image')) {
            $this->deleteStoredImage($banner->image);
            $banner->image = $this->storeBannerImage($request->file('image'));
        }

        if ($request->has('title')) {
            $banner->title = $request->input('title');
        }
        if ($request->has('description')) {
            $banner->description = $request->input('description');
        }
        if ($request->has('page')) {
            $banner->page = BannerPages::normalize($request->input('page')) ?? strtolower($request->input('page'));
        }
        if ($request->has('is_active')) {
            $banner->is_active = filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN);
        }

        $banner->save();
        $banner->refresh();

        return response()->json([
            'status' => 'success',
            'message' => 'Banner updated successfully.',
            'data' => $banner,
        ]);
    }

    /**
     * Remove the specified banner.
     */
    public function destroy(int $id): JsonResponse
    {
        $banner = Banner::find($id);

        if (!$banner) {
            return response()->json([
                'status' => 'error',
                'message' => 'Banner not found.',
            ], 404);
        }

        $this->deleteStoredImage($banner->image);
        $banner->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Banner deleted successfully.',
        ]);
    }

    /**
     * Toggle status of the specified banner.
     */
    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $banner = Banner::find($id);

        if (!$banner) {
            return response()->json([
                'status' => 'error',
                'message' => 'Banner not found.',
            ], 404);
        }

        if ($request->has('is_active')) {
            $banner->is_active = filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN);
        } else {
            $banner->is_active = !$banner->is_active;
        }

        $banner->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Banner status updated successfully.',
            'data' => $banner,
        ]);
    }

    /**
     * Store on the public disk, then publish under /banner/uploads so nginx/Vite can serve it.
     */
    private function storeBannerImage(UploadedFile $file): string
    {
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'png');
        if ($extension === 'jpeg') {
            $extension = 'jpg';
        }
        $filename = Str::uuid()->toString() . '.' . $extension;
        $stored = $file->storeAs('banners', $filename, 'public');

        if (!$stored || !Storage::disk('public')->exists($stored)) {
            throw new \RuntimeException('Failed to store banner image.');
        }

        $storagePath = Storage::disk('public')->path($stored);
        $publicDir = public_path('banner/uploads');
        $publicPath = $publicDir . DIRECTORY_SEPARATOR . $filename;

        try {
            File::ensureDirectoryExists($publicDir, 0777);
            @chmod($publicDir, 0777);
            if (is_file($storagePath)) {
                File::copy($storagePath, $publicPath);
                @chmod($publicPath, 0644);
            }
        } catch (\Throwable) {
            // /storage fallback below still works once nginx aliases it.
        }

        if (is_file($publicPath)) {
            return '/banner/uploads/' . $filename;
        }

        return $stored;
    }

    /**
     * Delete uploaded banner files (keep shared seed assets under /banner/*.png).
     */
    private function deleteStoredImage(?string $image): void
    {
        if (!$image) {
            return;
        }

        $normalized = str_replace('\\', '/', $image);
        $relative = ltrim($normalized, '/');

        // Seed assets like /banner/login-banner.png — never delete.
        if (str_starts_with($relative, 'banner/') && !str_starts_with($relative, 'banner/uploads/')) {
            return;
        }

        if (str_starts_with($relative, 'banner/uploads/')) {
            $publicFile = public_path($relative);
            if (is_file($publicFile)) {
                @unlink($publicFile);
            }
            // Mirrored copy may also live on the public disk.
            if (Storage::disk('public')->exists($relative)) {
                Storage::disk('public')->delete($relative);
            }
            // Also remove banners/{same-filename} if present.
            $legacy = 'banners/' . basename($relative);
            if (Storage::disk('public')->exists($legacy)) {
                Storage::disk('public')->delete($legacy);
            }

            return;
        }

        // Public-disk uploads (banners/xyz.png)
        if (!str_starts_with($normalized, '/')) {
            if (Storage::disk('public')->exists($normalized)) {
                Storage::disk('public')->delete($normalized);
            }
        }
    }
}
