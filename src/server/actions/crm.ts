"use server";

import { requireOrganizationAccess } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { crmDeduplicationService } from "../services/crm/deduplication";

/**
 * Retrieves duplicate lead profile candidates in the organization.
 */
export async function getDuplicateCandidatesAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const candidates = await crmDeduplicationService.findDuplicateCandidates(organizationId);
    return { success: true, candidates };
  } catch (error: any) {
    console.error("getDuplicateCandidatesAction error:", error);
    return { success: false, error: error?.message || "Failed to scan for duplicate profiles", candidates: [] };
  }
}

/**
 * Merges multiple duplicate source profiles into a target master profile.
 */
export async function mergeContactsAction(targetProfileId: string, sourceProfileIds: string[]) {
  try {
    const { userId, organizationId } = await requireOrganizationAccess();
    const result = await crmDeduplicationService.mergeProfiles(
      organizationId,
      targetProfileId,
      sourceProfileIds,
      userId
    );

    revalidatePath("/contacts");
    revalidatePath("/leads");
    revalidatePath("/inbox");
    revalidatePath("/appointments");

    return { success: true, mergedCount: result.mergedCount };
  } catch (error: any) {
    console.error("mergeContactsAction error:", error);
    return { success: false, error: error?.message || "Failed to merge contact profiles" };
  }
}
