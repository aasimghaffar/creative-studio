<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Controllers\Controller;
use App\Core\Logger;
use App\Core\Request;
use App\Core\Response;
use App\Exceptions\ValidationException;
use App\Repositories\PlatformSettingRepository;
use App\Services\SecurityLog;

/** Admin → General Settings: platform identity + maintenance mode. */
final class AdminGeneralController extends Controller
{
    private const TIMEZONES = ['UTC', 'Europe/London', 'America/New_York', 'Asia/Karachi', 'Asia/Dubai'];

    /** GET /api/v1/admin/general */
    public function index(Request $request): Response
    {
        return Response::success($this->shape());
    }

    /** PUT /api/v1/admin/general */
    public function update(Request $request): Response
    {
        $errors = [];

        $siteName = trim((string) $request->input('site_name', ''));
        if ($siteName === '' || mb_strlen($siteName) > 80) {
            $errors['site_name'][] = 'Website name is required (max 80 characters).';
        }
        $contact = trim((string) $request->input('contact_email', ''));
        if ($contact !== '' && filter_var($contact, FILTER_VALIDATE_EMAIL) === false) {
            $errors['contact_email'][] = 'Contact email must be valid.';
        }
        $timezone = (string) $request->input('time_zone', 'UTC');
        if (!in_array($timezone, self::TIMEZONES, true)) {
            $errors['time_zone'][] = 'Unsupported time zone.';
        }
        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        $maintenance = (bool) $request->input('maintenance_mode', false);
        (new PlatformSettingRepository())->setMany([
            'site_name'        => $siteName,
            'contact_email'    => $contact,
            'time_zone'        => $timezone,
            'maintenance_mode' => $maintenance ? '1' : '0',
        ]);

        $admin = $this->user($request);
        Logger::channel('app')->warning('General settings updated', [
            'admin_id'    => (int) $admin['id'],
            'maintenance' => $maintenance,
        ]);
        SecurityLog::record(
            (int) $admin['id'],
            $maintenance ? 'Maintenance mode ENABLED' : 'Admin setting update — general settings',
            (string) ($admin['email'] ?? 'admin'),
            'brass',
        );

        return Response::success($this->shape(), 'General settings saved.');
    }

    /** @return array<string, mixed> */
    private function shape(): array
    {
        $all = (new PlatformSettingRepository())->all();

        return [
            'site_name'        => (string) ($all['site_name'] ?? 'AI Creative Studio'),
            'contact_email'    => (string) ($all['contact_email'] ?? ''),
            'time_zone'        => (string) ($all['time_zone'] ?? 'UTC'),
            'currency'         => (string) ($all['currency'] ?? 'USD'),
            'maintenance_mode' => ($all['maintenance_mode'] ?? '0') === '1',
            'timezones'        => self::TIMEZONES,
        ];
    }
}
