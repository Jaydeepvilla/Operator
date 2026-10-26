import { NextResponse } from "next/server";
import { reminderDispatcherService } from "@/server/services/reminders/dispatcher";

export const maxDuration = 60; // Max execution time for serverless cron

export async function GET(req: Request) {
  try {
    // Check cron authorization with fail-closed enforcement
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("[Cron Reminder Dispatcher] CRON_SECRET is not configured");
      return NextResponse.json(
        { error: "Cron authorization not configured on server" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const batchSize = 50;
    const result = await reminderDispatcherService.dispatchDueReminders(batchSize);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error("[Cron Reminder Dispatcher Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Reminder dispatch error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
