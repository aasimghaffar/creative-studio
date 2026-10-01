<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Controllers\Controller;
use App\Core\Logger;
use App\Core\Request;
use App\Core\Response;
use App\Exceptions\ValidationException;
use App\Repositories\PlatformSettingRepository;

/** Admin → Credit rules: the global platform credit settings. */
final class AdminCreditSettingController extends Controller
{
    private PlatformSettingRepository $settings;

    public function __construct()
    {
        $this->settings = new PlatformSettingRepository();
    }

    /** GET /api/v1/admin/credit-settings */
    public function show(Request $request): Response
    {
        return Response::success($this->shape());
    }

    /** PUT /api/v1/admin/credit-settings */
    public function update(Request $request): Response
    {
        $errors = [];

        $free = (int) $request->input('default_free_credits', 0);
        if ($free < 0 || $free > 10000) {
            $errors['default_free_credits'][] = 'Default free credits must be between 0 and 10,000.';
        }

        $daily = (int) $request->input('daily_credit_limit', 0);
        if ($daily < 0 || $daily > 100000) {
            $errors['daily_credit_limit'][] = 'Daily limit must be between 0 (no limit) and 100,000.';
        }

        $expiry = (int) $request->input('credit_expiry_days', 0);
        if ($expiry < 0 || $expiry > 3650) {
            $errors['credit_expiry_days'][] = 'Expiry must be between 0 (never) and 3,650 days.';
        }

        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        $this->settings->setMany([
            'default_free_credits' => (string) $free,
            'daily_credit_limit'   => (string) $daily,
            'monthly_credit_reset' => $request->input('monthly_credit_reset') ? '1' : '0',
            'credit_expiry_days'   => (string) $expiry,
        ]);

        Logger::channel('app')->info('Credit settings updated', [
            'admin_id' => (int) $this->user($request)['id'],
        ]);

        return Response::success($this->shape(), 'Credit rules saved.');
    }

    /** @return array<string, int|bool> */
    private function shape(): array
    {
        return [
            'default_free_credits' => $this->settings->getInt('default_free_credits', 25),
            'daily_credit_limit'   => $this->settings->getInt('daily_credit_limit', 0),
            'monthly_credit_reset' => $this->settings->getBool('monthly_credit_reset', false),
            'credit_expiry_days'   => $this->settings->getInt('credit_expiry_days', 0),
        ];
    }
}
