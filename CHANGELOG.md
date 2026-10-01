# Development Changelog

Internal build notes, newest phases last.

## Phase 39 — QA sweep round 2

Three new fully functional tools (Image Generator, Flyer Generator,
Image Description), Interior Designer + Face Detection removed
everywhere, landing trimmed to the six live tools, real AI provider
errors surfaced, dashboard mock Quick Actions/Favorite Tools replaced
with real navigation, right-panel Activity feed now shows the user's
real activity, breadcrumbs truncate + header decluttered at tiny
widths, storage breakdown wrap-proof, AI Tools table headers on one
line, users-list diagnostics, and profile errors show the actual cause.

## Phase 39 audit pass

Re-audited every item in the QA document against the code and fixed
three surviving defects: the static sidebar fallback still listed
Interior Designer + Face Detection (now exactly the six live tools),
the AI Tools provider cell had a duplicate className attribute (merged),
and breadcrumb labels did not actually truncate on narrow screens (they
do now: min-w-0 chain + truncate spans). Also removed the unused mock
imports from the dashboard page.

## Phase 40 — provider resilience + polish

Pollinations hardened (the HTTP 500 blocker): prompts are compacted to
one URL-safe line and capped before hitting the GET endpoint, with a
browser User-Agent, redirect following, an internal 5xx retry, and
magic-byte image validation. Landing footer trimmed to the six live
tools (it had its own hardcoded list); testimonials switched from
masonry columns to an equal-height grid; dashboard 'New render'
button removed and 'Manage plan' wired to Billing; admin users +
payments toolbars stack on mobile with full-width search.

## Phase 41 — Pollinations token tier + de-mocked notifications

Pollinations now supports the registered-token tier (free at
auth.pollinations.ai) via the provider row API key field — sent as
Bearer + token param, with the flux->turbo->default model ladder and a
self-explaining 402 message; the admin card gained an API Token input
(the old 'no key needed' notice was hiding it) and provider priority
now spans 1/2/3. Audit for hardcoded AI responses: backend Gemini/Flux
parse real API structures (candidates/inlineData, data[0].b64_json) —
no canned outputs anywhere; the two genuine fakes found were the header
notification bells (sample data in both user and admin headers) — the
shared NotificationsMenu now fetches real notifications, unread counts,
and mark-read via the API.

## Phase 42 — QA round: real bugs fixed

Profile photo upload was calling a method that never existed
(ImageStorageService::saveAvatar) — implemented with user-upload
validation (2 MB cap, mime whitelist, avatars/{userId}/ storage).
Image Description was inheriting the Gemini row's IMAGE-generation
model (gemini-2.5-flash-preview-image, quota 0 on free tier) — it now
always uses the multimodal text model gemini-2.0-flash; failed
description rows show 'credits refunded'. Landing page gained
root-level overflow-x-clip (kills the 375px horizontal overflow).
Users-page HY093 definitively explained: native prepares
(EMULATE_PREPARES=false) reject a reused named placeholder — current
query uses distinct names and is immune. Frontend rebuilt: dist/
includes all fixes.

## Phase 42b — logo drafts root cause + Gemini retirement ladder

The recurring 'Generation Failed / empty drafts but history has the
image' logo bug: with ZERO color swatches selected the server returns
color: null (by design), and the frontend mapper ran shade(null) — a
TypeError AFTER a successful, charged generation. shade() is now
null/invalid-tolerant, and both the logo and generic mappers default a
null color to brass. Image Description survives Google model
retirements: describeImage walks gemini-2.5-flash -> gemini-flash-latest
-> gemini-2.5-flash-lite, falling through only on 'no longer
available'/not-found answers. dist/ rebuilt with all fixes.

## Phase 43 — provider + module cleanup (migration 027)

Storage: Local is the only provider — S3 and GCS classes, admin fields,
and DB rows removed; StorageManager resolves local only; existing local
file storage untouched. Payments: Stripe + PayPal only — RazorpayGateway,
registry entry, admin fields, filter chips, checkout label, and DB row
removed. PayPal verified genuinely functional (OAuth2 token flow, Orders
v2 create + approve redirect, idempotent capture on return, webhook
signature verification with webhook_id, env-switched hosts, live test).
Admin Security reduced to login/activity logs only (settings cards +
PUT endpoint removed). Coupons module removed end to end: routes,
controller, service, repository, admin page + editor modal, nav entry,
router route, checkout field, and tables dropped. Plan editor tool list
corrected to the six real slugs. Typecheck + build PASS; dist rebuilt.

## Phase 44 — FileController fatal + tools grid

Root cause of BOTH broken downloads and the empty My Files module:
FileController declared download() twice (id-based JSON + src-streaming)
— a PHP cannot-redeclare fatal that 500ed every /files/* request. The
src variant is now downloadBySrc with the route repointed; a duplicate-
method sweep confirms no other class has this fatal. Landing Tools
section: the tab row was grid-cols-2 sm:grid-cols-4 with six tools
(uneven 4+2 rows) — now 2/3/6 columns (always even), with phone-scaled
showcase padding, headline, and min-w-0 shrink guards. dist rebuilt.

## Phase 45 — history per draft, billing polish, search, support inbox

History now shows every generated image: rows aggregate their files
(GROUP_CONCAT) and both studios + Global History expand one entry per
draft (composite ids; actions still target the generation). Billing:
Manage subscription and Buy more credits scroll to the plans section;
checkout spells out yearly math (per-month x 12). Invoice redesigned
(brand header, bill-to/payment blocks, item table, totals, print
button). Global History mobile: actions wrap to their own row; preview
dialog caps the image (~45vh) so prompt + Download always fit. Global
search works: Enter searches Global History prompts (?q=), admin header
searches the users list. Language setting labeled honestly (English-
only for now; preference saved). NEW Admin Support Inbox: GET/PATCH
/admin/support/tickets + /admin/support page listing every user ticket
with resolve/reopen.

## Phase 46 — language removal, guide cards, one pricing truth

Language setting removed from the settings module end to end (UI row,
service field, API handling, user_settings column + default_language key
via migration 028) — returns when real i18n ships. Help & Support: the
three guide cards are now clickable, each opening a written in-app guide
(getting started, per-tool studio guide, billing & credits). Pricing has
ONE source of truth: plans.yearly_price now stores the TOTAL charged per
year (migration 028 converts existing data x12); checkout charges it
verbatim (no recalculation), and the landing pricing, billing plan
cards, current-plan summary, and checkout all derive the same /mo
equivalent from it. Admin plan editor labeled accordingly.

## Phase 47 — pricing verification, module removals, animated landing

Pricing chain verified end to end: DB yearly_price (total/year) -> start()
charges it verbatim -> Stripe (cents) / PayPal (2dp) receive that exact
amount; seats are an included feature (no multiplier anywhere), so the
misleading '/ seat /' copy became '/mo' with an explicit '$X
charged per year' line on landing + billing cards, and checkout shows
$X/year with the /mo equivalence. Admin Support Inbox removed (tickets
still stored + emailed); admin default-language setting removed (English
only). Landing: tools showcase is now interactive — spring-sliding tab
highlight (layoutId), staggered draft tiles with a generating shimmer,
self-typing prompt bar, hover physics — plus scroll-reveal on the tab
grid and slow-drifting ambient glows in the hero (reduced-motion aware).

## Phase 48 — search widths, CSV dates, authentic showcase

Search fields are full-width consistently (admin File Manager, Users,
Payments; user Global History, Favorites). Payments CSV exports Date and
Time as separate short columns — the ###### was Excel's narrow-column
display of a parsed datetime, not missing data. Landing showcase says
six instruments and now mirrors each tool's REAL studio layout: per-tool
control rows (logo styles + colour swatches, avatar expressions, tattoo
placements, image/flyer ratios) and Image Description shows its actual
upload-to-text layout with animated description lines instead of image
tiles.

## Phase 49 — QA round: XAMPP paths, x12 leftovers, file-level favorites

XAMPP subdirectory storage-path isolation is now permanent in
FileController::downloadBySrc. The $3,456 bug: two leftover x12
multiplications (PaymentService activation recording + BillingService
free-plan gate) now use the stored yearly total verbatim; migration 029
repairs affected records (exact 12x matches only). Registration
auto-enrolls the free plan for consistent starting credits (welcome
credits = fallback). Favorites are FILE-level (migration 030): unique
key per file, per-file flags through history, each favorited draft its
own card. Drafts click to a preview modal; Download labels say PNG;
thumbs drop the gradient behind real images (transparent logos preview
clean); history actions left on mobile. Support flow: admins get bell
notifications on new tickets + Admin -> Support Inbox restored. CSV
dates formula-wrapped (Excel can never show ######).

## Phase 50 — migration hardening + mobile history rows + clean previews

History failing to load and favorites erroring were both migration 030
not (fully) applying — MySQL auto-commits DDL, so a mid-file failure
left it half-applied and re-runs died on duplicate column. 030 is now
fully idempotent (information_schema-guarded dynamic DDL): re-running
composer migrate heals any partial state. The studio Recent History
card wraps its actions (download/favorite/delete/Open Again) to their
own row on mobile like the global history card. The Files preview modal
drops the gradient + grid behind real images — clean, no colored areas.

## Phase 51 — preview image restored, credits policy, brand icon

Preview dialog: real images render directly (the w-fit capping wrapper
collapsed the thumb to zero width — image silently vanished); gradient
mark stays as the no-image fallback. Credits policy per spec: every new
user gets the admin-configured welcome credits (migration 031 sets the
default to 10; Admin -> Credits Management adjusts it), plan auto-enroll
at signup reverted — credits change only when a plan is chosen. Brand
icon swapped to the provided studio logo SVG (public/brand-icon.svg +
favicon) via the single BrandMark component; all wordmark text
untouched. dist rebuilt.

## Phase 52 — studio history previews, invoice polish, files icons left

Studio Recent History thumbnails are clickable (cursor-zoom) and open
the shared preview modal — same behavior as Global History / My Files;
one implementation covers all five studios via ResultsPanel. Invoice
refined: consistent section rhythm, tabular-numeric amounts, aligned
totals column, payment reference wraps cleanly, and the layout stacks
on small screens. My Files card action icons are left-aligned at every
breakpoint. dist rebuilt.

## Phase 53 — header avatar, agency contact requests, full provider errors

Profile photo now travels the whole chain: /auth/me (and login/refresh)
include avatar_url, the header UserMenu renders the photo (initials as
fallback), and uploading/removing a photo refreshes the header bubble
instantly. Agency 'Request contact' files a real high-priority
billing support ticket (admin bell + Support Inbox) and confirms with a
banner. Provider status errors display in full: the status line wraps
(whitespace-normal break-words) and last_error is TEXT via migration
032 (stored up to 2000 chars) — quota/rate-limit reasons show whole.

## Phase 54 — currency-aware revenue icon + dark-theme logo

The admin Overview revenue card icon follows the configured currency
(EUR -> €, GBP -> £, INR -> ₹, 15 mapped symbols; unknown codes render
the code itself) via a StatCard iconOverride slot — the static $ is
gone. Brand mark is theme-aware: brand-icon.svg on light surfaces,
brand-icon-dark.svg (the provided dark-background variant) in dark
mode via dark: classes, with tone="dark" forcing it on always-dark
surfaces like the auth split panel. dist rebuilt.
