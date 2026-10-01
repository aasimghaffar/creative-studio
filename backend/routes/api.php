<?php

declare(strict_types=1);

/**
 * API route map. Returns the configured Router to the front controller.
 * Future phases (users, tools, credits, billing…) register new groups here.
 */

use App\Controllers\Admin\AdminAiProviderController;
use App\Controllers\Admin\AdminContentController;
use App\Controllers\Admin\AdminEmailController;
use App\Controllers\Admin\AdminFileController;
use App\Controllers\Admin\AdminGeneralController;
use App\Controllers\Admin\AdminNotificationSettingController;
use App\Controllers\Admin\AdminOverviewController;
use App\Controllers\Admin\AdminPaymentSettingController;
use App\Controllers\Admin\AdminSecurityController;
use App\Controllers\Admin\AdminSupportController;
use App\Controllers\Admin\AdminCreditSettingController;
use App\Controllers\Admin\AdminPaymentController;
use App\Controllers\Admin\AdminPlanController;
use App\Controllers\Admin\AdminReportController;
use App\Controllers\Admin\AdminStorageController;
use App\Controllers\Admin\AdminAiToolController;
use App\Controllers\Admin\AdminUserController;
use App\Controllers\AiCatalogController;
use App\Controllers\AiAvatarController;
use App\Controllers\AiDescribeController;
use App\Controllers\AiFlyerController;
use App\Controllers\AiImageController;
use App\Controllers\AiLogoController;
use App\Controllers\AiTattooController;
use App\Controllers\AuthController;
use App\Controllers\BillingCheckoutController;
use App\Controllers\BillingController;
use App\Controllers\WebhookController;
use App\Controllers\ContentController;
use App\Controllers\PlatformController;
use App\Controllers\DashboardController;
use App\Controllers\FavoriteController;
use App\Controllers\FileController;
use App\Controllers\HistoryController;
use App\Controllers\ProfileController;
use App\Controllers\SupportController;
use App\Controllers\SettingsController;
use App\Controllers\HealthController;
use App\Controllers\NotificationController;
use App\Core\Router;
use App\Middleware\AdminMiddleware;
use App\Middleware\AuthMiddleware;

$router = new Router();

$router->group('/api/v1', function (Router $r): void {
    $r->get('/health', [HealthController::class, 'index']);

    // ---- Authentication ----
    $r->post('/auth/register', [AuthController::class, 'register']);
    $r->post('/auth/login', [AuthController::class, 'login']);
    $r->post('/auth/refresh-token', [AuthController::class, 'refresh']);
    $r->post('/auth/refresh', [AuthController::class, 'refresh']); // legacy alias
    $r->post('/auth/verify-email', [AuthController::class, 'verifyEmail']);
    $r->post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
    $r->post('/auth/reset-password', [AuthController::class, 'resetPassword']);

    $r->get('/auth/me', [AuthController::class, 'me'], [AuthMiddleware::class]);
    $r->post('/auth/logout', [AuthController::class, 'logout'], [AuthMiddleware::class]);
    $r->post('/auth/resend-verification', [AuthController::class, 'resendVerification'], [AuthMiddleware::class]);

    // ---- AI: Logo Generator (template for all future tools) ----
    $r->get('/ai/tools', [AiCatalogController::class, 'index'], [AuthMiddleware::class]);
    $r->get('/ai/logo/config', [AiLogoController::class, 'config'], [AuthMiddleware::class]);
    $r->get('/ai/logo/history', [AiLogoController::class, 'history'], [AuthMiddleware::class]);
    $r->post('/ai/logo/generate', [AiLogoController::class, 'generate'], [AuthMiddleware::class]);
    $r->post('/ai/logo/favorite', [AiLogoController::class, 'favorite'], [AuthMiddleware::class]);
    $r->post('/ai/logo/regenerate', [AiLogoController::class, 'regenerate'], [AuthMiddleware::class]);
    $r->get('/ai/logo/{id}', [AiLogoController::class, 'show'], [AuthMiddleware::class]);
    $r->get('/ai/avatar/config', [AiAvatarController::class, 'config'], [AuthMiddleware::class]);
    $r->get('/ai/avatar/history', [AiAvatarController::class, 'history'], [AuthMiddleware::class]);
    $r->post('/ai/avatar/generate', [AiAvatarController::class, 'generate'], [AuthMiddleware::class]);
    $r->post('/ai/avatar/favorite', [AiAvatarController::class, 'favorite'], [AuthMiddleware::class]);
    $r->post('/ai/avatar/regenerate', [AiAvatarController::class, 'regenerate'], [AuthMiddleware::class]);
    $r->get('/ai/avatar/{id}', [AiAvatarController::class, 'show'], [AuthMiddleware::class]);
    $r->get('/ai/tattoo/config', [AiTattooController::class, 'config'], [AuthMiddleware::class]);
    $r->get('/ai/tattoo/history', [AiTattooController::class, 'history'], [AuthMiddleware::class]);
    $r->post('/ai/tattoo/generate', [AiTattooController::class, 'generate'], [AuthMiddleware::class]);
    $r->post('/ai/tattoo/favorite', [AiTattooController::class, 'favorite'], [AuthMiddleware::class]);
    $r->post('/ai/tattoo/regenerate', [AiTattooController::class, 'regenerate'], [AuthMiddleware::class]);
    $r->get('/ai/tattoo/{id}', [AiTattooController::class, 'show'], [AuthMiddleware::class]);
    $r->delete('/ai/logo/{id}', [AiLogoController::class, 'destroy'], [AuthMiddleware::class]);
    $r->delete('/ai/avatar/{id}', [AiAvatarController::class, 'destroy'], [AuthMiddleware::class]);
    $r->delete('/ai/tattoo/{id}', [AiTattooController::class, 'destroy'], [AuthMiddleware::class]);
    $r->get('/ai/image/config', [AiImageController::class, 'config'], [AuthMiddleware::class]);
    $r->get('/ai/image/history', [AiImageController::class, 'history'], [AuthMiddleware::class]);
    $r->post('/ai/image/generate', [AiImageController::class, 'generate'], [AuthMiddleware::class]);
    $r->post('/ai/image/favorite', [AiImageController::class, 'favorite'], [AuthMiddleware::class]);
    $r->post('/ai/image/regenerate', [AiImageController::class, 'regenerate'], [AuthMiddleware::class]);
    $r->get('/ai/image/{id}', [AiImageController::class, 'show'], [AuthMiddleware::class]);
    $r->delete('/ai/image/{id}', [AiImageController::class, 'destroy'], [AuthMiddleware::class]);
    $r->get('/ai/flyer/config', [AiFlyerController::class, 'config'], [AuthMiddleware::class]);
    $r->get('/ai/flyer/history', [AiFlyerController::class, 'history'], [AuthMiddleware::class]);
    $r->post('/ai/flyer/generate', [AiFlyerController::class, 'generate'], [AuthMiddleware::class]);
    $r->post('/ai/flyer/favorite', [AiFlyerController::class, 'favorite'], [AuthMiddleware::class]);
    $r->post('/ai/flyer/regenerate', [AiFlyerController::class, 'regenerate'], [AuthMiddleware::class]);
    $r->get('/ai/flyer/{id}', [AiFlyerController::class, 'show'], [AuthMiddleware::class]);
    $r->delete('/ai/flyer/{id}', [AiFlyerController::class, 'destroy'], [AuthMiddleware::class]);
    $r->get('/ai/image-description/config', [AiDescribeController::class, 'config'], [AuthMiddleware::class]);
    $r->get('/ai/image-description/history', [AiDescribeController::class, 'history'], [AuthMiddleware::class]);
    $r->post('/ai/image-description/generate', [AiDescribeController::class, 'describe'], [AuthMiddleware::class]);
    $r->delete('/ai/image-description/{id}', [AiDescribeController::class, 'destroy'], [AuthMiddleware::class]);

    // ---- Profile ----
    $r->get('/profile', [ProfileController::class, 'show'], [AuthMiddleware::class]);
    $r->put('/profile', [ProfileController::class, 'update'], [AuthMiddleware::class]);
    $r->post('/profile/photo', [ProfileController::class, 'uploadPhoto'], [AuthMiddleware::class]);
    $r->delete('/profile/photo', [ProfileController::class, 'deletePhoto'], [AuthMiddleware::class]);

    // ---- Settings (one endpoint per tab) ----
    $r->get('/settings', [SettingsController::class, 'show'], [AuthMiddleware::class]);
    $r->put('/settings/general', [SettingsController::class, 'updateGeneral'], [AuthMiddleware::class]);
    $r->put('/settings/generation', [SettingsController::class, 'updateGeneration'], [AuthMiddleware::class]);
    $r->put('/settings/notifications', [SettingsController::class, 'updateNotifications'], [AuthMiddleware::class]);
    $r->put('/settings/two-factor', [SettingsController::class, 'updateTwoFactor'], [AuthMiddleware::class]);
    $r->post('/settings/password', [SettingsController::class, 'changePassword'], [AuthMiddleware::class]);
    $r->get('/settings/sessions', [SettingsController::class, 'sessions'], [AuthMiddleware::class]);
    $r->delete('/settings/sessions/{id}', [SettingsController::class, 'revokeSession'], [AuthMiddleware::class]);
    $r->get('/settings/storage', [SettingsController::class, 'storage'], [AuthMiddleware::class]);
    $r->delete('/account', [SettingsController::class, 'deleteAccount'], [AuthMiddleware::class]);

    // ---- Billing & Credits ----
    $r->get('/plans', [BillingController::class, 'plans']);
    $r->get('/faqs', [ContentController::class, 'faqs']);
    $r->get('/platform', [PlatformController::class, 'index']);
    $r->get('/help/articles', [ContentController::class, 'articles']); // public catalogue (landing pricing)

    // ---- Checkout (auth) + PUBLIC webhooks (signature-verified inside)
    $r->get('/billing/checkout-context', [BillingCheckoutController::class, 'context'], [AuthMiddleware::class]);
    $r->post('/billing/checkout', [BillingCheckoutController::class, 'start'], [AuthMiddleware::class]);
    $r->post('/billing/checkout/confirm', [BillingCheckoutController::class, 'confirm'], [AuthMiddleware::class]);
    $r->get('/billing/invoices/{id}', [BillingCheckoutController::class, 'invoice'], [AuthMiddleware::class]);
    $r->post('/billing/cancel', [BillingCheckoutController::class, 'cancel'], [AuthMiddleware::class]);
    $r->post('/webhooks/{gateway}', [WebhookController::class, 'handle']);
    $r->get('/billing/current-plan', [BillingController::class, 'currentPlan'], [AuthMiddleware::class]);
    $r->get('/billing/credits', [BillingController::class, 'credits'], [AuthMiddleware::class]);
    $r->get('/billing/payments', [BillingController::class, 'payments'], [AuthMiddleware::class]);
    $r->get('/billing/credit-usage', [BillingController::class, 'creditUsage'], [AuthMiddleware::class]);
    $r->post('/billing/upgrade', [BillingController::class, 'upgrade'], [AuthMiddleware::class]);

    // ---- Notifications ----
    $r->get('/notifications', [NotificationController::class, 'index'], [AuthMiddleware::class]);
    $r->get('/notifications/unread-count', [NotificationController::class, 'unreadCount'], [AuthMiddleware::class]);
    $r->patch('/notifications/read-all', [NotificationController::class, 'markAllRead'], [AuthMiddleware::class]);
    $r->patch('/notifications/{id}/read', [NotificationController::class, 'markRead'], [AuthMiddleware::class]);
    $r->delete('/notifications/{id}', [NotificationController::class, 'destroy'], [AuthMiddleware::class]);

    // ---- Global History (all tools) ----
    $r->get('/history', [HistoryController::class, 'index'], [AuthMiddleware::class]);
    $r->get('/history/{id}', [HistoryController::class, 'show'], [AuthMiddleware::class]);
    $r->delete('/history/{id}', [HistoryController::class, 'destroy'], [AuthMiddleware::class]);
    $r->post('/history/{id}/favorite', [HistoryController::class, 'favorite'], [AuthMiddleware::class]);
    $r->post('/history/{id}/regenerate', [HistoryController::class, 'regenerate'], [AuthMiddleware::class]);

    // ---- My Files ----
    $r->get('/files', [FileController::class, 'index'], [AuthMiddleware::class]);
    $r->get('/files/download', [FileController::class, 'downloadBySrc'], [AuthMiddleware::class]);
    $r->get('/files/{id}', [FileController::class, 'show'], [AuthMiddleware::class]);
    $r->patch('/files/{id}', [FileController::class, 'rename'], [AuthMiddleware::class]);
    $r->delete('/files/{id}', [FileController::class, 'destroy'], [AuthMiddleware::class]);
    $r->post('/files/{id}/download', [FileController::class, 'download'], [AuthMiddleware::class]);

    // ---- Favorites ----
    $r->get('/favorites', [FavoriteController::class, 'index'], [AuthMiddleware::class]);
    $r->delete('/favorites/{id}', [FavoriteController::class, 'destroy'], [AuthMiddleware::class]);

    // ---- Admin: User Management ----
    $r->get('/admin/users', [AdminUserController::class, 'index'], [AdminMiddleware::class]);
    $r->get('/admin/users/{id}', [AdminUserController::class, 'show'], [AdminMiddleware::class]);
    $r->post('/admin/users/{id}/suspend', [AdminUserController::class, 'suspend'], [AdminMiddleware::class]);
    $r->post('/admin/users/{id}/credits', [AdminUserController::class, 'credits'], [AdminMiddleware::class]);
    $r->post('/admin/users/{id}/reset-password', [AdminUserController::class, 'resetPassword'], [AdminMiddleware::class]);

    // ---- Admin: AI Tools + Providers ----
    $r->get('/admin/ai-tools', [AdminAiToolController::class, 'index'], [AdminMiddleware::class]);
    $r->get('/admin/ai-tools/{id}', [AdminAiToolController::class, 'show'], [AdminMiddleware::class]);
    $r->put('/admin/ai-tools/{id}', [AdminAiToolController::class, 'update'], [AdminMiddleware::class]);
    $r->post('/admin/ai-tools/{id}/toggle', [AdminAiToolController::class, 'toggle'], [AdminMiddleware::class]);
    $r->get('/admin/ai-providers', [AdminAiProviderController::class, 'index'], [AdminMiddleware::class]);
    $r->put('/admin/ai-providers/{id}', [AdminAiProviderController::class, 'update'], [AdminMiddleware::class]);
    $r->post('/admin/ai-providers/{id}/test', [AdminAiProviderController::class, 'test'], [AdminMiddleware::class]);

    // ---- Admin: Subscription Plans ----
    $r->get('/admin/plans', [AdminPlanController::class, 'index'], [AdminMiddleware::class]);
    $r->post('/admin/plans', [AdminPlanController::class, 'store'], [AdminMiddleware::class]);
    $r->put('/admin/plans/{id}', [AdminPlanController::class, 'update'], [AdminMiddleware::class]);
    $r->delete('/admin/plans/{id}', [AdminPlanController::class, 'destroy'], [AdminMiddleware::class]);
    $r->post('/admin/plans/{id}/toggle', [AdminPlanController::class, 'toggle'], [AdminMiddleware::class]);

    // ---- Admin: Credit rules + Coupons ----
    $r->get('/admin/credit-settings', [AdminCreditSettingController::class, 'show'], [AdminMiddleware::class]);
    $r->put('/admin/credit-settings', [AdminCreditSettingController::class, 'update'], [AdminMiddleware::class]);

    // ---- Admin: Content (announcements, help articles, FAQs) ----
    $r->get('/admin/announcements', [AdminContentController::class, 'announcements'], [AdminMiddleware::class]);
    $r->post('/admin/announcements', [AdminContentController::class, 'storeAnnouncement'], [AdminMiddleware::class]);
    $r->put('/admin/announcements/{id}', [AdminContentController::class, 'updateAnnouncement'], [AdminMiddleware::class]);
    $r->post('/admin/announcements/{id}/publish', [AdminContentController::class, 'publishAnnouncement'], [AdminMiddleware::class]);
    $r->delete('/admin/announcements/{id}', [AdminContentController::class, 'destroyAnnouncement'], [AdminMiddleware::class]);
    $r->get('/admin/help-articles', [AdminContentController::class, 'articles'], [AdminMiddleware::class]);
    $r->post('/admin/help-articles', [AdminContentController::class, 'storeArticle'], [AdminMiddleware::class]);
    $r->put('/admin/help-articles/{id}', [AdminContentController::class, 'updateArticle'], [AdminMiddleware::class]);
    $r->delete('/admin/help-articles/{id}', [AdminContentController::class, 'destroyArticle'], [AdminMiddleware::class]);
    $r->get('/admin/faqs', [AdminContentController::class, 'faqs'], [AdminMiddleware::class]);
    $r->post('/admin/faqs', [AdminContentController::class, 'storeFaq'], [AdminMiddleware::class]);
    $r->put('/admin/faqs/{id}', [AdminContentController::class, 'updateFaq'], [AdminMiddleware::class]);
    $r->delete('/admin/faqs/{id}', [AdminContentController::class, 'destroyFaq'], [AdminMiddleware::class]);

    // ---- Admin: Payments (read-only) ----
    $r->get('/admin/payments', [AdminPaymentController::class, 'index'], [AdminMiddleware::class]);
    $r->get('/admin/payments/{id}/invoice', [AdminPaymentController::class, 'invoice'], [AdminMiddleware::class]);

    // ---- Admin: Reports (read-only aggregates) ----
    $r->get('/admin/reports/ai-usage', [AdminReportController::class, 'aiUsage'], [AdminMiddleware::class]);
    $r->get('/admin/reports/credit-usage', [AdminReportController::class, 'creditUsage'], [AdminMiddleware::class]);

    // ---- Admin: File Manager + Storage ----
    $r->get('/admin/files', [AdminFileController::class, 'index'], [AdminMiddleware::class]);
    $r->delete('/admin/files/{id}', [AdminFileController::class, 'destroy'], [AdminMiddleware::class]);
    $r->post('/admin/files/{id}/download', [AdminFileController::class, 'download'], [AdminMiddleware::class]);
    $r->get('/admin/storage-providers', [AdminStorageController::class, 'index'], [AdminMiddleware::class]);
    $r->put('/admin/storage-providers/{id}', [AdminStorageController::class, 'update'], [AdminMiddleware::class]);
    $r->post('/admin/storage-providers/{id}/test', [AdminStorageController::class, 'test'], [AdminMiddleware::class]);
    $r->put('/admin/storage-settings', [AdminStorageController::class, 'updateRules'], [AdminMiddleware::class]);

    $r->get('/admin/overview', [AdminOverviewController::class, 'index'], [AdminMiddleware::class]);

    // ---- Admin: System Settings (Email / Payment / Security / Notifications / General) ----
    $r->get('/admin/email', [AdminEmailController::class, 'index'], [AdminMiddleware::class]);
    $r->put('/admin/email/smtp', [AdminEmailController::class, 'updateSmtp'], [AdminMiddleware::class]);
    $r->post('/admin/email/test', [AdminEmailController::class, 'test'], [AdminMiddleware::class]);
    $r->put('/admin/email/templates/{id}', [AdminEmailController::class, 'updateTemplate'], [AdminMiddleware::class]);
    $r->get('/admin/payment-settings', [AdminPaymentSettingController::class, 'index'], [AdminMiddleware::class]);
    $r->put('/admin/payment-gateways/{id}', [AdminPaymentSettingController::class, 'updateGateway'], [AdminMiddleware::class]);
    $r->post('/admin/payment-gateways/{id}/test', [AdminPaymentSettingController::class, 'testGateway'], [AdminMiddleware::class]);
    $r->put('/admin/payment-settings', [AdminPaymentSettingController::class, 'updateSettings'], [AdminMiddleware::class]);
    $r->get('/admin/security', [AdminSecurityController::class, 'index'], [AdminMiddleware::class]);
    $r->get('/admin/support/tickets', [AdminSupportController::class, 'index'], [AdminMiddleware::class]);
    $r->patch('/admin/support/tickets/{id}', [AdminSupportController::class, 'updateStatus'], [AdminMiddleware::class]);
    $r->get('/admin/notification-settings', [AdminNotificationSettingController::class, 'index'], [AdminMiddleware::class]);
    $r->put('/admin/notification-settings', [AdminNotificationSettingController::class, 'update'], [AdminMiddleware::class]);
    $r->get('/admin/general', [AdminGeneralController::class, 'index'], [AdminMiddleware::class]);
    $r->put('/admin/general', [AdminGeneralController::class, 'update'], [AdminMiddleware::class]);

    // ---- Dashboard Home ----
    $r->get('/dashboard', [DashboardController::class, 'index'], [AuthMiddleware::class]);

    // ---- Help & Support ----
    $r->get('/support/tickets', [SupportController::class, 'index'], [AuthMiddleware::class]);
    $r->post('/support/tickets', [SupportController::class, 'store'], [AuthMiddleware::class]);
});

return $router;
