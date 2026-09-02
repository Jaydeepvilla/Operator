import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { checkUserOrganization } from "@/server/actions/onboarding";
import { conversationsRepository } from "@/server/repositories/conversations";
import { activityRepository } from "@/server/repositories/activity";
import { appointmentsRepository } from "@/server/repositories/appointments";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { org } = await checkUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const type = body.type || "conversation"; // "conversation" | "booking"

    if (type === "conversation") {
      // 1. Create simulated inquiry
      const conv = await conversationsRepository.create({
        organizationId: org.id,
        status: "resolved",
        metadata: {
          channel: "web_widget",
          callerName: "Alex Taylor",
          inquiry: "General inquiry regarding services and business hours",
          resolution: "Answered questions using business FAQs",
          simulated: true,
        },
      });

      // 2. Log activity
      await activityRepository.log({
        organizationId: org.id,
        category: "ai_conversation",
        task: "AI Receptionist answered visitor inquiry about hours & pricing (Resolved)",
        impact: "Automated customer inquiry resolution with 0 staff intervention",
      });

      return NextResponse.json({
        success: true,
        message: "Simulated conversation handled successfully by Operator AI.",
        conversationId: conv.id,
      });
    }

    if (type === "booking") {
      const now = new Date();
      const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // tomorrow
      const endTime = new Date(startTime.getTime() + 45 * 60 * 1000); // 45 min slot

      const apt = await appointmentsRepository.create({
        organizationId: org.id,
        startTime,
        endTime,
        customerName: "Sarah Connor",
        customerEmail: "sarah.c@example.com",
        customerPhone: "+1 (555) 349-2910",
        pricePaid: "120.00",
        status: "confirmed",
      });

      await activityRepository.log({
        organizationId: org.id,
        category: "booking",
        task: "Operator AI booked confirmed appointment for Sarah Connor ($120)",
        impact: "+$120 revenue captured & calendar synced",
      });

      return NextResponse.json({
        success: true,
        message: "Simulated appointment booked successfully.",
        appointmentId: apt.id,
      });
    }

    return NextResponse.json({ error: "Invalid simulation type" }, { status: 400 });
  } catch (error: any) {
    console.error("[Dashboard Simulation] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Simulation failed" },
      { status: 500 }
    );
  }
}
