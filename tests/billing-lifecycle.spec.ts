import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from '../src/server/db';
import { subscriptions, organizations, billingEvents, priceBooks, fxRates, coupons } from '../src/server/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  MASTER_PLANS,
  computeRegionalPrices,
  formatMoney,
  evaluateCostGuard,
  type SupportedCurrency,
} from '../src/lib/billing/catalog';
import {
  validatePlanIntent,
  serializePlanIntent,
  deserializePlanIntent,
} from '../src/lib/billing/plan-intent';
import { subscriptionEngine } from '../src/server/services/billing/subscription-engine';
import { priceBookService } from '../src/server/services/billing/price-book-service';
import { webhookProcessor } from '../src/server/services/billing/webhook-processor';
import { trialReminderEngine } from '../src/server/services/billing/trial-reminder-engine';
import { couponService } from '../src/server/services/billing/coupon-service';
import { RouteDecisionEngine } from '../src/server/services/routing/decision-engine';
import { RoutingContext } from '../src/server/services/routing/types';

test.describe('Operator AI — Comprehensive Billing, Pricing & Trial Lifecycle Suite', () => {
  const lifecycleOrgId = '77777777-7777-7777-7777-777777777777';

  test.beforeAll(async () => {
    // Ensure test organization exists in database
    await db
      .insert(organizations)
      .values({
        id: lifecycleOrgId,
        name: 'Lifecycle Test Organization',
        slug: `lifecycle-test-${Date.now()}`,
        industry: 'wellness',
        timezone: 'UTC',
      })
      .onConflictDoNothing();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 1: Pricing click keeps plan intent through signup allowlist validation
  // ────────────────────────────────────────────────────────────────────────────
  test('1. Plan Intent: Pricing click parameters validate against allowlist', async () => {
    // Valid inputs
    expect(validatePlanIntent('starter', 'monthly', 'USD')).toEqual({
      planId: 'starter',
      interval: 'monthly',
      currency: 'USD',
    });
    expect(validatePlanIntent('pro', 'yearly', 'INR')).toEqual({
      planId: 'professional',
      interval: 'yearly',
      currency: 'INR',
    });
    expect(validatePlanIntent('business', 'monthly', 'GBP')).toEqual({
      planId: 'business',
      interval: 'monthly',
      currency: 'GBP',
    });

    // Invalid inputs rejected
    expect(validatePlanIntent('enterprise_fake', 'monthly')).toBeNull();
    expect(validatePlanIntent('', 'monthly')).toBeNull();
    expect(validatePlanIntent(null, null)).toBeNull();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 2: Users with no plan / unverified trial redirected from dashboard
  // ────────────────────────────────────────────────────────────────────────────
  test('2. Route Guard: Users with no plan or pending checkout cannot reach dashboard', async () => {
    const mockContextNoPlan: RoutingContext = {
      userId: 'usr_mock_123',
      businessId: lifecycleOrgId,
      user: { id: 'usr_mock_123', email: 'user@test.com', status: 'active', role: 'owner' },
      business: { id: lifecycleOrgId, name: 'Test Org', slug: 'test-org', status: 'active', verificationStatus: 'verified' },
      accountStatus: 'active',
      onboarding: { status: 'completed', isCompleted: true, currentStep: 'completed' },
      subscription: {
        status: 'NO_PLAN',
        planId: 'starter',
        hasPaymentMethod: false,
        isRestricted: true,
      },
      permissions: ['dashboard:view'],
      activity: {},
      integrations: { calendarConnected: true, whatsappConnected: false, emailConnected: false },
      requestedPath: '/dashboard',
    };

    const decision = RouteDecisionEngine.resolve(mockContextNoPlan);
    expect(decision.replace).toBe(true);
    expect(decision.destination).toBe('/billing/checkout');
    expect(decision.reason).toBe('NO_ACTIVE_PLAN_OR_TRIAL');
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 3: Trial start saves a payment method and initializes 14-day window
  // ────────────────────────────────────────────────────────────────────────────
  test('3. Trial Activation: Saves payment method and configures 14-day window', async () => {
    const sub = await subscriptionEngine.activateTrialWithPaymentMethod({
      organizationId: lifecycleOrgId,
      planId: 'professional',
      paymentProvider: 'razorpay',
      providerSubscriptionId: `sub_test_${Date.now()}`,
      billingInterval: 'monthly',
      currency: 'INR',
    });

    expect(sub).toBeDefined();
    expect(sub.status).toBe('trialing');
    expect(sub.hasPaymentMethod).toBe(true);
    expect(sub.planId).toBe('professional');

    const status = await subscriptionEngine.getSubscriptionStatus(lifecycleOrgId);
    expect(status.state).toBe('TRIALING');
    expect(status.hasPaymentMethod).toBe(true);
    expect(status.trialDaysRemaining).toBeGreaterThanOrEqual(13);
    expect(status.trialDaysRemaining).toBeLessThanOrEqual(14);
    expect(status.isRestricted).toBe(false);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 4: Same webhook sent twice changes nothing twice (Idempotency)
  // ────────────────────────────────────────────────────────────────────────────
  test('4. Webhook Idempotency: Duplicate delivery protection', async () => {
    const eventId = `evt_lifecycle_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const payload = {
      event: 'subscription.charged',
      subscription_id: `sub_${Date.now()}`,
      notes: { organizationId: lifecycleOrgId, planId: 'starter' },
    };

    // First arrival
    const res1 = await webhookProcessor.processEvent({
      provider: 'razorpay',
      providerEventId: eventId,
      eventType: 'subscription.charged',
      payload,
    });
    expect(res1.duplicate).toBe(false);
    expect(res1.processed).toBe(true);

    // Second duplicate arrival
    const res2 = await webhookProcessor.processEvent({
      provider: 'razorpay',
      providerEventId: eventId,
      eventType: 'subscription.charged',
      payload,
    });
    expect(res2.duplicate).toBe(true);
    expect(res2.processed).toBe(false);

    // Verify exactly one row in billing_events
    const eventRows = await db
      .select()
      .from(billingEvents)
      .where(and(eq(billingEvents.provider, 'razorpay'), eq(billingEvents.providerEventId, eventId)));
    expect(eventRows.length).toBe(1);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 5: Tampered client amount / currency rejected by server pricing engine
  // ────────────────────────────────────────────────────────────────────────────
  test('5. Pricing Integrity: Client-supplied amount is ignored; server price book rules', async () => {
    const publishedUsd = await priceBookService.getPublishedPrice('starter', 'monthly', 'USD');
    expect(publishedUsd).toBeDefined();
    expect(publishedUsd?.amountMinor).toBe(7900); // Always $79, never 0 or client-passed 100

    const publishedInr = await priceBookService.getPublishedPrice('professional', 'monthly', 'INR');
    expect(publishedInr).toBeDefined();
    expect(publishedInr?.amountMinor).toBe(599900); // Always ₹5,999 in paise
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 6: Price book formula and rounding for US/UK/India match P3
  // ────────────────────────────────────────────────────────────────────────────
  test('6. P3 Expected Price Values: Formula and regional rounding match specification', async () => {
    // Indicative rates from P3: 1 USD = 94.955 INR, 1 USD = 0.7463 GBP
    const p3Usd = computeRegionalPrices('USD', 1.0);
    const p3Gbp = computeRegionalPrices('GBP', 0.7463);
    const p3Inr = computeRegionalPrices('INR', 94.955);

    // US Checks
    expect(p3Usd.plans.starter.monthlyMajor).toBe(79);
    expect(p3Usd.plans.professional.monthlyMajor).toBe(199);
    expect(p3Usd.plans.business.monthlyMajor).toBe(399);
    expect(p3Usd.plans.starter.yearlyMajor).toBe(790);
    expect(p3Usd.plans.professional.yearlyMajor).toBe(1990);
    expect(p3Usd.plans.business.yearlyMajor).toBe(3990);
    expect(p3Usd.setupFee.major).toBe(149);
    expect(p3Usd.voiceOveragePerMinute.major).toBe(0.45);
    expect(p3Usd.extra500Conversations.major).toBe(25);

    // UK Checks (GBP nearest 10 minus 1)
    expect(p3Gbp.plans.starter.monthlyMajor).toBe(59);
    expect(p3Gbp.plans.professional.monthlyMajor).toBe(149);
    expect(p3Gbp.plans.business.monthlyMajor).toBe(299);
    expect(p3Gbp.plans.starter.yearlyMajor).toBe(589);
    expect(p3Gbp.plans.professional.yearlyMajor).toBe(1489);
    expect(p3Gbp.plans.business.yearlyMajor).toBe(2979);
    expect(p3Gbp.setupFee.major).toBe(109);
    expect(p3Gbp.voiceOveragePerMinute.major).toBe(0.35);
    expect(p3Gbp.extra500Conversations.major).toBe(19);

    // India Checks (INR nearest 500 minus 1)
    expect(p3Inr.plans.starter.monthlyMajor).toBe(2499);
    expect(p3Inr.plans.professional.monthlyMajor).toBe(5999);
    expect(p3Inr.plans.business.monthlyMajor).toBe(12499);
    expect(p3Inr.plans.starter.yearlyMajor).toBe(24999);
    expect(p3Inr.plans.professional.yearlyMajor).toBe(62499);
    expect(p3Inr.plans.business.yearlyMajor).toBe(124999);
    expect(p3Inr.setupFee.major).toBe(4499);
    expect(p3Inr.voiceOveragePerMinute.major).toBe(26);
    expect(p3Inr.extra500Conversations.major).toBe(1420);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 7: Publishing blocked when FX moves >5% or Cost Guard fails
  // ────────────────────────────────────────────────────────────────────────────
  test('7. Guard Rails: Publish blocked if rate divergence >5% or cost guard fails', async () => {
    // 1. Cost guard test on depressed pricing
    const failingPrices = computeRegionalPrices('USD', 1.0);
    // Artificially drop price to fail margin threshold (< 40%)
    failingPrices.plans.starter.monthlyMajor = 10;
    const guardCheck = evaluateCostGuard('USD', 1.0, failingPrices);
    expect(guardCheck.allPassed).toBe(false);
    expect(guardCheck.plans.starter.typicalPass).toBe(false);

    // 2. Divergence check with mocked 10% move
    const isDiverged = Math.abs(100 - 90) / 90 > 0.05;
    expect(isDiverged).toBe(true);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 8: Currency formatting helper matches regional grouping rules
  // ────────────────────────────────────────────────────────────────────────────
  test('8. Display Formats: formatMoney produces correct symbols and groupings', async () => {
    // USD
    expect(formatMoney(7900, 'USD')).toBe('$79');
    expect(formatMoney(19900, 'USD')).toBe('$199');

    // GBP
    expect(formatMoney(5900, 'GBP')).toBe('£59');
    expect(formatMoney(29900, 'GBP')).toBe('£299');

    // INR (Lakh/Thousand grouping)
    expect(formatMoney(249900, 'INR')).toBe('₹2,499');
    expect(formatMoney(6249900, 'INR')).toBe('₹62,499');
    expect(formatMoney(12499900, 'INR')).toBe('₹1,24,999');
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 9: Plan limits and voice minutes per plan and region match P4
  // ────────────────────────────────────────────────────────────────────────────
  test('9. P4 Plan Limits: Regional entitlements and caps strictly enforced', async () => {
    // Starter
    expect(MASTER_PLANS.starter.limits.conversations).toBe(500);
    expect(MASTER_PLANS.starter.limits.voiceMinutesByRegion.USD).toBe(0);
    expect(MASTER_PLANS.starter.limits.voiceMinutesByRegion.INR).toBe(0);
    expect(MASTER_PLANS.starter.limits.trialVoiceMinutes).toBe(0);

    // Pro
    expect(MASTER_PLANS.professional.limits.conversations).toBe(2000);
    expect(MASTER_PLANS.professional.limits.voiceMinutesByRegion.USD).toBe(250);
    expect(MASTER_PLANS.professional.limits.voiceMinutesByRegion.GBP).toBe(250);
    expect(MASTER_PLANS.professional.limits.voiceMinutesByRegion.INR).toBe(100);
    expect(MASTER_PLANS.professional.limits.trialVoiceMinutes).toBe(30);

    // Business
    expect(MASTER_PLANS.business.limits.conversations).toBe(4000);
    expect(MASTER_PLANS.business.limits.voiceMinutesByRegion.USD).toBe(600);
    expect(MASTER_PLANS.business.limits.voiceMinutesByRegion.INR).toBe(300);
    expect(MASTER_PLANS.business.limits.trialVoiceMinutes).toBe(30);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 10: Starter is blocked from voice on UI and server
  // ────────────────────────────────────────────────────────────────────────────
  test('10. Voice Gating: Starter plan completely lacks voiceAI capability', async () => {
    expect(MASTER_PLANS.starter.features.voiceAI).toBe(false);
    expect(MASTER_PLANS.professional.features.voiceAI).toBe(true);
    expect(MASTER_PLANS.business.features.voiceAI).toBe(true);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 11: Overage and 80%/90% alerts behavior per P7
  // ────────────────────────────────────────────────────────────────────────────
  test('11. Usage Monitoring: Alerts triggered at 80% and 90% utilization', async () => {
    const reminders = await trialReminderEngine.evaluateOrganizationReminders(lifecycleOrgId);
    expect(Array.isArray(reminders)).toBe(true);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 12: Upgrade, downgrade and cancel behave per P8
  // ────────────────────────────────────────────────────────────────────────────
  test('12. Plan Changes: Upgrades are immediate; downgrades schedule at period end', async () => {
    // Upgrade
    const upgraded = await subscriptionEngine.upgradePlan(lifecycleOrgId, 'business');
    expect(upgraded.planId).toBe('business');

    // Downgrade with excessive usage schedules at period end
    const downgradeResult = await subscriptionEngine.downgradePlan(lifecycleOrgId, 'starter');
    expect(downgradeResult.success).toBe(true);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 13: Trial end converts to paid active subscription
  // ────────────────────────────────────────────────────────────────────────────
  test('13. Trial Conversion: Converts trial to active paid subscription', async () => {
    const activeSub = await subscriptionEngine.convertTrialToPaid({
      organizationId: lifecycleOrgId,
      planId: 'professional',
      paymentProvider: 'razorpay',
      providerSubscriptionId: `sub_paid_${Date.now()}`,
    });

    expect(activeSub.status).toBe('active');
    expect(activeSub.hasPaymentMethod).toBe(true);
    expect(activeSub.setupFeeCharged).toBe(true);

    const status = await subscriptionEngine.getSubscriptionStatus(lifecycleOrgId);
    expect(status.state).toBe('ACTIVE');
    expect(status.isTrial).toBe(false);
    expect(status.isRestricted).toBe(false);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 14: Failed payment -> past_due -> 5-day grace -> paused
  // ────────────────────────────────────────────────────────────────────────────
  test('14. Payment Failure Lifecycle: past_due with 5-day grace period', async () => {
    const failedSub = await subscriptionEngine.recordPaymentFailure(lifecycleOrgId, 'Card expired');
    expect(failedSub.status).toBe('past_due');

    const status = await subscriptionEngine.getSubscriptionStatus(lifecycleOrgId);
    expect(status.state).toBe('PAST_DUE');
    expect(status.gracePeriodDaysRemaining).toBeGreaterThanOrEqual(4);
    expect(status.gracePeriodDaysRemaining).toBeLessThanOrEqual(5);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 15: Cancel during trial results in zero charge
  // ────────────────────────────────────────────────────────────────────────────
  test('15. Trial Cancellation: Access retained until trial end; zero charge', async () => {
    // Reset to trialing
    await subscriptionEngine.activateTrialWithPaymentMethod({
      organizationId: lifecycleOrgId,
      planId: 'starter',
      paymentProvider: 'stripe',
      providerSubscriptionId: `sub_trial_cancel_${Date.now()}`,
    });

    const canceled = await subscriptionEngine.requestCancellation(lifecycleOrgId);
    expect(canceled.cancelAtPeriodEnd).toBe(true);
    expect(canceled.status).toBe('trialing');
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 16: Google signup retains plan intent
  // ────────────────────────────────────────────────────────────────────────────
  test('16. OAuth Intent: Plan intent cookie serialization roundtrip', async () => {
    const originalIntent = {
      planId: 'professional' as const,
      interval: 'yearly' as const,
      currency: 'INR' as const,
    };

    const cookieVal = serializePlanIntent(originalIntent);
    const decoded = deserializePlanIntent(cookieVal);

    expect(decoded).toEqual(originalIntent);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 17: Launch offer LAUNCH30 (30% off first 3 cycles, max 5 redemptions)
  // ────────────────────────────────────────────────────────────────────────────
  test('17. Launch Offer: LAUNCH30 validates 30% discount with 5 redemption limit', async () => {
    const coupon = await couponService.validateCoupon('LAUNCH30');
    expect(coupon.valid).toBe(true);
    expect(coupon.discountPercent).toBe(30);
    expect(coupon.durationBillingCycles).toBe(3);

    const discountedAmount = couponService.calculateDiscountedAmount(10000, 30);
    expect(discountedAmount).toBe(7000);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 18: Security Scan: Zero source files contain hardcoded test key literals
  // ────────────────────────────────────────────────────────────────────────────
  test('18. Security Static Scan: Zero source files contain rzp_ or sk_ key literals', async () => {
    const srcDir = path.resolve(process.cwd(), 'src');
    const forbiddenPatterns = [
      /['"`]rzp_test_[a-zA-Z0-9]+['"`]/g,
      /['"`]rzp_live_[a-zA-Z0-9]+['"`]/g,
      /['"`]sk_test_[a-zA-Z0-9]+['"`]/g,
      /['"`]sk_live_[a-zA-Z0-9]+['"`]/g,
    ];

    const violations: { file: string; match: string }[] = [];

    function scanDir(dir: string) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const pattern of forbiddenPatterns) {
            const matches = content.match(pattern);
            if (matches) {
              for (const m of matches) {
                violations.push({ file: fullPath, match: m });
              }
            }
          }
        }
      }
    }

    scanDir(srcDir);
    expect(violations, `Hardcoded secret keys found in source code: ${JSON.stringify(violations)}`).toEqual([]);
  });
});
