# Operator — Product Inventory & Architecture Map

## 1. Executive Overview

Operator is an autonomous AI receptionist and omnichannel customer interaction SaaS platform built for service businesses (clinics, salons, law firms, dental practices, consultants, agencies). The platform automates inbound phone calls, website chat widgets, SMS, WhatsApp, and social messaging, managing appointment scheduling, customer inquiries, FAQs, and lead qualification with multi-tenant isolation.

---

## 2. Technology Stack & Framework Foundation

| Dimension | Technology | Configuration / Version |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router) | React 19, Server Components & Server Actions |
| **Language** | TypeScript 5.x | Strict mode (`tsc --noEmit` verified clean) |
| **Database ORM** | Drizzle ORM | PostgreSQL (Neon / Serverless pg) |
| **Authentication** | Custom Lucia-style cookie sessions | SHA-256 session tokens, rotating refresh tokens, Google OAuth 2.0 |
| **Styling** | Tailwind CSS & Design System | Semantic token architecture (`src/design-system/tokens/`) |
| **Icons & Motion** | Lucide React & Framer Motion | Accessible SVGs, reduced-motion fallbacks |
| **AI Runtime** | Google Gemini (@google/genai) / Local Engine | Hybrid memory, structured JSON tools, grounding guards |
| **Telephony / Voice** | Twilio / WebRTC / Kokoro TTS | WebSocket audio streaming, Kokoro-82M ONNX speech synthesis, telephony state machine |
| **Payments & Billing**| Stripe API & Webhooks | Dynamic subscription engine, usage metering, trial-to-paid lifecycle |

---

## 3. Route & Page Inventory

### 3.1 Public Marketing & Legal Pages
- `/`: Landing page featuring interactive receptionist hero simulation, feature breakdown, social proof, and tier matrix.
- `/pricing`: Tiered pricing comparison (`Starter`, `Professional`, `Business`), add-ons, and FAQ.
- `/demo`: Interactive AI receptionist playground simulation.
- `/privacy`: Privacy policy, GDPR/CCPA data handling, and tenant data retention details.
- `/terms`: Terms of service, acceptable use policy, and telephony SLA.
- `/security`: Security posture, encryption-at-rest, tenant isolation invariants, and bug bounty contact.
- `/contact`: Inbound sales and customer support submission form.

### 3.2 Authentication & Session Lifecycle (`(auth)`)
- `/login`: Email + password authentication and Google OAuth entry.
- `/register`: User registration with strict password policy and disposable email blocking.
- `/forgot-password`: Password reset request flow.
- `/reset-password`: Token-verified password reset completion.
- `/verify-email`: Email verification token handler.
- `/api/auth/callback/google`: OAuth callback handler with email verification validation and suspended user guards.
- `/api/auth/me`: Current authenticated user session inspector.
- `/api/auth/logout`: Server-side session invalidation and cookie clearing.

### 3.3 Onboarding Journey (`(onboarding)`)
- `/onboarding`: Multi-step business setup wizard (Business name, industry, operating hours, phone provisioning, services catalog, and calendar sync).
- Server Actions: `createOrganizationAction`, `completeOnboardingAction`.

### 3.4 Authenticated Dashboard (`(dashboard)`)
- `/dashboard`: Primary operations hub (KPI widgets, daily brief, live call feed, recent inquiries, appointment queue).
- `/appointments`: Real-time calendar & appointment schedule manager, manual booking modal, reschedule/cancel actions.
- `/inbox`: Unified omnichannel inbox (SMS, Web Widget, WhatsApp, Email, Voice transcripts) with human handover toggle.
- `/customers`: CRM contact database, customer profile history, sentiment scores, and interaction logs.
- `/services`: Service catalog editor (name, duration, pricing, buffer times, assigned staff).
- `/knowledge`: AI knowledge base manager (file uploads, URL scraping, FAQ editor, sync status).
- `/voice`: Voice receptionist operations, call logs, audio playback, transcription inspector.
- `/voice/settings`: Telephony provisioning, voice model selection, prompt customization, escalation phone configuration.
- `/intelligence`: Analytics & AI insights dashboard, conversion metrics, query heatmaps, unanswered queries.
- `/integrations`: Third-party integration hub (Google Calendar, Stripe, Twilio, WhatsApp, Zapier, Webhooks).
- `/settings`: Organization settings, business profile, team members, staff permissions.
- `/settings/billing`: Subscription tier manager, usage metering bars, invoice history, payment method modal.

### 3.5 Administrative Portal (`(dashboard)/admin`)
- `/admin/organizations`: Multi-tenant organization list, suspension controls, plan overrides.
- `/admin/users`: Global user search, role escalation/demotion, security event logs.
- `/admin/metrics`: Platform-wide ARR, MRR, churn rate, AI token consumption, API latency stats.

### 3.6 Embeddable Endpoints
- `/widget-frame`: Sandboxed iframe client widget for customer websites, containing quick action chips, AI chat stream, and appointment booking flow.
- `/embedded/calendar`: Public standalone booking page for external customer scheduling.

---

## 4. API Endpoints & Server Actions Inventory

### 4.1 Server Actions (`src/server/actions/`)
- `auth.ts`: `registerAction`, `loginAction`, `logoutAction`, `resetPasswordAction`.
- `onboarding.ts`: `createOrganizationAction`, `completeOnboardingStepAction`.
- `appointments.ts`: `createAppointmentAction`, `rescheduleAppointmentAction`, `cancelAppointmentAction`.
- `billing.ts`: `createCheckoutSessionAction`, `cancelSubscriptionAction`, `upgradePlanAction`, `revokeCancellationAction`.
- `knowledge.ts`: `uploadDocumentAction`, `syncUrlAction`, `deleteKnowledgeDocAction`.
- `progress.ts`: `dismissNotificationAction`, `markNotificationAsReadAction`, `snoozeNotificationAction`.
- `services.ts`: `createServiceAction`, `updateServiceAction`, `deleteServiceAction`.
- `staff.ts`: `inviteStaffAction`, `updateStaffRoleAction`, `removeStaffAction`.
- `voice.ts`: `provisionNumberAction`, `updateVoiceSettingsAction`, `testVoiceCallAction`.
- `widget.ts`: `getWidgetConfigAction`, `saveWidgetThemeAction`.

### 4.2 Route Handlers (`src/app/api/`)
- `/api/webhooks/stripe`: Stripe payment and subscription lifecycle webhooks (signature verified, idempotent).
- `/api/webhooks/twilio`: Inbound call status and SMS webhook receiver.
- `/api/cron/appointment-reminders`: Automated 24h and 1h SMS/email reminder dispatcher.
- `/api/cron/trial-monitor`: Automated 14-day trial expiration and grace period processor.
- `/api/voice/stream`: WebSocket endpoint for real-time bidirectional voice audio processing.

---

## 5. Database Schema & Data Dependencies

| Table | Primary Key | Key Foreign Keys | Purpose |
| :--- | :--- | :--- | :--- |
| `users` | `id` (text) | — | Global identity, email, password hash, status (`active`, `suspended`) |
| `sessions` | `id` (text) | `userId -> users.id` | Active sessions with user agent, IP hash, expiration |
| `organizations` | `id` (uuid) | `ownerId -> users.id` | Multi-tenant boundary, name, timezone, onboarding status |
| `organization_members`| `id` (uuid) | `userId`, `orgId` | Role-based membership (`owner`, `admin`, `member`) |
| `subscriptions` | `id` (uuid) | `orgId -> organizations.id`| Stripe customer ID, status (`trialing`, `active`, `past_due`, `canceled`) |
| `appointments` | `id` (uuid) | `orgId`, `customerId`, `serviceId`| Booked events, start/end timestamps, status, timezone |
| `services` | `id` (uuid) | `orgId -> organizations.id`| Service offerings, price in cents, duration in minutes |
| `customers` | `id` (uuid) | `orgId -> organizations.id`| Inbound caller/chatter contacts, phone, email, notes |
| `knowledge_documents` | `id` (uuid) | `orgId -> organizations.id`| Indexed business FAQs, embeddings, raw text |
| `voice_calls` | `id` (uuid) | `orgId`, `customerId` | Call logs, recording URLs, transcripts, sentiment, duration |
| `smart_notifications` | `id` (uuid) | `userId`, `orgId` | User alerts, snooze status, priority |

---

## 6. External Integrations Matrix

| Provider | Integration Type | Authentication | Status |
| :--- | :--- | :--- | :--- |
| **Stripe** | Payment gateway & billing | Webhook HMAC secret + API key | Operational & Tested |
| **Twilio** | Voice telephony & SMS | Auth token + Webhook signature | Operational & Mocked in test |
| **Google Calendar** | Bi-directional schedule sync | OAuth 2.0 Refresh Token | Operational & Schema-verified |
| **Google Gemini** | AI Receptionist LLM Engine & Embeddings | API Key (runtime) / Local fallback | Evaluated (106 queries, 100% intent) |
| **Resend / Postmark** | Transactional email | API Key | Operational |
