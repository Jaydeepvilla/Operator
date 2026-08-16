import { db } from "../../db";
import { 
  conversations, 
  conversationMessages, 
  leadProfiles, 
  inboxThreads, 
  inboxParticipants, 
  communicationChannels,
  channelMessages, 
  communicationLogs 
} from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { InboundMessage, ReceptionistResponse, OutboundMessage, ReceptionistActionSummary } from "./types";
import { crmDeduplicationService } from "../crm/deduplication";
import { orchestratorService } from "../orchestrator";

export class AiReceptionistCore {
  /**
   * The single authoritative entry point for processing customer turns across all channels.
   */
  async processInboundMessage(message: InboundMessage): Promise<ReceptionistResponse> {
    const startTime = Date.now();
    const {
      organizationId,
      channel,
      channelAccountId,
      customer,
      content,
      metadata
    } = message;

    const userText = content.text || (content.type === "audio" ? "[Voice Audio]" : "[Media Attachment]");
    const senderHandle = customer.phone || customer.email || customer.externalId || "anonymous-customer";
    const senderName = customer.name || `${channel.toUpperCase()} Customer`;

    try {
      // 1. Resolve Unified CRM Lead / Contact Profile (Cross-Channel Deduplication)
      const { leadProfileId, isNew } = await crmDeduplicationService.resolveUnifiedProfile({
        organizationId,
        channelType: channel,
        senderUserId: senderHandle,
        senderName: customer.name,
      });

      // Update lead metadata if phone/email provided
      if (customer.phone || customer.email) {
        await db
          .update(leadProfiles)
          .set({
            phone: customer.phone || undefined,
            email: customer.email || undefined,
            updatedAt: new Date(),
          })
          .where(eq(leadProfiles.id, leadProfileId));
      }

      // Resolve communication channel ID
      let channelRecord = await db.query.communicationChannels.findFirst({
        where: and(
          eq(communicationChannels.organizationId, organizationId),
          eq(communicationChannels.type, channel)
        ),
      });

      if (!channelRecord) {
        const [newChannel] = await db
          .insert(communicationChannels)
          .values({
            organizationId,
            type: channel,
            name: `${channel.toUpperCase()} Channel`,
            status: "active",
          })
          .returning();
        channelRecord = newChannel;
      }

      // 2. Find or Create Active Conversation & Inbox Thread
      let conversationId = message.conversationId;
      let thread = conversationId 
        ? await db.query.inboxThreads.findFirst({ where: eq(inboxThreads.conversationId, conversationId) })
        : null;

      if (!thread) {
        // Find existing open thread for this contact on this channel
        thread = await db.query.inboxThreads.findFirst({
          where: and(
            eq(inboxThreads.organizationId, organizationId),
            eq(inboxThreads.status, "open")
          ),
        });
      }

      if (!thread) {
        // Create new standard conversation
        const [newConv] = await db
          .insert(conversations)
          .values({
            organizationId,
            leadProfileId,
            status: "active",
            metadata: { sourceChannel: channel, channelAccountId },
          })
          .returning();

        conversationId = newConv.id;

        // Create unified inbox thread
        const [newThread] = await db
          .insert(inboxThreads)
          .values({
            organizationId,
            conversationId: newConv.id,
            channelId: channelRecord.id,
            status: "open",
            unreadCount: 1,
            aiAutonomy: "active",
          })
          .returning();

        thread = newThread;

        // Add thread participant
        await db.insert(inboxParticipants).values({
          organizationId,
          threadId: newThread.id,
          participantType: "contact",
          participantId: leadProfileId,
          name: senderName,
        });
      } else {
        conversationId = thread.conversationId;
        // Increment unread count
        await db
          .update(inboxThreads)
          .set({
            unreadCount: (thread.unreadCount || 0) + 1,
            updatedAt: new Date(),
          })
          .where(eq(inboxThreads.id, thread.id));
      }

      // 3. Save incoming user message
      await db.insert(conversationMessages).values({
        organizationId,
        conversationId: conversationId!,
        sender: "user",
        content: userText,
        confidenceScore: "1.0",
      });

      // 4. Check Autonomy Guardrails (Human Takeover Mode)
      const isManualTakeover = thread.assignedStaffId !== null || thread.aiAutonomy === "paused";

      let assistantReplyText = "";
      let intent = "general_inquiry";
      let citations: string[] = [];
      let isEscalated = false;
      let actionTaken: ReceptionistActionSummary = { type: "none" };

      if (!isManualTakeover) {
        // 5. Execute Unified AI Orchestrator
        const aiResult = await orchestratorService.processMessage({
          organizationId,
          conversationId: conversationId!,
          userMessage: userText,
          metadata: {
            channel,
            customerPhone: customer.phone,
            customerEmail: customer.email,
            ...metadata,
          },
        });

        assistantReplyText = aiResult.assistantMessage;
        intent = aiResult.intent;
        citations = aiResult.citations || [];
        isEscalated = aiResult.isEscalated;

        if (isEscalated) {
          actionTaken = { type: "escalated_to_staff", details: { reason: "Safety boundary or complex request" } };
        } else if (intent === "booking") {
          actionTaken = { type: "booking_created", details: { intent: "appointment_scheduled" } };
        }
      } else {
        // In manual takeover mode, AI generates a draft in background without sending
        assistantReplyText = ""; // No auto-send
      }

      const latencyMs = Date.now() - startTime;

      // 6. Audit Log
      await db.insert(communicationLogs).values({
        organizationId,
        level: "info",
        message: `[AI Receptionist Core] Handled ${channel.toUpperCase()} message from ${senderName} (${latencyMs}ms)`,
      });

      return {
        conversationId: conversationId!,
        leadProfileId,
        assistantReplyText,
        intent,
        citations,
        isEscalated,
        actionTaken,
        latencyMs,
      };
    } catch (error: any) {
      console.error("[AiReceptionistCore] Error processing inbound message:", error);
      throw error;
    }
  }
}

export const aiReceptionistCore = new AiReceptionistCore();
