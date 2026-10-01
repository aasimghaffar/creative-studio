# AI Creative Studio — Setup Guide

Step-by-step installation for anyone cloning or downloading this repository.
Every command below is the project's real command — nothing here is generic advice.

The project has two halves that run separately:

```
creative-studio/
├── backend/    → the API (PHP 8.2 + MySQL)
└── frontend/   → the web app (React; a production build ships in frontend/dist/)
```

---

## 1. What you need installed

| Software | Version | Notes |
|---|---|---|
| PHP | **8.2+** | with `pdo_mysql`, `curl`, `openssl` extensions (XAMPP/Laragon include them) |
| Composer | latest | https://getcomposer.org |
| MySQL | **5.7+** | or MariaDB (XAMPP/Laragon include it) |
| Node.js | **18+** | **optional** — only for development or rebuilding the frontend |

## 2. Get the code

Clone the repo (or unzip the download). You should see `backend/`, `frontend/`, `README.md`, and this file.

## 3. Create the database

Start MySQL and create an empty database:

```sql
CREATE DATABASE ai_creative_studio CHARACTER SET utf8mb4;
```

(Tables are created automatically in step 5 — don't import anything manually.)

## 4. Configure the backend

Open a terminal **in the `backend/` folder**:

```bash
cp .env.example .env          # Windows: copy .env.example .env
```

Open `backend/.env` in any editor and set:

```
DB_DATABASE=ai_creative_studio
DB_USERNAME=root              # your MySQL user (XAMPP default: root)
DB_PASSWORD=                  # your MySQL password (XAMPP default: empty)
JWT_SECRET=                   # paste any long random string (40+ characters)
APP_URL=http://localhost:8000
CORS_ALLOWED_ORIGIN=http://localhost:5173
```

## 5. Install and migrate the backend

Still in `backend/`:

```bash
composer install
composer migrate              # creates all tables (migrations 001–028)
```

## 6. Start the backend

```bash
composer serve                # API now running on http://localhost:8000
```

Leave this terminal open.

## 7. Start the frontend

Open a **second terminal** in the `frontend/` folder. Pick ONE option:

**Option A — use the included production build (no Node needed):**

```bash
npx serve dist                # or host frontend/dist/ with any static server
```

**Option B — development mode (live reload):**

```bash
cp .env.example .env          # VITE_API_URL already points to http://localhost:8000/api
npm ci
npm run dev                   # opens http://localhost:5173
```

> `VITE_API_URL` is baked in at build time. The included `dist/` points to
> `http://localhost:8000/api`. For a real domain, set `VITE_API_URL` in
> `frontend/.env` and run `npm run build`.

## 8. Create your account and become admin

There are **no default credentials** — you create them. The order matters:

1. Open the app in the browser and use the **Sign up** form (the one with a
   **Name** field — the login form cannot create accounts). Example:
   `Admin` / `admin@test.com` / `Admin@12345`. Watch it succeed — you should
   land in the dashboard.
2. In the `backend/` folder (the SAME folder where `composer serve` runs):

```bash
composer make-admin admin@test.com
```

   It confirms the promotion. "No account found" means step 1 didn't
   complete — see Troubleshooting.
3. In the app: **log out, then log in again** — the admin role is loaded at
   login. The Admin menu appears; the dashboard is at
   `http://localhost:3000/admin`.

**Signup won't work?** Create the account directly against the API — this
bypasses the UI and shows the real error if any:

```bash
curl.exe -X POST http://localhost:8000/api/v1/auth/register -H "Content-Type: application/json" -d "{\"name\":\"Admin\",\"email\":\"admin@test.com\",\"password\":\"Admin@12345\"}"
```

`"success":true` = account created; continue with step 2. You can verify any
time in phpMyAdmin → `ai_creative_studio` → `users` table.

## 9. Configure the AI providers (required to generate)

Admin → **AI Providers**:

- **Pollinations (free):** create a free token at `auth.pollinations.ai`,
  paste it into the **API Token** field, Save, then press **Test** —
  it should say "Connected — Pollinations is generating".
- **Gemini:** paste a Google AI API key (from Google AI Studio), Test.
- **Flux (Together AI):** paste a Together AI API key, Test.
- Set the priority (1 is tried first; the rest are fallbacks).

Only ONE working provider is needed to start generating. Then go to Admin →
**AI Tools** and switch each tool you want live to **Live**.

## 10. Configure payments (optional — for selling plans)

Admin → **Payment Settings**:

- **Stripe:** publishable key, secret key, webhook signing secret. In the
  Stripe dashboard add a webhook pointing to
  `https://YOUR-DOMAIN/api/v1/webhooks/stripe`.
- **PayPal:** client ID, client secret, webhook ID. In the PayPal developer
  dashboard add a webhook pointing to
  `https://YOUR-DOMAIN/api/v1/webhooks/paypal`.
- Each gateway has a sandbox/live environment switch and a **Test** button.
- Edit plans and prices in Admin → **Subscription Plans**
  (the yearly price field is the TOTAL charged per year).

## 11. Configure email (optional — verification + reset emails)

Set the SMTP transport in **`backend/.env`** (this is what actually sends):

```
MAIL_HOST=smtp.yourprovider.com
MAIL_PORT=587
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=hello@yourdomain.com
MAIL_FROM_NAME="AI Creative Studio"
```

Email templates and a test-send button are in Admin → **Email**.
If SMTP is left empty, the app still works — emails are simply skipped.

## 12. Test the main flow

1. Open the **Logo Generator**, describe a logo, press **Generate**.
2. The drafts appear on the canvas; check **Global History** and **My Files**.
3. Press the download icon on a draft — the image should save.

If all three work, the installation is complete.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Opening `localhost:8000` shows `{"success":false,"message":"Endpoint not found."}` | **That's healthy** — the API has no route at `/`. Try `http://localhost:8000/api/v1/plans` to see real data. |
| "Could not reach the server" | Three causes, in order: (1) the backend isn't running — keep the `composer serve` terminal open; (2) `CORS_ALLOWED_ORIGIN` in `backend/.env` must EXACTLY match the frontend URL — `http://localhost:3000` for `npx serve dist`, `http://localhost:5173` for `npm run dev` — restart `composer serve` after editing; (3) the frontend was built with the wrong `VITE_API_URL`. |
| "Invalid email or password" at login | The account doesn't exist yet — use the **Sign up** form first. Login never creates accounts. |
| `composer make-admin` says "No account found" | Signup hasn't succeeded yet (check phpMyAdmin → `users` — empty table = no signup), you registered a different email (promote that one), or you ran the command in a different project copy than the one serving (run it beside the active `composer serve`, same `.env`). |
| Pages error after login | Migrations weren't run — `composer migrate` in `backend/`. |
| "Pollinations now meters anonymous API use…" | Paste a free token from `auth.pollinations.ai` in Admin → AI Providers → Pollinations. |
| Gemini/Flux errors mention quota or balance | Real provider answers — add credits to those accounts or rely on Pollinations. |
| A change isn't visible in the browser | You're serving an old build — re-serve `frontend/dist/` or run `npm run build`, then hard-refresh (Ctrl+Shift+R). |
| Verification/reset emails don't arrive | Fill the `MAIL_*` values in `backend/.env` (step 11), then use Admin → Email → Send test. |
| CSV dates show `######` in Excel | That's Excel's narrow-column display — widen the column. |

## Everyday commands

| Where | Command | Purpose |
|---|---|---|
| backend/ | `composer serve` | run the API on :8000 |
| backend/ | `composer migrate` | apply database migrations |
| backend/ | `composer make-admin <email>` | promote a user to admin |
| backend/ | `composer credits-cycle` | reset cycle credit allowances (cron-able) |
| frontend/ | `npm run dev` | development server on :5173 |
| frontend/ | `npm run build` | production build into `dist/` |
| frontend/ | `npm run typecheck` | TypeScript check |
