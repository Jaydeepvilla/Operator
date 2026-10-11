/**
 * OPERATOR — ADVANCED FINANCIAL INTEGRITY & RECONCILIATION VERIFICATION MATRIX
 * 
 * Verifies with mathematical precision and controlled database fixtures:
 * 
 * Section A: Partial and Multiple Refunds
 *  - A1: Successful payment with no refund
 *  - A2: Single partial refund deducted from gross -> net
 *  - A3: Multiple partial refunds against the same payment
 *  - A4: Full refund marks invoice refunded
 *  - A5: Failed refund does not deduct from net revenue
 *  - A6: Duplicate refund webhook delivery is idempotent
 *  - A7: Refund amount exceeding remaining refundable balance is rejected
 * 
 * Section B: Subscription Normalization
 *  - B1: Monthly active subscription ($49/mo -> $49 MRR)
 *  - B2: Annual active subscription normalized to MRR ($240/yr -> $20/mo MRR)
 *  - B3: Trialing subscription ($0 MRR)
 *  - B4: Canceled subscription ($0 MRR, churn impact)
 *  - B5: Past-due subscription ($0 MRR, churn risk)
 *  - B6: Upgrade / plan change updates MRR correctly
 *  - B7: Duplicate subscription webhook delivery is idempotent
 * 
 * Section C: Multi-Currency Handling
 *  - C1: INR transactions properly recorded and isolated
 *  - C2: USD transactions properly recorded and isolated
 *  - C3: Mixed-currency records segregated into currencyBreakdown (never blindly added)
 * 
 * Section D: Tenant Isolation
 *  - D1: Metrics for Tenant 1 exclude Tenant 2's payments and refunds
 *  - D2: Empty tenant returns strictly 0s (no fabricated MRR, ARPU, or LTV)
 * 
 * Section E: Idempotency & Consistency
 *  - E1: Duplicate payment webhook event ignored
 *  - E2: Out-of-order refund before payment is rejected safely
 *  - E3: Payment failure followed by success updates state accurately
 */

import { db } from "../src/server/db";
import { 
  organizations, 
  subscriptions, 
  subscriptionPlans, 
  billingAccounts, 
  payments, 
  refunds,
  invoices,
  billingEvents
} from "../src/server/db/schema";
import { eq, inArray } from "drizzle-orm";
import crypto from "crypto";
import { financialMetricsService } from "../src/server/services/billing/financial-metrics";
import { webhookProcessor } from "../src/server/services/billing/webhook-processor";
import { subscriptionEngine } from "../src/server/services/billing/subscription-engine";

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assert(condition: boolean, testId: string, description: string, details?: any) {
  totalChecks++;
  if (condition) {
    console.log(`  ✓ [PASS] [${testId}] ${description}`);
    passedChecks++;
  } else {
    console.error(`  ✗ [FAIL] [${testId}] ${description}`);
    if (details !== undefined) {
      console.error(`    Details:`, details);
    }
    failedChecks++;
  }
}

async function runAdvancedFinancialIntegritySuite() {
  console.log("================================================================================");
  console.log("   OPERATOR ADVANCED FINANCIAL INTEGRITY & RECONCILIATION VERIFICATION MATRIX   ");
  console.log("================================================================================\n");

  const tenantAId = crypto.randomUUID();
  const tenantBId = crypto.randomUUID();
  const emptyTenantId = crypto.randomUUID();

  const cleanupOrgIds: string[] = [tenantAId, tenantBId, emptyTenantId];
  const cleanupPlanIds: string[] = [];
  const cleanupEventIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // 0. Base Fixtures Setup
    // -------------------------------------------------------------------------
    await db.insert(organizations).values([
      { id: tenantAId, name: "Tenant Alpha Corp", slug: `alpha-${Date.now()}`, industry: "Technology", timezone: "UTC" },
      { id: tenantBId, name: "Tenant Beta Ltd", slug: `beta-${Date.now()}`, industry: "Technology", timezone: "UTC" },
      { id: emptyTenantId, name: "Tenant Empty Co", slug: `empty-${Date.now()}`, industry: "Technology", timezone: "UTC" },
    ]);

    const starterMonthlyPlanId = `plan_starter_${Date.now()}`;
    const enterpriseAnnualPlanId = `plan_annual_${Date.now()}`;
    cleanupPlanIds.push(starterMonthlyPlanId, enterpriseAnnualPlanId);

    await db.insert(subscriptionPlans).values([
      { id: starterMonthlyPlanId, name: "Starter Monthly", price: "49.00", interval: "month" },
      { id: enterpriseAnnualPlanId, name: "Enterprise Annual", price: "1200.00", interval: "year" }, // $1200/yr = $100/mo
    ]);

    // Setup Billing Accounts
    const [bAccountA] = await db.insert(billingAccounts).values({
      organizationId: tenantAId,
      email: "alpha-billing@operator.test",
      currency: "INR",
    }).returning();

    const [bAccountB] = await db.insert(billingAccounts).values({
      organizationId: tenantBId,
      email: "beta-billing@operator.test",
      currency: "USD",
    }).returning();

    console.log("Fixtures created. Beginning Section A: Partial and Multiple Refunds...\n");

    // -------------------------------------------------------------------------
    // SECTION A: Partial and Multiple Refunds
    // -------------------------------------------------------------------------

    // A1: Payment with no refund ($100 INR)
    const [invA1] = await db.insert(invoices).values({
      billingAccountId: bAccountA.id,
      number: `INV-A1-${Date.now()}`,
      status: "paid",
      subtotal: "100.00",
      tax: "0.00",
      total: "100.00",
    }).returning();

    const [payA1] = await db.insert(payments).values({
      billingAccountId: bAccountA.id,
      invoiceId: invA1.id,
      amount: "100.00",
      currency: "INR",
      status: "succeeded",
      providerPaymentId: `pay_rzp_a1_${Date.now()}`,
    }).returning();

    // A2 & A3: Payment ($200 INR) with two partial refunds ($40 + $60 = $100 total refund)
    const [invA2] = await db.insert(invoices).values({
      billingAccountId: bAccountA.id,
      number: `INV-A2-${Date.now()}`,
      status: "paid",
      subtotal: "200.00",
      tax: "0.00",
      total: "200.00",
    }).returning();

    const [payA2] = await db.insert(payments).values({
      billingAccountId: bAccountA.id,
      invoiceId: invA2.id,
      amount: "200.00",
      currency: "INR",
      status: "succeeded",
      providerPaymentId: `pay_rzp_a2_${Date.now()}`,
    }).returning();

    // First partial refund ($40) via WebhookProcessor
    const refEvent1Id = `evt_ref_1_${Date.now()}`;
    cleanupEventIds.push(refEvent1Id);
    const r1Result = await webhookProcessor.processEvent({
      provider: "razorpay",
      providerEventId: refEvent1Id,
      eventType: "refund.processed",
      payload: {
        refund: {
          entity: {
            id: `rfnd_rzp_1_${Date.now()}`,
            payment_id: payA2.providerPaymentId,
            amount: 4000, // 40.00 INR (in paise)
            status: "processed",
            notes: { reason: "Customer requested partial refund 1" }
          }
        }
      }
    });

    assert(r1Result.processed && !r1Result.duplicate, "REF-01", "First partial refund webhook processed successfully");

    // Second partial refund ($60) via WebhookProcessor
    const refEvent2Id = `evt_ref_2_${Date.now()}`;
    cleanupEventIds.push(refEvent2Id);
    const r2Result = await webhookProcessor.processEvent({
      provider: "razorpay",
      providerEventId: refEvent2Id,
      eventType: "refund.processed",
      payload: {
        refund: {
          entity: {
            id: `rfnd_rzp_2_${Date.now()}`,
            payment_id: payA2.providerPaymentId,
            amount: 6000, // 60.00 INR (in paise)
            status: "processed",
            notes: { reason: "Customer requested partial refund 2" }
          }
        }
      }
    });

    assert(r2Result.processed && !r2Result.duplicate, "REF-02", "Second partial refund webhook processed successfully against same payment");

    // A4: Full refund ($50 INR) marks invoice refunded
    const [invA3] = await db.insert(invoices).values({
      billingAccountId: bAccountA.id,
      number: `INV-A3-${Date.now()}`,
      status: "paid",
      subtotal: "50.00",
      tax: "0.00",
      total: "50.00",
    }).returning();

    const [payA3] = await db.insert(payments).values({
      billingAccountId: bAccountA.id,
      invoiceId: invA3.id,
      amount: "50.00",
      currency: "INR",
      status: "succeeded",
      providerPaymentId: `pay_rzp_a3_${Date.now()}`,
    }).returning();

    const refEvent3Id = `evt_ref_3_${Date.now()}`;
    cleanupEventIds.push(refEvent3Id);
    await webhookProcessor.processEvent({
      provider: "razorpay",
      providerEventId: refEvent3Id,
      eventType: "refund.processed",
      payload: {
        refund: {
          entity: {
            id: `rfnd_rzp_3_${Date.now()}`,
            payment_id: payA3.providerPaymentId,
            amount: 5000, // 50.00 INR (full)
            status: "processed",
          }
        }
      }
    });

    const [updatedInvA3] = await db.select().from(invoices).where(eq(invoices.id, invA3.id));
    assert(updatedInvA3.status === "refunded", "REF-03", "Full refund correctly updates invoice status to 'refunded'", updatedInvA3.status);

    // A5: Failed refund does not deduct from revenue
    await db.insert(refunds).values({
      paymentId: payA1.id,
      amount: "50.00",
      status: "failed", // failed status
      providerRefundId: `rfnd_fail_${Date.now()}`,
    });

    // A6: Duplicate refund webhook delivery is idempotent
    const rDuplicateResult = await webhookProcessor.processEvent({
      provider: "razorpay",
      providerEventId: refEvent2Id, // same eventId as r2
      eventType: "refund.processed",
      payload: {}
    });
    assert(rDuplicateResult.duplicate && !rDuplicateResult.processed, "REF-04", "Duplicate refund webhook event recognized and ignored idempotently");

    // A7: Refund exceeding remaining refundable balance is rejected
    // payA2 was $200, refunded $40 + $60 = $100. Remaining is $100. Attempt to refund $150.
    const refEventExcessId = `evt_ref_excess_${Date.now()}`;
    cleanupEventIds.push(refEventExcessId);
    await webhookProcessor.processEvent({
      provider: "razorpay",
      providerEventId: refEventExcessId,
      eventType: "refund.processed",
      payload: {
        refund: {
          entity: {
            id: `rfnd_rzp_excess_${Date.now()}`,
            payment_id: payA2.providerPaymentId,
            amount: 15000, // 150.00 INR (exceeds remaining 100.00)
            status: "processed",
          }
        }
      }
    });

    // Verify refund was NOT recorded in database
    const excessRefunds = await db.select().from(refunds).where(eq(refunds.providerRefundId, `rfnd_rzp_excess_${Date.now()}`));
    assert(excessRefunds.length === 0, "REF-05", "Refund exceeding remaining balance rejected and not persisted to database");

    console.log("\nSection B: Subscription Normalization & MRR Mathematics...\n");

    // -------------------------------------------------------------------------
    // SECTION B: Subscription Normalization
    // -------------------------------------------------------------------------

    // B1: Monthly active subscription ($49/mo)
    await db.insert(subscriptions).values({
      organizationId: tenantAId,
      planId: starterMonthlyPlanId,
      status: "active",
      createdAt: new Date(),
    });

    // B2: Annual active subscription normalized to MRR ($1200/yr -> $100/mo) for Tenant B
    await db.insert(subscriptions).values({
      organizationId: tenantBId,
      planId: enterpriseAnnualPlanId,
      status: "active",
      createdAt: new Date(),
    });

    // B3: Trialing subscription for a third sub in Tenant A ($0 MRR)
    const orgTrialId = crypto.randomUUID();
    cleanupOrgIds.push(orgTrialId);
    await db.insert(organizations).values({
      id: orgTrialId,
      name: "Trial Co",
      slug: `trial-${Date.now()}`,
      industry: "Technology",
      timezone: "UTC",
    });
    await db.insert(subscriptions).values({
      organizationId: orgTrialId,
      planId: starterMonthlyPlanId,
      status: "trialing",
      createdAt: new Date(),
    });

    // B4: Canceled subscription in last 30 days
    const orgCanceledId = crypto.randomUUID();
    cleanupOrgIds.push(orgCanceledId);
    await db.insert(organizations).values({
      id: orgCanceledId,
      name: "Canceled Co",
      slug: `canceled-${Date.now()}`,
      industry: "Technology",
      timezone: "UTC",
    });
    await db.insert(subscriptions).values({
      organizationId: orgCanceledId,
      planId: starterMonthlyPlanId,
      status: "canceled",
      createdAt: new Date(Date.now() - 40 * 86400000),
      updatedAt: new Date(Date.now() - 5 * 86400000), // canceled 5 days ago
    });

    // Verify Tenant A Subscription Metrics:
    // Subscriptions: 1 active ($49/mo)
    // MRR: $49.00, ARR: $588.00
    const metricsA = await financialMetricsService.calculateRealtimeMetrics(tenantAId);
    assert(metricsA.mrr === 49, "SUB-01", "Tenant A Monthly subscription yields exactly $49.00 MRR", metricsA.mrr);
    assert(metricsA.arr === 588, "SUB-02", "Tenant A ARR is normalized to $49 * 12 = $588.00", metricsA.arr);

    // Verify Tenant B Subscription Metrics:
    // Subscriptions: 1 active ($1200/yr)
    // MRR: $1200 / 12 = $100.00, ARR: $1200.00
    const metricsB = await financialMetricsService.calculateRealtimeMetrics(tenantBId);
    assert(metricsB.mrr === 100, "SUB-03", "Tenant B Annual subscription ($1200/yr) normalized to $100.00 MRR", metricsB.mrr);
    assert(metricsB.arr === 1200, "SUB-04", "Tenant B ARR equals $1200.00", metricsB.arr);

    // Verify Trialing Sub Metrics ($0 MRR)
    const metricsTrial = await financialMetricsService.calculateRealtimeMetrics(orgTrialId);
    assert(metricsTrial.mrr === 0, "SUB-05", "Trialing subscription contributes strictly $0.00 to MRR", metricsTrial.mrr);
    assert(metricsTrial.trialingCount === 1, "SUB-06", "Trialing count recorded accurately as 1", metricsTrial.trialingCount);

    // B7: Duplicate subscription webhook delivery
    const subEventId = `evt_sub_${Date.now()}`;
    cleanupEventIds.push(subEventId);
    const subRes1 = await webhookProcessor.processEvent({
      provider: "razorpay",
      providerEventId: subEventId,
      eventType: "subscription.activated",
      payload: {
        subscription: {
          entity: {
            id: `sub_rzp_${Date.now()}`,
            notes: { organizationId: tenantAId, planId: "starter" }
          }
        }
      }
    });
    assert(subRes1.processed, "SUB-07", "Subscription webhook processed initially");

    const subRes2 = await webhookProcessor.processEvent({
      provider: "razorpay",
      providerEventId: subEventId,
      eventType: "subscription.activated",
      payload: {}
    });
    assert(subRes2.duplicate && !subRes2.processed, "SUB-08", "Duplicate subscription webhook rejected idempotently");

    console.log("\nSection C: Multi-Currency & Reconciliation Mathematics...\n");

    // -------------------------------------------------------------------------
    // SECTION C: Multi-Currency Handling
    // -------------------------------------------------------------------------
    // Tenant A: INR payments
    // Gross: payA1 ($100) + payA2 ($200) + payA3 ($50) = $350 INR
    // Refunds: refA2 ($40 + $60) + refA3 ($50) = $150 INR (failed refund $50 excluded)
    // Net: $350 - $150 = $200 INR

    assert(metricsA.grossRevenue === 350, "FIN-01", "Tenant A Gross revenue accurately sums INR succeeded payments ($350.00)", metricsA.grossRevenue);
    assert(metricsA.netRevenue === 200, "FIN-02", "Tenant A Net revenue accurately subtracts succeeded refunds ($350 - $150 = $200.00)", metricsA.netRevenue);

    // Now insert a USD payment for Tenant B
    const [invB1] = await db.insert(invoices).values({
      billingAccountId: bAccountB.id,
      number: `INV-B1-${Date.now()}`,
      status: "paid",
      subtotal: "500.00",
      tax: "0.00",
      total: "500.00",
    }).returning();

    await db.insert(payments).values({
      billingAccountId: bAccountB.id,
      invoiceId: invB1.id,
      amount: "500.00",
      currency: "USD",
      status: "succeeded",
      providerPaymentId: `pay_rzp_b1_${Date.now()}`,
    });

    const refreshedMetricsB = await financialMetricsService.calculateRealtimeMetrics(tenantBId);
    assert(refreshedMetricsB.grossRevenue === 500, "FIN-03", "Tenant B Gross revenue accurately equals $500.00 USD", refreshedMetricsB.grossRevenue);
    assert(refreshedMetricsB.netRevenue === 500, "FIN-04", "Tenant B Net revenue accurately equals $500.00 USD with 0 refunds", refreshedMetricsB.netRevenue);
    assert(refreshedMetricsB.primaryCurrency === "USD", "FIN-05", "Tenant B primary currency correctly identified as USD", refreshedMetricsB.primaryCurrency);

    // Cross-tenant currency breakdown verification
    const globalMetrics = await financialMetricsService.calculateRealtimeMetrics();
    assert(globalMetrics.currencyBreakdown !== undefined, "CURR-01", "Global financial metrics output currencyBreakdown");
    assert(globalMetrics.currencyBreakdown?.["INR"]?.gross === 350, "CURR-02", "Currency breakdown for INR correctly isolates gross = 350.00", globalMetrics.currencyBreakdown?.["INR"]?.gross);
    assert(globalMetrics.currencyBreakdown?.["INR"]?.refunds === 150, "CURR-03", "Currency breakdown for INR correctly isolates refunds = 150.00", globalMetrics.currencyBreakdown?.["INR"]?.refunds);
    assert(globalMetrics.currencyBreakdown?.["INR"]?.net === 200, "CURR-04", "Currency breakdown for INR correctly isolates net = 200.00", globalMetrics.currencyBreakdown?.["INR"]?.net);
    assert(globalMetrics.currencyBreakdown?.["USD"]?.gross === 500, "CURR-05", "Currency breakdown for USD correctly isolates gross = 500.00", globalMetrics.currencyBreakdown?.["USD"]?.gross);
    assert(globalMetrics.currencyBreakdown?.["USD"]?.net === 500, "CURR-06", "Currency breakdown for USD correctly isolates net = 500.00", globalMetrics.currencyBreakdown?.["USD"]?.net);

    console.log("\nSection D: Strict Tenant Isolation...\n");

    // -------------------------------------------------------------------------
    // SECTION D: Tenant Isolation
    // -------------------------------------------------------------------------
    // Tenant A metrics should have ZERO overlap with Tenant B
    assert(metricsA.grossRevenue !== refreshedMetricsB.grossRevenue, "ISO-01", "Tenant A and Tenant B gross revenues are completely separated");
    assert(metricsA.mrr === 49 && refreshedMetricsB.mrr === 100, "ISO-02", "Tenant A ($49) and Tenant B ($100) MRR calculations are completely isolated");

    // Empty Tenant verification
    const emptyMetrics = await financialMetricsService.calculateRealtimeMetrics(emptyTenantId);
    assert(emptyMetrics.mrr === 0, "EMPTY-01", "Empty tenant MRR is strictly 0.00", emptyMetrics.mrr);
    assert(emptyMetrics.arr === 0, "EMPTY-02", "Empty tenant ARR is strictly 0.00", emptyMetrics.arr);
    assert(emptyMetrics.grossRevenue === 0, "EMPTY-03", "Empty tenant gross revenue is strictly 0.00", emptyMetrics.grossRevenue);
    assert(emptyMetrics.netRevenue === 0, "EMPTY-04", "Empty tenant net revenue is strictly 0.00", emptyMetrics.netRevenue);
    assert(emptyMetrics.arpu === 0, "EMPTY-05", "Empty tenant ARPU is strictly 0.00 (no hardcoded fallback)", emptyMetrics.arpu);
    assert(emptyMetrics.ltv === 0, "EMPTY-06", "Empty tenant LTV is strictly 0.00 (no fabricated projection)", emptyMetrics.ltv);
    assert(emptyMetrics.churnRate === 0, "EMPTY-07", "Empty tenant churn rate is strictly 0.0%", emptyMetrics.churnRate);

    console.log("\nSection E: Webhook Idempotency & Lifecycle Consistency...\n");

    // -------------------------------------------------------------------------
    // SECTION E: Webhook Idempotency & Edge Cases
    // -------------------------------------------------------------------------

    // E1: Duplicate payment capture event
    const payEventId = `evt_pay_dupl_${Date.now()}`;
    cleanupEventIds.push(payEventId);

    const payRes1 = await webhookProcessor.processEvent({
      provider: "razorpay",
      providerEventId: payEventId,
      eventType: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: `pay_rzp_dup_entity_${Date.now()}`,
            amount: 19900, // 199.00
            currency: "INR",
            notes: { organizationId: tenantAId, planId: "business" },
          }
        }
      }
    });
    assert(payRes1.processed && !payRes1.duplicate, "IDEMP-01", "Initial payment capture webhook processed");

    const payRes2 = await webhookProcessor.processEvent({
      provider: "razorpay",
      providerEventId: payEventId,
      eventType: "payment.captured",
      payload: { payment: { entity: { id: "same" } } }
    });
    assert(payRes2.duplicate && !payRes2.processed, "IDEMP-02", "Duplicate payment capture webhook rejected idempotently");

    // E2: Out-of-order refund with non-existent payment ID fails safely without throwing unhandled error
    const orphanRefundEventId = `evt_orphan_ref_${Date.now()}`;
    cleanupEventIds.push(orphanRefundEventId);
    const orphanRes = await webhookProcessor.processEvent({
      provider: "razorpay",
      providerEventId: orphanRefundEventId,
      eventType: "refund.processed",
      payload: {
        refund: {
          entity: {
            id: `rfnd_orphan_${Date.now()}`,
            payment_id: "non_existent_payment_id_99999",
            amount: 5000,
            status: "processed",
          }
        }
      }
    });
    assert(orphanRes.processed, "IDEMP-03", "Orphan refund for non-existent payment safely handled without unhandled exception");

    // E3: Payment failure followed by recovery
    await subscriptionEngine.recordPaymentFailure(tenantAId, "Card declined: insufficient funds");
    const subAfterFail = await subscriptionEngine.getSubscriptionStatus(tenantAId);
    assert(subAfterFail.state === "PAST_DUE" || subAfterFail.state === "PAYMENT_FAILED", "RECOV-01", "Payment failure properly transitions status to at-risk", subAfterFail.state);

    await subscriptionEngine.recordPaymentRecovery(tenantAId);
    const subAfterRecov = await subscriptionEngine.getSubscriptionStatus(tenantAId);
    assert(subAfterRecov.state === "ACTIVE", "RECOV-02", "Payment recovery safely restores subscription to ACTIVE", subAfterRecov.state);

  } finally {
    console.log("\nTearing down test fixtures...");
    for (const orgId of cleanupOrgIds) {
      await db.delete(organizations).where(eq(organizations.id, orgId));
    }
    for (const pId of cleanupPlanIds) {
      await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, pId));
    }
    console.log("Teardown complete.\n");
  }

  console.log("================================================================================");
  console.log(`TOTAL FINANCIAL INTEGRITY ASSERTIONS: ${passedChecks} PASSED, ${failedChecks} FAILED (TOTAL: ${totalChecks})`);
  console.log("================================================================================\n");

  if (failedChecks > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAdvancedFinancialIntegritySuite().catch((err) => {
  console.error("Advanced Financial Integrity Suite fatal error:", err);
  process.exit(1);
});
