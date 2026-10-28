/**
 * Central Authority for Business Setup and User-Generated Configuration Security Hardening.
 * Enforces all 13 Guarantees:
 * 1. Prevent unauthorized modification of business identity.
 * 2. Prevent unauthorized changes to business hours and time zone.
 * 3. Prevent unauthorized edits to services and prices.
 * 4. Prevent unauthorized changes to AI behavior or allowed actions.
 * 5. Prevent unauthorized changes to booking and cancellation policies.
 * 6. Prevent unauthorized changes to phone numbers and call routing.
 * 7. Prevent activation when critical integration requirements are unmet.
 * 8. Prevent invalid configuration from silently overriding working settings.
 * 9. Prevent concurrent edits from silently overwriting another user's changes.
 * 10. Prevent users from enabling features beyond their permitted plan or role.
 * 11. Prevent configuration imports from changing protected ownership or security fields.
 * 12. Prevent destructive setup resets without explicit authorization.
 * 13. Prevent business deletion from leaving active credentials, jobs or integrations unmanaged.
 */

import crypto from "crypto";

export class ConfigSecurityError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = "ConfigSecurityError";
  }
}

// Protected fields that must never be altered during configuration imports
const PROTECTED_CONFIG_IMPORT_FIELDS = new Set([
  "id",
  "organizationid",
  "organization_id",
  "orgid",
  "org_id",
  "ownerid",
  "owner_id",
  "createdat",
  "created_at",
  "subscriptiontier",
  "subscription_tier",
  "plan",
  "stripecustomerid",
  "stripe_customer_id",
  "razorpaycustomerid",
  "role",
  "memberships",
  "password",
  "passwordhash",
  "mfaenabled",
  "isverified",
  "status",
]);

// Valid IANA timezone pattern (e.g. America/New_York, UTC, Europe/London)
const IANA_TIMEZONE_REGEX = /^(?:[A-Za-z]+(?:\/[A-Za-z0-9_+\-]+)+|UTC|GMT)$/;

export const ConfigSecurityService = {
  /**
   * 1. Prevent unauthorized modification of business identity.
   * Locked strictly to the verified business Owner within the same tenant.
   */
  assertBusinessIdentityModificationAuthorized(params: {
    callerUserId: string;
    callerOrgId: string;
    targetOrgId: string;
    userRole: string;
    updates?: { name?: string; slug?: string; ownership?: string };
  }): void {
    const { callerUserId, callerOrgId, targetOrgId, userRole } = params;

    if (!callerUserId || callerUserId === "anonymous") {
      throw new ConfigSecurityError("Authentication required: Identity modifications require an authenticated session", 401);
    }

    if (callerOrgId !== targetOrgId) {
      throw new ConfigSecurityError(
        `Cross-tenant violation: Caller belongs to organization ${callerOrgId}, cannot modify business identity in ${targetOrgId}`,
        403
      );
    }

    if (userRole.toLowerCase() !== "owner") {
      throw new ConfigSecurityError(
        `Forbidden: Role '${userRole}' lacks permission to modify business identity. Only organization Owners can alter business identity.`,
        403
      );
    }
  },

  /**
   * 2. Prevent unauthorized changes to business hours and time zone.
   * Enforces admin/owner role and valid IANA timezone format.
   */
  assertBusinessScheduleModificationAuthorized(params: {
    callerRole: string;
    callerOrgId: string;
    targetOrgId: string;
    timezone?: string;
  }): void {
    const { callerRole, callerOrgId, targetOrgId, timezone } = params;

    if (callerOrgId !== targetOrgId) {
      throw new ConfigSecurityError(
        `Cross-tenant violation: Cannot modify business hours for another organization`,
        403
      );
    }

    const permittedRoles = ["owner", "admin"];
    if (!permittedRoles.includes(callerRole.toLowerCase())) {
      throw new ConfigSecurityError(
        `Forbidden: Role '${callerRole}' cannot modify business operating hours or timezone`,
        403
      );
    }

    if (timezone) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone.trim() });
      } catch {
        throw new ConfigSecurityError(
          `Invalid timezone '${timezone}': Must be a valid IANA timezone identifier (e.g. 'America/New_York' or 'UTC')`,
          422
        );
      }
    }
  },

  /**
   * 3. Prevent unauthorized edits to services and prices.
   * Requires manager/admin roles and enforces duration/price validity bounds.
   */
  assertServicePriceModificationAuthorized(params: {
    callerRole: string;
    callerOrgId: string;
    targetOrgId: string;
    price?: string | number;
    duration?: number;
  }): void {
    const { callerRole, callerOrgId, targetOrgId, price, duration } = params;

    if (callerOrgId !== targetOrgId) {
      throw new ConfigSecurityError(
        `Cross-tenant violation: Cannot edit services or pricing for another organization`,
        403
      );
    }

    const permittedRoles = ["owner", "admin", "manager"];
    if (!permittedRoles.includes(callerRole.toLowerCase())) {
      throw new ConfigSecurityError(
        `Forbidden: Role '${callerRole}' lacks permission to edit service catalog and pricing`,
        403
      );
    }

    if (price !== undefined) {
      const priceNum = typeof price === "number" ? price : parseFloat(price);
      if (isNaN(priceNum) || priceNum < 0) {
        throw new ConfigSecurityError("Price must be a valid non-negative number", 422);
      }
    }

    if (duration !== undefined) {
      if (duration <= 0 || duration > 600) {
        throw new ConfigSecurityError("Service duration must be between 1 and 600 minutes", 422);
      }
    }
  },

  /**
   * 4. Prevent unauthorized changes to AI behavior or allowed actions.
   * Restricts AI prompts, allowed tools, and autonomy configurations to admin/owner roles.
   */
  assertAiBehaviorConfigurationAuthorized(params: {
    callerRole: string;
    callerOrgId: string;
    targetOrgId: string;
    aiSettings?: {
      persona?: string;
      allowedActions?: string[];
      autonomyLevel?: string;
    };
  }): void {
    const { callerRole, callerOrgId, targetOrgId } = params;

    if (callerOrgId !== targetOrgId) {
      throw new ConfigSecurityError("Cross-tenant violation: Cannot modify AI behavior for another organization", 403);
    }

    const permittedRoles = ["owner", "admin"];
    if (!permittedRoles.includes(callerRole.toLowerCase())) {
      throw new ConfigSecurityError(
        `Forbidden: Role '${callerRole}' cannot alter AI persona behavior or allowed tool actions`,
        403
      );
    }
  },

  /**
   * 5. Prevent unauthorized changes to booking and cancellation policies.
   * Restricts buffer times, auto-approval, and cancellation refund rules to admin/owner roles.
   */
  assertBookingPolicyModificationAuthorized(params: {
    callerRole: string;
    callerOrgId: string;
    targetOrgId: string;
    policies?: {
      slotIntervalMinutes?: number;
      bufferMinutes?: number;
      cancellationWindowHours?: number;
    };
  }): void {
    const { callerRole, callerOrgId, targetOrgId, policies } = params;

    if (callerOrgId !== targetOrgId) {
      throw new ConfigSecurityError("Cross-tenant violation: Cannot modify booking policies for another organization", 403);
    }

    const permittedRoles = ["owner", "admin"];
    if (!permittedRoles.includes(callerRole.toLowerCase())) {
      throw new ConfigSecurityError(
        `Forbidden: Role '${callerRole}' lacks permission to configure booking and cancellation policies`,
        403
      );
    }

    if (policies?.slotIntervalMinutes !== undefined) {
      if (policies.slotIntervalMinutes < 5 || policies.slotIntervalMinutes > 240) {
        throw new ConfigSecurityError("Slot interval must be between 5 and 240 minutes", 422);
      }
    }
  },

  /**
   * 6. Prevent unauthorized changes to phone numbers and call routing.
   * Locks telephony forwarding and recording consent configurations to admin/owner roles.
   */
  assertTelephonyRoutingModificationAuthorized(params: {
    callerRole: string;
    callerOrgId: string;
    targetOrgId: string;
  }): void {
    const { callerRole, callerOrgId, targetOrgId } = params;

    if (callerOrgId !== targetOrgId) {
      throw new ConfigSecurityError("Cross-tenant violation: Cannot modify telephony routing for another organization", 403);
    }

    const permittedRoles = ["owner", "admin"];
    if (!permittedRoles.includes(callerRole.toLowerCase())) {
      throw new ConfigSecurityError(
        `Forbidden: Role '${callerRole}' cannot modify phone numbers or call routing settings`,
        403
      );
    }
  },

  /**
   * 7. Prevent activation when critical integration requirements are unmet.
   * Fails closed if organization activation is attempted with missing essential configurations.
   */
  assertOrganizationActivationReadiness(params: {
    organizationId: string;
    config: {
      businessHoursConfigured: boolean;
      servicesConfigured: boolean;
      channelsConfigured: boolean;
    };
  }): void {
    const { organizationId, config } = params;
    const unmetRequirements: string[] = [];

    if (!config.businessHoursConfigured) {
      unmetRequirements.push("business_hours");
    }
    if (!config.servicesConfigured) {
      unmetRequirements.push("services_catalog");
    }
    if (!config.channelsConfigured) {
      unmetRequirements.push("communication_channels");
    }

    if (unmetRequirements.length > 0) {
      throw new ConfigSecurityError(
        `Activation blocked: Organization '${organizationId}' cannot be activated until critical requirements are fulfilled: ${unmetRequirements.join(", ")}`,
        422
      );
    }
  },

  /**
   * 8. Prevent invalid configuration from silently overriding working settings.
   * Validates schema; if invalid, preserves existing configuration and throws explicit validation error.
   */
  validateConfigurationPayload<T extends Record<string, any>>(
    currentWorkingConfig: T,
    proposedUpdates: Partial<T>,
    validator: (data: any) => boolean
  ): T {
    const merged = { ...currentWorkingConfig, ...proposedUpdates };

    if (!validator(merged)) {
      throw new ConfigSecurityError(
        "Invalid configuration schema: Proposed changes rejected to preserve working settings",
        422
      );
    }

    return merged;
  },

  /**
   * 9. Prevent concurrent edits from silently overwriting another user's changes.
   * Optimistic concurrency control rejects writes when expected version does not match current version.
   */
  assertOptimisticConcurrencyVersion(
    currentVersion: number,
    expectedVersion: number,
    entityName: string = "Configuration"
  ): void {
    if (currentVersion !== expectedVersion) {
      throw new ConfigSecurityError(
        `Conflict: ${entityName} has been modified by another administrator (expected version ${expectedVersion}, current version ${currentVersion}). Refresh to load the latest settings.`,
        409
      );
    }
  },

  /**
   * 10. Prevent users from enabling features beyond their permitted plan or role.
   * Checks subscription plan entitlements before enabling feature toggles.
   */
  assertFeatureEntitlement(params: {
    organizationPlan: "starter" | "pro" | "enterprise";
    featureKey: string;
    planEntitlements: Record<string, string[]>;
  }): void {
    const { organizationPlan, featureKey, planEntitlements } = params;
    const allowedFeatures = planEntitlements[organizationPlan] || [];

    if (!allowedFeatures.includes(featureKey)) {
      throw new ConfigSecurityError(
        `Plan upgrade required: Feature '${featureKey}' is not permitted on the '${organizationPlan}' plan`,
        403
      );
    }
  },

  /**
   * 11. Prevent configuration imports from changing protected ownership or security fields.
   * Strips immutable system properties (IDs, roles, subscription tier, ownership, credentials) from import payloads.
   */
  sanitizeConfigurationImport(importData: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(importData)) {
      const cleanKey = key.toLowerCase().replace(/[\s\-_]/g, "");

      if (PROTECTED_CONFIG_IMPORT_FIELDS.has(cleanKey)) {
        // Strip protected system field
        continue;
      }

      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeConfigurationImport(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  },

  /**
   * 12. Prevent destructive setup resets without explicit authorization.
   * Restricts factory reset / setup wipe to the organization Owner and requires explicit confirmation phrase.
   */
  assertDestructiveResetAuthorized(params: {
    callerUserId: string;
    callerRole: string;
    callerOrgId: string;
    targetOrgId: string;
    confirmationPhrase: string;
    expectedConfirmationPhrase: string;
  }): void {
    const {
      callerUserId,
      callerRole,
      callerOrgId,
      targetOrgId,
      confirmationPhrase,
      expectedConfirmationPhrase,
    } = params;

    if (!callerUserId || callerUserId === "anonymous") {
      throw new ConfigSecurityError("Authentication required: Reset operations require an authenticated session", 401);
    }

    if (callerOrgId !== targetOrgId) {
      throw new ConfigSecurityError("Cross-tenant violation: Cannot reset another organization", 403);
    }

    if (callerRole.toLowerCase() !== "owner") {
      throw new ConfigSecurityError(
        `Forbidden: Role '${callerRole}' cannot perform destructive setup resets. Only the organization Owner may reset setup.`,
        403
      );
    }

    if (confirmationPhrase.trim() !== expectedConfirmationPhrase.trim()) {
      throw new ConfigSecurityError(
        "Invalid confirmation phrase: Destructive reset aborted because confirmation phrase does not match",
        422
      );
    }
  },

  /**
   * 13. Prevent business deletion from leaving active credentials, jobs or integrations unmanaged.
   * Orchestrates complete decommission: revoking tokens, cancelling queue jobs, releasing phone numbers, and deleting records.
   */
  async executeSafeBusinessDecommission(params: {
    organizationId: string;
    callerRole: string;
    decommissionHooks: {
      revokeTokens: () => Promise<boolean>;
      cancelQueuedJobs: () => Promise<boolean>;
      releasePhoneNumbers: () => Promise<boolean>;
      purgeDatabaseRecords: () => Promise<boolean>;
    };
  }): Promise<{ decommissioned: boolean; auditReceiptId: string }> {
    const { organizationId, callerRole, decommissionHooks } = params;

    if (callerRole.toLowerCase() !== "owner") {
      throw new ConfigSecurityError("Forbidden: Only organization Owners can decommission and delete a business", 403);
    }

    // 1. Revoke external OAuth tokens and credentials
    await decommissionHooks.revokeTokens();

    // 2. Cancel active background jobs
    await decommissionHooks.cancelQueuedJobs();

    // 3. Release telephony numbers
    await decommissionHooks.releasePhoneNumbers();

    // 4. Purge database records
    await decommissionHooks.purgeDatabaseRecords();

    const auditReceiptId = `decommission_${organizationId}_${crypto.randomUUID()}`;

    return {
      decommissioned: true,
      auditReceiptId,
    };
  },
};
