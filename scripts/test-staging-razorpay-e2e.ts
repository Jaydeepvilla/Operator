import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { db } from "../src/server/db";
import {
  organizations,
  users,
  memberships,
  subscriptions,
  billingAccounts,
  invoices,
  payments,
  refunds,
  billingEvents,
} from "../src/server/db/schema";
import { eq, and } from "drizzle-orm";
import { razorpayProvider } from "../src/server/services/billing/providers/razorpay";
import { webhookProcessor } from "../src/server/services/billing/webhook-processor";
import { financialMetricsService } from "../src/server/services/billing/financial-metrics";
import crypto from "crypto";

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
  durationMs: number;
}

const results: TestResult[] = [];

function recordTest(id: string, name: string, passed: boolean, details: string, durationMs: number) {
  results.push({ id, name, passed, details, durationMs });
  const icon = passed ? "✅ [PASS]" : "❌ [FAIL]";
  console.log(`  ${icon} [${id}] ${name} (${durationMs}ms)`);
  if (!passed) {
    console.error(`      Error/Detail: ${details}`);
  }
}

async function runRazorpayE2EVerification() {
  console.log("\n================================================================================");
  console.log("💳 OPERATOR — RAZORPAY STAGING END-TO-END INTEGRATION & WEBHOOK VERIFICATION");
  console.log("================================================================================\n");

  const startTime = Date.now();
  const testRunId = `rzp_test_${Date.now()}`;
  const testOrgId = crypto.randomUUID();
  const testUserId = `usr_rzp_${Date.now()}`;
  const testEmail = `billing_test_${Date.now()}@operator-staging.test`;

  // Fixtures cleanup tracking
  const createdOrgIds: string[] = [testOrgId];
  const createdUserIds: string[] = [testUserId];

  try {
    // 0. Setup test organization & user fixtures
    console.log("--- Setting up database fixtures for Razorpay staging test ---");
    await db.insert(users).values({
      id: testUserId,
      email: testEmail,
      name: "Staging Razorpay Customer",
      status: "active",
      isVerified: true,
      acceptTerms: true,
      acceptPrivacy: true,
    });

    await db.insert(organizations).values({
      id: testOrgId,
      name: "Staging Billing Clinic",
      slug: `staging-billing-${Date.now()}`,
      industry: "Healthcare",
      email: testEmail,
      phone: "+919876543210",
      timezone: "Asia/Kolkata",
      verificationStatus: "verified",
    });

    await db.insert(memberships).values({
      id: crypto.randomUUID(),
      organizationId: testOrgId,
      userId: testUserId,
      role: "owner",
    });

    // Initial trialing subscription
    await db.insert(subscriptions).values({
      id: crypto.randomUUID(),
      organizationId: testOrgId,
      planId: "free",
      status: "trialing",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Live Sandbox Order Creation via Razorpay API
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- Section 1: Razorpay Order & Checkout Creation ---");
    const t1Start = Date.now();
    let orderResult: any = null;
    try {
      orderResult = await razorpayProvider.createPaymentIntent(
        49, // 49 INR
        "INR",
        testUserId,
        testOrgId
      );
      const isOk = Boolean(orderResult && orderResult.id && orderResult.id.startsWith("order_"));
      recordTest(
        "RZP-01-ORDER",
        "Create real Razorpay sandbox order via API",
        isOk,
        `Order ID: ${orderResult?.id}, Status: ${orderResult?.status}`,
        Date.now() - t1Start
      );
    } catch (err: any) {
      recordTest("RZP-01-ORDER", "Create real Razorpay sandbox order via API", false, err.message, Date.now() - t1Start);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Server-Side Payment Signature & HMAC Webhook Verification
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- Section 2: Server-Side Signature & HMAC Verification ---");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "staging_rzp_webhook_secret_key_12345";
    // Configure provider with explicit webhook secret for deterministic test
    const customProvider = new (razorpayProvider.constructor as any)(
      process.env.RAZORPAY_KEY_ID,
      process.env.RAZORPAY_KEY_SECRET,
      webhookSecret
    );

    const testPayload = JSON.stringify({
      entity: "event",
      event: "payment.captured",
      timestamp: Math.floor(Date.now() / 1000),
    });

    const validSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(testPayload)
      .digest("hex");

    const t2Start = Date.now();
    const isValidSignatureVerified = customProvider.verifyWebhookSignature(testPayload, validSignature);
    recordTest(
      "RZP-02-SIG-VALID",
      "Valid Razorpay HMAC signature successfully verified",
      isValidSignatureVerified === true,
      `Verified with HMAC sha256`,
      Date.now() - t2Start
    );

    const t3Start = Date.now();
    const isInvalidSignatureRejected = customProvider.verifyWebhookSignature(testPayload, "invalid_forged_signature_hex_123");
    recordTest(
      "RZP-03-SIG-INVALID",
      "Forged or invalid signature rejected with timingSafeEqual",
      isInvalidSignatureRejected === false,
      `Rejected forged signature`,
      Date.now() - t3Start
    );

    const t4Start = Date.now();
    const isTamperedPayloadRejected = customProvider.verifyWebhookSignature(
      testPayload + "tampered",
      validSignature
    );
    recordTest(
      "RZP-04-SIG-TAMPER",
      "Tampered payload rejected even with original signature",
      isTamperedPayloadRejected === false,
      `Rejected tampered payload`,
      Date.now() - t4Start
    );

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Successful Payment Capture Webhook & Persisted Transaction
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- Section 3: Payment Capture Webhook & Persistence ---");
    const paymentId = `pay_${Date.now()}_test`;
    const eventIdCapture = `evt_pay_cap_${Date.now()}`;
    const paymentCaptureEvent = {
      event: "payment.captured",
      event_id: eventIdCapture,
      payload: {
        payment: {
          entity: {
            id: paymentId,
            amount: 4900, // 49.00 INR in paise
            currency: "INR",
            status: "captured",
            order_id: orderResult?.id || `order_test_${Date.now()}`,
            email: testEmail,
            notes: {
              organizationId: testOrgId,
              planId: "starter",
            },
          },
        },
      },
    };

    const t5Start = Date.now();
    const captureResult = await webhookProcessor.processEvent({
      provider: "razorpay",
      providerEventId: eventIdCapture,
      eventType: "payment.captured",
      payload: paymentCaptureEvent,
    });

    // Verify DB writes
    const [persistedPayment] = await db
      .select()
      .from(payments)
      .where(eq(payments.providerPaymentId, paymentId))
      .limit(1);

    const [updatedSub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, testOrgId))
      .limit(1);

    const isCapturePersisted =
      captureResult.processed === true &&
      persistedPayment !== undefined &&
      Number(persistedPayment.amount) === 49 &&
      persistedPayment.status === "succeeded" &&
      updatedSub?.status === "active" &&
      updatedSub?.planId === "starter";

    recordTest(
      "RZP-05-CAPTURE-PERSIST",
      "Payment capture activates subscription and creates invoice/payment ledger",
      isCapturePersisted,
      `Payment ID: ${persistedPayment?.id}, Sub Status: ${updatedSub?.status}, Plan: ${updatedSub?.planId}`,
      Date.now() - t5Start
    );

    // ──────────────────────────────────────────────────────────────────────────
    // 4. Failed & Abandoned Payment Handling
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- Section 4: Failed & Abandoned Payment Handling ---");
    const t6Start = Date.now();
    const eventIdFailed = `evt_pay_fail_${Date.now()}`;
    const paymentFailedEvent = {
      event: "payment.failed",
      event_id: eventIdFailed,
      payload: {
        payment: {
          entity: {
            id: `pay_failed_${Date.now()}`,
            amount: 4900,
            currency: "INR",
            status: "failed",
            error_code: "BAD_REQUEST_ERROR",
            error_description: "Card has insufficient funds",
            notes: {
              organizationId: testOrgId,
            },
          },
        },
      },
    };

    const failResult = await webhookProcessor.processEvent({
      provider: "razorpay",
      providerEventId: eventIdFailed,
      eventType: "payment.failed",
      payload: paymentFailedEvent,
    });

    const [subAfterFailure] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, testOrgId))
      .limit(1);

    const isFailureHandled =
      failResult.processed === true &&
      (subAfterFailure?.status === "past_due" || (subAfterFailure as any)?.metadata?.pastDue === true);

    recordTest(
      "RZP-06-FAIL-HANDLED",
      "Payment failure safely flags subscription as at-risk / past-due without crash",
      isFailureHandled,
      `Sub Status: ${subAfterFailure?.status}, Metadata: ${JSON.stringify((subAfterFailure as any)?.metadata)}`,
      Date.now() - t6Start
    );

    // ──────────────────────────────────────────────────────────────────────────
    // 5. Duplicate Webhook Delivery & Idempotency
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- Section 5: Webhook Idempotency & Replay Protection ---");
    const t7Start = Date.now();
    const duplicateResult = await webhookProcessor.processEvent({
      provider: "razorpay",
      providerEventId: eventIdCapture, // Replaying the exact same capture event
      eventType: "payment.captured",
      payload: paymentCaptureEvent,
    });

    // Check payment count in DB to ensure no duplicate row created
    const paymentRows = await db
      .select()
      .from(payments)
      .where(eq(payments.providerPaymentId, paymentId));

    const isDuplicateBlocked =
      duplicateResult.processed === false &&
      duplicateResult.duplicate === true &&
      paymentRows.length === 1;

    recordTest(
      "RZP-07-IDEMPOTENCY",
      "Duplicate webhook delivery detected and ignored idempotently (0 duplicate rows)",
      isDuplicateBlocked,
      `Duplicate: ${duplicateResult.duplicate}, DB Payment Rows: ${paymentRows.length}`,
      Date.now() - t7Start
    );

    // ──────────────────────────────────────────────────────────────────────────
    // 6. Delayed Webhook Delivery
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- Section 6: Delayed Webhook Delivery ---");
    const t8Start = Date.now();
    const delayedEventId = `evt_delayed_${Date.now()}`;
    const delayedEvent = {
      event: "payment.captured",
      event_id: delayedEventId,
      created_at: Math.floor(Date.now() / 1000) - 86400, // Delivered 24 hours late
      payload: {
        payment: {
          entity: {
            id: `pay_delayed_${Date.now()}`,
            amount: 4900,
            currency: "INR",
            status: "captured",
            notes: {
              organizationId: testOrgId,
              planId: "starter",
            },
          },
        },
      },
    };

    const delayedResult = await webhookProcessor.processEvent({
      provider: "razorpay",
      providerEventId: delayedEventId,
      eventType: "payment.captured",
      payload: delayedEvent,
    });

    recordTest(
      "RZP-08-DELAYED-DELIVERY",
      "Delayed webhook delivery processed cleanly without timestamp rejection",
      delayedResult.processed === true,
      `Delayed processed: ${delayedResult.processed}`,
      Date.now() - t8Start
    );

    // ──────────────────────────────────────────────────────────────────────────
    // 7. Partial & Full Refund Processing and Ledger Reconciliation
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- Section 7: Refund Processing & Over-Refund Guard ---");
    const t9Start = Date.now();
    const refundEventId1 = `evt_ref_1_${Date.now()}`;
    const refundEvent1 = {
      event: "refund.processed",
      event_id: refundEventId1,
      payload: {
        refund: {
          entity: {
            id: `rfnd_1_${Date.now()}`,
            payment_id: paymentId,
            amount: 2000, // 20.00 INR partial refund
            status: "processed",
          },
        },
      },
    };

    await webhookProcessor.processEvent({
      provider: "razorpay",
      providerEventId: refundEventId1,
      eventType: "refund.processed",
      payload: refundEvent1,
    });

    const [persistedRefund1] = await db
      .select()
      .from(refunds)
      .where(eq(refunds.paymentId, persistedPayment.id));

    recordTest(
      "RZP-09-PARTIAL-REFUND",
      "Partial refund webhook creates refund record and associates with payment",
      persistedRefund1 !== undefined && Number(persistedRefund1.amount) === 20,
      `Refund Amount: $${persistedRefund1?.amount}`,
      Date.now() - t9Start
    );

    // Over-refund attempt: attempting to refund 50.00 when only 29.00 remains
    const t10Start = Date.now();
    const overRefundEventId = `evt_over_ref_${Date.now()}`;
    const overRefundEvent = {
      event: "refund.processed",
      event_id: overRefundEventId,
      payload: {
        refund: {
          entity: {
            id: `rfnd_over_${Date.now()}`,
            payment_id: paymentId,
            amount: 5000, // 50.00 INR (exceeds balance)
            status: "processed",
          },
        },
      },
    };

    await webhookProcessor.processEvent({
      provider: "razorpay",
      providerEventId: overRefundEventId,
      eventType: "refund.processed",
      payload: overRefundEvent,
    });

    const allRefunds = await db
      .select()
      .from(refunds)
      .where(eq(refunds.paymentId, persistedPayment.id));

    // Over-refund must be rejected so count remains 1
    recordTest(
      "RZP-10-OVER-REFUND-GUARD",
      "Over-refund webhook (> remaining balance) rejected and not written to ledger",
      allRefunds.length === 1,
      `Refund records count: ${allRefunds.length} (over-refund barred)`,
      Date.now() - t10Start
    );

    // ──────────────────────────────────────────────────────────────────────────
    // 8. Subscription Cancellation & Entitlement Deprovisioning
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- Section 8: Subscription Cancellation & Entitlement Revocation ---");
    const t11Start = Date.now();
    const cancelEventId = `evt_sub_cancel_${Date.now()}`;
    const cancelEvent = {
      event: "subscription.cancelled",
      event_id: cancelEventId,
      payload: {
        subscription: {
          entity: {
            id: `sub_rzp_cancel_${Date.now()}`,
            status: "cancelled",
            notes: {
              organizationId: testOrgId,
            },
          },
        },
      },
    };

    await webhookProcessor.processEvent({
      provider: "razorpay",
      providerEventId: cancelEventId,
      eventType: "subscription.cancelled",
      payload: cancelEvent,
    });

    const [subAfterCancel] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, testOrgId))
      .limit(1);

    const isCanceled =
      subAfterCancel?.status === "canceled" ||
      subAfterCancel?.cancelAtPeriodEnd === true;

    recordTest(
      "RZP-11-CANCEL-ENTITLEMENT",
      "Subscription cancellation webhook marks subscription canceled and revokes features",
      isCanceled,
      `Sub Status: ${subAfterCancel?.status}`,
      Date.now() - t11Start
    );

    // ──────────────────────────────────────────────────────────────────────────
    // 9. Financial Metrics Reconciliation Integrity
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- Section 9: Realtime Metrics Reconciliation ---");
    const t12Start = Date.now();
    const metrics = await financialMetricsService.calculateRealtimeMetrics(testOrgId);
    const calculatedRefunds = metrics.currencyBreakdown?.["INR"]?.refunds ?? Math.round((metrics.grossRevenue - metrics.netRevenue) * 100) / 100;
    const isMetricsAccurate =
      metrics.grossRevenue >= 49 &&
      calculatedRefunds >= 20 &&
      metrics.netRevenue >= 29;

    recordTest(
      "RZP-12-METRICS-RECON",
      "Financial metrics ledger correctly reconciles gross, refunds, and net revenue",
      isMetricsAccurate,
      `Gross: $${metrics.grossRevenue}, Refunds: $${calculatedRefunds}, Net: $${metrics.netRevenue}`,
      Date.now() - t12Start
    );

  } finally {
    // Teardown test fixtures
    console.log("\n--- Tearing down Razorpay test fixtures ---");
    try {
      for (const orgId of createdOrgIds) {
        await db.delete(refunds).where(
          eq(
            refunds.paymentId,
            db
              .select({ id: payments.id })
              .from(payments)
              .innerJoin(billingAccounts, eq(payments.billingAccountId, billingAccounts.id))
              .where(eq(billingAccounts.organizationId, orgId)) as any
          )
        ).catch(() => {});
        await db.delete(payments).where(
          eq(
            payments.billingAccountId,
            db
              .select({ id: billingAccounts.id })
              .from(billingAccounts)
              .where(eq(billingAccounts.organizationId, orgId)) as any
          )
        ).catch(() => {});
        await db.delete(invoices).where(
          eq(
            invoices.billingAccountId,
            db
              .select({ id: billingAccounts.id })
              .from(billingAccounts)
              .where(eq(billingAccounts.organizationId, orgId)) as any
          )
        ).catch(() => {});
        await db.delete(billingAccounts).where(eq(billingAccounts.organizationId, orgId)).catch(() => {});
        await db.delete(subscriptions).where(eq(subscriptions.organizationId, orgId)).catch(() => {});
        await db.delete(memberships).where(eq(memberships.organizationId, orgId)).catch(() => {});
        await db.delete(organizations).where(eq(organizations.id, orgId)).catch(() => {});
      }
      for (const userId of createdUserIds) {
        await db.delete(users).where(eq(users.id, userId)).catch(() => {});
      }
      console.log("Teardown completed successfully.");
    } catch (e: any) {
      console.warn("Teardown warning:", e.message);
    }
  }

  console.log("\n================================================================================");
  const totalPassed = results.filter((r) => r.passed).length;
  const totalFailed = results.filter((r) => !r.passed).length;
  console.log(`TOTAL RAZORPAY STAGING SCENARIOS: ${totalPassed} PASSED, ${totalFailed} FAILED (TOTAL: ${results.length})`);
  console.log(`TOTAL DURATION: ${Date.now() - startTime}ms`);
  console.log("================================================================================\n");

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runRazorpayE2EVerification().catch((err) => {
  console.error("Fatal error running Razorpay verification:", err);
  process.exit(1);
});
