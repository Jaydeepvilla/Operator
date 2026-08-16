import { appointmentsRepository } from "../repositories/appointments";
import { remindersRepository } from "../repositories/reminders";
import { calendarRepository } from "../repositories/calendar";
import { rulesRepository } from "../repositories/rules";
import { staffRepository } from "../repositories/staff";
import { providerRegistry } from "./calendar-provider";
import { availabilityService } from "./availability";
import { ruleEngine } from "./automations/rule-engine";
import { notificationService } from "./notification";
import { db } from "../db";
import { services, appointmentEvents, organizations, appointments, appointmentWaitlist } from "../db/schema";
import { eq, and, lt, gt, notInArray, sql, asc, desc } from "drizzle-orm";

export interface CreateBookingInput {
  organizationId: string;
  leadProfileId?: string | null;
  serviceId: string;
  staffMemberId: string;
  startTime: Date;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
}

export const bookingService = {
  async createAppointment(input: CreateBookingInput) {
    const { organizationId, serviceId, staffMemberId, startTime } = input;

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));
    if (!org) throw new Error("Organization not found");
    const timezone = org.timezone || "UTC";

    // 1. Fetch Service duration
    const [service] = await db
      .select()
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.organizationId, organizationId)));
    if (!service) throw new Error("Service not found");

    const endTime = new Date(startTime.getTime() + service.duration * 60 * 1000);

    // 2. Validate availability (Conflict check)
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(startTime);
    const p = parts.reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {} as Record<string, string>);

    const dateStr = `${p.year}-${p.month}-${p.day}`;
    let hour = p.hour;
    if (hour === "24") hour = "00";
    const slotTimeStr = `${hour}:${p.minute}`;

    const availableSlots = await availabilityService.getAvailableSlots(
      organizationId,
      serviceId,
      dateStr,
      staffMemberId
    );
    const isSlotAvailable = availableSlots.some(
      (s) => s.startTime === slotTimeStr && s.staffId === staffMemberId
    );

    if (!isSlotAvailable) {
      throw new Error(`Requested time slot ${slotTimeStr} is no longer available for booking.`);
    }

    // 3. Concurrency Protection & Transactional Lock
    // Execute inside a database transaction with a staff schedule advisory lock & conflict verification
    const appointment = await db.transaction(async (tx) => {
      // Transactional advisory lock keyed on the staff member and booking slot timestamp
      const lockKey = `${staffMemberId}_${startTime.toISOString()}`;
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);

      // Verify no concurrent transaction just committed an overlapping booking
      const conflicting = await tx
        .select({ id: appointments.id })
        .from(appointments)
        .where(
          and(
            eq(appointments.organizationId, organizationId),
            eq(appointments.staffMemberId, staffMemberId),
            notInArray(appointments.status, ["cancelled", "rescheduled"]),
            lt(appointments.startTime, endTime),
            gt(appointments.endTime, startTime)
          )
        )
        .limit(1);

      if (conflicting.length > 0) {
        throw new Error(`Concurrency Conflict: This slot has just been booked by another customer. Please choose another time.`);
      }

      // Insert Appointment atomically in DB
      return await appointmentsRepository.create({
        organizationId,
        leadProfileId: input.leadProfileId,
        serviceId,
        staffMemberId,
        status: "confirmed",
        startTime,
        endTime,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
      }, tx);
    });

    // 4. Sync event to connected third-party calendar
    const connections = await calendarRepository.listConnections(organizationId);
    const staffConn = connections.find((c) => c.staffMemberId === staffMemberId && c.syncStatus === "active");

    if (staffConn) {
      try {
        const provider = providerRegistry.getProvider(staffConn.provider);
        const extEvent = await provider.createEvent(
          staffConn.accessToken,
          staffConn.refreshToken,
          staffConn.expiresAt,
          staffConn.externalCalendarId,
          {
            title: `${service.name} - ${input.customerName}`,
            start: startTime,
            end: endTime,
            description: `AI booked appointment for ${input.customerName}. Email: ${input.customerEmail || "N/A"}. Phone: ${input.customerPhone || "N/A"}.`,
          }
        );

        // Update external ID in metadata / status
        await appointmentsRepository.logEvent(organizationId, appointment.id, "calendar_synced", {
          provider: staffConn.provider,
          externalId: extEvent.externalId,
        });
      } catch (err) {
        console.error("[BookingService] Failed to sync created event to external calendar:", err);
      }
    }

    // 5. Queue notification reminders
    // We queue reminders for 24h, 12h, and 1h before appointment
    const reminderTimings = [
      { type: "email" as const, leadTimeMs: 24 * 60 * 60 * 1000 },
      { type: "sms" as const, leadTimeMs: 12 * 60 * 60 * 1000 },
      { type: "email" as const, leadTimeMs: 1 * 60 * 60 * 1000 },
    ];

    for (const tim of reminderTimings) {
      const sendAt = new Date(startTime.getTime() - tim.leadTimeMs);
      if (sendAt > new Date()) {
        await remindersRepository.create({
          organizationId,
          appointmentId: appointment.id,
          type: tim.type,
          sendAt,
          status: "pending",
        });
      }
    }

    // 6. Trigger custom Trigger-Action automations
    ruleEngine.emitEvent(organizationId, "appointment_created", {
      appointmentId: appointment.id,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      serviceId,
      serviceName: service.name,
      staffMemberId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    }).catch((err) => console.error("Error executing ruleEngine on appointment_created:", err));

    return appointment;
  },

  async rescheduleAppointment(
    appointmentId: string,
    newStartTime: Date,
    reason: string = "Requested by customer",
    requestedBy: "user" | "staff" = "user"
  ) {
    const aptDetails = await appointmentsRepository.findById(appointmentId);
    if (!aptDetails) throw new Error("Appointment not found");

    const { appointment, service } = aptDetails;
    if (!service) throw new Error("Mapped service details not found");

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, appointment.organizationId));
    const timezone = org?.timezone || "UTC";

    // Check rules
    const rules = await rulesRepository.getByOrganization(appointment.organizationId);
    if (rules && !rules.allowRescheduling) {
      throw new Error("Rescheduling is disabled for this organization.");
    }

    const duration = service.duration;
    const newEndTime = new Date(newStartTime.getTime() + duration * 60 * 1000);

    // Verify slot availability
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(newStartTime);
    const p = parts.reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {} as Record<string, string>);

    const dateStr = `${p.year}-${p.month}-${p.day}`;
    let hour = p.hour;
    if (hour === "24") hour = "00";
    const slotTimeStr = `${hour}:${p.minute}`;

    const availableSlots = await availabilityService.getAvailableSlots(
      appointment.organizationId,
      appointment.serviceId!,
      dateStr,
      appointment.staffMemberId!
    );
    const isSlotAvailable = availableSlots.some(
      (s) => s.startTime === slotTimeStr && s.staffId === appointment.staffMemberId
    );

    if (!isSlotAvailable) {
      throw new Error(`Requested reschedule slot ${slotTimeStr} is no longer available.`);
    }

    // Apply reschedule updates with concurrency lock
    const updated = await db.transaction(async (tx) => {
      if (appointment.staffMemberId) {
        const lockKey = `${appointment.staffMemberId}_${newStartTime.toISOString()}`;
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);

        const conflicting = await tx
          .select({ id: appointments.id })
          .from(appointments)
          .where(
            and(
              eq(appointments.organizationId, appointment.organizationId),
              eq(appointments.staffMemberId, appointment.staffMemberId),
              notInArray(appointments.status, ["cancelled", "rescheduled"]),
              lt(appointments.startTime, newEndTime),
              gt(appointments.endTime, newStartTime)
            )
          )
          .limit(1);

        if (conflicting.length > 0 && conflicting[0].id !== appointmentId) {
          throw new Error(`Concurrency Conflict: Target slot is already booked. Please choose another time.`);
        }
      }

      return await appointmentsRepository.update(
        appointmentId,
        {
          startTime: newStartTime,
          endTime: newEndTime,
          status: "rescheduled",
        },
        requestedBy,
        reason,
        tx
      );
    });

    // Log reschedule request details
    await appointmentsRepository.requestReschedule({
      organizationId: appointment.organizationId,
      appointmentId,
      requestedBy,
      originalStartTime: new Date(appointment.startTime),
      requestedStartTime: newStartTime,
      reason,
      status: "applied",
    });

    // Update Connected Calendar Event
    const connections = await calendarRepository.listConnections(appointment.organizationId);
    const staffConn = connections.find((c) => c.staffMemberId === appointment.staffMemberId && c.syncStatus === "active");

    if (staffConn) {
      // Find sync log to fetch original event external ID
      const events = await db
        .select()
        .from(appointmentEvents)
        .where(
          and(
            eq(appointmentEvents.appointmentId, appointmentId),
            eq(appointmentEvents.eventType, "calendar_synced")
          )
        );

      const externalId = (events[0]?.payload as any)?.externalId;
      if (externalId) {
        try {
          const provider = providerRegistry.getProvider(staffConn.provider);
          await provider.updateEvent(
            staffConn.accessToken,
            staffConn.refreshToken,
            staffConn.expiresAt,
            staffConn.externalCalendarId,
            externalId,
            {
              title: `${service.name} - ${appointment.customerName}`,
              start: newStartTime,
              end: newEndTime,
              description: `AI Rescheduled appointment for ${appointment.customerName}. Reason: ${reason}`,
            }
          );
        } catch (err) {
          console.error("[BookingService] Failed to update rescheduled event in calendar provider:", err);
        }
      }
    }

    // Clear old reminders and reschedule new ones
    await remindersRepository.deleteByAppointment(appointmentId);
    const reminderTimings = [
      { type: "email" as const, leadTimeMs: 24 * 60 * 60 * 1000 },
      { type: "sms" as const, leadTimeMs: 12 * 60 * 60 * 1000 },
      { type: "email" as const, leadTimeMs: 1 * 60 * 60 * 1000 },
    ];

    for (const tim of reminderTimings) {
      const sendAt = new Date(newStartTime.getTime() - tim.leadTimeMs);
      if (sendAt > new Date()) {
        await remindersRepository.create({
          organizationId: appointment.organizationId,
          appointmentId,
          type: tim.type,
          sendAt,
          status: "pending",
        });
      }
    }

    // Trigger custom Trigger-Action automations
    ruleEngine.emitEvent(appointment.organizationId, "appointment_rescheduled", {
      appointmentId,
      customerName: appointment.customerName,
      customerEmail: appointment.customerEmail,
      customerPhone: appointment.customerPhone,
      serviceId: appointment.serviceId,
      newStartTime: newStartTime.toISOString(),
      newEndTime: newEndTime.toISOString(),
      reason,
      requestedBy,
    }).catch((err) => console.error("Error executing ruleEngine on appointment_rescheduled:", err));

    return updated;
  },

  async cancelAppointment(
    appointmentId: string,
    reason: string = "Cancelled by client",
    cancelledBy: "user" | "staff" = "user"
  ) {
    const aptDetails = await appointmentsRepository.findById(appointmentId);
    if (!aptDetails) throw new Error("Appointment not found");

    const { appointment, service } = aptDetails;

    // Check rules
    const rules = await rulesRepository.getByOrganization(appointment.organizationId);
    if (rules && !rules.allowCancellation) {
      throw new Error("Cancellation is disabled for this organization.");
    }

    // Cancel appointment
    const updated = await appointmentsRepository.update(
      appointmentId,
      { status: "cancelled" },
      cancelledBy,
      reason
    );

    // Log details
    await appointmentsRepository.logCancellation(appointment.organizationId, appointmentId, cancelledBy, reason);

    // Delete connected calendar event
    const connections = await calendarRepository.listConnections(appointment.organizationId);
    const staffConn = connections.find((c) => c.staffMemberId === appointment.staffMemberId && c.syncStatus === "active");

    if (staffConn) {
      const events = await db
        .select()
        .from(appointmentEvents)
        .where(
          and(
            eq(appointmentEvents.appointmentId, appointmentId),
            eq(appointmentEvents.eventType, "calendar_synced")
          )
        );

      const externalId = (events[0]?.payload as any)?.externalId;
      if (externalId) {
        try {
          const provider = providerRegistry.getProvider(staffConn.provider);
          await provider.deleteEvent(
            staffConn.accessToken,
            staffConn.refreshToken,
            staffConn.expiresAt,
            staffConn.externalCalendarId,
            externalId
          );
        } catch (err) {
          console.error("[BookingService] Failed to delete event from calendar provider:", err);
        }
      }
    }

    // Clear reminders queue
    await remindersRepository.deleteByAppointment(appointmentId);

    // Trigger custom Trigger-Action automations
    ruleEngine.emitEvent(appointment.organizationId, "appointment_cancelled", {
      appointmentId,
      customerName: appointment.customerName,
      customerEmail: appointment.customerEmail,
      customerPhone: appointment.customerPhone,
      serviceId: appointment.serviceId,
      reason,
      cancelledBy,
    }).catch((err) => console.error("Error executing ruleEngine on appointment_cancelled:", err));

    // 7. Check waitlist and automatically promote/notify waiting candidate
    if (appointment.staffMemberId) {
      try {
        const [waitlistCandidate] = await db
          .select()
          .from(appointmentWaitlist)
          .where(
            and(
              eq(appointmentWaitlist.organizationId, appointment.organizationId),
              eq(appointmentWaitlist.staffMemberId, appointment.staffMemberId),
              eq(appointmentWaitlist.status, "waiting")
            )
          )
          .orderBy(asc(appointmentWaitlist.createdAt))
          .limit(1);

        if (waitlistCandidate) {
          await db
            .update(appointmentWaitlist)
            .set({ status: "offered", offeredAt: new Date(), updatedAt: new Date() })
            .where(eq(appointmentWaitlist.id, waitlistCandidate.id));

          const slotTimeStr = new Date(appointment.startTime).toLocaleString();
          const serviceName = service?.name || "Consultation";
          const promoMsg = `Good news ${waitlistCandidate.customerName}! An appointment slot for ${serviceName} on ${slotTimeStr} has opened up. Please contact us or book online to claim this spot.`;

          if (waitlistCandidate.customerPhone) {
            await notificationService.sendSMS(waitlistCandidate.customerPhone, promoMsg);
          } else if (waitlistCandidate.customerEmail) {
            await notificationService.sendEmail(
              waitlistCandidate.customerEmail,
              `Waitlist Opening: ${serviceName} slot available!`,
              `<p>${promoMsg}</p>`
            );
          }
        }
      } catch (waitlistErr) {
        console.error("[BookingService] Failed to process waitlist promotion on cancellation:", waitlistErr);
      }
    }

    return updated;
  },

  /**
   * Adds a prospective customer to the appointment waitlist for a specific staff member and preferred date.
   */
  async joinWaitlist(input: {
    organizationId: string;
    staffMemberId: string;
    serviceId: string;
    customerName: string;
    customerEmail?: string | null;
    customerPhone?: string | null;
    preferredDate: Date;
    leadProfileId?: string | null;
  }) {
    const [entry] = await db
      .insert(appointmentWaitlist)
      .values({
        organizationId: input.organizationId,
        staffMemberId: input.staffMemberId,
        serviceId: input.serviceId,
        customerName: input.customerName,
        customerEmail: input.customerEmail || null,
        customerPhone: input.customerPhone || null,
        preferredDate: input.preferredDate,
        leadProfileId: input.leadProfileId || null,
        status: "waiting",
      })
      .returning();

    return entry;
  },

  /**
   * Retrieves the active waitlist queue for an organization.
   */
  async getWaitlist(organizationId: string, status?: string) {
    const query = db
      .select()
      .from(appointmentWaitlist)
      .where(
        status
          ? and(eq(appointmentWaitlist.organizationId, organizationId), eq(appointmentWaitlist.status, status))
          : eq(appointmentWaitlist.organizationId, organizationId)
      )
      .orderBy(desc(appointmentWaitlist.createdAt));

    return await query;
  },
};

