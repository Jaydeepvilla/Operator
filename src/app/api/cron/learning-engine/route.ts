import { NextRequest, NextResponse } from "next/server";
import { learningEngine } from "@/server/services/learning-engine";

/**
 * Learning Engine Cron Job
 * Runs the complete self-improving cycle:
 * 1. Aggregate raw events into learning signals
 * 2. Detect patterns and generate improvement proposals
 * 3. Auto-apply safe proposals
 * 
 * Schedule: Every 6 hours via Vercel Cron or external scheduler
 * POST /api/cron/learning-engine
 */
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await learningEngine.runCycle();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error("[LearningEngine Cron] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Learning engine cycle failed" },
      { status: 500 }
    );
  }
}

// Allow GET for manual trigger from browser
export async function GET(req: NextRequest) {
  return POST(req);
}
