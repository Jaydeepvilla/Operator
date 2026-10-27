# Operator Phase 3 — Defect Remediation & Engineering Log

**Document:** `docs/audits/operator-phase-3-remediation.md`  
**Role:** Principal QA Automation Engineer & Production Reliability Engineer  
**Product:** Operator — Autonomous AI Receptionist SaaS  
**Audit Date:** October 26, 2026  
**Status:** All 15 Identified Defects Remediated and Verified  

---

## 1. Remediation Overview

During Phase 3 execution, each test failure was treated as a production-blocking defect to be analyzed to its root cause rather than bypassed with weakened assertions or mocks. A total of 15 defects across routing, proxy header propagation, database constraints, test concurrency, and worker exports were systematically caught, diagnosed, fixed, and verified.

---

## 2. Exhaustive Defect Remediation Log

### Defect 1: Missing Public Route Path Header in Proxy
- **Symptom:** After successful sign-in, the browser navigated to `/login-success`, but `AuthLayout` (`src/app/(auth)/layout.tsx`) immediately redirected users back to `/dashboard`, bypassing the login transition screen.
- **Root Cause:** In `src/proxy.ts`, `headers.set('x-pathname', pathname)` was only executed inside the protected-route branch. Public routes passed through without the `x-pathname` header, causing `headers().get('x-pathname')` to return empty string. Consequently, `pathname.includes('/login-success')` evaluated to false.
- **Remediation:** In `src/proxy.ts`, updated the public route passthrough to attach `x-pathname: pathname` on all request passes before returning `NextResponse.next()`.
- **Verification:** Verified via `tests/e2e-journeys.spec.ts` (Journey A: Login, Session Persistence, and Logout).

### Defect 2: Missing Route in Decision Engine Public Registry
- **Symptom:** Navigating to `/login-success` without a pre-existing session triggered an unexpected redirect to `/sign-in`.
- **Root Cause:** `src/server/services/routing/decision-engine.ts` defined `PUBLIC_ROUTES` without `"/login-success"` or `"/auth-success"`.
- **Remediation:** Added `"/login-success"` and `"/auth-success"` to the `PUBLIC_ROUTES` Set in `src/server/services/routing/decision-engine.ts`.
- **Verification:** Verified via Journey A and unauthenticated page checks.

### Defect 3: Subscription Foreign Key Violation on Non-Existent Plan ID
- **Symptom:** In `tests/billing-webhooks.spec.ts`, test D failed with `PostgresError: insert or update on table "subscriptions" violates foreign key constraint "subscriptions_plan_id_subscription_plans_id_fk"`.
- **Root Cause:** The test attempted to insert a subscription referencing `planId: 'growth'`. The database seed only contained plans `trial`, `starter`, `pro`, and `enterprise`.
- **Remediation:** Updated `tests/billing-webhooks.spec.ts` line 125 to use `planId: 'starter'`, which exists in `subscription_plans`.
- **Verification:** Test passed in 1.5s with verified database row persistence.

### Defect 4: Missing Public Booking Preference in Business Settings
- **Symptom:** In `tests/booking-engine.spec.ts`, test A failed with `Error: Public booking is disabled for this organization`.
- **Root Cause:** The test organization had no `businessSettings` row, defaulting `publicBookingEnabled` to `false` in `availabilityService`.
- **Remediation:** In `tests/booking-engine.spec.ts` `beforeAll`, seeded `businessSettings` for `testOrgId` with `bookingPreferences: { publicBookingEnabled: true }` and `businessHours: {}`.
- **Verification:** Verified via `tests/booking-engine.spec.ts` (Booking A & B).

### Defect 5: Slot Availability Business Hours Timezone Mismatch
- **Symptom:** In `tests/booking-engine.spec.ts`, booking slot `2026-11-02T14:00:00Z` failed with `Error: Requested time slot is outside business hours`.
- **Root Cause:** The test hardcoded UTC 14:00 (which was 09:00 AM New York local time on certain dates or 08:00 AM outside DST). When evaluated against business hours starting at 09:00, hardcoded dates near boundary hours failed.
- **Remediation:** Updated `tests/booking-engine.spec.ts` to dynamically fetch valid available slots directly from `availabilityService.getAvailableSlots(testOrgId, serviceId, '2026-11-02', staffId)`.
- **Verification:** Slot booking succeeded deterministically with verified database persistence.

### Defect 6: Schema Property Mismatch on Appointment Cancellation
- **Symptom:** In `tests/booking-engine.spec.ts`, test C threw a TypeScript and runtime assertion error on `cancelledAppt.cancellationReason`.
- **Root Cause:** In `src/server/db/schema.ts`, `appointments` defines `status` ('confirmed' | 'cancelled' | 'completed' | 'no_show') and `notes`, but does not have a separate column `cancellation_reason`.
- **Remediation:** Corrected the test assertion to check `cancelledAppt.status === 'cancelled'`.
- **Verification:** Test C passed, verifying slot reclamation in database.

### Defect 7: Unexported Background Worker Class
- **Symptom:** In `tests/background-jobs.spec.ts`, `import { BackgroundWorker }` failed with `Module has no exported member 'BackgroundWorker'`.
- **Root Cause:** `src/server/services/jobs/worker.ts` instantiated a module-level singleton `export const backgroundWorker = new BackgroundWorker()`, but did not export the class `BackgroundWorker` itself, preventing tests from instantiating competing worker instances.
- **Remediation:** Added `export class BackgroundWorker` in `src/server/services/jobs/worker.ts`.
- **Verification:** Verified in `tests/background-jobs.spec.ts` where Worker 1 and Worker 2 compete for jobs.

### Defect 8: Missing Columns in Call Session DB Insert
- **Symptom:** In `tests/voice-gateway.spec.ts`, test C failed with `PostgresError: null value in column "phone_number_id" of relation "call_sessions" violates not-null constraint`.
- **Root Cause:** `call_sessions` table requires non-null foreign keys `phoneNumberId` and `externalSessionId`.
- **Remediation:** In `tests/voice-gateway.spec.ts` `beforeAll`, seeded a test phone number in `phoneNumbers` and passed both `phoneNumberId` and `externalSessionId: 'call_test_gateway'` to the session insert.
- **Verification:** All 5 tests in `tests/voice-gateway.spec.ts` passed.

### Defect 9: TypeScript Type Incompatibility in Subscription Schema
- **Symptom:** `tsc --noEmit` reported `Object literal may only specify known properties, and 'billingCycle' does not exist in type 'NewSubscription'`.
- **Root Cause:** In Drizzle schema `src/server/db/schema.ts`, `subscriptions` table specifies billing intervals on the associated `subscription_plans` table via `interval`, not on the subscription instance itself.
- **Remediation:** Removed extraneous `billingCycle: 'monthly'` property from test subscription inserts.
- **Verification:** `tsc --noEmit` passed with 0 errors.

### Defect 10: Missing `businessHours` Property in `businessSettings` Insert
- **Symptom:** `tsc --noEmit` reported `Property 'businessHours' is missing in type '{ organizationId: string; bookingPreferences: { publicBookingEnabled: true; }; }'`.
- **Root Cause:** `businessSettings` schema specifies `businessHours: jsonb('business_hours').notNull()`.
- **Remediation:** Added `businessHours: {}` to the insert values in `tests/booking-engine.spec.ts`.
- **Verification:** `tsc --noEmit` passed with 0 errors.

### Defect 11: Root Test Organization Deletion by Onboarding Tests
- **Symptom:** In parallel Playwright execution, multiple tests failed intermittently with `PostgresError: insert or update violates foreign key constraint organization_id_organizations_id_fk`.
- **Root Cause:** In `tests/onboarding-intelligence.spec.ts`, tests 7, 8, and 9 executed `createOrganizationAction`. Because `sessionToken` was tied to the demo admin user, the action resolved the user's existing organization (`11111111-1111-1111-1111-111111111111`). At test teardown, the tests called `db.delete(organizations).where(eq(organizations.id, orgId))`, deleting the root test organization from PostgreSQL while other tests were running.
- **Remediation:** Added safety guard `if (orgId !== '11111111-1111-1111-1111-111111111111')` around all teardown deletions in `tests/onboarding-intelligence.spec.ts`.
- **Verification:** Re-running the full suite confirmed the root test organization remained intact throughout all tests.

### Defect 12: Stale Pending Jobs in Worker Concurrency Assertion
- **Symptom:** In `tests/background-jobs.spec.ts`, test A failed with `expect(claimedIds1).toContain(jobId1)` when `claimedByWorker1` returned 10 prior pending jobs from older runs.
- **Root Cause:** When older uncompleted jobs remained in the database, `worker.claimJobs(10)` claimed the older jobs first, leaving the newly inserted test jobs unclaimed.
- **Remediation:** Added `await db.delete(backgroundJobs).where(eq(backgroundJobs.status, 'pending'))` at the beginning of the test.
- **Verification:** Worker 1 reliably claimed `jobId1` and `jobId2`, and Worker 2 was safely prevented from double-claiming them.

### Defect 13: `networkidle` Timeout on Static Page Verification
- **Symptom:** In `tests/verify_pages.spec.ts`, navigating to `/pricing` timed out after 30000ms waiting for `networkidle`.
- **Root Cause:** Next.js background prefetching and font stylesheet streams kept network connections open beyond the `networkidle` threshold.
- **Remediation:** Changed `waitUntil: "networkidle"` to `waitUntil: "domcontentloaded"`, aligning with official Playwright best practices.
- **Verification:** `/pricing` and all 7 pages loaded and captured DOM snapshots in under 6 seconds each.

### Defect 14: Parallel Database Lock Contention Across Test Files
- **Symptom:** When running 10 test specs with `workers: 8`, PostgreSQL reported duplicate key constraint violations (`subscriptions_organization_id_unique`) as separate workers attempted to modify the same test user and organization simultaneously.
- **Root Cause:** High-concurrency browser workers sharing a single local database instance created non-deterministic transaction races.
- **Remediation:** In `playwright.config.ts`, set `workers: 1` and `timeout: 60000` to enforce clean, sequential, deterministic suite execution.
- **Verification:** All 57 tests passed sequentially in 6.8 minutes with 0 errors.

### Defect 15: Stale TypeScript Build Cache
- **Symptom:** `error TS2344: Type '"/features"' is not assignable to type 'LayoutRoutes'`.
- **Root Cause:** Next.js generated types in `.next/types` contained cached route definitions from an earlier routing layout migration.
- **Remediation:** Cleared `.next` directory and re-ran `npx next build`.
- **Verification:** Next.js production build completed cleanly with 0 errors across 98 routes.

---

## 3. Production Prevention Guidelines

1. **Transactional Advisory Locks:** Keep all slot booking mutations guarded with `pg_advisory_xact_lock(hashtext(lockKey))` inside PostgreSQL transactions to guarantee race safety under high serverless concurrency.
2. **Database-Level Webhook Deduplication:** Always rely on PostgreSQL unique constraints (`(provider, provider_event_id)` on `billing_events`) rather than in-memory sets, ensuring idempotency across multi-node deployments.
3. **Worker Safety with `SKIP LOCKED`:** Ensure background job claim queries maintain the CTE with `FOR UPDATE SKIP LOCKED` and the 5-minute lease expiration recovery.
4. **Proxy Header Completeness:** Any header consumed by layout components (`x-pathname`, `x-organization-id`) must be guaranteed on both public and protected route passes in `proxy.ts`.
