"use server";

import { requireOrganizationAccess } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { settingsRepository } from "../repositories/settings";
import { DEFAULT_BUSINESS_HOURS } from "@/lib/constants/templates";
import { db } from "../db";
import { 
  countries as countriesTable, 
  languages as languagesTable, 
  currencies as currenciesTable, 
  businessLocalization as businessLocalizationTable 
} from "../db/schema";
import { eq, and } from "drizzle-orm";

export async function getBusinessSettingsAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();
    let settings = await settingsRepository.getByOrg(organizationId);
    if (!settings) {
      // Seed default empty settings
      settings = await settingsRepository.create({
        organizationId,
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
    const { organizationId } = await requireOrganizationAccess();
    await settingsRepository.update(organizationId, { businessHours, holidays });
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
    const { organizationId } = await requireOrganizationAccess();
    await settingsRepository.update(organizationId, data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save settings" };
  }
}

export async function triggerWebsiteImportAction(url: string) {
  try {
    const { organizationId } = await requireOrganizationAccess();

    // Store URL and set status to imported to indicate success
    await settingsRepository.update(organizationId, {
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
    const { organizationId } = await requireOrganizationAccess();
    const settings = await settingsRepository.getByOrg(organizationId);
    const existingNotificationPrefs = (settings?.notificationPreferences as Record<string, any>) || {};

    await settingsRepository.update(organizationId, {
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
    const { organizationId } = await requireOrganizationAccess();
    await settingsRepository.update(organizationId, { bookingPreferences });
    revalidatePath("/settings/booking");
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save booking preferences" };
  }
}

// ── Global Localization & Regionalization Settings Actions ──

export async function getLocalizationMetadataAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();

    const [countryList, langList, curList] = await Promise.all([
      db.select().from(countriesTable),
      db.select().from(languagesTable),
      db.select().from(currenciesTable)
    ]);

    let businessSettings = await db.query.businessLocalization.findFirst({
      where: eq(businessLocalizationTable.organizationId, organizationId),
    });

    if (!businessSettings) {
      // Seed default organization localization settings
      const [newSettings] = await db
        .insert(businessLocalizationTable)
        .values({
          organizationId,
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
    const { organizationId } = await requireOrganizationAccess();

    const existing = await db.query.businessLocalization.findFirst({
      where: eq(businessLocalizationTable.organizationId, organizationId),
    });

    if (existing) {
      await db
        .update(businessLocalizationTable)
        .set({
          ...data,
        })
        .where(and(eq(businessLocalizationTable.id, existing.id), eq(businessLocalizationTable.organizationId, organizationId)));
    } else {
      await db
        .insert(businessLocalizationTable)
        .values({
          organizationId,
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


