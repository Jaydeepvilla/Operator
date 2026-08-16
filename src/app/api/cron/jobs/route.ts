import { NextResponse } from "next/server";
import { worker } from "@/server/services/jobs/worker";

export const maxDuration = 60; // Max execution time

export async function GET(req: Request) {
  try {
    // Enforce strict cron authentication
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error("[Cron Route] CRON_SECRET is not configured");
      return new NextResponse("Cron authorization not configured on server", { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Process up to 50 jobs per cron tick
    const result = await worker.processPendingJobs(50);

    return NextResponse.json({
      success: true,
      message: `Processed ${result.processed} jobs, ${result.failed} failed.`,
      ...result,
    });
  } catch (error: any) {
    console.error("Error processing jobs:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
