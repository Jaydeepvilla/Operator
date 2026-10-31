import { test, expect } from '@playwright/test';
import { db } from '../src/server/db';
import { subscriptions, organizations, auditLogs, backgroundJobs, billingAccounts, subscriptionPlans } from '../src/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';
import Stripe from 'stripe';
import { getLocalizedPlan, getCurrencyForCountry, REGIONAL_PRICING } from '../src/lib/billing/plans';
import { billingReconciliationService } from '../src/server/services/billing/reconciliation';
import { POST as stripeWebhookPost } from '../src/app/api/webhooks/billing/stripe/route';
import { POST as razorpayWebhookPost } from '../src/app/api/webhooks/billing/razorpay/route';
import { GET as billingReconciliationCron } from '../src/app/api/cron/billing-reconciliation/route';
import { worker } from '../src/server/services/jobs/worker';

test.describe('Operator Phase 8 — Staging Webhooks, Currency Integrity & Billing Reconciliation Suite', () => {
  const testOrgId = '11111111-1111-1111-1111-111111111111';
  const tenantTwoId = '22222222-2222-2222-2222-222222222222';

  test.beforeAll(async () => {
    // Ensure test organizations exist
    await db
      .insert(organizations)
      .values([
        {
          id: testOrgId,
          name: 'Primary Test Organization',
          slug: 'test-org-primary',
          industry: 'healthcare',
          timezone: 'America/New_York',
        },
        {
          id: tenantTwoId,
          name: 'Secondary Test Organization',
          slug: 'test-org-secondary',
          industry: 'technology',
          timezone: 'Asia/Kolkata',
        },
      ])
      .onConflictDoNothing();

    // Ensure catalog subscription plans exist
    await db
      .insert(subscriptionPlans)
      .values([
        {
          id: 'starter',
          name: 'Starter',
          description: 'Answer website and WhatsApp enquiries and book appointments automatically.',
          price: '79',
          interval: 'month',
        },
        {
          id: 'professional',
          name: 'Pro',
          description: 'Everything in Starter, plus an AI phone receptionist, missed-call text-back, reminders and deposits.',
          price: '199',
          interval: 'month',
        },
        {
          id: 'business',
          name: 'Business',
          description: 'Everything in Pro for up to 5 locations, with integrations, custom call routing and onboarding help.',
          price: '399',
          interval: 'month',
        },
      ])
      .onConflictDoNothing();
  });

  // =========================================================================
  // SECTION 1: COUNTRY-AWARE PRICING & CHECKOUT CURRENCY INTEGRITY
  // =========================================================================

  test('Pricing A — Country-to-Currency Resolution: Maps countries to regional currencies', async () => {
    expect(getCurrencyForCountry('IN')).toBe('INR');
    expect(getCurrencyForCountry('GB')).toBe('GBP');
    expect(getCurrencyForCountry('UK')).toBe('GBP');
    expect(getCurrencyForCountry('DE')).toBe('EUR');
    expect(getCurrencyForCountry('FR')).toBe('EUR');
    expect(getCurrencyForCountry('US')).toBe('USD');
    expect(getCurrencyForCountry(null)).toBe('USD');
    expect(getCurrencyForCountry('')).toBe('USD');
  });

  test('Pricing B — Authoritative Regional Rates: Enforces currency-specific prices without client tampering', async () => {
    const starterUsd = getLocalizedPlan('starter', 'USD');
    expect(starterUsd.currency).toBe('USD');
    expect(starterUsd.price).toBe(79);
    expect(starterUsd.yearlyPrice).toBe(66);

    const starterInr = getLocalizedPlan('starter', 'INR');
    expect(starterInr.currency).toBe('INR');
    expect(starterInr.price).toBe(2499);
    expect(starterInr.yearlyPrice).toBe(2083);

    const proEur = getLocalizedPlan('professional', 'EUR');
    expect(proEur.currency).toBe('EUR');
    expect(proEur.price).toBe(189);

    const bizGbp = getLocalizedPlan('business', 'GBP');
    expect(bizGbp.currency).toBe('GBP');
    expect(bizGbp.price).toBe(299);
  });

  // =========================================================================
  // SECTION 2: TASK D — STAGING WEBHOOK CONFIGURATION & SIGNATURE INTEGRITY
  // =========================================================================

  test('Webhooks A — Stripe Webhook: Rejects unsigned or forged requests', async () => {
    // 1. Missing signature header
    const reqNoSig = new Request('http://localhost:3000/api/webhooks/billing/stripe', {
      method: 'POST',
      body: JSON.stringify({ id: 'evt_test', type: 'invoice.paid' }),
    });
    const resNoSig = await stripeWebhookPost(reqNoSig);
    expect([400, 503]).toContain(resNoSig.status);

    // 2. Forged signature
    const reqForged = new Request('http://localhost:3000/api/webhooks/billing/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 't=12345,v1=bad_signature_000000000000000000000000',
      },
      body: JSON.stringify({ id: 'evt_test', type: 'invoice.paid' }),
    });
    const resForged = await stripeWebhookPost(reqForged);
    expect([400, 503]).toContain(resForged.status);
  });

  test('Webhooks B — Razorpay Webhook: Rejects unsigned or forged HMAC signatures', async () => {
    // 1. Missing header
    const reqNoSig = new Request('http://localhost:3000/api/webhooks/billing/razorpay', {
      method: 'POST',
      body: JSON.stringify({ event: 'order.paid' }),
    });
    const resNoSig = await razorpayWebhookPost(reqNoSig);
    expect(resNoSig.status).toBe(400);

    // 2. Invalid signature
    const reqForged = new Request('http://localhost:3000/api/webhooks/billing/razorpay', {
      method: 'POST',
      headers: {
        'x-razorpay-signature': 'forged_razorpay_hmac_signature',
      },
      body: JSON.stringify({ event: 'order.paid' }),
    });
    const resForged = await razorpayWebhookPost(reqForged);
    expect(resForged.status).toBe(400);
  });

  // =========================================================================
  // SECTION 3: TASK E — DAILY BILLING RECONCILIATION WORKFLOW
  // =========================================================================

  async function createTestOrg(slugPrefix = 'test-org') {
    const id = crypto.randomUUID();
    await db.insert(organizations).values({
      id,
      name: `Test Org ${id.slice(0, 8)}`,
      slug: `${slugPrefix}-${id.slice(0, 8)}`,
      industry: 'technology',
      timezone: 'America/New_York',
    });
    return id;
  }

  test('Reconciliation A — Stripe Discrepancy Correction: Corrects local active sub when Stripe is canceled', async () => {
    const orgId = await createTestOrg('recon-stripe');
    const subId = crypto.randomUUID();
    const stripeSubId = `sub_test_stripe_${crypto.randomUUID().slice(0, 8)}`;

    // 1. Seed local subscription as 'active'
    await db.insert(subscriptions).values({
      id: subId,
      organizationId: orgId,
      planId: 'professional',
      status: 'active',
      stripeSubscriptionId: stripeSubId,
      cancelAtPeriodEnd: false,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // 2. Mock Stripe client returning 'canceled'
    const mockStripe = {
      subscriptions: {
        retrieve: async (id: string) => {
          if (id === stripeSubId) {
            return {
              id: stripeSubId,
              status: 'canceled',
              canceled_at: Math.floor(Date.now() / 1000),
              cancel_at_period_end: false,
            };
          }
          throw { statusCode: 404, message: 'Not found' };
        },
      },
    };

    // 3. Execute reconciliation
    const report = await billingReconciliationService.runDailyReconciliation({
      batchSize: 10,
      stripeClient: mockStripe,
    });

    expect(report.scanned).toBeGreaterThanOrEqual(1);
    expect(report.discrepancies).toBeGreaterThanOrEqual(1);
    expect(report.corrected).toBeGreaterThanOrEqual(1);

    // 4. Verify local subscription transitioned to 'canceled'
    const [updatedSub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subId))
      .limit(1);

    expect(updatedSub.status).toBe('canceled');
    expect(updatedSub.canceledAt).toBeDefined();

    // 5. Verify audit log entry was created
    const [auditEntry] = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.organizationId, orgId),
          eq(auditLogs.action, 'reconciliation_status_corrected')
        )
      )
      .limit(1);

    expect(auditEntry).toBeDefined();
    expect((auditEntry.metadata as any).newStatus).toBe('canceled');
  });

  test('Reconciliation B — Razorpay Discrepancy Correction: Corrects local active sub when Razorpay is cancelled', async () => {
    const orgId = await createTestOrg('recon-rzp');
    const subId = crypto.randomUUID();
    const rzpSubId = `sub_test_rzp_${crypto.randomUUID().slice(0, 8)}`;

    // 1. Seed local subscription as 'active'
    await db.insert(subscriptions).values({
      id: subId,
      organizationId: orgId,
      planId: 'starter',
      status: 'active',
      razorpaySubscriptionId: rzpSubId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // 2. Mock Razorpay fetcher returning 'cancelled'
    const mockRazorpayFetcher = async (id: string) => {
      if (id === rzpSubId) {
        return {
          id: rzpSubId,
          status: 'cancelled',
          ended_at: Math.floor(Date.now() / 1000),
        };
      }
      throw { status: 404, message: 'Not found' };
    };

    // 3. Execute reconciliation
    const report = await billingReconciliationService.runDailyReconciliation({
      batchSize: 10,
      razorpayFetcher: mockRazorpayFetcher,
      stripeClient: { subscriptions: { retrieve: async () => ({ status: 'active' }) } },
    });

    expect(report.scanned).toBeGreaterThanOrEqual(1);
    expect(report.discrepancies).toBeGreaterThanOrEqual(1);
    expect(report.corrected).toBeGreaterThanOrEqual(1);

    // 4. Verify local state
    const [updatedSub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subId))
      .limit(1);

    expect(updatedSub.status).toBe('canceled');
  });

  test('Reconciliation C — Provider Outage Isolation: Stripe failure does NOT block Razorpay reconciliation', async () => {
    const orgId = await createTestOrg('recon-outage');
    const subId = crypto.randomUUID();
    const rzpSubId = `sub_test_rzp_iso_${crypto.randomUUID().slice(0, 8)}`;

    await db.insert(subscriptions).values({
      id: subId,
      organizationId: orgId,
      planId: 'starter',
      status: 'active',
      razorpaySubscriptionId: rzpSubId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 1000),
    });

    // Stripe throws total provider 500 error
    const faultyStripe = {
      subscriptions: {
        retrieve: async () => {
          throw new Error('Stripe API unavailable: HTTP 503 gateway outage');
        },
      },
    };

    // Razorpay returns valid cancelled state
    const workingRazorpayFetcher = async () => ({
      id: rzpSubId,
      status: 'cancelled',
      ended_at: Math.floor(Date.now() / 1000),
    });

    const report = await billingReconciliationService.runDailyReconciliation({
      batchSize: 10,
      stripeClient: faultyStripe,
      razorpayFetcher: workingRazorpayFetcher,
    });

    // Razorpay must still have corrected the discrepancy despite Stripe failure
    const [updatedSub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subId))
      .limit(1);

    expect(updatedSub.status).toBe('canceled');
  });

  test('Reconciliation D — Rate-Limit Protection: 429 does NOT downgrade active subscriptions', async () => {
    const orgId = await createTestOrg('recon-ratelimit');
    const subId = crypto.randomUUID();
    const stripeSubId = `sub_rate_limit_${crypto.randomUUID().slice(0, 8)}`;

    await db.insert(subscriptions).values({
      id: subId,
      organizationId: orgId,
      planId: 'professional',
      status: 'active',
      stripeSubscriptionId: stripeSubId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 1000),
    });

    const rateLimitedStripe = {
      subscriptions: {
        retrieve: async () => {
          throw { statusCode: 429, message: 'Too Many Requests' };
        },
      },
    };

    const report = await billingReconciliationService.runDailyReconciliation({
      batchSize: 10,
      stripeClient: rateLimitedStripe,
    });

    // Must NOT modify local subscription
    const [subAfter] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subId))
      .limit(1);

    expect(subAfter.status).toBe('active');
    expect(report.providerErrors.some((e) => e.error.includes('rate limit'))).toBe(true);
  });

  test('Reconciliation E — Unresolved Discrepancy Logging: 404 logs audit entry without destructive deletion', async () => {
    const orgId = await createTestOrg('recon-404');
    const subId = crypto.randomUUID();
    const missingSubId = `sub_missing_404_${crypto.randomUUID().slice(0, 8)}`;

    await db.insert(subscriptions).values({
      id: subId,
      organizationId: orgId,
      planId: 'starter',
      status: 'active',
      stripeSubscriptionId: missingSubId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 1000),
    });

    const notFoundStripe = {
      subscriptions: {
        retrieve: async () => {
          throw { statusCode: 404, code: 'resource_missing', message: 'No such subscription' };
        },
      },
    };

    const report = await billingReconciliationService.runDailyReconciliation({
      batchSize: 10,
      stripeClient: notFoundStripe,
    });

    expect(report.unresolved).toBeGreaterThanOrEqual(1);

    // Subscription must still exist (not deleted)
    const [subStillExists] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subId))
      .limit(1);

    expect(subStillExists).toBeDefined();

    // Verify unresolved discrepancy audit log
    const [auditEntry] = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.organizationId, orgId),
          eq(auditLogs.action, 'reconciliation_unresolved_discrepancy')
        )
      )
      .limit(1);

    expect(auditEntry).toBeDefined();
  });

  test('Reconciliation F — Scheduled Cron Route Auth: Reject unauthorized invocations', async () => {
    // 1. Missing Authorization header
    const reqNoAuth = new Request('http://localhost:3000/api/cron/billing-reconciliation');
    const respNoAuth = await billingReconciliationCron(reqNoAuth);
    expect([401, 500]).toContain(respNoAuth.status);

    // 2. Bad token
    const reqBadAuth = new Request('http://localhost:3000/api/cron/billing-reconciliation', {
      headers: { Authorization: 'Bearer invalid_forged_secret_xyz' },
    });
    const respBadAuth = await billingReconciliationCron(reqBadAuth);
    expect([401, 500]).toContain(respBadAuth.status);
  });

  test('Reconciliation G — Tenant Isolation: Corrections never mutate unrelated organizations', async () => {
    const org1Id = await createTestOrg('recon-tenant-1');
    const org2Id = await createTestOrg('recon-tenant-2');
    const org1SubId = crypto.randomUUID();
    const org2SubId = crypto.randomUUID();
    const stripeSubId = `sub_tenant_iso_${crypto.randomUUID().slice(0, 8)}`;

    // Org 1 has the targeted stripe subscription
    await db.insert(subscriptions).values({
      id: org1SubId,
      organizationId: org1Id,
      planId: 'professional',
      status: 'active',
      stripeSubscriptionId: stripeSubId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 1000),
    });

    // Org 2 has a separate subscription with different stripe ID
    await db.insert(subscriptions).values({
      id: org2SubId,
      organizationId: org2Id,
      planId: 'starter',
      status: 'active',
      stripeSubscriptionId: `sub_org2_unrelated_${crypto.randomUUID().slice(0, 8)}`,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 1000),
    });

    // Reconcile with mock targeting org1's sub
    const mockStripe = {
      subscriptions: {
        retrieve: async (id: string) => {
          if (id === stripeSubId) {
            return { id: stripeSubId, status: 'canceled', canceled_at: Math.floor(Date.now() / 1000) };
          }
          return { id, status: 'active' };
        },
      },
    };

    await billingReconciliationService.runDailyReconciliation({
      batchSize: 10,
      stripeClient: mockStripe,
    });

    // Org 1 is canceled
    const [sub1] = await db.select().from(subscriptions).where(eq(subscriptions.id, org1SubId));
    expect(sub1.status).toBe('canceled');

    // Org 2 MUST REMAIN ACTIVE (isolated)
    const [sub2] = await db.select().from(subscriptions).where(eq(subscriptions.id, org2SubId));
    expect(sub2.status).toBe('active');
  });
});
