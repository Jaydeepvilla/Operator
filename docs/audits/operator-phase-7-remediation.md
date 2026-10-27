# Operator Phase 7 — Billing & Payment Lifecycle Remediation

**Project:** Operator — Autonomous AI Receptionist SaaS  
**Phase:** 7 of the Production-Readiness Programme  
**Role:** Principal Payments Engineer, Billing Systems Architect, and Financial Transaction Reliability Auditor  
**Date:** October 2026  
**Status:** Remediated & Verified  

---

## 1. Summary of Confirmed Defects & Fixes

During Phase 7, three critical defects impacting payment reliability, transaction deduplication, and financial authorization were identified, isolated, and resolved with minimal targeted interventions.

### Defect 1: Razorpay Webhook Event Deduplication Collision
- **Defect Identifier:** `PAY-001`
- **Severity:** High / Critical Reliability
- **Component:** `src/app/api/webhooks/billing/razorpay/route.ts`
- **Root Cause:** The Razorpay webhook handler constructed fallback event IDs using `payment.entity.id` directly (`pay_xxx`). In Razorpay's payment lifecycle, distinct events (such as `payment.authorized` and `payment.captured`) share the same entity ID. When `payment.captured` arrived after `payment.authorized`, the PostgreSQL unique constraint on `(provider, provider_event_id)` caused `WebhookProcessor` to treat `payment.captured` as a duplicate and skip it. Consequently, subscription activation and invoice creation never occurred.
- **Remediation:** 
  1. Updated event ID derivation in `src/app/api/webhooks/billing/razorpay/route.ts` to inspect the official `x-razorpay-event-id` header first.
  2. When falling back to entity IDs, prefixed the event type: `${eventType}_${paymentEntityId}` (e.g. `payment.authorized_pay_123` vs `payment.captured_pay_123`), ensuring unique ledger entries for each lifecycle transition.
- **Regression Test:** `tests/billing-webhooks.spec.ts` — `Billing H: Razorpay Event Distinction: Different lifecycle events for same entity do not collide`.

---

### Defect 2: Missing Subscription Record Crash in `convertTrialToPaid`
- **Defect Identifier:** `PAY-002`
- **Severity:** High / Availability Defect
- **Component:** `src/server/services/billing/subscription-engine.ts`
- **Root Cause:** In `convertTrialToPaid()`, an update statement was issued: `db.update(subscriptions).set(...).where(eq(subscriptions.organizationId, organizationId)).returning()`. For new organizations that completed checkout immediately upon sign-up without an existing trial row, `updatedSub` returned `undefined`. The subsequent audit log call `this.logAuditEvent(..., updatedSub.id, ...)` threw `TypeError: Cannot read properties of undefined (reading 'id')`, causing the webhook processing transaction to abort and return an uncaught 500.
- **Remediation:** Added an automatic fallback upsert using `db.insert(subscriptions)...onConflictDoUpdate()`. If no prior row exists, an active subscription row is guaranteed to be created with correct plan limits, period end timestamps, and provider subscription IDs.
- **Regression Test:** `tests/billing-webhooks.spec.ts` — `Billing F: Missing Subscription Row Upsert: Payment webhook creates active subscription if none existed`.

---

### Defect 3: Client-Side Plan Pricing Manipulation Vulnerability
- **Defect Identifier:** `PAY-003`
- **Severity:** Medium-High / Financial Integrity
- **Component:** `src/server/actions/billing.ts`
- **Root Cause:** When invoking `createCheckoutSessionAction({ planId, provider })`, the server action did not supply an `amount` parameter to `RazorpayProvider.createCheckoutSession()`. The Razorpay provider defaulted to $49 (`amount = (params.amount || 49) * 100`). Consequently, any user requesting an upgrade to the Professional tier ($149/mo) or Business tier ($349/mo) was charged only $49 while gaining higher-tier entitlements.
- **Remediation:** Hardened `createCheckoutSessionAction()` in `src/server/actions/billing.ts` to look up the authoritative plan from `getPlan(planId)`. It explicitly passes `amount: plan.price` and `priceId: plan.id` into both Razorpay and Stripe checkout sessions, preventing any price tampering or incorrect tier pricing.
- **Regression Test:** `tests/billing-webhooks.spec.ts` — `Billing G: Authoritative Plan Pricing: Catalog prices enforce server-side pricing integrity`.

---

### Defect 4: Unhandled Foreign Key Violation on Unknown Tenant Webhooks
- **Defect Identifier:** `PAY-004`
- **Severity:** Medium / Robustness Defect
- **Component:** `src/server/services/billing/webhook-processor.ts`
- **Root Cause:** If a webhook payload referenced a deleted, mismatched, or invalid `organizationId`, downstream queries attempting to insert into `subscriptions` threw an uncaught PostgreSQL foreign key violation (`23503: Key (organization_id) is not present in table "organizations"`). This caused the webhook to return HTTP 500, prompting endless redelivery from the payment provider.
- **Remediation:** Added defensive tenant verification checks in `WebhookProcessor` for both Stripe and Razorpay handlers. If `orgId` does not exist in `organizations`, a warning is logged and the event is safely completed without an unhandled exception.
- **Regression Test:** `tests/billing-webhooks.spec.ts` — `Billing E: Unknown Organization: Webhook references non-existent tenant gracefully`.

---

## 2. Regression Test Verification Suite

Ten deterministic tests in `tests/billing-webhooks.spec.ts` validate all critical billing invariants:

| Test ID | Test Name | Invariant Verified |
| :--- | :--- | :--- |
| **Billing A** | `Webhook Signature: Rejection of forged and invalid signatures` | Missing or invalid cryptographic signatures yield HTTP 400 immediately. |
| **Billing B** | `Webhook Idempotency: Duplicate delivery protection` | Duplicate webhooks are detected via database uniqueness and return HTTP 200 without duplicate processing. |
| **Billing C** | `Concurrent Webhook Processing: Race condition safety` | Concurrent deliveries result in exactly one processing worker and one skipped duplicate. |
| **Billing D** | `Subscription Persistence: Database state reflects plan activation` | Database state accurately persists active plan tiers and billing period intervals. |
| **Billing E** | `Unknown Organization: Webhook references non-existent tenant gracefully` | Events for non-existent organizations do not throw uncaught foreign key violations. |
| **Billing F** | `Missing Subscription Row Upsert: Payment webhook creates active subscription if none existed` | First-time payment conversions safely upsert missing subscription records. |
| **Billing G** | `Authoritative Plan Pricing: Catalog prices enforce server-side pricing integrity` | Server action derives pricing exclusively from `PLAN_CATALOG`, preventing price tampering. |
| **Billing H** | `Razorpay Event Distinction: Different lifecycle events for same entity do not collide` | Distinct lifecycle events for identical entities are differentiated and processed. |
| **Billing I** | `State Machine Source of Truth: Status is authoritative from database` | Subscription status and limits are derived exclusively from database state, not client query parameters. |
| **Billing J** | `Failed Event Retry Recovery: Failed event can be retried upon redelivery` | Transient failures mark event `failed` and permit lease reclamation on subsequent retry. |

---

## 3. Verification Commands & Results

All verification suites executed successfully:

```bash
# 1. Billing Webhook Reliability Suite
npx playwright test tests/billing-webhooks.spec.ts
# Result: 10 passed (39.4s) — Exit Code: 0

# 2. Worker, Security, and Observability Regression Suites
npx playwright test tests/background-jobs.spec.ts tests/observability-privacy.spec.ts tests/security-audit.spec.ts
# Result: 21 passed (35.8s) — Exit Code: 0

# 3. TypeScript Typecheck
npx tsc --noEmit
# Result: Clean — Exit Code: 0
```

---

## 4. Remaining Operational & Production-Readiness Items

1. **Staging Tunnel for Live Webhook Deliveries:**
   - Once deployed to a staging domain or public tunnel (e.g. ngrok), configure the webhook endpoints in the Stripe and Razorpay developer dashboards to verify live end-to-end event deliveries.
2. **Provider Secret Provisioning:**
   - Ensure `STRIPE_WEBHOOK_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are securely stored in the production secret manager before enabling live billing.
3. **Reconciliation Cron Job (Phase 8):**
   - Implement an automated daily reconciliation background job that queries provider APIs to verify subscription status and detect any missed webhook events.
