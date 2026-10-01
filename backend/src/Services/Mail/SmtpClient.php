<?php

declare(strict_types=1);

namespace App\Services\Mail;

use RuntimeException;

/**
 * Minimal dependency-free SMTP client (EHLO, STARTTLS/SSL, AUTH LOGIN).
 * Used when PHPMailer isn't installed; the MailService prefers PHPMailer
 * automatically when the class exists.
 */
final class SmtpClient
{
    /** @var resource|null */
    private $socket = null;

    public function __construct(
        private readonly string $host,
        private readonly int $port,
        private readonly string $encryption, // TLS | SSL | None
        private readonly string $username,
        private readonly string $password,
        private readonly int $timeout = 20,
    ) {
    }

    /** Connect + authenticate only — used for validation and tests. */
    public function verify(): void
    {
        $this->connect();
        $this->quit();
    }

    public function send(string $fromEmail, string $fromName, string $toEmail, string $subject, string $body): void
    {
        $this->connect();

        $this->command('MAIL FROM:<' . $fromEmail . '>', [250]);
        $this->command('RCPT TO:<' . $toEmail . '>', [250, 251]);
        $this->command('DATA', [354]);

        $headers = [
            'From: ' . $this->encodeHeader($fromName) . ' <' . $fromEmail . '>',
            'To: <' . $toEmail . '>',
            'Subject: ' . $this->encodeHeader($subject),
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
            'Date: ' . date('r'),
        ];
        $payload = implode("\r\n", $headers) . "\r\n\r\n" . chunk_split(base64_encode($body));

        fwrite($this->socket, $payload . "\r\n.\r\n");
        $this->expect([250], 'message body');

        $this->quit();
    }

    private function connect(): void
    {
        $ssl = strtoupper($this->encryption) === 'SSL';
        $target = ($ssl ? 'ssl://' : '') . $this->host . ':' . $this->port;

        $socket = @stream_socket_client($target, $errno, $error, $this->timeout);
        if ($socket === false) {
            throw new RuntimeException('Could not reach the SMTP server: ' . ($error ?: 'connection failed.'));
        }
        stream_set_timeout($socket, $this->timeout);
        $this->socket = $socket;

        $this->expect([220], 'greeting');
        $this->command('EHLO ' . gethostname(), [250]);

        if (strtoupper($this->encryption) === 'TLS') {
            $this->command('STARTTLS', [220]);
            if (!stream_socket_enable_crypto($this->socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new RuntimeException('STARTTLS negotiation failed.');
            }
            $this->command('EHLO ' . gethostname(), [250]);
        }

        if ($this->username !== '') {
            $this->command('AUTH LOGIN', [334]);
            $this->command(base64_encode($this->username), [334]);
            $this->command(base64_encode($this->password), [235]);
        }
    }

    /** @param list<int> $expected */
    private function command(string $line, array $expected): void
    {
        fwrite($this->socket, $line . "\r\n");
        $this->expect($expected, $line);
    }

    /** @param list<int> $expected */
    private function expect(array $expected, string $context): void
    {
        $response = '';
        while (($line = fgets($this->socket, 1024)) !== false) {
            $response .= $line;
            if (strlen($line) < 4 || $line[3] !== '-') {
                break;
            }
        }
        $code = (int) substr($response, 0, 3);
        if (!in_array($code, $expected, true)) {
            $short = trim(substr($response, 0, 190)) ?: 'no response';
            throw new RuntimeException('SMTP rejected ' . (str_starts_with($context, 'AUTH') || ctype_alnum(str_replace(['=', '+', '/'], '', $context)) && strlen($context) > 40 ? 'credentials' : '"' . $context . '"') . ': ' . $short);
        }
    }

    private function quit(): void
    {
        if ($this->socket !== null) {
            @fwrite($this->socket, "QUIT\r\n");
            @fclose($this->socket);
            $this->socket = null;
        }
    }

    private function encodeHeader(string $value): string
    {
        return preg_match('/[^\x20-\x7E]/', $value)
            ? '=?UTF-8?B?' . base64_encode($value) . '?='
            : $value;
    }
}
