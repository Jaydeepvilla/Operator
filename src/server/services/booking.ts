import { appointmentsRepository } from "../repositories/appointments";
import { remindersRepository } from "../repositories/reminders";
import { calendarRepository } from "../repositories/calendar";
import { rulesRepository } from "../repositories/rules";
import { staffRepository } from "../repositories/staff";
import { providerRegistry } from "./calendar-provider";
import { availabilityService } from "./availability";
import { ruleEngine } from "./automations/rule-engine";
import { notificationService } from "./notification";
import { identityResolverService } from "./identity";
import { db } from "../db";
import { services, staffMembers, serviceAssignments, appointmentEvents, organizations, appointments, appointmentWaitlist, businessSettings, memberships } from "../db/schema";
import { eq, and, lt, gt, inArray, notInArray, sql, asc, desc } from "drizzle-orm";
import { auth } from "@/lib/auth/server";
import { customerPaymentService } from "./billing/customer-payment-service";

export interface CreateBookingInput {
  organizationId: string;
  leadProfileId?: string | null;
  serviceId: string;
  staffMemberId: string;
  startTime: Date;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  isPublic?: boolean;
  requirePayment?: boolean;
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

    // Authoritative Server-Side Trust Boundary:
    // Determine whether the calling execution context represents an authorized internal staff member of this organization.
    // Do NOT rely solely on caller-controlled flags (like input.isPublic).
    let isAuthorizedInternalStaff = false;
    try {
      const authContext = await auth();
      if (authContext.userId) {
        const [membership] = await db
          .select({ id: memberships.id })
          .from(memberships)
          .where(
            and(
              eq(memberships.userId, authContext.userId),
              eq(memberships.organizationId, organizationId)
            )
          )
          .limit(1);

        if (membership) {
          isAuthorizedInternalStaff = true;
        }
      }
    } catch {
      // Invariant: outside request context or auth error -> default to unauthenticated public request
      isAuthorizedInternalStaff = false;
    }

    // A request is treated as public if it is explicitly flagged as public OR if the caller
    // lacks verified internal staff membership in the target organization.
    const isPublicRequest = input.isPublic === true || !isAuthorizedInternalStaff;

    const [settings] = await db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.organizationId, organizationId))
      .limit(1);

    const bookingPreferences = (settings?.bookingPreferences && typeof settings.bookingPreferences === "object" && !Array.isArray(settings.bookingPreferences))
      ? (settings.bookingPreferences as Record<string, any>)
      : {};

    if (isPublicRequest) {
      if (bookingPreferences.publicBookingEnabled !== true) {
        throw new Error("Public booking is disabled for this organization.");
      }
    }

    // 1. Fetch Service duration & verify tenant isolation
    const [service] = await db
      .select()
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.organizationId, organizationId)));
    if (!service) throw new Error("Service not found or unauthorized");
    if (!service.isActive || service.isArchived) {
      throw new Error("Service is unavailable or unpublished.");
    }

    // 1b. Verify Staff Member belongs to organization and is assigned to the service
    let staff: any = null;
    if (staffMemberId && staffMemberId.trim()) {
      const [foundStaff] = await db
        .select()
        .from(staffMembers)
        .where(and(eq(staffMembers.id, staffMemberId), eq(staffMembers.organizationId, organizationId)));
      if (!foundStaff) {
        throw new Error("Staff member not found or access denied.");
      }
      if (!foundStaff.isActive) {
        throw new Error("Selected staff member is not currently active.");
      }
      staff = foundStaff;
    }

    // Verify service eligibility if service assignments exist
    const assignments = await db
      .select()
      .from(serviceAssignments)
      .where(and(eq(serviceAssignments.serviceId, serviceId), eq(serviceAssignments.organizationId, organizationId)));

    if (assignments.length > 0 && staff) {
      const isEligible = assignments.some((a) => a.staffMemberId === staff.id);
      if (!isEligible) {
        throw new Error("The selected staff member is not eligible to provide this service.");
      }
    }

    if (!staff) {
      if (assignments.length > 0) {
        const assignedStaffIds = assignments.map((a) => a.staffMemberId);
        const [assignedStaff] = await db
          .select()
          .from(staffMembers)
          .where(and(inArray(staffMembers.id, assignedStaffIds), eq(staffMembers.isActive, true)))
          .limit(1);
        staff = assignedStaff || null;
      }
      if (!staff) {
        // Find an active staff member in the organization
        const activeStaffList = await db
          .select()
          .from(staffMembers)
          .where(and(eq(staffMembers.organizationId, organizationId), eq(staffMembers.isActive, true)))
          .limit(1);
        staff = activeStaffList[0] || null;
      }
    }

    if (!staff) {
      // Auto-provision a default staff member so booking is never blocked
      staff = await staffRepository.create({
        organizationId,
        name: "General Specialist",
        role: "Front Desk & Service Team",
        isActive: true,
      });
    }

    const effectiveStaffId = staff.id;
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
      effectiveStaffId
    );
    const norm = (t: string) => t.replace(/^0/, "").trim();
    const isSlotAvailable = availableSlots.some(
      (s) => norm(s.startTime) === norm(slotTimeStr)
    );

    if (!isSlotAvailable) {
      throw new Error(`Requested time slot ${slotTimeStr} is outside business hours or no longer available for booking.`);
    }

    // 3. Concurrency Protection & Transactional Lock
    // Execute inside a database transaction with a staff schedule advisory lock & conflict verification
    const appointment = await db.transaction(async (tx) => {
      // Transactional advisory lock keyed on the staff member and booking slot timestamp
      const lockKey = `${effectiveStaffId}_${startTime.toISOString()}`;
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);

      // Verify no concurrent transaction just committed an overlapping booking
      const conflicting = await tx
        .select({ id: appointments.id })
        .from(appointments)
        .where(
          and(
            eq(appointments.organizationId, organizationId),
            eq(appointments.staffMemberId, effectiveStaffId),
            notInArray(appointments.status, ["cancelled", "rescheduled"]),
            lt(appointments.startTime, endTime),
            gt(appointments.endTime, startTime)
          )
        )
        .limit(1);

      if (conflicting.length > 0) {
        throw new Error(`Concurrency Conflict: This slot has just been booked by another customer. Please choose another time.`);
      }

      // Resolve or link canonical CRM customer identity
      let targetLeadProfileId = input.leadProfileId;
      if (!targetLeadProfileId && (input.customerPhone || input.customerEmail)) {
        const resolved = await identityResolverService.resolveCustomerIdentity({
          organizationId,
          phone: input.customerPhone,
          email: input.customerEmail,
          name: input.customerName,
          channel: "appointment",
        });
        targetLeadProfileId = resolved.leadProfileId;
      }

      const shouldRequirePayment = input.requirePayment !== undefined
        ? input.requirePayment
        : (bookingPreferences.depositEnabled === true && parseFloat(service.price || "0") > 0);

      const initialStatus = shouldRequirePayment ? "pending_payment" : "confirmed";

      // Insert Appointment atomically in DB
      return await appointmentsRepository.create({
        organizationId,
        leadProfileId: targetLeadProfileId || input.leadProfileId,
        serviceId,
        staffMemberId: effectiveStaffId,
        status: initialStatus,
        startTime,
        endTime,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
      }, tx);
    });

    // 4. Sync event to connected third-party calendar
    const connections = await calendarRepository.listConnections(organizationId);
    const staffConn = connections.find((c) => c.staffMemberId === effectiveStaffId && c.syncStatus === "active");

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

    let paymentSession: any = null;
    if (appointment.status === "pending_payment" || input.requirePayment) {
      paymentSession = await customerPaymentService.createCustomerPaymentSession({
        organizationId,
        serviceId,
        appointmentId: appointment.id,
        leadProfileId: appointment.leadProfileId,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
      });
    }

    return {
      ...appointment,
      payment: paymentSession,
    };
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
    // Validate cross-tenant ownership
    const [service] = await db
      .select()
      .from(services)
      .where(and(eq(services.id, input.serviceId), eq(services.organizationId, input.organizationId)));
    if (!service) throw new Error("Service not found or unauthorized");

    const [staff] = await db
      .select()
      .from(staffMembers)
      .where(and(eq(staffMembers.id, input.staffMemberId), eq(staffMembers.organizationId, input.organizationId)));
    if (!staff) throw new Error("Staff member not found or unauthorized");

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

