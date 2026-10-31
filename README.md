# Operator

**Production-grade Operator AI SaaS platform.**

Operator enables businesses to deploy a 24/7 Operator AI assistant that handles inbound customer communications across WhatsApp, website chat, SMS, and voice calls — qualifying leads, scheduling appointments directly on real calendars, collecting payment deposits, and escalating to human staff when required.

---

## Key Features

- **Omnichannel Conversations** — WhatsApp Business (Meta Cloud API), Website Chat widget, SMS (Vonage), and Conversational Voice turns.
- **Lead Qualification** — Multi-step qualification flows with natural language entity extraction.
- **Appointment Booking** — Real-time availability engine, Google Calendar bidirectional sync, automated 24-hour reminder jobs.
- **Operator AI Engine** — RAG-augmented context retrieval, Google Gemini (sole AI provider: `gemini-2.5-flash`), with strict business boundary enforcement and zero hallucination rules.
- **Escalation Management** — Urgent sentiment & policy trigger escalation, human staff handover mode.
- **Multi-Tenant Architecture** — Organizations, team staff profiles, role-based access control (owner / admin / manager / staff).
- **Billing & Deposits** — Razorpay payment gateway integration for appointment deposits and subscription billing events.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.9 (App Router, `src/` directory, Turbopack) |
| Language | TypeScript 5 |
| Database | PostgreSQL with Drizzle ORM |
| Auth | Custom session cookies (`src/lib/auth/`) with HMAC validation & 2FA |
| Styling | Tailwind CSS v4 + custom design system tokens |
| AI Provider | Google Gemini (`@google/genai` SDK) |
| Telephony & SMS | Vonage API (inbound call handling, speech turns, SMS notifications) |
| WhatsApp | Meta Cloud API (WhatsApp Business Graph API) |
| Payments | Razorpay (checkout orders, verification, webhook signature processing) |
| Email | Resend API (transactional booking confirmations & magic links) |
| Speech Engine | Kokoro TTS (in-process ONNX runtime) & Inworld AI TTS |
| Calendar | Google Calendar API (OAuth2 integration) |
| Testing | Playwright & TypeScript compiler |

---

## Prerequisites

- Node.js ≥ 20
- PostgreSQL ≥ 14 (local instance or managed Postgres like Neon / Supabase)
- npm ≥ 10

---

## Quickstart Guide

Follow these steps to set up the project from scratch:

### 1. Clone & Install Dependencies

```bash
git clone <repo-url>
cd dynamicos
npm install
```

### 2. Configure Environment Variables

Copy the example environment configuration:

```bash
cp .env.example .env
```

Open `.env` and fill in the required variables (at minimum `DATABASE_URL` and `GEMINI_API_KEY` for local development):

```env
# Core Database
DATABASE_URL="<your_neon_or_postgres_connection_string>"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# AI / LLM Engine (Sole Provider)
GEMINI_API_KEY="AIzaSy..."

# Payments (Razorpay)
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
RAZORPAY_WEBHOOK_SECRET="..."

# Voice & SMS Telephony (Vonage)
VONAGE_API_KEY="..."
VONAGE_API_SECRET="..."
VONAGE_FROM_NUMBER="Operator"

# Transactional Email (Resend)
RESEND_API_KEY="re_..."
EMAIL_FROM="Operator <onboarding@yourdomain.com>"

# WhatsApp Business (Meta Developer Cloud API)
META_PHONE_NUMBER_ID="..."
META_ACCESS_TOKEN="..."
META_VERIFY_TOKEN="operator_meta_verify_token"
META_APP_SECRET="..."

# Cron Security
CRON_SECRET="your-secure-cron-token"
```

### 3. Initialize the Database

Push the Drizzle schema to your PostgreSQL database and seed the default organization:

```bash
# Push schema tables
npx drizzle-kit push

# Seed sample organization, services, staff roster, and owner credentials
npm run db:seed
```

Default demo credentials will be printed to the terminal upon successful seed completion.

### 4. Start the Application

```bash
npm run dev
```

The application will be live at `http://localhost:3000`.

---

## Available Scripts

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `next dev` | Start development server with Turbopack |
| `npm run build` | `next build` | Create optimized production build |
| `npm run typecheck` | `tsc --noEmit` | Validate TypeScript typing across all files |
| `npm run db:seed` | `tsx scripts/seed/index.ts` | Seed database with initial business data |
| `npm run db:clean` | `tsx scripts/clear-system.ts` | Reset all test and demo records |
| `npm run db:reset` | `npm run db:clean && npm run db:seed` | Full clean & re-seed |
| `npm run operator:doctor` | `tsx scripts/doctor/index.ts` | Run codebase health & design system audit |

---

## Environment Variables Reference

Matches `.env.example`:

| Environment Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Public application URL (`http://localhost:3000`) |
| `GEMINI_API_KEY` | **Yes** | Google Gemini API key for conversational AI & embeddings |
| `RAZORPAY_KEY_ID` | Optional | Razorpay key ID for deposit payments |
| `RAZORPAY_KEY_SECRET` | Optional | Razorpay key secret for HMAC signature verification |
| `RAZORPAY_WEBHOOK_SECRET`| Optional | Secret for verifying incoming Razorpay webhooks |
| `VONAGE_API_KEY` | Optional | Vonage API key for SMS alerts and voice calling |
| `VONAGE_API_SECRET` | Optional | Vonage API secret |
| `VONAGE_FROM_NUMBER` | Optional | Default caller ID / sender name for SMS |
| `RESEND_API_KEY` | Optional | Resend API key for appointment and booking emails |
| `EMAIL_FROM` | Optional | Sender email address (e.g., `Operator <info@domain.com>`) |
| `META_PHONE_NUMBER_ID` | Optional | Meta Cloud WhatsApp Business phone number ID |
| `META_ACCESS_TOKEN` | Optional | Meta System User Graph API access token |
| `META_VERIFY_TOKEN` | Optional | Webhook challenge verification token |
| `META_APP_SECRET` | Optional | Meta app secret for HMAC-SHA256 signature validation |
| `KOKORO_TTS_URL` | Optional | Optional remote Kokoro TTS endpoint (defaults to local ONNX) |
| `CRON_SECRET` | Optional | Secret bearer token guarding `/api/cron/*` endpoints |

---

## Project Structure

```
dynamicos/
├── src/
│   ├── app/                     # Next.js App Router (pages, layouts, API routes)
│   │   ├── (auth)/              # Sign-in, sign-up, password reset, 2FA
│   │   ├── (dashboard)/         # Authenticated dashboard (Inbox, Calendar, Staff, Billing)
│   │   ├── (onboarding)/        # Business onboarding flow
│   │   ├── (marketing)/         # Public marketing & pricing pages
│   │   └── api/                 # Webhooks (Meta, Vonage, Razorpay), cron jobs, widget API
│   ├── components/              # Shared UI components, forms, icons, modals
│   ├── design-system/           # CSS tokens (typography, color variables, spacing)
│   ├── lib/                     # Client/shared utilities (auth, pricing, validation)
│   ├── server/                  # Server-side business logic
│   │   ├── db/                  # Drizzle ORM schema & Postgres client
│   │   ├── repositories/        # Database query & mutation methods
│   │   ├── services/            # Core services (orchestrator, voice, billing, crm)
│   │   └── actions/             # Next.js Server Actions
│   └── proxy.ts                 # Route security & session verification middleware
├── tests/                       # Playwright integration & acceptance test suites
├── docs/                        # Architecture, feature, and operational documentation
├── drizzle.config.ts            # Drizzle Kit configuration
└── package.json                 # Dependencies & scripts
```

---

## License

This project is licensed under the [MIT License](LICENSE).
