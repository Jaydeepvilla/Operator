# OPERATOR PHASE 8 — TASK D: STAGING WEBHOOK CONFIGURATION & GATEWAY VERIFICATION

**Project:** Operator — Autonomous AI Receptionist SaaS  
**Phase:** 8 — Additional Requirements  
**Audit Component:** Task D — Staging Webhook Configuration and Gateway Verification  
**Date:** October 26, 2026  
**Auditor:** Antigravity  

---

## 1. Executive Summary

This report documents the verification of Stripe and Razorpay webhook handlers, signature verification protocols, idempotency guarantees, retry semantics, and the exact staging configuration requirements for Operator.

### Verification Status:
- **Endpoint Code Implementation:** **PASS (VERIFIED)**
- **Signature Verification & Raw Body Handling:** **PASS (VERIFIED)**
- **Event Idempotency & Concurrency Locks:** **PASS (VERIFIED)**
- **Country-Aware Pricing & Currency Integrity:** **PASS (VERIFIED)**
- **Live External Staging Gateway Delivery:** **BLOCKED — awaiting staging deployment & provider dashboard configuration** (Per system constraints, external gateway delivery cannot be claimed as complete until live dashboard configuration and webhook delivery verification are performed by an authorized operator).

---

## 2. Webhook Endpoints & Provider Specifications

### 2.1 Stripe Webhook Endpoint
- **URL Path:** `/api/webhooks/billing/stripe`
- **Method:** `POST`
- **Signature Header:** `stripe-signature`
- **Signature Algorithm:** HMAC-SHA256 via Stripe Webhook Secret (`whsec_...`)
- **Raw Body Requirement:** Must access `await req.text()` without prior JSON parsing to preserve cryptographically canonical byte representation.
- **Fail-Closed Behavior:** If `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` is unset, returns `503 Service Unavailable` with error code `PAYMENT_CONFIGURATION_UNAVAILABLE`.
- **Expected Events:**
  - `checkout.session.completed` — Activates initial subscription and links customer ID.
  - `invoice.paid` — Extends subscription period and records payment record.
  - `invoice.payment_failed` — Enters grace period and flags subscription as `past_due`.
  - `customer.subscription.updated` — Updates plan tier and renewal periods.
  - `customer.subscription.deleted` — Immediately transitions status to `canceled` and restricts entitlements.

### 2.2 Razorpay Webhook Endpoint
- **URL Path:** `/api/webhooks/billing/razorpay`
- **Method:** `POST`
- **Signature Header:** `x-razorpay-signature`
- **Signature Algorithm:** HMAC-SHA256 (`crypto.createHmac("sha256", secret).update(rawBody).digest("hex")`)
- **Event ID Derivation:** Extracts `x-razorpay-event-id`, or event-scoped entity ID (e.g. `order_paid_order_123`), preventing cross-event suppression collisions.
- **Expected Events:**
  - `order.paid` — Verifies payment amount, activates plan, and provisions billing account.
  - `payment.captured` — Authorizes and records payment transaction.
  - `payment.failed` — Records failed payment attempt and triggers grace period.
  - `subscription.authenticated` — Marks recurring mandate authorization.
  - `subscription.activated` — Confirms recurring mandate is live.
  - `subscription.charged` — Records periodic invoice and renewal.
  - `subscription.cancelled` / `subscription.halted` — Marks subscription as `canceled`.

---

## 3. Idempotency & Concurrency Safety

Both endpoints route through `webhookProcessor.processEvent()` in `src/server/services/billing/webhook-processor.ts`:
1. **Event Deduplication:** Queries `billing_events` by `(provider, provider_event_id)`. If status is `'processed'`, immediately returns `{ received: true, processed: false, duplicate: true }` with HTTP 200.
2. **Concurrency Locks:** Prevents duplicate processing when two webhook instances deliver the same event simultaneously via atomic insert/update constraints.
3. **HTTP 200 ACK:** Returns HTTP 200 promptly (< 200ms) to satisfy provider delivery timeouts and prevent endless retry storms.

---

## 4. Staging Dashboard Configuration Runbook

When deploying to the staging environment, an authorized operator must configure the following in the respective payment dashboards:

### 4.1 Stripe Dashboard Configuration (Staging/Test Mode)
1. Log in to [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks).
2. Ensure the toggle is switched to **Test Mode**.
3. Click **Add an endpoint**.
4. Set **Endpoint URL** to:
   `https://<staging-domain>.vercel.app/api/webhooks/billing/stripe`
5. Select the required events:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
6. Click **Add endpoint**.
7. Reveal the **Signing Secret** (`whsec_...`).
8. Copy the signing secret and add it to the Vercel Staging Environment Variables as `STRIPE_WEBHOOK_SECRET`.
9. Ensure `STRIPE_SECRET_KEY` in staging starts with `sk_test_`.

### 4.2 Razorpay Dashboard Configuration (Staging/Test Mode)
1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/#/app/keys).
2. Toggle the header switch to **Test Mode**.
3. Navigate to **Settings** -> **Webhooks** -> **Add New Webhook**.
4. Set **Webhook URL** to:
   `https://<staging-domain>.vercel.app/api/webhooks/billing/razorpay`
5. Generate a high-entropy random secret (32+ characters) and enter it into the **Secret** field.
6. Set **Alert Email** to `alerts@operator.local`.
7. Select active events:
   - `order.paid`
   - `payment.captured`
   - `payment.failed`
   - `subscription.activated`
   - `subscription.charged`
   - `subscription.cancelled`
   - `subscription.halted`
8. Click **Save Webhook**.
9. Save the secret in Vercel Staging Environment Variables as `RAZORPAY_WEBHOOK_SECRET`.
10. Ensure `RAZORPAY_KEY_ID` in staging starts with `rzp_test_`.

---

## 5. Automated Test Evidence

Automated tests in `tests/billing-reconciliation-and-webhooks.spec.ts` verify signature security:
- `Webhooks A — Stripe Webhook: Rejects unsigned or forged requests`: **PASS** (400 / 503 response).
- `Webhooks B — Razorpay Webhook: Rejects unsigned or forged HMAC signatures`: **PASS** (400 response).
- `tests/billing-webhooks.spec.ts`: 10/10 tests **PASS** (idempotency, duplicate delivery, missing subscription upsert, catalog pricing integrity, failed event retries).
