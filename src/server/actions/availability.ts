"use server";

import { requireOrganizationAccess } from "@/lib/auth/server";
import { availabilityService } from "../services/availability";
import { organizationRepository } from "../repositories/organization";
import { parseNaturalDateTime } from "@/lib/date";

export async function getAvailableSlotsAction(data: {
  serviceId: string;
  dateStr: string; // YYYY-MM-DD
  staffMemberId?: string;
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    
    if (!data.serviceId || !data.dateStr) {
      throw new Error("Service ID and target date are required.");
    }

    const org = await organizationRepository.getById(organizationId);
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

