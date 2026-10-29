import { db } from "../../src/server/db";
import { smartNotifications } from "../../src/server/db/schema";
import { ORG_ID } from "./business";

export async function seedNotifications(): Promise<void> {
  console.log("🔔 Seeding Action Center notifications for Operator Demo Salon...");

  await db.insert(smartNotifications).values([
    {
      id: "99999999-6666-1111-1111-111111111111",
      organizationId: ORG_ID,
      title: "Authentication Security Check",
      description: "Ensure your OAuth redirect URIs and API credentials are appropriately set in production settings to authorize user synchronization.",
      priority: "urgent",
      severity: "critical",
      category: "alert",
      isRead: false,
      isDismissed: false,
      actionUrl: "/settings",
      metadata: { error: "Security validation passed" }
    },
    {
      id: "99999999-6666-2222-2222-222222222222",
      organizationId: ORG_ID,
      title: "Knowledge Base Coverage Verified",
      description: "Operator AI successfully indexed salon policies, haircut durations, and booking guidelines with 98% factual grounding.",
      priority: "high",
      severity: "info",
      category: "ai_improvement",
      isRead: false,
      isDismissed: false,
      actionUrl: "/faqs",
      metadata: { accuracyScore: 98, topic: "salon_policies" }
    },
    {
      id: "99999999-6666-3333-3333-333333333333",
      organizationId: ORG_ID,
      title: "Peak Booking Hour Alert",
      description: "High appointment booking volume detected between 16:00 and 19:00 IST. The AI receptionist has confirmed 4 new slots automatically.",
      priority: "high",
      severity: "info",
      category: "alert",
      isRead: false,
      isDismissed: false,
      actionUrl: "/appointments",
      metadata: { bookingsConfirmed: 4 }
    },
    {
      id: "99999999-6666-4444-4444-444444444444",
      organizationId: ORG_ID,
      title: "WhatsApp Channel Connected",
      description: "Customer bookings are active via WhatsApp Business API (+91 98765 43210) for automated receptionist scheduling.",
      priority: "medium",
      severity: "info",
      category: "setup",
      isRead: false,
      isDismissed: false,
      actionUrl: "/channels",
      metadata: {}
    },
    {
      id: "99999999-6666-5555-5555-555555555555",
      organizationId: ORG_ID,
      title: "AI Receptionist Voice Active",
      description: "Vocal signature configured: Priya (Warm Receptionist) is active on the Operator Demo Salon inbound telephony line.",
      priority: "low",
      severity: "info",
      category: "setup",
      isRead: true,
      isDismissed: false,
      actionUrl: "/voice/settings",
      metadata: {}
    },
    {
      id: "99999999-6666-6666-6666-666666666666",
      organizationId: ORG_ID,
      title: "AI Training Handbook Synced",
      description: "System training is complete: Priya has successfully indexed 'Operator Demo Salon — Policies and Service Handbook.pdf'. Accuracy score: 98%.",
      priority: "medium",
      severity: "info",
      category: "ai_improvement",
      isRead: false,
      isDismissed: false,
      actionUrl: "/kb",
      metadata: { accuracy: 98 }
    }
  ]).onConflictDoNothing();

  console.log("✅ Seeded 6 smartNotifications into Action Center for Operator Demo Salon");
}
