import { db } from "../../src/server/db";
import { smartNotifications } from "../../src/server/db/schema";
import { ORG_ID } from "./business";

export async function seedNotifications(): Promise<void> {
  console.log("🔔 Seeding Action Center notifications (smartNotifications)...");

  await db.insert(smartNotifications).values([
    {
      id: "99999999-6666-1111-1111-111111111111",
      organizationId: ORG_ID,
      title: "Clerk Authentication Verification Failed",
      description: "Webhook logs indicate Clerk event validation signatures are missing. Ensure your CLERK_WEBHOOK_SECRET is set correctly in settings to authorize webhook synchronization.",
      priority: "urgent",
      severity: "critical",
      category: "alert",
      isRead: false,
      isDismissed: false,
      actionUrl: "/settings",
      metadata: { error: "Signature verification failed" }
    },
    {
      id: "99999999-6666-2222-2222-222222222222",
      organizationId: ORG_ID,
      title: "Weak Knowledge Base Coverage",
      description: "Our AI model reports a 35% gap in handling billing-related customer questions. We suggest adding 4 new FAQs detailing cancellation refunds.",
      priority: "high",
      severity: "warning",
      category: "ai_improvement",
      isRead: false,
      isDismissed: false,
      actionUrl: "/faqs",
      metadata: { gapPercentage: 35, topic: "refunds" }
    },
    {
      id: "99999999-6666-3333-3333-333333333333",
      organizationId: ORG_ID,
      title: "Missed Call Spike Detected",
      description: "You have missed 12 incoming calls this morning. Consider adjusting voice receptionist availability during peak lunch hours (12:00 - 14:00).",
      priority: "high",
      severity: "warning",
      category: "alert",
      isRead: false,
      isDismissed: false,
      actionUrl: "/voice/dashboard",
      metadata: { missedCount: 12 }
    },
    {
      id: "99999999-6666-4444-4444-444444444444",
      organizationId: ORG_ID,
      title: "Connect WhatsApp Communication Channel",
      description: "Increase customer bookings by up to 45% by connecting your WhatsApp Business API line to let Jessica handle scheduling automatically.",
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
      title: "Configure Custom Salon Voice",
      description: "Branding Tip: Customize your AI receptionist's vocal signature. Olivia's voice clone is ready to test on ElevenLabs.",
      priority: "low",
      severity: "info",
      category: "setup",
      isRead: true, // marked read
      isDismissed: false,
      actionUrl: "/voice/settings",
      metadata: {}
    },
    {
      id: "99999999-6666-6666-6666-666666666666",
      organizationId: ORG_ID,
      title: "AI Training Optimization Completed",
      description: "System training is complete: Jessica has successfully indexed 'Glow & Grace — Cleanliness Protocols.txt'. Accuracy score has increased to 96%.",
      priority: "medium",
      severity: "info",
      category: "ai_improvement",
      isRead: false,
      isDismissed: false,
      actionUrl: "/kb",
      metadata: { accuracy: 96 }
    }
  ]).onConflictDoNothing();

  console.log("✅ Seeded 6 smartNotifications into Action Center");
}
