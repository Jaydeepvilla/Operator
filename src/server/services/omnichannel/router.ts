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
  communicationLogs,
  appointments
} from "../../db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { WebhookMessagePayload, ProviderRegistry } from "./types";
import { orchestratorService } from "../orchestrator";
import { crmDeduplicationService } from "../crm/deduplication";
import { MessagingSecurityService } from "../messaging-security";
import { resolveWhatsAppResponse } from "../whatsapp";
import { businessContextService } from "../business-context";

// Register providers
import "./vonage";
import "./sinch";
import "./resend";
import "./whatsapp";

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
      // 0. Security Inbound Checks: process opt-out keywords (TCPA/GDPR) & block admin execution
      MessagingSecurityService.processInboundOptOut({
        organizationId,
        recipient: senderUserId,
        content,
      });

      MessagingSecurityService.assertInboundMessageCannotPerformAdminAction({
        content,
      });

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
        let replyContent = "";
        let intentKey = "general_inquiry";
        let citations: any[] = [];
        let shouldEscalate = false;

        // Specialized WhatsApp Message Library integration
        if (channelType === "whatsapp") {
          try {
            const business = await businessContextService.getContext(organizationId);

            // Fetch past appointment history to check if customer has a real saved last_service
            let lastService: string | undefined = undefined;
            if (leadProfileId) {
              try {
                const pastApt = await db.query.appointments.findFirst({
                  where: and(
                    eq(appointments.organizationId, organizationId),
                    eq(appointments.leadProfileId, leadProfileId),
                    eq(appointments.status, "confirmed")
                  ),
                  orderBy: [desc(appointments.startTime)],
                  with: { service: true }
                });
                if (pastApt?.service?.name) {
                  lastService = pastApt.service.name;
                }
              } catch {}
            }

            const waContext = {
              business_name: business.name || "Nexx Technologies",
              phone: business.phone || "+91 99135 37377",
              address: business.address || "Main Office",
              maps_link: business.website || "https://nexxtechnologies.com",
              hours_today: "9:00 AM to 8:00 PM",
              hours_week: "Mon-Sat: 9:00 AM - 8:00 PM, Sun: Closed",
              service_list: (business.services || []).map(s => `${s.name} (₹${s.price})`).join(", ") || "Consultation & Services",
              customer_name: senderName && senderName !== "WhatsApp User" ? senderName : undefined,
              last_service: lastService,
            };

            const waResolution = resolveWhatsAppResponse(content, waContext, new Date());

            if (waResolution.matchedIntent !== "knowledge_gap") {
              intentKey = waResolution.matchedIntent;
              shouldEscalate = waResolution.requiresHandover;
              replyContent = waResolution.reply.body;

              // Format buttons or options cleanly
              if (waResolution.reply.buttons && waResolution.reply.buttons.length > 0) {
                replyContent += "\n\n" + waResolution.reply.buttons.map((b, i) => `${i + 1}️⃣ ${b.title}`).join("\n");
              } else if (waResolution.reply.listRows && waResolution.reply.listRows.length > 0) {
                replyContent += "\n\n*Options:*\n" + waResolution.reply.listRows.map(r => `• *${r.title}*${r.description ? ` - ${r.description}` : ""}`).join("\n");
              }

              // Record assistant message to conversationMessages
              await db.insert(conversationMessages).values({
                organizationId,
                conversationId,
                sender: "assistant",
                content: replyContent,
                confidenceScore: "0.98"
              });
            }
          } catch (waErr) {
            console.error("[Omnichannel Router] WhatsApp library fallback to orchestrator:", waErr);
          }
        }

        // If not matched to standard WhatsApp template or on knowledge_gap / other channels:
        if (!replyContent) {
          const aiResponse = await orchestratorService.processMessage({
            organizationId,
            conversationId,
            userMessage: content,
            metadata: { channelType }
          });
          replyContent = aiResponse.assistantMessage;
          intentKey = aiResponse.intent || "general_inquiry";
          citations = aiResponse.citations || [];
          shouldEscalate = aiResponse.isEscalated || false;
        }

        // Send reply back via provider with RAG citations & AI intent metadata
        await this.sendOutgoingMessage({
          organizationId,
          channelId,
          conversationId,
          recipientId: senderUserId,
          content: replyContent,
          isAiGenerated: true,
          metadata: {
            citations,
            intent: intentKey,
            isEscalated: shouldEscalate,
            confidenceScore: 0.98,
          }
        });
      }

      // Audit Log with sanitized credentials/tokens
      await db.insert(communicationLogs).values({
        organizationId,
        level: "info",
        message: `Successfully routed incoming ${channelType} message from ${senderUserId}`,
        channel: channelType,
        payload: MessagingSecurityService.sanitizeCommunicationLogPayload({ externalMessageId })
      });

    } catch (e: any) {
      console.error("[Omnichannel Router] Error routing incoming message:", e);
      await db.insert(communicationLogs).values({
        organizationId,
        level: "error",
        message: `Failed to route incoming ${channelType} message: ${e?.message || "Unknown error"}`,
        channel: channelType,
        payload: MessagingSecurityService.sanitizeCommunicationLogPayload({ payload })
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

      const connection = await db.query.channelConnections.findFirst({
        where: and(
          eq(channelConnections.organizationId, organizationId),
          eq(channelConnections.channelId, channelId)
        )
      });

      // 1. Channel Operationality Check
      MessagingSecurityService.assertChannelOperational({
        targetOrgId: organizationId,
        channel: channel
          ? {
              id: channel.id,
              organizationId: channel.organizationId,
              status: channel.status,
              connection: connection
                ? {
                    status: connection.status,
                    credentials: connection.credentials as Record<string, any>,
                  }
                : null,
            }
          : null,
      });

      if (!channel) throw new Error("Channel configuration not found");

      // 2. Opt-Out Enforcement
      MessagingSecurityService.assertNotOptedOut({
        organizationId,
        recipient: recipientId,
        isTransactional: metadata?.isTransactional === true,
      });

      // 3. Outbound Velocity & Spam Prevention
      MessagingSecurityService.enforceOutboundVelocityLimits({
        organizationId,
        recipient: recipientId,
      });

      // 4. Retry Deduplication
      const idemp = MessagingSecurityService.checkMessageIdempotency({
        organizationId,
        recipientId,
        content,
        idempotencyKey: metadata?.idempotencyKey as string | undefined,
      });
      if (idemp.isDuplicate) {
        console.info(`[Omnichannel Router] Suppressed duplicate message send for recipient ${recipientId}`);
        return;
      }

      // 5. Input Sanitization (strip XSS/malicious links) & Masking of Private Customer Info
      const inputCleaned = MessagingSecurityService.sanitizeUntrustedMessageInput(content, channel.type as any);
      const { sanitizedContent } = MessagingSecurityService.sanitizeOutboundMessageContent(inputCleaned);

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
          content: sanitizedContent,
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
          senderId: channel.type === "email" ? (config.user || "assistant@operator.ai") : (config.fromNumber || "business-handle"),
          recipientId,
          content: sanitizedContent,
          status: "queued",
          metadata: { isAiGenerated, ...metadata }
        })
        .returning();

      // Trigger provider API call
      const res = await provider.sendMessage(organizationId, config, recipientId, sanitizedContent);

      // Validate delivery status transition & prevent failed from reporting as delivered
      const nextStatus = MessagingSecurityService.validateMessageStateTransition(
        "queued",
        res.success ? "sent" : "failed",
        res.success,
        res.externalId
      );
      const deliveryStatus = MessagingSecurityService.updateMessageDeliveryStatus(nextStatus, {
        status: res.success ? "sent" : "failed",
        error: res.errorMessage
      });

      // Update message delivery status
      await db
        .update(channelMessages)
        .set({
          status: deliveryStatus.status,
          externalId: res.externalId,
          metadata: { ...chanMsg.metadata as any, error: deliveryStatus.error }
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

      // Log outbound event with credential masking
      await db.insert(communicationLogs).values({
        organizationId,
        level: res.success ? "info" : "error",
        message: res.success
          ? `Dispatched outgoing ${channel.type} message to ${recipientId}`
          : `Failed to dispatch outgoing ${channel.type} message to ${recipientId}: ${res.errorMessage}`,
        channel: channel.type,
        payload: MessagingSecurityService.sanitizeCommunicationLogPayload({
          recipientId,
          externalId: res.externalId,
          status: deliveryStatus.status,
          error: deliveryStatus.error,
        }),
      });

    } catch (e: any) {
      console.error("[Omnichannel Router] Error sending outgoing message:", e);
      throw e;
    }
  }
};
