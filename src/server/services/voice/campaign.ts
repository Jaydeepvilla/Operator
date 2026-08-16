import { db } from "../../db";
import { phoneNumbers, callSessions, callEvents, appointments } from "../../db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { VoiceProviderRegistry } from "./types";

export const voiceCampaign = {
  /**
   * Triggers an automated outbound call to a contact
   */
  async triggerOutboundCall(options: {
    organizationId: string;
    phoneNumberId: string;
    to: string;
    streamUrl: string;
  }): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    const { organizationId, phoneNumberId, to, streamUrl } = options;

    try {
      // 1. Get origin phone number
      const phoneLine = await db.query.phoneNumbers.findFirst({
        where: eq(phoneNumbers.id, phoneNumberId),
      });

      if (!phoneLine) {
        return { success: false, error: "Origin phone number not found in organization settings" };
      }

      // 2. Setup temporary call session
      const tempCallSid = "OUT-" + Math.random().toString(36).substring(2, 16);
      const [session] = await db
        .insert(callSessions)
        .values({
          organizationId,
          phoneNumberId,
          direction: "outbound",
          externalSessionId: tempCallSid,
          callerNumber: phoneLine.phoneNumber,
          recipientNumber: to,
          status: "ringing",
        })
        .returning();

      // Log event
      await db.insert(callEvents).values({
        organizationId,
        sessionId: session.id,
        eventType: "ringing",
      });

      // 3. Dial telephony provider
      const telephony = VoiceProviderRegistry.getTelephony("telephony-generic");
      if (!telephony) {
        await db
          .update(callSessions)
          .set({ status: "failed", endedReason: "telephony-provider-not-configured" })
          .where(eq(callSessions.id, session.id));
        return { success: false, error: "Telephony Provider is not configured" };
      }

      const connectionConfig = {};

      const dialResult = await telephony.initiateOutboundCall(
        organizationId,
        connectionConfig,
        to,
        phoneLine.phoneNumber,
        streamUrl
      );

      if (!dialResult.success || !dialResult.externalCallId) {
        await db
          .update(callSessions)
          .set({ status: "failed", endedReason: dialResult.error || "telephony-failed" })
          .where(eq(callSessions.id, session.id));
        return { success: false, error: dialResult.error || "Telephony provider failed to dial" };
      }

      // 4. Update session with actual Call SID
      await db
        .update(callSessions)
        .set({
          externalSessionId: dialResult.externalCallId,
          status: "in-progress",
          updatedAt: new Date(),
        })
        .where(eq(callSessions.id, session.id));

      await db.insert(callEvents).values({
        organizationId,
        sessionId: session.id,
        eventType: "answered",
      });

      return {
        success: true,
        sessionId: session.id,
      };
    } catch (e: any) {
      console.error("[Voice Campaign] triggerOutboundCall failed:", e);
      return { success: false, error: e?.message || "Outbound calling error" };
    }
  },

  /**
   * Processes outbound voice call reminder campaigns for upcoming appointments.
   */
  async runReminderCampaign(organizationId: string) {
    try {
      // Get phone number to dial from
      const phoneLine = await db.query.phoneNumbers.findFirst({
        where: and(
          eq(phoneNumbers.organizationId, organizationId),
          eq(phoneNumbers.status, "active")
        ),
      });

      if (!phoneLine) {
        console.warn(`[Voice Campaign] No active phone numbers for organization ${organizationId}. Skipping campaign.`);
        return { success: false, message: "No active phone number registered" };
      }

      // Query appointments scheduled within the next 24 hours
      const now = new Date();
      const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const upcomingAppointments = await db.query.appointments.findMany({
        where: and(
          eq(appointments.organizationId, organizationId),
          eq(appointments.status, 'confirmed'),
          gte(appointments.startTime, now),
          lte(appointments.startTime, next24Hours)
        )
      });

      const results = [];
      for (const appointment of upcomingAppointments) {
        if (!appointment.customerPhone) {
          continue;
        }
        // Stream URL points to our websocket endpoint
        const streamUrl = `wss://${process.env.NEXT_PUBLIC_APP_URL || "receptionist.nexx.ai"}/api/webhooks/voice/stream`;
        const res = await this.triggerOutboundCall({
          organizationId,
          phoneNumberId: phoneLine.id,
          to: appointment.customerPhone,
          streamUrl
        });
        results.push({ phone: appointment.customerPhone, name: appointment.customerName, ...res });
      }

      return {
        success: true,
        callsTriggeredCount: results.filter(r => r.success).length,
        results
      };
    } catch (e: any) {
      console.error("[Voice Campaign] runReminderCampaign failed:", e);
      return { success: false, error: e?.message };
    }
  }
};
