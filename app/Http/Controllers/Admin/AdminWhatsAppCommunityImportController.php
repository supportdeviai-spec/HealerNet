<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ConfirmWhatsAppCommunityImportRequest;
use App\Http\Requests\Admin\PreviewWhatsAppCommunityImportRequest;
use App\Models\User;
use App\Services\WhatsAppCommunityImportService;
use App\Support\PermissionCatalog;
use Illuminate\Http\JsonResponse;
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

        return $this->successResponse('Import completed successfully.', $data);
    }

    public function history(): JsonResponse
    {
        $forbidden = $this->denyUnlessCanImport(request()->user());
        if ($forbidden) {
            return $forbidden;
        }

        $rows = $this->imports->history()->map(function ($import) {
            return [
                'id' => $import->id,
                'admin' => $import->user?->name,
                'file_name' => $import->file_name,
                'status' => $import->status,
                'imported_at' => optional($import->imported_at)?->toIso8601String(),
                'total_rows' => $import->total_rows,
                'created' => $import->created_count,
                'updated' => $import->updated_count,
                'skipped' => $import->skipped_count,
                'errors' => $import->error_count,
                'conflicts' => $import->conflict_count,
            ];
        });

        return $this->successResponse('Import history fetched successfully.', $rows);
    }

    public function template()
    {
        $forbidden = $this->denyUnlessCanImport(request()->user());
        if ($forbidden) {
            return $forbidden;
        }

        return $this->imports->templateDownload();
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
