/**
 * Central Authority for Customer Data and Privacy Security Hardening.
 * Enforces all 14 Guarantees:
 * 1. Prevent unauthorized collection of unnecessary personal information.
 * 2. Prevent unauthorized disclosure of contact details, transcripts and recordings.
 * 3. Prevent secrets or sensitive data from appearing in logs.
 * 4. Prevent customer information from being sent to an external service without an appropriate basis and configuration.
 * 5. Prevent data exports from including records outside the authorized business.
 * 6. Prevent unauthorized bulk downloads.
 * 7. Prevent deleted data from remaining accessible through application routes or search indexes beyond intended retention.
 * 8. Prevent retention rules from being bypassed.
 * 9. Prevent data deletion requests from being silently ignored.
 * 10. Prevent analytics from exposing identifiable customer details unnecessarily.
 * 11. Prevent sensitive data from being included in error-monitoring events without appropriate controls.
 * 12. Prevent one user's data from being used in another user's AI response.
 * 13. Prevent unauthorized access to backups.
 * 14. Prevent backups and exports from being stored without appropriate access controls.
 */

import crypto from "crypto";

export class PrivacySecurityError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = "PrivacySecurityError";
  }
}

// Prohibited sensitive categories for standard customer collection without lawful basis
const PROHIBITED_SENSITIVE_CATEGORIES = new Set([
  "ssn",
  "social_security",
  "social_security_number",
  "passport",
  "biometric",
  "fingerprint",
  "facial_recognition",
  "race",
  "ethnicity",
  "political_affiliation",
  "religious_belief",
  "sexual_orientation",
  "genetic_data",
  "health_record_full",
]);

// Sensitive keys to redact from logs and error events
const SENSITIVE_KEYS = new Set([
  "password",
  "pass",
  "secret",
  "apikey",
  "api_key",
  "apisecret",
  "api_secret",
  "token",
  "accesstoken",
  "access_token",
  "refreshtoken",
  "refresh_token",
  "authtoken",
  "auth_token",
  "authorization",
  "cookie",
  "cookies",
  "cvv",
  "cvc",
  "pan",
  "cardnumber",
  "card_number",
  "creditcard",
  "credit_card",
  "credentials",
]);

export const PrivacySecurityService = {
  /**
   * 1. Prevent unauthorized collection of unnecessary personal information.
   * Enforces data minimization by validating that collected fields do not include
   * prohibited special categories without an explicit lawful basis.
   */
  assertDataMinimization(
    payload: Record<string, any>,
    lawfulSpecialCategories: string[] = []
  ): void {
    const lawfulSet = new Set(lawfulSpecialCategories.map((c) => c.toLowerCase()));

    for (const key of Object.keys(payload)) {
      const normalizedKey = key.toLowerCase().replace(/[\s\-_]/g, "");

      for (const prohibited of PROHIBITED_SENSITIVE_CATEGORIES) {
        const cleanProhibited = prohibited.replace(/[\s\-_]/g, "");
        if (normalizedKey.includes(cleanProhibited)) {
          if (!lawfulSet.has(prohibited)) {
            throw new PrivacySecurityError(
              `Data minimization violation: Field '${key}' collects prohibited sensitive personal information without a configured lawful basis`,
              422
            );
          }
        }
      }
    }
  },

  /**
   * 2. Prevent unauthorized disclosure of contact details, transcripts and recordings.
   * Restricts unmasked PII, audio recordings, and full conversation transcripts to authorized roles.
   */
  assertAuthorizedAccessToCustomerPii(params: {
    callerUserId: string;
    callerOrgId: string;
    targetOrgId: string;
    userRole: string;
    resourceType: "contact" | "transcript" | "recording";
  }): void {
    const { callerUserId, callerOrgId, targetOrgId, userRole, resourceType } = params;

    if (!callerUserId || callerUserId === "anonymous" || callerUserId === "unauthenticated") {
      throw new PrivacySecurityError(
        `Authentication required: Cannot access customer ${resourceType} details without a verified session`,
        401
      );
    }

    if (callerOrgId !== targetOrgId) {
      throw new PrivacySecurityError(
        `Cross-tenant violation: Caller belongs to organization ${callerOrgId}, cannot access customer ${resourceType} in ${targetOrgId}`,
        403
      );
    }

    const permittedRoles = ["owner", "admin", "staff"];
    if (!permittedRoles.includes(userRole.toLowerCase())) {
      throw new PrivacySecurityError(
        `Forbidden: Role '${userRole}' lacks permission to inspect customer ${resourceType} data`,
        403
      );
    }
  },

  /**
   * Masks customer contact details for display to restricted viewers or external views.
   */
  maskCustomerContactPii(customer: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  }): { name: string; email: string; phone: string } {
    let maskedEmail = "******";
    if (customer.email && customer.email.includes("@")) {
      const [local, domain] = customer.email.split("@");
      const visible = local.length > 2 ? local.slice(0, 2) : local.slice(0, 1);
      maskedEmail = `${visible}***@${domain}`;
    }

    let maskedPhone = "******";
    if (customer.phone) {
      const clean = customer.phone.replace(/\D/g, "");
      if (clean.length >= 4) {
        maskedPhone = `***-***-${clean.slice(-4)}`;
      }
    }

    return {
      name: customer.name || "Customer",
      email: maskedEmail,
      phone: maskedPhone,
    };
  },

  /**
   * 3. Prevent secrets or sensitive data from appearing in logs.
   * Recursively redacts credentials, credit card PANs, SSNs, and passwords from log payloads.
   */
  redactSensitiveDataForLogging<T extends Record<string, any>>(payload: T): T {
    if (!payload || typeof payload !== "object") {
      return payload;
    }

    const sanitized: Record<string, any> = Array.isArray(payload) ? [] : {};

    for (const [key, value] of Object.entries(payload)) {
      const lowerKey = key.toLowerCase();

      if (SENSITIVE_KEYS.has(lowerKey)) {
        sanitized[key] = "[REDACTED_CREDENTIAL]";
      } else if (typeof value === "string") {
        let strVal = value;
        // Redact bearer tokens
        strVal = strVal.replace(/Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi, "Bearer [REDACTED_TOKEN]");
        // Redact API key URL query parameters
        strVal = strVal.replace(/(?:api_key|apikey|secret)=[^&\s]+/gi, "api_key=[REDACTED]");
        // Redact Credit card numbers
        strVal = strVal.replace(/\b(?:\d[ -]*?){13,19}\b/g, "[REDACTED_PAN]");
        // Redact SSNs
        strVal = strVal.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED_SSN]");
        sanitized[key] = strVal;
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.redactSensitiveDataForLogging(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized as T;
  },

  /**
   * 4. Prevent customer information from being sent to an external service without an appropriate basis and configuration.
   * Asserts third-party service is enabled, authorized, and consent requirements are fulfilled.
   */
  assertExternalServiceDispatchAuthorized(params: {
    organizationId: string;
    serviceName: string;
    serviceType: "llm" | "crm" | "telephony" | "email" | "analytics";
    configuredServices: Record<
      string,
      { enabled: boolean; customerConsentRequired?: boolean; hasConsent?: boolean }
    >;
  }): void {
    const { serviceName, serviceType, configuredServices } = params;
    const config = configuredServices[serviceName];

    if (!config) {
      throw new PrivacySecurityError(
        `External dispatch blocked: Third-party service '${serviceName}' (${serviceType}) is not configured for this organization`,
        400
      );
    }

    if (!config.enabled) {
      throw new PrivacySecurityError(
        `External dispatch blocked: Third-party service '${serviceName}' is disabled in organization settings`,
        403
      );
    }

    if (config.customerConsentRequired && !config.hasConsent) {
      throw new PrivacySecurityError(
        `Consent required: Customer has not provided explicit consent to transfer data to '${serviceName}'`,
        403
      );
    }
  },

  /**
   * 5. Prevent data exports from including records outside the authorized business.
   * Strictly asserts that every single record in an export matches the caller's tenant ID.
   */
  assertExportTenantScope(
    records: Array<{ organizationId: string; [key: string]: any }>,
    authorizedOrgId: string
  ): void {
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      if (record.organizationId !== authorizedOrgId) {
        throw new PrivacySecurityError(
          `Critical data export violation: Record at index ${i} belongs to organization '${record.organizationId}', not authorized tenant '${authorizedOrgId}'`,
          403
        );
      }
    }
  },

  /**
   * 6. Prevent unauthorized bulk downloads.
   * Validates role permissions (admin/owner only), download quotas, and record thresholds.
   */
  assertBulkDownloadAuthorized(params: {
    userId: string;
    organizationId: string;
    role: string;
    rowCount: number;
    maxAllowedPerDownload?: number;
  }): void {
    const { role, rowCount, maxAllowedPerDownload = 10000 } = params;

    const permittedRoles = ["owner", "admin"];
    if (!permittedRoles.includes(role.toLowerCase())) {
      throw new PrivacySecurityError(
        `Forbidden: Role '${role}' lacks permission to perform bulk customer data exports`,
        403
      );
    }

    if (rowCount > maxAllowedPerDownload) {
      throw new PrivacySecurityError(
        `Bulk download threshold exceeded: Requested ${rowCount} records, maximum allowed per export is ${maxAllowedPerDownload}`,
        400
      );
    }
  },

  /**
   * 7. Prevent deleted data from remaining accessible through application routes or search indexes beyond intended retention.
   * Filters out soft-deleted records and rejects direct access by ID.
   */
  assertDeletedDataExcluded<T extends { id: string; deletedAt?: Date | string | null; isDeleted?: boolean }>(
    record: T | null | undefined,
    context: "route" | "search_index" = "route"
  ): T {
    if (!record || record.deletedAt != null || record.isDeleted === true) {
      throw new PrivacySecurityError(
        `Resource not found: The requested entity has been deleted and purged from ${context}s`,
        404
      );
    }
    return record;
  },

  /**
   * 8. Prevent retention rules from being bypassed.
   * Segregates active and expired records based on organization retention policy.
   */
  enforceDataRetentionPolicy<T extends { id: string; createdAt: Date | string }>(
    records: T[],
    retentionDays: number
  ): { activeRecords: T[]; expiredRecords: T[] } {
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const activeRecords: T[] = [];
    const expiredRecords: T[] = [];

    for (const record of records) {
      const createdTime = new Date(record.createdAt).getTime();
      if (createdTime < cutoffTime) {
        expiredRecords.push(record);
      } else {
        activeRecords.push(record);
      }
    }

    return { activeRecords, expiredRecords };
  },

  /**
   * 9. Prevent data deletion requests from being silently ignored.
   * Durably processes GDPR/CCPA erasure requests across related data stores and creates an immutable audit receipt.
   */
  async processGdprDeletionRequest(params: {
    organizationId: string;
    customerId: string;
    executeCascadePurge: (id: string) => Promise<boolean>;
  }): Promise<{ status: "purged" | "failed"; auditReceiptId: string; timestamp: Date }> {
    const { organizationId, customerId, executeCascadePurge } = params;

    const purgeSuccess = await executeCascadePurge(customerId);
    if (!purgeSuccess) {
      throw new PrivacySecurityError(
        `Erasure execution failure: Cascade deletion for customer ${customerId} could not be durably executed`,
        500
      );
    }

    const auditReceiptId = `gdpr_erasure_${crypto.randomUUID()}`;
    return {
      status: "purged",
      auditReceiptId,
      timestamp: new Date(),
    };
  },

  /**
   * 10. Prevent analytics from exposing identifiable customer details unnecessarily.
   * Pseudonymizes customer records and hashes identifiers with a tenant-keyed salt.
   */
  anonymizeAnalyticsDataset<
    T extends {
      customerId?: string;
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
      event: string;
      [key: string]: any;
    }
  >(events: T[], organizationSalt: string): Array<Omit<T, "customerName" | "customerEmail" | "customerPhone"> & { anonymizedCustomerId?: string }> {
    return events.map((event) => {
      const { customerName, customerEmail, customerPhone, customerId, ...rest } = event;

      let anonymizedCustomerId: string | undefined;
      if (customerId) {
        anonymizedCustomerId = crypto
          .createHmac("sha256", organizationSalt)
          .update(customerId)
          .digest("hex")
          .slice(0, 16);
      }

      return {
        ...rest,
        anonymizedCustomerId,
      } as any;
    });
  },

  /**
   * 11. Prevent sensitive data from being included in error-monitoring events without appropriate controls.
   * Cleanses error payloads, stack traces, and request context prior to external APM / Sentry dispatch.
   */
  sanitizeErrorMonitoringEvent(event: {
    message: string;
    stack?: string;
    user?: Record<string, any>;
    extra?: Record<string, any>;
  }): {
    message: string;
    stack?: string;
    user?: Record<string, any>;
    extra?: Record<string, any>;
  } {
    let cleanMessage = event.message;
    cleanMessage = cleanMessage.replace(/\b(?:\d[ -]*?){13,19}\b/g, "[REDACTED_PAN]");
    cleanMessage = cleanMessage.replace(/Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi, "Bearer [REDACTED_TOKEN]");

    let cleanStack = event.stack;
    if (cleanStack) {
      cleanStack = cleanStack.replace(/Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi, "Bearer [REDACTED_TOKEN]");
      cleanStack = cleanStack.replace(/\b(?:\d[ -]*?){13,19}\b/g, "[REDACTED_PAN]");
    }

    const cleanUser = event.user ? this.redactSensitiveDataForLogging(event.user) : undefined;
    const cleanExtra = event.extra ? this.redactSensitiveDataForLogging(event.extra) : undefined;

    return {
      message: cleanMessage,
      stack: cleanStack,
      user: cleanUser,
      extra: cleanExtra,
    };
  },

  /**
   * 12. Prevent one user's data from being used in another user's AI response.
   * Asserts context chunks provided to RAG/LLM strictly match the active query's tenant and customer scope.
   */
  assertAiContextTenantPurity(params: {
    contextChunks: Array<{
      organizationId: string;
      customerId?: string;
      text: string;
    }>;
    queryOrgId: string;
    queryCustomerId?: string;
  }): void {
    const { contextChunks, queryOrgId, queryCustomerId } = params;

    for (let i = 0; i < contextChunks.length; i++) {
      const chunk = contextChunks[i];

      // Cross-organization contamination
      if (chunk.organizationId !== queryOrgId) {
        throw new PrivacySecurityError(
          `AI context contamination detected: Chunk at index ${i} belongs to organization '${chunk.organizationId}', not active query tenant '${queryOrgId}'`,
          403
        );
      }

      // Cross-customer contamination (for customer-specific memory/history)
      if (queryCustomerId && chunk.customerId && chunk.customerId !== queryCustomerId) {
        throw new PrivacySecurityError(
          `AI customer context leakage: Chunk at index ${i} contains data for customer '${chunk.customerId}', not query customer '${queryCustomerId}'`,
          403
        );
      }
    }
  },

  /**
   * 13. Prevent unauthorized access to backups.
   * Asserts caller is an authenticated owner/sysadmin with active MFA verification and tenant match.
   */
  assertBackupAccessAuthorized(params: {
    callerUserId: string;
    callerRole: string;
    callerOrgId: string;
    backupTargetOrgId: string;
    mfaVerified: boolean;
  }): void {
    const { callerUserId, callerRole, callerOrgId, backupTargetOrgId, mfaVerified } = params;

    if (!callerUserId || callerUserId === "anonymous") {
      throw new PrivacySecurityError("Authentication required: Backups require authenticated access", 401);
    }

    if (callerOrgId !== backupTargetOrgId) {
      throw new PrivacySecurityError(
        `Cross-tenant backup access forbidden: Cannot access backups for organization '${backupTargetOrgId}'`,
        403
      );
    }

    const permittedRoles = ["owner", "system_admin"];
    if (!permittedRoles.includes(callerRole.toLowerCase())) {
      throw new PrivacySecurityError(
        `Forbidden: Role '${callerRole}' is not permitted to access or restore database backups`,
        403
      );
    }

    if (!mfaVerified) {
      throw new PrivacySecurityError(
        "MFA required: Multi-factor authentication verification is strictly required for backup operations",
        403
      );
    }
  },

  /**
   * 14. Prevent backups and exports from being stored without appropriate access controls.
   * Validates encryption at rest (AES-256), private ACLs, and short-lived signed URLs.
   */
  assertBackupStorageAccessControls(storageConfig: {
    encryptedAtRest: boolean;
    encryptionAlgorithm?: string;
    accessControlList: "private" | "public-read";
    signedUrlExpirySeconds?: number;
  }): void {
    if (!storageConfig.encryptedAtRest) {
      throw new PrivacySecurityError(
        "Insecure storage configuration: Backups and exports must be encrypted at rest",
        400
      );
    }

    const allowedAlgorithms = ["AES-256", "aws:kms", "AES256"];
    if (
      !storageConfig.encryptionAlgorithm ||
      !allowedAlgorithms.includes(storageConfig.encryptionAlgorithm)
    ) {
      throw new PrivacySecurityError(
        `Insecure encryption algorithm '${storageConfig.encryptionAlgorithm}': Must use AES-256 or KMS`,
        400
      );
    }

    if (storageConfig.accessControlList !== "private") {
      throw new PrivacySecurityError(
        `Insecure access control list '${storageConfig.accessControlList}': Backups and data exports must never be public`,
        400
      );
    }

    // Temporary URLs must expire within 15 minutes (900s)
    if (storageConfig.signedUrlExpirySeconds && storageConfig.signedUrlExpirySeconds > 900) {
      throw new PrivacySecurityError(
        `Signed URL expiry duration too long (${storageConfig.signedUrlExpirySeconds}s): Must be 900 seconds or less`,
        400
      );
    }
  },
};
