<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\Config;
use App\Core\Logger;
use PHPMailer\PHPMailer\PHPMailer;

/**
 * Thin PHPMailer wrapper. In local/dev without SMTP credentials it logs
 * the email instead of sending, so flows stay testable offline.
 */
final class MailService
{
    public function send(string $toEmail, string $toName, string $subject, string $htmlBody): bool
    {
        // No SMTP configured (fresh local setup): log-and-continue.
        if (Config::get('MAIL_USERNAME') === '') {
            Logger::channel('mail')->info('Mail (dev, not sent)', [
                'to'      => $toEmail,
                'subject' => $subject,
            ]);

            return true;
        }

        $mailer = new PHPMailer(true);

        try {
            $mailer->isSMTP();
            $mailer->Host = Config::get('MAIL_HOST');
            $mailer->Port = Config::int('MAIL_PORT', 587);
            $mailer->SMTPAuth = true;
            $mailer->Username = Config::get('MAIL_USERNAME');
            $mailer->Password = Config::get('MAIL_PASSWORD');

            $encryption = Config::get('MAIL_ENCRYPTION', 'tls');
            if ($encryption !== 'none') {
                $mailer->SMTPSecure = $encryption === 'ssl'
                    ? PHPMailer::ENCRYPTION_SMTPS
                    : PHPMailer::ENCRYPTION_STARTTLS;
            }

            $mailer->setFrom(
                Config::get('MAIL_FROM_ADDRESS', 'hello@example.com'),
                Config::get('MAIL_FROM_NAME', Config::get('APP_NAME', 'App')),
            );
            $mailer->addAddress($toEmail, $toName);
            $mailer->isHTML(true);
            $mailer->CharSet = PHPMailer::CHARSET_UTF8;
            $mailer->Subject = $subject;
            $mailer->Body = $htmlBody;
            $mailer->AltBody = strip_tags($htmlBody);

            return $mailer->send();
        } catch (\Throwable $e) {
            Logger::channel('mail')->error('Mail send failed', [
                'to'    => $toEmail,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }
}
