<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Events\UserRegistered;
use App\Models\CommunityGroup;
use App\Models\User;
use App\Models\Role;
use App\Models\OtpCode;
use App\Services\ActivityLogger;
use App\Services\AdminAlertService;
use App\Services\EmailService;
use App\Notifications\Admin\PasswordResetRequestedAdminNotification;
use App\Services\CommunityAssignmentService;
use App\Services\LocationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    protected EmailService $emailService;

    public function __construct(EmailService $emailService)
    {
        $this->emailService = $emailService;
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (Auth::attempt($credentials, $request->boolean('remember'))) {
            if ($request->hasSession()) {
                $request->session()->regenerate();
            }
            /** @var \App\Models\User $user */
            $user = Auth::user();
            if ($user) {
                $user->update(['last_login_at' => now()]);
                // Issue Sanctum Token for Enterprise Standard SPA/Mobile support
                $token = $user->createToken('auth_token')->plainTextToken;

                try {
                    ActivityLogger::log($user->id, 'User Login', 'User logged in successfully', $request);
                } catch (\Throwable $e) {
                    Log::warning('Failed to log activity on login: ' . $e->getMessage());
                }

        $user->load(['role', 'roles', 'category']);

                return response()->json([
                    'status' => 'success',
                    'success' => true,
                    'message' => 'Login successful.',
                    'token' => $token,
                    'user' => $user,
                    'permissions' => $user->permissionSlugs(),
                ]);
            }
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Invalid email or password credentials.',
        ], 401);
    }

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required_without:full_name', 'nullable', 'string', 'max:255'],
            'full_name' => ['required_without:name', 'nullable', 'string', 'max:255'],
            'title' => ['nullable', 'string', 'max:20', 'in:Mr.,Ms.,Mrs.,Dr.,Prof.,Other'],
            'business_name' => ['nullable', 'string', 'max:255'],
            'date_of_birth' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today', 'after_or_equal:1900-01-01'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['nullable', 'string', 'min:8'],
            'mobile' => ['required', 'string', 'unique:users,mobile'],
            'category_id' => ['required', 'uuid', 'exists:categories,id'],
            'country_id' => ['required', 'integer', 'exists:countries,id'],
            'region_id' => ['required_without:state_id', 'integer', 'exists:regions,id'],
            'state_id' => ['required_without:region_id', 'integer', 'exists:regions,id'],
            'city_id' => ['required', 'integer', 'exists:cities,id'],
        ]);

        $validated['region_id'] = $validated['region_id'] ?? $validated['state_id'];
        unset($validated['state_id']);

        // Trim name & email. Title is stored separately from the given name.
        $validated['name'] = trim($validated['name'] ?? $validated['full_name'] ?? '');
        $validated['email'] = trim(strtolower($validated['email']));
        $validated['title'] = !empty($validated['title']) ? $validated['title'] : null;
        $validated['business_name'] = isset($validated['business_name']) ? trim($validated['business_name']) : null;
        $validated['business_name'] = $validated['business_name'] !== '' ? $validated['business_name'] : null;

        if ($validated['name'] === '') {
            return response()->json([
                'status' => 'error',
                'message' => 'Please enter your full name.',
                'errors' => ['name' => ['The full name field is required.']],
            ], 422);
        }

        // Relationship validation: Region belongs to Country (active only)
        $regionValid = \App\Models\Region::where('id', $validated['region_id'])
            ->where('country_id', $validated['country_id'])
            ->where('status', 'active')
            ->exists();
        if (!$regionValid) {
            return response()->json([
                'status' => 'error',
                'message' => 'The selected region does not belong to the selected country or is inactive.'
            ], 422);
        }

        // Relationship validation: City belongs to Region (active only)
        $cityValid = \App\Models\City::where('id', $validated['city_id'])
            ->where('region_id', $validated['region_id'])
            ->where('status', 'active')
            ->exists();
        if (!$cityValid) {
            return response()->json([
                'status' => 'error',
                'message' => 'The selected city does not belong to the selected region or is inactive.'
            ], 422);
        }

        $countryValid = \App\Models\Country::where('id', $validated['country_id'])
            ->where('status', 'active')
            ->exists();
        if (!$countryValid) {
            return response()->json([
                'status' => 'error',
                'message' => 'The selected country is inactive.'
            ], 422);
        }

        // Category validation
        $categoryValid = \App\Models\Category::where('id', $validated['category_id'])
            ->active()
            ->exists();
        if (!$categoryValid) {
            return response()->json([
                'status' => 'error',
                'message' => 'The selected healthcare category is invalid or inactive.'
            ], 422);
        }

        // Security: Ensure Email OTP has been verified
        $emailOtp = OtpCode::where('email', $validated['email'])
            ->where('type', 'email')
            ->whereNotNull('used_at')
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$emailOtp) {
            return response()->json([
                'status' => 'error',
                'message' => 'Email verification is required before completing registration.'
            ], 403);
        }

        // Setup base user role
        $userRole = \App\Models\Role::where('slug', 'user')->first();

        // Generate password if not supplied (passwordless registration flow)
        $rawPassword = !empty($validated['password']) ? $validated['password'] : Str::random(32);

        $user = User::create([
            'title' => $validated['title'] ?? null,
            'name' => $validated['name'],
            'business_name' => $validated['business_name'] ?? null,
            'email' => $validated['email'],
            'mobile' => $validated['mobile'],
            'password' => Hash::make($rawPassword),
            'role_id' => $userRole ? $userRole->id : null,
            'category_id' => $validated['category_id'],
            'country_id' => $validated['country_id'],
            'region_id' => $validated['region_id'],
            'city_id' => $validated['city_id'],
            'email_verified_at' => now(),
            'mobile_verified_at' => now(),
            'is_verified' => true,
        ]);

        if (!empty($validated['date_of_birth'])) {
            $user->profile()->create([
                'date_of_birth' => $validated['date_of_birth'],
            ]);
        }

        // Auto Assignment Logic for WhatsApp Cohort
        if (class_exists(CommunityAssignmentService::class)) {
            $assignmentService = new CommunityAssignmentService();
            $assignmentService->autoAssign($user);
        }

        Auth::login($user);
        $token = $user->createToken('auth_token')->plainTextToken;

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        try {
            ActivityLogger::log($user->id, 'User Registration', 'User registered successfully via OTP', $request);
        } catch (\Throwable $e) {
            Log::warning('Failed to log activity on registration: ' . $e->getMessage());
        }

        try {
            event(new UserRegistered($user));
        } catch (\Throwable $e) {
            Log::warning('Failed to dispatch UserRegistered event: ' . $e->getMessage());
        }

        $user->load(['role', 'category', 'country', 'state', 'city', 'communities', 'whatsappGroups', 'profile']);

        $communityGroups = $this->resolveRegistrationCommunityGroups($user);

        $community = $user->communities->first(fn ($g) => $this->groupWhatsappUrl($g));
        if (!$community) {
            $community = $communityGroups->first(fn ($g) => $this->groupWhatsappUrl($g));
        }

        return response()->json([
            'status' => 'success',
            'success' => true,
            'message' => 'Registration successful.',
            'token' => $token,
            'user' => $user,
            'community' => $community ? [
                'id' => $community->id,
                'name' => $community->name,
                'whatsapp_link' => $this->groupWhatsappUrl($community),
                'whatsapp_url' => $this->groupWhatsappUrl($community),
            ] : null,
            'community_groups' => $communityGroups->map(fn ($group) => [
                'id' => $group->id,
                'name' => $group->name,
                'description' => $group->description,
                'whatsapp_url' => $this->groupWhatsappUrl($group),
                'display_order' => $group->display_order,
                'category_id' => $group->category_id,
            ])->values(),
        ], 201);
    }

    private function resolveRegistrationCommunityGroups(User $user): \Illuminate\Support\Collection
    {
        $locationService = app(LocationService::class);
        $cityGroups = collect($locationService->listCommunityGroupsForPublic((int) $user->city_id))
            ->map(fn (array $group) => (object) $group)
            ->filter(fn ($group) => (bool) $this->groupWhatsappUrl($group));

        $assigned = $user->whatsappGroups
            ->filter(fn ($group) => ($group->status ?? 'active') === 'active')
            ->filter(fn ($group) => (bool) $this->groupWhatsappUrl($group));

        return $cityGroups->merge($assigned)->unique('id')->values();
    }

    private function groupWhatsappUrl(object $group): ?string
    {
        $url = $group->whatsapp_url ?? $group->whatsapp_link ?? null;

        return $url ? trim((string) $url) : null;
    }

    public function sendEmailOtp(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);
        $email = trim(strtolower($request->input('email')));
        
        $userExists = User::where('email', $email)->exists();
        if ($userExists) {
            return response()->json(['status' => 'error', 'message' => 'Email already registered. Please sign in or use another email.'], 400);
        }

        // Cooldown rate limit: Prevent requesting another OTP within 60 seconds
        $recentOtp = OtpCode::where('email', $email)
            ->where('type', 'email')
            ->where('created_at', '>', now()->subSeconds(60))
            ->first();

        if ($recentOtp) {
            return response()->json([
                'status' => 'error',
                'message' => 'Please wait 60 seconds before requesting a new OTP.'
            ], 429);
        }

        // Generate 4-Digit OTP Code
        $code = str_pad((string)random_int(0, 9999), 4, '0', STR_PAD_LEFT);
        
        OtpCode::updateOrCreate(
            ['email' => $email, 'type' => 'email'],
            ['code' => $code, 'expires_at' => now()->addMinutes(10), 'used_at' => null]
        );

        try {
            $this->emailService->sendOtpEmail($email, $code);
        } catch (\Exception $e) {
            Log::error('Failed to send Email OTP: ' . $e->getMessage());
        }

        return response()->json(['status' => 'success', 'message' => '4-digit OTP sent successfully to your email address.']);
    }

    public function sendRegistrationOtp(Request $request): JsonResponse
    {
        return $this->sendEmailOtp($request);
    }

    public function verifyEmailOtp(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'otp' => 'required|string|size:4'
        ]);
        
        $email = trim(strtolower($request->input('email')));
        $otp = trim($request->input('otp'));

        $otpRecord = OtpCode::where('email', $email)
            ->where('type', 'email')
            ->first();

        if (!$otpRecord || !$otpRecord->isValid($otp)) {
            return response()->json(['status' => 'error', 'message' => 'Invalid or expired OTP. Please try again or request a new OTP.'], 400);
        }
        
        $otpRecord->update(['used_at' => now()]);

        return response()->json(['status' => 'success', 'message' => '✓ Email Verified']);
    }

    public function verifyRegistrationOtp(Request $request): JsonResponse
    {
        return $this->verifyEmailOtp($request);
    }

    public function sendMobileOtp(Request $request): JsonResponse
    {
        $request->validate(['mobile' => 'required|string']);
        $mobile = $request->input('mobile');
        
        $userExists = User::where('mobile', $mobile)->exists();
        if ($userExists) {
            return response()->json(['status' => 'error', 'message' => 'Mobile number already registered.'], 400);
        }

        $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        
        OtpCode::updateOrCreate(
            ['email' => $mobile, 'type' => 'mobile'],
            ['code' => $code, 'expires_at' => now()->addMinutes(5), 'used_at' => null]
        );

        try {
            if (class_exists(\App\Services\SmsService::class)) {
                $smsSent = \App\Services\SmsService::sendOtp($mobile, $code);
                if (!$smsSent) {
                    return response()->json(['status' => 'error', 'message' => 'Unable to send SMS. Please check your provider settings.'], 500);
                }
            } else {
                 Log::info("Mock Mobile OTP Sent to {$mobile}: {$code}");
            }
        } catch (\Exception $e) {
            Log::error('Failed to send Mobile OTP: ' . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => 'Unable to send OTP. Please try again.'], 500);
        }

        return response()->json(['status' => 'success', 'message' => 'OTP sent successfully to your mobile number.']);
    }

    public function verifyMobileOtp(Request $request): JsonResponse
    {
        $request->validate(['mobile' => 'required|string', 'otp' => 'required|string']);
        
        $otpRecord = OtpCode::where('email', $request->input('mobile'))->where('type', 'mobile')->first();
        if (!$otpRecord || !$otpRecord->isValid($request->input('otp'))) {
            return response()->json(['status' => 'error', 'message' => 'Invalid or expired OTP.'], 400);
        }
        
        $otpRecord->update(['used_at' => now()]);

        return response()->json(['status' => 'success', 'message' => 'Mobile Verified']);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user) {
            try {
                if (method_exists($user, 'currentAccessToken') && $user->currentAccessToken()) {
                    $user->currentAccessToken()->delete();
                }
            } catch (\Throwable $e) {
                Log::warning('Failed to delete access token on logout: ' . $e->getMessage());
            }
        }

        Auth::guard('web')->logout();
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }
        return response()->json([
            'status' => 'success',
            'success' => true,
            'message' => 'Logged out successfully.'
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);
        
        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'No account was found with this email address.'
            ], 404);
        }

        try {
            $status = Password::broker()->sendResetLink(
                $request->only('email')
            );

            if ($status === Password::RESET_LINK_SENT) {
                try {
                    AdminAlertService::notifyAllAdmins(new PasswordResetRequestedAdminNotification($user));
                } catch (\Throwable $e) {
                    Log::warning('Failed to notify admins of password reset request: ' . $e->getMessage());
                }

                return response()->json([
                    'status' => 'success',
                    'message' => 'Password reset link has been sent to your email.'
                ]);
            }

            return response()->json([
                'status' => 'error',
                'message' => __($status) ?: 'Unable to send reset link. Please try again.'
            ], 400);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Password reset email error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Mail delivery service error: ' . $e->getMessage()
            ], 500);
        }
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:8|confirmed',
        ]);

        $status = Password::broker()->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill([
                    'password' => Hash::make($password)
                ])->setRememberToken(Str::random(60));

                $user->save();
                event(new PasswordReset($user));
            }
        );

        return $status === Password::PASSWORD_RESET
                    ? response()->json(['status' => 'success', 'message' => 'Password reset successfully.'])
                    : response()->json(['status' => 'error', 'message' => 'Invalid token or email.'], 400);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json([
                'status' => 'error',
                'success' => false,
                'message' => 'Unauthenticated.'
            ], 401);
        }

        return response()->json([
            'status' => 'success',
            'success' => true,
            'user' => $user->load(['role', 'roles', 'category', 'country', 'state', 'city', 'communities']),
            'permissions' => $user->permissionSlugs(),
        ]);
    }
}