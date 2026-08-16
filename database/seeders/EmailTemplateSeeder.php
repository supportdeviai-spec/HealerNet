<?php

namespace Database\Seeders;

use App\Models\EmailTemplate;
use Illuminate\Database\Seeder;

class EmailTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'name' => 'OTP Verification',
                'slug' => EmailTemplate::SLUG_OTP,
                'subject' => 'Your HealerNet Verification Code: {{code}}',
                'description' => 'Sent when a user requests email verification during registration.',
                'body' => "You are registering on HealerNet. Enter this One-Time Password to verify your email address.\n\nYour verification code is: {{code}}\n\nThis code expires in 2 minutes.",
                'variables' => ['name', 'email', 'code'],
                'is_active' => true,
                'is_system' => true,
            ],
            [
                'name' => 'Welcome Email',
                'slug' => EmailTemplate::SLUG_WELCOME,
                'subject' => 'Welcome to HealerNet, {{name}}!',
                'description' => 'Sent immediately after successful registration.',
                'body' => "<p>Thank you for joining <strong>HealerNet</strong>. Your account has been created and verified.</p><p><strong>Email:</strong> {{email}}<br><strong>Category:</strong> {{category}}<br><strong>Location:</strong> {{location}}</p><p>Your assigned WhatsApp community group link is included below — join that group to connect with practitioners in your city.</p>",
                'variables' => ['name', 'email', 'category', 'location', 'login_url', 'group_name', 'group_url', 'groups_html'],
                'is_active' => true,
                'is_system' => true,
            ],
            [
                'name' => 'Password Reset',
                'slug' => EmailTemplate::SLUG_PASSWORD_RESET,
                'subject' => 'Reset your HealerNet password',
                'description' => 'Sent when a user requests a password reset link.',
                'body' => "We received a request to reset the password for your HealerNet account.\n\nClick the reset button below to choose a new password. This link expires in 60 minutes.\n\nIf you did not request this, you can safely ignore this email.",
                'variables' => ['name', 'email', 'reset_link'],
                'is_active' => true,
                'is_system' => true,
            ],
            [
                'name' => 'Platform Announcement',
                'slug' => EmailTemplate::SLUG_ANNOUNCEMENT,
                'subject' => '{{subject}}',
                'description' => 'Optional wrapper for admin broadcast emails.',
                'body' => "{{message}}",
                'variables' => ['name', 'subject', 'message'],
                'is_active' => true,
                'is_system' => true,
            ],
        ];

        foreach ($templates as $template) {
            EmailTemplate::updateOrCreate(
                ['slug' => $template['slug']],
                $template
            );
        }
    }
}
