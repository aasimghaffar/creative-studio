# AI Creative Studio — Backend

Scalable REST API foundation. PHP 8.2+, MySQL, PDO (prepared statements),
JWT auth, PSR-4/PSR-12, Composer, PHPMailer, dotenv.

## Setup (XAMPP / Laragon)

```bash
cd backend
composer install
cp .env.example .env          # fill in DB credentials + JWT_SECRET
php -r "echo bin2hex(random_bytes(32));"   # paste as JWT_SECRET

# create the database, then:
composer migrate

# dev server (or point an Apache vhost at backend/public)
composer serve                # http://localhost:8000
```

Apache: set the document root to `backend/public` — `.htaccess` handles the
front-controller rewrite and forwards the Authorization header.

## Folder structure

```
backend/
├── public/            # front controller + .htaccess (only web-exposed dir)
├── routes/api.php     # route map (versioned under /api/v1)
├── src/
│   ├── Config/        # typed env access
│   ├── Core/          # Router, Request, Response, Database, Logger, Validator
│   ├── Middleware/    # Auth (JWT), Admin (role gate)
│   ├── Controllers/   # thin HTTP layer
│   ├── Services/      # business logic (Auth, Jwt, Mail)
│   ├── Repositories/  # all SQL, prepared statements only
│   └── Exceptions/    # HttpException, ValidationException
├── database/
│   ├── migrations/    # ordered .sql files
│   └── migrate.php    # CLI runner (tracked, idempotent)
└── storage/logs/      # daily app/auth/mail logs
```

## Response format

Every endpoint returns the same envelope:

```json
{
  "success": true,
  "message": "Signed in.",
  "data": { "user": {}, "access_token": "…", "token_type": "Bearer", "expires_in": 900, "refresh_token": "…" },
  "errors": null,
  "meta": { "timestamp": "2026-07-11T10:00:00+00:00", "request_id": "a1b2c3d4e5f6a7b8" }
}
```

Validation failures return 422 with `errors: { field: ["message"] }`.

## Endpoints

| Method | Path                          | Auth   | Purpose                              |
|--------|-------------------------------|--------|--------------------------------------|
| GET    | /api/v1/health                | —      | Liveness + DB reachability           |
| POST   | /api/v1/auth/register         | —      | Create account, returns token bundle |
| POST   | /api/v1/auth/login            | —      | Sign in, returns token bundle        |
| POST   | /api/v1/auth/refresh-token    | —      | Rotate refresh token, new pair       |
| POST   | /api/v1/auth/verify-email     | —      | Verify email via emailed token       |
| POST   | /api/v1/auth/resend-verification | Bearer | Resend the verification email     |
| POST   | /api/v1/auth/forgot-password  | —      | Email a reset link (PHPMailer)       |
| POST   | /api/v1/auth/reset-password   | —      | Set new password via token           |
| GET    | /api/v1/auth/me               | Bearer | Current user                         |
| POST   | /api/v1/auth/logout           | Bearer | Revoke refresh token                 |

Login, register, and refresh also record a device session in
`user_sessions` (browser/OS label parsed from the User-Agent, IP, linked
refresh token). Logout and password reset revoke the matching sessions.
Registration bootstraps the user's 1:1 `user_profiles` and `user_settings`
rows and emails a verification link (24 h TTL, hashed, single-use);
verification is informational for now — login is not blocked on it.

## Frontend wiring

The React app is connected: `VITE_AUTH_DRIVER=api` (the default) makes
`apiAuthService` talk to these endpoints — envelope unwrapping, 422 field
errors surfaced, refresh-token rotation with a one-shot retry on expired
access tokens. Set `VITE_AUTH_DRIVER=mock` in the frontend `.env.local` to
demo without a server.

## AI generation (Logo — the template for every tool)

`GoogleAIService` is the single Gemini gateway (key from `.env` →
`GOOGLE_AI_API_KEY`, model `gemini-2.5-flash-image`, timeout, full error
translation: invalid key, rate limit, timeout, blocked prompt).
`AiGenerationService` is the reusable engine: tool config from `ai_tools`,
input sanitising against the tool's limits, row-locked credit spend with
auto-refund on failure, image files under
`public/storage/generated-images/{tool}/`, rows in `ai_generations`,
`files`, `generation_history`, and the credit ledger.

Logo endpoints (all Bearer-authenticated):

| Method | Path                          | Purpose                          |
|--------|-------------------------------|----------------------------------|
| GET    | /api/v1/ai/logo/config        | Cost per image + credit balance  |
| GET    | /api/v1/ai/logo/history       | Recent generations (newest first)|
| POST   | /api/v1/ai/logo/generate      | Generate 1–4 logos               |
| POST   | /api/v1/ai/logo/favorite      | Toggle favorite { id, favorite } |
| POST   | /api/v1/ai/logo/regenerate    | Re-run a history entry { id }    |
| GET    | /api/v1/ai/logo/{id}          | Entry detail + all image files   |
| DELETE | /api/v1/ai/logo/{id}          | Delete entry, files, and images  |

A future tool = a seeded `ai_tools` row + a prompt recipe in
`AiGenerationService::buildPrompt()` + a 5-line controller subclass + a
route group. Nothing else.

## Profile & Settings modules

Own-data-only (JWT via AuthMiddleware everywhere), reusing users /
user_profiles / user_settings / user_sessions / files — no new tables.

| Method | Path                              | Purpose                                   |
|--------|-----------------------------------|-------------------------------------------|
| GET    | /api/v1/profile                   | Merged account + profile (+ avatar URL)   |
| PUT    | /api/v1/profile                   | Name, email (unique-checked), company, country, timezone, language |
| POST   | /api/v1/profile/photo             | Avatar upload (base64; 2 MB; PNG/JPG/WEBP)|
| DELETE | /api/v1/profile/photo             | Remove avatar (disk + row)                |
| GET    | /api/v1/settings                  | All settings for every tab                |
| PUT    | /api/v1/settings/general          | theme / language / timezone               |
| PUT    | /api/v1/settings/generation       | default size / style / auto-save          |
| PUT    | /api/v1/settings/notifications    | email + push toggles                      |
| PUT    | /api/v1/settings/two-factor       | 2FA preference                            |
| POST   | /api/v1/settings/password         | Change password (verifies current)        |
| GET    | /api/v1/settings/sessions         | Active device sessions                    |
| DELETE | /api/v1/settings/sessions/{id}    | Sign out a session (+ its refresh token)  |
| GET    | /api/v1/settings/storage          | Usage by type from files + plan rules     |
| DELETE | /api/v1/account                   | Delete account (FK cascades)              |

ProfileService / SettingsService own the logic; controllers stay thin;
section updates go through one whitelisted UPDATE builder in
UserSettingsRepository (no duplicated SQL).

## Billing & Credits module

Existing tables only (plans / subscriptions / payments /
credit_transactions from migration 009). Gateway-agnostic: today
'manual', later Stripe / PayPal / LemonSqueezy / Paddle only replace the
payment step and fill gateway + gateway_subscription_id — no schema or
endpoint changes.

| Method | Path                          | Auth   | Purpose                                    |
|--------|-------------------------------|--------|--------------------------------------------|
| GET    | /api/v1/plans                 | —      | Public plan catalogue (landing pricing)    |
| GET    | /api/v1/billing/current-plan  | Bearer | Active subscription (free-plan fallback)   |
| GET    | /api/v1/billing/credits       | Bearer | Balance, cycle allowance, used, reset date |
| GET    | /api/v1/billing/payments      | Bearer | Invoice history                            |
| GET    | /api/v1/billing/credit-usage  | Bearer | Credits per AI tool this cycle             |
| POST   | /api/v1/billing/upgrade       | Bearer | Change plan (testing mode, no gateway)     |

Upgrade flow: validates the plan (custom-priced → 409 contact-sales),
cancels the previous subscription, creates the new one, records a paid
'manual' invoice, and grants the cycle's credits through the row-locked
ledger.

## Notifications module

Inbox on the existing notifications table. NotificationService is the one
reusable entry point (failure-safe: a notification can never break the
flow that created it) with per-category helpers — generation, credits,
subscription, payment, system.

| Method | Path                                | Purpose                              |
|--------|-------------------------------------|--------------------------------------|
| GET    | /api/v1/notifications               | Newest first; ?type= filter, ?page/?per_page pagination; returns unread |
| GET    | /api/v1/notifications/unread-count  | Badge count                          |
| PATCH  | /api/v1/notifications/{id}/read     | Mark one read (own rows only)        |
| PATCH  | /api/v1/notifications/read-all      | Mark everything read                 |
| DELETE | /api/v1/notifications/{id}          | Delete one (own rows only)           |

Automatic events wired: welcome on registration; profile updated; password
changed; 2FA toggled; per-generation success + credits deducted; refund on
failed generations; plan upgraded, payment successful, and credits added on
plan changes. Future modules call the same helpers.

## Global History, My Files & Favorites

Read/manage layers over the SAME rows the AI tools write — no duplicate
save logic anywhere. Detail, delete, favorite, and regenerate reuse the
shared AiGenerationService, so every future tool appears in these modules
automatically.

| Method | Path                              | Purpose                                        |
|--------|-----------------------------------|------------------------------------------------|
| GET    | /api/v1/history                   | All tools; ?tool= ?range=24h/7d/30d ?sort= ?page= |
| GET    | /api/v1/history/{id}              | Full generation details + image files          |
| DELETE | /api/v1/history/{id}              | Delete generation + files + disk images        |
| POST   | /api/v1/history/{id}/favorite     | Toggle favorite (syncs the favorites table)    |
| POST   | /api/v1/history/{id}/regenerate   | Re-run with the entry's own tool               |
| GET    | /api/v1/files                     | ?type= ?search= + live storage usage           |
| GET    | /api/v1/files/{id}                | File detail                                    |
| PATCH  | /api/v1/files/{id}                | Rename (filesystem-safe)                       |
| DELETE | /api/v1/files/{id}                | Soft-delete row, remove bytes from disk        |
| POST   | /api/v1/files/{id}/download       | Count the download, return URL + filename      |
| GET    | /api/v1/favorites                 | Image favorites (joined for rendering) + prompts |
| DELETE | /api/v1/favorites/{id}            | Remove; image favorites also clear the history flag |

Favorite state has one source of truth: AiGenerationService::setFavorite
writes generation_history.is_favorite AND the favorites table together, so
the tool pages, Global History, and Favorites always agree.

## Dashboard Home & Help + Support

GET /api/v1/dashboard — one aggregated payload: renders today / this week
/ open drafts, a gap-filled 14-day generation series with totals and peak,
the six latest image files with tool + prompt context, recent activity
(derived from notifications), and the credits / subscription / storage
blocks reused straight from BillingService and SettingsService.

Support: GET + POST /api/v1/support/tickets on the existing
support_tickets table (topic and priority whitelisted, ticket-received
notification sent through NotificationService).

## Admin: User Management

All routes behind AdminMiddleware (JWT + role=admin). Promote your first
admin with `composer make-admin -- you@example.com` (then sign out/in).

| Method | Path                                    | Purpose                                        |
|--------|-----------------------------------------|------------------------------------------------|
| GET    | /api/v1/admin/users                     | Paginated list; ?search= ?status= ?plan=       |
| GET    | /api/v1/admin/users/{id}                | Detail + usage (top studio, avg batch size)    |
| POST   | /api/v1/admin/users/{id}/suspend        | Suspend (revokes all sessions/tokens) or reactivate |
| POST   | /api/v1/admin/users/{id}/credits        | Signed adjustment via the ledger (admin recorded) |
| POST   | /api/v1/admin/users/{id}/reset-password | Sends the standard reset email                 |

List rows include per-user aggregates (credits spent, completed
generations, live storage) computed in SQL subqueries; the plan column
joins the active subscription with a Sketch fallback. Guard rails: admins
cannot act on themselves, and non-credit actions on other admins are
blocked (admin roles change only via the CLI/database). Suspension and
credit changes notify the affected user.

## Admin: AI Tools + Providers

Configuration management only (no token-cost calculations or usage checks
in this phase, by design). Migration 014 sets availability defaults: Logo,
Avatar, and Tattoo live; every other tool disabled until enabled here.
These settings are the live enforcement — AiGenerationService reads
credits, prompt limit, timeout, and status from the same rows.

| Method | Path                                | Purpose                                  |
|--------|-------------------------------------|------------------------------------------|
| GET    | /api/v1/admin/ai-tools              | All tools with full settings             |
| GET    | /api/v1/admin/ai-tools/{id}         | Single tool settings                     |
| PUT    | /api/v1/admin/ai-tools/{id}         | Save settings (validated)                |
| POST   | /api/v1/admin/ai-tools/{id}/toggle  | Enable (live) / disable                  |
| GET    | /api/v1/admin/ai-providers          | Both providers (keys always masked)      |
| PUT    | /api/v1/admin/ai-providers/{id}     | Key / enabled / priority / model / timeout |
| POST   | /api/v1/admin/ai-providers/{id}/test| LIVE connectivity test (status persisted)|

Validation: credits 0–100, prompt limit 100–5000 chars, timeout 10–300 s,
upload size in {10, 20, 50} MB, allowed types ⊆ {JPG, PNG, WEBP, PDF},
model required. Provider keys stay in backend/.env and are only ever
returned masked.

## AI Provider System (backend-driven selection + fallback)

Provider selection is entirely backend-owned. The frontend sends tool +
prompt + options only — never a provider — and receives only the final
image. Architecture:

    AIProviderInterface  →  contract (generateImage, testConnection)
    GoogleAIService      →  Gemini implementation
    FluxAIService        →  FLUX (api.bfl.ai: submit → poll → download)
    AIProviderManager    →  loads ENABLED providers from ai_providers,
                            ordered by priority; tries them one by one;
                            stops at the first success

Automatic fallback triggers on invalid/expired keys, rate limits, quota,
timeouts, 5xx, unreachable hosts, and declined prompts. Every real
outcome (test or runtime) is persisted to status/last_error — no fake
statuses. If every provider fails the user gets one clean 502 and a full
refund via the existing credit flow; if none are enabled, a 503 asks an
admin to enable one.

Configuration lives in the ai_providers table (migration 015): name, key,
enabled, priority, status, last_tested_at, model, timeout. Priority 1 is
unique by construction — promoting a provider atomically demotes all
others in one transaction. Keys are write-only through the API and only
ever returned masked. Gemini falls back to GOOGLE_AI_API_KEY in .env when
its DB key is empty, so existing installs keep working. Adding a future
provider = one class implementing the interface + one row — zero frontend
changes.

Per-tool model selection was removed on purpose: tools configure enabled,
credits, prompt limit, uploads, and timeout; the provider layer owns
models globally.

## Admin: Subscription Plans + Payments

Plans are full CRUD (migration 016 adds storage_gb, max_generations,
allowed_tools, badge). Payments are strictly read-only: rows are created
by the billing flows, never by admins.

| Method | Path                                  | Purpose                                     |
|--------|---------------------------------------|---------------------------------------------|
| GET    | /api/v1/admin/plans                   | All plans + live subscription counts        |
| POST   | /api/v1/admin/plans                   | Create (validated; unique name; auto slug)  |
| PUT    | /api/v1/admin/plans/{id}              | Update (slug immutable)                     |
| DELETE | /api/v1/admin/plans/{id}              | 409 while any subscription references it    |
| POST   | /api/v1/admin/plans/{id}/toggle       | Enable / disable (hide from pricing)        |
| GET    | /api/v1/admin/payments                | ?search= ?status= ?gateway= ?page= ?per_page= |
| GET    | /api/v1/admin/payments/{id}/invoice   | Invoice built from the stored record        |

Plan validation: unique name (case-insensitive, max 60), prices 0–100,000
or null (= custom), credits / storage / max generations nullable ints
(null = unlimited), seats 1–999, display order 0–99, badge in {Popular,
Recommended, Best Value, New, none}, allowed_tools intersected against
real ai_tools slugs. The public pricing page and user Billing module read
the same table, so admin edits are live immediately.

## Admin: Credits Management + Coupons

Global credit rules live in the new platform_settings key-value table
(migration 017): default_free_credits, daily_credit_limit (0 = none),
monthly_credit_reset, credit_expiry_days (0 = never). Registration now
grants the CONFIGURED default through the credit ledger (welcome credits
have a transaction record); the generation engine enforces the daily
limit before charging (429 when exceeded). Monthly reset and expiry are
stored settings read by a future scheduled job — no scheduler exists yet.

| Method | Path                                  | Purpose                              |
|--------|---------------------------------------|--------------------------------------|
| GET    | /api/v1/admin/credit-settings         | Current global credit rules          |
| PUT    | /api/v1/admin/credit-settings         | Save rules (validated ranges)        |
| GET    | /api/v1/admin/coupons                 | All coupons                          |
| POST   | /api/v1/admin/coupons                 | Create (validated; unique code)      |
| PUT    | /api/v1/admin/coupons/{id}            | Update                               |
| DELETE | /api/v1/admin/coupons/{id}            | Delete                               |
| POST   | /api/v1/admin/coupons/{id}/toggle     | Enable / disable                     |

Manual adjustments reuse POST /admin/users/{id}/credits — the existing
row-locked, transactional ledger path that records admin_id, user_id,
signed amount, type, reason, and timestamp, and refuses to take a balance
negative. Per-tool credits reuse PUT /admin/ai-tools/{id} — the same rows
the generation engine reads; no second source of truth. Coupons table
added in migration 017 (code, percent/fixed value, redemption budget,
expiry, active).

## Admin: Content (Announcements, Help Center, FAQs)

Migration 018 adds announcements, help_articles, and faqs — the FAQ table
is seeded with the previously hardcoded landing + support lists (merged
and deduped), and BOTH public surfaces now read GET /api/v1/faqs, so the
admin FAQs page is the single source of truth for every FAQ shown
anywhere. Publishing an announcement pushes an inbox notification to the
audience ('all' or a plan slug) with one INSERT..SELECT. Scheduled
announcements store their publish time for a future scheduler; "Publish
now" works today.

| Method | Path                                        | Purpose                          |
|--------|---------------------------------------------|----------------------------------|
| GET/POST | /api/v1/admin/announcements               | List / create (publish notifies) |
| PUT/DELETE | /api/v1/admin/announcements/{id}        | Edit / delete                    |
| POST   | /api/v1/admin/announcements/{id}/publish    | Publish now + notify audience    |
| GET/POST | /api/v1/admin/help-articles               | List / create (auto slug)        |
| PUT/DELETE | /api/v1/admin/help-articles/{id}        | Edit / delete                    |
| GET/POST | /api/v1/admin/faqs                        | List / create                    |
| PUT/DELETE | /api/v1/admin/faqs/{id}                 | Edit / delete                    |
| GET    | /api/v1/faqs                                | PUBLIC — active FAQs (landing + support) |
| GET    | /api/v1/help/articles                       | PUBLIC — published articles      |

## Admin: Reports — AI Usage + Credits Usage

Strictly read-only: two GET endpoints, zero write routes, every figure
computed live from tables the platform already writes. Any tool routed
through the shared generation engine — current or future — appears in
both reports automatically, because the engine writes ai_generations and
the credit ledger on every run.

| Method | Path                                   | Purpose                                     |
|--------|----------------------------------------|---------------------------------------------|
| GET    | /api/v1/admin/reports/ai-usage         | Today / week / lifetime totals + per-tool   |
| GET    | /api/v1/admin/reports/credit-usage     | Today / week / month / lifetime + per-tool + 4-week series |

Credits "consumed" = spends net of refunds (-SUM over spend+refund rows),
so failed generations don't count. Per-tool credits sum credits_used on
completed generations — consistent with the ledger by construction. The
Analytics and Revenue report pages were removed.

## AI Tools — full platform enforcement

The ai_tools table is the master configuration; nothing tool-related is
hardcoded. Enforcement points, all reading the table live per request:

- Disabled (non-live) tools: the engine rejects generation with 403
  "This tool is currently unavailable." BEFORE any credit spend, provider
  call, or history row. The user sidebar loads GET /api/v1/ai/tools and
  renders non-live tools as disabled "Soon" entries automatically.
- Credits: charged from credits_per_generation via the existing ledger.
- Prompt limit: validated in the studio (client) and in the engine (422).
- Upload support: reference images in a request to a tool with uploads
  off are rejected 422 before charging.
- Timeout: the tool's timeout_sec is passed into AIProviderManager and
  overrides the provider default for that generation; timeouts refund
  through the existing failure path.
- The public tool config no longer exposes the model — providers stay
  backend-only.

## System: File Manager + Storage Provider

One files table remains the single source of truth — the admin File
Manager and user My Files read the same rows, and deletion (either side)
removes the DB row and the physical object in one transaction, so a file
vanishes from every surface at once. All storage stats are live SUMs.

| Method | Path                                        | Purpose                                    |
|--------|---------------------------------------------|--------------------------------------------|
| GET    | /api/v1/admin/files                         | Search/filter/paginate + live storage stats |
| DELETE | /api/v1/admin/files/{id}                    | Hard delete: row + physical file (tx)       |
| POST   | /api/v1/admin/files/{id}/download           | Count + return URL                          |
| GET    | /api/v1/admin/storage-providers             | Providers (secrets never returned) + rules  |
| PUT    | /api/v1/admin/storage-providers/{id}        | Save credentials (write-only) / enable      |
| POST   | /api/v1/admin/storage-providers/{id}/test   | REAL connection test, persisted             |
| PUT    | /api/v1/admin/storage-settings              | The four global upload rules                |

Storage abstraction (src/Services/Storage): Local, S3 (raw Signature V4,
no SDK), and GCS (service-account JWT, no SDK) behind one interface.
Exactly one provider is active (transactional swap); WRITES go to the
active provider while reads/deletes dispatch by the storage_path scheme
(s3:// gcs:// or local), so switching affects only future uploads and
every existing file keeps resolving. Credentials are AES-256-GCM
encrypted with a key derived from APP_KEY (JWT_SECRET fallback) and are
write-only via the API — responses carry only field-presence booleans.
Upload rules live in platform_settings; the engine enforces per-user
storage/file caps before charging, and StorageManager::validateUpload
enforces size/type for upload endpoints. Admin Support pages and API
Management were removed (user-facing support tickets remain).

## System Settings (Email / Payment / Security / Notifications / General)

| Method | Path                                      | Purpose                                        |
|--------|-------------------------------------------|------------------------------------------------|
| GET    | /api/v1/admin/email                       | SMTP (password masked) + templates             |
| PUT    | /api/v1/admin/email/smtp                  | Validates against the LIVE server, then saves  |
| POST   | /api/v1/admin/email/test                  | Sends a real test email                        |
| PUT    | /api/v1/admin/email/templates/{id}        | Edit subject/body, enable/disable              |
| GET    | /api/v1/admin/payment-settings            | Gateways (secrets masked) + currency + prefix  |
| PUT    | /api/v1/admin/payment-gateways/{id}       | Credentials (write-only) / enable (exclusive)  |
| PUT    | /api/v1/admin/payment-settings            | Currency + invoice prefix + auto-invoicing     |
| GET    | /api/v1/admin/security                    | Toggles + last 40 REAL security events         |
| PUT    | /api/v1/admin/security                    | Toggles + reCAPTCHA keys (secret write-only)   |
| GET    | /api/v1/admin/notification-settings       | Per-event admin/user master switches           |
| PUT    | /api/v1/admin/notification-settings       | Save switches (take effect immediately)        |
| GET    | /api/v1/admin/general                     | Site identity + maintenance mode               |
| PUT    | /api/v1/admin/general                     | Save (audited)                                 |
| GET    | /api/v1/platform                          | PUBLIC branding + maintenance flag             |

Email: MailService reads SMTP from the database every send (password
AES-GCM); PHPMailer is used automatically when installed, with a built-in
socket SMTP client as the fallback. PUT smtp connects and authenticates
against the live server BEFORE persisting. A disabled template is never
sent — sendTemplate logs and returns. Wired senders: welcome (register),
subscription_receipt (upgrade, real invoice number + currency),
low_credits (fires once on crossing below 10), generation_failed (after
auto-refund). email_verification and password_reset templates are seeded
and editable; they fire once those auth flows exist.

Payment: one active gateway (transactional swap), credentials encrypted
and write-only. The billing system reads invoice_prefix and currency from
settings on every payment — nothing is hardcoded.

Security: security_events is a real audit trail (logins, failed logins,
password changes, admin setting saves). require_email_verification is
ENFORCED in the generation engine against users.email_verified_at.
google_login / two_factor / reCAPTCHA persist as platform config for the
auth surfaces that consume them.

Notifications: NotificationService checks notify_user_{category} before
creating — switches take effect immediately. 'system' (announcements) is
exempt by design. Admin-side switches persist for the future admin inbox.

General: the frontend reads GET /v1/platform (module-cached hook) for the
site name in the landing header/footer, app sidebar, admin sidebar, auth
layout, and document titles — one source, no duplication. Maintenance
mode is enforced server-side in AuthMiddleware (503 for non-admins,
admins exempt) and mirrored client-side with a maintenance screen.

## Credits: one ledger, everywhere

Every credit figure on every surface is a database calculation from the
credit_transactions ledger (row-locked, balance_after audited):
total_granted − used_total = balance, always. GET /billing/credits now
returns balance, total_granted, used_total, used_this_cycle,
credits_per_cycle, unlimited, resets_on — the header meter, dashboard
card, billing page, and studio panels all read it (shared cached hook,
invalidated after every generation and plan change).

Enforcement audit fixes:
- daily_credit_limit and require_email_verification were saved by the
  admin screens but NOT enforced — both are now checked in the engine
  before anything is charged (429 / 403), alongside per-user storage and
  file caps.
- Unlimited plans (a PAID plan with credits_per_cycle = NULL) bypass
  deduction and the daily limit; generations record 0 cost.
- Plan change clears the previous plan's remaining balance (audited
  'adjustment' entry) before granting the new cycle — credits never stack
  across plans.
- Hardcoded 120/25 credit fallbacks removed; the seeded settings govern.

Monthly reset + credit expiry run via `composer credits-cycle`
(database/credits-cycle.php) — idempotent, cron-ready:
`0 1 * * * cd backend && composer credits-cycle`. Reset clears balances
on the billing date, grants the plan's cycle credits, and advances the
period; expiry removes any balance not covered by grants within the
configured window, as audited 'expiry' ledger entries.

## Logo Generator options (migration 021)

Seed is removed end-to-end (column dropped — it was never consumed by the
AI provider). New options: template (VARCHAR 80) and colors (up to 3 hex
values, CSV). The FINAL AI prompt is built ONLY on the backend
(AiGenerationService::buildPrompt) as a structured brief: description,
template, style, brand colors (palette hexes mapped to friendly names),
aspect ratio, background (transparent flag), quality, negative prompt.
The frontend sends raw selections and never concatenates prompt text.
Validation: colors max 3 valid hexes (422 beyond), quality whitelisted,
template/style length-capped, prompt required within the tool's limit.
The first selected color is stored in the legacy color column so history
thumbnails keep working.

## Production payment system (migration 024)

Redirect-based hosted checkout for Stripe (Checkout Sessions), PayPal
(Orders v2, sandbox/live hosts by environment) and Razorpay (Payment
Links) — raw REST, no SDKs. Flow: POST /billing/checkout creates a
PENDING payments row and returns the gateway redirect; the return leg
POSTs /billing/checkout/confirm, and the backend VERIFIES with the
gateway API before anything activates — the browser is never trusted.
finalizePaid() flips pending->paid with a guarded UPDATE (idempotent:
a racing webhook + return cannot double-activate or double-grant).
Only then BillingService::activatePaidPlan runs: subscription (with
gateway ref), credits (existing clear+grant business logic), receipt
email, notifications, subscription_history. Failures/cancels mark the
payment failed and activate NOTHING; BillingController::upgrade now
returns 402 for any priced plan, so no path grants a paid plan without
a verified payment. Webhooks: POST /webhooks/{gateway} (public), with
Stripe HMAC + 5-minute replay window, Razorpay HMAC, PayPal
verify-webhook-signature API; duplicates suppressed by
UNIQUE(gateway, event_id) in webhook_logs. Refund webhooks mark the
payment refunded, log history, and notify the user. Invoices are
server-rendered printable HTML (GET /billing/invoices/{id}, owner or
admin). Gateway credentials are AES-GCM encrypted at rest, write-only
in the API, decrypted only inside PaymentService::gatewayFor.

Client setup (no code changes): Admin -> Payment Settings -> paste the
gateway's keys -> pick Sandbox or Production -> Test -> enable. Webhook
URLs to paste in each gateway dashboard: {APP_URL}/api/v1/webhooks/stripe,
/webhooks/paypal, /webhooks/razorpay — then store the webhook secret
(Stripe/Razorpay) or webhook id (PayPal) back in the same card.

Honest scope: payments are one-time per cycle (no gateway-side
recurring billing yet — renewal = the user re-purchasing, or the
credits-cycle job advancing periods); tax is a future-ready 0 row;
the coupon field is a disabled placeholder; live gateway calls could
not be executed in the development container (no network) — test with
your sandbox keys.

## Phase 39 — QA document sweep + three new tools (migration 026)

Real AI errors: the generic "Image generation is unavailable" mask is
gone — the engine now reports each provider's actual failure ("All
providers failed — Gemini: … | Pollinations: …"), with credits still
refunded. New tools on the shared engine: Image Generator (/ai/image/*)
and Flyer Generator (/ai/flyer/*) — thin controllers + structured
prompt recipes, full history/favorites/files/credits/admin support.
Image Description (/ai/image-description/*): image IN, text OUT via
Gemini vision (describeImage on GoogleAIService); reuses the ai_tools
row for enable/cost, spends+refunds credits, stores the description on
the generation row (options JSON), lists/deletes history — needs the
Gemini provider key. Migration 026 removes Interior Designer and Face
Detection rows; the sidebar/landing show exactly six tools. Admin user
list gained a PDOException diagnostic log (param keys, never values)
after a reported HY093. Profile load errors now surface the real API
status/message.

## Security notes

- Passwords: `password_hash` with Argon2id (+ transparent rehash on login).
- Access tokens: HS256 JWT, 15 min TTL. Refresh tokens: opaque 80-char
  strings, stored as SHA-256 hashes, rotated on every refresh, all revoked
  on password reset.
- Login and forgot-password responses never reveal whether an email exists.
- All SQL uses PDO prepared statements with native (non-emulated) prepares.

## Database schema (Phase 2)

Migrations 005–012 add the full platform schema — 20 tables across auth
(user_profiles, user_sessions), AI (ai_tools, ai_generations,
generation_history, favorites), storage (folders, files), notifications,
billing (plans, subscriptions, payments, credit_transactions ledger),
settings (user_settings), and system (support_tickets, api_usage,
activity_logs). See `database/SCHEMA.md` for the ERD, relationship map,
index strategy, and constraint decisions. `composer migrate` applies
everything in dependency order and seeds the eight AI tools + three plans.

## Extending (future phases)

Each new domain = repository + service + controller + a route group in
`routes/api.php` + a numbered migration. `AdminMiddleware` is ready for the
admin endpoints. Nothing in this phase connects to React, AI providers,
uploads, history, or billing — those are the next phases.
