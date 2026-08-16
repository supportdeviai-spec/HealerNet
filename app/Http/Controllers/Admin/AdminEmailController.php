<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use App\Models\EmailLog;

class AdminEmailController extends Controller
{
    /**
     * Send a test email via configured SMTP (e.g. Mailtrap) wrapped in HealerNet HTML Template
     */
    public function sendTestEmail(Request $request)
    {
        $recipient = $request->input('recipient') ?: $request->json('recipient') ?: 'admin@healernet.org';
        $subject = $request->input('subject') ?: $request->json('subject') ?: 'HealerNet Test Email';
        $body = $request->input('body') ?: $request->json('body') ?: 'This is a test email sent from HealerNet Admin Dashboard.';
        $templateName = $request->input('template_name') ?: $request->json('template_name') ?: 'Email Template';

        $logoUrl = asset('images/logo.png');

        // Extract 6-digit OTP code if present in body
        $hasCode = preg_match('/\b\d{6}\b/', $body, $matches);
        $codeBoxHtml = '';
        if ($hasCode) {
            $code = $matches[0];
            $codeBoxHtml = "
                <div style='background: linear-gradient(135deg, #0F382C 0%, #165342 100%); border: 2px dashed #D4AF37; border-radius: 16px; padding: 22px 12px; margin: 25px 0; text-align: center;'>
                    <div style='font-family: Courier New, Courier, monospace; font-size: 38px; font-weight: 800; color: #A3E635; letter-spacing: 12px; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);'>{$code}</div>
                    <div style='font-size: 12px; color: #cbd5e1; margin-top: 8px; font-weight: 500;'>⏱ Valid for 2 Minutes Only</div>
                </div>";
        }

        // Format body into paragraphs or preserve custom HTML if present
        if (str_contains($body, '<') && str_contains($body, '>')) {
            $formattedContent = $body;
        } else {
            $paragraphs = array_filter(array_map('trim', explode("\n", $body)));
            $formattedContent = implode('', array_map(function($p) {
                return "<p style='font-size: 15px; color: #334155; line-height: 1.6; margin-bottom: 16px; text-align: left;'>".e($p)."</p>";
            }, $paragraphs));
        }

        $htmlContent = "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 25px 15px; color: #1e293b; }
                .email-card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
                .header { background: linear-gradient(135deg, #0F382C 0%, #09261E 100%); padding: 35px 25px; text-align: center; border-bottom: 3px solid #D4AF37; }
                .header img { max-height: 55px; margin-bottom: 10px; }
                .header h2 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }
                .header p { color: #A3E635; margin: 6px 0 0 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; }
                .content { padding: 35px 30px; text-align: center; }
                .template-title { font-size: 20px; color: #0F382C; font-weight: 700; margin-bottom: 20px; text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; }
                .notice { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px; border-radius: 8px; font-size: 12px; color: #92400e; text-align: left; margin-top: 25px; }
                .footer { background: #071812; padding: 22px; text-align: center; font-size: 12px; color: #64748b; }
                .footer p { margin: 4px 0; }
            </style>
        </head>
        <body>
            <div class='email-card'>
                <div class='header'>
                    <img src='{$logoUrl}' alt='HealerNet Logo' onerror=\"this.style.display='none'\">
                    <h2>HealerNet</h2>
                    <p>Global Network for Evidence-Based Healing</p>
                </div>
                <div class='content'>
                    <div class='template-title'>".e($subject)."</div>
                    {$formattedContent}
                    {$codeBoxHtml}
                    <div class='notice'>
                        <strong>🛡️ Security Notice:</strong> Never share verification codes or private tokens with anyone. HealerNet staff will never ask for your account password.
                    </div>
                </div>
                <div class='footer'>
                    <p>© 2026 HealerNet Platform. All rights reserved.</p>
                    <p>This is an automated administrative email. Please do not reply directly to this message.</p>
                </div>
            </div>
        </body>
        </html>
        ";

        try {
            Mail::html($htmlContent, function ($message) use ($recipient, $subject) {
                $message->to($recipient)
                        ->subject($subject);
            });

            try {
                EmailLog::create([
                    'recipient' => $recipient,
                    'subject' => $subject,
                    'status' => 'sent',
                    'sent_at' => now(),
                ]);
            } catch (\Exception $e) {
                Log::warning("Could not write to email_logs table: " . $e->getMessage());
            }

            Log::info("Test HTML email sent via SMTP to {$recipient} for template: {$templateName}");

            return response()->json([
                'status' => 'success',
                'success' => true,
                'message' => "Beautiful HTML email template for '{$templateName}' successfully sent to {$recipient} via Mailtrap!",
            ]);
        } catch (\Exception $e) {
            Log::error("SMTP Mail Send Error: " . $e->getMessage());

            try {
                EmailLog::create([
                    'recipient' => $recipient,
                    'subject' => $subject,
                    'status' => 'failed',
                    'error_message' => $e->getMessage(),
                ]);
            } catch (\Exception $ex) {}

            return response()->json([
                'status' => 'error',
                'success' => false,
                'message' => "Failed to send email via SMTP: " . $e->getMessage(),
            ], 500);
        }
    }
}
