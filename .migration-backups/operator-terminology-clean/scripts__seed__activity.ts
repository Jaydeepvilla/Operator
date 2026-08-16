import { db } from "../../src/server/db";
import { businessActivityLog } from "../../src/server/db/schema";
import { ORG_ID } from "./business";

export async function seedActivity(): Promise<void> {
  console.log("📝 Seeding business activity log feed...");

  const activities = [
    {
      task: "Added 'Signature Glow Facial' service to categories",
      category: "service",
      impact: "low",
      offsetDays: -12
    },
    {
      task: "Created staff schedule shifts for Sophia Martinez",
      category: "setup",
      impact: "low",
      offsetDays: -10
    },
    {
      task: "Uploaded 'Glow & Grace — Cleanliness Protocols.txt'",
      category: "knowledge",
      impact: "medium",
      offsetDays: -7
    },
    {
      task: "Trained AI Receptionist on 'Booking & Cancellation Policies'",
      category: "knowledge",
      impact: "high",
      offsetDays: -5
    },
    {
      task: "Configured custom ElevenLabs voice (Jessica clone) for main line",
      category: "voice",
      impact: "high",
      offsetDays: -3
    },
    {
      task: "Connected WhatsApp Business API webhook endpoints",
      category: "channel",
      impact: "critical",
      offsetDays: -2
    },
    {
      task: "Synchronized CRM records (110 client profiles imported)",
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

    await db.insert(businessActivityLog).values({
      organizationId: ORG_ID,
      task: act.task,
      category: act.category,
      impact: act.impact,
      metadata: {},
      createdAt: logDate,
    }).onConflictDoNothing();
  }

  console.log(`✅ Seeded ${activities.length} activity feed log rows`);
}
