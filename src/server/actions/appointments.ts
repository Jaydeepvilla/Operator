"use server";

import { auth } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { appointments, conversations } from "../db/schema";
import { membershipRepository } from "../repositories/membership";
import { appointmentsRepository } from "../repositories/appointments";
import { bookingService } from "../services/booking";
import { leadsRepository } from "../repositories/leads";
import { summariesRepository } from "../repositories/summaries";

async function getVerifiedOrgId() {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  if (orgId) return orgId;
  const memberships = await membershipRepository.getByUser(userId);
  if (memberships.length === 0) throw new Error("No organization found");
  return memberships[0].organizationId;
}

export async function getAppointmentsAction(filters?: {
  staffMemberId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  try {
    const orgId = await getVerifiedOrgId();
    
    const parsedFilters: any = {};
    if (filters?.staffMemberId && filters.staffMemberId !== "all") {
      parsedFilters.staffMemberId = filters.staffMemberId;
    }
    if (filters?.status && filters.status !== "all") {
      parsedFilters.status = filters.status;
    }
    if (filters?.startDate) {
      parsedFilters.startDate = new Date(filters.startDate);
    }
    if (filters?.endDate) {
      parsedFilters.endDate = new Date(filters.endDate);
    }

    const list = await appointmentsRepository.list(orgId, parsedFilters);
    return { success: true, appointments: list };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load appointments" };
  }
}

export async function getAppointmentDetailsAction(appointmentId: string) {
  try {
    const orgId = await getVerifiedOrgId();
    
    // Safety check org mapping
    const [apt] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, appointmentId), eq(appointments.organizationId, orgId)));
    if (!apt) throw new Error("Appointment not found");

    const fullDetails = await appointmentsRepository.findById(appointmentId);
    const history = await appointmentsRepository.getStatusHistory(appointmentId);
    const notes = await appointmentsRepository.listNotes(appointmentId);
    const reschedules = await appointmentsRepository.getRescheduleRequests(appointmentId);
    const cancellation = await appointmentsRepository.getCancellation(appointmentId);

    // Fetch unified customer profile information
    let leadProfile = null;
    let leadAnswers: any[] = [];
    let summary = null;

    if (apt.leadProfileId) {
      leadProfile = await leadsRepository.findProfileById(apt.leadProfileId);
      leadAnswers = await leadsRepository.listAnswers(apt.leadProfileId);
      
      const [conv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.leadProfileId, apt.leadProfileId))
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
    const orgId = await getVerifiedOrgId();

    const start = new Date(data.startTime);
    const appointment = await bookingService.createAppointment({
      organizationId: orgId,
      serviceId: data.serviceId,
      staffMemberId: data.staffMemberId,
      startTime: start,
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
    const orgId = await getVerifiedOrgId();

    const [existing] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, data.appointmentId), eq(appointments.organizationId, orgId)));
    if (!existing) throw new Error("Appointment not found");

    const start = new Date(data.newStartTime);
    const updated = await bookingService.rescheduleAppointment(
      data.appointmentId,
      start,
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
    const orgId = await getVerifiedOrgId();

    const [existing] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, data.appointmentId), eq(appointments.organizationId, orgId)));
    if (!existing) throw new Error("Appointment not found");

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
    const orgId = await getVerifiedOrgId();

    const [existing] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, data.appointmentId), eq(appointments.organizationId, orgId)));
    if (!existing) throw new Error("Appointment not found");

    const note = await appointmentsRepository.addNote(
      orgId,
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
    const orgId = await getVerifiedOrgId();

    const [existing] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, data.appointmentId), eq(appointments.organizationId, orgId)));
    if (!existing) throw new Error("Appointment not found");

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
    const orgId = await getVerifiedOrgId();
    const waitlist = await bookingService.getWaitlist(orgId, status);
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
    const orgId = await getVerifiedOrgId();

    if (!data.customerName?.trim() || (!data.customerEmail && !data.customerPhone)) {
      return { success: false, error: "Customer name and at least one contact method (phone or email) are required." };
    }

    const entry = await bookingService.joinWaitlist({
      organizationId: orgId,
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

