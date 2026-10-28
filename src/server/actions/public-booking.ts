"use server";

import { db } from "../db";
import { 
  organizations, 
  services, 
  staffMembers, 
  businessSettings, 
  appointments, 
  customerPayments,
  bookingRules 
} from "../db/schema";
import { eq, and, asc } from "drizzle-orm";
import { organizationRepository } from "../repositories/organization";
import { availabilityService } from "../services/availability";
import { bookingService } from "../services/booking";
import { customerPaymentService } from "../services/billing/customer-payment-service";
import { customerPaymentsRepository } from "../repositories/customer-payments";
import {
  checkPublicBookingSpamLimit,
  checkBookingIdempotency,
  recordBookingIdempotency,
  validateServiceDuration,
  sanitizeConfirmationContent,
} from "../services/booking-security";

export async function getPublicBusinessDetailsAction(slug: string) {
  try {
    const org = await organizationRepository.getBySlug(slug);
    if (!org) {
      return { success: false, error: "Business not found." };
    }

    // Fetch public business settings
    const [settings] = await db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.organizationId, org.id))
      .limit(1);

    const bookingPrefs = (settings?.bookingPreferences as Record<string, any>) || {};

    // Fetch active services
    const activeServices = await db
      .select({
        id: services.id,
        name: services.name,
        description: services.description,
        duration: services.duration,
        price: services.price,
      })
      .from(services)
      .where(and(eq(services.organizationId, org.id), eq(services.isActive, true), eq(services.isArchived, false)))
      .orderBy(asc(services.name));

    // Fetch active staff members
    const activeStaff = await db
      .select({
        id: staffMembers.id,
        name: staffMembers.name,
        role: staffMembers.role,
      })
      .from(staffMembers)
      .where(and(eq(staffMembers.organizationId, org.id), eq(staffMembers.isActive, true)))
      .orderBy(asc(staffMembers.name));

    return {
      success: true,
      business: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        industry: org.industry,
        timezone: org.timezone || "UTC",
        cancellationPolicy: bookingPrefs.cancellationPolicyText || "Please provide at least 24 hours notice for cancellations.",
        depositEnabled: Boolean(bookingPrefs.depositEnabled),
        depositAmount: Number(bookingPrefs.depositAmount || 0),
        depositType: bookingPrefs.depositType || "fixed",
      },
      services: activeServices,
      staff: activeStaff,
    };
  } catch (error: any) {
    console.error("[getPublicBusinessDetailsAction] Error:", error);
    return { success: false, error: error.message || "Failed to load business details." };
  }
}

export async function getPublicAvailableSlotsAction(
  organizationId: string,
  serviceId: string,
  date: string,
  staffMemberId?: string
) {
  try {
    const slots = await availabilityService.getAvailableSlots(
      organizationId,
      serviceId,
      date,
      staffMemberId
    );

    return {
      success: true,
      slots: slots.map((s) => ({
        startTime: s.startTime,
        endTime: s.endTime,
        staffMemberId: s.staffMemberId,
      })),
    };
  } catch (error: any) {
    console.error("[getPublicAvailableSlotsAction] Error:", error);
    return { success: false, error: error.message || "Failed to fetch available slots." };
  }
}

export interface CreatePublicBookingInput {
  slug: string;
  serviceId: string;
  staffMemberId?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
}

export async function createPublicBookingAction(input: CreatePublicBookingInput) {
  try {
    const { slug, serviceId, staffMemberId, date, time, customerName, customerEmail, customerPhone } = input;

    if (!customerName || !customerName.trim()) {
      return { success: false, error: "Please enter your name." };
    }
    if (!customerEmail || !customerEmail.includes("@")) {
      return { success: false, error: "Please provide a valid email address." };
    }
    if (!date || !time) {
      return { success: false, error: "Please choose an appointment date and time." };
    }

    const spamCheck = checkPublicBookingSpamLimit(customerEmail, customerEmail);
    if (spamCheck.isLimited) {
      return { success: false, error: spamCheck.reason || "Booking rate limit exceeded. Please try again later." };
    }

    const sanitizedCustomerName = sanitizeConfirmationContent(customerName);
    const sanitizedEmail = customerEmail.trim().toLowerCase();
    const sanitizedPhone = customerPhone ? customerPhone.trim() : null;

    const org = await organizationRepository.getBySlug(slug);
    if (!org) {
      return { success: false, error: "Business not found." };
    }

    // Verify service belongs to organization
    const [service] = await db
      .select()
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.organizationId, org.id)));

    if (!service || !service.isActive || service.isArchived) {
      return { success: false, error: "The selected service is not available." };
    }

    const durationCheck = validateServiceDuration(service.duration);
    if (!durationCheck.isValid) {
      return { success: false, error: durationCheck.error || "The service has an invalid duration." };
    }

    const idempotencyKey = `${org.id}:${serviceId}:${staffMemberId || "any"}:${date}:${time}:${sanitizedEmail}`;
    const idempCheck = checkBookingIdempotency(idempotencyKey);
    if (idempCheck.isDuplicate && idempCheck.appointmentId) {
      return {
        success: true,
        appointment: {
          id: idempCheck.appointmentId,
          customerName: sanitizedCustomerName,
          customerEmail: sanitizedEmail,
          startTime: new Date(),
          endTime: new Date(),
          status: "confirmed",
        },
        requiresPayment: false,
      };
    }

    // Parse date & time accurately according to the business timezone
    function parseDateTimeInTimezone(dateStr: string, timeStr: string, tz: string): Date {
      const [y, m, d] = dateStr.split("-").map(Number);
      const [h, min] = timeStr.split(":").map(Number);
      const guess = new Date(Date.UTC(y, m - 1, d, h, min, 0));
      try {
        const dtf = new Intl.DateTimeFormat("en-US", {
          timeZone: tz || "UTC",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
        const parts = dtf.formatToParts(guess);
        const p: Record<string, string> = {};
        for (const part of parts) p[part.type] = part.value;
        let hr = parseInt(p.hour, 10);
        if (hr === 24) hr = 0;
        const formattedGuess = new Date(Date.UTC(
          parseInt(p.year, 10),
          parseInt(p.month, 10) - 1,
          parseInt(p.day, 10),
          hr,
          parseInt(p.minute, 10),
          parseInt(p.second, 10)
        ));
        const diffMs = guess.getTime() - formattedGuess.getTime();
        return new Date(guess.getTime() + diffMs);
      } catch {
        return guess;
      }
    }

    const startTime = parseDateTimeInTimezone(date, time, org.timezone || "UTC");

    // Check if deposit is required
    const [settings] = await db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.organizationId, org.id))
      .limit(1);

    const bookingPrefs = (settings?.bookingPreferences as Record<string, any>) || {};
    const depositEnabled = Boolean(bookingPrefs.depositEnabled);
    const depositAmount = Number(bookingPrefs.depositAmount || 0);
    const servicePrice = parseFloat(service.price) || 0;
    const requireDeposit = depositEnabled && (depositAmount > 0 || servicePrice > 0);

    // Call unified bookingService
    const result = await bookingService.createAppointment({
      organizationId: org.id,
      serviceId,
      staffMemberId: staffMemberId || "",
      startTime,
      customerName: sanitizedCustomerName,
      customerEmail: sanitizedEmail,
      customerPhone: sanitizedPhone,
      isPublic: true,
      requirePayment: requireDeposit,
    });

    recordBookingIdempotency(idempotencyKey, result.id);

    return {
      success: true,
      appointment: {
        id: result.id,
        customerName: result.customerName,
        customerEmail: result.customerEmail,
        startTime: result.startTime,
        endTime: result.endTime,
        status: result.status,
      },
      payment: result.payment || null,
      requiresPayment: requireDeposit && Boolean(result.payment?.requiresPayment),
    };
  } catch (error: any) {
    console.error("[createPublicBookingAction] Error:", error);
    return { success: false, error: error.message || "Failed to create appointment." };
  }
}

export async function confirmPublicCustomerPaymentAction(paymentId: string) {
  try {
    const result = await customerPaymentService.confirmCustomerPayment({ paymentId });
    if (!result.success) {
      return { success: false, error: result.error || "Payment verification failed." };
    }

    let appointmentDetails: any = null;
    if (result.appointmentId) {
      const [apt] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, result.appointmentId));
      appointmentDetails = apt || null;
    }

    return {
      success: true,
      appointment: appointmentDetails,
    };
  } catch (error: any) {
    console.error("[confirmPublicCustomerPaymentAction] Error:", error);
    return { success: false, error: error.message || "Payment confirmation error." };
  }
}

export async function getCustomerPaymentDetailsAction(paymentId: string) {
  try {
    const payment = await customerPaymentsRepository.findById(paymentId);
    if (!payment) {
      return { success: false, error: "Payment record not found." };
    }

    const [org] = await db
      .select({ name: organizations.name, slug: organizations.slug })
      .from(organizations)
      .where(eq(organizations.id, payment.organizationId));

    let serviceName = "Appointment Service";
    if (payment.serviceId) {
      const [svc] = await db
        .select({ name: services.name })
        .from(services)
        .where(eq(services.id, payment.serviceId));
      if (svc) serviceName = svc.name;
    }

    return {
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        type: payment.type,
        status: payment.status,
        provider: payment.provider,
        businessName: org?.name || "Business",
        businessSlug: org?.slug || "",
        serviceName,
      },
    };
  } catch (error: any) {
    console.error("[getCustomerPaymentDetailsAction] Error:", error);
    return { success: false, error: error.message || "Failed to retrieve payment details." };
  }
}
