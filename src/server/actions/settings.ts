"use server";

import { auth } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { settingsRepository } from "../repositories/settings";
import { membershipRepository } from "../repositories/membership";
import { DEFAULT_BUSINESS_HOURS } from "@/lib/constants/templates";

async function getVerifiedOrgId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const memberships = await membershipRepository.getByUser(userId);
  if (memberships.length === 0) throw new Error("No organization found");
  return memberships[0].organizationId;
}

export async function getBusinessSettingsAction() {
  try {
    const orgId = await getVerifiedOrgId();
    let settings = await settingsRepository.getByOrg(orgId);
    if (!settings) {
      // Seed default empty settings
      settings = await settingsRepository.create({
        organizationId: orgId,
        businessHours: DEFAULT_BUSINESS_HOURS,
        holidays: [],
        languages: ["en"],
        bookingPreferences: { slotIntervalMinutes: 30, bufferMinutes: 10, autoApprove: false },
        notificationPreferences: { channels: ["email"], emailAddresses: [] },
        leadAssignmentRules: { type: "round_robin" },
      });
    }

    return { success: true, settings };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load business settings" };
  }
}

export async function saveBusinessHoursAction(
  businessHours: Record<string, { open: string; close: string; closed: boolean }>,
  holidays: string[]
) {
  try {
    const orgId = await getVerifiedOrgId();
    await settingsRepository.update(orgId, { businessHours, holidays });
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save business hours" };
  }
}

export async function saveGeneralSettingsAction(data: {
  languages: string[];
  bookingPreferences: Record<string, any>;
  notificationPreferences: Record<string, any>;
  leadAssignmentRules: Record<string, any>;
}) {
  try {
    const orgId = await getVerifiedOrgId();
    await settingsRepository.update(orgId, data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save settings" };
  }
}

export async function triggerWebsiteImportAction(url: string) {
  try {
    const orgId = await getVerifiedOrgId();

    // Store URL and set status to imported to indicate success
    await settingsRepository.update(orgId, {
      websiteImportUrl: url,
      websiteImportStatus: "imported", // Successful website import status
    });

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to import website" };
  }
}

export async function saveEscalationRulesAction(rules: Record<string, any>) {
  try {
    const orgId = await getVerifiedOrgId();
    const settings = await settingsRepository.getByOrg(orgId);
    const existingNotificationPrefs = (settings?.notificationPreferences as Record<string, any>) || {};

    await settingsRepository.update(orgId, {
      notificationPreferences: {
        ...existingNotificationPrefs,
        humanEscalationRules: rules,
      },
    });
    revalidatePath("/settings/rules");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save human escalation rules" };
  }
}

export async function saveBookingPreferencesAction(bookingPreferences: Record<string, any>) {
  try {
    const orgId = await getVerifiedOrgId();
    await settingsRepository.update(orgId, { bookingPreferences });
    revalidatePath("/settings/booking");
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save booking preferences" };
  }
}

// ── Global Localization & Regionalization Settings Actions ──

import { db } from "../db";
import { 
  countries as countriesTable, 
  languages as languagesTable, 
  currencies as currenciesTable, 
  businessLocalization as businessLocalizationTable 
} from "../db/schema";
import { eq } from "drizzle-orm";

export async function getLocalizationMetadataAction() {
  try {
    const orgId = await getVerifiedOrgId();

    const [countryList, langList, curList] = await Promise.all([
      db.select().from(countriesTable),
      db.select().from(languagesTable),
      db.select().from(currenciesTable)
    ]);

    let businessSettings = await db.query.businessLocalization.findFirst({
      where: eq(businessLocalizationTable.organizationId, orgId),
    });

    if (!businessSettings) {
      // Seed default organization localization settings
      const [newSettings] = await db
        .insert(businessLocalizationTable)
        .values({
          organizationId: orgId,
          countryCode: "US",
          primaryLanguage: "en",
          currencyCode: "USD",
          timezone: "UTC",
          dateFormat: "YYYY-MM-DD",
          timeFormat: "24h",
          weekStart: 1,
          measurementUnit: "metric",
        })
        .returning();
      businessSettings = newSettings;
    }

    return {
      success: true,
      countries: countryList,
      languages: langList,
      currencies: curList,
      businessLocalization: businessSettings
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load localization metadata" };
  }
}

export async function updateBusinessLocalizationAction(data: {
  countryCode: string;
  primaryLanguage: string;
  currencyCode: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  weekStart: number;
  measurementUnit: string;
}) {
  try {
    const orgId = await getVerifiedOrgId();

    const existing = await db.query.businessLocalization.findFirst({
      where: eq(businessLocalizationTable.organizationId, orgId),
    });

    if (existing) {
      await db
        .update(businessLocalizationTable)
        .set({
          ...data,
        })
        .where(eq(businessLocalizationTable.id, existing.id));
    } else {
      await db
        .insert(businessLocalizationTable)
        .values({
          organizationId: orgId,
          ...data,
        });
    }

    revalidatePath("/settings");
    revalidatePath("/settings/localization");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update localization settings" };
  }
}

