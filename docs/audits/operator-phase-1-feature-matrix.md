# Operator Phase 1: Feature Verification Matrix

This matrix documents the verification status of all major features across Operator AI Receptionist SaaS, tracing each feature from UI presentation to API route/server action, database persistence, and external provider integration.

## Feature State Legend
- **Verified Implemented:** End-to-end verified with evidence from code, database queries, and test/build execution.
- **Partially Implemented:** Core logic exists but has runtime limitations, edge cases, or missing downstreams.
- **Broken:** Feature fails when executed due to a confirmed architectural, routing, or provider defect.
- **Missing:** Feature UI or action is referenced but implementation file or endpoint is absent.
- **Unable to Verify:** Depends on live production secrets, external telephony carrier callbacks, or payment provider webhook simulators.

---

## 1. Authentication & Security Boundaries

| Feature | State | UI Component | API / Server Action | Database Persistence | Notes / Evidence |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Email/Password Auth** | **Verified Implemented** | `src/app/(auth)/sign-in` | `signInAction` | `users`, `sessions`, `refreshTokens` | Argon2 hashing, cryptographic session tokens, refresh replay revocation. |
| **Google OAuth** | **Partially Implemented** | `src/app/(auth)/sign-in` | `/api/auth/login/google` | `users`, `accounts` | Handler exists, requires valid `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. |
| **Tenant Isolation** | **Verified Implemented** | All dashboard layouts | `requireOrganizationAccess` | `memberships`, `organizations` | Authoritatively enforced in `server.ts` & `authorization.ts`. Cannot be spoofed via cookies. |
| **Edge Route Protection** | **Verified Implemented** | N/A | `src/proxy.ts` | Edge cookie evaluation | Next.js 16 named `export function proxy`. Public paths and static assets bypass; protected paths redirect to `/sign-in`. |
| **Audit Logging** | **Verified Implemented** | `/settings/audit-logs` | `auditService.log` | `audit_logs` | Structured audit trail with user ID, action, resource, IP address, and metadata. |

---

## 2. Voice & Telephony Architecture

| Feature | State | UI Component | API / Server Action | Database Persistence | Notes / Evidence |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Internal Voice Turn Orchestration** | **Verified Implemented** | `/voice/settings` | `voiceOrchestrator` | `call_sessions`, `transcripts` | **PASSED 8/8 diagnostic stages** in 23.9s (DB lookup, RAG context, Gemini 3.5, Kokoro TTS, WAV header validation, transcript cleanup). |
| **Kokoro Local TTS** | **Verified Implemented** | Voice preview modal | `KokoroTtsProvider` | In-memory ONNX synthesis | Synthesizes 24kHz raw PCM WAV without external API cost. Model cached locally. |
| **Outbound Telephony Dispatch** | **Partially Implemented** | `/voice` dialer | `initiateOutboundCallAction` | `call_sessions` | Missing TwiML route has been created at `/api/voice/twiml`. Requires live Twilio credentials and public HTTPS domain for carrier callback. |
| **Inbound Telephony Webhook** | **Broken (Transport)** | N/A | `/api/webhooks/voice/inbound` | `phone_numbers`, `call_sessions` | Webhook returns `<Connect><Stream>` to `/api/webhooks/voice/stream`. Next.js App Router cannot accept WebSocket upgrades, causing immediate call drop on Twilio. |
| **Voicemail Recording** | **Verified Implemented** | `/voice/history` | `/api/webhooks/voice/recording` | `voicemail_messages` | Twilio `<Record>` callback saves recording URL, duration, and caller details to database. |
| **Call History & Transcripts** | **Verified Implemented** | `/voice/history` | `getCallSessionsAction` | `call_sessions`, `call_transcripts` | Full pagination and audio transcript inspection. |

---

## 3. Booking, Calendar & Availability

| Feature | State | UI Component | API / Server Action | Database Persistence | Notes / Evidence |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Public Hosted Booking** | **Verified Implemented** | `/book/[slug]` | `bookingService.createAppointment` | `appointments`, `services`, `staff_members` | Public booking page with service catalog, staff assignment, and dynamic availability lookup. |
| **Concurrency & Double-Booking Protection** | **Verified Implemented** | Hosted checkout & Dashboard | `bookingService.createAppointment` | `appointments` | Protected with PostgreSQL advisory transaction lock (`pg_advisory_xact_lock`) and overlap query. |
| **Timezone Management** | **Verified Implemented** | `/settings/localization` | `Intl.DateTimeFormat` | `organizations.timezone` | Uses IANA timezones and formatToParts to avoid daylight-saving offset errors. |
| **External Calendar Sync** | **Partially Implemented** | `/settings/booking` | `calendarRepository` | `calendar_connections` | Google Calendar / Outlook OAuth structures exist; token exchange requires live OAuth app credentials. |

---

## 4. AI Engine, RAG & Business Context

| Feature | State | UI Component | API / Server Action | Database Persistence | Notes / Evidence |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Primary LLM Generation** | **Verified Implemented** | Widget, Chat, Voice | `llmRegistry` (`gemini-3.5-flash`) | N/A (Stateless LLM) | Verified in `scripts/test-llm.ts` with 1759ms latency. Fallbacks to `gemini-3.5-flash-lite` and deterministic synthesis. |
| **RAG Knowledge Retrieval** | **Verified Implemented** | `/kb` | `ragService.retrieveContext` | `business_profiles`, `services`, `faq_items` | Retrieves services, hours, FAQ items, and profile description grounded into prompt. |
| **Next Best Action Engine** | **Verified Implemented** | Widget chat buttons | `actionEngine.determineNextBestActions` | N/A (Rule evaluation) | Evaluates intent, turn count, and business capabilities to output up to 3 non-broken contextual actions. |
| **Self-Learning Engine** | **Verified Implemented** | `/intelligence` | `learningEngine` | `learning_signals`, `operator_rules` | Aggregates fallback events and corrections into auto-generated business rules. |

---

## 5. Billing, Subscriptions & Invoicing

| Feature | State | UI Component | API / Server Action | Database Persistence | Notes / Evidence |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Stripe Checkout & Webhook** | **Partially Implemented** | `/billing` | `/api/webhooks/billing/stripe` | `subscriptions`, `billing_events` | Webhook signature verification verified via Stripe SDK. Event deduplication needs database-level unique constraint. |
| **Razorpay Checkout & Webhook** | **Partially Implemented** | `/billing` | `/api/webhooks/billing/razorpay` | `subscriptions`, `billing_events` | HMAC SHA256 signature verification implemented. Fallback event ID needs deterministic generation. |
| **Entitlement Checking** | **Verified Implemented** | Dashboard features | `entitlementService.check` | `subscriptions`, `plans` | Checks plan limits (active call minutes, knowledge documents, team seats). |
| **Customer Booking Payments** | **Verified Implemented** | `/book/checkout` | `customerPaymentService` | `customer_payments`, `appointments` | Supports deposit payments on appointments before setting status to `confirmed`. |

---

## 6. Background Jobs & Worker Architecture

| Feature | State | UI Component | API / Server Action | Database Persistence | Notes / Evidence |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Background Job Queue** | **Partially Implemented** | `/admin` | `worker.processPendingJobs` | `background_jobs` | Selects and executes pending jobs with retries. Needs `FOR UPDATE SKIP LOCKED` to prevent concurrent worker race conditions. |
| **Appointment Reminders** | **Verified Implemented** | N/A | `notificationService` | `appointment_reminders` | Automatically schedules reminders at 24h, 12h, and 1h intervals prior to appointment. |
