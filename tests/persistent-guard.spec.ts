import { test, expect } from "@playwright/test";
import { persistentGuard } from "../src/server/services/security/persistent-guard";
import {
  checkTelephonyWebhookIdempotencyAsync,
  recordTelephonyWebhookResponseAsync,
  checkCallRateLimitAsync,
} from "../src/server/services/voice/security";
import { billingSecurityService } from "../src/server/services/billing/billing-security";
import {
  checkPublicBookingSpamLimitAsync,
  checkBookingIdempotencyAsync,
  recordBookingIdempotencyAsync,
} from "../src/server/services/booking-security";

test.describe("Multi-Instance Persistent Guard & Webhook Deduplication (Item 5)", () => {
  test("two simulated concurrent serverless instances reject the exact same repeated webhook", async () => {
    const testEventId = `evt_multi_inst_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const scope = "billing:razorpay";

    // Simulate two concurrent serverless lambdas receiving the same incoming webhook at the exact same instant
    const [instanceA, instanceB] = await Promise.all([
      persistentGuard.checkDeduplication(scope, testEventId),
      persistentGuard.checkDeduplication(scope, testEventId),
    ]);

    // Exactly one instance must win and process; the concurrent instance must be rejected as duplicate
    const results = [instanceA.isDuplicate, instanceB.isDuplicate];
    expect(results).toContain(false); // One instance allowed
    expect(results).toContain(true);  // Concurrent instance rejected

    // Record response from winning instance
    await persistentGuard.recordResponse(scope, testEventId, { status: "processed_deposit", amount: 50 });

    // A third instance delivering a retry later must see cached response and duplicate: true
    const instanceC = await persistentGuard.checkDeduplication(scope, testEventId);
    expect(instanceC.isDuplicate).toBe(true);
    expect(instanceC.cachedResponse).toEqual({ status: "processed_deposit", amount: 50 });
  });

  test("telephony webhook deduplication rejects duplicate call webhooks across instances", async () => {
    const callSid = `CA_multi_inst_${Date.now()}`;

    // Instance 1 processes inbound call
    const firstCheck = await checkTelephonyWebhookIdempotencyAsync({
      callSid,
      eventType: "inbound",
    });
    expect(firstCheck.isDuplicate).toBe(false);

    // Save response XML
    const mockTwiML = "<Response><Say>Welcome to Operator AI</Say></Response>";
    await recordTelephonyWebhookResponseAsync({
      callSid,
      eventType: "inbound",
      responseXml: mockTwiML,
    });

    // Instance 2 receives duplicate delivery of the same inbound call
    const secondCheck = await checkTelephonyWebhookIdempotencyAsync({
      callSid,
      eventType: "inbound",
    });
    expect(secondCheck.isDuplicate).toBe(true);
    expect(secondCheck.cachedResponse).toBe(mockTwiML);
  });

  test("persistent sliding window rate limiter throttles excessive calls across instances", async () => {
    const testCaller = `+1999${Math.floor(1000000 + Math.random() * 9000000)}`;

    // Call 1-20 should be allowed
    const firstCall = await checkCallRateLimitAsync(testCaller);
    expect(firstCall.isRateLimited).toBe(false);
    expect(firstCall.remainingCalls).toBeGreaterThanOrEqual(0);

    // Rapidly consume quota using atomic persistent rate limit
    for (let i = 0; i < 20; i++) {
      await persistentGuard.checkRateLimit("voice:calls", testCaller, 20, 60 * 1000);
    }

    // Call 21 should be rate limited persistently
    const throttledCall = await checkCallRateLimitAsync(testCaller);
    expect(throttledCall.isRateLimited).toBe(true);
    expect(throttledCall.remainingCalls).toBe(0);
  });

  test("public booking spam limiter persistently throttles across instances", async () => {
    const testIp = `ip_${Date.now()}`;
    const testEmail = `spam_test_${Date.now()}@example.com`;

    // First booking allowed
    const res1 = await checkPublicBookingSpamLimitAsync(testIp, testEmail);
    expect(res1.isLimited).toBe(false);

    // Exceed max 5 limit
    for (let i = 0; i < 6; i++) {
      await persistentGuard.checkRateLimit("booking:public_spam", testIp, 5, 10 * 60 * 1000);
    }

    const throttled = await checkPublicBookingSpamLimitAsync(testIp, testEmail);
    expect(throttled.isLimited).toBe(true);
  });
});

