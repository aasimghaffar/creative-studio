# Database Schema — AI Creative Studio

MySQL 8 / InnoDB / utf8mb4. Built by `composer migrate` (migrations 001–012,
tracked + idempotent). 20 tables including `migrations`.

## Entity relationships

```
                                ┌──────────────────┐
                                │      users       │ (001)
                                └────────┬─────────┘
        1:1                              │                              1:1
  ┌───────────────┐   ┌──────────────────┼──────────────────┐   ┌───────────────┐
  │ user_profiles │◄──┤                  │                  ├──►│ user_settings │
  └───────────────┘   │                  │                  │   └───────────────┘
                      ▼                  ▼                  ▼
             ┌────────────────┐  ┌───────────────┐  ┌───────────────┐
             │ refresh_tokens │◄─┤ user_sessions │  │ notifications │
             └────────────────┘  └───────────────┘  └───────────────┘

  AI domain                              │
  ┌──────────┐ 1:N ┌────────────────┐ 1:1│┌────────────────────┐
  │ ai_tools │◄────┤ ai_generations │◄───┼┤ generation_history │
  └──────────┘     └───────┬────────┘    │└────────────────────┘
                           │ N:1         │
                    ┌──────┴─────┐       │
                    │ favorites  │◄──────┤  (image → generation, prompt → text)
                    └────────────┘       │
  Storage                                │
  ┌─────────┐ self  ┌────────┐           │
  │ folders │◄──────┤ files  │◄──────────┤  (files may link a generation)
  └─────────┘       └────────┘           │
                                         │
  Billing                                │
  ┌───────┐ 1:N ┌───────────────┐ 1:N ┌──┴───────┐ 1:N ┌─────────────────────┐
  │ plans │◄────┤ subscriptions │◄────┤ payments │◄────┤ credit_transactions │
  └───────┘     └───────────────┘     └──────────┘     └─────────────────────┘
                                         (ledger also links generations + admin actor)
  System
  ┌───────────────┐  ┌─────────────────┐  ┌───────────┐
  │ activity_logs │  │ support_tickets │  │ api_usage │   (all N:1 users, SET NULL)
  └───────────────┘  └─────────────────┘  └───────────┘
```

## Key decisions

| Decision | Why |
|---|---|
| `generation_history` separate from `ai_generations` | Users delete history freely (soft delete); the audit/billing record survives. 1:1 via `UNIQUE (generation_id)`. |
| `favorites` with a shape CHECK | One table serves image favorites (FK to a generation) and prompt favorites (text). `CHECK` enforces exactly the right columns per `type`. |
| `credit_transactions` is an append-only signed ledger | `balance_after` makes the balance a one-row read and every discrepancy auditable. `CHECK (balance_after >= 0)` blocks overdrafts at the storage layer. |
| `payments.user_id` → `ON DELETE SET NULL` | Financial records must survive account deletion; everything user-scoped elsewhere cascades. |
| `ai_tools` / `plans` → `ON DELETE RESTRICT` from usage tables | Catalogue rows with history can be disabled (`status` / `is_active`) but never orphan records. |
| `files.folder_id` → `SET NULL`, `folders.parent_id` → `CASCADE` | Deleting a folder removes its subtree but files fall back to root rather than vanishing. |
| Soft deletes (`deleted_at`) on `files`, `generation_history` | Matches the admin "retention window" setting. |

## Index strategy

Every FK is indexed (InnoDB requires it; the composites below serve the FK
too). Hot paths get composites matching real queries:

- `ai_generations (user_id, created_at)` — history feeds, newest-first
- `generation_history (user_id, is_favorite)` — favorites tab
- `notifications (user_id, read_at)` — unread badge count
- `subscriptions (user_id, status)` + `(current_period_end)` — renewal cron
- `payments (user_id, created_at)`, `credit_transactions (user_id, created_at)`
- `files (user_id, type)` — File Manager type filters
- `api_usage (created_at)` + prefixed `endpoint(80)` — metering dashboards
- `support_tickets (status, priority)` — the admin queue

## Constraints summary

- **PK**: `BIGINT UNSIGNED AUTO_INCREMENT` on every table.
- **Unique**: `users.email`, token hashes, `ai_tools.slug`, `plans.slug`,
  `payments.invoice_no`, `payments.gateway_payment_id`,
  `subscriptions.gateway_subscription_id`, 1:1 keys
  (`user_profiles.user_id`, `user_settings.user_id`,
  `generation_history.generation_id`), and de-dup key
  `favorites (user_id, type, generation_id)`.
- **CHECK** (MySQL ≥ 8.0.16): generation quantity 1–12, favorite shape,
  non-zero ledger amounts, non-negative balances and payment amounts.
- **ENUMs** for closed vocabularies (status/role/category…) — they mirror
  the frontend's union types one-to-one.

## Seeds (012)

`INSERT IGNORE` rows for the eight AI tools (slugs match the frontend
`toolId`s: logo, avatar, tattoo, image, flyer, interior, face-detection,
image-description) and the three plans (sketch / studio / agency) with the
same pricing and credit numbers the UI mocks use.
