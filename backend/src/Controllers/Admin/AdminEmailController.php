<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Controllers\Controller;
use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Core\Response;
use App\Exceptions\HttpException;
use App\Exceptions\ValidationException;
use App\Repositories\PlatformSettingRepository;
use App\Services\Mail\MailService;
use App\Services\Storage\CredentialCrypto;

/** Admin → Email Settings: SMTP (validated live before saving) + templates. */
final class AdminEmailController extends Controller
{
    private PlatformSettingRepository $settings;

    public function __construct()
    {
        $this->settings = new PlatformSettingRepository();
    }

    /** GET /api/v1/admin/email */
    public function index(Request $request): Response
    {
        $all = $this->settings->all();
        $templates = Database::connection()
            ->query('SELECT id, slug, name, subject, body, is_enabled, updated_at FROM email_templates ORDER BY id ASC')
            ->fetchAll();

        return Response::success([
            'smtp' => [
                'host'         => (string) ($all['smtp_host'] ?? ''),
                'port'         => (int) ($all['smtp_port'] ?? 587),
                'encryption'   => (string) ($all['smtp_encryption'] ?? 'TLS'),
                'username'     => (string) ($all['smtp_username'] ?? ''),
                'password_set' => ($all['smtp_password'] ?? '') !== '',   // masked — never returned
                'from_name'    => (string) ($all['mail_from_name'] ?? ''),
                'from_email'   => (string) ($all['mail_from_email'] ?? ''),
            ],
            'templates' => array_map(static fn (array $t): array => [
                'id'         => (int) $t['id'],
                'slug'       => $t['slug'],
                'name'       => $t['name'],
                'subject'    => $t['subject'],
                'body'       => $t['body'],
                'is_enabled' => (bool) $t['is_enabled'],
                'updated_at' => $t['updated_at'],
            ], $templates),
        ]);
    }

    /** PUT /api/v1/admin/email/smtp — validates against the live server BEFORE saving. */
    public function updateSmtp(Request $request): Response
    {
        $errors = [];

        $host = trim((string) $request->input('host', ''));
        if ($host === '') {
            $errors['host'][] = 'SMTP host is required.';
        }
        $port = (int) $request->input('port', 587);
        if ($port < 1 || $port > 65535) {
            $errors['port'][] = 'Port must be between 1 and 65535.';
        }
        $encryption = (string) $request->input('encryption', 'TLS');
        if (!in_array($encryption, ['TLS', 'SSL', 'None'], true)) {
            $errors['encryption'][] = 'Encryption must be TLS, SSL, or None.';
        }
        $fromEmail = trim((string) $request->input('from_email', ''));
        if ($fromEmail !== '' && filter_var($fromEmail, FILTER_VALIDATE_EMAIL) === false) {
            $errors['from_email'][] = 'From address must be a valid email.';
        }
        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        $username = trim((string) $request->input('username', ''));
        $password = (string) $request->input('password', '');
        if ($password === '') {
            // empty input keeps the stored secret
            $password = (string) (CredentialCrypto::decrypt($this->settings->all()['smtp_password'] ?? null)['value'] ?? '');
        }

        // Live validation: connect + authenticate before anything persists.
        try {
            (new MailService())->verifyConnection([
                'host' => $host, 'port' => (string) $port, 'encryption' => $encryption,
                'username' => $username, 'password' => $password,
                'from_name' => '', 'from_email' => $fromEmail,
            ]);
        } catch (\Throwable $e) {
            throw new ValidationException(['host' => ['SMTP validation failed: ' . $e->getMessage()]]);
        }

        $this->settings->setMany([
            'smtp_host'       => $host,
            'smtp_port'       => (string) $port,
            'smtp_encryption' => $encryption,
            'smtp_username'   => $username,
            'smtp_password'   => $password !== '' ? CredentialCrypto::encrypt(['value' => $password]) : '',
            'mail_from_name'  => trim((string) $request->input('from_name', '')),
            'mail_from_email' => $fromEmail,
        ]);
        Logger::channel('app')->info('SMTP settings updated', ['admin_id' => (int) $this->user($request)['id']]);

        return Response::success(null, 'SMTP verified and saved.');
    }

    /** POST /api/v1/admin/email/test { to } — sends a REAL email. */
    public function test(Request $request): Response
    {
        $to = trim((string) $request->input('to', ''));
        if ($to === '') {
            $to = (string) ($this->user($request)['email'] ?? '');
        }
        if (filter_var($to, FILTER_VALIDATE_EMAIL) === false) {
            throw new ValidationException(['to' => ['A valid recipient email is required.']]);
        }

        try {
            (new MailService())->deliver(
                $to,
                'SMTP test — everything works',
                "This is a test email from your AI Creative Studio admin panel.\n\nIf you are reading this, your SMTP configuration is correct.",
            );
        } catch (\Throwable $e) {
            throw new HttpException(502, 'Test email failed: ' . $e->getMessage());
        }

        return Response::success(null, 'Test email delivered to ' . $to . '.');
    }

    /** PUT /api/v1/admin/email/templates/{id} */
    public function updateTemplate(Request $request): Response
    {
        $id = (int) $request->param('id');
        $db = Database::connection();

        $stmt = $db->prepare('SELECT id FROM email_templates WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        if ($stmt->fetch() === false) {
            throw new HttpException(404, 'Template not found.');
        }

        $errors = [];
        $subject = trim((string) $request->input('subject', ''));
        if ($subject === '' || mb_strlen($subject) > 190) {
            $errors['subject'][] = 'Subject is required (max 190 characters).';
        }
        $body = trim((string) $request->input('body', ''));
        if ($body === '' || mb_strlen($body) > 20000) {
            $errors['body'][] = 'Body is required (max 20,000 characters).';
        }
        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        $db->prepare(
            'UPDATE email_templates SET subject = :subject, body = :body, is_enabled = :enabled, updated_at = NOW() WHERE id = :id',
        )->execute([
            'subject' => $subject,
            'body'    => $body,
            'enabled' => $request->input('is_enabled', true) ? 1 : 0,
            'id'      => $id,
        ]);

        $fresh = $db->prepare('SELECT id, slug, name, subject, body, is_enabled, updated_at FROM email_templates WHERE id = :id');
        $fresh->execute(['id' => $id]);
        $t = $fresh->fetch();

        return Response::success([
            'id' => (int) $t['id'], 'slug' => $t['slug'], 'name' => $t['name'],
            'subject' => $t['subject'], 'body' => $t['body'],
            'is_enabled' => (bool) $t['is_enabled'], 'updated_at' => $t['updated_at'],
        ], 'Template saved.');
    }
}
