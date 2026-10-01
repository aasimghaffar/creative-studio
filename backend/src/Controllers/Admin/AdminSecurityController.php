<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Controllers\Controller;
use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Exceptions\ValidationException;
use App\Repositories\PlatformSettingRepository;
use App\Services\SecurityLog;
use App\Services\Storage\CredentialCrypto;

/** Admin → Security: auth toggles, reCAPTCHA keys, and the REAL audit log. */
final class AdminSecurityController extends Controller
{
    /** GET /api/v1/admin/security */
    public function index(Request $request): Response
    {
        $settings = (new PlatformSettingRepository())->all();
        $events = Database::connection()
            ->query('SELECT id, event, actor, ip, tone, created_at FROM security_events ORDER BY id DESC LIMIT 40')
            ->fetchAll();

        return Response::success([
            'settings' => [
                'require_email_verification' => ($settings['require_email_verification'] ?? '0') === '1',
                'google_login'               => ($settings['google_login'] ?? '0') === '1',
                'two_factor'                 => ($settings['two_factor'] ?? '0') === '1',
                'recaptcha_enabled'          => ($settings['recaptcha_enabled'] ?? '0') === '1',
                'recaptcha_site'             => (string) ($settings['recaptcha_site'] ?? ''),
                'recaptcha_secret_set'       => ($settings['recaptcha_secret'] ?? '') !== '',
            ],
            'events' => array_map(static fn (array $e): array => [
                'id'         => (int) $e['id'],
                'event'      => $e['event'],
                'actor'      => $e['actor'],
                'ip'         => $e['ip'],
                'tone'       => $e['tone'],
                'created_at' => $e['created_at'],
            ], $events),
        ]);
    }
}
