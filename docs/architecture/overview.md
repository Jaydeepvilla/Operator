# Architecture Overview

This document maps the complete Operator system architecture — how the pieces fit together, what each layer is responsible for, and what the primary data flows are.

---

## System diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Customer / End User                            │
│         WhatsApp · SMS · Facebook · Instagram · Email · Voice       │
│                   Web Chat Widget · Web Form                        │
└────────────────────┬────────────────────────────────────────────────┘
                     │ inbound message
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Webhook Receivers                              │
│           /api/webhooks/meta    /api/webhooks/voice/*               │
│           /api/webhooks/twilio  /api/widget/*                       │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│               Omnichannel Router                                     │
│    src/server/services/omnichannel/router.ts                        │
│                                                                     │
│  Identifies: organizationId, channelType, senderId                  │
│  Creates/updates: conversation record                               │
│  Appends: inbound message to conversationMessages                   │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│               Conversation Orchestrator                              │
│    src/server/services/orchestrator.ts                              │
│                                                                     │
│  Checks: escalation status, qualification state                     │
│  Calls: RAG → Prompt → LLM → Intent → Action                       │
│  Returns: AI response text                                          │
└──────────┬──────────────┬──────────────┬───────────────────────────┘
           │              │              │
           ▼              ▼              ▼
    RAG Service     Prompt Builder    LLM Registry
    (rag.ts)        (prompt.ts)      (llm.ts)
    SQL LIKE        Assembles         OpenAI / Gemini
    keyword         system prompt     / MockLLM
    search          from 8 parts
           │
           └──────────────────────────────┐
                                          ▼
                                   Intent → Action
                                   Book appointment
                                   Trigger escalation
                                   Answer question
                                   Continue conversation
```

---

## Layer overview

### 1. Presentation (Next.js App Router)

**Location:** `src/app/`

The app uses the Next.js App Router with a `src/` directory. All pages are Server Components by default. Client Components are marked with `"use client"` at the top of the file.

Key route groups:
- `(auth)` — Sign-in, sign-up, email verification, 2FA, password reset
- `(dashboard)` — All authenticated SaaS pages
- `(onboarding)` — Multi-step onboarding wizard
- `(marketing)` — Public pages (landing, pricing, features, etc.)
- `api/` — REST API routes, webhooks, and Server Actions

### 2. Middleware

**Location:** `src/proxy.ts`

The Next.js middleware checks for the `session_token` cookie on every incoming request. Public routes are whitelisted. All others redirect to `/sign-in` if the cookie is absent.

Note: The file is named `proxy.ts`, not `middleware.ts`. This is intentional and works correctly with Next.js.

### 3. Auth

**Location:** `src/lib/auth/`

Custom stateful session system using `crypto.randomBytes(32)` tokens stored in PostgreSQL. No Clerk, no NextAuth, no JWT.

Key files:
- `session.ts` — Create, rotate, refresh, and invalidate sessions
- `rate-limit.ts` — Database-backed login attempt throttling
- `security-checks.ts` — Reserved emails, disposable domains, common passwords
- `server.ts` — `getSession()` for Server Components and Server Actions
- `client.tsx` — `AuthProvider` and `useAuth()` for Client Components

### 4. Server Services

**Location:** `src/server/services/`

Pure business logic, no HTTP concerns. Services call repositories or the database directly.

| Service | Responsibility |
|---|---|
| `orchestrator.ts` | Central AI conversation brain — coordinates all services |
| `rag.ts` | Context retrieval from business profile, services, FAQs, knowledge chunks |
| `prompt.ts` | Constructs the system prompt from dynamic organization data |
| `llm.ts` | LLM provider registry (OpenAI, Gemini, Mock) |
| `intent.ts` | Extracts intent from conversation messages |
| `qualification.ts` | Manages lead qualification question flows |
| `scoring.ts` | Computes lead quality score |
| `escalation.ts` | Escalation state machine and trigger handling |
| `booking.ts` | Appointment creation, slot availability, reminder scheduling |
| `chunking.ts` | Text splitting for knowledge base documents |
| `ingestion/` | Knowledge document analysis, metadata extraction, quality assessment |
| `calendar-provider.ts` | Google Calendar, Outlook, Calendly integrations |
| `omnichannel/router.ts` | Channel-agnostic message routing |
| `omnichannel/whatsapp.ts` | Meta WhatsApp Business API |
| `omnichannel/instagram.ts` | Meta Instagram API |
| `omnichannel/facebook.ts` | Meta Facebook Messenger API |
| `omnichannel/email.ts` | Email handling |
| `voice/vapi.ts` | Vapi AI voice call management |
| `voice/twilio.ts` | Twilio voice/SMS |
| `voice/deepgram.ts` | Speech-to-text |
| `voice/elevenlabs.ts` | Text-to-speech |
| `voice/campaign.ts` | Outbound call campaigns |
| `billing/` | Stripe, Razorpay, LemonSqueezy, Paddle, PayPal |
| `notification.ts` | SMTP email, Twilio SMS, MSG91 SMS |
| `agency/impersonation.ts` | Agency-level user impersonation |

### 5. Repositories

**Location:** `src/server/repositories/`

Data access layer — one file per entity. Repositories contain raw Drizzle ORM queries. Services call repositories, not the database directly (where the pattern is followed).

### 6. Database

**Location:** `src/server/db/`

PostgreSQL accessed via [Drizzle ORM](https://orm.drizzle.team/).

- `schema.ts` — 3,232 lines, 129,799 bytes. Defines all tables and relations.
- `index.ts` — Exports the `db` singleton (postgres.js driver)

**Naming convention:** Table names are `snake_case`. Drizzle relation names are `camelCase`.

### 7. Design System

**Location:** `src/design-system/`

```
src/design-system/
├── foundations/
│   ├── colors.css        # HSL color tokens
│   ├── typography.css    # Font tokens
│   ├── spacing.css       # Spacing scale
│   ├── motion.css        # Animation duration/easing tokens
│   └── effects.css       # Shadow, blur tokens
└── button-tokens.ts      # Button variant design tokens (TypeScript)
```

All design values (colors, spacing, animation) are defined as CSS custom properties (CSS variables) in these files and consumed by components. Hardcoded values are flagged by Operator Doctor's `design-system` rule.

### 8. Component Library

**Location:** `src/components/`

```
src/components/
├── shared/       # 37 reusable UI components
├── forms/        # Form components (OnboardingWizard, etc.)
└── motion/       # Animation wrappers
    └── scroll-reveal.tsx  # Viewport-based scroll reveal
```

### 9. Hooks

**Location:** `src/hooks/`

Custom React hooks for data fetching, UI state management, and feature-specific logic.

---

## Data model summary

The schema has 40+ tables. Key entities:

| Entity | Table | Description |
|---|---|---|
| Organization | `organizations` | Tenant (business) |
| User | `users` | Person with access |
| Membership | `memberships` | User ↔ Organization relationship with role |
| Business Profile | `businessProfiles` | Description, contact details |
| Business Settings | `businessSettings` | Hours, booking prefs, notifications |
| Service | `services` | Bookable services |
| Staff | `staff` | Employees who can be assigned to appointments |
| Appointment | `appointments` | Booked slots |
| Lead | `leads` | Customer profiles from conversations |
| Conversation | `conversations` | Active/historical chat sessions |
| Channel Connection | `channelConnections` | Integration credentials per channel |
| Knowledge Document | `knowledgeDocuments` | Uploaded or imported content |
| Knowledge Chunk | `knowledgeChunks` | Split segments of documents |
| FAQ Item | `faqItems` | Question-answer pairs |
| Qualification Flow | `qualificationFlows` | Multi-step lead qualification config |
| Escalation | `escalations` | Human handoff records |
| Billing | `subscriptions`, `invoices`, `billingUsage` | SaaS billing |
| Session | `sessions` | Active auth sessions |
| Refresh Token | `refreshTokens` | Auth token rotation |
| Login Attempt | `loginAttempts` | Rate limiting audit log |
| Device | `devices` | Device fingerprinting |

Full schema: `src/server/db/schema.ts`

---

## Multi-tenancy

Operator is multi-tenant. Every data table includes `organizationId` as a foreign key. All database queries **must** filter by `organizationId` to prevent cross-tenant data access.

Organizations are created during onboarding. One organization can have multiple members with different roles.

### Roles

| Role | Description |
|---|---|
| `owner` | Full access, can delete organization |
| `admin` | Full access except org deletion |
| `manager` | Can manage most settings, cannot manage billing |
| `staff` | Limited access — own appointments, conversations |

---

## Request lifecycle

```
1. Browser / webhook → Next.js
2. src/proxy.ts (middleware) → session_token check
3. Next.js routes request to:
   a. Page (Server Component) → calls getSession() → renders HTML
   b. API route → validates session or webhook signature
   c. Server Action → validates session inline
4. Server component / action calls service layer
5. Service calls repository (or db directly)
6. Repository queries PostgreSQL via Drizzle ORM
7. Response returned to client
```

---

## External service dependencies

| Service | Capability | Status | Target Market / Role |
|---|---|---|---|
| PostgreSQL | Primary database | Active | Core database (149 tables) |
| OpenAI / Gemini | LLM Orchestration & Prompting | Active | Conversational AI core |
| Stripe | SaaS Billing & Subscriptions | Active | Primary US & EU payments |
| Vonage | Voice Telephony & SMS | Active | Primary US & EU Voice & SMS gateway |
| Sinch | Voice Telephony & SMS | Optional | Fallback US & EU carrier integration |
| Meta Cloud API | WhatsApp Business | Active | Primary WhatsApp conversational intake |
| Resend | Transactional Email | Active | Primary modern email dispatch |
| Postmark | Transactional Email | Optional | High-deliverability alternative |
| Google Calendar | Two-way Calendar Sync | Active | Primary staff calendar integration |
| Microsoft Graph | Outlook / 365 Calendar | Active | Enterprise calendar sync |
| Cal.com | Booking Engine | Active | Self-hosted & cloud booking engine |

---

## Key architectural decisions

### Why no Clerk?

The product requires full control over the authentication lifecycle — device tracking, custom lockout rules, branded email templates, and the ability to add security features without waiting for a third-party SDK update.

### Why Drizzle and not Prisma?

Drizzle provides better raw SQL escape hatches, is lighter, and its type system integrates better with the complex schema required for multi-tenant SaaS.

### Why no vector embeddings in RAG?

The current SQL `LIKE` keyword search is simpler to operate (no embedding service, no vector database), works well for businesses with structured content (services list, FAQ, policies), and requires zero additional infrastructure. A vector search upgrade path exists via `src/server/services/vector.ts` when scale or retrieval quality demands it.

### Why proxy.ts instead of middleware.ts?

Historical naming artifact. The file was named `proxy.ts` when the project was created and the behavior is identical. Renaming is safe if desired, but there is no functional difference.
