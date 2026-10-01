<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Core\Database;
use App\Exceptions\HttpException;
use App\Repositories\PlatformSettingRepository;

/** Printable HTML invoices rendered from the payments row — no dummy data. */
final class InvoiceService
{
    public function render(int $paymentId, int $requesterId, bool $isAdmin): string
    {
        $stmt = Database::connection()->prepare(
            'SELECT p.*, u.name AS customer_name, u.email AS customer_email, pl.name AS plan_name
             FROM payments p
             LEFT JOIN users u ON u.id = p.user_id
             LEFT JOIN plans pl ON pl.id = p.plan_id
             WHERE p.id = :id LIMIT 1',
        );
        $stmt->execute(['id' => $paymentId]);
        $p = $stmt->fetch();
        if ($p === false || (!$isAdmin && (int) $p['user_id'] !== $requesterId)) {
            throw new HttpException(404, 'Invoice not found.');
        }

        $site = (string) ((new PlatformSettingRepository())->all()['site_name'] ?? 'AI Creative Studio');
        $e = static fn (mixed $v): string => htmlspecialchars((string) $v, ENT_QUOTES);
        $status = strtoupper((string) $p['status']);
        $statusColor = match ($p['status']) {
            'paid' => '#2e7d55', 'refunded' => '#8a6d3b', default => '#b3423a',
        };

        return '<!doctype html><html><head><meta charset="utf-8"><title>' . $e($p['invoice_no']) . '</title>
<style>
:root{--ink:#1d2b32;--soft:#6f7478;--line:#e6e1d5;--paper:#faf9f4;--brass:#8a6f47;--panel:#f3f0e7}
*{box-sizing:border-box;margin:0}
body{font-family:Georgia,\'Times New Roman\',serif;color:var(--ink);background:#fff;max-width:760px;margin:48px auto;padding:0 32px;line-height:1.5}
.head{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;padding-bottom:24px;border-bottom:3px solid var(--ink)}
.brand{font-size:24px;font-weight:700;letter-spacing:.01em}
.brand small{display:block;margin-top:6px;font-size:10px;font-weight:400;color:var(--soft);letter-spacing:.22em;text-transform:uppercase}
.inv{text-align:right}
.inv h1{font-size:22px;letter-spacing:.05em;font-weight:700}
.inv p{margin-top:6px;font-size:12px;color:var(--soft)}
.badge{display:inline-block;margin-top:10px;padding:4px 14px;border:1.5px solid;border-radius:3px;font-size:10px;letter-spacing:.16em;font-weight:700;text-transform:uppercase}
.meta{display:flex;gap:20px;margin-top:32px}
.meta .block{flex:1;background:var(--paper);border:1px solid var(--line);border-radius:4px;padding:18px 20px;min-width:0}
.block b{display:block;font-size:10px;color:var(--soft);letter-spacing:.18em;text-transform:uppercase;margin-bottom:10px;font-weight:700}
.block span{font-size:14px;line-height:1.65;display:block}
.block .ref{margin-top:6px;font-size:10.5px;color:var(--soft);word-break:break-all;line-height:1.5}
table{width:100%;border-collapse:collapse;margin-top:36px}
th{background:var(--panel);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--soft);padding:12px 14px;text-align:left;border-bottom:2px solid var(--ink);font-weight:700}
th.right,td.right{text-align:right}
td{padding:16px 14px;border-bottom:1px solid var(--line);font-size:14px;vertical-align:top}
.muted{color:var(--soft);font-size:12px}
.totals{margin-left:auto;margin-top:8px;width:300px}
.totals .row{display:flex;justify-content:space-between;padding:9px 14px;font-size:13px}
.totals .row span:last-child{font-variant-numeric:tabular-nums}
.totals .grand{border-top:2px solid var(--ink);margin-top:8px;padding-top:14px;font-size:16px;font-weight:700}
.foot{margin-top:48px;border-top:1px solid var(--line);padding-top:16px;display:flex;justify-content:space-between;font-size:11px;color:var(--soft)}
.actions{margin-top:28px;text-align:right}
.printbtn{background:var(--ink);color:#fff;border:0;border-radius:4px;padding:11px 26px;font-size:13px;letter-spacing:.06em;cursor:pointer;font-family:inherit}
@media print{.noprint{display:none}body{margin:0 auto}}
@media (max-width:640px){.head,.meta{flex-direction:column;align-items:flex-start}.inv{text-align:left}.totals{width:100%}}
</style></head><body>
<div class="head">
  <div class="brand">' . $e($site) . '<small>Invoice</small></div>
  <div class="inv">
    <h1>' . $e($p['invoice_no']) . '</h1>
    <p>Issued ' . $e(substr((string) $p['created_at'], 0, 10)) . ($p['paid_at'] ? ' &nbsp;&middot;&nbsp; Paid ' . $e(substr((string) $p['paid_at'], 0, 10)) : '') . '</p>
    <span class="badge" style="color:' . $statusColor . ';border-color:' . $statusColor . '">' . $e($status) . '</span>
  </div>
</div>
<div class="meta">
  <div class="block"><b>Billed to</b><span>' . $e($p['customer_name'] ?? 'Deleted account') . '</span><span class="muted">' . $e($p['customer_email'] ?? '') . '</span></div>
  <div class="block"><b>Payment method</b><span>' . $e(ucfirst((string) $p['gateway'])) . '</span>' . ($p['gateway_payment_id'] ? '<span class="ref">Reference: ' . $e($p['gateway_payment_id']) . '</span>' : '') . '</div>
</div>
<table>
<tr><th>Description</th><th class="right" style="width:170px">Amount</th></tr>
<tr><td>' . $e($p['description']) . ($p['billing_cycle'] ? '<div class="muted" style="margin-top:4px">Billed ' . $e($p['billing_cycle']) . '</div>' : '') . '</td>
<td class="right" style="font-variant-numeric:tabular-nums">' . $e(number_format((float) $p['amount'], 2)) . ' ' . $e(strtoupper((string) $p['currency'])) . '</td></tr>
</table>
<div class="totals">
  <div class="row"><span>Subtotal</span><span>' . $e(number_format((float) $p['amount'], 2)) . ' ' . $e(strtoupper((string) $p['currency'])) . '</span></div>
  <div class="row muted"><span>Tax</span><span>0.00 ' . $e(strtoupper((string) $p['currency'])) . '</span></div>
  <div class="row grand"><span>Total</span><span>' . $e(number_format((float) $p['amount'], 2)) . ' ' . $e(strtoupper((string) $p['currency'])) . '</span></div>
</div>
<div class="foot"><span>' . $e($site) . '</span><span>Thank you for your business.</span></div>
<div class="actions noprint"><button class="printbtn" onclick="window.print()">Print / Save as PDF</button></div>
</body></html>';
    }
}
