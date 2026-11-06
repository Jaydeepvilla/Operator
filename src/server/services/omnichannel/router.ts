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
import { eq, and, or, desc, sql, gte } from "drizzle-orm";
import { WebhookMessagePayload, ProviderRegistry } from "./types";
import { orchestratorService } from "../orchestrator";
import { crmDeduplicationService } from "../crm/deduplication";
import { MessagingSecurityService } from "../messaging-security";
import { resolveWhatsAppResponse } from "../whatsapp";
import { 
  whatsAppStateMachine, 
  whatsAppActionDispatcher, 
  dynamicExperienceEngine, 
  CustomerPersonalizationContext, 
  detectLanguage, 
  whatsAppMetricsService, 
  WhatsAppReplyPayload 
} from "../whatsapp";
import { businessContextService } from "../business-context";

// Register providers
import "./vonage";
import "./sinch";
import "./resend";
import "./whatsapp";

// In-memory cache for channel credentials to eliminate redundant DB calls on outbound messages
const channelConfigCache = new Map<string, { channel: any; connection: any; expiresAt: number }>();
const CHANNEL_CONFIG_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

// In-memory cache for channel AI settings
const channelSettingsCache = new Map<string, { data: any; expiresAt: number }>();

// In-memory cache for active thread IDs per contact to skip redundant SELECT/INSERT on continuous chat
const activeThreadCache = new Map<string, { conversationId: string; threadId: string; expiresAt: number }>();
const ACTIVE_THREAD_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// In-memory deduplication cache for incoming webhook messages
const processedMessageIds = new Map<string, number>();

export const omnichannelRouter = {
  /**
   * Clear cached channel configuration
   */
  invalidateChannelCache(organizationId?: string, channelId?: string) {
    if (organizationId && channelId) {
      channelConfigCache.delete(`${organizationId}:${channelId}`);
      channelSettingsCache.delete(`${organizationId}:${channelId}`);
    } else {
      channelConfigCache.clear();
      channelSettingsCache.clear();
      activeThreadCache.clear();
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
      const t_start = Date.now();

      // Deduplication check: prevent duplicate webhook event processing (<1ms)
      if (externalMessageId) {
        if (processedMessageIds.has(externalMessageId)) {
          console.log(`[Omnichannel Router] Suppressed duplicate incoming message: ${externalMessageId}`);
          return;
        }
        processedMessageIds.set(externalMessageId, Date.now());
        if (processedMessageIds.size > 2000) {
          const threshold = Date.now() - 10 * 60 * 1000;
          for (const [k, v] of processedMessageIds) {
            if (v < threshold) processedMessageIds.delete(k);
          }
        }
      }

      // 0. Security Inbound Checks: process opt-out keywords (TCPA/GDPR) & block admin execution
      MessagingSecurityService.processInboundOptOut({
        organizationId,
        recipient: senderUserId,
        content,
      });

      MessagingSecurityService.assertInboundMessageCannotPerformAdminAction({
        content,
      });

      // 1. Concurrently resolve unified Contact/Lead profile and prefetch business context
      const businessPromise = (channelType === "whatsapp")
        ? businessContextService.getContext(organizationId)
        : Promise.resolve(null as any);

      const [{ leadProfileId, isNew }, business] = await Promise.all([
        crmDeduplicationService.resolveUnifiedProfile({
          organizationId,
          channelType,
          senderUserId,
          senderName,
        }),
        businessPromise,
      ]);

      if (!isNew) {
        // Non-blocking conversation count increment (no redundant SELECT)
        db.update(leadProfiles)
          .set({ 
            conversationCount: sql`${leadProfiles.conversationCount} + 1`,
            updatedAt: new Date()
          })
          .where(eq(leadProfiles.id, leadProfileId))
          .catch(() => {});
      }

      // 2. Find or Create Conversation linked to this lead and channel with in-memory caching
      const threadCacheKey = `${organizationId}:${channelId}:${senderUserId}`;
      let cachedThread = activeThreadCache.get(threadCacheKey);
      let conversationId: string;
      let threadId: string;
      let isThreadEscalated = false;
      let isThreadPaused = false;

      if (cachedThread && cachedThread.expiresAt > Date.now()) {
        conversationId = cachedThread.conversationId;
        threadId = cachedThread.threadId;
      } else {
        // Try to find an active conversation & thread for this specific lead profile
        let thread: any = null;
        if (leadProfileId) {
          const activeConv = await db.query.conversations.findFirst({
            where: and(
              eq(conversations.organizationId, organizationId),
              eq(conversations.leadProfileId, leadProfileId),
              eq(conversations.status, "active")
            ),
            orderBy: [desc(conversations.createdAt)],
          });
          if (activeConv) {
            thread = await db.query.inboxThreads.findFirst({
              where: and(
                eq(inboxThreads.organizationId, organizationId),
                eq(inboxThreads.conversationId, activeConv.id),
                eq(inboxThreads.channelId, channelId),
                eq(inboxThreads.status, "open")
              ),
            });
            if (thread) {
              conversationId = activeConv.id;
            }
          }
        }

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

          threadId = newThread.id;

          // Save thread participant asynchronously
          const participantName = senderName || `${channelType.toUpperCase()} User`;
          db.insert(inboxParticipants)
            .values({
              organizationId,
              threadId: threadId,
              participantType: "contact",
              participantId: leadProfileId,
              name: participantName
            })
            .catch(() => {});
        } else {
          conversationId = thread.conversationId;
          threadId = thread.id;
          isThreadEscalated = thread.assignedStaffId !== null;
          isThreadPaused = thread.aiAutonomy === "paused";
        }

        activeThreadCache.set(threadCacheKey, {
          conversationId,
          threadId,
          expiresAt: Date.now() + ACTIVE_THREAD_CACHE_TTL_MS,
        });
      }

      // 3. Save incoming message records and load conversation state concurrently in a single parallel batch
      const statePromise = (channelType === "whatsapp")
        ? whatsAppStateMachine.getState(organizationId, conversationId)
        : Promise.resolve(null as any);

      const [, [chanMsg], , state] = await Promise.all([
        db.insert(conversationMessages).values({
          organizationId,
          conversationId,
          sender: "user",
          content,
          confidenceScore: "1.0"
        }),
        db
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
          .returning(),
        db
          .update(inboxThreads)
          .set({ 
            unreadCount: sql`${inboxThreads.unreadCount} + 1`,
            updatedAt: new Date() 
          })
          .where(eq(inboxThreads.id, threadId))
          .catch(() => {}),
        statePromise,
      ]);

      // Update thread lastMessageId asynchronously without blocking message routing
      if (chanMsg?.id) {
        db.update(inboxThreads)
          .set({ lastMessageId: chanMsg.id })
          .where(eq(inboxThreads.id, threadId))
          .catch(() => {});
      }

      // 4. Resolve Channel settings from in-memory cache to check if AI responses are enabled
      const settingsKey = `${organizationId}:${channelId}`;
      let cachedSettings = channelSettingsCache.get(settingsKey);
      if (!cachedSettings || cachedSettings.expiresAt < Date.now()) {
        const found = await db.query.channelSettings.findFirst({
          where: and(
            eq(channelSettings.organizationId, organizationId),
            eq(channelSettings.channelId, channelId)
          )
        });
        cachedSettings = { data: found, expiresAt: Date.now() + 2 * 60 * 1000 };
        channelSettingsCache.set(settingsKey, cachedSettings);
      }

      const aiEnabled = cachedSettings.data ? cachedSettings.data.aiEnabled : true;

      // 5. Trigger AI process and reply if applicable
      if (aiEnabled && !isThreadEscalated && !isThreadPaused) {
        let replyContent = "";
        let intentKey = "general_inquiry";
        let citations: any[] = [];
        let shouldEscalate = false;
        let waInteractivePayload: any = undefined;
        let waRawBody: string | undefined = undefined;

        // Specialized WhatsApp Experience with State Machine, Action Dispatcher & Dynamic Menus
        if (channelType === "whatsapp") {
          try {
            const biz = business || await businessContextService.getContext(organizationId);
            const bizName = (biz.name && biz.name !== "Our Business")
              ? biz.name
              : "Operator";

            const interactiveId = (metadata?.interactiveId as string) || undefined;
            const lowerContent = (content || "").toLowerCase().trim();
            const convState = state || await whatsAppStateMachine.getState(organizationId, conversationId);

            let resolvedPayload: WhatsAppReplyPayload | null = null;

            // 1. Check for Greeting intent when user is IDLE
            const isGreeting = /^(hi|hello|hey|hola|kem\s*cho|namaste|hlo|helo|good\s*(morning|afternoon|evening)|start)$/i.test(lowerContent);
            if (isGreeting && convState.stage === "IDLE" && !interactiveId) {
              // Check for active upcoming appointment in DB only if returning customer
              let activeApt: any = null;
              if (!isNew) {
                try {
                  activeApt = await db.query.appointments.findFirst({
                    where: and(
                      eq(appointments.organizationId, organizationId),
                      eq(appointments.leadProfileId, leadProfileId),
                      eq(appointments.status, "confirmed"),
                      gte(appointments.startTime, new Date())
                    ),
                    orderBy: [desc(appointments.startTime)],
                    with: { service: true },
                  });
                } catch {}
              }

              const customerCtx: CustomerPersonalizationContext = {
                customerName: senderName && senderName !== "WhatsApp User" ? senderName : undefined,
                isReturning: !isNew,
                activeAppointment: activeApt ? {
                  id: activeApt.id,
                  serviceName: activeApt.service?.name || "Appointment",
                  startTime: activeApt.startTime,
                  formattedDate: new Date(activeApt.startTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
                  formattedTime: new Date(activeApt.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
                } : null,
                language: detectLanguage(content),
              };

              resolvedPayload = dynamicExperienceEngine.generateGreeting(biz, customerCtx);
              intentKey = "greeting";
            }

            // 2. Try Action Dispatcher (handles interactive button/list IDs and state shortcuts)
            if (!resolvedPayload) {
              resolvedPayload = await whatsAppActionDispatcher.dispatch({
                organizationId,
                conversationId,
                leadProfileId,
                senderPhone: senderUserId,
                senderName,
                rawText: content,
                interactiveId,
                business: biz,
              });
              if (resolvedPayload) {
                intentKey = interactiveId || "action_executed";
              }
            }

            // 3. Try standard safety, opt-out, and emergency rules
            if (!resolvedPayload) {
              const waContext = {
                business_name: bizName,
                phone: biz.phone || "+91 99135 37377",
                address: biz.address || "Main Office",
                maps_link: biz.website || "https://operator.nexxtechnologies.com/",
                hours_today: biz.businessHoursFormatted || "9:00 AM to 8:00 PM",
                hours_week: biz.businessHoursFormatted || "Mon-Sat: 9:00 AM - 8:00 PM, Sun: Closed",
                service_list: (biz.services || []).map((s: any) => `${s.name} (₹${s.price})`).join(", ") || "Consultation & Services",
                customer_name: senderName && senderName !== "WhatsApp User" ? senderName : undefined,
                available_services: (biz.services || []).map((s: any) => ({
                  id: s.id,
                  name: s.name,
                  price: s.price,
                  duration: s.duration,
                  description: s.description,
                })),
              };

              const waResolution = resolveWhatsAppResponse(content, waContext, new Date(), undefined, interactiveId);
              if (waResolution.matchedIntent !== "knowledge_gap") {
                resolvedPayload = waResolution.reply;
                intentKey = waResolution.matchedIntent;
                shouldEscalate = waResolution.requiresHandover;
              }
            }

            // 4. If payload was resolved, build native Meta interactive structure
            if (resolvedPayload) {
              waRawBody = resolvedPayload.body;
              replyContent = resolvedPayload.body;

              if (resolvedPayload.type === "interactive_buttons" && resolvedPayload.buttons && resolvedPayload.buttons.length > 0) {
                waInteractivePayload = {
                  type: "button",
                  header: resolvedPayload.header || bizName.slice(0, 60),
                  footer: resolvedPayload.footer || `${bizName} • 24/7 Digital Desk`.slice(0, 60),
                  buttons: resolvedPayload.buttons.slice(0, 3).map((b, idx) => ({
                    id: b.id || `btn_${idx}`,
                    title: b.title.slice(0, 20),
                  })),
                };
                replyContent += "\n\n" + resolvedPayload.buttons.map((b, i) => `${i + 1}️⃣ ${b.title}`).join("\n");
              } else if (resolvedPayload.type === "list") {
                waInteractivePayload = {
                  type: "list",
                  header: resolvedPayload.header || `${bizName} Menu`.slice(0, 60),
                  footer: resolvedPayload.footer || `${bizName} • 24/7 Digital Desk`.slice(0, 60),
                  listButton: (resolvedPayload.listButton || "Choose an option").slice(0, 20),
                  sections: resolvedPayload.listSections || [],
                };
                if (resolvedPayload.listRows && resolvedPayload.listRows.length > 0) {
                  replyContent += "\n\n*Options:*\n" + resolvedPayload.listRows.map(r => `• *${r.title}*${r.description ? ` - ${r.description}` : ""}`).join("\n");
                }
              }
            }
          } catch (waErr) {
            console.error("[Omnichannel Router] WhatsApp dynamic handler error, falling back to orchestrator:", waErr);
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
            idempotencyKey: externalMessageId ? `reply:${externalMessageId}` : undefined,
          }
        });

        if (channelType === "whatsapp") {
          whatsAppMetricsService.recordSample({
            organizationId,
            actionId: metadata?.interactiveId as string | undefined,
            isAiFallback: !waInteractivePayload && Boolean(replyContent),
            stageTimings: {
              t_webhook_arrival: t_start,
              t_action_executed: Date.now(),
            },
            totalDurationMs: Date.now() - t_start,
            timestamp: Date.now(),
          });
        }
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
      const isNav = Boolean(metadata?.interactive || metadata?.intent?.includes("menu") || metadata?.intent?.includes("location") || metadata?.intent?.includes("book"));
      const idemp = MessagingSecurityService.checkMessageIdempotency({
        organizationId,
        recipientId,
        content,
        idempotencyKey: metadata?.idempotencyKey as string | undefined,
        isNavigation: isNav,
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
            senderId: channel.type === "email" ? (config.user || "assistant@operator.nexxtechnologies.com") : (config.fromNumber || "business-handle"),
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

      // Concurrently update message delivery status, thread state, and outbound audit logs in background
      Promise.all([
        db
          .update(channelMessages)
          .set({
            status: deliveryStatus.status,
            externalId: res.externalId,
            metadata: { ...chanMsg.metadata as any, error: deliveryStatus.error }
          })
          .where(eq(channelMessages.id, chanMsg.id)),
        db
          .update(inboxThreads)
          .set({ 
            lastMessageId: chanMsg.id, 
            unreadCount: 0, // Outgoing message clears unread state
            updatedAt: new Date() 
          })
          .where(
            and(
              eq(inboxThreads.organizationId, organizationId),
              eq(inboxThreads.conversationId, conversationId)
            )
          )
          .catch(() => {}),
        db.insert(communicationLogs).values({
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
        }).catch(() => {})
      ]).catch((auditErr) => {
        console.error("[Omnichannel Router] Background post-send audit error:", auditErr);
      });

    } catch (e: any) {
      console.error("[Omnichannel Router] Error sending outgoing message:", e);
      throw e;
    }
  }
};
