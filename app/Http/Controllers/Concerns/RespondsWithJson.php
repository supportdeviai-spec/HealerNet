<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\JsonResponse;

trait RespondsWithJson
{
    protected function successResponse(
        string $message,
        mixed $data = null,
        array $meta = [],
        int $status = 200
    ): JsonResponse {
        $payload = [
            'status' => 'success',
            'success' => true,
            'message' => $message,
        ];

        if ($data !== null) {
            $payload['data'] = $data;
        }

        if ($meta !== []) {
            $payload['meta'] = $meta;
        }

        return response()->json($payload, $status);
    }

    protected function errorResponse(
        string $message,
        mixed $errors = null,
        int $status = 422
    ): JsonResponse {
        $payload = [
            'status' => 'error',
            'success' => false,
            'message' => $message,
        ];

        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        return response()->json($payload, $status);
    }
}
