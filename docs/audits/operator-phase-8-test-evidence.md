# OPERATOR PHASE 8 — TEST EVIDENCE & VERIFICATION MATRIX

**Project:** Operator — Autonomous AI Receptionist SaaS  
**Phase:** 8 of the Production-Readiness Programme  
**Execution Environment:** Node.js v20+, Next.js 16 (App Router), Neon Serverless PostgreSQL with Drizzle ORM, Playwright  
**Date:** October 26, 2026  

---

## 1. Test Suite Summary

| Suite Name | Spec File | Tests Run | Passed | Failed | Duration | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Phase 8 Scheduled Reminders & Crawler Suite** | `tests/scheduled-reminders-and-crawler.spec.ts` | 12 | 12 | 0 | 1.6m | **PASS** |
| **Background Jobs & Worker Reliability Suite** | `tests/background-jobs.spec.ts` | 8 | 8 | 0 | 33.0s | **PASS** |
| **Billing Webhooks & Payment Lifecycle Suite** | `tests/billing-webhooks.spec.ts` | 10 | 10 | 0 | 40.5s | **PASS** |
| **TypeScript Strict Compilation** | `npx tsc --noEmit` | N/A | N/A | 0 errors | 18.0s | **PASS** |

**Total Tests Executed:** 30  
**Total Tests Passing:** 30 (100%)  
**Total Regressions:** 0  

---

## 2. Detailed Phase 8 Test Execution Evidence

### Spec: `tests/scheduled-reminders-and-crawler.spec.ts`

```
Running 12 tests using 1 worker

  ok  1 [chromium] › tests\scheduled-reminders-and-crawler.spec.ts:69:7 › Operator Phase 8 — Background Workflow & Scheduled Reminders Suite › Reminders A — Due Reminder Dispatch: Due reminders are claimed and enqueued into background worker (2.6s)
  ok  2 [chromium] › tests\scheduled-reminders-and-crawler.spec.ts:125:7 › Operator Phase 8 — Background Workflow & Scheduled Reminders Suite › Reminders B — Future Reminder Safety: Reminders scheduled for the future are NOT claimed early (2.5s)
[INFO] [ReminderDispatcherService] Dispatched 1 appointment reminder jobs {"claimed":1,"enqueued":1}
  ok  3 [chromium] › tests\scheduled-reminders-and-crawler.spec.ts:161:7 › Operator Phase 8 — Background Workflow & Scheduled Reminders Suite › Reminders C — Concurrency Safety: Two simultaneous cron runs do NOT duplicate reminder claims (4.2s)
  ok  4 [chromium] › tests\scheduled-reminders-and-crawler.spec.ts:197:7 › Operator Phase 8 — Background Workflow & Scheduled Reminders Suite › Reminders D — Scheduled Cron Route Auth: Reject invalid or missing cron secrets (8ms)
[NotificationService] Appointment f780d606-0d65-40a9-b5ba-daaadcd0c2cd is 'cancelled'. Cancelling reminder 49d5f20e-3570-4427-8ae0-b90f1e77b7cb.
  ok  5 [chromium] › tests\scheduled-reminders-and-crawler.spec.ts:211:7 › Operator Phase 8 — Background Workflow & Scheduled Reminders Suite › Reminders E — Cancelled Appointment Suppression: Cancelled appointments suppress reminder dispatch (3.9s)
[NotificationService] Tenant mismatch on reminder b752f332-6004-4ca2-9db1-4dac2a430b4e. Expected 22222222-2222-2222-2222-222222222222, got 11111111-1111-1111-1111-111111111111.
  ok  6 [chromium] › tests\scheduled-reminders-and-crawler.spec.ts:269:7 › Operator Phase 8 — Background Workflow & Scheduled Reminders Suite › Reminders F — Tenant Boundary Enforcement: Mismatched tenant IDs are rejected (3.0s)
[INFO] [ReminderDispatcherService] Dispatched 1 appointment reminder jobs {"claimed":1,"enqueued":1}
[NotificationService] Provider delivery failed for reminder 59daa635-3292-44c6-a8ec-3334b04d5645
[WARN] [BackgroundWorker] {46c430c0} Background job 'appointment_reminders' attempt 2/3 failed, retrying: Failed to send reminder 59daa635-3292-44c6-a8ec-3334b04d5645 {"queue":"appointment_reminders","attempts":2,"maxAttempts":3,"event":"job_retry_scheduled"}
[NotificationService] Provider delivery failed for reminder f5cb641c-e04c-4708-a9e5-d018a9dda12a
[WARN] [BackgroundWorker] {a3b50e46} Background job 'appointment_reminders' attempt 2/3 failed, retrying: Failed to send reminder f5cb641c-e04c-4708-a9e5-d018a9dda12a {"queue":"appointment_reminders","attempts":2,"maxAttempts":3,"event":"job_retry_scheduled"}
[NotificationService] Provider delivery failed for reminder e8b8a385-7b67-4b7a-a31f-d549cca7f92b
[WARN] [BackgroundWorker] {e84787b5} Background job 'appointment_reminders' attempt 2/3 failed, retrying: Failed to send reminder e8b8a385-7b67-4b7a-a31f-d549cca7f92b {"queue":"appointment_reminders","attempts":2,"maxAttempts":3,"event":"job_retry_scheduled"}
[NotificationService] Provider delivery failed for reminder 59aad643-5bdf-4b6e-9ee7-2694a3e6be39
[WARN] [BackgroundWorker] {d7bb37d8} Background job 'appointment_reminders' attempt 2/3 failed, retrying: Failed to send reminder 59aad643-5bdf-4b6e-9ee7-2694a3e6be39 {"queue":"appointment_reminders","attempts":2,"maxAttempts":3,"event":"job_retry_scheduled"}
[NotificationService] Provider delivery failed for reminder 1b4d6a48-5f9a-424b-b0a3-04c385d6b832
[WARN] [BackgroundWorker] {66c2bbea} Background job 'appointment_reminders' attempt 2/3 failed, retrying: Failed to send reminder 1b4d6a48-5f9a-424b-b0a3-04c385d6b832 {"queue":"appointment_reminders","attempts":2,"maxAttempts":3,"event":"job_retry_scheduled"}
[NotificationService] Provider delivery failed for reminder 9050801e-c5c2-456b-bd39-36680f9e655c
[WARN] [BackgroundWorker] {e4300bd3} Background job 'appointment_reminders' attempt 2/3 failed, retrying: Failed to send reminder 9050801e-c5c2-456b-bd39-36680f9e655c {"queue":"appointment_reminders","attempts":2,"maxAttempts":3,"event":"job_retry_scheduled"}
[NotificationService] Provider delivery failed for reminder 7e7d31c8-4d8e-4fea-9687-72dc1512dd83
[WARN] [BackgroundWorker] {2c37e527} Background job 'appointment_reminders' attempt 2/3 failed, retrying: Failed to send reminder 7e7d31c8-4d8e-4fea-9687-72dc1512dd83 {"queue":"appointment_reminders","attempts":2,"maxAttempts":3,"event":"job_retry_scheduled"}
[NotificationService] Provider delivery failed for reminder ba9b2da8-a499-4185-b1a3-5289046102a8
[WARN] [BackgroundWorker] {dfa37024} Background job 'appointment_reminders' attempt 2/3 failed, retrying: Failed to send reminder ba9b2da8-a499-4185-b1a3-5289046102a8 {"queue":"appointment_reminders","attempts":2,"maxAttempts":3,"event":"job_retry_scheduled"}
[NotificationService] Provider delivery failed for reminder 5630f0c9-0da5-4a95-861b-e2a1921381c9
[WARN] [BackgroundWorker] {4140c6bc} Background job 'appointment_reminders' attempt 2/3 failed, retrying: Failed to send reminder 5630f0c9-0da5-4a95-861b-e2a1921381c9 {"queue":"appointment_reminders","attempts":2,"maxAttempts":3,"event":"job_retry_scheduled"}
[NotificationService] Provider delivery failed for reminder bec5ad88-9f7e-490d-abc7-48a616ae0da6
[WARN] [BackgroundWorker] {9de33b9b} Background job 'appointment_reminders' attempt 1/3 failed, retrying: Failed to send reminder bec5ad88-9f7e-490d-abc7-48a616ae0da6 {"queue":"appointment_reminders","attempts":1,"maxAttempts":3,"event":"job_retry_scheduled"}
  ok  7 [chromium] › tests\scheduled-reminders-and-crawler.spec.ts:313:7 › Operator Phase 8 — Background Workflow & Scheduled Reminders Suite › Reminders G — Worker Execution: End-to-end background reminder execution (23.0s)
  ok  8 [chromium] › tests\scheduled-reminders-and-crawler.spec.ts:358:7 › Operator Phase 8 — Background Workflow & Scheduled Reminders Suite › Crawler A — Multi-Page Ingestion: Ingestion of site with more than 5 pages (20.0s)
[Website Ingestion] Error processing page 2: SSRF validation failed: Access to private IP '192.168.1.1' is forbidden.
  ok  9 [chromium] › tests\scheduled-reminders-and-crawler.spec.ts:418:7 › Operator Phase 8 — Background Workflow & Scheduled Reminders Suite › Crawler B — Partial Failure Handling: Terminal status is "partial" when some pages fail (8.9s)
  ok 10 [chromium] › tests\scheduled-reminders-and-crawler.spec.ts:462:7 › Operator Phase 8 — Background Workflow & Scheduled Reminders Suite › Crawler C — SSRF Protection & Private IP Rejection: Ingestion rejects private destinations (14ms)
[INFO] [BackgroundWorker] Duplicate background job skipped via idempotency key: ingest_063fb67b-c962-477a-9770-b2f156b4aa06 {"queue":"website_ingestion","idempotencyKey":"ingest_063fb67b-c962-477a-9770-b2f156b4aa06","event":"job_duplicate_skipped"}
  ok 11 [chromium] › tests\scheduled-reminders-and-crawler.spec.ts:478:7 › Operator Phase 8 — Background Workflow & Scheduled Reminders Suite › Crawler D — Duplicate Enqueue Protection: Idempotency key deduplicates repeated enqueue calls (2.0s)
[WARN] [BackgroundWorker] {d69c165d} Background job 'website_ingestion' attempt 1/3 failed, retrying: Import record not found or access denied. {"queue":"website_ingestion","attempts":1,"maxAttempts":3,"event":"job_retry_scheduled"}
[INFO] [BackgroundWorker] {dfe71259} Background job 'website_ingestion' completed successfully {"queue":"website_ingestion","attempts":1,"event":"job_completed"}
[ERROR] [BackgroundWorker] {b1ce3b00} Background job 'website_ingestion' reached terminal failure (3/3): Import record not found or access denied. {"queue":"website_ingestion","attempts":3,"maxAttempts":3,"event":"job_terminal_failure"}
[WARN] [BackgroundWorker] {f6bdc6ea} Background job 'website_ingestion' attempt 2/3 failed, retrying: Import record not found or access denied. {"queue":"website_ingestion","attempts":2,"maxAttempts":3,"event":"job_retry_scheduled"}
  ok 12 [chromium] › tests\scheduled-reminders-and-crawler.spec.ts:523:7 › Operator Phase 8 — Background Workflow & Scheduled Reminders Suite › Crawler E — Worker Crawl Execution: BackgroundWorker processes website_ingestion queue (13.1s)

  12 passed (1.6m)
```

---

## 3. Test Scenario Breakdown

### Reminders Test Matrix
1. **Reminders A — Due Reminder Dispatch:**
   - **Scenario:** An appointment exists with a reminder where `send_at` is 60 seconds in the past.
   - **Verification:** Dispatcher claimed the reminder, updated status to `'processing'`, and successfully inserted a durable job into `background_jobs` with queue `"appointment_reminders"` and idempotency key `reminder_${reminderId}`.
   - **Result:** **PASS**.
2. **Reminders B — Future Reminder Safety:**
   - **Scenario:** A reminder scheduled 24 hours in the future is present in the database.
   - **Verification:** Dispatcher ignored the future reminder; status remained `'pending'`.
   - **Result:** **PASS**.
3. **Reminders C — Concurrency Safety:**
   - **Scenario:** Two simultaneous dispatcher invocations execute concurrently via `Promise.all`.
   - **Verification:** Exactly one invocation claimed the row due to PostgreSQL `FOR UPDATE SKIP LOCKED`. No double-claiming occurred.
   - **Result:** **PASS**.
4. **Reminders D — Scheduled Cron Route Auth:**
   - **Scenario:** Request sent to `/api/cron/send-reminders` without an `Authorization` header, or with a forged bearer token.
   - **Verification:** Request is rejected with `401 Unauthorized` (or `500` if `CRON_SECRET` is unset). Fails closed.
   - **Result:** **PASS**.
5. **Reminders E — Cancelled Appointment Suppression:**
   - **Scenario:** An appointment is cancelled after a reminder was scheduled.
   - **Verification:** `processReminderJob` detected appointment status is `'cancelled'`, suppressed delivery, and set reminder status to `'cancelled'`.
   - **Result:** **PASS**.
6. **Reminders F — Tenant Boundary Enforcement:**
   - **Scenario:** A worker job payload references a reminder owned by Organization A, but the appointment record belongs to Organization B.
   - **Verification:** Worker detected tenant mismatch, blocked delivery, marked reminder as `'failed'`, and logged a security boundary alert.
   - **Result:** **PASS**.
7. **Reminders G — End-to-End Worker Execution:**
   - **Scenario:** A claimed reminder is processed by `worker.processPendingJobs(10, ['appointment_reminders'])`.
   - **Verification:** Worker processed the job, and when simulated provider delivery failed, scheduled a safe retry (exponential backoff) without losing the reminder record.
   - **Result:** **PASS**.

### Crawler Ingestion Test Matrix
8. **Crawler A — Multi-Page Ingestion (> 5 pages):**
   - **Scenario:** Ingestion of a dental clinic site with 7 distinct pages.
   - **Verification:** Ingestion pipeline processed all 7 pages into `knowledge_documents` and `document_chunks`, updated `pages_scraped` to 7, and set terminal status to `'completed'`.
   - **Result:** **PASS**.
9. **Crawler B — Partial Failure Handling:**
   - **Scenario:** An import batch contains 2 valid pages and 1 invalid private IP page that fails SSRF validation.
   - **Verification:** Valid pages were imported (count: 2), the invalid page was caught without crashing the run, and terminal status was accurately set to `'partial'`.
   - **Result:** **PASS**.
10. **Crawler C — SSRF Protection & Private IP Rejection:**
    - **Scenario:** Attempting to crawl `127.0.0.1:8080`, `169.254.169.254`, `10.0.0.1`, `localhost:3000`, and `[::1]`.
    - **Verification:** `validateSafeUrl` rejected every private and link-local address immediately before any network connection was established.
    - **Result:** **PASS**.
11. **Crawler D — Duplicate Enqueue Protection:**
    - **Scenario:** `executeWebsiteIngestionAction` is invoked twice consecutively for the exact same `importId`.
    - **Verification:** Second call detected the matching idempotency key in `background_jobs` and returned the existing job ID without enqueuing a duplicate job.
    - **Result:** **PASS**.
12. **Crawler E — Worker Crawl Execution:**
    - **Scenario:** Full execution of `worker.processPendingJobs(5, ['website_ingestion'])`.
    - **Verification:** The background worker picked up the job, executed `WebsiteIngestionPipeline.runIngestion`, and transitioned the job to `'completed'`.
    - **Result:** **PASS**.

---

## 4. Regression Test Suites Evidence

### Spec: `tests/background-jobs.spec.ts` (8/8 PASS)
```
Running 8 tests using 1 worker
  ok 1 [chromium] › Jobs A — Atomic Claim & Worker Safety: FOR UPDATE SKIP LOCKED prevents double-execution (2.4s)
  ok 2 [chromium] › Jobs B — Expired Lease Recovery: Reclaims stalled jobs whose lease has expired (2.0s)
  ok 3 [chromium] › Jobs C — Retry Limits & Terminal Failure: Transition to failed status after max_attempts (3.0s)
  ok 4 [chromium] › Jobs D — Idempotency Key Deduplication: Second enqueue with identical key returns existing ID (1.9s)
  ok 5 [chromium] › Jobs E — Tenant Isolation & Authorization: Fails gracefully when tenant does not exist (5.4s)
  ok 6 [chromium] › Jobs F — Poison-Job & Error Isolation: A failing job does not prevent subsequent jobs in batch (3.4s)
  ok 7 [chromium] › Jobs G — Operational Queue Metrics: getQueueMetrics correctly computes backlog and status counts (533ms)
  ok 8 [chromium] › Jobs H — Unified Notification Queue Processing: notificationQueueService delegates correctly (3.5s)
  8 passed (33.0s)
```

### Spec: `tests/billing-webhooks.spec.ts` (10/10 PASS)
```
Running 10 tests using 1 worker
  ok  1 [chromium] › Billing A — Webhook Signature: Rejection of forged and invalid signatures (51ms)
  ok  2 [chromium] › Billing B — Webhook Idempotency: Duplicate delivery protection (9.9s)
  ok  3 [chromium] › Billing C — Concurrent Webhook Processing: Race condition safety (4.5s)
  ok  4 [chromium] › Billing D — Subscription Persistence: Database state reflects plan activation (1.5s)
  ok  5 [chromium] › Billing E — Unknown Organization: Webhook references non-existent tenant gracefully (2.0s)
  ok  6 [chromium] › Billing F — Missing Subscription Row Upsert: Payment webhook creates active subscription if none existed (5.1s)
  ok  7 [chromium] › Billing G — Authoritative Plan Pricing: Catalog prices enforce server-side pricing integrity (3ms)
  ok  8 [chromium] › Billing H — Razorpay Event Distinction: Different lifecycle events for same entity do not collide (7.0s)
  ok  9 [chromium] › Billing I — State Machine Source of Truth: Status is authoritative from database (992ms)
  ok 10 [chromium] › Billing J — Failed Event Retry Recovery: Failed event can be retried upon redelivery (3.5s)
  10 passed (40.5s)
```

### TypeScript Strict Verification (`npx tsc --noEmit`)
```
Exit code: 0
Stdout: (empty - 0 errors)
Stderr: (empty)
```
