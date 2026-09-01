<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Response;
use App\Http\Controllers\Admin\AdminAnalyticsController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\AdminLogController;
use App\Http\Controllers\Admin\AdminPractitionerController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\PractitionerController;
use App\Http\Controllers\User\DashboardController;
use App\Http\Controllers\User\ProfileController;
use App\Http\Controllers\Admin\AdminCategoryController;
use App\Http\Controllers\Admin\AdminCommunityController;
use App\Http\Controllers\Admin\AdminPageController;
use App\Http\Controllers\Admin\AdminEmailController;
use App\Http\Controllers\Admin\AdminEmailTemplateController;
use App\Http\Controllers\Admin\AdminNotificationController;

use App\Http\Controllers\User\UserNotificationController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\BannerController;
use App\Http\Controllers\Admin\AdminBannerController;
use App\Http\Controllers\Admin\AdminCityController;
use App\Http\Controllers\Admin\AdminCommunityGroupController;
use App\Http\Controllers\Admin\AdminWhatsAppCommunityImportController;
use App\Http\Controllers\Admin\AdminWhatsAppGroupController;
use App\Http\Controllers\Admin\AdminCountryController;
use App\Http\Controllers\Admin\AdminRegionController;
use App\Http\Controllers\Admin\AdminRoleController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\PublicCategoryController;
use App\Http\Controllers\Api\PublicLocationController;
use App\Http\Controllers\WhatsAppCommunityController;
use App\Http\Controllers\CmsPageController;

/*
|--------------------------------------------------------------------------
| API Routes (Laravel automatically prefixes all routes with /api)
|--------------------------------------------------------------------------
*/

Route::get('/health', HealthController::class);

// Auth Routes (/api/auth/* and /api/v1/auth/*)
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/send-otp', [AuthController::class, 'sendRegistrationOtp']);
    Route::post('/verify-otp', [AuthController::class, 'verifyRegistrationOtp']);
    Route::post('/otp/send', [AuthController::class, 'sendRegistrationOtp']);
    Route::post('/otp/verify', [AuthController::class, 'verifyRegistrationOtp']);
    Route::post('/send-registration-otp', [AuthController::class, 'sendRegistrationOtp']);
    Route::post('/verify-registration-otp', [AuthController::class, 'verifyRegistrationOtp']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

Route::prefix('email')->group(function () {
    Route::post('/send-otp', [AuthController::class, 'sendEmailOtp']);
    Route::post('/verify-otp', [AuthController::class, 'verifyEmailOtp']);
    Route::post('/send-test', [AdminEmailController::class, 'sendTestEmail']);
});

Route::get('/whatsapp-community', [WhatsAppCommunityController::class, 'matchCommunity']);
Route::get('/whatsapp-community/match', [WhatsAppCommunityController::class, 'matchCommunity']);
Route::get('/whatsapp-community/groups', [WhatsAppCommunityController::class, 'cityGroups']);

// Public categories (registration)
Route::get('/categories', [PublicCategoryController::class, 'index']);

// Public Location APIs
Route::get('/countries', [PublicLocationController::class, 'countries']);
Route::get('/countries/{country}/regions', [PublicLocationController::class, 'regions']);
Route::get('/regions/{region}/cities', [PublicLocationController::class, 'cities']);
Route::get('/cities/{city}/community-groups', [PublicLocationController::class, 'communityGroups']);

// Legacy Location Routes (/api/locations/*)
Route::prefix('locations')->group(function () {
    Route::get('/countries', [LocationController::class, 'countries']);
    Route::get('/countries/{countryId}/states', [LocationController::class, 'states']);
    Route::get('/countries/{countryId}/regions', [LocationController::class, 'regions']);
    Route::get('/states/{stateId}/cities', [LocationController::class, 'cities']);
    Route::get('/regions/{regionId}/cities', [LocationController::class, 'cities']);
    Route::get('/states', [LocationController::class, 'states']);
    Route::get('/regions', [LocationController::class, 'regions']);
    Route::get('/cities', [LocationController::class, 'cities']);
});

// Public Banner Route (/api/banners/{page})
Route::get('/banners/{page}', [BannerController::class, 'getForPage']);

// Public Dynamic CMS Page Route (/api/pages/{slug})
Route::get('/pages/{slug}', [CmsPageController::class, 'show'])->where('slug', '[A-Za-z0-9\-_/]+');

// Admin Control Panel API Routes (/api/admin/*)
Route::prefix('admin')->middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/dashboard', [AdminDashboardController::class, 'index'])->middleware('permission:dashboard.view');
    Route::get('/analytics', [AdminAnalyticsController::class, 'index'])->middleware('permission:dashboard.view');

    Route::middleware('permission:notifications.send')->group(function () {
        Route::get('/notifications/inbox', [AdminNotificationController::class, 'inbox']);
        Route::patch('/notifications/{id}/read', [AdminNotificationController::class, 'markRead']);
        Route::post('/notifications/read-all', [AdminNotificationController::class, 'markAllRead']);
        Route::get('/notifications/recipients-count', [AdminNotificationController::class, 'recipientCount']);
        Route::post('/notifications/email-all', [AdminNotificationController::class, 'emailAll']);
    });

    Route::middleware('permission:email_templates.view')->group(function () {
        Route::get('/email-templates', [AdminEmailTemplateController::class, 'index']);
        Route::get('/email-templates/{id}', [AdminEmailTemplateController::class, 'show']);
    });
    Route::post('/email-templates', [AdminEmailTemplateController::class, 'store'])->middleware('permission:email_templates.edit');
    Route::post('/email-templates/preview-draft', [AdminEmailTemplateController::class, 'previewDraft'])->middleware('permission:email_templates.view');
    Route::put('/email-templates/{id}', [AdminEmailTemplateController::class, 'update'])->middleware('permission:email_templates.edit');
    Route::delete('/email-templates/{id}', [AdminEmailTemplateController::class, 'destroy'])->middleware('permission:email_templates.edit');
    Route::post('/email-templates/{id}/preview', [AdminEmailTemplateController::class, 'preview'])->middleware('permission:email_templates.view');
    Route::post('/email-templates/{id}/test-send', [AdminEmailTemplateController::class, 'testSend'])->middleware('permission:email_templates.test_send');

    Route::middleware('permission:users.view')->group(function () {
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::get('/users/{user}', [AdminUserController::class, 'show']);
        Route::get('/practitioners', [AdminPractitionerController::class, 'index']);
    });
    Route::post('/users', [AdminUserController::class, 'store'])->middleware('permission:users.create');
    Route::put('/users/{user}', [AdminUserController::class, 'update'])->middleware('permission:users.edit');
    Route::delete('/users/{user}', [AdminUserController::class, 'destroy'])->middleware('permission:users.delete');
    Route::post('/users/bulk', [AdminUserController::class, 'bulkAction'])->middleware('permission:users.delete');
    Route::post('/practitioners/{user}/approve', [AdminPractitionerController::class, 'approve'])->middleware('permission:users.edit');

    Route::middleware('permission:categories.view')->get('/categories', [AdminCategoryController::class, 'index']);
    Route::post('/categories', [AdminCategoryController::class, 'store'])->middleware('permission:categories.create');
    Route::put('/categories/{category}', [AdminCategoryController::class, 'update'])->middleware('permission:categories.edit');
    Route::delete('/categories/{category}', [AdminCategoryController::class, 'destroy'])->middleware('permission:categories.delete');

    Route::middleware('permission:whatsapp-groups.view')->group(function () {
        Route::get('/communities', [AdminWhatsAppGroupController::class, 'index']);
        Route::get('/whatsapp-groups', [AdminWhatsAppGroupController::class, 'index']);
        Route::get('/whatsapp-groups/{whatsappGroup}', [AdminWhatsAppGroupController::class, 'show']);
    });
    Route::post('/communities', [AdminWhatsAppGroupController::class, 'store'])->middleware('permission:whatsapp-groups.create');
    Route::post('/whatsapp-groups', [AdminWhatsAppGroupController::class, 'store'])->middleware('permission:whatsapp-groups.create');
    Route::put('/communities/{whatsappGroup}', [AdminWhatsAppGroupController::class, 'update'])->middleware('permission:whatsapp-groups.edit');
    Route::put('/whatsapp-groups/{whatsappGroup}', [AdminWhatsAppGroupController::class, 'update'])->middleware('permission:whatsapp-groups.edit');
    Route::delete('/communities/{whatsappGroup}', [AdminWhatsAppGroupController::class, 'destroy'])->middleware('permission:whatsapp-groups.delete');
    Route::delete('/whatsapp-groups/{whatsappGroup}', [AdminWhatsAppGroupController::class, 'destroy'])->middleware('permission:whatsapp-groups.delete');

    Route::get('/whatsapp-community-imports/template', [AdminWhatsAppCommunityImportController::class, 'template']);
    Route::get('/whatsapp-community-imports/preview/{token}', [AdminWhatsAppCommunityImportController::class, 'previewStatus']);
    Route::get('/whatsapp-community-imports/{whatsappCommunityImport}/status', [AdminWhatsAppCommunityImportController::class, 'status']);
    Route::get('/whatsapp-community-imports', [AdminWhatsAppCommunityImportController::class, 'history']);
    Route::post('/whatsapp-community-imports/preview', [AdminWhatsAppCommunityImportController::class, 'preview']);
    Route::post('/whatsapp-community-imports/confirm', [AdminWhatsAppCommunityImportController::class, 'confirm']);
    Route::delete('/whatsapp-community-imports/{whatsappCommunityImport}', [AdminWhatsAppCommunityImportController::class, 'destroy']);

    Route::middleware('permission:cms.view')->get('/pages', [AdminPageController::class, 'index']);
    Route::middleware('permission:cms.view')->get('/pages/{page}', [AdminPageController::class, 'show']);
    Route::post('/pages', [AdminPageController::class, 'store'])->middleware('permission:cms.create');
    Route::put('/pages/{page}', [AdminPageController::class, 'update'])->middleware('permission:cms.edit');
    Route::delete('/pages/{page}', [AdminPageController::class, 'destroy'])->middleware('permission:cms.delete');

    Route::middleware('permission:banners.view')->group(function () {
        Route::get('/banners', [AdminBannerController::class, 'index']);
        Route::get('/banners/{id}', [AdminBannerController::class, 'show']);
    });
    Route::post('/banners', [AdminBannerController::class, 'store'])->middleware('permission:banners.create');
    Route::post('/banners/{id}', [AdminBannerController::class, 'update'])->middleware('permission:banners.edit');
    Route::put('/banners/{id}', [AdminBannerController::class, 'update'])->middleware('permission:banners.edit');
    Route::delete('/banners/{id}', [AdminBannerController::class, 'destroy'])->middleware('permission:banners.delete');
    Route::patch('/banners/{id}/status', [AdminBannerController::class, 'toggleStatus'])->middleware('permission:banners.edit');

    Route::middleware('permission:countries.view')->group(function () {
        Route::get('/countries', [AdminCountryController::class, 'index']);
        Route::get('/countries/{country}', [AdminCountryController::class, 'show']);
    });
    Route::post('/countries', [AdminCountryController::class, 'store'])->middleware('permission:countries.create');
    Route::put('/countries/{country}', [AdminCountryController::class, 'update'])->middleware('permission:countries.edit');
    Route::patch('/countries/{country}/status', [AdminCountryController::class, 'updateStatus'])->middleware('permission:countries.edit');
    Route::delete('/countries/{country}', [AdminCountryController::class, 'destroy'])->middleware('permission:countries.delete');

    Route::middleware('permission:states.view')->group(function () {
        Route::get('/regions', [AdminRegionController::class, 'index']);
        Route::get('/regions/{region}', [AdminRegionController::class, 'show']);
    });
    Route::post('/regions', [AdminRegionController::class, 'store'])->middleware('permission:states.create');
    Route::put('/regions/{region}', [AdminRegionController::class, 'update'])->middleware('permission:states.edit');
    Route::patch('/regions/{region}/status', [AdminRegionController::class, 'updateStatus'])->middleware('permission:states.edit');
    Route::delete('/regions/{region}', [AdminRegionController::class, 'destroy'])->middleware('permission:states.delete');

    Route::middleware('permission:cities.view')->group(function () {
        Route::get('/cities', [AdminCityController::class, 'index']);
        Route::get('/cities/{city}', [AdminCityController::class, 'show']);
    });
    Route::post('/cities', [AdminCityController::class, 'store'])->middleware('permission:cities.create');
    Route::put('/cities/{city}', [AdminCityController::class, 'update'])->middleware('permission:cities.edit');
    Route::patch('/cities/{city}/status', [AdminCityController::class, 'updateStatus'])->middleware('permission:cities.edit');
    Route::delete('/cities/{city}', [AdminCityController::class, 'destroy'])->middleware('permission:cities.delete');

    Route::middleware('permission:community-groups.view')->group(function () {
        Route::get('/community-groups', [AdminCommunityGroupController::class, 'index']);
        Route::get('/community-groups/{communityGroup}', [AdminCommunityGroupController::class, 'show']);
        Route::get('/cities/{city}/available-whatsapp-groups', [AdminCommunityGroupController::class, 'availableForCity']);
    });
    Route::post('/community-groups', [AdminCommunityGroupController::class, 'store'])->middleware('permission:community-groups.edit');
    Route::put('/community-groups/{communityGroup}', [AdminCommunityGroupController::class, 'update'])->middleware('permission:community-groups.edit');
    Route::patch('/community-groups/{communityGroup}/status', [AdminCommunityGroupController::class, 'updateStatus'])->middleware('permission:community-groups.edit');
    Route::delete('/community-groups/{communityGroup}', [AdminCommunityGroupController::class, 'destroy'])->middleware('permission:community-groups.delete');

    Route::get('/permissions', [AdminRoleController::class, 'permissions'])->middleware('permission:permissions.view');
    Route::get('/roles', [AdminRoleController::class, 'index'])->middleware('permission:roles.view');
    Route::get('/roles/{role}', [AdminRoleController::class, 'show'])->middleware('permission:roles.view');
    Route::get('/roles/{role}/permissions', [AdminRoleController::class, 'rolePermissions'])->middleware('permission:permissions.view');
    Route::post('/roles', [AdminRoleController::class, 'store'])->middleware('permission:roles.create');
    Route::put('/roles/{role}', [AdminRoleController::class, 'update'])->middleware('permission:roles.edit');
    Route::put('/roles/{role}/permissions', [AdminRoleController::class, 'updatePermissions'])->middleware('permission:permissions.assign');
    Route::delete('/roles/{role}', [AdminRoleController::class, 'destroy'])->middleware('permission:roles.delete');
});

// Practitioners API Routes (/api/practitioners/*)
Route::prefix('practitioners')->middleware(['auth:sanctum', 'practitioner'])->group(function () {
    Route::get('/', [PractitionerController::class, 'index']);
    Route::get('/{id}', [PractitionerController::class, 'show']);
    Route::post('/apply', [PractitionerController::class, 'apply']);
});
