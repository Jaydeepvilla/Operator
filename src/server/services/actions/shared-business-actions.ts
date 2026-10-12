import { db } from "../../db";
import { 
  organizations, 
  services, 
  staffMembers, 
  businessProfiles, 
  businessSettings,
  operationalExceptions,
  businessActivityLog
} from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { availabilityService, TimeSlot } from "../availability";
import { bookingService } from "../booking";
import { customerPaymentService, CustomerCheckoutResult } from "../billing/customer-payment-service";
import { identityResolverService } from "../identity";
import { escalationService } from "../escalation";
import { ragService } from "../rag";

export interface FindSlotsInput {
  organizationId: string;
  serviceId: string;
  dateStr: string; // YYYY-MM-DD
  staffMemberId?: string;
}

export interface CreateBookingInput {
  organizationId: string;
  serviceId: string;
  staffMemberId?: string;
  startTime: Date;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  isPublic?: boolean;
  requirePayment?: boolean;
  channel?: "widget" | "hosted_booking" | "voice" | "whatsapp" | "sms" | "email" | "dashboard";
}

export interface CancelBookingInput {
  organizationId: string;
  appointmentId: string;
  reason: string;
  cancelledBy?: "user" | "staff" | "system";
}

export interface RescheduleBookingInput {
  organizationId: string;
  appointmentId: string;
  newStartTime: Date;
  reason?: string;
  requestedBy?: "user" | "staff";
}

export interface CustomerResolutionInput {
  organizationId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  channel?: string;
}

export interface OperationalExceptionInput {
  organizationId: string;
  category: "booking_failure" | "payment_reconciliation" | "webhook_failure" | "delivery_failure" | "channel_disconnected" | "calendar_sync" | "knowledge_gap" | "human_escalation";
  severity?: "low" | "medium" | "high" | "critical";
  title: string;
  explanation: string;
  correlationId?: string;
  relatedRecordType?: "appointment" | "customer_payment" | "conversation" | "channel" | "knowledge";
  relatedRecordId?: string;
  safeNextAction?: string;
  metadata?: Record<string, any>;
}

export interface SharedBusinessActionsGateway {
  findAvailableSlots(input: FindSlotsInput): Promise<TimeSlot[]>;
  createBooking(input: CreateBookingInput): Promise<{ appointment: any; payment?: CustomerCheckoutResult | null }>;
  createPaymentSession(input: {
    organizationId: string;
    serviceId: string;
    appointmentId: string;
    leadProfileId?: string | null;
    customerName: string;
    customerEmail?: string | null;
    customerPhone?: string | null;
    returnUrl?: string;
  }): Promise<CustomerCheckoutResult>;
  confirmPaidBooking(input: { paymentId: string; providerPaymentId?: string; providerOrderId?: string }): Promise<{ success: boolean; appointmentId?: string | null; error?: string }>;
  cancelAppointment(input: CancelBookingInput): Promise<{ success: boolean; appointmentId: string }>;
  rescheduleAppointment(input: RescheduleBookingInput): Promise<{ success: boolean; appointment: any }>;
  retrieveApprovedBusinessInfo(organizationId: string, query?: string): Promise<{
    business: any;
    profile: any;
    services: any[];
    staff: any[];
    operatingHours: any;
    answer?: string | null;
    citations?: string[];
  }>;
  createOrUpdateCustomer(input: CustomerResolutionInput): Promise<{ leadProfileId: string; isNew: boolean }>;
  escalateToHuman(input: {
    organizationId: string;
    conversationId?: string;
    reason: "user_request" | "complaint" | "emergency" | "unknown_info" | "repeated_failure";
    notes?: string;
    severity?: "low" | "medium" | "high" | "critical";
  }): Promise<any>;
  recordOperationalException(input: OperationalExceptionInput): Promise<any>;
}

export const sharedBusinessActions: SharedBusinessActionsGateway = {
  /**
   * 1. Query available slots across all channels with server-side tenant isolation
   */
  async findAvailableSlots(input: FindSlotsInput): Promise<TimeSlot[]> {
    const { organizationId, serviceId, dateStr, staffMemberId } = input;
    if (!organizationId || !serviceId || !dateStr) {
      throw new Error("Missing required parameters for slot lookup.");
    }

    // Verify service belongs to organization
    const [svc] = await db
      .select()
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.organizationId, organizationId)));
    
    if (!svc || !svc.isActive || svc.isArchived) {
      return [];
    }

    return await availabilityService.getAvailableSlots(organizationId, serviceId, dateStr, staffMemberId);
  },

  /**
   * 2. Authoritative booking creation with transactional concurrency guard
   */
  async createBooking(input: CreateBookingInput) {
    const {
      organizationId,
      serviceId,
      staffMemberId,
      startTime,
      customerName,
      customerEmail,
      customerPhone,
      isPublic,
      requirePayment,
      channel = "hosted_booking",
    } = input;

    if (!organizationId || !serviceId || !startTime || !customerName) {
      throw new Error("Incomplete booking information.");
    }

    try {
      const result = await bookingService.createAppointment({
        organizationId,
        serviceId,
        staffMemberId: staffMemberId || "",
        startTime,
        customerName: customerName.trim(),
        customerEmail: customerEmail?.trim() || null,
        customerPhone: customerPhone?.trim() || null,
        isPublic: isPublic ?? true,
        requirePayment,
      });

      // Audit business activity
      await db.insert(businessActivityLog).values({
        organizationId,
        category: "booking_created",
        task: `Appointment scheduled for ${customerName} via ${channel}`,
        impact: "high",
        metadata: {
          appointmentId: result.id,
          channel,
          status: result.status,
          hasPaymentSession: Boolean(result.payment),
        },
      });

      return {
        appointment: result,
        payment: result.payment || null,
      };
    } catch (err: any) {
      // Record operational exception if booking creation fails unexpectedly
      await this.recordOperationalException({
        organizationId,
        category: "booking_failure",
        severity: "high",
        title: `Booking Creation Failed (${channel})`,
        explanation: err?.message || "Failed to persist appointment",
        safeNextAction: "Customer should select an alternate available time slot",
        metadata: {
          serviceId,
          customerName,
          channel,
          error: err?.message,
        },
      });
      throw err;
    }
  },

  /**
   * 3. Authoritative customer payment session creation
   */
  async createPaymentSession(input) {
    return await customerPaymentService.createCustomerPaymentSession(input);
  },

  /**
   * 4. Confirm paid booking and atomically activate appointment
   */
  async confirmPaidBooking(input) {
    return await customerPaymentService.confirmCustomerPayment(input);
  },

  /**
   * 5. Cancel appointment through authoritative booking service
   */
  async cancelAppointment(input: CancelBookingInput) {
    const { organizationId, appointmentId, reason, cancelledBy = "user" } = input;
    const effectiveCancelledBy = cancelledBy === "staff" ? "staff" : "user";
    await bookingService.cancelAppointment(appointmentId, reason, effectiveCancelledBy);

    await db.insert(businessActivityLog).values({
      organizationId,
      category: "booking_cancelled",
      task: `Appointment ${appointmentId} cancelled: ${reason}`,
      impact: "medium",
      metadata: { appointmentId, reason, cancelledBy },
    });

    return { success: true, appointmentId };
  },

  /**
   * 6. Reschedule appointment with conflict validation
   */
  async rescheduleAppointment(input: RescheduleBookingInput) {
    const { organizationId, appointmentId, newStartTime, reason, requestedBy = "user" } = input;
    const updated = await bookingService.rescheduleAppointment(appointmentId, newStartTime, reason, requestedBy);

    await db.insert(businessActivityLog).values({
      organizationId,
      category: "booking_rescheduled",
      task: `Appointment ${appointmentId} rescheduled to ${newStartTime.toISOString()}`,
      impact: "medium",
      metadata: { appointmentId, newStartTime: newStartTime.toISOString(), reason, requestedBy },
    });

    return { success: true, appointment: updated };
  },

  /**
   * 7. Retrieve verified business information, services roster, and grounded knowledge
   */
  async retrieveApprovedBusinessInfo(organizationId: string, query?: string) {
    const [biz] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    if (!biz) {
      throw new Error("Organization not found");
    }

    const [profile] = await db
      .select()
      .from(businessProfiles)
      .where(eq(businessProfiles.organizationId, organizationId));

    const [settings] = await db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.organizationId, organizationId));

    const activeServices = await db
      .select()
      .from(services)
      .where(and(eq(services.organizationId, organizationId), eq(services.isActive, true), eq(services.isArchived, false)));

    const activeStaff = await db
      .select()
      .from(staffMembers)
      .where(and(eq(staffMembers.organizationId, organizationId), eq(staffMembers.isActive, true)));

    let answer: string | null = null;
    let citations: string[] = [];

    if (query && query.trim()) {
      try {
        const ragResult = await ragService.retrieveContext(organizationId, query);
        if (ragResult.contextText) {
          answer = ragResult.contextText;
          citations = (ragResult.citations || []).map((c: any) => c.name || "Knowledge Base");
        }
      } catch (ragErr) {
        console.warn("[SharedActions] RAG context query fallback:", ragErr);
      }
    }

    return {
      business: biz,
      profile: profile || null,
      services: activeServices,
      staff: activeStaff,
      operatingHours: settings?.businessHours || null,
      answer,
      citations,
    };
  },

  /**
   * 8. Create or update customer record via identity resolver
   */
  async createOrUpdateCustomer(input: CustomerResolutionInput) {
    const { organizationId, name, email, phone, channel = "appointment" } = input;
    const resolved = await identityResolverService.resolveCustomerIdentity({
      organizationId,
      name,
      email,
      phone,
      channel,
    });
    return {
      leadProfileId: resolved.leadProfileId,
      isNew: resolved.isNew,
    };
  },

  /**
   * 9. Escalate to human and record operational incident
   */
  async escalateToHuman(input) {
    const { organizationId, conversationId, reason, notes, severity = "high" } = input;

    let esc: any = null;
    if (conversationId) {
      esc = await escalationService.triggerEscalation(organizationId, conversationId, reason, notes);
    }

    // Also record in unified operational exceptions queue
    await this.recordOperationalException({
      organizationId,
      category: "human_escalation",
      severity,
      title: `Customer Request Escalated: ${reason}`,
      explanation: notes || `Conversation escalated due to: ${reason}`,
      correlationId: conversationId || undefined,
      relatedRecordType: "conversation",
      relatedRecordId: conversationId || undefined,
      safeNextAction: "Review conversation transcript and contact customer directly",
      metadata: { reason, escalationId: esc?.id },
    });

    return esc;
  },

  /**
   * 10. Record an authoritative operational exception into the unified exception queue
   */
  async recordOperationalException(input: OperationalExceptionInput) {
    const {
      organizationId,
      category,
      severity = "medium",
      title,
      explanation,
      correlationId,
      relatedRecordType,
      relatedRecordId,
      safeNextAction,
      metadata = {},
    } = input;

    const [record] = await db
      .insert(operationalExceptions)
      .values({
        organizationId,
        category,
        severity,
        status: "pending",
        title,
        explanation,
        correlationId: correlationId || null,
        relatedRecordType: relatedRecordType || null,
        relatedRecordId: relatedRecordId || null,
        safeNextAction: safeNextAction || "Review incident details and verify status",
        metadata,
      })
      .returning();

    return record;
  },
};
