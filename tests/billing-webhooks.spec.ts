import { test, expect } from '@playwright/test';
import crypto from 'crypto';
import { db } from '../src/server/db';
import { billingEvents, subscriptions } from '../src/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { webhookProcessor } from '../src/server/services/billing/webhook-processor';
import { subscriptionEngine } from '../src/server/services/billing/subscription-engine';
import { getPlan } from '../src/lib/billing/plans';

test.describe('Operator Phase 3 — Billing & Webhook Reliability Suite', () => {

  const testOrgId = '11111111-1111-1111-1111-111111111111';

  test('Billing A — Webhook Signature: Rejection of forged and invalid signatures', async ({ request }) => {
    const forgedBody = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_forged_999999',
            amount: 50000,
            currency: 'INR',
            status: 'captured',
          }
        }
      }
    });

    // 1. Missing signature header
    const respNoSig = await request.post('/api/webhooks/billing/razorpay', {
      data: forgedBody,
      headers: { 'Content-Type': 'application/json' },
    });
    expect(respNoSig.status()).toBe(400);

    // 2. Invalid forged signature
    const respBadSig = await request.post('/api/webhooks/billing/razorpay', {
      data: forgedBody,
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': '0000000000000000000000000000000000000000000000000000000000000000',
      },
    });
    expect(respBadSig.status()).toBe(400);
  });

  test('Billing B — Webhook Idempotency: Duplicate delivery protection', async () => {
    const uniqueEventId = `evt_test_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const payload = {
      event: 'order.paid',
      order_id: `order_${Date.now()}`,
      amount: 7900,
      currency: 'USD',
      notes: { organizationId: testOrgId },
    };

    // First arrival: Must process successfully
    const firstResult = await webhookProcessor.processEvent({
      provider: 'razorpay',
      providerEventId: uniqueEventId,
      eventType: 'order.paid',
      payload,
    });

    expect(firstResult.duplicate).toBe(false);
    expect(firstResult.processed).toBe(true);

    // Verify written to database
    const [eventInDb] = await db
      .select()
      .from(billingEvents)
      .where(and(eq(billingEvents.provider, 'razorpay'), eq(billingEvents.providerEventId, uniqueEventId)))
      .limit(1);

    expect(eventInDb).toBeDefined();
    expect(eventInDb.providerEventId).toBe(uniqueEventId);

    // Second arrival: Exact duplicate must be safely acknowledged without duplicate processing
    const duplicateResult = await webhookProcessor.processEvent({
      provider: 'razorpay',
      providerEventId: uniqueEventId,
      eventType: 'order.paid',
      payload,
    });

    expect(duplicateResult.duplicate).toBe(true);
    expect(duplicateResult.processed).toBe(false);
  });

  test('Billing C — Concurrent Webhook Processing: Race condition safety', async () => {
    const concurrentEventId = `evt_race_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const payload = {
      event: 'subscription.charged',
      subscription_id: `sub_${Date.now()}`,
      notes: { organizationId: testOrgId },
    };

    // Simulate two concurrent webhooks arriving at the exact same millisecond
    const [resultA, resultB] = await Promise.all([
      webhookProcessor.processEvent({
        provider: 'razorpay',
        providerEventId: concurrentEventId,
        eventType: 'subscription.charged',
        payload,
      }),
      webhookProcessor.processEvent({
        provider: 'razorpay',
        providerEventId: concurrentEventId,
        eventType: 'subscription.charged',
        payload,
      }),
    ]);

    // Exactly one should process, and exactly one should be caught as duplicate
    const results = [resultA, resultB];
    const processedCount = results.filter((r) => r.processed && !r.duplicate).length;
    const duplicateCount = results.filter((r) => r.duplicate && !r.processed).length;

    expect(processedCount).toBe(1);
    expect(duplicateCount).toBe(1);
  });

  test('Billing D — Subscription Persistence: Database state reflects plan activation', async () => {
    const subId = `sub_persist_${Date.now()}`;
    const [existingSub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, testOrgId))
      .limit(1);

    if (existingSub) {
      await db
        .update(subscriptions)
        .set({
          planId: 'starter',
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, existingSub.id));
    } else {
      await db.insert(subscriptions).values({
        id: subId,
        organizationId: testOrgId,
        planId: 'starter',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }

    const [verifiedSub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, testOrgId))
      .limit(1);

    expect(verifiedSub).toBeDefined();
    expect(verifiedSub.status).toBe('active');
    expect(verifiedSub.planId).toBe('starter');
  });

  test('Billing E — Unknown Organization: Webhook references non-existent tenant gracefully', async () => {
    const unknownOrgId = '99999999-9999-9999-9999-999999999999';
    const unknownEventId = `evt_unknown_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const payload = {
      event: 'order.paid',
      order: {
        entity: {
          id: `order_${Date.now()}`,
          amount: 7900,
          currency: 'USD',
          notes: { organizationId: unknownOrgId, planId: 'starter' },
        }
      }
    };

    // Should complete gracefully without crashing or throwing unhandled DB foreign key error
    const result = await webhookProcessor.processEvent({
      provider: 'razorpay',
      providerEventId: unknownEventId,
      eventType: 'order.paid',
      payload,
    });

    expect(result.processed).toBe(true);
    expect(result.duplicate).toBe(false);

    // Verify event is safely recorded in billing_events ledger
    const [eventInDb] = await db
      .select()
      .from(billingEvents)
      .where(and(eq(billingEvents.provider, 'razorpay'), eq(billingEvents.providerEventId, unknownEventId)))
      .limit(1);

    expect(eventInDb).toBeDefined();
    expect(eventInDb.status).toBe('processed');
  });

  test('Billing F — Missing Subscription Row Upsert: Payment webhook creates active subscription if none existed', async () => {
    // 1. Delete subscription record for test org if present
    await db.delete(subscriptions).where(eq(subscriptions.organizationId, testOrgId));

    // 2. Trigger convertTrialToPaid directly
    const converted = await subscriptionEngine.convertTrialToPaid({
      organizationId: testOrgId,
      planId: 'pro',
      paymentProvider: 'razorpay',
      providerSubscriptionId: `sub_upsert_${Date.now()}`,
      providerCustomerId: `cust_upsert_${Date.now()}`,
    });

    expect(converted).toBeDefined();
    expect(converted.planId).toBe('professional');
    expect(converted.status).toBe('active');

    // 3. Verify row in database
    const [dbSub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, testOrgId))
      .limit(1);

    expect(dbSub).toBeDefined();
    expect(dbSub.planId).toBe('professional');
    expect(dbSub.status).toBe('active');
  });

  test('Billing G — Authoritative Plan Pricing: Catalog prices enforce server-side pricing integrity', async () => {
    // Ensure all catalog tiers have fixed authoritative prices
    expect(getPlan('starter').price).toBe(79);
    expect(getPlan('pro').price).toBe(199);
    expect(getPlan('business').price).toBe(399);

    // Fallback on unknown plan returns starter
    expect(getPlan('nonexistent-tier').id).toBe('starter');
    expect(getPlan('nonexistent-tier').price).toBe(79);
  });

  test('Billing H — Razorpay Event Distinction: Different lifecycle events for same entity do not collide', async () => {
    const paymentEntityId = `pay_distinct_${Date.now()}`;
    const authorizedEventId = `payment.authorized_${paymentEntityId}`;
    const capturedEventId = `payment.captured_${paymentEntityId}`;

    const authorizedResult = await webhookProcessor.processEvent({
      provider: 'razorpay',
      providerEventId: authorizedEventId,
      eventType: 'payment.authorized',
      payload: { id: paymentEntityId, amount: 7900, status: 'authorized' },
    });

    const capturedResult = await webhookProcessor.processEvent({
      provider: 'razorpay',
      providerEventId: capturedEventId,
      eventType: 'payment.captured',
      payload: {
        payload: {
          payment: {
            entity: {
              id: paymentEntityId,
              amount: 7900,
              currency: 'USD',
              notes: { organizationId: testOrgId, planId: 'starter' },
            }
          }
        }
      },
    });

    // Both should process without colliding on the payment ID
    expect(authorizedResult.processed).toBe(true);
    expect(authorizedResult.duplicate).toBe(false);
    expect(capturedResult.processed).toBe(true);
    expect(capturedResult.duplicate).toBe(false);
  });

  test('Billing I — State Machine Source of Truth: Status is authoritative from database', async () => {
    const status = await subscriptionEngine.getSubscriptionStatus(testOrgId);
    expect(status).toBeDefined();
    expect(['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELING', 'CANCELED', 'SUSPENDED', 'EXPIRED']).toContain(status.state);
    expect(status.plan).toBeDefined();
    expect(typeof status.plan.limits.voiceMinutes).toBe('number');
  });

  test('Billing J — Failed Event Retry Recovery: Failed event can be retried upon redelivery', async () => {
    const retryEventId = `evt_fail_retry_${Date.now()}`;

    // Seed a failed event record in billingEvents
    const [seeded] = await db
      .insert(billingEvents)
      .values({
        provider: 'stripe',
        providerEventId: retryEventId,
        eventType: 'stripe.invoice.payment_failed',
        status: 'failed',
        error: 'Simulated transient database connection error',
        payload: { simulated: true },
      })
      .returning();

    expect(seeded).toBeDefined();
    expect(seeded.status).toBe('failed');

    // Deliver the event again — WebhookProcessor must detect failed state, reclaim lease, and process
    const retryResult = await webhookProcessor.processEvent({
      provider: 'stripe',
      providerEventId: retryEventId,
      eventType: 'invoice.payment_failed',
      payload: {
        data: {
          object: {
            subscription: 'sub_unknown_simulated',
          }
        }
      },
    });

    expect(retryResult.processed).toBe(true);
    expect(retryResult.duplicate).toBe(false);

    // Verify status updated to processed
    const [updatedEvent] = await db
      .select()
      .from(billingEvents)
      .where(and(eq(billingEvents.provider, 'stripe'), eq(billingEvents.providerEventId, retryEventId)))
      .limit(1);

    expect(updatedEvent.status).toBe('processed');
    expect(updatedEvent.error).toBeNull();
  });

});
