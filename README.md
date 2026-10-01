<div align="center">

# AI Creative Studio

**Six AI studios. One platform. Your SaaS.**

A complete, self-hosted AI design SaaS — Logo, Avatar, Tattoo, Image & Flyer
generation plus AI Image Description, with a credits economy, Stripe + PayPal
subscription billing, invoices, and a full admin panel.

`React 19` · `TypeScript` · `Vite` · `Tailwind CSS` · `PHP 8.2` · `MySQL` · `Stripe` · `PayPal`

</div>

---

## ✨ What's inside

| | |
|---|---|
| 🎨 **6 AI tools** | Logo, Avatar, Tattoo, Image, Flyer generators + vision-to-text Image Description |
| 🔁 **Triple AI engine** | Google Gemini · FLUX (Together AI) · Pollinations — priority order with automatic failover and live connection tests |
| 🆓 **Works free out of the box** | The Pollinations tier runs on a free registered token — first image with $0 in API credits |
| 🪙 **Credits economy** | Per-tool pricing, live balances, cycle allowances, and automatic refunds on failed runs |
| 💳 **Payments done** | Stripe Checkout + PayPal Orders v2, signature-verified webhooks, printable invoices, CSV export |
| 🗂 **Everything saved** | Per-image history, per-image favorites, click-to-preview, one-click re-runs, file manager with quotas |
| 🛠 **Full admin panel** | Users, tools, providers, plans, payments, credits, content, email templates, support inbox, reports, security logs |
| 🔐 **Real auth** | JWT + refresh tokens, email verification, password reset, active-session revoke |
| 📱 **Responsive & animated** | Dark "blueprint" app + light animated landing, light/dark brand marks, reduced-motion aware |

## 🚀 Quick start

```bash
# 1) Database
#    Create an empty MySQL database named  ai_creative_studio

# 2) Backend  (PHP 8.2 + Composer)
cd backend
cp .env.example .env          # set DB_USERNAME / DB_PASSWORD / JWT_SECRET
composer install
composer migrate
composer serve                # API → http://localhost:8000

# 3) Frontend  (prebuilt — no Node needed)
cd ../frontend
npx serve dist                # app → http://localhost:3000
#    dev mode instead:  cp .env.example .env && npm ci && npm run dev

```

### 4) Create your admin account — the order matters

```bash
# a) In the browser: open the app and use the SIGN UP form
#    (the one with a Name field) — e.g. admin@test.com / Admin@12345.
#    Signup must succeed BEFORE the next command can find the account.

# b) Promote that account (run in backend/, same folder as composer serve):
composer make-admin admin@test.com

# c) In the app: log OUT, then log IN again — the Admin menu appears.
#    Admin dashboard: http://localhost:3000/admin
```

> **Sign up creates the account · make-admin promotes it · re-login loads the
> admin role.** There are no default credentials — whatever you type into the
> Sign-up form IS the login.

Then in **Admin → AI Providers**, paste a free token from
[auth.pollinations.ai](https://auth.pollinations.ai), press **Test**, and flip
a tool to **Live** in **Admin → AI Tools** — you're generating. Full
walkthrough with troubleshooting: **[SETUP_GUIDE.md](SETUP_GUIDE.md)**.

## 🧭 Project structure

```
creative-studio/
├── backend/              PHP 8.2 REST API
│   ├── public/           web root
│   ├── routes/api.php    all routes
│   ├── src/              Controllers · Services · Repositories · Core
│   └── database/         32 migrations + CLI (migrate, make-admin, credits-cycle)
├── frontend/             React 19 + TypeScript app
│   ├── src/              features, components, config
│   └── dist/             prebuilt production bundle
├── SETUP_GUIDE.md        step-by-step install
└── CHANGELOG.md          build history
```

## ⚙️ Configuration map

| What | Where |
|---|---|
| AI provider keys (Gemini / Together / Pollinations) | in-app: **Admin → AI Providers** |
| Payment gateways + webhooks | in-app: **Admin → Payment Settings** — webhooks at `/api/v1/webhooks/stripe` & `/api/v1/webhooks/paypal` |
| Plans & pricing | in-app: **Admin → Subscription Plans** (yearly field = total per year) |
| Welcome credits for new users | in-app: **Admin → Credits Management** |
| SMTP (verification / reset emails) | `backend/.env` → `MAIL_*` |
| DB, JWT, URLs, CORS | `backend/.env` |
| API base URL (baked at build time) | `frontend/.env` → `VITE_API_URL`, then `npm run build` |

## 📋 Requirements

PHP **8.2+** (`pdo_mysql`, `curl`, `openssl`) · MySQL **5.7+** / MariaDB ·
Composer · Node 18+ *(development only — a production build is included)* ·
runs on shared, VPS, or dedicated hosting.

## 🎬 Demo

▶ Video walkthrough: *coming soon on YouTube*

## 📝 Honest notes

English-only interface · prompt-based generation (no image-to-image) ·
local-disk storage · one hosted-checkout charge per cycle (no card-on-file
auto-renewal) · no tax engine · email + password login.

## 🤝 Contributing

Issues and pull requests are welcome — bug reports, provider integrations,
translations, anything. Please open an issue first for bigger changes.

## 📄 License

**MIT** — free to use, modify, and self-host. See [LICENSE](LICENSE).

Built by **Aasim Ghaffar** ([CubixSol](https://cubixsol.com)) — full-stack PHP/React developer.
⭐ the repo if this saved you some build time.
