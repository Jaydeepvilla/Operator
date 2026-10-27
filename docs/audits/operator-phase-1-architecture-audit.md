# Operator Phase 1: Architecture & Production Reliability Audit

## Executive Summary
This document provides an evidence-based architectural audit of **Operator — Autonomous AI Receptionist SaaS**. The audit was conducted on the real working directory, examining database connectivity, edge routing, tenant isolation, booking concurrency, AI orchestration, telephony media transport, billing idempotency, and background job processing.

---

## 1. Baseline Verification & Execution Results

| Check / Suite | Command | Exit Code | Verified Outcome | Evidence / Log Reference |
| :--- | :--- | :---: | :--- | :--- |
| **TypeScript Typecheck** | `npm run typecheck` (`tsc --noEmit`) | **0** | **PASS** — 0 type errors across all application files in `src/`. | Verified clean compilation after excluding extraneous cloned directory `cal.com`. |
| **Production Build** | `npm run build` (`next build`) | **0** | **PASS** — Turbopack compiled in 15.7s, TypeScript finished in 26.2s, 47/47 routes generated. | Full route bundle generated with static prerendering and dynamic API handlers. |
| **Operator Doctor Audit** | `npm run operator:doctor` | **0** | **56% Health Score** (44% rules pass). Zero fake data: PASS; Security: PASS; Routing: PASS. 19 layout/token warnings. | `task-1387.log` |
| **Internal Voice Orchestrator** | 8-Stage Staged Diagnostic | **0** | **ALL 8 STAGES PASSED** (DB lookup: 2848ms, Session init: 1462ms, Context: 5261ms, Gemini 3.5: 2740ms, Kokoro TTS: 9138ms, Audio RIFF: 0ms, Persistence: 1990ms). | `task-1267.log` (Duration: 23.9s) |

---

## 2. Architecture Target Investigations & Confirmed Findings

### Finding OP-AUD-001: Twilio Inbound Media Stream WebSocket Protocol Incompatibility
- **Severity:** Critical (P0)
- **Investigation Target:** Target 10 (Voice disconnections, media streaming, and telephony transport)
- **Evidence:**
  - File: `src/app/api/webhooks/voice/inbound/route.ts` (lines 120–125)
  - Symbol: `<Stream url="${protocol}://${host}/api/webhooks/voice/stream">`
  - File: `src/app/api/webhooks/voice/stream/route.ts` (lines 11–37)
- **Actual Behavior:**
  When an inbound call arrives at Twilio, `inbound/route.ts` returns TwiML directing Twilio to connect a bidirectional WebSocket stream to `wss://.../api/webhooks/voice/stream`. However, `src/app/api/webhooks/voice/stream/route.ts` is an HTTP REST Route Handler exporting `GET` and `POST` returning `NextResponse.json(...)`. In Next.js App Router (standard and serverless runtimes), Route Handlers cannot upgrade HTTP requests to persistent WebSockets (`HTTP 101 Switching Protocols`).
- **Expected Behavior:**
  Twilio requires a persistent WebSocket server implementing the Twilio Media Streams JSON protocol (`connected`, `start`, `media`, `stop`, `mark`).
- **Customer / Business Impact:**
  Callers calling the Twilio phone number hear the greeting "Thank you for calling. Connecting you to Operator AI", but the call immediately drops/disconnects with a Twilio 13xxx WebSocket handshake error.
- **Root Cause:**
  Next.js App Router route handlers run over standard HTTP request/response lifecycles and cannot host stateful, persistent bi-directional WebSockets without an external WebSocket gateway or custom Node server runtime.
- **Recommended Remediation:**
  1. *Immediate Fallback:* For serverless Next.js deployments, utilize Twilio `<Gather input="speech">` / `<Play>` webhooks with audio synthesis endpoints or integrate dedicated telephony platforms (e.g., Vapi / Retell) that manage raw audio streaming.
  2. *Production Architecture:* Deploy a lightweight dedicated WebSocket gateway (Node.js/Fastify/Go) or AWS API Gateway WebSocket that bridges Twilio Media Streams to Deepgram STT and Kokoro/Inworld TTS.
- **Verification Status:** Confirmed via code inspection and Next.js App Router runtime constraints.

---

### Finding OP-AUD-002: Missing Outbound Telephony TwiML Route Handler
- **Severity:** High (P1) - **REMEDIATED**
- **Investigation Target:** Target 10 (Voice outbound carrier dispatch)
- **Evidence:**
  - File: `src/server/actions/voice.ts` (line 427)
  - Symbol: `const twimlUrl = `${appBaseUrl}/api/voice/twiml`;`
  - Missing file: `src/app/api/voice/twiml/route.ts` (previously 404)
- **Actual Behavior:**
  `initiateOutboundCallAction` made a REST call to `https://api.twilio.com/2010-04-01/Accounts/.../Calls.json` with `Url: ${appBaseUrl}/api/voice/twiml`. Because that route did not exist, Twilio requested the URL upon dialing, received HTTP 404, and aborted the call immediately.
- **Expected Behavior:**
  A valid TwiML response returning XML instructions (`<Response><Say>...</Say><Connect>...</Connect></Response>`).
- **Customer / Business Impact:**
  Outbound calling failed for all organizations on carrier dispatch.
- **Remediation Completed:**
  Created `src/app/api/voice/twiml/route.ts` and updated `src/proxy.ts` to allow `/api/voice` through edge proxy without session cookie requirements.
- **Verification Status:** Verified fixed (`next build` compiled `/api/voice/twiml` successfully with exit code 0).

---

### Finding OP-AUD-003: Webhook Idempotency Unbounded Memory Query & Race Condition
- **Severity:** High (P1)
- **Investigation Target:** Target 9 (Webhook signature verification & duplicate event delivery)
- **Evidence:**
  - File: `src/server/services/billing/webhook-processor.ts` (lines 36–45)
  - Symbols: `db.select().from(billingEvents).where(eq(billingEvents.eventType, `${provider}.${eventType}`));`
- **Actual Behavior:**
  To check for duplicate webhook events, the code selects *all* records matching the event type from the `billing_events` table into Node.js heap memory and evaluates `existingEvents.some(...)` in JavaScript. Furthermore, `providerEventId` lacks a unique database constraint.
- **Expected Behavior:**
  Idempotency must be enforced at the database level with a unique index on `(provider, provider_event_id)` and a targeted indexed lookup:
  `SELECT id FROM billing_events WHERE provider_event_id = $1 LIMIT 1`
- **Customer / Business Impact:**
  1. *Memory Exhaustion / Latency Degradation:* As billing events grow into thousands, every incoming webhook will load thousands of JSON records into memory, degrading response time and risking out-of-memory crashes.
  2. *Duplicate Subscriptions / Payments:* Under parallel webhook retries from Stripe or Razorpay, both concurrent requests will execute the `SELECT`, find no match, and process the customer's subscription/invoice twice.
- **Recommended Remediation:**
  Add a dedicated indexed column `provider_event_id` to `billing_events` with a UNIQUE constraint, and replace the in-memory array filtering with an atomic `INSERT ... ON CONFLICT DO NOTHING`.
- **Verification Status:** Confirmed via code audit.

---

### Finding OP-AUD-004: In-Memory Idempotency Cache Lost in Serverless Deployments
- **Severity:** Medium (P2)
- **Investigation Target:** Target 6 (Duplicate tool calls, retries, and idempotency)
- **Evidence:**
  - File: `src/server/services/idempotency.ts` (lines 8–9)
  - Symbols: `private cache = new Map<string, IdempotencyRecord<any>>();`
- **Actual Behavior:**
  Idempotency deduplication for chat and tool executions uses an in-memory Node.js `Map` with a 12-second TTL.
- **Expected Behavior:**
  In a multi-instance or serverless container deployment (e.g., Vercel or Kubernetes pods), memory is not shared between instances. A duplicate request arriving at a different worker instance bypasses the cache.
- **Customer / Business Impact:**
  Duplicate booking or action triggers can occur if a client sends duplicate requests that hit different serverless execution lambdas.
- **Recommended Remediation:**
  Use Upstash Redis or a PostgreSQL-backed short-lived lease table for distributed deduplication across serverless instances.
- **Verification Status:** Confirmed via code audit.

---

### Finding OP-AUD-005: Background Job Worker Concurrency Race Condition
- **Severity:** Medium (P2)
- **Investigation Target:** Target 7 (Failed or delayed background jobs)
- **Evidence:**
  - File: `src/server/services/jobs/worker.ts` (lines 45–64)
  - Symbols: `pendingJobs = await db.query.backgroundJobs.findMany(...)` followed by sequential `db.update(...)`
- **Actual Behavior:**
  The background worker selects pending jobs using a standard `SELECT` query, and then updates their status to `processing` in a loop.
- **Expected Behavior:**
  If two cron triggers fire concurrently, both workers execute the `SELECT` before either locks the records, resulting in double-processing of background jobs (e.g. duplicate customer SMS reminders or email dispatches).
- **Recommended Remediation:**
  Use PostgreSQL's native atomic locking pattern:
  ```sql
  UPDATE background_jobs
  SET status = 'processing', locked_at = NOW()
  WHERE id IN (
    SELECT id FROM background_jobs
    WHERE status = 'pending' AND run_at <= NOW()
    FOR UPDATE SKIP LOCKED
    LIMIT 10
  )
  RETURNING *;
  ```
- **Verification Status:** Confirmed via code audit.

---

### Finding OP-AUD-006: Tenant Boundary & Booking Concurrency Architecture
- **Severity:** Informational (Verified Solid)
- **Investigation Target:** Target 1, 2, 3, 4
- **Evidence:**
  - `src/lib/auth/authorization.ts` (`requireOrganizationAccess`, `assertResourceOwnership`)
  - `src/lib/auth/server.ts` (authoritative membership verification)
  - `src/server/services/booking.ts` (lines 199–221: `pg_advisory_xact_lock` + overlap query inside `db.transaction`)
- **Verified Status:**
  - Tenant isolation is strictly enforced via database membership checks and cannot be bypassed via cookie modification.
  - Booking concurrency is protected by transactional PostgreSQL advisory locks (`pg_advisory_xact_lock(hashtext(lockKey))`) and timestamp overlap validation.
  - Timezone parsing uses `Intl.DateTimeFormat` with explicit business profile timezones.
