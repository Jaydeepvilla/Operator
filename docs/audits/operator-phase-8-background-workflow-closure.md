# OPERATOR PHASE 8 — BACKGROUND WORKFLOW CLOSURE REPORT

**Project:** Operator — Autonomous AI Receptionist SaaS  
**Phase:** 8 of the Production-Readiness Programme  
**Date:** October 26, 2026  
**Auditor / Principal Systems Engineer:** Antigravity  

---

## 1. Executive Summary

In Phase 8, we resolved and verified the two production-readiness gaps carried forward from previous Operator audits:
1. **Website Crawling Pagination via Un-Awaited Serverless Action:** Previously, `executeWebsiteIngestionAction` triggered `WebsiteIngestionPipeline.runIngestion(...)` as a floating, un-awaited promise (`.catch(...)`). On Vercel / serverless runtimes, execution freezes or terminates as soon as the HTTP action responds, truncating multi-page crawling and leaving records stuck in `'processing'`.
2. **Missing Scheduled Dispatcher for Appointment Reminders:** Although `appointment_reminders` existed in the PostgreSQL database, `sendReminder` was an uninvoked orphan without an authenticated cron route, atomic locking mechanism, or background job enqueueing.

Both gaps have been remediated in code and validated with 12 comprehensive automated tests (12/12 PASS), zero TypeScript errors, and zero regressions across existing background jobs and billing webhook suites.

---

## 2. Skills Actually Read and Applied

In accordance with system requirements, the following installed skill instruction files were explicitly inspected and applied:
1. **`systematic-debugging`** (`skills/systematic-debugging\SKILL.md`): Used to trace the exact root causes of un-awaited promises, Postgres array binding quirks (`ANY($1)` vs `IN ($1, $2)`), and test data collision before changing code.
2. **`vercel-deployment`** (`skills/vercel-deployment\SKILL.md`): Applied to configure Vercel Cron routes in `vercel.json`, enforce `export const maxDuration = 60`, handle serverless lifecycle constraints, and mandate `CRON_SECRET` fail-closed verification.
3. **`backend-security-coder`** (`skills/backend-security-coder\SKILL.md`): Applied for SSRF validation, sensitive URL/credential scrubbing in error logs, and multi-tenant boundary checks.
4. **`payment-integration`** (`skills/payment-integration\SKILL.md`): Maintained for verifying zero regressions in webhook idempotency and state transitions.

*Skills unavailable or not required for this phase:* `Trigger.dev` was evaluated but preserved as rejected per Phase 6 decision (the native PostgreSQL worker meets all SLA requirements without adding external vendor lock-in).

---

## 3. Detailed Root Causes & Architecture Analysis

### Gap 1: Website Crawling Pagination via Un-Awaited Serverless Action
- **File:** [src/server/actions/knowledge.ts](/src/server/actions/knowledge.ts#L560-L580)
- **Root Cause:** In `executeWebsiteIngestionAction`, after initial validation and scraping, the pipeline executed:
  ```ts
  // Flawed pattern:
  WebsiteIngestionPipeline.runIngestion(organizationId, importId, selectedPages, duplicateHandling)
    .catch((err) => { ... });
  return { success: true, importId };
  ```
  On Vercel and AWS Lambda, the serverless container suspends immediately when the HTTP response returns. Background threads do not run. Consequently, crawls with more than 3–5 pages were terminated prematurely, leaving orphaned chunks and incomplete imports.
- **Remediation Architecture:**
  - `executeWebsiteIngestionAction` marks the import as `'queued'` and enqueues a durable job into the native `worker` under queue `"website_ingestion"` with idempotency key `ingest_${importId}`.
  - The serverless action returns immediately (`< 150ms`).
  - The background worker executes `WebsiteIngestionPipeline.runIngestion(...)` with a dedicated timeout of 120 seconds (`timeoutMs: 120_000`).
  - Terminal statuses are formally resolved: `'completed'` (100% processed), `'partial'` (some succeeded, some failed), `'failed'` (all failed), and `'queued'` (awaiting worker claim).
  - All error messages are sanitized using `sanitizeErrorMessage` to strip private IP addresses, credentials, and API keys before persisting to the database.

### Gap 2: Missing Scheduled Dispatcher for Appointment Reminders
- **Files:** [src/server/repositories/reminders.ts](/src/server/repositories/reminders.ts), [src/server/services/notification.ts](/src/server/services/notification.ts)
- **Root Cause:** The database contained an `appointment_reminders` table and `sendReminder()` in `notification.ts`. However:
  1. No cron endpoint or scheduled trigger called `sendReminder()`.
  2. No atomic claiming mechanism existed, meaning concurrent triggers would send duplicate notifications.
  3. `sendReminder()` did not check appointment lifecycle changes (such as cancellation or reschedule) between booking and dispatch.
  4. Reminders were sent directly via HTTP instead of through durable background queue jobs.
- **Remediation Architecture:**
  - **Atomic Queue Claiming:** Implemented `remindersRepository.claimPendingReminders(limit, now)` using PostgreSQL `SELECT ... WHERE (status = 'pending' AND send_at <= NOW()) OR (status = 'processing' AND updated_at < NOW() - INTERVAL '5 minutes') ORDER BY send_at ASC LIMIT $1 FOR UPDATE SKIP LOCKED`.
  - **Batch Enqueueing:** `ReminderDispatcherService.dispatchDueReminders()` atomically claims up to 50 due reminders and enqueues background worker jobs to queue `"appointment_reminders"` with idempotency key `reminder_${reminderId}` and `maxAttempts: 3`.
  - **Scheduled Route:** Created [src/app/api/cron/send-reminders/route.ts](/src/app/api/cron/send-reminders/route.ts) with fail-closed `CRON_SECRET` authentication and `maxDuration = 60`.
  - **Cron Configuration:** Configured `vercel.json` with cron schedule `* * * * *` (every minute) invoking `/api/cron/send-reminders`.
  - **Worker Execution & Appointment State Verification:** In `notificationService.processReminderJob()`:
    1. Re-validates reminder existence and ensures status is `'processing'`.
    2. Enforces tenant boundary (`appointment.organizationId === organizationId`).
    3. Checks appointment status: if `'cancelled'`, `'completed'`, or `'no_show'`, the reminder is gracefully cancelled (`status = 'cancelled'`) without sending SMS or email.
    4. On successful delivery, marks reminder as `'sent'`.
    5. On provider failure, returns `false` to invoke worker exponential backoff retries (15s, 30s, 60s).

---

## 4. Files Modified & Created

| File | Change Type | Purpose |
| :--- | :--- | :--- |
| [`src/server/actions/knowledge.ts`](/src/server/actions/knowledge.ts) | Modified | Replaced un-awaited floating promise with durable `worker.enqueue("website_ingestion", ...)` |
| [`src/server/services/crawler/ingestion.ts`](/src/server/services/crawler/ingestion.ts) | Modified | Added sanitized error logging and terminal status resolution (`completed`, `partial`, `failed`, `queued`) |
| [`src/server/services/jobs/worker.ts`](/src/server/services/jobs/worker.ts) | Modified | Added `timeoutMs` to `JobDefinition`; registered default handlers for `"website_ingestion"` and `"appointment_reminders"` |
| [`src/server/repositories/reminders.ts`](/src/server/repositories/reminders.ts) | Modified | Implemented `claimPendingReminders` with `FOR UPDATE SKIP LOCKED` and 5-min stale lease recovery |
| [`src/server/services/notification.ts`](/src/server/services/notification.ts) | Modified | Implemented `processReminderJob()` with tenant boundary validation and lifecycle state checks |
| [`src/server/services/reminders/dispatcher.ts`](/src/server/services/reminders/dispatcher.ts) | Created | Implemented `ReminderDispatcherService` for atomic claiming and durable job dispatch |
| [`src/app/api/cron/send-reminders/route.ts`](/src/app/api/cron/send-reminders/route.ts) | Created | Scheduled cron route with fail-closed `CRON_SECRET` auth and `maxDuration = 60` |
| [`vercel.json`](/vercel.json) | Created | Deployment configuration scheduling background jobs, queue processing, and reminder dispatch |
| [`tests/scheduled-reminders-and-crawler.spec.ts`](/tests/scheduled-reminders-and-crawler.spec.ts) | Created | 12-test automated verification suite covering all failure modes, concurrency, and limits |

---

## 5. Database Schema & Migration Invariants

- **Zero Destructive Migrations:** The existing PostgreSQL tables `background_jobs` and `appointment_reminders` already contained all necessary columns (`status`, `send_at`, `payload`, `attempts`, `max_attempts`, `locked_at`, `error`).
- **Atomic Locking & Deduplication:**
  - Reminders: Concurrency is protected via PostgreSQL row-level locks: `FOR UPDATE SKIP LOCKED`.
  - Background Jobs: Deduplication is enforced via JSONB query: `payload->>'idempotencyKey' = $1`.
- **Status State Machine for Reminders:**
  `pending` -> `processing` -> `sent` OR `cancelled` OR `failed`.
- **Status State Machine for Website Imports:**
  `pending` -> `queued` -> `processing` -> `completed` OR `partial` OR `failed`.

---

## 6. Limits and Boundary Guarantees

1. **Website Crawling Ingestion Limits:**
   - **Supported Depth / Page Count:** Up to 50 pages per import batch (enforced in `knowledge.ts`). Sites with > 5 pages are fully supported and paginated durably.
   - **Job Timeout:** 120 seconds (`timeoutMs: 120_000`) for the background worker batch execution.
   - **SSRF Restrictions:** Private and loopback IPv4/IPv6 ranges (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`, `::1`, `localhost`) are strictly forbidden and validated before any network fetch.
   - **Sanitization:** Error messages strip private IPs, connection strings, and auth tokens.
2. **Appointment Reminder Dispatch Limits:**
   - **Batch Size:** 50 reminders per cron run (runs once every minute via Vercel Cron). Maximum throughput: 3,000 reminders/hour per worker thread.
   - **Stale Lease Threshold:** 5 minutes. If a worker crashes midway, abandoned reminders in `'processing'` are reclaimed automatically.
   - **Retry Policy:** 3 attempts with exponential backoff (15s, 30s, 60s) before marking as terminal failure.
   - **Appointment State Invalidation:** Cancelled, completed, or no-show appointments suppress reminder delivery, marking the reminder record as `'cancelled'`.

---

## 7. Verification Summary

| Check | Target | Result | Evidence |
| :--- | :--- | :--- | :--- |
| **Phase 8 Test Suite** | `tests/scheduled-reminders-and-crawler.spec.ts` | **PASS** | 12/12 passed (1.6m) |
| **Background Jobs Suite** | `tests/background-jobs.spec.ts` | **PASS** | 8/8 passed (33.0s) |
| **Billing Webhooks Suite** | `tests/billing-webhooks.spec.ts` | **PASS** | 10/10 passed (40.5s) |
| **TypeScript Typecheck** | `npx tsc --noEmit` | **PASS** | 0 errors |

---

## 8. Conclusion

Both background-job gaps carried forward into Phase 8 are **CLOSED**. Website crawling runs through the durable PostgreSQL background worker with sensible timeouts, pagination support, and sanitized logging. Appointment reminders are claimed atomically via `FOR UPDATE SKIP LOCKED`, protected from duplicate delivery, authenticated with `CRON_SECRET`, and managed durably with full lifecycle awareness.
