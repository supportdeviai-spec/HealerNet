<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ResetPasswordEmail extends Mailable
{
    use Queueable, SerializesModels;

    public User $user;
    public string $token;

    public function __construct(User $user, string $token)
    {
        $this->user = $user;
        $this->token = $token;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Reset Your Password - HealerNet',
        );
    }

    public function content(): Content
    {
        // Build the reset URL exactly as the SPA expects it
        // Our web.php has the password.reset route, so we generate the URL.
        $resetUrl = url(route('password.reset', [
            'token' => $this->token,
            'email' => $this->user->getEmailForPasswordReset(),
        ], false));

        return new Content(
            htmlString: "
            <div style='font-family: Arial, sans-serif; background-color: #FAF8F5; padding: 30px; color: #1e293b;'>
                <div style='max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 30px; border: 1px solid #D4AF37;'>
                    <div style='text-align: center; margin-bottom: 20px;'>
                        <h1 style='color: #0F382C; font-size: 28px; margin-bottom: 5px;'>HealerNet Security</h1>
                        <p style='color: #65A30D; font-weight: bold;'>Password Reset Request</p>
                    </div>
                    <p>Hello <strong>{$this->user->name}</strong>,</p>
                    <p>We received a request to reset the password for your HealerNet account associated with this email address.</p>
                    <div style='background: #0F382C; color: #ffffff; padding: 20px; border-radius: 12px; margin: 20px 0;'>
                        <h3 style='margin: 0 0 10px 0; color: #D4AF37;'>Action Required:</h3>
                        <p style='margin: 5px 0; font-size: 14px;'>Click the button below to securely set a new password. This link will expire in 60 minutes.</p>
                    </div>
                    <div style='text-align: center; margin-top: 30px; margin-bottom: 30px;'>
                        <a href='{$resetUrl}' style='background: #65A30D; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;'>Reset Password</a>
                    </div>
                    <p style='font-size: 13px; color: #64748b;'>If you did not request this password reset, no further action is required on your part and your account remains secure.</p>
                    <hr style='border: none; border-top: 1px solid #e2e8f0; margin-top: 30px;' />
                    <p style='font-size: 12px; color: #94a3b8; text-align: center;'>© " . date('Y') . " HealerNet Platform. All rights reserved.</p>
                </div>
            </div>
            "
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
