import { NextResponse } from "next/server";
import { notificationQueueService } from "@/server/services/jobs/notification-queue";

export const maxDuration = 60; // Max execution time for serverless cron

export async function GET(req: Request) {
  try {
    // Check cron authorization if CRON_SECRET is configured
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const batchSize = 50;
    const result = await notificationQueueService.processBatch(batchSize);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error("[Cron Queue Processor Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Queue processing error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
