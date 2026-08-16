import { db } from "../../db";
import { 
  conversations, 
  conversationMessages, 
  leadProfiles, 
  contactChannels, 
  communicationChannels, 
  channelConnections, 
  channelMessages, 
  inboxThreads, 
  inboxParticipants, 
  channelSettings,
  communicationLogs
} from "../../db/schema";
import { eq, and, or } from "drizzle-orm";
import { WebhookMessagePayload, ProviderRegistry } from "./types";
import { orchestratorService } from "../orchestrator";
import { crmDeduplicationService } from "../crm/deduplication";

export const omnichannelRouter = {
  /**
   * Route incoming message payload received via webhooks
   */
  async routeIncomingMessage(payload: WebhookMessagePayload): Promise<void> {
    const { 
      organizationId, 
      channelId, 
      channelType, 
      externalMessageId, 
      senderUserId, 
      senderName, 
      recipientUserId, 
      content,
      metadata = {}
    } = payload;

    try {
      // 1. Resolve unified Contact/Lead profile with omnichannel deduplication across channels
      const { leadProfileId, isNew } = await crmDeduplicationService.resolveUnifiedProfile({
        organizationId,
        channelType,
        senderUserId,
        senderName,
      });

      if (!isNew) {
        // Update conversation counts on existing contact profile
        const lead = await db.query.leadProfiles.findFirst({
          where: eq(leadProfiles.id, leadProfileId)
        });
        if (lead) {
          await db
            .update(leadProfiles)
            .set({ 
              conversationCount: (lead.conversationCount || 0) + 1,
              updatedAt: new Date()
            })
            .where(eq(leadProfiles.id, leadProfileId));
        }
      }

      // 2. Find or Create Conversation linked to this lead and channel
      // Try to find an active thread first
      let thread = await db.query.inboxThreads.findFirst({
        where: and(
          eq(inboxThreads.organizationId, organizationId),
          eq(inboxThreads.channelId, channelId),
          eq(inboxThreads.status, "open")
        )
      });

      let conversationId: string;

      if (!thread) {
        // Create standard conversation
        const [newConv] = await db
          .insert(conversations)
          .values({
            organizationId,
            leadProfileId,
            status: "active",
            metadata: { sourceChannel: channelType }
          })
          .returning();

        conversationId = newConv.id;

        // Create thread
        const [newThread] = await db
          .insert(inboxThreads)
          .values({
            organizationId,
            conversationId,
            channelId,
            status: "open",
            unreadCount: 1
          })
          .returning();

        thread = newThread;

        // Save thread participant
        const participantName = senderName || `${channelType.toUpperCase()} User`;
        await db
          .insert(inboxParticipants)
          .values({
            organizationId,
            threadId: thread.id,
            participantType: "contact",
            participantId: leadProfileId,
            name: participantName
          });
      } else {
        conversationId = thread.conversationId;
        
        // Increment unread count
        await db
          .update(inboxThreads)
          .set({ 
            unreadCount: (thread.unreadCount || 0) + 1,
            updatedAt: new Date()
          })
          .where(eq(inboxThreads.id, thread.id));
      }

      // 3. Save incoming message to Drizzle standard conversations and omnichannel channel logs
      await db.insert(conversationMessages).values({
        organizationId,
        conversationId,
        sender: "user",
        content,
        confidenceScore: "1.0"
      });

      const [chanMsg] = await db
        .insert(channelMessages)
        .values({
          organizationId,
          channelId,
          conversationId,
          direction: "incoming",
          senderId: senderUserId,
          recipientId: recipientUserId,
          content,
          status: "read",
          externalId: externalMessageId,
          metadata
        })
        .returning();

      // Update thread lastMessageId
      await db
        .update(inboxThreads)
        .set({ lastMessageId: chanMsg.id, updatedAt: new Date() })
        .where(eq(inboxThreads.id, thread.id));

      // 4. Resolve Channel settings to check if AI responses are enabled
      const settings = await db.query.channelSettings.findFirst({
        where: and(
          eq(channelSettings.organizationId, organizationId),
          eq(channelSettings.channelId, channelId)
        )
      });

      const aiEnabled = settings ? settings.aiEnabled : true;
      const isThreadEscalated = thread.assignedStaffId !== null; // If staff assigned, manual mode active
      const isThreadPaused = thread.aiAutonomy === "paused";

      // 5. Trigger AI process and reply if applicable
      if (aiEnabled && !isThreadEscalated && !isThreadPaused) {
        // Run Operator AI Orchestrator
        const aiResponse = await orchestratorService.processMessage({
          organizationId,
          conversationId,
          userMessage: content,
          metadata: { channelType }
        });

        // Send reply back via provider with RAG citations & AI intent metadata
        await this.sendOutgoingMessage({
          organizationId,
          channelId,
          conversationId,
          recipientId: senderUserId,
          content: aiResponse.assistantMessage,
          isAiGenerated: true,
          metadata: {
            citations: aiResponse.citations || [],
            intent: aiResponse.intent || "general_inquiry",
            isEscalated: aiResponse.isEscalated || false,
            confidenceScore: 0.96,
          }
        });
      }

      // Audit Log
      await db.insert(communicationLogs).values({
        organizationId,
        level: "info",
        message: `Successfully routed incoming ${channelType} message from ${senderUserId}`,
        channel: channelType,
        payload: { externalMessageId }
      });

    } catch (e: any) {
      console.error("[Omnichannel Router] Error routing incoming message:", e);
      await db.insert(communicationLogs).values({
        organizationId,
        level: "error",
        message: `Failed to route incoming ${channelType} message: ${e?.message || "Unknown error"}`,
        channel: channelType,
        payload: { payload }
      });
    }
  },

  /**
   * Send an outgoing message via the registered communication channels
   */
  async sendOutgoingMessage(options: {
    organizationId: string;
    channelId: string;
    conversationId: string;
    recipientId: string;
    content: string;
    isAiGenerated?: boolean;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const { organizationId, channelId, conversationId, recipientId, content, isAiGenerated = false, metadata = {} } = options;

    try {
      // Find channel config and connections
      const channel = await db.query.communicationChannels.findFirst({
        where: and(
          eq(communicationChannels.organizationId, organizationId),
          eq(communicationChannels.id, channelId)
        )
      });

      if (!channel) throw new Error("Channel configuration not found");

      const connection = await db.query.channelConnections.findFirst({
        where: and(
          eq(channelConnections.organizationId, organizationId),
          eq(channelConnections.channelId, channelId)
        )
      });

      const config = connection ? (connection.credentials as Record<string, any>) : {};

      // Get messaging provider
      const provider = ProviderRegistry.getMessagingProvider(channel.type);
      if (!provider) throw new Error(`No provider registered for channel type: ${channel.type}`);

      // Save outgoing message to DB logs first (as queued status)
      const senderVal = isAiGenerated ? "assistant" : "staff";
      
      const [aiMsg] = await db
        .insert(conversationMessages)
        .values({
          organizationId,
          conversationId,
          sender: senderVal,
          content,
          confidenceScore: "1.0"
        })
        .returning();

      const [chanMsg] = await db
        .insert(channelMessages)
        .values({
          organizationId,
          channelId,
          conversationId,
          direction: "outgoing",
          senderId: channel.type === "email" ? (config.user || "nexx@assistant.com") : (config.fromNumber || "business-handle"),
          recipientId,
          content,
          status: "queued",
          metadata: { isAiGenerated, ...metadata }
        })
        .returning();

      // Trigger provider API call
      const res = await provider.sendMessage(organizationId, config, recipientId, content);

      // Update message delivery status
      await db
        .update(channelMessages)
        .set({
          status: res.success ? "sent" : "failed",
          externalId: res.externalId,
          metadata: { ...chanMsg.metadata as any, error: res.errorMessage }
        })
        .where(eq(channelMessages.id, chanMsg.id));

      // Update unified threads log
      const thread = await db.query.inboxThreads.findFirst({
        where: and(
          eq(inboxThreads.organizationId, organizationId),
          eq(inboxThreads.conversationId, conversationId)
        )
      });

      if (thread) {
        await db
          .update(inboxThreads)
          .set({ 
            lastMessageId: chanMsg.id, 
            unreadCount: 0, // Outgoing message clears unread state
            updatedAt: new Date() 
          })
          .where(eq(inboxThreads.id, thread.id));
      }

    } catch (e: any) {
      console.error("[Omnichannel Router] Error sending outgoing message:", e);
      throw e;
    }
  }
};
