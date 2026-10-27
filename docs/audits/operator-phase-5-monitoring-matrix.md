# Operator Phase 5 — Production Monitoring & Observability Matrix

**Date:** 2026-10-26  
**Auditor:** Principal Site Reliability Engineer & Observability Architect  
**Standards:** OpenTelemetry Spans, Sentry Next.js Production Architecture, PII Redaction  
**Status:** Remediated & Automated Verification Complete  

---

## 1. End-to-End Workflow Monitoring Matrix

| Critical Workflow | Failure Mode | Telemetry Source | Correlation Fields | Data Redaction & Privacy Rules | Proposed Alert Threshold | Verification Status |
|---|---|---|---|---|---|---|
| **A. Authentication & Sessions** | Invalid credentials, expired session, unauthorized API call | `src/proxy.ts`, `src/app/api/auth/*` | `x-request-id`, `userId`, `pathname` | Passwords, session tokens, authorization headers, cookies replaced with `[REDACTED]` | > 5% 401/403 rate over 5 min on standard routes | **VERIFIED** (`OBS-006` in Playwright suite) |
| **B. Appointment Booking** | Double booking, slot conflict, invalid timezone, persistence crash | `src/server/services/booking.ts` | `x-request-id`, `organizationId`, `bookingId` | Customer phone partially masked (`***-***-1234`), customer email masked (`a***b@domain.com`) | Any booking persistence transaction failure (> 0 in 1 min) | **VERIFIED** (`booking-engine.spec.ts`) |
| **C. Billing & Subscriptions** | Invalid webhook signature, webhook idempotency conflict, payment gateway down | `src/app/api/webhooks/billing/*`, `src/server/services/billing/webhook-processor.ts` | `x-request-id`, `providerEventId`, `provider` | Credit card numbers, CVV, webhook secrets redacted; raw payment payloads pruned | > 1 webhook signature failure or > 0 unprocessed failed events | **VERIFIED** (`billing-webhooks.spec.ts`) |
| **D. Telephony & Voice Media** | Outbound TwiML failure, WebSocket disconnect, carrier signature mismatch | `src/server/utils/twilio-signature.ts`, `src/server/voice-gateway/` | `CallSid`, `organizationId`, `turnId` | Customer voice transcripts and recording URLs truncated in traces | > 1% call disconnect before speech synthesis starts | **VERIFIED** (Code-level & `voice-gateway.spec.ts`) |
| **E. AI Conversational Engine** | Gemini timeout, rate limit (429/503), quota exceeded, fallback triggered | `src/server/services/llm.ts`, `src/server/services/receptionist/` | `x-request-id`, `organizationId`, `model` | Raw system instructions and prompt text truncated (`[TRUNCATED_CONTENT]`) | > 3 consecutive Gemini fallbacks in 5 min | **VERIFIED** (Grounded fallback tested) |
| **F. Asynchronous Background Jobs** | Handler crash, queue starvation, lease expiration, terminal attempt failure | `src/server/services/jobs/worker.ts` | `jobId` (`correlationId`), `queueName`, `attempts` | Job payload redacted via `redactSensitiveData`; no secrets persisted in error column | Any job reaching terminal failure (`attempts >= max_attempts`) | **VERIFIED** (`background-jobs.spec.ts` & `worker.ts`) |
| **G. Web Ingestion & Ingestion SSRF** | Blocked private IP, cloud metadata attempt, scrape timeout | `src/server/services/crawler/ssrf.ts` | `x-request-id`, `targetHost` | Destination URLs logged with protocol and host only; private IPs blocked | Any attempted access to `169.254.169.254` or private subnets | **VERIFIED** (`security-audit.spec.ts` & `OBS-001`) |
| **H. Client Application Crash** | Uncaught React render error, client hydration mismatch | `ErrorBoundary`, `(dashboard)/error.tsx`, `global-error.tsx` | `errorId`, `digest`, `componentStack` | DOM form values, cookies, local storage tokens excluded from Sentry payload | > 10 client exceptions / min across active users | **VERIFIED** (`OBS-004` & `OBS-005`) |
| **I. System Health & Infrastructure** | Database pool exhaustion, high query latency, engine unready | `src/app/api/health/route.ts` | `uptimeSeconds`, `environment`, `version` | Internal database connection string, hostnames, and stack traces stripped in production | `/api/health` returns HTTP 503 for 2 consecutive checks | **VERIFIED** (`OBS-007` in Playwright suite) |

---

## 2. Telemetry Signal Quality & False-Positive Controls

1. **Non-Blocking Telemetry:**
   - All Sentry capture methods (`captureException`, `captureMessage`, `addBreadcrumb`) execute asynchronously in non-blocking try/catch blocks. Telemetry failure never interrupts appointment bookings, telephony calls, or Stripe checkout sessions.
2. **Alert Noise Suppression:**
   - Transient 401s on guest visits to login or pricing pages are filtered out.
   - Idempotent duplicate billing events log as `info` and do not generate alert noise.
   - Retried background jobs (attempts 1 & 2) emit `warn` logs; only terminal failures (attempt 3) emit `error` signals.
3. **Circular Reference & Memory Protection:**
   - `redactSensitiveData` enforces a maximum recursion depth of 6 and uses a `WeakSet` to prevent heap exhaustion on circular objects.
   - In-memory breadcrumb buffer is bounded to 50 items.
