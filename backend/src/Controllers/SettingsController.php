<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Validator;
use App\Services\SettingsService;

/** Settings module — one endpoint per tab, always own-data only. */
final class SettingsController extends Controller
{
    private SettingsService $settings;

    public function __construct()
    {
        $this->settings = new SettingsService();
    }

    /** GET /api/v1/settings */
    public function show(Request $request): Response
    {
        return Response::success($this->settings->get((int) $this->user($request)['id']));
    }

    /** PUT /api/v1/settings/general  { theme?, timezone? } */
    public function updateGeneral(Request $request): Response
    {
        $this->settings->updateGeneral((int) $this->user($request)['id'], $request->all());

        return Response::success(null, 'Preferences saved.');
    }

    /** PUT /api/v1/settings/generation  { default_image_size?, default_style?, auto_save_history? } */
    public function updateGeneration(Request $request): Response
    {
        $this->settings->updateGeneration((int) $this->user($request)['id'], $request->all());

        return Response::success(null, 'Generation defaults saved.');
    }

    /** PUT /api/v1/settings/notifications  { email_generation?, email_billing?, email_product?, push_enabled? } */
    public function updateNotifications(Request $request): Response
    {
        $this->settings->updateNotifications((int) $this->user($request)['id'], $request->all());

        return Response::success(null, 'Notification preferences saved.');
    }

    /** PUT /api/v1/settings/two-factor  { enabled } */
    public function updateTwoFactor(Request $request): Response
    {
        $enabled = (bool) $request->input('enabled', false);
        $this->settings->setTwoFactor((int) $this->user($request)['id'], $enabled);

        return Response::success(
            ['enabled' => $enabled],
            $enabled ? 'Two-factor enabled.' : 'Two-factor disabled.',
        );
    }

    /** POST /api/v1/settings/password  { current_password, new_password } */
    public function changePassword(Request $request): Response
    {
        $data = Validator::validate($request->all(), [
            'current_password' => 'required|string|min:1|max:200',
            'new_password'     => 'required|string|min:8|max:200',
        ]);

        $this->settings->changePassword(
            (int) $this->user($request)['id'],
            $data['current_password'],
            $data['new_password'],
        );

        return Response::success(null, 'Password updated.');
    }

    /** GET /api/v1/settings/sessions */
    public function sessions(Request $request): Response
    {
        return Response::success([
            'sessions' => $this->settings->sessions((int) $this->user($request)['id']),
        ]);
    }

    /** DELETE /api/v1/settings/sessions/{id} */
    public function revokeSession(Request $request): Response
    {
        $this->settings->revokeSession(
            (int) $this->user($request)['id'],
            (int) $request->param('id'),
        );

        return Response::success(null, 'Session signed out.');
    }

    /** GET /api/v1/settings/storage */
    public function storage(Request $request): Response
    {
        return Response::success($this->settings->storageOverview((int) $this->user($request)['id']));
    }

    /** DELETE /api/v1/account */
    public function deleteAccount(Request $request): Response
    {
        $this->settings->deleteAccount((int) $this->user($request)['id']);

        return Response::success(null, 'Account deleted.');
    }
}
