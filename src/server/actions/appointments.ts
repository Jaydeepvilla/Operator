"use server";

import { requireOrganizationAccess, assertResourceOwnership } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { appointments, conversations } from "../db/schema";
import { appointmentsRepository } from "../repositories/appointments";
import { bookingService } from "../services/booking";
import { leadsRepository } from "../repositories/leads";
import { summariesRepository } from "../repositories/summaries";
import { organizationRepository } from "../repositories/organization";
import { parseNaturalDateTime } from "@/lib/date";
import { activityRepository } from "../repositories/activity";

export async function getAppointmentsAction(filters?: {
  staffMemberId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const org = await organizationRepository.getById(organizationId);
    const timezone = org?.timezone || "UTC";
    
    const parsedFilters: any = {};
    if (filters?.staffMemberId && filters.staffMemberId !== "all") {
      parsedFilters.staffMemberId = filters.staffMemberId;
    }
    if (filters?.status && filters.status !== "all") {
      parsedFilters.status = filters.status;
    }
    if (filters?.startDate) {
      const parsedStart = parseNaturalDateTime(filters.startDate, { timezone });
      if (parsedStart.success) {
        parsedFilters.startDate = parsedStart.date;
      }
    }
    if (filters?.endDate) {
      const parsedEnd = parseNaturalDateTime(filters.endDate, { timezone });
      if (parsedEnd.success) {
        parsedFilters.endDate = parsedEnd.date;
      }
    }

    const list = await appointmentsRepository.list(organizationId, parsedFilters);
    return { success: true, appointments: list };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load appointments" };
  }
}

export async function getAppointmentDetailsAction(appointmentId: string) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    
    // Safety check org mapping & IDOR guard
    const apt = await assertResourceOwnership(appointments, appointmentId, organizationId, "Appointment");

    const fullDetails = await appointmentsRepository.findById(appointmentId);
    const history = await appointmentsRepository.getStatusHistory(appointmentId);
    const notes = await appointmentsRepository.listNotes(appointmentId);
    const reschedules = await appointmentsRepository.getRescheduleRequests(appointmentId);
    const cancellation = await appointmentsRepository.getCancellation(appointmentId);

    // Fetch unified customer profile information
    let leadProfile = null;
    let leadAnswers: any[] = [];
    let summary = null;

    const leadProfileId = fullDetails?.appointment?.leadProfileId;
    if (leadProfileId) {
      leadProfile = await leadsRepository.findProfileById(leadProfileId);
      leadAnswers = await leadsRepository.listAnswers(leadProfileId);
      
      const [conv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.leadProfileId, leadProfileId))
        .limit(1);

      if (conv) {
        summary = await summariesRepository.findByConversation(conv.id);
      }
    }

    return {
      success: true,
      data: {
        details: fullDetails,
        history,
        notes,
        reschedules,
        cancellation,
        leadProfile,
        leadAnswers,
        summary,
      }
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load details" };
  }
}

export async function createAppointmentAction(data: {
  serviceId: string;
  staffMemberId: string;
  startTime: string; // ISO String
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const org = await organizationRepository.getById(organizationId);
    const timezone = org?.timezone || "UTC";

    const parsedStart = parseNaturalDateTime(data.startTime, { timezone });
    if (!parsedStart.success) {
      throw new Error(parsedStart.reason || `Invalid appointment start time: "${data.startTime}"`);
    }

    const appointment = await bookingService.createAppointment({
      organizationId,
      serviceId: data.serviceId,
      staffMemberId: data.staffMemberId,
      startTime: parsedStart.date,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
    });

    revalidatePath("/appointments");
    return { success: true, appointment };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to book appointment" };
  }
}

export async function rescheduleAppointmentAction(data: {
  appointmentId: string;
  newStartTime: string; // ISO string
  reason?: string;
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    await assertResourceOwnership(appointments, data.appointmentId, organizationId, "Appointment");

    const org = await organizationRepository.getById(organizationId);
    const timezone = org?.timezone || "UTC";

    const parsedNewStart = parseNaturalDateTime(data.newStartTime, { timezone });
    if (!parsedNewStart.success) {
      throw new Error(parsedNewStart.reason || `Invalid appointment start time: "${data.newStartTime}"`);
    }

    const updated = await bookingService.rescheduleAppointment(
      data.appointmentId,
      parsedNewStart.date,
      data.reason || "Staff rescheduled from dashboard",
      "staff"
    );

    revalidatePath("/appointments");
    return { success: true, appointment: updated };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to reschedule" };
  }
}

export async function cancelAppointmentAction(data: {
  appointmentId: string;
  reason?: string;
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    await assertResourceOwnership(appointments, data.appointmentId, organizationId, "Appointment");

    const updated = await bookingService.cancelAppointment(
      data.appointmentId,
      data.reason || "Staff cancelled from dashboard",
      "staff"
    );

    revalidatePath("/appointments");
    return { success: true, appointment: updated };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to cancel booking" };
  }
}

export async function addAppointmentNoteAction(data: {
  appointmentId: string;
  noteText: string;
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    await assertResourceOwnership(appointments, data.appointmentId, organizationId, "Appointment");

    const note = await appointmentsRepository.addNote(
      organizationId,
      data.appointmentId,
      data.noteText,
      "staff"
    );

    revalidatePath("/appointments");
    return { success: true, note };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to add note" };
  }
}

export async function updateAppointmentStatusAction(data: {
  appointmentId: string;
  status: string;
  reason?: string;
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    await assertResourceOwnership(appointments, data.appointmentId, organizationId, "Appointment");

    const updated = await appointmentsRepository.update(
      data.appointmentId,
      { status: data.status },
      "staff",
      data.reason || `Status updated to ${data.status}`
    );

    revalidatePath("/appointments");
    return { success: true, appointment: updated };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update status" };
  }
}

/**
 * Returns all active or filtered waitlist entries for the current organization.
 */
export async function getAppointmentWaitlistAction(status?: string) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const waitlist = await bookingService.getWaitlist(organizationId, status);
    return { success: true, waitlist };
  } catch (error: any) {
    console.error("getAppointmentWaitlistAction error:", error);
    return { success: false, error: error?.message || "Failed to load waitlist", waitlist: [] };
  }
}

/**
 * Adds a prospect to the appointment waitlist.
 */
export async function joinAppointmentWaitlistAction(data: {
  staffMemberId: string;
  serviceId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  preferredDate: string;
  leadProfileId?: string;
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();

    if (!data.customerName?.trim() || (!data.customerEmail && !data.customerPhone)) {
      return { success: false, error: "Customer name and at least one contact method (phone or email) are required." };
    }

    const entry = await bookingService.joinWaitlist({
      organizationId,
      staffMemberId: data.staffMemberId,
      serviceId: data.serviceId,
      customerName: data.customerName.trim(),
      customerEmail: data.customerEmail?.trim() || null,
      customerPhone: data.customerPhone?.trim() || null,
      preferredDate: new Date(data.preferredDate),
      leadProfileId: data.leadProfileId || null,
    });

    revalidatePath("/appointments");
    return { success: true, entry };
  } catch (error: any) {
    console.error("joinAppointmentWaitlistAction error:", error);
    return { success: false, error: error?.message || "Failed to join waitlist" };
  }
}

export async function quickCreateAppointmentAction(data: {
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  serviceId?: string | null;
  serviceName?: string | null;
  staffMemberId?: string | null;
  startTime: string; // ISO string or datetime-local
  durationMinutes?: number;
  price?: string | null;
  notes?: string | null;
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();

    if (!data.customerName || !data.customerName.trim()) {
      return { success: false, error: "Customer name is required" };
    }

    const start = new Date(data.startTime);
    if (isNaN(start.getTime())) {
      return { success: false, error: "Please select a valid appointment start time" };
    }

    const duration = data.durationMinutes || 30;
    const end = new Date(start.getTime() + duration * 60 * 1000);

    const appointment = await appointmentsRepository.create({
      organizationId,
      customerName: data.customerName.trim(),
      customerEmail: data.customerEmail?.trim() || null,
      customerPhone: data.customerPhone?.trim() || null,
      serviceId: data.serviceId || null,
      staffMemberId: data.staffMemberId || null,
      startTime: start,
      endTime: end,
      status: "confirmed",
      pricePaid: data.price ? String(data.price) : "0.00",
    });

    await activityRepository.log({
      organizationId,
      category: "booking",
      task: `Manual appointment booked for ${data.customerName.trim()}`,
      impact: data.price ? `+$${data.price} scheduled revenue` : "Confirmed booking on calendar",
    });

    revalidatePath("/appointments");
    revalidatePath("/dashboard");
    return { success: true, appointment };
  } catch (error: any) {
    console.error("quickCreateAppointmentAction error:", error);
    return { success: false, error: error?.message || "Failed to book appointment" };
  }
}



