"use server";

import { requireOrganizationAccess, assertResourceOwnership, AuthorizationError } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "../db";
import { staffMembers, serviceAssignments, staffSchedules, staffAvailability, services } from "../db/schema";
import { staffRepository } from "../repositories/staff";

export async function getStaffListAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const list = await staffRepository.list(organizationId);
    
    // Enrich with schedules & assignments summary
    const enrichedList = await Promise.all(
      list.map(async (staff) => {
        const schedules = await staffRepository.getSchedules(staff.id, organizationId);
        const assignments = await staffRepository.listAssignments(staff.id, organizationId);
        return {
          ...staff,
          schedules,
          assignments,
        };
      })
    );

    return { success: true, staff: enrichedList };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load staff list" };
  }
}

export async function getStaffDetailsAction(staffId: string) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    
    const staff = await assertResourceOwnership(staffMembers, staffId, organizationId, "Staff member");

    const schedules = await staffRepository.getSchedules(staffId, organizationId);
    const exceptions = await staffRepository.getAvailabilityExceptions(staffId, organizationId);
    const assignments = await staffRepository.listAssignments(staffId, organizationId);

    return {
      success: true,
      staff,
      schedules,
      exceptions,
      assignments,
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load staff details" };
  }
}

export async function createStaffAction(data: {
  name: string;
  role: string;
  email?: string | null;
  phone?: string | null;
  bufferTime?: number;
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();

    if (!data.name?.trim()) {
      throw new Error("Staff name is required");
    }

    const staff = await staffRepository.create({
      organizationId,
      name: data.name.trim(),
      role: data.role?.trim() || "Staff Member",
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      bufferTime: data.bufferTime ?? 0,
      isActive: true,
    });

    // Seed empty default schedules (Monday-Friday 9am-5pm)
    for (let day = 1; day <= 5; day++) {
      await staffRepository.saveSchedule({
        organizationId,
        staffMemberId: staff.id,
        dayOfWeek: day,
        shifts: [{ start: "09:00", end: "17:00" }],
      });
    }

    revalidatePath("/staff");
    return { success: true, staff };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to create staff member" };
  }
}

export async function updateStaffAction(
  id: string,
  updates: {
    name: string;
    role: string;
    email?: string | null;
    phone?: string | null;
    bufferTime?: number;
    isActive?: boolean;
  }
) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    await assertResourceOwnership(staffMembers, id, organizationId, "Staff member");

    const updated = await staffRepository.update(id, organizationId, {
      ...updates,
      name: updates.name?.trim(),
      role: updates.role?.trim(),
      email: updates.email?.trim() || null,
      phone: updates.phone?.trim() || null,
    });

    revalidatePath("/staff");
    return { success: true, staff: updated };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update staff member" };
  }
}

export async function deleteStaffAction(id: string) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    await assertResourceOwnership(staffMembers, id, organizationId, "Staff member");

    await staffRepository.delete(id, organizationId);

    revalidatePath("/staff");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete staff member" };
  }
}

export async function saveStaffScheduleAction(
  staffId: string,
  schedule: { dayOfWeek: number; shifts: Array<{ start: string; end: string }> }
) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    await assertResourceOwnership(staffMembers, staffId, organizationId, "Staff member");

    await staffRepository.saveSchedule({
      organizationId,
      staffMemberId: staffId,
      dayOfWeek: schedule.dayOfWeek,
      shifts: schedule.shifts,
    });

    revalidatePath("/staff");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save schedule" };
  }
}

export async function saveAvailabilityExceptionAction(data: {
  staffMemberId: string;
  exceptionDate: string;
  isAvailable: boolean;
  shifts?: Array<{ start: string; end: string }> | null;
  reason?: string | null;
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    await assertResourceOwnership(staffMembers, data.staffMemberId, organizationId, "Staff member");

    await staffRepository.saveAvailabilityException({
      organizationId,
      staffMemberId: data.staffMemberId,
      exceptionDate: data.exceptionDate,
      isAvailable: data.isAvailable,
      shifts: data.shifts,
      reason: data.reason,
    });

    revalidatePath("/staff");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save holiday override exception" };
  }
}

export async function deleteAvailabilityExceptionAction(id: string) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    await assertResourceOwnership(staffAvailability, id, organizationId, "Availability exception");

    await staffRepository.deleteAvailabilityException(id, organizationId);

    revalidatePath("/staff");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete exception override" };
  }
}

export async function updateStaffAssignmentsAction(staffId: string, serviceIds: string[]) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    await assertResourceOwnership(staffMembers, staffId, organizationId, "Staff member");

    // Cross-tenant relationship validation: Verify that all assigned services belong to the same organization
    if (serviceIds.length > 0) {
      const validServices = await db
        .select({ id: services.id })
        .from(services)
        .where(and(eq(services.organizationId, organizationId), inArray(services.id, serviceIds)));

      if (validServices.length !== serviceIds.length) {
        throw new AuthorizationError("One or more assigned services do not belong to your organization.");
      }
    }

    // Clean existing service assignments for this staff in this organization
    await db
      .delete(serviceAssignments)
      .where(and(eq(serviceAssignments.staffMemberId, staffId), eq(serviceAssignments.organizationId, organizationId)));

    // Create verified assignments
    for (const serviceId of serviceIds) {
      await staffRepository.assignService(organizationId, staffId, serviceId);
    }

    revalidatePath("/staff");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update assignments" };
  }
}

