<?php

namespace App\Services;

use App\Models\EmailTemplate;
use App\Models\User;
use App\Models\WhatsAppGroup;

class EmailService
{
    public function __construct(
        protected MailDispatcherService $mailDispatcher,
        protected CommunityAssignmentService $communityAssignment,
    ) {}

    public function sendWelcomeEmail(User $user): bool
    {
        $user->loadMissing(['country', 'region', 'city', 'category', 'role']);

        return $this->mailDispatcher->sendTemplate(
            EmailTemplate::SLUG_WELCOME,
            $user->email,
            $this->buildWelcomeVariables($user),
            queue: true,
        );
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
        $user->loadMissing(['country', 'region', 'city', 'category', 'role', 'whatsappGroups']);

        $assignedGroup = $this->communityAssignment->welcomeCommunityGroup($user);
        if ($assignedGroup) {
            $assignedGroup->loadMissing('category');
        }
        $groups = $assignedGroup
            ? collect([$this->formatGroupForEmail($assignedGroup)])
            : collect();

        $locationLine = collect([
            $user->city?->name,
            $user->region?->name,
            $user->country?->name,
        ])->filter()->implode(', ');

        $categoryName = $assignedGroup?->category?->name
            ?? $user->category?->name;

        return [
            'name' => $user->name,
            'email' => $user->email,
            'category' => $categoryName ?? 'General',
            'location' => $locationLine ?: 'Not specified',
            'login_url' => url('/login'),
            'group_name' => $assignedGroup?->name ?? '',
            'group_url' => $assignedGroup?->whatsapp_url ?? '',
            'groups_html' => $this->buildWelcomeGroupsHtml($groups, $locationLine, $categoryName),
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
            return "<p style='font-size: 14px; color: #475569; margin-top: 16px;'>No WhatsApp community group is available for your city yet. We will notify you when a group opens.</p>";
        }

        $group = $groups->first();
        $url = e(is_array($group) ? ($group['whatsapp_url'] ?? '') : ($group->whatsapp_url ?? ''));
        $name = e(is_array($group) ? ($group['name'] ?? 'WhatsApp Group') : ($group->name ?? 'WhatsApp Group'));
        $button = $url
            ? "<a href='{$url}' style='background: #25D366; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;'>Join WhatsApp Group</a>"
            : '';

        $categoryLine = $categoryName
            ? "<p style='margin: 0 0 12px;'><strong>Category:</strong> " . e($categoryName) . "</p>"
            : '';

        return "
            <div style='background: #f0fdf4; color: #166534; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;'>
                <h3 style='margin: 0 0 10px 0;'>Your WhatsApp community group</h3>
                <p style='margin: 0 0 6px;'><strong>Location:</strong> " . e($locationLine) . "</p>
                {$categoryLine}
                <table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0'>
                    <tr>
                        <td style='color: #0F382C; font-size: 16px; font-weight: bold; vertical-align: middle; padding-top: 4px;'>{$name}</td>
                        <td align='right' style='vertical-align: middle; white-space: nowrap; padding-top: 4px;'>{$button}</td>
                    </tr>
                </table>
            </div>
        ";
    }
}
