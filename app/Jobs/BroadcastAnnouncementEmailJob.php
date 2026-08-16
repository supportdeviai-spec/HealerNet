<?php

namespace App\Jobs;

use App\Mail\AnnouncementMail;
use App\Models\EmailLog;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class BroadcastAnnouncementEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600;

    public function __construct(
        public string $subject,
        public string $body,
    ) {}

    public function handle(): void
    {
        User::query()
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->where('status', 'active')
            ->orderBy('id')
            ->chunkById(100, function ($users) {
                foreach ($users as $user) {
                    try {
                        Mail::to($user)->send(new AnnouncementMail($user, $this->subject, $this->body));

                        EmailLog::create([
                            'recipient' => $user->email,
                            'subject' => $this->subject,
                            'status' => 'sent',
                            'sent_at' => now(),
                        ]);
                    } catch (\Throwable $exception) {
                        Log::error('Announcement email failed', [
                            'user_id' => $user->id,
                            'email' => $user->email,
                            'error' => $exception->getMessage(),
                        ]);

                        EmailLog::create([
                            'recipient' => $user->email,
                            'subject' => $this->subject,
                            'status' => 'failed',
                            'error_message' => $exception->getMessage(),
                        ]);
                    }
                }
            });
    }
}
