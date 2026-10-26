import { NextResponse } from "next/server";
import { worker } from "@/server/services/jobs/worker";
import { logger } from "@/lib/logger";

export const maxDuration = 60; // Up to 60s for serverless execution

/**
 * Scheduled Cron Route for Daily Billing Reconciliation.
 * Enqueues a durable background job to query Stripe & Razorpay, audit state,
 * and safely correct discrepancies without unbounded serverless request timeouts.
 *
 * Authenticated via Authorization: Bearer <CRON_SECRET>.
 * Configured in vercel.json to trigger daily at 03:00 UTC.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Fail closed if production secret is missing or misconfigured
  if (!cronSecret) {
    logger.error("[Cron Reconciliation] CRON_SECRET is not configured on this server.");
    return NextResponse.json(
      { error: "Cron authorization secret is not configured on server" },
      { status: 500 }
    );
  }

  const expectedAuth = `Bearer ${cronSecret}`;
  if (!authHeader || authHeader !== expectedAuth) {
    logger.warn("[Cron Reconciliation] Unauthorized invocation attempt rejected.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const idempotencyKey = `recon_${todayIso}`;

  try {
    const jobId = await worker.enqueue(
      "billing_reconciliation",
      {
        triggeredAt: new Date().toISOString(),
        date: todayIso,
        batchSize: 100,
      },
      {
        idempotencyKey,
        maxAttempts: 3,
      }
    );

    return NextResponse.json({
      success: true,
      enqueued: true,
      jobId,
      idempotencyKey,
    });
  } catch (error: any) {
    logger.error("[Cron Reconciliation] Failed to enqueue reconciliation job", { error });
    return NextResponse.json(
      { error: "Failed to enqueue reconciliation job", details: error?.message },
      { status: 500 }
    );
  }
}
