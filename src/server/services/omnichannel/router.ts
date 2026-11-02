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

// In-memory cache for channel credentials to eliminate redundant DB calls on outbound messages
const channelConfigCache = new Map<string, { channel: any; connection: any; expiresAt: number }>();
const CHANNEL_CONFIG_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export const omnichannelRouter = {
  /**
   * Clear cached channel configuration
   */
  invalidateChannelCache(organizationId?: string, channelId?: string) {
    if (organizationId && channelId) {
      channelConfigCache.delete(`${organizationId}:${channelId}`);
    } else {
      channelConfigCache.clear();
    }
  },
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
        let waInteractivePayload: any = undefined;
        let waRawBody: string | undefined = undefined;

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

            const defaultBusinessName = (business.name && business.name !== "Nexx Technologies" && business.name !== "Our Business")
              ? business.name
              : "Operator";

            const waContext = {
              business_name: defaultBusinessName,
              phone: business.phone || "+91 99135 37377",
              address: business.address || "Main Office",
              maps_link: business.website || "https://operator.nexxtechnologies.com/",
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
              const rawBody = waResolution.reply.body;
              waRawBody = rawBody;

              // Build Native Interactive Payload for WhatsApp Cloud API
              if (waResolution.reply.type === "interactive_buttons" && waResolution.reply.buttons && waResolution.reply.buttons.length > 0) {
                waInteractivePayload = {
                  type: "button",
                  header: "Operator",
                  footer: "Operator • 24/7 Digital Desk",
                  buttons: waResolution.reply.buttons.slice(0, 3).map((b, idx) => ({
                    id: b.id || `btn_${idx}`,
                    title: b.title.slice(0, 20),
                  })),
                };
              } else if (waResolution.reply.type === "list") {
                const sections = (waResolution.reply as any).listSections && (waResolution.reply as any).listSections.length > 0
                  ? (waResolution.reply as any).listSections.map((sec: any) => ({
                      title: (sec.title || "Options").slice(0, 24),
                      rows: (sec.rows || []).slice(0, 10).map((r: any, rIdx: number) => ({
                        id: (r.id || `opt_${rIdx}`).slice(0, 200),
                        title: r.title.slice(0, 24),
                        description: r.description ? r.description.slice(0, 72) : undefined,
                      })),
                    }))
                  : [
                      {
                        title: "Select an Option",
                        rows: (waResolution.reply.listRows || []).slice(0, 10).map((r, idx) => ({
                          id: r.id || `opt_${idx}`,
                          title: r.title.slice(0, 24),
                          description: r.description ? r.description.slice(0, 72) : undefined,
                        })),
                      },
                    ];

                waInteractivePayload = {
                  type: "list",
                  header: "Operator Menu",
                  footer: "Operator • 24/7 Digital Desk",
                  listButton: (waResolution.reply.listButton || "Choose an option").slice(0, 20),
                  sections,
                };
              }

              // Also prepare clean text for DB storage / fallback channels
              replyContent = rawBody;
              if (waResolution.reply.buttons && waResolution.reply.buttons.length > 0) {
                replyContent += "\n\n" + waResolution.reply.buttons.map((b, i) => `${i + 1}️⃣ ${b.title}`).join("\n");
              } else if (waResolution.reply.listRows && waResolution.reply.listRows.length > 0) {
                replyContent += "\n\n*Options:*\n" + waResolution.reply.listRows.map(r => `• *${r.title}*${r.description ? ` - ${r.description}` : ""}`).join("\n");
              }
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
          content: waInteractivePayload ? (waRawBody || replyContent) : replyContent,
          isAiGenerated: true,
          metadata: {
            citations,
            intent: intentKey,
            isEscalated: shouldEscalate,
            confidenceScore: 0.98,
            interactive: waInteractivePayload,
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
      // Find channel config and connections with hot in-memory cache to eliminate DB roundtrip latency
      const cacheKey = `${organizationId}:${channelId}`;
      let cachedConfig = channelConfigCache.get(cacheKey);
      if (!cachedConfig || cachedConfig.expiresAt < Date.now()) {
        const [foundChannel, foundConnection] = await Promise.all([
          db.query.communicationChannels.findFirst({
            where: and(
              eq(communicationChannels.organizationId, organizationId),
              eq(communicationChannels.id, channelId)
            )
          }),
          db.query.channelConnections.findFirst({
            where: and(
              eq(channelConnections.organizationId, organizationId),
              eq(channelConnections.channelId, channelId)
            )
          })
        ]);
        cachedConfig = { channel: foundChannel, connection: foundConnection, expiresAt: Date.now() + CHANNEL_CONFIG_CACHE_TTL_MS };
        channelConfigCache.set(cacheKey, cachedConfig);
      }
      const { channel, connection } = cachedConfig;

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

      // High-performance dispatch: start sending immediately to minimize delivery delay
      const senderVal = isAiGenerated ? "assistant" : "staff";
      const sendPromise = provider.sendMessage(
        organizationId,
        config,
        recipientId,
        sanitizedContent,
        undefined,
        metadata?.interactive
      );

      // Concurrently persist message records to DB
      const dbLogsPromise = Promise.all([
        db
          .insert(conversationMessages)
          .values({
            organizationId,
            conversationId,
            sender: senderVal,
            content: sanitizedContent,
            confidenceScore: "1.0"
          })
          .returning(),
        db
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
          .returning()
      ]);

      const [res, [, [chanMsg]]] = await Promise.all([sendPromise, dbLogsPromise]);

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
