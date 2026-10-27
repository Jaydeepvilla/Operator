# OPERATOR PHASE 2A AUDIT: BILLING WEBHOOK IDEMPOTENCY

**Date:** October 26, 2026  
**Status:** MIGRATED, IMPLEMENTED & VERIFIED  
**Author:** Principal Software Architect & Reliability Engineer  

---

## 1. Executive Summary & Root Cause Analysis

### The Underlying Architectural Defect
Prior to Phase 2A, the billing system exhibited severe idempotency vulnerabilities:
1. **Application-Memory Query Race:** `WebhookProcessor` relied on `db.select().from(billingEvents).where(eq(eventType, ...))` before processing. In concurrent delivery scenarios (standard with Stripe and Razorpay retries during brief network spikes), both requests executed the `select` simultaneously, observed no existing record, and proceeded to execute duplicate financial side effects (double upgrades, duplicate usage credits, duplicate customer emails).
2. **Missing Schema Uniqueness:** The `billing_events` table possessed no unique database constraint on the external provider event identifier.
3. **Non-Deterministic Fallbacks:** The Razorpay webhook handler generated fallback identifiers using `Math.random()`, guaranteeing that re-delivered webhooks without top-level IDs would bypass deduplication and execute multiple times.
4. **Permanent Failure Lockout:** Any unexpected error during webhook execution failed to distinguish retryable state transitions from terminal failures.

---

## 2. Solution Architecture: Database-Enforced Atomic Claim

### 2.1 Database Schema Migration
We applied a non-destructive PostgreSQL migration (`0011_billing_events_idempotency.sql`) to Neon PostgreSQL:
```sql
ALTER TABLE "billing_events" 
  ADD COLUMN IF NOT EXISTS "provider" text,
  ADD COLUMN IF NOT EXISTS "provider_event_id" text,
  ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'received' NOT NULL,
  ADD COLUMN IF NOT EXISTS "error" text,
  ADD COLUMN IF NOT EXISTS "processed_at" timestamp;

CREATE UNIQUE INDEX IF NOT EXISTS "billing_events_provider_event_unique" 
  ON "billing_events" ("provider", "provider_event_id") 
  WHERE "provider" IS NOT NULL AND "provider_event_id" IS NOT NULL;
```
- **Composite Identity:** `(provider, provider_event_id)` ensures that different payment providers (e.g. Stripe and Razorpay) can safely utilize identical event IDs without cross-tenant or cross-provider collision.
- **Partial Unique Index:** Safely accommodates legacy records without unique keys while strictly enforcing uniqueness on all modern webhooks.

### 2.2 Atomic Claim Pattern (State Machine)
`WebhookProcessor.processEvent` now implements an atomic claim pattern:

```mermaid
stateDiagram-v2
    [*] --> InsertAttempt: Webhook Arrives
    InsertAttempt --> Processing: Insert Succeeds (Lock Acquired)
    
    InsertAttempt --> UniqueViolation: Postgres 23505 Error
    UniqueViolation --> CheckExistingState: Query Existing Event
    
    CheckExistingState --> SkipProcessed: status == 'processed'
    CheckExistingState --> SkipConcurrent: status == 'processing' (<5m old)
    CheckExistingState --> ReclaimLease: status == 'processing' (>5m old, crashed)
    CheckExistingState --> AllowRetry: status == 'failed'
    
    Processing --> ExecuteHandler: Dispatch to Stripe/Razorpay Handler
    ReclaimLease --> ExecuteHandler
    AllowRetry --> ExecuteHandler
    
    ExecuteHandler --> MarkProcessed: Handler Succeeded
    ExecuteHandler --> MarkFailed: Handler Threw Error
    
    MarkProcessed --> [*]
    MarkFailed --> [*]
    SkipProcessed --> [*]
    SkipConcurrent --> [*]
```

### 2.3 Deterministic Fallback Identification
For webhooks that lack an explicit top-level event ID (e.g., certain Razorpay payment captured events), `src/app/api/webhooks/billing/razorpay/route.ts` generates a deterministic SHA-256 hash of the exact raw request payload:
```ts
const eventId = body.event_id || `rzp_${crypto.createHash("sha256").update(rawBody).digest("hex")}`;
```
Identical webhook re-transmissions generate the identical hash, ensuring 100% deduplication.

---

## 3. Verification & Regression Results

We executed the comprehensive regression test suite (`scripts/verify-phase-2a-regression.ts`) directly against Neon PostgreSQL:

| Test Case | Scenario Tested | Result | Duration | Details |
| :--- | :--- | :--- | :--- | :--- |
| **Duplicate Delivery** | Identical Stripe subscription update delivered twice sequentially. | **PASS** | 4,780ms | First event transitioned to `processed`; second event immediately returned `duplicate: true`, 0 side effects repeated. |
| **Concurrent Race Condition** | Two parallel workers attempt to claim the exact same `payment_intent.succeeded` event simultaneously via `Promise.all`. | **PASS** | 3,690ms | Exactly 1 worker acquired the insert lock; the competing worker received Postgres 23505 and backed off. 0 duplicate records. |
| **Retry After Partial Failure** | Webhook fails during execution and transitions to `status: 'failed'`. A retry arrives later. | **PASS** | 3,586ms | System detected `status: 'failed'`, reset state to `processing`, safely re-executed business logic, and updated to `processed`. |
| **Cross-Provider Isolation** | Stripe and Razorpay deliver events with the exact same identifier (`shared_event_id_1793...`). | **PASS** | 2,435ms | Both events succeeded independently without collision due to composite key `(provider, provider_event_id)`. |

---

## 4. Operational Invariants

1. **Crash Safety:** If a serverless function terminates abruptly mid-execution, the event remains in `status: 'processing'`. Any retry received after the 5-minute lease expiration automatically reclaims the lease.
2. **No Automated Data Deletion:** Historical records in `billing_events` are never purged or altered destructively during migrations.
3. **Structured Diagnostics:** All deduplication and retry events emit structured logs with provider, event ID, event type, and elapsed execution time.
