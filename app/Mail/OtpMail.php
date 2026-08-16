<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $otpCode;
    public string $email;

    public function __construct(string $otpCode, string $email)
    {
        $this->otpCode = $otpCode;
        $this->email = $email;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'HealerNet - Your 6-Digit Email Verification OTP',
        );
    }

    public function content(): Content
    {
        $logoUrl = asset('images/logo.png');

        return new Content(
            htmlString: "
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset='utf-8'>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
                    .email-card { max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
                    .header { background: linear-gradient(135deg, #0F382C 0%, #09261E 100%); padding: 30px; text-align: center; border-bottom: 3px solid #D4AF37; }
                    .header img { max-height: 55px; margin-bottom: 8px; }
                    .header h2 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
                    .header p { color: #A3E635; margin: 5px 0 0 0; font-size: 12px; font-weight: 600; text-transform: uppercase; tracking: 1px; }
                    .content { padding: 35px 30px; text-align: center; }
                    .greeting { font-size: 16px; color: #0F382C; font-weight: 600; margin-bottom: 15px; }
                    .message-text { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 25px; }
                    .otp-box { background: linear-gradient(135deg, #0F382C 0%, #165342 100%); border: 2px dashed #D4AF37; border-radius: 16px; padding: 20px 10px; margin: 20px 0; text-align: center; }
                    .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; color: #A3E635; letter-spacing: 12px; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
                    .timer-text { font-size: 12px; color: #cbd5e1; margin-top: 8px; font-weight: 500; }
                    .notice { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 6px; font-size: 12px; color: #92400e; text-align: left; margin-top: 25px; }
                    .footer { background: #071812; padding: 20px; text-align: center; font-size: 11px; color: #64748b; }
                    .footer p { margin: 3px 0; }
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
                        <div class='greeting'>Verification Code Required</div>
                        <p class='message-text'>You are attempting to register or log into your <strong>HealerNet</strong> account. Use the 6-digit One-Time Password (OTP) below to complete your verification.</p>
                        
                        <div class='otp-box'>
                            <div class='otp-code'>{$this->otpCode}</div>
                            <div class='timer-text'>⏱ Valid for 2 Minutes Only</div>
                        </div>

                        <div class='notice'>
                            <strong>🛡️ Security Notice:</strong> Never share this code with anyone. HealerNet staff will never ask for your verification code.
                        </div>
                    </div>
                    <div class='footer'>
                        <p>© 2026 HealerNet Platform. All rights reserved.</p>
                        <p>This is an automated email. Please do not reply directly to this message.</p>
                    </div>
                </div>
            </body>
            </html>
            "
        );
    }

    public function attachments(): array
    {
        return [];
    }
}