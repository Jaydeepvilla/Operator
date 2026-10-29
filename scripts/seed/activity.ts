import { db } from "../../src/server/db";
import { businessActivityLog } from "../../src/server/db/schema";
import { ORG_ID } from "./business";

export async function seedActivity(): Promise<void> {
  console.log("📝 Seeding business activity log feed for Operator Demo Salon...");

  const activities = [
    {
      task: "Configured 'Haircut', 'Hair Styling', and 'Facial' service catalog",
      category: "service",
      impact: "high",
      offsetDays: -12
    },
    {
      task: "Created master stylist shifts for Priya Sharma and Rahul Mehta",
      category: "setup",
      impact: "low",
      offsetDays: -10
    },
    {
      task: "Uploaded 'Operator Demo Salon — Policies and Service Handbook.pdf'",
      category: "knowledge",
      impact: "medium",
      offsetDays: -7
    },
    {
      task: "Trained Operator AI receptionist on 2-hour cancellation policy",
      category: "knowledge",
      impact: "high",
      offsetDays: -5
    },
    {
      task: "Configured AI receptionist voice for Mumbai salon main line",
      category: "voice",
      impact: "high",
      offsetDays: -3
    },
    {
      task: "Connected WhatsApp Business API booking channel",
      category: "channel",
      impact: "critical",
      offsetDays: -2
    },
    {
      task: "Synchronized client profiles into Operator CRM",
      category: "crm",
      impact: "medium",
      offsetDays: -1
    }
  ];

  const now = new Date();

  for (let i = 0; i < activities.length; i++) {
    const act = activities[i];
    const logDate = new Date(now);
    logDate.setDate(now.getDate() + act.offsetDays);

    const logId = `13131313-100${i + 1}-1111-1111-111111111111`;
    await db.insert(businessActivityLog).values({
      id: logId,
      organizationId: ORG_ID,
      task: act.task,
      category: act.category,
      impact: act.impact,
      createdAt: logDate
    }).onConflictDoNothing();
  }

  console.log(`✅ Seeded ${activities.length} activity feed log rows for Operator Demo Salon`);
}
