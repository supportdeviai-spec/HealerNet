<?php

namespace App\Services;

use App\Support\EmailLogo;

class AnnouncementEmailBuilder
{
    public static function build(string $subject, string $body, ?string $recipientName = null): string
    {
        $logoImg = EmailLogo::imgTag(EmailLogo::cidSrc());
        $safeSubject = e($subject);
        $greeting = $recipientName
            ? '<p style="font-size: 15px; color: #334155; line-height: 1.6; margin-bottom: 16px; text-align: left;">Hello <strong>' . e($recipientName) . '</strong>,</p>'
            : '';

        if (str_contains($body, '<') && str_contains($body, '>')) {
            $formattedContent = $body;
        } else {
            $paragraphs = array_filter(array_map('trim', preg_split("/\r\n|\r|\n/", $body)));
            $formattedContent = implode('', array_map(function ($paragraph) {
                return '<p style="font-size: 15px; color: #334155; line-height: 1.6; margin-bottom: 16px; text-align: left;">' . e($paragraph) . '</p>';
            }, $paragraphs));
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
                <div style="padding: 35px 30px; text-align: center;">
                    <div style="font-size: 20px; color: #0F382C; font-weight: 700; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px;">{$safeSubject}</div>
                    {$greeting}
                    {$formattedContent}
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px; border-radius: 8px; font-size: 12px; color: #92400e; text-align: left; margin-top: 25px;">
                        <strong>Notice:</strong> This is an official announcement from the HealerNet team.
                    </div>
                </div>
                <div style="background: #071812; padding: 22px; text-align: center; font-size: 12px; color: #64748b;">
                    <p style="margin: 4px 0;">© 2026 HealerNet Platform. All rights reserved.</p>
                    <p style="margin: 4px 0;">Please do not reply directly to this message.</p>
                </div>
            </div>
        </body>
        </html>
        HTML;
    }
}
