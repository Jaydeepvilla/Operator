# Operator

**Production-grade AI Receptionist SaaS platform.**

Operator enables businesses to deploy a 24/7 AI receptionist that handles inbound communications across voice, WhatsApp, SMS, Facebook Messenger, Instagram, web chat, and email — qualifying leads, booking appointments, and escalating to human agents when required.

---

## What it does

- **Omnichannel conversations** — WhatsApp, SMS, Facebook Messenger, Instagram, email, web widget, voice (Vapi + Twilio + Deepgram + ElevenLabs)
- **Lead qualification** — Configurable multi-step qualification flows with answer types: text, single-select, multi-select, number
- **Appointment booking** — Natural-language date parsing, staff availability checks, Google Calendar sync, reminder scheduling
- **AI Receptionist** — RAG-augmented context retrieval, LLM completion (OpenAI gpt-4o-mini primary, Gemini 2.5 Flash secondary), hallucination prevention rules
- **Escalation management** — Five trigger reasons, conversation status transitions, human agent handoff
- **Multi-tenant** — Organizations, memberships, role-based access (owner / admin / manager / staff)
- **Billing** — Stripe, Razorpay, LemonSqueezy, Paddle, PayPal

---

## Technology

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.9 (App Router, `src/` directory) |
| Language | TypeScript 5 |
| Database | PostgreSQL via Drizzle ORM |
| Auth | Custom session tokens (`src/lib/auth/`) — not Clerk |
| Styling | Tailwind CSS v4 + custom design system tokens |
| Animation | Framer Motion 12 |
| AI | OpenAI gpt-4o-mini / Google Gemini 2.5 Flash |
| Voice | Vapi AI, Twilio, Deepgram, ElevenLabs |
| Calendar | Google Calendar API (OAuth, direct HTTP) |
| Testing | Playwright |
| Quality | Operator Doctor (custom static analysis CLI) |

---

## Prerequisites

- Node.js ≥ 20
- PostgreSQL ≥ 14 (local or hosted)
- `tsx` is used to run TypeScript scripts directly (installed as a transitive dev dependency)

---

## Getting started

```bash
# 1. Clone
git clone <repo-url>
cd dynamicos

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env

# 4. Edit .env — fill in DATABASE_URL and at minimum OPENAI_API_KEY or GEMINI_API_KEY
# See docs/developer-guide/environment-variables.md for the full reference

# 5. Push the schema to your database
npx drizzle-kit push

# 6. Seed the database with a demo organization
npm run db:seed

# 7. Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`.

Default seed credentials are printed to the console after `npm run db:seed`.

---

## Project structure

```
dynamicos/
├── src/
│   ├── app/                     # Next.js App Router pages and API routes
│   │   ├── (auth)/              # Sign-in, sign-up, email verification, 2FA
│   │   ├── (dashboard)/         # All authenticated dashboard routes
│   │   ├── (onboarding)/        # Onboarding wizard (new org setup)
│   │   ├── api/                 # API routes: auth, webhooks, health, cron, billing
│   │   └── (marketing)/         # Public marketing pages
│   ├── components/
│   │   ├── shared/              # 37 shared UI components
│   │   ├── forms/               # Form components including OnboardingWizard
│   │   └── motion/              # Animation wrappers (ScrollReveal, etc.)
│   ├── design-system/
│   │   ├── foundations/         # CSS tokens: colors, typography, spacing, motion, effects
│   │   └── button-tokens.ts     # Button design tokens
│   ├── hooks/                   # Custom React hooks
│   ├── lib/
│   │   └── auth/                # Custom auth: session, rate-limit, security-checks
│   └── server/
│       ├── db/                  # Drizzle schema (3,232 lines) and database client
│       ├── repositories/        # Data access layer (one file per entity)
│       ├── services/            # Business logic services
│       │   ├── orchestrator.ts  # Central AI conversation orchestrator
│       │   ├── rag.ts           # Context retrieval (SQL keyword search)
│       │   ├── prompt.ts        # System prompt builder
│       │   ├── llm.ts           # LLM provider registry
│       │   ├── omnichannel/     # Channel providers (WhatsApp, SMS, Facebook, Instagram, Email)
│       │   ├── voice/           # Voice providers (Vapi, Twilio, Deepgram, ElevenLabs)
│       │   ├── billing/         # Billing providers (Stripe, Razorpay, LemonSqueezy, Paddle, PayPal)
│       │   └── ingestion/       # Knowledge base ingestion pipeline
│       └── actions/             # Next.js Server Actions
├── scripts/
│   ├── doctor/                  # Operator Doctor — custom static analysis CLI
│   └── seed/                    # Database seeding scripts
├── tests/                       # Playwright E2E tests
├── docs/                        # Documentation
├── operator-doctor.config.ts    # Operator Doctor configuration
└── src/proxy.ts                 # Next.js middleware (route protection)
```

---

## Authentication

Operator uses a **custom session-based auth system** — not Clerk, not NextAuth.

- Sessions: `crypto.randomBytes(32)` tokens stored as HttpOnly cookies
- Standard session: 2 hours (or session-lifetime without `rememberMe`)
- Remember Me session: 30 days
- Refresh tokens: 30-day rotation
- Device fingerprinting: `src/lib/auth/session.ts`
- Rate limiting: `src/lib/auth/rate-limit.ts`
- Security checks: `src/lib/auth/security-checks.ts`
- 2FA: TOTP-based, stored in `users.twoFactorSecret`

The `.env.example` file contains legacy Clerk environment variables — **do not configure Clerk**. They are not used.

---

## Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server (4 GB Node heap) |
| `npm run build` | Build production bundle |
| `npm run lint` | Run ESLint |
| `npm run db:seed` | Seed database with demo organization and user |
| `npm run db:clean` | Clear all data from the database |
| `npm run db:reset` | Clear and re-seed the database |
| `npm run operator:doctor` | Run Operator Doctor (full audit, all 15 rules) |
| `npm run doctor:design` | Run design system rule only |
| `npm run doctor:components` | Run components rule only |
| `npm run doctor:motion` | Run motion rule only |
| `npm run doctor:icons` | Run icons rule only |
| `npm run doctor:responsive` | Run responsive rule only |
| `npm run doctor:accessibility` | Run accessibility rule only |

---

## Environment variables

A complete reference is in [`docs/developer-guide/environment-variables.md`](docs/developer-guide/environment-variables.md).

Quick summary:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_APP_URL` | Yes | Base URL of the app (e.g. `http://localhost:3000`) |
| `OPENAI_API_KEY` | One of these two | LLM provider (primary) |
| `GEMINI_API_KEY` | One of these two | LLM provider (secondary) |
| `GOOGLE_CLIENT_ID` | Google Calendar only | OAuth for calendar integration |
| `GOOGLE_CLIENT_SECRET` | Google Calendar only | OAuth for calendar integration |
| `VAPI_API_KEY` | Voice only | Vapi AI voice calls |
| `VAPI_ASSISTANT_ID` | Voice only | Vapi assistant ID |
| `VAPI_PHONE_NUMBER_ID` | Voice only | Vapi phone number ID |
| `TWILIO_ACCOUNT_SID` | SMS/Voice only | Twilio integration |
| `TWILIO_AUTH_TOKEN` | SMS/Voice only | Twilio integration |
| `TWILIO_PHONE_NUMBER` | SMS/Voice only | Outbound caller ID |
| `DEEPGRAM_API_KEY` | Voice only | Speech-to-text |
| `ELEVENLABS_API_KEY` | Voice only | Text-to-speech |
| `STRIPE_SECRET_KEY` | Billing only | Stripe payment processing |
| `STRIPE_WEBHOOK_SECRET` | Billing only | Stripe webhook validation |
| `SMTP_HOST` | Email only | Outbound email host |
| `SMTP_PORT` | Email only | Outbound email port |
| `SMTP_USER` | Email only | SMTP username |
| `SMTP_PASS` | Email only | SMTP password |
| `CRON_SECRET` | Cron only | Bearer token for `/api/cron/jobs` |

If neither `OPENAI_API_KEY` nor `GEMINI_API_KEY` is set, the system falls back to `MockLLMProvider`, which returns deterministic test responses. This is acceptable for UI development but will not produce real AI responses.

---

## Operator Doctor

Operator Doctor is a custom static analysis CLI tool that audits the codebase across 15 rules: accessibility, AI compliance, components, design system, functionality, hardcoded values, icons, motion, performance, responsive design, routing, security, SEO, UI quality, and unused code.

```bash
# Full audit
npm run operator:doctor

# Options
npm run operator:doctor -- --rule security
npm run operator:doctor -- --category design
npm run operator:doctor -- --list
npm run operator:doctor -- --strict
npm run operator:doctor -- --sarif
npm run operator:doctor -- --baseline
```

See [`docs/operator-doctor/overview.md`](docs/operator-doctor/overview.md) for the full CLI reference.

---

## Middleware

Next.js middleware is configured in `src/proxy.ts` (not the conventional `middleware.ts` filename). The file exports `default` and `config.matcher` — Next.js picks this up correctly.

Public routes are explicitly whitelisted. All other routes require a valid `session_token` cookie. If missing, the user is redirected to `/sign-in?redirect=<original-path>`.

---

## Documentation

Full documentation is in the [`docs/`](docs/) directory.

Key starting points:
- [Installation](docs/getting-started/installation.md)
- [Environment Variables](docs/developer-guide/environment-variables.md)
- [Authentication Architecture](docs/architecture/authentication.md)
- [AI Pipeline](docs/ai/overview.md)
- [Operator Doctor](docs/operator-doctor/overview.md)

---

## Production domain

`nexxtechnologies.com`
