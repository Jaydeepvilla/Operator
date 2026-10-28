"use server";

import { auth, requireOrganizationAccess, requireManagerAccess, requireAdminAccess, assertResourceOwnership, AuthorizationError } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { servicesRepository, NewService } from "../repositories/services";
import { syncService } from "../services/sync";
import { db } from "../db";
import { services, serviceCategories, memberships, appointments, businessSettings } from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { verificationEngine } from "../services/verification/engine";
import { settingsRepository } from "../repositories/settings";

export async function getServicesAction(publicOrgId?: string) {
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
      if (!publicOrgId) {
        throw new Error("Organization identifier is required for public services query.");
      }

      const [settings] = await db
        .select()
        .from(businessSettings)
        .where(eq(businessSettings.organizationId, publicOrgId))
        .limit(1);

      if (
        !settings ||
        !settings.bookingPreferences ||
        typeof settings.bookingPreferences !== "object" ||
        Array.isArray(settings.bookingPreferences)
      ) {
        throw new Error("Public booking is disabled for this organization.");
      }
      organizationId = publicOrgId;
    }

    const list = await servicesRepository.list(organizationId);
    const categories = await servicesRepository.listCategories(organizationId);
    return { success: true, services: list, categories };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load services" };
  }
}

export async function createServiceAction(data: {
  name: string;
  categoryName: string;
  description: string;
  duration: number;
  price: string;
}) {
  try {
    const { organizationId } = await requireManagerAccess();

    // Input validation
    if (!data.name?.trim() || data.name.length > 200) {
      throw new Error("Service name is required and must be under 200 characters");
    }
    if (data.duration <= 0 || data.duration > 600) {
      throw new Error("Duration must be between 1 and 600 minutes");
    }
    const priceNum = parseFloat(data.price);
    if (isNaN(priceNum) || priceNum < 0) {
      throw new Error("Price must be a valid non-negative number");
    }

    // 1. Get or create category
    let category = await servicesRepository.getCategoryByName(organizationId, data.categoryName);
    if (!category && data.categoryName.trim()) {
      category = await servicesRepository.createCategory({
        organizationId,
        name: data.categoryName.trim(),
      });
    }

    // 2. Insert Service record
    const service = await servicesRepository.create({
      organizationId,
      categoryId: category?.id || null,
      name: data.name.trim(),
      description: data.description?.trim() || "",
      duration: data.duration,
      price: data.price,
      isActive: true,
    });

    await syncService.syncServiceItem(
      organizationId,
      service.id,
      service.name,
      service.description || "",
      service.duration,
      service.price,
      service.isActive
    );

    await verificationEngine.invalidateScenarios(organizationId, ["pricing_hours"]);

    // Auto-mark services setup task completed
    try {
      const settings = await settingsRepository.getByOrg(organizationId);
      if (settings) {
        const currentBp = (settings.bookingPreferences as Record<string, any>) || {};
        const confirmed: string[] = Array.isArray(currentBp.confirmedTasks) ? [...currentBp.confirmedTasks] : [];
        if (!confirmed.includes("services")) confirmed.push("services");
        const uncompleted = Array.isArray(currentBp.uncompletedTasks) ? currentBp.uncompletedTasks.filter((t: string) => t !== "services") : [];
        await settingsRepository.update(organizationId, {
          bookingPreferences: {
            ...currentBp,
            servicesConfigured: true,
            confirmedTasks: confirmed,
            uncompletedTasks: uncompleted,
          },
        });
      }
    } catch (e) {}

    revalidatePath("/services");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to create service" };
  }
}

export async function updateServiceAction(
  id: string,
  data: {
    name: string;
    categoryName: string;
    description: string;
    duration: number;
    price: string;
    isActive: boolean;
  }
) {
  try {
    const { organizationId } = await requireManagerAccess();
    // IDOR guard: assert service belongs to tenant
    await assertResourceOwnership(services, id, organizationId, "Service");

    if (!data.name?.trim() || data.name.length > 200) {
      throw new Error("Service name is required and must be under 200 characters");
    }
    if (data.duration <= 0 || data.duration > 600) {
      throw new Error("Duration must be between 1 and 600 minutes");
    }

    // 1. Get or create category
    let category = await servicesRepository.getCategoryByName(organizationId, data.categoryName);
    if (!category && data.categoryName.trim()) {
      category = await servicesRepository.createCategory({
        organizationId,
        name: data.categoryName.trim(),
      });
    }

    // 2. Update service atomically
    const updated = await servicesRepository.update(id, organizationId, {
      name: data.name.trim(),
      categoryId: category?.id || null,
      description: data.description?.trim() || "",
      duration: data.duration,
      price: data.price,
      isActive: data.isActive,
    });

    if (updated) {
      await syncService.syncServiceItem(
        organizationId,
        updated.id,
        updated.name,
        updated.description || "",
        updated.duration,
        updated.price,
        updated.isActive
      );
    }

    await verificationEngine.invalidateScenarios(organizationId, ["pricing_hours"]);

    revalidatePath("/services");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update service" };
  }
}

export async function archiveServiceAction(id: string) {
  try {
    const { organizationId } = await requireManagerAccess();
    // IDOR guard: assert service belongs to tenant
    const service = await assertResourceOwnership(services, id, organizationId, "Service");

    const updated = await servicesRepository.update(id, organizationId, { isArchived: true });
    if (updated) {
      await syncService.syncServiceItem(
        organizationId,
        updated.id,
        updated.name,
        updated.description || "",
        updated.duration,
        updated.price,
        updated.isActive,
        true
      );
    }

    await verificationEngine.invalidateScenarios(organizationId, ["pricing_hours"]);
    revalidatePath("/services");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to archive service" };
  }
}

export async function deleteServiceAction(id: string) {
  try {
    const { organizationId } = await requireAdminAccess();
    // IDOR guard: assert service belongs to tenant
    const service = await assertResourceOwnership(services, id, organizationId, "Service");

    // Prevent deletion if active appointments depend on this service
    const [dependentAppointment] = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.organizationId, organizationId),
          eq(appointments.serviceId, id),
          inArray(appointments.status, ["confirmed", "pending", "rescheduled"])
        )
      )
      .limit(1);

    if (dependentAppointment) {
      return {
        success: false,
        error: "Cannot delete this service because active appointments depend on it. Please reschedule, cancel, or archive the service instead.",
      };
    }

    const [deleted] = await db
      .delete(services)
      .where(and(eq(services.id, id), eq(services.organizationId, organizationId)))
      .returning();

    if (deleted) {
      await syncService.syncServiceItem(
        organizationId,
        deleted.id,
        deleted.name,
        deleted.description || "",
        deleted.duration,
        deleted.price,
        deleted.isActive,
        true
      );
    }
    revalidatePath("/services");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete service" };
  }
}

