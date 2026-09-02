import { widgetRepository } from "../repositories/widget";
import dns from "dns";

export const widgetService = {
  /**
   * Retrieves a consolidated configuration bundle for the widget loader.
   */
  async getWidgetSettingsBundle(organizationId: string) {
    const [config, theme, branding, launcher, customization] = await Promise.all([
      widgetRepository.getConfigs(organizationId),
      widgetRepository.getTheme(organizationId),
      widgetRepository.getBranding(organizationId),
      widgetRepository.getLauncher(organizationId),
      widgetRepository.getCustomization(organizationId)
    ]);

    return {
      enabled: config.enabled,
      theme: {
        themeMode: theme.themeMode,
        primaryColor: theme.primaryColor,
        backgroundColor: theme.backgroundColor,
        textColor: theme.textColor,
        borderColor: theme.borderColor,
        borderRadius: theme.borderRadius,
        customCss: theme.customCss
      },
      branding: {
        companyName: branding.companyName,
        tagline: branding.tagline,
        logoUrl: branding.logoUrl,
        avatarUrl: branding.avatarUrl,
        welcomeMessage: branding.welcomeMessage,
        headerImageUrl: branding.headerImageUrl
      },
      launcher: {
        position: launcher.position,
        icon: launcher.icon,
        size: launcher.size,
        spacingX: launcher.spacingX,
        spacingY: launcher.spacingY
      },
      customization: {
        starterQuestions: customization.starterQuestions,
        suggestedActions: customization.suggestedActions,
        proactiveTriggers: customization.proactiveTriggers,
        widgetWidth: customization.widgetWidth,
        widgetHeight: customization.widgetHeight,
        shadowStyle: customization.shadowStyle
      }
    };
  },

  /**
   * Security check to ensure a domain has whitelisted permission to load the widget.
   */
  async checkDomainWhitelisted(organizationId: string, requestOrigin: string) {
    const domains = await widgetRepository.listDomains(organizationId);
    if (domains.length === 0) {
      // If no domains are configured, allow embed (default whitelist behavior for early onboarding)
      return true;
    }

    // Clean origin (e.g. "https://myclinic.com" -> "myclinic.com")
    let cleanedOrigin = requestOrigin
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .split(":")[0]; // strip port

    return domains.some((d) => {
      const cleanWhitelist = d.domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
      return cleanedOrigin === cleanWhitelist && d.isActive && d.isVerified;
    });
  },

  /**
   * Triggers a DNS or metadata check to verify domain ownership.
   */
  async verifyDomainOwnership(organizationId: string, domainId: string) {
    const domains = await widgetRepository.listDomains(organizationId);
    const domainRecord = domains.find((d) => d.id === domainId);
    
    if (!domainRecord) {
      throw new Error("Domain record not found");
    }

    const cleanDomain = domainRecord.domain
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .split(":")[0];

    try {
      const txtRecords = await dns.promises.resolveTxt(cleanDomain);
      const flatRecords = txtRecords.flat();
      const token = domainRecord.verificationToken;
      const isVerified = flatRecords.some(
        (record) =>
          record === token ||
          record === `operator-verify=${token}` ||
          record === `nexx-verification=${token}`
      );

      if (isVerified) {
        await widgetRepository.updateDomainVerification(domainId, true);
        return { success: true, message: "Domain verified successfully" };
      } else {
        return { 
          success: false, 
          message: `TXT verification record not found. Expected record: "operator-verify=${token}"` 
        };
      }
    } catch (error: any) {
      console.error(`[Widget Service] DNS lookup failed for ${cleanDomain}:`, error);
      return { 
        success: false, 
        message: `DNS query failed: ${error.message}. Please configure the TXT record first.` 
      };
    }
  }
};
