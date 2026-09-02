"use server";

import { requireOrganizationAccess } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { db } from "../db";
import { widgetDomains } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { widgetRepository } from "../repositories/widget";
import { widgetService } from "../services/widget-service";

export async function getWidgetSettingsAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();
    
    const [config, theme, branding, launcher, customization, domains, installations, analytics] = await Promise.all([
      widgetRepository.getConfigs(organizationId),
      widgetRepository.getTheme(organizationId),
      widgetRepository.getBranding(organizationId),
      widgetRepository.getLauncher(organizationId),
      widgetRepository.getCustomization(organizationId),
      widgetRepository.listDomains(organizationId),
      widgetRepository.listInstallations(organizationId),
      widgetRepository.getAnalytics(organizationId)
    ]);

    return {
      success: true,
      data: {
        config,
        theme,
        branding,
        launcher,
        customization,
        domains,
        installations,
        analytics
      }
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load widget configurations" };
  }
}

export async function saveWidgetSettingsAction(data: {
  enabled?: boolean;
  theme?: any;
  branding?: any;
  launcher?: any;
  customization?: any;
}) {
  try {
    const { organizationId } = await requireOrganizationAccess();

    if (data.enabled !== undefined) {
      await widgetRepository.updateConfigs(organizationId, data.enabled);
    }
    if (data.theme) {
      await widgetRepository.updateTheme(organizationId, data.theme);
    }
    if (data.branding) {
      await widgetRepository.updateBranding(organizationId, data.branding);
    }
    if (data.launcher) {
      await widgetRepository.updateLauncher(organizationId, data.launcher);
    }
    if (data.customization) {
      await widgetRepository.updateCustomization(organizationId, data.customization);
    }

    revalidatePath("/widget");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save widget settings" };
  }
}

export async function addDomainAction(domainName: string) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    
    if (!domainName || !domainName.trim()) {
      throw new Error("Domain name cannot be empty");
    }

    // Clean domain format
    const cleaned = domainName
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .trim();

    const verificationToken = "operator-verify-" + Math.random().toString(36).substring(2, 10);

    const domain = await widgetRepository.createDomain({
      organizationId,
      domain: cleaned,
      verificationToken
    });

    revalidatePath("/widget");
    return { success: true, domain };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to add domain" };
  }
}

export async function deleteDomainAction(domainId: string) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    await widgetRepository.deleteDomain(organizationId, domainId);
    revalidatePath("/widget");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete domain" };
  }
}

export async function verifyDomainAction(domainId: string) {
  try {
    const { organizationId } = await requireOrganizationAccess();
    
    // Perform ownership verification check
    const result = await widgetService.verifyDomainOwnership(organizationId, domainId);
    
    revalidatePath("/widget");
    return { success: true, verified: result.success, message: result.message };
  } catch (error: any) {
    return { success: false, error: error?.message || "Verification check failed" };
  }
}

export async function resetThemeToBrandAction() {
  try {
    const { organizationId } = await requireOrganizationAccess();
    
    const brandTheme = {
      themeMode: "light",
      primaryColor: "#7a5af8",
      backgroundColor: "#ffffff",
      textColor: "#18181b",
      borderColor: "#e4e4e7",
      borderRadius: "0.75rem"
    };
    
    await widgetRepository.updateTheme(organizationId, brandTheme);
    
    revalidatePath("/widget");
    return { success: true, theme: brandTheme };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to reset theme" };
  }
}
