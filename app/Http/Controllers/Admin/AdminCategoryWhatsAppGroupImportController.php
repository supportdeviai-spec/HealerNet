<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ConfirmCategoryWhatsAppGroupImportRequest;
use App\Http\Requests\Admin\PreviewCategoryWhatsAppGroupImportRequest;
use App\Models\User;
use App\Models\WhatsAppCommunityImport;
use App\Services\CategoryWhatsAppGroupImportService;
use App\Support\PermissionCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class AdminCategoryWhatsAppGroupImportController extends Controller
{
    use RespondsWithJson;

    /**
     * @var list<string>
     */
    public const REQUIRED_PERMISSIONS = [
        'whatsapp-groups.create',
    ];

    public function __construct(private readonly CategoryWhatsAppGroupImportService $imports) {}

    public function preview(PreviewCategoryWhatsAppGroupImportRequest $request): JsonResponse
    {
        $forbidden = $this->denyUnlessCanImport($request->user());
        if ($forbidden) {
            return $forbidden;
        }

        try {
            $data = $this->imports->preview($request->file('file'), (int) $request->user()->id);
        } catch (InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), null, 422);
        } catch (\Throwable $e) {
            report($e);

            return $this->errorResponse('Unable to read the uploaded file. Upload a valid Excel file.', null, 422);
        }

        return $this->successResponse('Import preview generated.', $data);
    }

    public function confirm(ConfirmCategoryWhatsAppGroupImportRequest $request): JsonResponse
    {
        $forbidden = $this->denyUnlessCanImport($request->user());
        if ($forbidden) {
            return $forbidden;
        }

        try {
            $data = $this->imports->confirm(
                $request->validated('import_token'),
                (int) $request->user()->id
            );
        } catch (InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), null, 422);
        } catch (\Throwable $e) {
            report($e);

            $message = $e->getMessage() ?: 'Import failed. Existing data was not changed.';

            return $this->errorResponse($message, null, 500);
        }

        $status = $data['status'] ?? 'queued';
        $message = match ($status) {
            'completed', 'completed_with_errors' => $status === 'completed_with_errors'
                ? 'Import completed with errors.'
                : 'WhatsApp groups imported successfully.',
            'failed' => $data['error_message'] ?? 'Import failed.',
            default => 'Import queued successfully.',
        };

        return $this->successResponse($message, $data);
    }

    public function previewStatus(Request $request, string $token): JsonResponse
    {
        $forbidden = $this->denyUnlessCanImport($request->user());
        if ($forbidden) {
            return $forbidden;
        }

        try {
            $data = $this->imports->previewStatus($token, (int) $request->user()->id);
        } catch (InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), null, 422);
        }

        return $this->successResponse('Import preview status fetched successfully.', $data);
    }

    public function status(Request $request, WhatsAppCommunityImport $categoryWhatsappGroupImport): JsonResponse
    {
        $forbidden = $this->denyUnlessCanImport($request->user());
        if ($forbidden) {
            return $forbidden;
        }

        if ($categoryWhatsappGroupImport->import_type !== WhatsAppCommunityImport::TYPE_CATEGORY_GROUPS) {
            return $this->errorResponse('Import record not found.', null, 404);
        }

        return $this->successResponse(
            'Import status fetched successfully.',
            $this->imports->importStatus($categoryWhatsappGroupImport)
        );
    }

    public function history(Request $request): JsonResponse
    {
        $forbidden = $this->denyUnlessCanImport($request->user());
        if ($forbidden) {
            return $forbidden;
        }

        $limit = (int) $request->input('limit', 0);
        if ($limit > 0) {
            $rows = $this->imports->history(min($limit, 50))->map(fn ($import) => $this->formatHistory($import));

            return $this->successResponse('Import history fetched successfully.', $rows);
        }

        $page = $this->imports->paginateHistory((int) $request->input('per_page', 15));

        return $this->successResponse(
            'Import history fetched successfully.',
            $page->getCollection()->map(fn ($import) => $this->formatHistory($import))->values(),
            [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ]
        );
    }

    public function destroy(WhatsAppCommunityImport $categoryWhatsappGroupImport): JsonResponse
    {
        $forbidden = $this->denyUnlessCanImport(request()->user());
        if ($forbidden) {
            return $forbidden;
        }

        if ($categoryWhatsappGroupImport->import_type !== WhatsAppCommunityImport::TYPE_CATEGORY_GROUPS) {
            return $this->errorResponse('Import record not found.', null, 404);
        }

        $this->imports->deleteHistory($categoryWhatsappGroupImport);

        return $this->successResponse('Import history deleted. Imported WhatsApp groups were not changed.');
    }

    public function template()
    {
        $forbidden = $this->denyUnlessCanImport(request()->user());
        if ($forbidden) {
            return $forbidden;
        }

        return $this->imports->templateDownload();
    }

    private function formatHistory(WhatsAppCommunityImport $import): array
    {
        return [
            'id' => $import->id,
            'admin' => $import->user?->name,
            'file_name' => $import->file_name,
            'status' => $import->status,
            'imported_at' => optional($import->imported_at)?->toIso8601String(),
            'total_rows' => $import->total_rows,
            'processed_rows' => $import->processed_rows,
            'success_rows' => $import->success_rows,
            'failed_rows' => $import->failed_rows,
            'progress' => $import->progress,
            'created' => $import->created_count,
            'updated' => $import->updated_count,
            'skipped' => $import->skipped_count,
            'errors' => $import->error_count,
            'conflicts' => $import->conflict_count,
        ];
    }

    private function denyUnlessCanImport(?User $user): ?JsonResponse
    {
        if (! $user) {
            return $this->errorResponse('Unauthenticated.', null, 401);
        }

        if ($user->isAdmin()) {
            return null;
        }

        foreach (self::REQUIRED_PERMISSIONS as $slug) {
            if (! $user->hasPermissionTo($slug, PermissionCatalog::GUARD)) {
                return $this->errorResponse(
                    'Forbidden. You do not have permission to import WhatsApp groups.',
                    null,
                    403
                );
            }
        }

        return null;
    }
}
