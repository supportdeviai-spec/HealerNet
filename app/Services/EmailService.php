<?php

namespace App\Services;

use App\Models\EmailTemplate;
use App\Models\User;
use App\Models\WhatsAppGroup;
use Illuminate\Support\Facades\Log;

class EmailService
{
    public function __construct(
        protected MailDispatcherService $mailDispatcher,
        protected CommunityAssignmentService $communityAssignment,
    ) {}

    public function sendWelcomeEmail(User $user): bool
    {
        $user->loadMissing(['country', 'region', 'city', 'category', 'categories', 'role', 'whatsappGroups']);

        $sent = $this->mailDispatcher->sendTemplate(
            EmailTemplate::SLUG_WELCOME,
            $user->email,
            $this->buildWelcomeVariables($user),
            queue: false,
        );

        if (!$sent) {
            Log::warning('Welcome email failed to send.', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $this->mailDispatcher->getLastError(),
            ]);
        }

        return $sent;
    }

    public function sendOtpEmail(string $email, string $code, ?string $name = null): bool
    {
        return $this->mailDispatcher->sendTemplate(
            EmailTemplate::SLUG_OTP,
            $email,
            [
                'name' => $name ?: 'Member',
                'email' => $email,
                'code' => $code,
            ],
            queue: false,
        );
    }

    public function sendPasswordResetEmail(User $user, string $resetUrl): bool
    {
        return $this->mailDispatcher->sendTemplate(
            EmailTemplate::SLUG_PASSWORD_RESET,
            $user->email,
            [
                'name' => $user->name,
                'email' => $user->email,
                'reset_link' => $resetUrl,
            ],
            queue: false,
        );
    }

    public function buildWelcomeVariables(User $user): array
    {
        $user->loadMissing(['country', 'region', 'city', 'category', 'categories', 'role', 'whatsappGroups']);

        $assignedGroups = $this->communityAssignment->welcomeCommunityGroups($user)
            ->map(fn (WhatsAppGroup $group) => $this->formatGroupForEmail($group->loadMissing('category')));

        $locationLine = collect([
            $user->city?->name,
            $user->region?->name,
            $user->country?->name,
        ])->filter()->implode(', ');

        $categoryNames = $user->categories->pluck('name')
            ->whenEmpty(fn ($names) => $user->category?->name ? collect([$user->category->name]) : $names)
            ->implode(', ');

        $primaryGroup = $assignedGroups->first();

        return [
            'name' => $user->name,
            'email' => $user->email,
            'category' => $categoryNames ?: 'General',
            'location' => $locationLine ?: 'Not specified',
            'login_url' => url('/login'),
            'group_name' => $primaryGroup['name'] ?? '',
            'group_url' => $primaryGroup['whatsapp_url'] ?? '',
            'groups_html' => $this->buildWelcomeGroupsHtml($assignedGroups, $locationLine, $categoryNames),
        ];
    }

    private function formatGroupForEmail(WhatsAppGroup $group): array
    {
        return [
            'name' => $group->name,
            'whatsapp_url' => $group->whatsapp_url,
        ];
    }

    private function buildWelcomeGroupsHtml($groups, string $locationLine, ?string $categoryName = null): string
    {
        if ($groups->isEmpty()) {
            return "<p style='font-size: 14px; color: #475569; margin-top: 16px;'>No WhatsApp community group is available for your selected categories yet. We will notify you when a group opens.</p>";
        }

        $categoryLine = $categoryName
            ? "<p style='margin: 0 0 12px;'><strong>Categories:</strong> " . e($categoryName) . "</p>"
            : '';

        $rows = $groups->map(function ($group) {
            $url = e(is_array($group) ? ($group['whatsapp_url'] ?? '') : ($group->whatsapp_url ?? ''));
            $name = e(is_array($group) ? ($group['name'] ?? 'WhatsApp Group') : ($group->name ?? 'WhatsApp Group'));
            $button = $url
                ? "<a href='{$url}' style='background: #25D366; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;'>Join WhatsApp Group</a>"
                : '';

            return "
                <tr>
                    <td style='color: #0F382C; font-size: 16px; font-weight: bold; vertical-align: middle; padding-top: 8px;'>{$name}</td>
                    <td align='right' style='vertical-align: middle; white-space: nowrap; padding-top: 8px;'>{$button}</td>
                </tr>
            ";
        })->implode('');

        return "
            <div style='background: #f0fdf4; color: #166534; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;'>
                <h3 style='margin: 0 0 10px 0;'>Your WhatsApp community group" . ($groups->count() > 1 ? 's' : '') . "</h3>
                <p style='margin: 0 0 6px;'><strong>Location:</strong> " . e($locationLine) . "</p>
                {$categoryLine}
                <table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0'>
                    {$rows}
                </table>
            </div>
        ";
    }
}
