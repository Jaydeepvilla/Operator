import { eq, and, desc, gte, lte } from "drizzle-orm";
import { db } from "../db";
import { 
  appointments, 
  appointmentEvents, 
  appointmentStatusHistory, 
  appointmentNotes, 
  appointmentReschedules, 
  appointmentCancellations,
  services,
  staffMembers
} from "../db/schema";

export interface NewAppointment {
  organizationId: string;
  leadProfileId?: string | null;
  serviceId?: string | null;
  staffMemberId?: string | null;
  status?: string;
  startTime: Date;
  endTime: Date;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  pricePaid?: string | null;
}

export interface NewAppointmentReschedule {
  organizationId: string;
  appointmentId: string;
  requestedBy: "user" | "staff";
  originalStartTime: Date;
  requestedStartTime: Date;
  reason?: string | null;
  status?: string;
}

export const appointmentsRepository = {
  async findById(id: string) {
    const [apt] = await db
      .select({
        appointment: appointments,
        service: services,
        staff: staffMembers,
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .leftJoin(staffMembers, eq(appointments.staffMemberId, staffMembers.id))
      .where(eq(appointments.id, id));
    return apt || null;
  },

  async list(organizationId: string, filters?: { 
    staffMemberId?: string; 
    status?: string; 
    startDate?: Date; 
    endDate?: Date;
  }) {
    let conditions = [eq(appointments.organizationId, organizationId)];

    if (filters?.staffMemberId) {
      conditions.push(eq(appointments.staffMemberId, filters.staffMemberId));
    }
    if (filters?.status) {
      conditions.push(eq(appointments.status, filters.status));
    }
    if (filters?.startDate) {
      conditions.push(gte(appointments.startTime, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(appointments.endTime, filters.endDate));
    }

    return db
      .select({
        appointment: appointments,
        service: services,
        staff: staffMembers,
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .leftJoin(staffMembers, eq(appointments.staffMemberId, staffMembers.id))
      .where(and(...conditions))
      .orderBy(appointments.startTime);
  },

  async create(appointment: NewAppointment, executor: any = db) {
    const [newApt] = await executor.insert(appointments).values(appointment).returning();
    
    // Log history and event
    await this.logEvent(appointment.organizationId, newApt.id, "created", { appointment: newApt }, executor);
    await this.addStatusHistory(
      appointment.organizationId,
      newApt.id,
      null,
      newApt.status,
      "system",
      "Initial booking creation",
      executor
    );

    return newApt;
  },

  async update(id: string, updates: Partial<NewAppointment>, changedBy: string = "system", reason?: string, executor: any = db) {
    const existing = await this.findById(id);
    if (!existing) throw new Error("Appointment not found");

    const [updated] = await executor
      .update(appointments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();

    // Log status history if changed
    if (updates.status && updates.status !== existing.appointment.status) {
      await this.addStatusHistory(
        updated.organizationId,
        id,
        existing.appointment.status,
        updates.status,
        changedBy,
        reason || "Status updated",
        executor
      );
      await this.logEvent(updated.organizationId, id, "status_changed", {
        oldStatus: existing.appointment.status,
        newStatus: updates.status,
        reason,
      }, executor);
    }

    return updated;
  },

  // Events Log
  async logEvent(organizationId: string, appointmentId: string, eventType: string, payload: Record<string, any>, executor: any = db) {
    const [event] = await executor
      .insert(appointmentEvents)
      .values({
        organizationId,
        appointmentId,
        eventType,
        payload,
      })
      .returning();
    return event;
  },

  // Status Audit History
  async addStatusHistory(
    organizationId: string,
    appointmentId: string,
    oldStatus: string | null,
    newStatus: string,
    changedBy: string,
    reason?: string,
    executor: any = db
  ) {
    const [history] = await executor
      .insert(appointmentStatusHistory)
      .values({
        organizationId,
        appointmentId,
        oldStatus,
        newStatus,
        changedBy,
        reason,
      })
      .returning();
    return history;
  },

  async getStatusHistory(appointmentId: string) {
    return db
      .select()
      .from(appointmentStatusHistory)
      .where(eq(appointmentStatusHistory.appointmentId, appointmentId))
      .orderBy(desc(appointmentStatusHistory.createdAt));
  },

  // Notes
  async addNote(organizationId: string, appointmentId: string, noteText: string, author: string) {
    const [note] = await db
      .insert(appointmentNotes)
      .values({
        organizationId,
        appointmentId,
        noteText,
        author,
      })
      .returning();
    return note;
  },

  async listNotes(appointmentId: string) {
    return db
      .select()
      .from(appointmentNotes)
      .where(eq(appointmentNotes.appointmentId, appointmentId))
      .orderBy(desc(appointmentNotes.createdAt));
  },

  // Reschedules
  async requestReschedule(reschedule: NewAppointmentReschedule) {
    const [newReschedule] = await db.insert(appointmentReschedules).values(reschedule).returning();
    return newReschedule;
  },

  async getRescheduleRequests(appointmentId: string) {
    return db
      .select()
      .from(appointmentReschedules)
      .where(eq(appointmentReschedules.appointmentId, appointmentId))
      .orderBy(desc(appointmentReschedules.createdAt));
  },

  async updateRescheduleStatus(id: string, status: string) {
    const [updated] = await db
      .update(appointmentReschedules)
      .set({ status })
      .where(eq(appointmentReschedules.id, id))
      .returning();
    return updated;
  },

  // Cancellations
  async logCancellation(organizationId: string, appointmentId: string, cancelledBy: string, reason?: string) {
    const [cancellation] = await db
      .insert(appointmentCancellations)
      .values({
        organizationId,
        appointmentId,
        cancelledBy,
        reason,
      })
      .returning();
    return cancellation;
  },

  async getCancellation(appointmentId: string) {
    const [canc] = await db
      .select()
      .from(appointmentCancellations)
      .where(eq(appointmentCancellations.appointmentId, appointmentId));
    return canc || null;
  },
};
