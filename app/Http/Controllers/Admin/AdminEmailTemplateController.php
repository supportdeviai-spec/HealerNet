<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\EmailTemplate;
use App\Services\MailDispatcherService;
use App\Services\TemplateRendererService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AdminEmailTemplateController extends Controller
{
    public function index(): JsonResponse
    {
        $templates = EmailTemplate::query()->orderBy('name')->get();

        return response()->json([
            'status' => 'success',
            'data' => $templates,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $template = EmailTemplate::find($id);

        if (!$template) {
            return response()->json(['status' => 'error', 'message' => 'Template not found.'], 404);
        }

        return response()->json(['status' => 'success', 'data' => $template]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:100|regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/|unique:email_templates,slug',
            'subject' => 'required|string|max:255',
            'description' => 'nullable|string|max:500',
            'body' => 'required|string|max:50000',
            'variables' => 'nullable|array',
            'variables.*' => 'string|max:50',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $slug = strtolower(trim($request->input('slug')));

        if (in_array($slug, $this->reservedSlugs(), true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'This slug is reserved for a system template.',
            ], 422);
        }

        $template = EmailTemplate::create([
            'name' => trim($request->input('name')),
            'slug' => $slug,
            'subject' => trim($request->input('subject')),
            'description' => $request->input('description'),
            'body' => $request->input('body'),
            'variables' => $request->input('variables', ['name', 'email']),
            'is_active' => $request->boolean('is_active', true),
            'is_system' => false,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Template created successfully.',
            'data' => $template,
        ], 201);
    }

    public function destroy(int $id): JsonResponse
    {
        $template = EmailTemplate::find($id);

        if (!$template) {
            return response()->json(['status' => 'error', 'message' => 'Template not found.'], 404);
        }

        if ($template->is_system) {
            return response()->json([
                'status' => 'error',
                'message' => 'System templates cannot be deleted. You can deactivate them instead.',
            ], 403);
        }

        $template->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Template deleted successfully.',
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $template = EmailTemplate::find($id);

        if (!$template) {
            return response()->json(['status' => 'error', 'message' => 'Template not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'subject' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:500',
            'body' => 'sometimes|string|max:50000',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $template->fill($validator->validated());
        $template->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Template updated successfully.',
            'data' => $template->fresh(),
        ]);
    }

    public function previewDraft(Request $request, TemplateRendererService $renderer): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'slug' => 'required|string|max:100',
            'subject' => 'required|string|max:255',
            'body' => 'required|string|max:50000',
            'variables' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $slug = strtolower(trim($request->input('slug')));
        $variables = $this->sampleVariablesFor($slug, $request->input('variables', []));

        $rendered = $renderer->preview(
            $slug,
            $variables,
            $request->input('subject'),
            $request->input('body'),
        );

        return response()->json([
            'status' => 'success',
            'data' => $rendered,
        ]);
    }

    public function preview(Request $request, int $id, TemplateRendererService $renderer): JsonResponse
    {
        $template = EmailTemplate::find($id);

        if (!$template) {
            return response()->json(['status' => 'error', 'message' => 'Template not found.'], 404);
        }

        $sampleVariables = $this->sampleVariablesFor($template->slug, $request->input('variables', []));

        $rendered = $renderer->preview(
            $template->slug,
            $sampleVariables,
            $request->input('subject', $template->subject),
            $request->input('body', $template->body),
        );

        return response()->json([
            'status' => 'success',
            'data' => $rendered,
        ]);
    }

    public function testSend(Request $request, int $id, MailDispatcherService $dispatcher, TemplateRendererService $renderer): JsonResponse
    {
        $template = EmailTemplate::find($id);

        if (!$template) {
            return response()->json(['status' => 'error', 'message' => 'Template not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'recipient' => 'required|email',
            'subject' => 'nullable|string|max:255',
            'body' => 'nullable|string|max:50000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error.',
                'errors' => $validator->errors(),
            ], 422);
        }

        if (!$template->is_active) {
            return response()->json([
                'status' => 'error',
                'message' => 'Template is inactive. Activate it before sending a test email.',
            ], 422);
        }

        $variables = $this->sampleVariablesFor($template->slug, $request->input('variables', []));

        if ($request->filled('subject') || $request->filled('body')) {
            $sent = $dispatcher->sendRenderedNow(
                $request->input('recipient'),
                $renderer->preview(
                    $template->slug,
                    $variables,
                    $request->input('subject', $template->subject),
                    $request->input('body', $template->body),
                )
            );
        } else {
            $sent = $dispatcher->sendTemplateNow($template->slug, $request->input('recipient'), $variables);
        }

        if (!$sent) {
            $detail = trim((string) $dispatcher->getLastError());

            return response()->json([
                'status' => 'error',
                'message' => $detail !== ''
                    ? 'Failed to send test email: ' . $detail
                    : 'Failed to send test email. Check SMTP settings and email logs.',
            ], 500);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Test email sent to ' . $request->input('recipient'),
        ]);
    }

    private function sampleVariablesFor(string $slug, array $overrides = []): array
    {
        $defaults = match ($slug) {
            EmailTemplate::SLUG_OTP => [
                'name' => 'Dr. Sample User',
                'email' => 'sample@healernet.org',
                'code' => '1234',
            ],
            EmailTemplate::SLUG_WELCOME => [
                'name' => 'Dr. Sample User',
                'email' => 'sample@healernet.org',
                'category' => 'Yoga & Movement',
                'location' => 'Bengaluru, Karnataka, India',
                'login_url' => url('/login'),
                'group_name' => 'Bengaluru Yoga Circle',
                'group_url' => 'https://chat.whatsapp.com/sample-group',
                'groups_html' => "<div style='background:#f0fdf4;padding:16px;border-radius:12px;margin-top:16px;'><strong>Your WhatsApp community group</strong><br><strong>Bengaluru Yoga Circle</strong></div>",
            ],
            EmailTemplate::SLUG_PASSWORD_RESET => [
                'name' => 'Dr. Sample User',
                'email' => 'sample@healernet.org',
                'reset_link' => url('/reset-password/sample-token?email=sample@healernet.org'),
            ],
            EmailTemplate::SLUG_ANNOUNCEMENT => [
                'name' => 'Dr. Sample User',
                'subject' => 'HealerNet Platform Update',
                'message' => 'This is a sample announcement message from the HealerNet admin team.',
            ],
            default => [
                'name' => 'HealerNet Member',
                'email' => 'sample@healernet.org',
            ],
        };

        return array_merge($defaults, $overrides);
    }

    private function reservedSlugs(): array
    {
        return [
            EmailTemplate::SLUG_OTP,
            EmailTemplate::SLUG_WELCOME,
            EmailTemplate::SLUG_PASSWORD_RESET,
            EmailTemplate::SLUG_ANNOUNCEMENT,
        ];
    }
}
