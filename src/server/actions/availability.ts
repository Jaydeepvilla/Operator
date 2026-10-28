"use server";

import { auth, requireOrganizationAccess } from "@/lib/auth/server";
import { availabilityService } from "../services/availability";
import { organizationRepository } from "../repositories/organization";
import { parseNaturalDateTime } from "@/lib/date";
import { db } from "../db";
import { businessSettings } from "../db/schema";
import { eq } from "drizzle-orm";

export async function getAvailableSlotsAction(data: {
  serviceId: string;
  dateStr: string; // YYYY-MM-DD
  staffMemberId?: string;
  organizationId?: string;
}) {
  try {
    const authContext = await auth();
    let organizationId: string;

    if (authContext.userId) {
      // Authenticated caller: Server-authorized context takes absolute precedence.
      // User-supplied business identifier is strictly prevented from overriding session context.
      const authResult = await requireOrganizationAccess();
      organizationId = authResult.organizationId;
    } else {
      // Unauthenticated public widget caller: must provide organizationId and pass fail-closed public booking checks
      if (!data.organizationId) {
        throw new Error("Organization identifier is required for public availability queries.");
      }

      const [settings] = await db
        .select()
        .from(businessSettings)
        .where(eq(businessSettings.organizationId, data.organizationId))
        .limit(1);

      if (
        !settings ||
        !settings.bookingPreferences ||
        typeof settings.bookingPreferences !== "object" ||
        Array.isArray(settings.bookingPreferences)
      ) {
        throw new Error("Public booking is disabled for this organization.");
      }

      const bookingPreferences = settings.bookingPreferences as Record<string, any>;
      if (bookingPreferences.publicBookingEnabled !== true) {
        throw new Error("Public booking is disabled for this organization.");
      }

      organizationId = data.organizationId;
    }
    
    if (!data.serviceId || !data.dateStr) {
      throw new Error("Service ID and target date are required.");
    }

    const org = await organizationRepository.getById(organizationId);
    if (!org) {
      throw new Error("Organization not found.");
    }
    const timezone = org?.timezone || "UTC";

    const parseResult = parseNaturalDateTime(data.dateStr, { timezone });
    if (!parseResult.success) {
      throw new Error(parseResult.reason || `Invalid date: "${data.dateStr}"`);
    }

    const slots = await availabilityService.getAvailableSlots(
      organizationId,
      data.serviceId,
      parseResult.isoDate,
      data.staffMemberId
    );

    return {
      success: true,
      slots,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to calculate slot openings",
    };
  }
}
