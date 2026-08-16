<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class SmsService
{
    /**
     * Send an OTP to a mobile number using an SMS Provider (e.g., Twilio, MSG91, AWS SNS)
     *
     * @param string $phone The formatted mobile number (e.g. +919876543210)
     * @param string $otpCode The 6-digit OTP
     * @return bool Returns true if SMS was sent successfully
     */
    public static function sendOtp(string $phone, string $otpCode): bool
    {
        // ------------------------------------------------------------
        // EXAMPLE: Twilio Integration
        // ------------------------------------------------------------
        /*
        $sid    = env('TWILIO_SID');
        $token  = env('TWILIO_TOKEN');
        $from   = env('TWILIO_FROM');

        $response = Http::withBasicAuth($sid, $token)
            ->asForm()
            ->post("https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json", [
                'To' => $phone,
                'From' => $from,
                'Body' => "Your HealerNet Verification Code is: {$otpCode}. It is valid for 2 minutes."
            ]);

        if ($response->successful()) {
            return true;
        }
        
        Log::error('Twilio SMS Error: ' . $response->body());
        return false;
        */

        // ------------------------------------------------------------
        // Default Mock Implementation (Logs to storage/logs/laravel.log)
        // ------------------------------------------------------------
        Log::info("SMS Mock Service: Sending OTP [{$otpCode}] to [{$phone}]");
        
        // Return true to simulate a successful send for now.
        return true; 
    }
}
