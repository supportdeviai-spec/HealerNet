<?php

namespace App\Services;

use App\Models\EmailTemplate;
use App\Support\EmailLogo;
use Illuminate\Support\Str;

class TemplateRendererService
{
    public function findBySlug(string $slug): ?EmailTemplate
    {
        return EmailTemplate::query()
            ->where('slug', $slug)
            ->where('is_active', true)
            ->first();
    }

    /**
     * @return array{subject: string, html: string, template_name: string}
     */
    public function render(string $slug, array $variables = []): array
    {
        $template = $this->findBySlug($slug);

        if (!$template) {
            return $this->renderFallback($slug, $variables, true);
        }

        $subject = $this->replaceVariables($template->subject, $variables);
        $innerHtml = $this->formatBody($template->body, $variables, $slug);
        $html = $this->wrapInLayout($subject, $innerHtml, $variables, $slug, true);

        return [
            'subject' => $subject,
            'html' => $html,
            'template_name' => $template->name,
        ];
    }

    /**
     * Preview with optional unsaved subject/body overrides.
     */
    public function preview(string $slug, array $variables = [], ?string $subjectOverride = null, ?string $bodyOverride = null): array
    {
        $template = EmailTemplate::query()->where('slug', $slug)->first();

        if (!$template && !$subjectOverride && !$bodyOverride) {
            return $this->renderFallback($slug, $variables, false);
        }

        $subject = $this->replaceVariables($subjectOverride ?? $template?->subject ?? 'HealerNet', $variables);
        $body = $bodyOverride ?? $template?->body ?? '';
        $innerHtml = $this->formatBody($body, $variables, $slug);
        $html = $this->wrapInLayout($subject, $innerHtml, $variables, $slug, false);

        return [
            'subject' => $subject,
            'html' => $html,
            'template_name' => $template?->name ?? Str::headline($slug),
        ];
    }

    private function replaceVariables(string $text, array $variables): string
    {
        $replacements = [];
        foreach ($variables as $key => $value) {
            if (is_scalar($value) || $value === null) {
                $replacements['{{' . $key . '}}'] = (string) ($value ?? '');
            }
        }

        return strtr($text, $replacements);
    }

    private function formatBody(string $body, array $variables, string $slug): string
    {
        $content = $this->replaceVariables($body, $variables);

        if (str_contains($content, '<') && str_contains($content, '>')) {
            $html = $content;
        } else {
            $paragraphs = array_filter(array_map('trim', preg_split("/\r\n|\r|\n/", $content)));
            $html = implode('', array_map(function ($paragraph) {
                return '<p style="font-size: 15px; color: #334155; line-height: 1.6; margin-bottom: 16px; text-align: left;">'
                    . e($paragraph) . '</p>';
            }, $paragraphs));
        }

        if ($slug === EmailTemplate::SLUG_OTP && !empty($variables['code'])) {
            $code = e((string) $variables['code']);
            if (!str_contains($html, $code)) {
                $html .= $this->otpBoxHtml($code);
            }
        }

        if ($slug === EmailTemplate::SLUG_PASSWORD_RESET && !empty($variables['reset_link'])) {
            $url = e((string) $variables['reset_link']);
            if (!str_contains($html, $url)) {
                $html .= "
                    <div style='text-align: center; margin: 28px 0;'>
                        <a href='{$url}' style='background: #65A30D; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;'>Reset Password</a>
                    </div>
                    <p style='font-size: 13px; color: #64748b; word-break: break-all;'>{$url}</p>
                ";
            }
        }

        return $html;
    }

    private function wrapInLayout(string $subject, string $innerHtml, array $variables, string $slug, bool $forSend = true): string
    {
        $logoUrl = $forSend ? EmailLogo::cidSrc() : EmailLogo::publicUrl();
        $logoImg = EmailLogo::imgTag($logoUrl);
        $safeSubject = e($subject);

        $greeting = '';
        if (!empty($variables['name'])) {
            $greeting = '<p style="font-size: 15px; color: #334155; line-height: 1.6; margin-bottom: 16px; text-align: left;">Hello <strong>'
                . e((string) $variables['name']) . '</strong>,</p>';
        }

        $extraBlocks = '';
        if ($slug === EmailTemplate::SLUG_WELCOME && !empty($variables['groups_html'])) {
            $extraBlocks = (string) $variables['groups_html'];
        }

        return <<<HTML
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 25px 15px; color: #1e293b;">
            <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
                <div style="background: linear-gradient(135deg, #0F382C 0%, #09261E 100%); padding: 35px 25px; text-align: center; border-bottom: 3px solid #D4AF37;">
                    {$logoImg}
                    <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">HealerNet</h2>
                    <p style="color: #A3E635; margin: 6px 0 0 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">Global Network for Evidence-Based Healing</p>
                </div>
                <div style="padding: 35px 30px;">
                    <div style="font-size: 20px; color: #0F382C; font-weight: 700; margin-bottom: 20px; text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px;">{$safeSubject}</div>
                    {$greeting}
                    {$innerHtml}
                    {$extraBlocks}
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px; border-radius: 8px; font-size: 12px; color: #92400e; text-align: left; margin-top: 25px;">
                        <strong>Security notice:</strong> Never share verification codes or passwords. HealerNet staff will never ask for your account password.
                    </div>
                </div>
                <div style="background: #071812; padding: 22px; text-align: center; font-size: 12px; color: #64748b;">
                    <p style="margin: 4px 0;">© 2026 HealerNet Platform. All rights reserved.</p>
                    <p style="margin: 4px 0;">This is an automated email. Please do not reply directly to this message.</p>
                </div>
            </div>
        </body>
        </html>
        HTML;
    }

    private function otpBoxHtml(string $code): string
    {
        return "
            <div style='background: linear-gradient(135deg, #0F382C 0%, #165342 100%); border: 2px dashed #D4AF37; border-radius: 16px; padding: 22px 12px; margin: 25px 0; text-align: center;'>
                <div style='font-family: Courier New, Courier, monospace; font-size: 38px; font-weight: 800; color: #A3E635; letter-spacing: 12px; margin: 0;'>{$code}</div>
                <div style='font-size: 12px; color: #cbd5e1; margin-top: 8px; font-weight: 500;'>Valid for 2 minutes only</div>
            </div>
        ";
    }

    private function renderFallback(string $slug, array $variables, bool $forSend = true): array
    {
        $defaults = [
            EmailTemplate::SLUG_OTP => [
                'name' => 'OTP Verification',
                'subject' => 'Your HealerNet Verification Code: {{code}}',
                'body' => "Use the verification code below to complete your HealerNet registration.\n\nYour code: {{code}}",
            ],
            EmailTemplate::SLUG_WELCOME => [
                'name' => 'Welcome Email',
                'subject' => 'Welcome to HealerNet!',
                'body' => "Thank you for joining HealerNet. Your account is now active.\n\nEmail: {{email}}\nCategory: {{category}}",
            ],
            EmailTemplate::SLUG_PASSWORD_RESET => [
                'name' => 'Password Reset',
                'subject' => 'Reset your HealerNet password',
                'body' => "We received a request to reset your password.\n\nUse the button below to choose a new password.",
            ],
        ];

        $fallback = $defaults[$slug] ?? [
            'name' => Str::headline($slug),
            'subject' => 'HealerNet Notification',
            'body' => 'You have a new message from HealerNet.',
        ];

        $subject = $this->replaceVariables($fallback['subject'], $variables);
        $innerHtml = $this->formatBody($fallback['body'], $variables, $slug);
        $html = $this->wrapInLayout($subject, $innerHtml, $variables, $slug, $forSend);

        return [
            'subject' => $subject,
            'html' => $html,
            'template_name' => $fallback['name'],
        ];
    }
}
