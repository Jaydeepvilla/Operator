"use server";

import { revalidatePath } from "next/cache";
import { requireOrganizationAccess } from "@/lib/auth/server";
import { verificationEngine } from "../services/verification/engine";
import { VerificationScenarioType } from "../services/verification/types";
import { db } from "../db";
import { organizations } from "../db/schema";
import { eq } from "drizzle-orm";

/**
 * Fetch dynamic scenarios with their current evaluation states.
 */
export async function getVerificationScenariosAction(_orgId?: string) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const data = await verificationEngine.getScenarios(organizationId);
    return { success: true, ...data };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to load verification scenarios" };
  }
}

/**
 * Executes a single verification scenario with zero DB side-effects.
 */
export async function runVerificationScenarioAction(scenarioId: string, _orgId?: string) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const result = await verificationEngine.runScenario(organizationId, scenarioId);
    return { success: true, ...result };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to execute scenario" };
  }
}

/**
 * Fast inline edit of service data directly from scenario failure/correction prompt.
 */
export async function updateInlineServiceAction(
  serviceId: string,
  updates: { price?: string; name?: string; duration?: number },
  _orgId?: string
) {
  try {
    const { organizationId, role } = await requireOrganizationAccess(["owner", "admin", "manager"]);

    const updated = await verificationEngine.updateInlineService(organizationId, serviceId, updates);
    return { success: true, service: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update service" };
  }
}

/**
 * Server-authoritative promotion to Verified if scenarios pass or onboarding finishes.
 */
export async function markOrganizationVerifiedAction(_orgId?: string) {
  try {
    const { organizationId } = await requireOrganizationAccess(["owner", "admin"]);

    await db
      .update(organizations)
      .set({
        verificationStatus: "verified",
        onboardingStatus: "completed",
        onboardingStep: "completed",
        onboardingCompletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId));

    revalidatePath("/dashboard");
    revalidatePath("/onboarding");

    return { success: true, status: "verified" };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to mark organization verified" };
  }
}

