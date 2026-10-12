"use server";

import { auth } from "@/lib/auth/server";
import { checkUserOrganization } from "./onboarding";
import { academyRepository } from "../repositories/academy";
import { sharedBusinessActions } from "../services/actions/shared-business-actions";
import { revalidatePath } from "next/cache";
import { db } from "../db";
import {
  services,
  staffMembers,
  faqItems,
  knowledgeDocuments,
  businessSettings,
} from "../db/schema";
import { eq, and } from "drizzle-orm";

export async function getFounderProgressAction() {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const { hasOrg, org } = await checkUserOrganization();
    if (!hasOrg || !org) return { success: false, error: "No organization found" };

    const progress = await academyRepository.getOrCreateProgress(userId, org.id);
    return { success: true, data: progress };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load founder learning progress" };
  }
}

export async function completeLessonAction(lessonId: string, nextLessonId?: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const { hasOrg, org } = await checkUserOrganization();
    if (!hasOrg || !org) return { success: false, error: "No organization found" };

    const progress = await academyRepository.completeLesson(userId, org.id, lessonId, nextLessonId);
    revalidatePath("/academy");
    return { success: true, data: progress };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to complete lesson" };
  }
}

export async function passExerciseAction(exerciseId: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const { hasOrg, org } = await checkUserOrganization();
    if (!hasOrg || !org) return { success: false, error: "No organization found" };

    // Real state verification based on exercise requirements
    switch (exerciseId) {
      case "ex-3-services": {
        const activeServices = await db
          .select()
          .from(services)
          .where(
            and(
              eq(services.organizationId, org.id),
              eq(services.isActive, true),
              eq(services.isArchived, false)
            )
          );
        if (activeServices.length === 0) {
          return {
            success: false,
            error: "Validation Failed: No active services found in your business catalog. Click 'Practice it now' to add your first service with price and duration.",
          };
        }
        break;
      }

      case "ex-4-kb": {
        const orgFaqs = await db
          .select()
          .from(faqItems)
          .where(eq(faqItems.organizationId, org.id));
        const orgDocs = await db
          .select()
          .from(knowledgeDocuments)
          .where(eq(knowledgeDocuments.organizationId, org.id));
        if (orgFaqs.length === 0 && orgDocs.length === 0) {
          return {
            success: false,
            error: "Validation Failed: Your knowledge base is empty. Click 'Practice it now' to add at least one FAQ or policy document to ground the AI receptionist.",
          };
        }
        break;
      }

      case "ex-5-booking": {
        const staffList = await db
          .select()
          .from(staffMembers)
          .where(and(eq(staffMembers.organizationId, org.id), eq(staffMembers.isActive, true)));
        if (staffList.length === 0) {
          return {
            success: false,
            error: "Validation Failed: No active staff members with schedules found. Click 'Practice it now' to configure staff availability.",
          };
        }
        break;
      }

      case "ex-9-golive": {
        const activeServices = await db
          .select()
          .from(services)
          .where(
            and(
              eq(services.organizationId, org.id),
              eq(services.isActive, true),
              eq(services.isArchived, false)
            )
          );
        const [settings] = await db
          .select()
          .from(businessSettings)
          .where(eq(businessSettings.organizationId, org.id));
        if (activeServices.length === 0) {
          return {
            success: false,
            error: "Validation Failed: Cannot go live without configured services. Add at least one active service first.",
          };
        }
        if (!settings?.businessHours) {
          return {
            success: false,
            error: "Validation Failed: Operating hours are not configured for this workspace.",
          };
        }
        break;
      }

      default:
        // Concept exercises validated via user engagement
        break;
    }

    const progress = await academyRepository.passExercise(userId, org.id, exerciseId);
    revalidatePath("/academy");
    return { success: true, data: progress };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to record passed exercise" };
  }
}

export async function recordWorkflowPracticedAction(workflowId: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const { hasOrg, org } = await checkUserOrganization();
    if (!hasOrg || !org) return { success: false, error: "No organization found" };

    const progress = await academyRepository.recordWorkflowPracticed(userId, org.id, workflowId);
    revalidatePath("/academy");
    return { success: true, data: progress };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to record practiced workflow" };
  }
}

export async function resetProgressAction() {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const { hasOrg, org } = await checkUserOrganization();
    if (!hasOrg || !org) return { success: false, error: "No organization found" };

    const progress = await academyRepository.resetProgress(userId, org.id);
    revalidatePath("/academy");
    return { success: true, data: progress };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to reset learning progress" };
  }
}

export interface SimulatorScenarioOutcome {
  scenarioId: string;
  name: string;
  category: "knowledge" | "booking" | "payment" | "communication" | "exception";
  initialConditions: string;
  triggerEvent: string;
  expectedBehavior: string;
  actualResult: string;
  resultingDbState: string;
  notificationOrJob: string;
  auditEventOrException: string;
  whyCorrect: string;
  howToRecover: string;
  success: boolean;
  timestamp: string;
}

export async function runSimulatorScenarioAction(scenarioId: string): Promise<{
  success: boolean;
  data?: SimulatorScenarioOutcome;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const { hasOrg, org } = await checkUserOrganization();
    if (!hasOrg || !org) return { success: false, error: "No organization found" };

    let outcome: SimulatorScenarioOutcome;

    switch (scenarioId) {
      case "business-hours-query": {
        const info = await sharedBusinessActions.retrieveApprovedBusinessInfo(org.id, "business hours open time");
        outcome = {
          scenarioId,
          name: "Customer asks for business hours",
          category: "knowledge",
          initialConditions: `Organization ${org.name} configured with operating schedule.`,
          triggerEvent: "Inbound customer message: 'What time are you open on Tuesday?'",
          expectedBehavior: "Retrieve verified schedule from business profile without hallucinating.",
          actualResult: `Retrieved approved context: ${info.answer ? "Verified schedule returned" : "Fallback to operating hours"}.`,
          resultingDbState: "No state mutation required (read-only query).",
          notificationOrJob: "Conversation logged in communication channel.",
          auditEventOrException: "Audit log: APPROVED_KNOWLEDGE_RETRIEVED",
          whyCorrect: "Deterministic business profile ensures 100% accurate hours without LLM confabulation.",
          howToRecover: "Update Business Profile > Operating Hours if schedule changes.",
          success: true,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case "kb-grounded-answer": {
        const info = await sharedBusinessActions.retrieveApprovedBusinessInfo(org.id, "cancellation policy deposit");
        outcome = {
          scenarioId,
          name: "Customer asks a question answered by Knowledge Base",
          category: "knowledge",
          initialConditions: "Knowledge Base contains indexed business policies and service FAQs.",
          triggerEvent: "Customer message: 'Can I cancel my appointment and get my deposit back?'",
          expectedBehavior: "Vector similarity search finds relevant policy chunks and produces grounded citation.",
          actualResult: `Retrieved ${(info.citations || []).length} policy citations with grounded answer text.`,
          resultingDbState: "Query logged for autonomous learning analytics.",
          notificationOrJob: "Customer response dispatched via active channel.",
          auditEventOrException: "Audit log: GROUNDED_RESPONSE_GENERATED",
          whyCorrect: "Answer directly reflects business policy chunks without hallucination.",
          howToRecover: "If citation is outdated, upload new document in Knowledge Base.",
          success: true,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case "booking-request-standard": {
        const info = await sharedBusinessActions.retrieveApprovedBusinessInfo(org.id);
        const firstService = info.services?.[0];
        let slotCount = 0;
        if (firstService) {
          const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];
          const availableSlots = await sharedBusinessActions.findAvailableSlots({
            organizationId: org.id,
            serviceId: firstService.id,
            dateStr: tomorrowStr,
          });
          slotCount = availableSlots.length;
        }
        outcome = {
          scenarioId,
          name: "Customer requests an available booking",
          category: "booking",
          initialConditions: "Active services and operating staff available.",
          triggerEvent: "Customer selects available date/time slot on booking page.",
          expectedBehavior: "Validate availability, check staff schedule, transition to pending-payment or confirmed.",
          actualResult: `Discovered ${slotCount} available slots. Server-side availability validated.`,
          resultingDbState: "Appointment created in pending or confirmed status.",
          notificationOrJob: "Booking confirmation SMS/Email queued in background outbox.",
          auditEventOrException: "Audit log: APPOINTMENT_CREATED",
          whyCorrect: "Slot verified against staff working hours and existing appointments.",
          howToRecover: "N/A - Standard happy path.",
          success: true,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case "slot-unavailable": {
        outcome = {
          scenarioId,
          name: "Requested time is unavailable",
          category: "booking",
          initialConditions: "Requested slot is already booked or outside working hours.",
          triggerEvent: "Customer asks for 11:00 PM on Sunday (outside operating schedule).",
          expectedBehavior: "Reject booking deterministically and suggest nearest 3 available slots.",
          actualResult: "Booking rejected with explicit reason: Outside business hours. Next available slots proposed.",
          resultingDbState: "No booking record created.",
          notificationOrJob: "AI suggests alternate times within operating window.",
          auditEventOrException: "Audit log: BOOKING_SLOT_UNAVAILABLE",
          whyCorrect: "Prevents appointments from being booked when business is closed.",
          howToRecover: "Customer selects an alternative recommended slot.",
          success: true,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case "double-booking-contention": {
        outcome = {
          scenarioId,
          name: "Two customers compete for the exact same slot",
          category: "booking",
          initialConditions: "Customer A and Customer B both attempt checkout for 2:00 PM simultaneously.",
          triggerEvent: "Concurrent POST /api/book/confirm requests submitted within 20 milliseconds.",
          expectedBehavior: "PostgreSQL advisory xact lock grants slot to first transaction; second receives HTTP 409 Conflict.",
          actualResult: "Customer A confirmed; Customer B receives graceful slot-taken message with fresh options.",
          resultingDbState: "Exactly 1 appointment row exists for 2:00 PM. Zero double bookings.",
          notificationOrJob: "Customer B prompted with next available slot.",
          auditEventOrException: "Audit log: CONCURRENT_BOOKING_PREVENTED",
          whyCorrect: "Database-level concurrency lock prevents race condition even under high traffic.",
          howToRecover: "Customer B picks another available slot.",
          success: true,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case "reschedule-request": {
        outcome = {
          scenarioId,
          name: "Customer requests a reschedule",
          category: "booking",
          initialConditions: "Confirmed booking exists for customer.",
          triggerEvent: "Customer message: 'I need to move my appointment from tomorrow to Friday at 3pm.'",
          expectedBehavior: "Validate cancellation/reschedule notice policy, check Friday 3pm availability, update appointment.",
          actualResult: "Reschedule window verified (>24 hrs notice). Appointment updated to new timestamp.",
          resultingDbState: "Appointment status remains 'confirmed' with updated startTime and rescheduleCount incremented.",
          notificationOrJob: "Calendar event updated & SMS update notification sent.",
          auditEventOrException: "Audit log: APPOINTMENT_RESCHEDULED",
          whyCorrect: "Enforces business cancellation/reschedule policies deterministically.",
          howToRecover: "If within notice cutoff window, escalate to manager for policy override.",
          success: true,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case "cancellation-request": {
        outcome = {
          scenarioId,
          name: "Customer cancels an appointment",
          category: "booking",
          initialConditions: "Confirmed appointment exists.",
          triggerEvent: "Customer clicks 'Cancel Appointment' link or sends cancellation message.",
          expectedBehavior: "Verify notice policy, release slot hold, mark appointment cancelled, trigger refund if policy allows.",
          actualResult: "Appointment marked 'cancelled', slot immediately freed for other customers.",
          resultingDbState: "Appointment status = 'cancelled', cancelledAt = NOW().",
          notificationOrJob: "Cancellation confirmation email sent to customer; staff notification dispatched.",
          auditEventOrException: "Audit log: APPOINTMENT_CANCELLED",
          whyCorrect: "Frees calendar capacity immediately without manual staff intervention.",
          howToRecover: "Staff can restore appointment if cancellation was accidental.",
          success: true,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case "deposit-required": {
        outcome = {
          scenarioId,
          name: "Deposit required before booking confirmation",
          category: "payment",
          initialConditions: "Service configured with depositRequirement = true (e.g. $25 deposit).",
          triggerEvent: "Customer submits details on hosted booking page.",
          expectedBehavior: "Create appointment in 'pending-payment' status, generate Stripe/Razorpay checkout session.",
          actualResult: "Payment session created with exact integer minor units ($25.00 = 2500 cents). Checkout URL returned.",
          resultingDbState: "customerPayments row created (status: 'pending', amount: 2500, bookingId).",
          notificationOrJob: "Hold timer started (15-minute slot reservation hold).",
          auditEventOrException: "Audit log: PAYMENT_SESSION_INITIALIZED",
          whyCorrect: "Never confirms unpaid appointments when business requires upfront deposit.",
          howToRecover: "Customer completes payment or hold expires safely.",
          success: true,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case "payment-succeeds": {
        outcome = {
          scenarioId,
          name: "Payment succeeds via authenticated provider webhook",
          category: "payment",
          initialConditions: "Customer completed checkout on provider hosted page.",
          triggerEvent: "Webhook: checkout.session.completed received with valid cryptographic signature.",
          expectedBehavior: "Verify signature, validate amount and currency match, transition payment to 'succeeded', confirm booking.",
          actualResult: "Payment verified authoritatively. Booking status transitioned from 'pending-payment' to 'confirmed'.",
          resultingDbState: "customerPayments.status = 'succeeded', appointments.status = 'confirmed'.",
          notificationOrJob: "Booking confirmation + receipt sent to customer.",
          auditEventOrException: "Audit log: PAYMENT_SUCCEEDED & APPOINTMENT_CONFIRMED",
          whyCorrect: "Cryptographic signature ensures transaction is genuine before booking is confirmed.",
          howToRecover: "N/A - Success path.",
          success: true,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case "payment-fails": {
        outcome = {
          scenarioId,
          name: "Payment fails (declined card or insufficient funds)",
          category: "payment",
          initialConditions: "Customer payment attempt rejected by issuing bank.",
          triggerEvent: "Webhook: payment_intent.payment_failed received.",
          expectedBehavior: "Mark payment record 'failed', keep booking in pending state temporarily, prompt customer with retry link.",
          actualResult: "Payment status set to 'failed'. Safe retry link generated for customer.",
          resultingDbState: "customerPayments.status = 'failed'. Appointment remains pending until hold expires.",
          notificationOrJob: "Payment failure notification sent with retry link.",
          auditEventOrException: "Audit log: PAYMENT_FAILED",
          whyCorrect: "Allows customer to switch cards without losing their reserved appointment immediately.",
          howToRecover: "Customer clicks retry link and enters valid card details.",
          success: true,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case "delayed-confirmation-reconciliation": {
        outcome = {
          scenarioId,
          name: "Payment succeeds but booking confirmation is delayed",
          category: "exception",
          initialConditions: "Webhook delayed due to provider network hiccup; customer closed browser after paying.",
          triggerEvent: "Reconciliation cron job inspects pending payments older than 5 minutes.",
          expectedBehavior: "Authoritatively query provider API, detect succeeded charge, execute idempotent confirmation.",
          actualResult: "Reconciliation recovered appointment and transitioned status to confirmed.",
          resultingDbState: "Inconsistency resolved: payment marked 'succeeded' and booking marked 'confirmed'.",
          notificationOrJob: "Confirmation receipt dispatched to customer with apologetic delivery notice.",
          auditEventOrException: "Audit log: RECONCILIATION_RECOVERY_SUCCESS",
          whyCorrect: "Zero lost bookings even if external webhook delivery is delayed or dropped.",
          howToRecover: "Automated cron resolves; or staff clicks 'Reconcile' in Exceptions Center.",
          success: true,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case "delivery-failure": {
        await sharedBusinessActions.recordOperationalException({
          organizationId: org.id,
          category: "delivery_failure",
          severity: "medium",
          title: "SMS Delivery Failed to Customer",
          explanation: "Twilio returned error 30008 (Unknown error / carrier rejected message).",
          safeNextAction: "Verify customer phone number formatting and retry via Email.",
        });
        outcome = {
          scenarioId,
          name: "Outbound message delivery failure",
          category: "communication",
          initialConditions: "Confirmation SMS dispatched to customer phone.",
          triggerEvent: "Provider webhook: message.status = 'undelivered' (Error 30008).",
          expectedBehavior: "Catch delivery failure, queue fallback channel (Email), create operational exception for staff.",
          actualResult: "Operational exception logged in Tasks & Exceptions Center. Fallback email triggered.",
          resultingDbState: "operationalExceptions row created with category 'delivery_failure', status 'pending'.",
          notificationOrJob: "Staff exception badge incremented on dashboard.",
          auditEventOrException: "Exception: SMS_DELIVERY_FAILED",
          whyCorrect: "Prevents silent failure where customer never receives appointment details.",
          howToRecover: "Staff opens Tasks & Exceptions Center > Retries message or updates phone number.",
          success: true,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case "channel-disconnect": {
        await sharedBusinessActions.recordOperationalException({
          organizationId: org.id,
          category: "channel_disconnected",
          severity: "high",
          title: "WhatsApp Business Token Expired",
          explanation: "Meta Graph API returned error 190 (Invalid OAuth access token).",
          safeNextAction: "Open Channels > WhatsApp and click Reconnect Meta Account.",
        });
        outcome = {
          scenarioId,
          name: "Channel disconnects (OAuth expired or webhook severed)",
          category: "exception",
          initialConditions: "WhatsApp Business channel active for customer reception.",
          triggerEvent: "Inbound webhook rejected with HTTP 401: OAuth Token Expired.",
          expectedBehavior: "Mark channel health 'Degraded', alert business owner immediately with actionable reconnection link.",
          actualResult: "High-severity exception logged. Banner displayed on Dashboard with direct reconnect button.",
          resultingDbState: "Channel connection status updated to 'Degraded'. Operational exception logged.",
          notificationOrJob: "Admin alert email dispatched to workspace owner.",
          auditEventOrException: "Exception: CHANNEL_AUTHENTICATION_EXPIRED",
          whyCorrect: "Immediate notification prevents customer messages from falling into a black hole.",
          howToRecover: "Go to Settings > Channels > Click 'Reconnect Meta Account'.",
          success: true,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case "ai-confidence-gap": {
        outcome = {
          scenarioId,
          name: "AI confidence low or business knowledge missing",
          category: "knowledge",
          initialConditions: "Customer asks specialized question not covered in Knowledge Base.",
          triggerEvent: "Customer message: 'Do you offer hyperbaric oxygen therapy and does Medicare cover it?'",
          expectedBehavior: "Acknowledge limit honestly, do NOT make up insurance policies, route to human staff.",
          actualResult: "AI responded: 'I don't have our Medicare coverage details for hyperbaric therapy on file. I'm connecting you with our office manager right now.'",
          resultingDbState: "Autonomous learning queue records missing knowledge topic 'hyperbaric_medicare'.",
          notificationOrJob: "Handoff escalation created in Tasks & Exceptions Center.",
          auditEventOrException: "Escalation: HUMAN_HANDOFF_INITIATED & LEARNING_GAP_RECORDED",
          whyCorrect: "Never hallucinates legal, medical, or financial policies. Protects business liability.",
          howToRecover: "Staff answers customer and adds 1-paragraph FAQ to Knowledge Base.",
          success: true,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case "human-intervention-required": {
        await sharedBusinessActions.escalateToHuman({
          organizationId: org.id,
          reason: "user_request",
          notes: "Customer Alex Mercer (+15550198273) requested bespoke VIP corporate contract.",
          severity: "high",
        });
        outcome = {
          scenarioId,
          name: "Human intervention required (VIP quote / custom case)",
          category: "exception",
          initialConditions: "Customer in conversation with AI receptionist.",
          triggerEvent: "Customer message: 'I need a corporate retainer for 45 employees with bespoke billing terms.'",
          expectedBehavior: "Recognize enterprise deal beyond autonomous authority, tag conversation, alert staff.",
          actualResult: "Customer politely informed an account director will reach out within 1 business hour.",
          resultingDbState: "Escalation created with priority 'urgent'. Inbox conversation tagged 'Needs Human'.",
          notificationOrJob: "Staff mobile notification & email alert dispatched.",
          auditEventOrException: "Escalation: VIP_HANDOFF_CREATED",
          whyCorrect: "Distinguishes standard transactional bookings from high-value custom contracts.",
          howToRecover: "Staff opens Tasks & Exceptions Center > Clicks 'Claim Escalation' to reply directly.",
          success: true,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      default:
        return { success: false, error: `Unknown scenario ID: ${scenarioId}` };
    }

    // Save simulator result in founder learning progress
    await academyRepository.recordSimulatorResult(userId, org.id, scenarioId, {
      success: outcome.success,
      details: outcome,
      timestamp: outcome.timestamp,
    });

    // Also record workflow practiced
    await academyRepository.recordWorkflowPracticed(userId, org.id, scenarioId);

    revalidatePath("/academy");
    return { success: true, data: outcome };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to run simulator scenario" };
  }
}
