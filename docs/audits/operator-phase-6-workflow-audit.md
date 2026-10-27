# OPERATOR PHASE 6 — ASYNCHRONOUS WORKFLOW INVENTORY & RELIABILITY AUDIT

**Project:** Operator — Autonomous AI Receptionist SaaS  
**Phase:** 6 of 8 (Production Readiness Programme)  
**Role:** Principal Backend Architect, Distributed Systems Engineer, and Workflow Reliability Specialist  
**Date:** October 26, 2026  
**Status:** Audit Complete & Hardened  

---

## 1. Executive Summary

As part of Phase 6, we conducted an exhaustive audit of all asynchronous execution paths, background jobs, scheduled crons, and event-driven workflows across Operator. Operator is deployed as a Next.js App Router application with PostgreSQL (Neon Serverless) and Drizzle ORM. 

Prior to Phase 6 remediation, background operations had two fragmented execution models:
1. `BackgroundWorker` (`src/server/services/jobs/worker.ts`): Used atomic PostgreSQL row-level locks via `FOR UPDATE SKIP LOCKED`, but lacked queue-scoped claiming, lease cutoff reconciliation, idempotency deduplication, and execution timeouts.
2. `notificationQueueService` (`src/server/services/jobs/notification-queue.ts`): Processed notification jobs with non-atomic `select ... where isNull(lockedAt)` and subsequent sequential updates, introducing race conditions under concurrent workers and stranding stalled jobs permanently.
3. Ingestion Tasks (`src/server/actions/knowledge.ts`): Fired un-awaited background promises (`WebsiteIngestionPipeline.runIngestion`) within serverless request lifecycles, risking silent process termination upon HTTP response completion.

Phase 6 unified notification processing into `BackgroundWorker`, hardened atomic claims with queue filtering, added lease recovery, per-job execution timeouts (25s), idempotency key deduplication, tenant validation, and structured Sentry alerting with Phase 5 privacy redactions preserved.

---

## 2. Asynchronous Workflow Inventory

Every discovered background and asynchronous workflow was inspected across triggers, payloads, authorization, side effects, failure modes, and implementation state:

| Workflow / Queue | Trigger & Entrypoint | Payload Schema | Tenant Auth | External Side Effects | Timeout & Retry Behavior | Idempotency Mechanism | Status |
|---|---|---|---|---|---|---|---|
| **Notification Dispatch** (`notifications`) | `POST /api/cron/process-queue` or service call | `{ organizationId, jobType, to, subject, body, metadata }` | Verified against `organizations` table before dispatch | Emails via SMTP / Resend / Postmark; SMS via Vonage / Sinch | 25s timeout; 3 attempts; exponential backoff (15s, 30s, 60s) | Idempotency key deduplication on enqueue (`payload->>'idempotencyKey'`) | **Fully Implemented & Verified** |
| **Billing Webhook Ingestion** (`billing_events`) | `POST /api/webhooks/billing/razorpay` | `{ eventId, eventType, provider, payload }` | Verified via HMAC-SHA256 signature & organization subscription mapping | Subscription activation, plan updates in DB | 10s database retry window; atomic state machine transition | Deduplication via `billing_events` table (`provider_event_id` unique constraint) | **Fully Implemented & Verified** |
| **Voice Call Telephony** (WebSockets) | `GET /api/webhooks/voice/stream` | Twilio Media Stream WebSocket messages | Verified via Twilio signature (`X-Twilio-Signature`) | Bi-directional audio, Gemini Live session | Live WebSocket lifecycle; fallback turn-by-turn endpoint | Call SID unique correlation | **Fully Implemented & Verified** |
| **Appointment Reminders** (`appointment_reminders`) | Created in `src/server/services/booking.ts` | `{ appointmentId, organizationId, type, scheduledFor }` | Implicit tenant scoping via appointment foreign key | Dispatches customer email / SMS | Status tracked in `appointment_reminders`; retries up to 3 times | Reminder status flag (`pending` -> `sent` / `failed`) | **Scaffolded — Ready for cron dispatch** |
| **Knowledge Ingestion & Scraping** | `src/server/actions/knowledge.ts` (`ingestWebsiteAction`) | `{ organizationId, url, depth }` | Session tenant authentication check (`requireAuth`) | Web crawl, markdown extraction, vector embeddings generation | Floating promise in serverless action; max crawl limit 5 pages | Checksum comparison on existing knowledge chunks | **Identified Gap: Long-running worker candidate** |
| **Self-Learning Reconciliation** | `GET /api/cron/learning-engine` | CRON trigger with `CRON_SECRET` header | Enforces `Bearer ${CRON_SECRET}` | Updates AI confidence scores, FAQs from call transcripts | Max 60s serverless cron budget | Batch query on unanalyzed conversations | **Implemented via Serverless Cron** |

---

## 3. Discovered Vulnerabilities & Architecture Gaps

### 3.1 Defect WF-001: Fragmented Notification Queue & Lock Hijacking
- **Location:** `src/server/services/jobs/notification-queue.ts` (lines 55–85)
- **Root Cause:** `notificationQueueService.processBatch()` selected jobs matching `isNull(backgroundJobs.lockedAt)` without `FOR UPDATE SKIP LOCKED`. If two cron triggers fired concurrently or two serverless instances overlapped, both claimed the identical job set and sent duplicate emails/SMS to customers.
- **Resolution:** Refactored `notificationQueueService` to delegate all enqueueing and execution to the unified `BackgroundWorker` with atomic `FOR UPDATE SKIP LOCKED` CTE queries.

### 3.2 Defect WF-002: Cross-Worker Queue Stealing & Missing Handler Starvation
- **Location:** `src/server/services/jobs/worker.ts` (`claimJobs`)
- **Root Cause:** `claimJobs(limit)` claimed the 10 oldest jobs across *all* queues regardless of whether the claiming worker had registered a handler for those queues. If Worker A only handled `audit_reports`, it could lock and claim 10 `notifications` jobs, immediately failing them with `No handler found for queue: notifications`.
- **Resolution:** Added `queueNames?: string[]` filtering to `claimJobs()` using SQL `AND queue_name IN (...)`. Workers now strictly claim jobs for queues they can legitimately process.

### 3.3 Defect WF-003: Abandoned Expired Leases Starving New Pending Jobs
- **Location:** `src/server/services/jobs/worker.ts`
- **Root Cause:** Order by `run_at ASC` caused abandoned `processing` jobs whose locks had expired to perpetually consume claim slots, preventing newly inserted jobs from ever being executed if expired jobs had older timestamps.
- **Resolution:** Implemented `reconcileDeadLeases(leaseCutoffIso)` that transitions abandoned jobs exceeding `max_attempts` directly to terminal `failed` status, freeing queue capacity.

### 3.4 Defect WF-004: Lack of Per-Job Execution Timeouts
- **Location:** `src/server/services/jobs/worker.ts` (`processPendingJobs`)
- **Root Cause:** A hanging HTTP call to an SMTP provider or unresponsive third-party API would block worker execution indefinitely until the serverless function timed out, killing the process without cleaning up database state.
- **Resolution:** Wrapped each job dispatch in `Promise.race()` enforcing a strict `PER_JOB_TIMEOUT_MS = 25000` (25-second) threshold, preserving the Vercel 60s function budget and ensuring database locks are released.

### 3.5 Defect WF-005: Un-awaited Ingestion in Serverless Context
- **Location:** `src/server/actions/knowledge.ts` (lines 563–570)
- **Observation:** `WebsiteIngestionPipeline.runIngestion(...)` is fired as a background promise without awaiting. In Vercel serverless functions, background execution freezes or terminates once the HTTP response returns.
- **Remediation Recommendation:** When website crawling requires scraping >5 pages, enqueue this task into `background_jobs` and process it via scheduled worker rather than floating serverless promises.

---

## 4. Verified Behavior Summary

All workflow fixes were validated through automated end-to-end integration tests in `tests/background-jobs.spec.ts`. The unified worker guarantees:
- **Zero double execution** under concurrent workers.
- **Safe lease recovery** for stalled or crashed workers.
- **Bounded exponential backoff** (15s, 30s, 60s, max 1 hour).
- **Tenant authorization checks** prior to executing sensitive payloads.
- **Zero poison-job cascading**: a single failing or hanging task cannot fail or starve neighboring jobs.
