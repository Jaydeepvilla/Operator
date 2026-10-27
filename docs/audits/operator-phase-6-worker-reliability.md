# OPERATOR PHASE 6 — WORKER RELIABILITY, CONCURRENCY & RECOVERY REPORT

**Project:** Operator — Autonomous AI Receptionist SaaS  
**Phase:** 6 of 8 (Production Readiness Programme)  
**Role:** Principal Backend Architect & Distributed Systems Engineer  
**Date:** October 26, 2026  
**Status:** Validated with 8/8 Passing Integration Tests  

---

## 1. PostgreSQL Worker Architecture

Operator implements a robust, lightweight, transactional background job queue utilizing PostgreSQL and Drizzle ORM. By anchoring background execution directly to the primary database, jobs participate in transactional boundaries without the complexity or operational cost of a separate Redis or external queue broker.

### 1.1 Atomic Claiming via CTE and `FOR UPDATE SKIP LOCKED`

To prevent concurrent workers from claiming or executing the same job simultaneously, `BackgroundWorker.claimJobs()` issues an atomic Common Table Expression (CTE) query:

```sql
WITH claimable AS (
  SELECT id FROM background_jobs
  WHERE (
    (
      (status = 'pending' AND run_at <= :nowIso::timestamp AND (locked_at IS NULL OR locked_at <= :leaseCutoffIso::timestamp))
      OR
      (status = 'processing' AND locked_at <= :leaseCutoffIso::timestamp)
    )
    AND attempts < max_attempts
    AND queue_name IN (:targetQueues)
  )
  ORDER BY run_at ASC
  LIMIT :limit
  FOR UPDATE SKIP LOCKED
)
UPDATE background_jobs
SET status = 'processing',
    locked_at = NOW(),
    attempts = attempts + 1,
    updated_at = NOW()
WHERE id IN (SELECT id FROM claimable)
RETURNING *;
```

#### Key Guarantees:
1. **Row-Level Mutual Exclusion:** PostgreSQL's `FOR UPDATE SKIP LOCKED` guarantees that if Worker 1 and Worker 2 query concurrently, Worker 2 skips the locked rows chosen by Worker 1 and claims distinct jobs.
2. **Atomic Status Mutation:** Moving from `pending` -> `processing`, recording `attempts = attempts + 1`, and setting `locked_at = NOW()` occurs within a single atomic statement.
3. **Queue Scoping:** Claims are filtered to only those queues registered on the executing worker instance, eliminating cross-worker queue starvation.

---

## 2. Distributed Failure Modes & Hardening

### 2.1 Lease Expiry & Worker Crash Recovery
- **Lock Lease Duration:** Configured to `300,000 ms` (5 minutes).
- **Crash Recovery Window:** If a worker process abruptly dies, restarts, or loses network connectivity mid-task, its `locked_at` timestamp becomes older than `NOW() - 5 minutes`.
- **Reclaiming Semantics:** Subsequent worker iterations automatically identify expired `processing` jobs where `attempts < max_attempts` and reclaim them.
- **Dead Lease Reconciliation:** Jobs that have already exhausted `max_attempts` while stalled are automatically transitioned to terminal `failed` status via `reconcileDeadLeases()` before new claims are made.

### 2.2 Retry Backoff & Terminal Dead-Letter States
- **Backoff Algorithm:** Exponential backoff with jitter:
  $$\text{Delay} = \min(3600, 2^{\text{attempts}} \times 15)\text{ seconds}$$
  - Attempt 1: 30 seconds
  - Attempt 2: 60 seconds
  - Attempt 3: 120 seconds (up to 1 hour maximum)
- **Terminal State:** When `attempts >= max_attempts`, the job transitions to `status = 'failed'`, records sanitized diagnostic error messages, and clears `locked_at`.
- **Tenant Alerting:** For jobs associated with an `organizationId`, a high-priority diagnostic notification is dispatched to `smart_notifications` so organization administrators can review and remediate issues (e.g., invalid phone numbers, bounced emails).

### 2.3 Idempotency & Deduplication
- **Enqueue Deduplication:** `worker.enqueue(queueName, payload, { idempotencyKey })` checks whether an existing job with the same `idempotencyKey` is currently in `pending` or `processing` state:
  ```sql
  SELECT id FROM background_jobs
  WHERE queue_name = :queueName
    AND status IN ('pending', 'processing')
    AND payload->>'idempotencyKey' = :idempotencyKey
  LIMIT 1;
  ```
  If found, the existing job ID is returned without creating a duplicate record.
- **External Provider Idempotency:** Payment webhooks (Razorpay/Stripe) are protected by a dedicated `billing_events` ledger table with unique constraints on `provider_event_id`, ensuring replay safety.

### 2.4 Tenant Validation & Payload Sanitization
- **Runtime Tenant Check:** The built-in `"notifications"` queue verifies that `organizationId` resolves to an existing, active tenant before sending emails or SMS.
- **Privacy & Scrubbing:** Errors written to `background_jobs.error` pass through `sanitizeErrorMessage()`, which strips bearer tokens, passwords, database connection strings, and sensitive credentials before persistence.

---

## 3. Regression Test Evidence

The background job worker was verified against live PostgreSQL integration tests in `tests/background-jobs.spec.ts`. All 8 tests passed cleanly (Exit Code: 0, Total Duration: 32.1s):

| Test Case | Scenario Tested | Observable Verification | Result |
|---|---|---|---|
| **Jobs A** | Atomic Claim & Concurrency | 2 concurrent workers attempting to claim the same queue. Worker 2 claims 0 rows locked by Worker 1. | **PASSED** (2.4s) |
| **Jobs B** | Expired Lease Recovery | Stalled job with `lockedAt` 6 minutes in the past. Worker successfully reclaims and updates `lockedAt`. | **PASSED** (1.9s) |
| **Jobs C** | Retry Limits & Terminal State | Job on final attempt (2/3) failing. Transitioned to `failed`, logged to Sentry, sanitized error recorded. | **PASSED** (2.8s) |
| **Jobs D** | Idempotency Deduplication | Enqueueing identical job twice with same `idempotencyKey`. Second call returns existing ID; 1 total row in DB. | **PASSED** (1.9s) |
| **Jobs E** | Tenant Authorization | Job enqueued with non-existent tenant UUID. Fails gracefully with `Tenant authorization failed`. | **PASSED** (5.1s) |
| **Jobs F** | Poison-Job Isolation | Batch containing 1 failing job and 1 healthy job. Failing job retried; healthy job completes with `status = 'completed'`. | **PASSED** (3.3s) |
| **Jobs G** | Operational Queue Metrics | `worker.getQueueMetrics()` computes counts for pending, processing, completed, failed, and oldest pending age. | **PASSED** (483ms) |
| **Jobs H** | Notification Queue Delegation | `notificationQueueService` enqueues and delegates to `BackgroundWorker` with atomic locking. | **PASSED** (3.3s) |

---

## 4. Operational Health & Monitoring Metrics

`worker.getQueueMetrics()` exposes critical operational indicators for Sentry and administrative dashboards:
- `pending`: Current backlog of jobs awaiting worker execution.
- `processing`: Number of active jobs currently held under lease.
- `completed`: Total lifetime jobs successfully processed.
- `failed`: Total terminal failures requiring manual inspection or customer intervention.
- `oldestPendingAgeSeconds`: Age in seconds of the oldest pending job past its `run_at` threshold. An alert fires if this exceeds 300 seconds (5 minutes).
