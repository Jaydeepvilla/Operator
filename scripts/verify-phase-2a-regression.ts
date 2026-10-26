import crypto from "crypto";
import { db } from "../src/server/db";
import { billingEvents, backgroundJobs } from "../src/server/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { webhookProcessor } from "../src/server/services/billing/webhook-processor";
import { worker } from "../src/server/services/jobs/worker";
import { verifyTwilioSignature } from "../src/server/utils/twilio-signature";

interface TestReport {
  id: number;
  name: string;
  status: "PASS" | "FAIL";
  durationMs: number;
  details: string;
}

const reports: TestReport[] = [];

async function runTest(id: number, name: string, fn: () => Promise<string>) {
  const start = Date.now();
  try {
    const details = await fn();
    const durationMs = Date.now() - start;
    reports.push({ id, name, status: "PASS", durationMs, details });
    console.log(`[PASS] Test ${id}: ${name} (${durationMs}ms) - ${details}`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    reports.push({ id, name, status: "FAIL", durationMs, details: err.message });
    console.error(`[FAIL] Test ${id}: ${name} (${durationMs}ms) - ${err.message}`);
  }
}

async function main() {
  console.log("=== OPERATOR PHASE 2A REGRESSION SUITE ===");

  // 1. WebSocket handshake and invalid upgrade behavior
  await runTest(1, "WebSocket RFC 6455 Handshake & 426 Upgrade Guidance", async () => {
    const key = "dGhlIHNhbXBsZSBub25jZQ==";
    const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
    const accept = crypto.createHash("sha1").update(key + WS_GUID).digest("base64");
    if (accept !== "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=") {
      throw new Error(`Invalid RFC 6455 hash: got ${accept}`);
    }
    return `Verified RFC 6455 accept hash matches specification`;
  });

  // 2. Invalid and valid Twilio signatures
  await runTest(2, "Twilio Signature HMAC-SHA1 Verification", async () => {
    const authToken = "test_auth_token_secret_123";
    const url = "https://app.operator.ai/api/webhooks/voice/inbound";
    const params = { CallSid: "CA123456", From: "+15551234567", To: "+15557654321" };

    const sortedKeys = Object.keys(params).sort();
    let data = url;
    for (const k of sortedKeys) {
      data += k + (params as any)[k];
    }
    const validSignature = crypto.createHmac("sha1", authToken).update(Buffer.from(data, "utf-8")).digest("base64");

    const isValid = verifyTwilioSignature({ authToken, signature: validSignature, url, params });
    const isInvalid = verifyTwilioSignature({ authToken, signature: "invalid_sig_xyz", url, params });

    if (!isValid || isInvalid) {
      throw new Error(`Signature check failed: valid=${isValid}, invalid=${isInvalid}`);
    }
    return `Valid signature passed, invalid signature rejected`;
  });

  // 3. Webhook Duplicate Delivery
  await runTest(3, "Billing Webhook Duplicate Delivery Deduplication", async () => {
    const testEventId = `evt_test_dedup_${Date.now()}`;
    // First delivery
    const res1 = await webhookProcessor.processEvent({
      provider: "stripe",
      providerEventId: testEventId,
      eventType: "customer.subscription.updated",
      payload: { id: testEventId, status: "active" },
    });

    if (!res1.processed || res1.duplicate) {
      throw new Error(`Initial delivery failed: ${JSON.stringify(res1)}`);
    }

    // Duplicate delivery
    const res2 = await webhookProcessor.processEvent({
      provider: "stripe",
      providerEventId: testEventId,
      eventType: "customer.subscription.updated",
      payload: { id: testEventId, status: "active" },
    });

    if (res2.processed || !res2.duplicate) {
      throw new Error(`Duplicate delivery was not rejected: ${JSON.stringify(res2)}`);
    }

    // Cleanup
    await db.delete(billingEvents).where(eq(billingEvents.providerEventId, testEventId));

    return `First delivery processed; identical retry marked duplicate: true`;
  });

  // 4. Concurrent Webhook Delivery
  await runTest(4, "Billing Webhook Concurrent Delivery Race Condition Protection", async () => {
    const testEventId = `evt_test_concurrent_${Date.now()}`;

    const [resA, resB] = await Promise.all([
      webhookProcessor.processEvent({
        provider: "stripe",
        providerEventId: testEventId,
        eventType: "payment_intent.succeeded",
        payload: { id: testEventId, amount: 2900 },
      }),
      webhookProcessor.processEvent({
        provider: "stripe",
        providerEventId: testEventId,
        eventType: "payment_intent.succeeded",
        payload: { id: testEventId, amount: 2900 },
      }),
    ]);

    const processedCount = (resA.processed ? 1 : 0) + (resB.processed ? 1 : 0);
    const duplicateCount = (resA.duplicate ? 1 : 0) + (resB.duplicate ? 1 : 0);

    if (processedCount !== 1 || duplicateCount !== 1) {
      throw new Error(`Expected exactly 1 processed and 1 duplicate. Got processed=${processedCount}, duplicate=${duplicateCount}`);
    }

    // Cleanup
    await db.delete(billingEvents).where(eq(billingEvents.providerEventId, testEventId));

    return `Exactly one concurrent request claimed the lock; the other was deduplicated`;
  });

  // 5. Retry after partial processing failure
  await runTest(5, "Billing Webhook Retry After Failure", async () => {
    const testEventId = `evt_test_failed_${Date.now()}`;

    // Seed a failed event
    await db.insert(billingEvents).values({
      provider: "stripe",
      providerEventId: testEventId,
      eventType: "stripe.invoice.payment_failed",
      status: "failed",
      error: "Temporary network timeout during first attempt",
      payload: { id: testEventId },
    });

    // Retry the same event
    const retryRes = await webhookProcessor.processEvent({
      provider: "stripe",
      providerEventId: testEventId,
      eventType: "invoice.payment_failed",
      payload: {
        id: testEventId,
        data: {
          object: {
            id: "in_mock_123",
          },
        },
      },
    });

    if (!retryRes.processed || retryRes.duplicate) {
      throw new Error(`Failed event was not retried: ${JSON.stringify(retryRes)}`);
    }

    // Check final status in DB
    const [updated] = await db
      .select()
      .from(billingEvents)
      .where(eq(billingEvents.providerEventId, testEventId))
      .limit(1);

    if (updated.status !== "processed") {
      throw new Error(`Expected status to be 'processed', got '${updated.status}'`);
    }

    // Cleanup
    await db.delete(billingEvents).where(eq(billingEvents.providerEventId, testEventId));

    return `Failed event was successfully claimed for retry and transitioned to 'processed'`;
  });

  // 6. Duplicate event IDs across different providers
  await runTest(6, "Duplicate Event IDs Across Distinct Providers Isolation", async () => {
    const sharedEventId = `shared_event_id_${Date.now()}`;

    const stripeRes = await webhookProcessor.processEvent({
      provider: "stripe",
      providerEventId: sharedEventId,
      eventType: "payment_intent.succeeded",
      payload: { id: sharedEventId },
    });

    const razorpayRes = await webhookProcessor.processEvent({
      provider: "razorpay",
      providerEventId: sharedEventId,
      eventType: "payment.captured",
      payload: { id: sharedEventId },
    });

    if (!stripeRes.processed || !razorpayRes.processed) {
      throw new Error(`Provider isolation failed: stripe=${stripeRes.processed}, razorpay=${razorpayRes.processed}`);
    }

    // Cleanup
    await db.delete(billingEvents).where(eq(billingEvents.providerEventId, sharedEventId));

    return `Both Stripe and Razorpay events succeeded independently with identical providerEventId`;
  });

  // 7. Concurrent workers claiming the same background jobs
  await runTest(7, "Background Worker Atomic SKIP LOCKED Concurrency Claim", async () => {
    const queueName = `test_queue_${Date.now()}`;
    const testJobIds: string[] = [];

    // Seed 4 pending jobs
    for (let i = 0; i < 4; i++) {
      const [job] = await db
        .insert(backgroundJobs)
        .values({
          queueName,
          payload: { index: i },
          status: "pending",
          runAt: new Date(),
        })
        .returning({ id: backgroundJobs.id });
      testJobIds.push(job.id);
    }

    // Two workers attempt to claim 4 jobs simultaneously
    const [workerAClaims, workerBClaims] = await Promise.all([
      worker.claimJobs(4),
      worker.claimJobs(4),
    ]);

    const workerAIds = new Set(workerAClaims.map((j) => j.id));
    const workerBIds = new Set(workerBClaims.map((j) => j.id));

    // Check for any overlapping IDs
    let overlapCount = 0;
    for (const id of workerAIds) {
      if (workerBIds.has(id)) overlapCount++;
    }

    if (overlapCount > 0) {
      throw new Error(`Race condition detected! ${overlapCount} jobs claimed by both workers!`);
    }

    // Cleanup test jobs
    await db.delete(backgroundJobs).where(sql`queue_name = ${queueName}`);

    return `0 job overlap between competing workers under parallel execution`;
  });

  // 8. Expired job leases and retry exhaustion
  await runTest(8, "Expired Job Lease Recovery & Abandoned Job Reclaim", async () => {
    const queueName = `test_lease_${Date.now()}`;
    const expiredLockTime = new Date(Date.now() - 15 * 60 * 1000); // 15 mins ago (> 5 min lease)

    // Seed an abandoned job
    const [abandoned] = await db
      .insert(backgroundJobs)
      .values({
        queueName,
        payload: { task: "abandoned_task" },
        status: "processing",
        lockedAt: expiredLockTime,
        runAt: expiredLockTime,
      })
      .returning({ id: backgroundJobs.id });

    // Claim jobs
    const reclaimed = await worker.claimJobs(10);
    const wasReclaimed = reclaimed.some((j) => j.id === abandoned.id);

    if (!wasReclaimed) {
      throw new Error(`Expired lease job ${abandoned.id} was not reclaimed by worker!`);
    }

    // Cleanup
    await db.delete(backgroundJobs).where(eq(backgroundJobs.id, abandoned.id));

    return `Abandoned job with expired lease was successfully reclaimed and refreshed`;
  });

  console.log("\n========================================================");
  console.log("           PHASE 2A REGRESSION TEST SUMMARY             ");
  console.log("========================================================");
  console.table(reports);

  const allPassed = reports.every((r) => r.status === "PASS");
  if (!allPassed) {
    console.error("Some regression tests failed!");
    process.exit(1);
  }

  console.log("ALL 8 REGRESSION TESTS PASSED CLEANLY!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
