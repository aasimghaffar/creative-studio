<?php

declare(strict_types=1);

namespace App\Services\Mail;

use App\Core\Database;
use App\Core\Logger;
use App\Repositories\PlatformSettingRepository;
use App\Services\Storage\CredentialCrypto;
use RuntimeException;

/**
 * All system email flows go through here. SMTP settings come from the
 * database (password encrypted). Uses PHPMailer when it's installed;
 * otherwise the built-in SmtpClient. Template slugs:
 * email_verification, password_reset, welcome, subscription_receipt,
 * low_credits, generation_failed. A DISABLED template is never sent.
 */
final class MailService
{
    public function __construct(
        private readonly PlatformSettingRepository $settings = new PlatformSettingRepository(),
    ) {
    }

    /** @return array<string, string> Decrypted SMTP config. */
    public function smtpConfig(): array
    {
        $all = $this->settings->all();

        return [
            'host'       => (string) ($all['smtp_host'] ?? ''),
            'port'       => (string) ($all['smtp_port'] ?? '587'),
            'encryption' => (string) ($all['smtp_encryption'] ?? 'TLS'),
            'username'   => (string) ($all['smtp_username'] ?? ''),
            'password'   => (string) (CredentialCrypto::decrypt($all['smtp_password'] ?? null)['value'] ?? ''),
            'from_name'  => (string) ($all['mail_from_name'] ?? '') ?: (string) ($all['site_name'] ?? 'AI Creative Studio'),
            'from_email' => (string) ($all['mail_from_email'] ?? ''),
        ];
    }

    /** Connect + authenticate with given (or stored) config; throws on failure. */
    public function verifyConnection(?array $override = null): void
    {
        $config = $override ?? $this->smtpConfig();
        if ($config['host'] === '') {
            throw new RuntimeException('SMTP host is not configured.');
        }
        (new SmtpClient(
            $config['host'],
            (int) $config['port'],
            $config['encryption'],
            $config['username'],
            $config['password'],
        ))->verify();
    }

    /**
     * Send a template email. Returns false (and logs) when the template
     * is disabled, missing, or SMTP is unconfigured — callers never break.
     *
     * @param array<string, string|int|float> $vars
     */
    public function sendTemplate(string $slug, string $toEmail, array $vars = []): bool
    {
        try {
            $db = Database::connection();
            $stmt = $db->prepare('SELECT * FROM email_templates WHERE slug = :slug LIMIT 1');
            $stmt->execute(['slug' => $slug]);
            $template = $stmt->fetch();

            if ($template === false) {
                Logger::channel('mail')->warning('Unknown email template', ['slug' => $slug]);

                return false;
            }
            if (!(bool) $template['is_enabled']) {
                Logger::channel('mail')->info('Email skipped — template disabled', ['slug' => $slug, 'to' => $toEmail]);

                return false;
            }

            $vars += ['site_name' => (string) ($this->settings->all()['site_name'] ?? 'AI Creative Studio')];
            $subject = $this->render((string) $template['subject'], $vars);
            $body = $this->render((string) $template['body'], $vars);

            $this->deliver($toEmail, $subject, $body);
            Logger::channel('mail')->info('Email sent', ['slug' => $slug, 'to' => $toEmail]);

            return true;
        } catch (\Throwable $e) {
            Logger::channel('mail')->error('Email failed', ['slug' => $slug, 'to' => $toEmail, 'error' => $e->getMessage()]);

            return false;
        }
    }

    /** Direct send (test button). Throws with the real reason. */
    public function deliver(string $toEmail, string $subject, string $body): void
    {
        $config = $this->smtpConfig();
        if ($config['host'] === '' || $config['from_email'] === '') {
            throw new RuntimeException('SMTP host and From address must be configured first.');
        }

        // Prefer PHPMailer when the host application has it installed.
        if (class_exists(\PHPMailer\PHPMailer\PHPMailer::class)) {
            $mailer = new \PHPMailer\PHPMailer\PHPMailer(true);
            $mailer->isSMTP();
            $mailer->Host = $config['host'];
            $mailer->Port = (int) $config['port'];
            $mailer->SMTPAuth = $config['username'] !== '';
            $mailer->Username = $config['username'];
            $mailer->Password = $config['password'];
            $mailer->SMTPSecure = match (strtoupper($config['encryption'])) {
                'SSL'   => 'ssl',
                'TLS'   => 'tls',
                default => '',
            };
            $mailer->CharSet = 'UTF-8';
            $mailer->setFrom($config['from_email'], $config['from_name']);
            $mailer->addAddress($toEmail);
            $mailer->Subject = $subject;
            $mailer->Body = $body;
            $mailer->send();

            return;
        }

        (new SmtpClient(
            $config['host'],
            (int) $config['port'],
            $config['encryption'],
            $config['username'],
            $config['password'],
        ))->send($config['from_email'], $config['from_name'], $toEmail, $subject, $body);
    }

    /** @param array<string, string|int|float> $vars */
    private function render(string $text, array $vars): string
    {
        foreach ($vars as $key => $value) {
            $text = str_replace('{{' . $key . '}}', (string) $value, $text);
        }

        return $text;
    }
}
