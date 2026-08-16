<?php

use App\Http\Controllers\PageController;
use Illuminate\Support\Facades\Route;

Route::get('/terms-blade', [PageController::class, 'terms']);
Route::get('/privacy-blade', [PageController::class, 'privacy']);

Route::get('/reset-password/{token}', function () {
    return view('welcome');
})->name('password.reset');

Route::get('/banner/{file}', function (string $file) {
    $safeName = basename($file);
    $path = public_path('banner/' . $safeName);

    if (!is_file($path)) {
        abort(404);
    }

    $extension = strtolower(pathinfo($safeName, PATHINFO_EXTENSION));

    return response()->file($path, [
        'Content-Type' => match ($extension) {
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'webp' => 'image/webp',
            'gif' => 'image/gif',
            default => 'application/octet-stream',
        },
        'Cache-Control' => 'public, max-age=604800',
    ]);
})->where('file', '[\\w\\.-]+');

Route::get('/{any?}', function () {
    return view('welcome');
})->where('any', '.*');