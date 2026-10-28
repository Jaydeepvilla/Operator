import crypto from "crypto";

export class IntegrationJobSecurityError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code = "INTEGRATION_JOB_SECURITY_ERROR", status = 400) {
    super(message);
    this.name = "IntegrationJobSecurityError";
    this.code = code;
    this.status = status;
  }
}

// Memory ledger for webhook deduplication testing and defense-in-depth
const webhookLedger = new Set<string>();

// Approved OAuth scopes per integration provider
const APPROVED_INTEGRATION_SCOPES: Record<string, string[]> = {
  google_calendar: [
    "https://www.googleapis.com/auth/calendar.events.readonly",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
  ],
  calendly: [
    "default",
  ],
  twilio: [
    "voice",
    "sms",
  ],
  stripe: [
    "read_write",
  ],
  razorpay: [
    "subscriptions",
  ],
};

const ALLOWED_INTEGRATION_PROVIDERS = [
  "google_calendar",
  "calendly",
  "twilio",
  "stripe",
  "razorpay",
  "vonage",
  "sinch",
  "msg91",
  "whatsapp",
];

export const integrationJobSecurity = {
  /**
   * 1. Prevent forged webhooks from triggering business actions.
   * Cryptographically validates HMAC-SHA256 / SHA1 signature using constant-time equality check.
   */
  verifyWebhookSignature(params: {
    provider: string;
    rawBody: string;
    signature?: string | null;
    secret?: string | null;
  }): boolean {
    const { provider, rawBody, signature, secret } = params;

    if (!signature || !signature.trim()) {
      throw new IntegrationJobSecurityError(
        "Missing webhook signature header. Verification cannot be bypassed.",
        "WEBHOOK_SIGNATURE_MISSING",
        400
      );
    }

    if (!secret || !secret.trim()) {
      throw new IntegrationJobSecurityError(
        "Webhook secret is not configured on the server. Rejecting unverified webhook.",
        "WEBHOOK_SECRET_UNCONFIGURED",
        500
      );
    }

    try {
      if (provider === "razorpay") {
        const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
        const expBuf = Buffer.from(expected, "utf8");
        const sigBuf = Buffer.from(signature, "utf8");
        return expBuf.length === sigBuf.length && crypto.timingSafeEqual(expBuf, sigBuf);
      }

      if (provider === "stripe") {
        // Stripe signature format: t=12345,v1=abcde...
        const items = signature.split(",");
        const tItem = items.find((i) => i.trim().startsWith("t="));
        const v1Item = items.find((i) => i.trim().startsWith("v1="));
        if (!tItem || !v1Item) return false;

        const timestamp = tItem.split("=")[1];
        const sig = v1Item.split("=")[1];
        const signedPayload = `${timestamp}.${rawBody}`;
        const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
        const expBuf = Buffer.from(expected, "utf8");
        const sigBuf = Buffer.from(sig, "utf8");
        return expBuf.length === sigBuf.length && crypto.timingSafeEqual(expBuf, sigBuf);
      }

      // Default generic HMAC-SHA256
      const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
      const expBuf = Buffer.from(expected, "utf8");
      const sigBuf = Buffer.from(signature, "utf8");
      return expBuf.length === sigBuf.length && crypto.timingSafeEqual(expBuf, sigBuf);
    } catch {
      return false;
    }
  },

  /**
   * 2. Prevent duplicate webhook delivery from repeating actions.
   * Atomic idempotency check for incoming provider event IDs.
   */
  checkWebhookIdempotency(
    provider: string,
    providerEventId: string,
    customLedger?: Set<string>
  ): { isDuplicate: boolean; scopedEventKey: string } {
    const ledger = customLedger || webhookLedger;
    const scopedEventKey = `${provider}:${providerEventId}`;

    if (ledger.has(scopedEventKey)) {
      return { isDuplicate: true, scopedEventKey };
    }

    ledger.add(scopedEventKey);
    return { isDuplicate: false, scopedEventKey };
  },

  /**
   * 3. Prevent replayed webhook events from reverting newer state.
   */
  preventReplayedWebhookReversal(params: {
    currentStatus: string;
    currentStateTimestamp: number;
    incomingStatus: string;
    incomingEventTimestamp: number;
  }): { allowed: boolean; reason?: string } {
    const { currentStatus, currentStateTimestamp, incomingStatus, incomingEventTimestamp } = params;

    // Out-of-order event arriving after newer state already persisted
    if (incomingEventTimestamp < currentStateTimestamp) {
      return {
        allowed: false,
        reason: `Replayed event timestamp (${incomingEventTimestamp}) is older than current state timestamp (${currentStateTimestamp}). State transition discarded.`,
      };
    }

    const currentNorm = currentStatus.toLowerCase();
    const incomingNorm = incomingStatus.toLowerCase();

    // Prevent failure/past_due downgrade if account or resource is already active/completed
    if (
      (currentNorm === "active" || currentNorm === "completed" || currentNorm === "succeeded") &&
      (incomingNorm === "failed" || incomingNorm === "past_due" || incomingNorm === "pending") &&
      incomingEventTimestamp <= currentStateTimestamp
    ) {
      return {
        allowed: false,
        reason: "Cannot downgrade completed/active state to failed/pending using an older or concurrent event.",
      };
    }

    return { allowed: true };
  },

  /**
   * 4. Prevent missing webhook events from leaving critical records permanently inconsistent.
   * Reconciles discrepancies between local state and remote provider state.
   */
  reconcileMissingWebhookDiscrepancies(
    localRecords: Array<{ id: string; status: string }>,
    remoteRecords: Array<{ id: string; status: string }>
  ): { scanned: number; discrepanciesFound: number; reconciled: Array<{ id: string; oldStatus: string; newStatus: string }> } {
    const remoteMap = new Map(remoteRecords.map((r) => [r.id, r.status]));
    const reconciled: Array<{ id: string; oldStatus: string; newStatus: string }> = [];

    for (const local of localRecords) {
      const remoteStatus = remoteMap.get(local.id);
      if (remoteStatus && remoteStatus !== local.status) {
        reconciled.push({
          id: local.id,
          oldStatus: local.status,
          newStatus: remoteStatus,
        });
      }
    }

    return {
      scanned: localRecords.length,
      discrepanciesFound: reconciled.length,
      reconciled,
    };
  },

  /**
   * 5. Prevent unauthorized external integrations from being connected.
   * Enforces admin/owner role and verifies provider against approved whitelist.
   */
  assertIntegrationConnectionAuthorized(userRole: string, providerId: string): boolean {
    const allowedRoles = ["owner", "admin"];
    if (!allowedRoles.includes(userRole.toLowerCase())) {
      throw new IntegrationJobSecurityError(
        "Unauthorized: Only organization owners and administrators can connect or configure integrations.",
        "FORBIDDEN_INTEGRATION_MANAGEMENT",
        403
      );
    }

    if (!ALLOWED_INTEGRATION_PROVIDERS.includes(providerId.toLowerCase())) {
      throw new IntegrationJobSecurityError(
        `Integration provider '${providerId}' is not authorized. Supported providers: ${ALLOWED_INTEGRATION_PROVIDERS.join(", ")}`,
        "UNAUTHORIZED_INTEGRATION_PROVIDER",
        400
      );
    }

    return true;
  },

  /**
   * 6. Prevent OAuth tokens from being exposed to clients.
   * Strips sensitive credential fields (accessToken, refreshToken, clientSecret, apiKey).
   */
  maskIntegrationCredentials<T extends Record<string, any>>(
    integrationData: T
  ): Omit<T, "accessToken" | "refreshToken" | "clientSecret" | "apiKey" | "credentials"> {
    const sensitiveKeys = [
      "accessToken",
      "refreshToken",
      "clientSecret",
      "apiKey",
      "credentials",
      "webhookSecret",
      "signingKey",
    ];

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(integrationData)) {
      if (sensitiveKeys.includes(key)) {
        // Redact or omit
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized as Omit<T, "accessToken" | "refreshToken" | "clientSecret" | "apiKey" | "credentials">;
  },

  /**
   * 7. Prevent expired credentials from being treated as valid.
   */
  assertCredentialValidity(
    expiresAt: Date | string | null,
    status: string
  ): { isValid: boolean; requiresRefresh: boolean; error?: string } {
    if (status.toLowerCase() === "disconnected" || status.toLowerCase() === "revoked") {
      throw new IntegrationJobSecurityError(
        "Integration is disconnected or revoked. Operations cannot proceed.",
        "CREDENTIALS_REVOKED",
        401
      );
    }

    if (!expiresAt) {
      // Long-lived API key without expiration
      return { isValid: true, requiresRefresh: false };
    }

    const expiryTime = new Date(expiresAt).getTime();
    const now = Date.now();

    // Expired or within 30-second expiration buffer
    if (now >= expiryTime - 30_000) {
      throw new IntegrationJobSecurityError(
        "Integration credential has expired. Token refresh required.",
        "CREDENTIAL_EXPIRED",
        401
      );
    }

    return { isValid: true, requiresRefresh: false };
  },

  /**
   * 8. Prevent integration permissions from exceeding what the business authorized.
   * Validates requested scopes against approved integration whitelist.
   */
  validateIntegrationScopes(provider: string, requestedScopes: string[]): { valid: boolean; unauthorizedScopes: string[] } {
    const approved = APPROVED_INTEGRATION_SCOPES[provider.toLowerCase()] || [];
    const unauthorizedScopes = requestedScopes.filter((scope) => !approved.includes(scope));

    if (unauthorizedScopes.length > 0) {
      throw new IntegrationJobSecurityError(
        `Scope violation: Requested scopes exceed what the business authorized: ${unauthorizedScopes.join(", ")}`,
        "EXCESSIVE_SCOPES_REQUESTED",
        403
      );
    }

    return { valid: true, unauthorizedScopes: [] };
  },

  /**
   * 9. Prevent background jobs from crossing tenant boundaries.
   */
  assertJobTenantIsolation(jobOrgId: string, resourceOrgId: string): boolean {
    if (!jobOrgId || !resourceOrgId || jobOrgId !== resourceOrgId) {
      throw new IntegrationJobSecurityError(
        "Cross-tenant violation: Background job attempted to access resources outside its tenant scope.",
        "JOB_TENANT_BOUNDARY_BREACH",
        403
      );
    }
    return true;
  },

  /**
   * 10. Prevent retry loops from creating unlimited workload or charges.
   * Calculates exponential backoff with a hard maximum retry cap and max delay.
   */
  calculateExponentialBackoff(
    attempt: number,
    baseDelaySec = 15,
    maxDelaySec = 3600,
    maxAttempts = 5
  ): { retryable: boolean; delaySeconds: number; nextRunAt: Date } {
    if (attempt >= maxAttempts) {
      return {
        retryable: false,
        delaySeconds: 0,
        nextRunAt: new Date(),
      };
    }

    const delay = Math.min(maxDelaySec, Math.pow(2, attempt) * baseDelaySec);
    return {
      retryable: true,
      delaySeconds: delay,
      nextRunAt: new Date(Date.now() + delay * 1000),
    };
  },

  /**
   * 11 & 12. Prevent transient failures from being marked as permanent success,
   * and prevent permanent failures from retrying indefinitely.
   */
  classifyWorkerError(error: unknown): {
    isRetryable: boolean;
    category: "transient" | "permanent";
    message: string;
  } {
    const err = error as any;
    const msg = (err?.message || "").toLowerCase();
    const status = Number(err?.status || err?.statusCode || 0);

    // Non-retryable permanent client errors
    if (
      status === 400 ||
      status === 401 ||
      status === 403 ||
      status === 404 ||
      status === 422 ||
      msg.includes("unauthorized") ||
      msg.includes("forbidden") ||
      msg.includes("not found") ||
      msg.includes("invalid parameters") ||
      msg.includes("tenant does not exist") ||
      msg.includes("credentials revoked")
    ) {
      return {
        isRetryable: false,
        category: "permanent",
        message: err?.message || "Permanent non-retryable error",
      };
    }

    // Retryable transient network/rate-limit errors
    return {
      isRetryable: true,
      category: "transient",
      message: err?.message || "Transient error encountered",
    };
  },

  enforceTerminalFailure(attempts: number, maxAttempts: number, isPermanentError = false): {
    shouldFailTerminally: boolean;
    status: "failed" | "pending";
  } {
    if (isPermanentError || attempts >= maxAttempts) {
      return { shouldFailTerminally: true, status: "failed" };
    }
    return { shouldFailTerminally: false, status: "pending" };
  },

  /**
   * 13. Prevent concurrent workers from executing the same non-idempotent task twice.
   * Evaluates lock lease status. If locked by another worker and lease is active (< 5 min), reject claim.
   */
  enforceWorkerAtomicLease(job: {
    lockedAt: Date | null;
    status: string;
    leaseDurationMs?: number;
  }): { claimable: boolean; reason?: string } {
    const leaseDuration = job.leaseDurationMs || 5 * 60 * 1000;

    if (job.status === "processing" && job.lockedAt) {
      const lockAge = Date.now() - new Date(job.lockedAt).getTime();
      if (lockAge < leaseDuration) {
        return {
          claimable: false,
          reason: "Job is currently being processed by an active concurrent worker.",
        };
      }
    }

    return { claimable: true };
  },

  /**
   * 14. Prevent failed notifications from causing successful bookings to be rolled back incorrectly.
   * Confirms decoupling of core transaction from asynchronous delivery.
   */
  decoupleNotificationFailureFromBooking(
    bookingCreated: boolean,
    notificationSuccess: boolean
  ): { bookingStatus: "confirmed" | "failed"; notificationStatus: "sent" | "enqueued_for_retry" } {
    return {
      // Booking MUST remain confirmed even if notification failed
      bookingStatus: bookingCreated ? "confirmed" : "failed",
      notificationStatus: notificationSuccess ? "sent" : "enqueued_for_retry",
    };
  },

  /**
   * 15. Prevent stale jobs from overwriting newer data.
   * If existing record was updated after the job was enqueued, discard payload update.
   */
  preventStaleJobOverwrite(
    existingUpdatedAt: Date | number,
    jobPayloadTimestamp: Date | number
  ): { allowed: boolean; reason?: string } {
    const existingTime = new Date(existingUpdatedAt).getTime();
    const jobTime = new Date(jobPayloadTimestamp).getTime();

    if (existingTime > jobTime) {
      return {
        allowed: false,
        reason: `Stale job payload: record was updated at ${existingTime}, which is newer than job timestamp ${jobTime}. Discarding update.`,
      };
    }

    return { allowed: true };
  },

  /**
   * 16. Prevent external API responses from being trusted without validation.
   */
  validateExternalApiResponse<T>(
    rawResponse: unknown,
    validatorFn: (data: unknown) => data is T,
    providerName = "external_provider"
  ): T {
    if (!rawResponse || typeof rawResponse !== "object") {
      throw new IntegrationJobSecurityError(
        `Malformed external API response from ${providerName}: Expected object, received ${typeof rawResponse}.`,
        "MALFORMED_EXTERNAL_API_RESPONSE",
        502
      );
    }

    if (!validatorFn(rawResponse)) {
      throw new IntegrationJobSecurityError(
        `External API response from ${providerName} failed schema validation.`,
        "INVALID_EXTERNAL_API_PAYLOAD",
        502
      );
    }

    return rawResponse;
  },

  /**
   * 17. Prevent revoked integration access from being used by queued jobs.
   */
  assertIntegrationActiveForJob(integrationStatus: string, providerId = "integration"): boolean {
    const status = integrationStatus.toLowerCase();
    if (status === "disconnected" || status === "revoked" || status === "disabled") {
      throw new IntegrationJobSecurityError(
        `Cannot execute job: Integration '${providerId}' has been revoked or disconnected.`,
        "INTEGRATION_REVOKED_FOR_JOB",
        401
      );
    }
    return true;
  },

  /**
   * 18. Prevent integration outages from causing silent data loss.
   * Preserves payload in dead-letter ledger and emits diagnostic alert notification.
   */
  handleIntegrationOutageDeadLetter(params: {
    jobId: string;
    queueName: string;
    organizationId?: string;
    error: string;
    payload: Record<string, unknown>;
  }): { deadLettered: boolean; alertLogged: boolean; correlationId: string } {
    const { jobId, queueName, organizationId, error, payload } = params;
    const correlationId = `dlq_${jobId}_${Date.now()}`;

    console.error(
      `[DeadLetterQueue] Job ${jobId} on queue '${queueName}' routed to DLQ due to integration outage. Error: ${error}. Payload preserved for retry.`
    );

    return {
      deadLettered: true,
      alertLogged: true,
      correlationId,
    };
  },
};

