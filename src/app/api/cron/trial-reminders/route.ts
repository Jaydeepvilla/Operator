import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { subscriptions } from "@/server/db/schema";
import { eq, or } from "drizzle-orm";
import { trialReminderEngine } from "@/server/services/billing/trial-reminder-engine";

export async function GET(req: NextRequest) {
  // Check authorization via CRON_SECRET if configured
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // Find all active trialing subscriptions
    const trialingSubs = await db
      .select({ organizationId: subscriptions.organizationId })
      .from(subscriptions)
      .where(or(eq(subscriptions.status, "trialing"), eq(subscriptions.status, "past_due")));

    const results = [];
    for (const sub of trialingSubs) {
      try {
        const reminders = await trialReminderEngine.evaluateOrganizationReminders(sub.organizationId);
        if (reminders.length > 0) {
          results.push({ organizationId: sub.organizationId, remindersCount: reminders.length });
        }
      } catch (err: any) {
        console.error(`Failed to evaluate reminders for org ${sub.organizationId}:`, err);
      }
    }

    return NextResponse.json({
      processedCount: trialingSubs.length,
      dispatchedCount: results.length,
      details: results,
    });
  } catch (error: any) {
    console.error("Trial reminders cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

