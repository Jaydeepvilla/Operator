"use server";

import { requireOrganizationAccess } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { organizationRepository } from "../repositories/organization";
import { profileRepository } from "../repositories/profile";
import { syncService } from "../services/sync";

export async function getBusinessProfileAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();
    const org = await organizationRepository.getById(organizationId);
    if (!org) throw new Error("Organization not found");
    const profile = await profileRepository.getByOrg(organizationId);

    return {
      success: true,
      data: {
        organization: org,
        profile: profile || null,
      },
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load profile" };
  }
}

export async function updateBusinessProfileAction(data: {
  name: string;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  timezone: string;
  description?: string | null;
  googleBusinessUrl?: string | null;
  reviewUrl?: string | null;
  socialLinks?: Record<string, string> | null;
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();

    // 1. Update Organization Table Fields
    await organizationRepository.update(organizationId, {
      name: data.name,
      website: data.website,
      email: data.email,
      phone: data.phone,
      address: data.address,
      timezone: data.timezone,
    });

    // 2. Update/Create Business Profile Table Fields
    const existing = await profileRepository.getByOrg(organizationId);
    if (!existing) {
      await profileRepository.create({
        organizationId,
        description: data.description,
        googleBusinessUrl: data.googleBusinessUrl,
        reviewUrl: data.reviewUrl,
        socialLinks: data.socialLinks,
      });
    } else {
      await profileRepository.update(organizationId, {
        description: data.description,
        googleBusinessUrl: data.googleBusinessUrl,
        reviewUrl: data.reviewUrl,
        socialLinks: data.socialLinks,
      });
    }

    // 3. Sync profile update to Knowledge Center
    const org = await organizationRepository.getById(organizationId);
    if (org) {
      await syncService.syncBusinessProfile(
        organizationId,
        org.name,
        data.description || "",
        org.email,
        org.phone,
        org.website,
        org.address
      );
    }

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update profile" };
  }
}

