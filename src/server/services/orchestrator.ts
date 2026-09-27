import { conversationsRepository } from "../repositories/conversations";
import { messagesRepository } from "../repositories/messages";
import { sessionsRepository } from "../repositories/sessions";
import { leadsRepository } from "../repositories/leads";
import { appointmentsRepository } from "../repositories/appointments";
import { servicesRepository } from "../repositories/services";
import { intentService } from "./intent";
import { ragService } from "./rag";
import { qualificationService } from "./qualification";
import { promptService } from "./prompt";
import { escalationService } from "./escalation";
import { scoringService } from "./scoring";
import { memoryService } from "./memory";
import { llmRegistry, setLLMFallbackListener } from "./llm";
import { businessContextService } from "./business-context";
import { actionEngine, DynamicAction } from "./action-engine";
import { idempotencyManager } from "./idempotency";
import { db } from "../db";
import { 
  conversationEvents, 
  conversations,
  services, 
  staffMembers, 
  serviceAssignments, 
  appointments 
} from "../db/schema";
import { organizationRepository } from "../repositories/organization";
import { parseNaturalDateTime, DateParseResult } from "../../lib/date";
import { identityResolverService } from "./identity";
import { crmDeduplicationService } from "./crm/deduplication";
import { bookingService } from "./booking";
import { availabilityService } from "./availability";
import { eq, and, desc } from "drizzle-orm";

export interface OrchestratorInput {
  organizationId: string;
  conversationId?: string; // Optional: will look up or create
  userMessage: string;
  metadata?: Record<string, any>;
  clientMessageId?: string;
}

export interface OrchestratorResult {
  conversationId: string;
  assistantMessage: string;
  citations: any[];
  intent: string;
  confidence: number;
  entities: Record<string, any>;
  actions: DynamicAction[];
  isEscalated: boolean;
}

// Dialog slot selection parsing helper
function parseSlotSelection(message: string, suggestedSlots: any[]) {
  const lower = message.toLowerCase();
  for (const slot of suggestedSlots) {
    const timeVal = slot.startTime; // e.g. "10:00"
    const hour = parseInt(timeVal.split(":")[0], 10);
    const hour12 = hour > 12 ? hour - 12 : hour;
    const isPm = hour >= 12;
    const amPmStr = isPm ? "pm" : "am";

    if (
      lower.includes(timeVal) ||
      lower.includes(`${hour12} ${amPmStr}`) ||
      lower.includes(`${hour12}${amPmStr}`) ||
      lower.includes(`${hour} ${amPmStr}`) ||
      lower.includes(`${hour}${amPmStr}`)
    ) {
      return slot;
    }
  }
  
  // Direct fallback match if they just type the hour number
  for (const slot of suggestedSlots) {
    const timeVal = slot.startTime;
    const hourVal = timeVal.split(":")[0];
    if (lower === hourVal || lower.trim() === parseInt(hourVal, 10).toString()) {
      return slot;
    }
  }
  
  return null;
}

/**
 * Parses the intended appointment date using the canonical natural-language parser.
 */
function parseDateFromMessage(message: string, timezone = "UTC", now = new Date()): DateParseResult {
  return parseNaturalDateTime(message, { timezone, now });
}

export const orchestratorService = {
  async processMessage(input: OrchestratorInput): Promise<OrchestratorResult> {
    const { organizationId, userMessage, metadata = {}, clientMessageId } = input;

    // Idempotency: Deduplicate concurrent or repeated clicks
    const idempotencyKey = idempotencyManager.generateKey(
      organizationId,
      input.conversationId,
      userMessage,
      clientMessageId
    );

    return idempotencyManager.execute(idempotencyKey, async () => {
      // 0. Load real business context and capability discovery
      const business = await businessContextService.getContext(organizationId);
      const timezone = business.timezone || "UTC";

      // LEARNING SIGNAL: Wire up LLM fallback tracking for this request
      setLLMFallbackListener((signal) => {
        db.insert(conversationEvents).values({
          organizationId,
          conversationId: input.conversationId || "unknown",
          eventType: "llm_fallback",
          payload: signal,
        }).catch(() => {}); // Non-blocking
      });

      // 1. Resolve or Create Conversation
      const conversationId = input.conversationId;
      let conversation = conversationId ? await conversationsRepository.findById(conversationId) : null;
      let activeConversationId: string;

      if (!conversation) {
        // Create new lead profile first
        const leadProfile = await leadsRepository.createProfile({
          organizationId,
          status: "New",
          leadScore: 0,
        });

        // Create conversation
        const newConv = await conversationsRepository.create({
          organizationId,
          leadProfileId: leadProfile.id,
          status: "active",
          metadata,
        });

        activeConversationId = newConv.id;
        conversation = newConv;

        // Event log
        await db.insert(conversationEvents).values({
          organizationId,
          conversationId: activeConversationId,
          eventType: "session_started",
          payload: { leadProfileId: leadProfile.id },
        });
      } else {
        activeConversationId = conversationId!;
      }

      let leadProfileId = conversation.leadProfileId!;

      // 2. Fetch or Create Session Context State
      let session = await sessionsRepository.findByConversation(activeConversationId);
      let sessionState = (session?.state || {
        currentQuestionId: null,
        answersCollected: {},
        contactInfo: {},
        fallbackCount: 0,
        conversationContext: {},
      }) as any;

      if (!sessionState.conversationContext) {
        sessionState.conversationContext = {};
      }

      // Check for existing active appointments
      let hasActiveAppointment = false;
      try {
        const existingApts = await db
          .select({ id: appointments.id })
          .from(appointments)
          .where(
            and(
              eq(appointments.organizationId, organizationId),
              eq(appointments.leadProfileId, leadProfileId),
              eq(appointments.status, "confirmed")
            )
          )
          .limit(1);
        hasActiveAppointment = existingApts.length > 0;
      } catch {}

      // 3. Save User Message
      await messagesRepository.create({
        organizationId,
        conversationId: activeConversationId,
        sender: "user",
        content: userMessage,
      });

      // 4. Load Conversation State (memory & history)
      const convState = await memoryService.getConversationState(activeConversationId);

      // 5. Detect Intent with Contextual Resolution (handles entity extraction & follow-ups)
      const intentResult = await intentService.detectIntent(userMessage, {
        activeEntity: sessionState.conversationContext.activeEntity || null,
        lastIntent: sessionState.conversationContext.lastIntent || null,
        availableServices: business.services,
        turnCount: convState.turnCount,
      });

      // Update active entity if a new one was detected
      if (intentResult.entity) {
        sessionState.conversationContext.activeEntity = intentResult.entity;
      }

      // Save Intent event
      await db.insert(conversationEvents).values({
        organizationId,
        conversationId: activeConversationId,
        eventType: "intent_detected",
        payload: {
          intent: intentResult.intent,
          confidence: intentResult.confidence,
          entity: intentResult.entity,
        },
      });

      // LEARNING SIGNAL: Low confidence intent
      if (intentResult.confidence < 0.6) {
        await db.insert(conversationEvents).values({
          organizationId,
          conversationId: activeConversationId,
          eventType: "low_confidence_intent",
          payload: {
            intent: intentResult.intent,
            confidence: intentResult.confidence,
            userMessage: userMessage.substring(0, 200),
          },
        }).catch(() => {});
      }

      // 6. Check for emergencies or human escalation triggers
      const isEscalationTrigger =
        intentResult.intent === "emergency" ||
        intentResult.intent === "human_request";

      if (isEscalationTrigger || conversation.status === "escalated") {
        const reason = intentResult.intent === "emergency" ? "emergency" : "user_request";
        const notes = isEscalationTrigger ? `User message triggered escalation: "${userMessage}"` : undefined;
        
        await escalationService.triggerEscalation(
          organizationId,
          activeConversationId,
          reason,
          notes
        );

        const responseText = reason === "emergency"
          ? `I understand this is an emergency. If you are experiencing severe pain or need urgent medical attention, please go to the nearest emergency room or dial emergency services immediately. I have notified the team at ${business.name} to contact you right away.`
          : `I have notified our staff at ${business.name} to take over. A team member will look through our chat history and assist you as soon as possible. Is there any additional information I can capture for them?`;

        const dynamicActions = actionEngine.determineNextBestActions(business, {
          intent: intentResult.intent,
          isEscalated: true,
          lastUserMessage: userMessage,
        });

        // Save assistant message
        await messagesRepository.create({
          organizationId,
          conversationId: activeConversationId,
          sender: "assistant",
          content: responseText,
          intentDetected: intentResult.intent,
          confidenceScore: "1.0",
        });

        // Update session
        sessionState.conversationContext.lastIntent = intentResult.intent;
        sessionState.conversationContext.lastAssistantMessage = responseText;
        await sessionsRepository.upsert({
          organizationId,
          conversationId: activeConversationId,
          state: sessionState,
        });

        return {
          conversationId: activeConversationId,
          assistantMessage: responseText,
          citations: [],
          intent: intentResult.intent,
          confidence: intentResult.confidence,
          entities: intentResult.entity ? { [intentResult.entity.type]: intentResult.entity.name } : {},
          actions: dynamicActions,
          isEscalated: true,
        };
      }

      // --- INTERCEPT APPOINTMENT RESCHEDULING FLOW ---
      if (intentResult.intent === "reschedule" || sessionState.reschedulingFlow) {
        if (!sessionState.reschedulingFlow) {
          const activeApts = await db
            .select()
            .from(appointments)
            .where(
              and(
                eq(appointments.organizationId, organizationId),
                eq(appointments.leadProfileId, leadProfileId),
                eq(appointments.status, "confirmed")
              )
            )
            .orderBy(desc(appointments.startTime));

          if (activeApts.length > 0) {
            sessionState.reschedulingFlow = {
              appointmentId: activeApts[0].id,
              stage: "collecting_time",
            };
          }
        }

        const activeAptId = sessionState.reschedulingFlow?.appointmentId;
        const activeApt = activeAptId ? await appointmentsRepository.findById(activeAptId).then(r => r?.appointment) : null;

        if (!activeApt) {
          sessionState.reschedulingFlow = null;
          const responseText = "I couldn't find any confirmed upcoming appointments listed under your profile to reschedule. Would you like me to help you book a new appointment instead?";
          
          const dynamicActions = actionEngine.determineNextBestActions(business, {
            intent: "reschedule",
            hasActiveAppointment: false,
            lastUserMessage: userMessage,
          });

          await messagesRepository.create({
            organizationId,
            conversationId: activeConversationId,
            sender: "assistant",
            content: responseText,
            intentDetected: "reschedule",
            confidenceScore: "0.95",
          });
          sessionState.conversationContext.lastIntent = "reschedule";
          sessionState.conversationContext.lastAssistantMessage = responseText;
          await sessionsRepository.upsert({ organizationId, conversationId: activeConversationId, state: sessionState });
          return {
            conversationId: activeConversationId,
            assistantMessage: responseText,
            citations: [],
            intent: "reschedule",
            confidence: 0.95,
            entities: {},
            actions: dynamicActions,
            isEscalated: false,
          };
        }

        if (sessionState.reschedulingFlow.stage === "collecting_time") {
          const parseResult = parseDateFromMessage(userMessage, timezone);

          if (!parseResult.success) {
            let responseText = "Could you please specify which date and time you would like to reschedule to (e.g. 'tomorrow', 'next Friday at 2 PM', or 'August 20')?";
            if (parseResult.code === "INVALID_DATE" || parseResult.code === "INVALID_TIME") {
              responseText = "That date doesn't exist on the calendar. Could you please specify a valid date (like 'tomorrow' or 'next Friday')?";
            } else if (parseResult.suggestedClarification) {
              responseText = parseResult.suggestedClarification;
            }

            const dynamicActions = actionEngine.determineNextBestActions(business, {
              intent: "reschedule",
              hasActiveAppointment: true,
              lastUserMessage: userMessage,
            });

            await messagesRepository.create({
              organizationId,
              conversationId: activeConversationId,
              sender: "assistant",
              content: responseText,
              intentDetected: "reschedule",
              confidenceScore: "0.95",
            });
            sessionState.conversationContext.lastIntent = "reschedule";
            sessionState.conversationContext.lastAssistantMessage = responseText;
            await sessionsRepository.upsert({ organizationId, conversationId: activeConversationId, state: sessionState });
            return {
              conversationId: activeConversationId,
              assistantMessage: responseText,
              citations: [],
              intent: "reschedule",
              confidence: 0.95,
              entities: {},
              actions: dynamicActions,
              isEscalated: false,
            };
          }

          const targetDate = parseResult.date;
          const dateStr = parseResult.isoDate;
          const dateLabel = parseResult.interpretation;
          
          const openSlots = await availabilityService.getAvailableSlots(
            organizationId,
            activeApt.serviceId!,
            dateStr,
            activeApt.staffMemberId!
          );

          const parsedSelection = parseSlotSelection(userMessage, openSlots);

          if (parsedSelection) {
            const [sh, sm] = parsedSelection.startTime.split(":").map(Number);
            const newStart = new Date(targetDate);
            newStart.setHours(sh, sm, 0, 0);

            await bookingService.rescheduleAppointment(activeApt.id, newStart, "Client requested reschedule via AI", "user");
            sessionState.reschedulingFlow = null;

            const responseText = `Great! I have successfully rescheduled your appointment to ${dateLabel} at ${parsedSelection.startTime}. A confirmation has been updated.`;
            
            const dynamicActions = actionEngine.determineNextBestActions(business, {
              intent: "reschedule",
              hasActiveAppointment: true,
              lastUserMessage: userMessage,
            });

            await messagesRepository.create({
              organizationId,
              conversationId: activeConversationId,
              sender: "assistant",
              content: responseText,
              intentDetected: "reschedule",
              confidenceScore: "0.98",
            });
            sessionState.conversationContext.lastIntent = "reschedule";
            sessionState.conversationContext.lastAssistantMessage = responseText;
            await sessionsRepository.upsert({ organizationId, conversationId: activeConversationId, state: sessionState });
            return {
              conversationId: activeConversationId,
              assistantMessage: responseText,
              citations: [],
              intent: "reschedule",
              confidence: 0.98,
              entities: {},
              actions: dynamicActions,
              isEscalated: false,
            };
          } else {
            sessionState.reschedulingFlow.suggestedSlots = openSlots;
            
            let responseText = "Sure, I can help you reschedule. ";
            if (openSlots.length > 0) {
              const listStr = openSlots.slice(0, 3).map((s) => s.startTime).join(", ");
              responseText += `Here are available times for ${dateLabel}: ${listStr}. Do any of these work?`;
            } else {
              responseText += `We have no open slots for ${dateLabel}. Let me notify our support staff to contact you directly.`;
              sessionState.reschedulingFlow = null;
              await escalationService.triggerEscalation(organizationId, activeConversationId, "unknown_info", "No slots for reschedule");
            }

            const dynamicActions = actionEngine.determineNextBestActions(business, {
              intent: "reschedule",
              hasActiveAppointment: true,
              lastUserMessage: userMessage,
            });

            await messagesRepository.create({
              organizationId,
              conversationId: activeConversationId,
              sender: "assistant",
              content: responseText,
              intentDetected: "reschedule",
              confidenceScore: "0.95",
            });
            sessionState.conversationContext.lastIntent = "reschedule";
            sessionState.conversationContext.lastAssistantMessage = responseText;
            await sessionsRepository.upsert({ organizationId, conversationId: activeConversationId, state: sessionState });
            return {
              conversationId: activeConversationId,
              assistantMessage: responseText,
              citations: [],
              intent: "reschedule",
              confidence: 0.95,
              entities: {},
              actions: dynamicActions,
              isEscalated: false,
            };
          }
        }
      }

      // --- INTERCEPT APPOINTMENT CANCELLATION FLOW ---
      if (intentResult.intent === "cancel") {
        const activeApts = await db
          .select()
          .from(appointments)
          .where(
            and(
              eq(appointments.organizationId, organizationId),
              eq(appointments.leadProfileId, leadProfileId),
              eq(appointments.status, "confirmed")
            )
          );

        const activeApt = activeApts[0];

        if (activeApt) {
          await bookingService.cancelAppointment(activeApt.id, "Client requested cancellation via AI", "user");
          const responseText = "I have cancelled your upcoming appointment as requested. Let me know if you would like to book a new appointment in the future.";
          
          const dynamicActions = actionEngine.determineNextBestActions(business, {
            intent: "cancel",
            hasActiveAppointment: false,
            lastUserMessage: userMessage,
          });

          await messagesRepository.create({
            organizationId,
            conversationId: activeConversationId,
            sender: "assistant",
            content: responseText,
            intentDetected: "cancel",
            confidenceScore: "0.98",
          });
          sessionState.conversationContext.lastIntent = "cancel";
          sessionState.conversationContext.lastAssistantMessage = responseText;
          await sessionsRepository.upsert({ organizationId, conversationId: activeConversationId, state: sessionState });
          return {
            conversationId: activeConversationId,
            assistantMessage: responseText,
            citations: [],
            intent: "cancel",
            confidence: 0.98,
            entities: {},
            actions: dynamicActions,
            isEscalated: false,
          };
        } else {
          const responseText = "I couldn't find any active appointments under your profile to cancel. Let me know if you want to book a new one!";
          
          const dynamicActions = actionEngine.determineNextBestActions(business, {
            intent: "cancel",
            hasActiveAppointment: false,
            lastUserMessage: userMessage,
          });

          await messagesRepository.create({
            organizationId,
            conversationId: activeConversationId,
            sender: "assistant",
            content: responseText,
            intentDetected: "cancel",
            confidenceScore: "0.95",
          });
          sessionState.conversationContext.lastIntent = "cancel";
          sessionState.conversationContext.lastAssistantMessage = responseText;
          await sessionsRepository.upsert({ organizationId, conversationId: activeConversationId, state: sessionState });
          return {
            conversationId: activeConversationId,
            assistantMessage: responseText,
            citations: [],
            intent: "cancel",
            confidence: 0.95,
            entities: {},
            actions: dynamicActions,
            isEscalated: false,
          };
        }
      }

      // --- INTERCEPT APPOINTMENT BOOKING STATE MACHINE FLOW ---
      if (intentResult.intent === "booking" || sessionState.bookingFlow) {
        if (!sessionState.bookingFlow) {
          const allServices = business.services;
          const matchingService = allServices.find((s) =>
            userMessage.toLowerCase().includes(s.name.toLowerCase())
          ) || (intentResult.entity?.name ? allServices.find(s => s.name.toLowerCase() === intentResult.entity?.name?.toLowerCase()) : null);

          if (matchingService) {
            sessionState.bookingFlow = {
              serviceId: matchingService.id,
              serviceName: matchingService.name,
              stage: "collecting_time",
            };
          } else if (allServices.length > 0) {
            sessionState.bookingFlow = {
              serviceId: allServices[0].id,
              serviceName: allServices[0].name,
              stage: "collecting_service",
            };
          } else {
            // Business has NO services configured for booking! Honest fallback
            const responseText = `We do not currently have services configured for direct online booking at ${business.name}. Please contact our front desk at ${business.phone || 'our team'} to schedule.`;
            const dynamicActions = actionEngine.determineNextBestActions(business, {
              intent: "booking",
              lastUserMessage: userMessage,
            });

            await messagesRepository.create({
              organizationId,
              conversationId: activeConversationId,
              sender: "assistant",
              content: responseText,
              intentDetected: "booking",
              confidenceScore: "0.95",
            });
            sessionState.conversationContext.lastIntent = "booking";
            sessionState.conversationContext.lastAssistantMessage = responseText;
            await sessionsRepository.upsert({ organizationId, conversationId: activeConversationId, state: sessionState });
            return {
              conversationId: activeConversationId,
              assistantMessage: responseText,
              citations: [],
              intent: "booking",
              confidence: 0.95,
              entities: {},
              actions: dynamicActions,
              isEscalated: false,
            };
          }
        }

        // Stage: Collecting Service
        if (sessionState.bookingFlow.stage === "collecting_service") {
          const allServices = business.services;
          const matching = allServices.find((s) =>
            userMessage.toLowerCase().includes(s.name.toLowerCase())
          );

          if (matching) {
            sessionState.bookingFlow.serviceId = matching.id;
            sessionState.bookingFlow.serviceName = matching.name;
            sessionState.bookingFlow.stage = "collecting_time";

            const responseText = `Great! I'd be happy to schedule your ${matching.name}. What day and time works best for you?`;
            const dynamicActions = actionEngine.determineNextBestActions(business, {
              intent: "booking",
              activeEntity: { type: "service", id: matching.id, name: matching.name },
              lastUserMessage: userMessage,
            });

            await messagesRepository.create({
              organizationId,
              conversationId: activeConversationId,
              sender: "assistant",
              content: responseText,
              intentDetected: "booking",
              confidenceScore: "0.95",
            });
            sessionState.conversationContext.lastIntent = "booking";
            sessionState.conversationContext.lastAssistantMessage = responseText;
            await sessionsRepository.upsert({ organizationId, conversationId: activeConversationId, state: sessionState });
            return {
              conversationId: activeConversationId,
              assistantMessage: responseText,
              citations: [],
              intent: "booking",
              confidence: 0.95,
              entities: { service: matching.name },
              actions: dynamicActions,
              isEscalated: false,
            };
          } else {
            const serviceList = allServices.map((s) => `${s.name} ($${s.price})`).join(", ");
            const responseText = `We offer the following services: ${serviceList}. Which one would you like to schedule?`;
            const dynamicActions = actionEngine.determineNextBestActions(business, {
              intent: "services",
              lastUserMessage: userMessage,
            });

            await messagesRepository.create({
              organizationId,
              conversationId: activeConversationId,
              sender: "assistant",
              content: responseText,
              intentDetected: "booking",
              confidenceScore: "0.92",
            });
            sessionState.conversationContext.lastIntent = "booking";
            sessionState.conversationContext.lastAssistantMessage = responseText;
            await sessionsRepository.upsert({ organizationId, conversationId: activeConversationId, state: sessionState });
            return {
              conversationId: activeConversationId,
              assistantMessage: responseText,
              citations: [],
              intent: "booking",
              confidence: 0.92,
              entities: {},
              actions: dynamicActions,
              isEscalated: false,
            };
          }
        }

        // Stage: Collecting Time Slots
        if (sessionState.bookingFlow.stage === "collecting_time") {
          const serviceId = sessionState.bookingFlow.serviceId;
          const parseResult = parseDateFromMessage(userMessage, timezone);

          if (!parseResult.success) {
            let responseText = `Could you please specify which day and time you'd like to book for ${sessionState.bookingFlow.serviceName} (e.g. 'tomorrow', 'next Friday at 2 PM', or 'August 20')?`;
            if (parseResult.code === "INVALID_DATE" || parseResult.code === "INVALID_TIME") {
              responseText = "That date doesn't exist on the calendar. Could you please specify a valid date (like 'tomorrow' or 'next Friday')?";
            } else if (parseResult.suggestedClarification) {
              responseText = parseResult.suggestedClarification;
            }

            const dynamicActions = actionEngine.determineNextBestActions(business, {
              intent: "booking",
              activeEntity: { type: "service", id: serviceId, name: sessionState.bookingFlow.serviceName },
              lastUserMessage: userMessage,
            });

            await messagesRepository.create({
              organizationId,
              conversationId: activeConversationId,
              sender: "assistant",
              content: responseText,
              intentDetected: "booking",
              confidenceScore: "0.95",
            });
            sessionState.conversationContext.lastIntent = "booking";
            sessionState.conversationContext.lastAssistantMessage = responseText;
            await sessionsRepository.upsert({ organizationId, conversationId: activeConversationId, state: sessionState });
            return {
              conversationId: activeConversationId,
              assistantMessage: responseText,
              citations: [],
              intent: "booking",
              confidence: 0.95,
              entities: { service: sessionState.bookingFlow.serviceName },
              actions: dynamicActions,
              isEscalated: false,
            };
          }

          const targetDate = parseResult.date;
          const dateStr = parseResult.isoDate;
          const dateLabel = parseResult.interpretation;
          sessionState.bookingFlow.targetDate = dateStr;
          sessionState.bookingFlow.dateLabel = dateLabel;

          const openSlots = await availabilityService.getAvailableSlots(
            organizationId,
            serviceId,
            dateStr
          );

          const parsedSelection = parseSlotSelection(userMessage, openSlots);

          if (parsedSelection) {
            sessionState.bookingFlow.slot = parsedSelection;
            const profile = await leadsRepository.findProfileById(leadProfileId);

            if (!profile?.name) {
              sessionState.bookingFlow.stage = "collecting_name";
              const responseText = "Perfect slot choice! May I please have your full name to reserve it?";
              await messagesRepository.create({
                organizationId,
                conversationId: activeConversationId,
                sender: "assistant",
                content: responseText,
                intentDetected: "booking",
                confidenceScore: "0.95",
              });
              sessionState.conversationContext.lastAssistantMessage = responseText;
              await sessionsRepository.upsert({ organizationId, conversationId: activeConversationId, state: sessionState });
              return {
                conversationId: activeConversationId,
                assistantMessage: responseText,
                citations: [],
                intent: "booking",
                confidence: 0.95,
                entities: { service: sessionState.bookingFlow.serviceName },
                actions: [],
                isEscalated: false,
              };
            } else if (!profile.email) {
              sessionState.bookingFlow.stage = "collecting_email";
              const responseText = `Thank you, ${profile.name}! What is your email address for the confirmation details?`;
              await messagesRepository.create({
                organizationId,
                conversationId: activeConversationId,
                sender: "assistant",
                content: responseText,
                intentDetected: "booking",
                confidenceScore: "0.95",
              });
              sessionState.conversationContext.lastAssistantMessage = responseText;
              await sessionsRepository.upsert({ organizationId, conversationId: activeConversationId, state: sessionState });
              return {
                conversationId: activeConversationId,
                assistantMessage: responseText,
                citations: [],
                intent: "booking",
                confidence: 0.95,
                entities: { service: sessionState.bookingFlow.serviceName },
                actions: [],
                isEscalated: false,
              };
            } else if (!profile.phone) {
              sessionState.bookingFlow.stage = "collecting_phone";
              const responseText = `Great! What is the best phone number to reach you at?`;
              await messagesRepository.create({
                organizationId,
                conversationId: activeConversationId,
                sender: "assistant",
                content: responseText,
                intentDetected: "booking",
                confidenceScore: "0.95",
              });
              sessionState.conversationContext.lastAssistantMessage = responseText;
              await sessionsRepository.upsert({ organizationId, conversationId: activeConversationId, state: sessionState });
              return {
                conversationId: activeConversationId,
                assistantMessage: responseText,
                citations: [],
                intent: "booking",
                confidence: 0.95,
                entities: { service: sessionState.bookingFlow.serviceName },
                actions: [],
                isEscalated: false,
              };
            } else {
              sessionState.bookingFlow.stage = "confirming";
            }
          } else {
            sessionState.bookingFlow.suggestedSlots = openSlots;
            
            let responseText = `Let's schedule your ${sessionState.bookingFlow.serviceName}. `;
            if (openSlots.length > 0) {
              const listStr = openSlots.slice(0, 3).map((s) => s.startTime).join(", ");
              responseText += `We have openings for ${dateLabel} at: ${listStr}. Do any of these work for you?`;
            } else {
              responseText += `We have no open slots for ${dateLabel}. I will flag this for our team so they can find an alternative time for you.`;
              sessionState.bookingFlow = null;
              await escalationService.triggerEscalation(organizationId, activeConversationId, "unknown_info", "No slots available");
            }

            const dynamicActions = actionEngine.determineNextBestActions(business, {
              intent: "booking",
              activeEntity: { type: "service", id: serviceId, name: sessionState.bookingFlow?.serviceName },
              lastUserMessage: userMessage,
            });

            await messagesRepository.create({
              organizationId,
              conversationId: activeConversationId,
              sender: "assistant",
              content: responseText,
              intentDetected: "booking",
              confidenceScore: "0.92",
            });
            sessionState.conversationContext.lastIntent = "booking";
            sessionState.conversationContext.lastAssistantMessage = responseText;
            await sessionsRepository.upsert({ organizationId, conversationId: activeConversationId, state: sessionState });
            return {
              conversationId: activeConversationId,
              assistantMessage: responseText,
              citations: [],
              intent: "booking",
              confidence: 0.92,
              entities: { service: sessionState.bookingFlow?.serviceName },
              actions: dynamicActions,
              isEscalated: false,
            };
          }
        }

        // Stage: Collecting Name
        if (sessionState.bookingFlow.stage === "collecting_name") {
          await leadsRepository.updateProfile(leadProfileId, { name: userMessage });
          sessionState.contactInfo.name = userMessage;

          const profile = await leadsRepository.findProfileById(leadProfileId);
          if (!profile?.email) {
            sessionState.bookingFlow.stage = "collecting_email";
            const responseText = `Thank you! What is your email address?`;
            await messagesRepository.create({
              organizationId,
              conversationId: activeConversationId,
              sender: "assistant",
              content: responseText,
              intentDetected: "booking",
              confidenceScore: "0.95",
            });
            sessionState.conversationContext.lastAssistantMessage = responseText;
            await sessionsRepository.upsert({ organizationId, conversationId: activeConversationId, state: sessionState });
            return {
              conversationId: activeConversationId,
              assistantMessage: responseText,
              citations: [],
              intent: "booking",
              confidence: 0.95,
              entities: {},
              actions: [],
              isEscalated: false,
            };
          } else if (!profile.phone) {
            sessionState.bookingFlow.stage = "collecting_phone";
            const responseText = `Got it! Lastly, what is your phone number for SMS reminders?`;
            await messagesRepository.create({
              organizationId,
              conversationId: activeConversationId,
              sender: "assistant",
              content: responseText,
              intentDetected: "booking",
              confidenceScore: "0.95",
            });
            sessionState.conversationContext.lastAssistantMessage = responseText;
            await sessionsRepository.upsert({ organizationId, conversationId: activeConversationId, state: sessionState });
            return {
              conversationId: activeConversationId,
              assistantMessage: responseText,
              citations: [],
              intent: "booking",
              confidence: 0.95,
              entities: {},
              actions: [],
              isEscalated: false,
            };
          } else {
            sessionState.bookingFlow.stage = "confirming";
          }
        }

        // Stage: Collecting Email
        if (sessionState.bookingFlow.stage === "collecting_email") {
          await leadsRepository.updateProfile(leadProfileId, { email: userMessage });
          sessionState.contactInfo.email = userMessage;

          const profile = await leadsRepository.findProfileById(leadProfileId);
          if (!profile?.phone) {
            sessionState.bookingFlow.stage = "collecting_phone";
            const responseText = `Got it! Lastly, what is your phone number for SMS reminders?`;
            await messagesRepository.create({
              organizationId,
              conversationId: activeConversationId,
              sender: "assistant",
              content: responseText,
              intentDetected: "booking",
              confidenceScore: "0.95",
            });
            sessionState.conversationContext.lastAssistantMessage = responseText;
            await sessionsRepository.upsert({ organizationId, conversationId: activeConversationId, state: sessionState });
            return {
              conversationId: activeConversationId,
              assistantMessage: responseText,
              citations: [],
              intent: "booking",
              confidence: 0.95,
              entities: {},
              actions: [],
              isEscalated: false,
            };
          } else {
            sessionState.bookingFlow.stage = "confirming";
          }
        }

        // Stage: Collecting Phone
        if (sessionState.bookingFlow.stage === "collecting_phone") {
          const currentProf = await leadsRepository.findProfileById(leadProfileId);
          const resolved = await identityResolverService.resolveCustomerIdentity({
            organizationId,
            phone: userMessage,
            name: currentProf?.name || sessionState.contactInfo.name,
            email: currentProf?.email || sessionState.contactInfo.email,
            channel: "widget",
          });

          if (resolved.leadProfileId !== leadProfileId) {
            await db
              .update(conversations)
              .set({ leadProfileId: resolved.leadProfileId })
              .where(eq(conversations.id, activeConversationId));

            if (leadProfileId) {
              await crmDeduplicationService.mergeProfiles(organizationId, resolved.leadProfileId, [leadProfileId]);
            }
            leadProfileId = resolved.leadProfileId;
          }

          sessionState.contactInfo.phone = userMessage;
          sessionState.bookingFlow.stage = "confirming";
        }

        // Stage: Confirming Creation
        if (sessionState.bookingFlow.stage === "confirming") {
          const slot = sessionState.bookingFlow.slot;
          const serviceId = sessionState.bookingFlow.serviceId;
          const profile = await leadsRepository.findProfileById(leadProfileId);

          const targetDate = sessionState.bookingFlow.targetDate
            ? new Date(sessionState.bookingFlow.targetDate)
            : new Date();
          const dateLabel = sessionState.bookingFlow.dateLabel || targetDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
          const [sh, sm] = slot.startTime.split(":").map(Number);
          const start = new Date(targetDate);
          start.setHours(sh, sm, 0, 0);

          const appointment = await bookingService.createAppointment({
            organizationId,
            leadProfileId,
            serviceId,
            staffMemberId: slot.staffId,
            startTime: start,
            customerName: profile?.name || "Guest Client",
            customerEmail: profile?.email,
            customerPhone: profile?.phone,
          });

          const bookedServiceName = sessionState.bookingFlow.serviceName;
          sessionState.bookingFlow = null;

          const responseText = `Wonderful! I have booked your appointment for ${dateLabel} at ${slot.startTime} with ${slot.staffName}. A confirmation has been recorded. We look forward to seeing you at ${business.name}!`;
          
          const dynamicActions = actionEngine.determineNextBestActions(business, {
            intent: "cancel",
            hasActiveAppointment: true,
            lastUserMessage: userMessage,
          });

          await messagesRepository.create({
            organizationId,
            conversationId: activeConversationId,
            sender: "assistant",
            content: responseText,
            intentDetected: "booking",
            confidenceScore: "0.98",
          });

          await leadsRepository.updateProfile(leadProfileId, { status: "Booked" });
          await db.insert(conversationEvents).values({
            organizationId,
            conversationId: activeConversationId,
            eventType: "lead_booked",
            payload: { appointmentId: appointment.id },
          });

          sessionState.conversationContext.lastIntent = "booking";
          sessionState.conversationContext.lastAssistantMessage = responseText;
          await sessionsRepository.upsert({ organizationId, conversationId: activeConversationId, state: sessionState });
          return {
            conversationId: activeConversationId,
            assistantMessage: responseText,
            citations: [],
            intent: "booking",
            confidence: 0.98,
            entities: { service: bookedServiceName },
            actions: dynamicActions,
            isEscalated: false,
          };
        }
      }

      // 7. RAG Knowledge Retrieval Context
      const ragContextResult = await ragService.retrieveContext(organizationId, userMessage);

      // Check if this query is a business-grounded query
      const isBusinessContextQuery = [
        "greeting",
        "business_info",
        "services",
        "service_details",
        "pricing",
        "hours",
        "location",
        "contact",
      ].includes(intentResult.intent);

      // HALLUCINATION GUARD: Only fallback to knowledge gap if query is NOT answered by the business profile/catalog
      if (
        !isBusinessContextQuery &&
        (!ragContextResult.contextText || ragContextResult.contextText.trim().length === 0)
      ) {
        await db.insert(conversationEvents).values({
          organizationId,
          conversationId: activeConversationId,
          eventType: "rag_empty_result",
          payload: {
            userMessage: userMessage.substring(0, 300),
            intent: intentResult.intent,
            confidence: intentResult.confidence,
          },
        }).catch(() => {});

        const fallbackResponse = `I don't have specific information about that in my knowledge base for ${business.name}. I'd be glad to connect you with our team who can answer in detail. Would you like me to collect your contact information for a callback?`;
        
        const dynamicActions = actionEngine.determineNextBestActions(business, {
          intent: "unknown",
          lastUserMessage: userMessage,
        });

        await messagesRepository.create({
          organizationId,
          conversationId: activeConversationId,
          sender: "assistant",
          content: fallbackResponse,
          intentDetected: intentResult.intent,
          confidenceScore: "0.50",
        });
        
        sessionState.conversationContext.lastIntent = intentResult.intent;
        sessionState.conversationContext.lastAssistantMessage = fallbackResponse;
        await sessionsRepository.upsert({ organizationId, conversationId: activeConversationId, state: sessionState });
        return {
          conversationId: activeConversationId,
          assistantMessage: fallbackResponse,
          citations: [],
          intent: intentResult.intent,
          confidence: intentResult.confidence,
          entities: {},
          actions: dynamicActions,
          isEscalated: false,
        };
      }

      // 8. Lead Qualification Flow
      const qualResult = await qualificationService.advanceFlow(
        organizationId,
        leadProfileId,
        sessionState,
        userMessage
      );
      sessionState = qualResult.updatedState;

      // 9. Build System Prompt with rich business grounding and conversation state
      const systemPrompt = await promptService.buildSystemPrompt({
        organizationId,
        ragContext: ragContextResult.contextText,
        nextQuestionText: qualResult.nextQuestionText,
        isEscalated: false,
        businessContext: business,
        conversationState: {
          activeEntity: sessionState.conversationContext.activeEntity,
          currentIntent: intentResult.intent,
          lastAssistantMessage: convState.lastAssistantMessage || undefined,
          turnCount: convState.turnCount,
        },
      });

      // Load recent message history for context
      const shortTermHistory = await memoryService.getShortTermHistory(activeConversationId, 6);

      const messagesToSend = [
        { role: "system" as const, content: systemPrompt },
        ...shortTermHistory,
      ];

      const provider = llmRegistry.getProvider();
      const completion = await provider.generateCompletion(messagesToSend, { temperature: 0.3 });

      // Sanitize repeated introductory greetings if conversation is active
      const assistantMessage = memoryService.sanitizeAssistantRepetition(
        completion.content.trim(),
        convState,
        business.name
      );

      // Determine next best actions dynamically based on real data
      const dynamicActions = actionEngine.determineNextBestActions(business, {
        intent: intentResult.intent,
        activeEntity: sessionState.conversationContext.activeEntity,
        hasActiveAppointment,
        lastUserMessage: userMessage,
      });

      // 10. Save assistant response
      await messagesRepository.create({
        organizationId,
        conversationId: activeConversationId,
        sender: "assistant",
        content: assistantMessage,
        intentDetected: intentResult.intent,
        confidenceScore: String(intentResult.confidence),
        citations: ragContextResult.citations.map((c) => ({
          docId: c.type,
          chunkId: c.id,
          name: c.name,
          content: c.content,
        })),
      });

      // 11. Update Session status and conversation context
      if (qualResult.allFinished) {
        await leadsRepository.updateProfile(leadProfileId, { status: "Qualified" });
        await db.insert(conversationEvents).values({
          organizationId,
          conversationId: activeConversationId,
          eventType: "lead_qualified",
          payload: { leadProfileId },
        });
      }

      sessionState.conversationContext.lastIntent = intentResult.intent;
      sessionState.conversationContext.lastAssistantMessage = assistantMessage;
      sessionState.conversationContext.lastActions = dynamicActions.map((a) => a.id);

      await sessionsRepository.upsert({
        organizationId,
        conversationId: activeConversationId,
        state: sessionState,
      });

      // 12. Run Lead Scoring & Summary (async/fast sync)
      await scoringService.calculateScore(organizationId, leadProfileId, activeConversationId).catch(() => {});
      await memoryService.generateAndSaveSummary(organizationId, activeConversationId).catch(() => {});

      return {
        conversationId: activeConversationId,
        assistantMessage,
        citations: ragContextResult.citations,
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        entities: sessionState.conversationContext.activeEntity
          ? { [sessionState.conversationContext.activeEntity.type]: sessionState.conversationContext.activeEntity.name }
          : {},
        actions: dynamicActions,
        isEscalated: false,
      };
    });
  },

  /**
   * P0 SAFEGUARD: 100% Side-Effect Free Simulation Pipeline.
   */
  async evaluateSimulation(input: {
    organizationId: string;
    userMessage: string;
    metadata?: Record<string, any>;
  }): Promise<{
    assistantMessage: string;
    citations: any[];
    intent: string;
    confidence: number;
    actions: DynamicAction[];
    isEscalated: boolean;
    isSimulated: true;
  }> {
    const { organizationId, userMessage } = input;
    const business = await businessContextService.getContext(organizationId);

    // 1. Detect Intent
    const intentResult = await intentService.detectIntent(userMessage, {
      availableServices: business.services,
    });

    // 2. Check Emergency / Escalation triggers
    const isEscalationTrigger =
      intentResult.intent === "emergency" ||
      intentResult.intent === "human_request";

    if (isEscalationTrigger) {
      const responseText =
        intentResult.intent === "emergency"
          ? `I understand this is an emergency. If you are experiencing severe pain or need urgent medical attention, please go to the nearest emergency room or dial emergency services immediately. I have flagged our team at ${business.name} to review this right away.`
          : `I have noted your request to speak with a human team member. Our staff at ${business.name} will review your inquiry and follow up promptly. How else can I assist you in the meantime?`;

      const actions = actionEngine.determineNextBestActions(business, {
        intent: intentResult.intent,
        isEscalated: true,
        lastUserMessage: userMessage,
      });

      return {
        assistantMessage: responseText,
        citations: [],
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        actions,
        isEscalated: true,
        isSimulated: true,
      };
    }

    // 3. RAG Retrieval
    const ragContextResult = await ragService.retrieveContext(organizationId, userMessage);

    // 4. Build System Prompt (Pure In-Memory)
    const systemPrompt = await promptService.buildSystemPrompt({
      organizationId,
      ragContext: ragContextResult.contextText,
      businessContext: business,
      isEscalated: false,
    });

    const messagesToSend = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userMessage },
    ];

    const provider = llmRegistry.getProvider();
    const completion = await provider.generateCompletion(messagesToSend, { temperature: 0.3 });

    const actions = actionEngine.determineNextBestActions(business, {
      intent: intentResult.intent,
      lastUserMessage: userMessage,
    });

    return {
      assistantMessage: completion.content.trim(),
      citations: ragContextResult.citations || [],
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      actions,
      isEscalated: false,
      isSimulated: true,
    };
  },
};
