"use server";

import { auth } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { servicesRepository, NewService } from "../repositories/services";
import { membershipRepository } from "../repositories/membership";
import { syncService } from "../services/sync";
import { db } from "../db";
import { services } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { verificationEngine } from "../services/verification/engine";

async function getVerifiedOrgId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const memberships = await membershipRepository.getByUser(userId);
  if (memberships.length === 0) throw new Error("No organization found");
  return memberships[0].organizationId;
}

/**
 * IDOR guard: verifies the service belongs to the caller's org.
 */
async function assertServiceOwnership(orgId: string, serviceId: string) {
  const [service] = await db
    .select({ id: services.id, organizationId: services.organizationId })
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.organizationId, orgId)))
    .limit(1);

  if (!service) {
    throw new Error("Service not found or access denied");
  }
  return service;
}

export async function getServicesAction() {
  try {
    const orgId = await getVerifiedOrgId();
    const list = await servicesRepository.list(orgId);
    const categories = await servicesRepository.listCategories(orgId);
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
    const orgId = await getVerifiedOrgId();

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
    let category = await servicesRepository.getCategoryByName(orgId, data.categoryName);
    if (!category && data.categoryName.trim()) {
      category = await servicesRepository.createCategory({
        organizationId: orgId,
        name: data.categoryName.trim(),
      });
    }

    // 2. Insert Service record
    const service = await servicesRepository.create({
      organizationId: orgId,
      categoryId: category?.id || null,
      name: data.name.trim(),
      description: data.description?.trim() || "",
      duration: data.duration,
      price: data.price,
      isActive: true,
    });

    await syncService.syncServiceItem(
      orgId,
      service.id,
      service.name,
      service.description || "",
      service.duration,
      service.price,
      service.isActive
    );

    await verificationEngine.invalidateScenarios(orgId, ["pricing_hours"]);

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
    const orgId = await getVerifiedOrgId();
    // IDOR guard
    await assertServiceOwnership(orgId, id);

    if (!data.name?.trim() || data.name.length > 200) {
      throw new Error("Service name is required and must be under 200 characters");
    }
    if (data.duration <= 0 || data.duration > 600) {
      throw new Error("Duration must be between 1 and 600 minutes");
    }

    // 1. Get or create category
    let category = await servicesRepository.getCategoryByName(orgId, data.categoryName);
    if (!category && data.categoryName.trim()) {
      category = await servicesRepository.createCategory({
        organizationId: orgId,
        name: data.categoryName.trim(),
      });
    }

    // 2. Update service
    const updated = await servicesRepository.update(id, {
      name: data.name.trim(),
      categoryId: category?.id || null,
      description: data.description?.trim() || "",
      duration: data.duration,
      price: data.price,
      isActive: data.isActive,
    });

    if (updated) {
      await syncService.syncServiceItem(
        orgId,
        updated.id,
        updated.name,
        updated.description || "",
        updated.duration,
        updated.price,
        updated.isActive
      );
    }

    await verificationEngine.invalidateScenarios(orgId, ["pricing_hours"]);

    revalidatePath("/services");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update service" };
  }
}

export async function archiveServiceAction(id: string) {
  try {
    const orgId = await getVerifiedOrgId();
    // IDOR guard
    await assertServiceOwnership(orgId, id);

    const updated = await servicesRepository.update(id, { isArchived: true });
    if (updated) {
      await syncService.syncServiceItem(
        orgId,
        updated.id,
        updated.name,
        updated.description || "",
        updated.duration,
        updated.price,
        updated.isActive,
        true
      );
    }

    await verificationEngine.invalidateScenarios(orgId, ["pricing_hours"]);
    revalidatePath("/services");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to archive service" };
  }
}

export async function deleteServiceAction(id: string) {
  try {
    const orgId = await getVerifiedOrgId();
    // IDOR guard
    const service = await assertServiceOwnership(orgId, id);

    const [fullService] = await db.select().from(services).where(eq(services.id, id)).limit(1);
    if (fullService) {
      await servicesRepository.delete(id);
      await syncService.syncServiceItem(
        orgId,
        fullService.id,
        fullService.name,
        fullService.description || "",
        fullService.duration,
        fullService.price,
        fullService.isActive,
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
