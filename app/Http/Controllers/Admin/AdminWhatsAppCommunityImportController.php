<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ConfirmWhatsAppCommunityImportRequest;
use App\Http\Requests\Admin\PreviewWhatsAppCommunityImportRequest;
use App\Models\User;
use App\Models\WhatsAppCommunityImport;
use App\Services\WhatsAppCommunityImportService;
use App\Support\PermissionCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class AdminWhatsAppCommunityImportController extends Controller
{
    use RespondsWithJson;

    /**
     * @var list<string>
     */
    public const REQUIRED_PERMISSIONS = [
        'countries.create',
        'states.create',
        'cities.create',
        'whatsapp-groups.create',
        'whatsapp-groups.edit',
        'community-groups.edit',
    ];

    public function __construct(private readonly WhatsAppCommunityImportService $imports) {}

    public function preview(PreviewWhatsAppCommunityImportRequest $request): JsonResponse
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

            return $this->errorResponse('Unable to read the uploaded file. Upload a valid Excel or CSV file.', null, 422);
        }

        return $this->successResponse('Import preview generated.', $data);
    }

    public function confirm(ConfirmWhatsAppCommunityImportRequest $request): JsonResponse
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

            return $this->errorResponse('Import failed. Existing data was not changed.', null, 500);
        }

        $status = $data['status'] ?? 'queued';
        $message = in_array($status, ['completed', 'completed_with_errors'], true)
            ? 'Import completed successfully.'
            : 'Import queued successfully.';

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

    public function status(Request $request, WhatsAppCommunityImport $whatsappCommunityImport): JsonResponse
    {
        $forbidden = $this->denyUnlessCanImport($request->user());
        if ($forbidden) {
            return $forbidden;
        }

        return $this->successResponse(
            'Import status fetched successfully.',
            $this->imports->importStatus($whatsappCommunityImport)
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

    public function destroy(WhatsAppCommunityImport $whatsappCommunityImport): JsonResponse
    {
        $forbidden = $this->denyUnlessCanImport(request()->user());
        if ($forbidden) {
            return $forbidden;
        }

        $this->imports->deleteHistory($whatsappCommunityImport);

        return $this->successResponse('Import history deleted. Imported locations and WhatsApp groups were not changed.');
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
                    'Forbidden. You do not have permission to import WhatsApp communities.',
                    null,
                    403
                );
            }
        }

        return null;
    }
}
