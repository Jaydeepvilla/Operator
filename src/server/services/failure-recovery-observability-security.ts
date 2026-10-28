/**
 * Failure Recovery & Security Observability Authority
 * 
 * Enforces Section 19 Hardening Guarantees:
 * - OBS-01: Prevent uncertain transaction outcomes from being reported as definitive success or failure
 * - OBS-02: Prevent retries from duplicating committed actions
 * - OBS-03: Prevent failed security checks from being silently ignored
 * - OBS-04: Prevent unauthorized changes from going undetected where auditability is required
 * - OBS-05: Prevent logs from recording passwords, tokens or unnecessary personal data
 * - OBS-06: Prevent alert failures from remaining unnoticed
 * - OBS-07: Prevent an integration outage from appearing as normal operation
 * - OBS-08: Prevent incomplete recovery from leaving conflicting booking or billing states
 * - OBS-09: Prevent administrators from changing critical settings without appropriate audit records
 * - OBS-10: Prevent backup restoration from being assumed successful without verification
 */

export class FailureRecoveryObservabilitySecurityError extends Error {
  constructor(message: string, public readonly code: string = "FAILURE_RECOVERY_OBSERVABILITY_VIOLATION") {
    super(message);
    this.name = "FailureRecoveryObservabilitySecurityError";
  }
}

const CRITICAL_SETTINGS = new Set([
  "sso_config",
  "mfa_enforcement",
  "call_routing_table",
  "billing_plan",
  "api_keys",
  "auth_security_policy",
  "data_retention_window",
]);

const SENSITIVE_KEY_PATTERNS = [
  /pass(word)?/i,
  /token/i,
  /secret/i,
  /api[_-]?key/i,
  /auth(orization)?/i,
  /credit[_-]?card/i,
  /\bpan\b/i,
  /\bcvv\b/i,
  /\bssn\b/i,
  /private[_-]?key/i,
  /bearer/i,
  /session/i,
];

export class FailureRecoveryObservabilitySecurityService {
  /**
   * OBS-01: Prevent uncertain transaction outcomes from being reported as definitive success or failure.
   */
  static assertTransactionOutcomeCertainty(params: {
    transactionId: string;
    rawGatewayStatus: string;
    reportedStatus: "success" | "failure" | "uncertain" | "pending_reconciliation";
    networkTimeoutOccurred?: boolean;
  }): void {
    const { transactionId, rawGatewayStatus, reportedStatus, networkTimeoutOccurred } = params;

    const ambiguousStatuses = new Set([
      "pending",
      "unknown",
      "timeout",
      "network_error",
      "processing",
      "in_doubt",
      "indeterminate",
    ]);

    const isAmbiguous = networkTimeoutOccurred || ambiguousStatuses.has(rawGatewayStatus.toLowerCase().trim());

    if (isAmbiguous) {
      if (reportedStatus === "success" || reportedStatus === "failure") {
        throw new FailureRecoveryObservabilitySecurityError(
          `Uncertain transaction outcome violation: Transaction '${transactionId}' in state '${rawGatewayStatus}' (network timeout: ${!!networkTimeoutOccurred}) cannot be reported as definitive '${reportedStatus}'. Must be reported as 'uncertain' or 'pending_reconciliation'.`
        );
      }
    }
  }

  /**
   * OBS-02: Prevent retries from duplicating committed actions.
   */
  static executeIdempotentAction<T>(params: {
    idempotencyKey: string;
    committedLedger: Map<string, { committedAt: Date; result: T }>;
    action: () => T;
  }): { executionSkipped: boolean; result: T } {
    const { idempotencyKey, committedLedger, action } = params;

    if (!idempotencyKey || typeof idempotencyKey !== "string" || idempotencyKey.trim().length === 0) {
      throw new FailureRecoveryObservabilitySecurityError(
        "Idempotent action rejected: Missing valid idempotency key"
      );
    }

    const existing = committedLedger.get(idempotencyKey);
    if (existing) {
      // Re-execution prevented, returns previously committed result
      return {
        executionSkipped: true,
        result: existing.result,
      };
    }

    // Execute once and commit into ledger
    const result = action();
    committedLedger.set(idempotencyKey, {
      committedAt: new Date(),
      result,
    });

    return {
      executionSkipped: false,
      result,
    };
  }

  /**
   * OBS-03: Prevent failed security checks from being silently ignored.
   */
  static assertSecurityCheckFailureHandled(checkResult: {
    checkName: string;
    passed: boolean;
    wasSwallowed?: boolean;
    alertEmitted?: boolean;
  }): void {
    const { checkName, passed, wasSwallowed, alertEmitted } = checkResult;

    if (!passed) {
      if (wasSwallowed) {
        throw new FailureRecoveryObservabilitySecurityError(
          `Security check failure suppressed: '${checkName}' failed and was silently swallowed without propagation.`
        );
      }

      if (!alertEmitted) {
        throw new FailureRecoveryObservabilitySecurityError(
          `Security check failure unalerted: '${checkName}' failed without emitting required security alert telemetry.`
        );
      }
    }
  }

  /**
   * OBS-04: Prevent unauthorized changes from going undetected where auditability is required.
   */
  static assertAuditableStateChangeTracked(change: {
    entityType: string;
    entityId: string;
    actorId?: string;
    auditLogRecorded: boolean;
    diff?: { before: Record<string, any>; after: Record<string, any> };
  }): void {
    const { entityType, entityId, actorId, auditLogRecorded, diff } = change;

    if (!actorId || actorId.trim().length === 0) {
      throw new FailureRecoveryObservabilitySecurityError(
        `Unauthorized state change detected: Modification to ${entityType} '${entityId}' lacks authenticated actor attribution.`
      );
    }

    if (!auditLogRecorded) {
      throw new FailureRecoveryObservabilitySecurityError(
        `Auditable state change undetected: Modification to ${entityType} '${entityId}' was not recorded in immutable audit ledger.`
      );
    }

    if (!diff || !diff.before || !diff.after) {
      throw new FailureRecoveryObservabilitySecurityError(
        `Audit trail incomplete: Modification to ${entityType} '${entityId}' must include before/after state diff.`
      );
    }
  }

  /**
   * OBS-05: Prevent logs from recording passwords, tokens or unnecessary personal data.
   */
  static sanitizeLogPayload(payload: any): any {
    if (payload === null || payload === undefined) {
      return payload;
    }

    if (typeof payload === "string") {
      // Mask bearer tokens
      let sanitized = payload.replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED_TOKEN]");
      // Mask credit card numbers
      sanitized = sanitized.replace(/\b(?:\d{4}[ -]?){3}\d{4}\b/g, "[REDACTED_CARD]");
      return sanitized;
    }

    if (Array.isArray(payload)) {
      return payload.map((item) => FailureRecoveryObservabilitySecurityService.sanitizeLogPayload(item));
    }

    if (typeof payload === "object") {
      const sanitizedObj: Record<string, any> = {};
      for (const [key, value] of Object.entries(payload)) {
        const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
        if (isSensitiveKey) {
          sanitizedObj[key] = "[REDACTED]";
        } else {
          sanitizedObj[key] = FailureRecoveryObservabilitySecurityService.sanitizeLogPayload(value);
        }
      }
      return sanitizedObj;
    }

    return payload;
  }

  /**
   * OBS-06: Prevent alert failures from remaining unnoticed.
   */
  static assertAlertDispatchReliability(params: {
    alertId: string;
    primaryChannelFailed: boolean;
    fallbackChannelTriggered: boolean;
    deadMansSwitchActive: boolean;
  }): void {
    const { alertId, primaryChannelFailed, fallbackChannelTriggered, deadMansSwitchActive } = params;

    if (!deadMansSwitchActive) {
      throw new FailureRecoveryObservabilitySecurityError(
        "Alerting pipeline compromised: Dead-man's switch heartbeat is inactive."
      );
    }

    if (primaryChannelFailed && !fallbackChannelTriggered) {
      throw new FailureRecoveryObservabilitySecurityError(
        `Alert dispatch failure unnoticed: Primary notification channel failed for alert '${alertId}', but fallback pipeline was not triggered.`
      );
    }
  }

  /**
   * OBS-07: Prevent an integration outage from appearing as normal operation.
   */
  static assertIntegrationHealthStatus(params: {
    providerName: string;
    circuitBreakerOpen: boolean;
    consecutiveFailures: number;
    reportedStatus: "healthy" | "degraded" | "outage";
  }): void {
    const { providerName, circuitBreakerOpen, consecutiveFailures, reportedStatus } = params;

    const isDegradedOrOutage = circuitBreakerOpen || consecutiveFailures >= 3;

    if (isDegradedOrOutage && reportedStatus === "healthy") {
      throw new FailureRecoveryObservabilitySecurityError(
        `Integration outage masked: Provider '${providerName}' has circuit breaker open (${circuitBreakerOpen}) and ${consecutiveFailures} consecutive failures, but was reported as 'healthy'.`
      );
    }
  }

  /**
   * OBS-08: Prevent incomplete recovery from leaving conflicting booking or billing states.
   */
  static assertStateReconciliationIntegrity(params: {
    bookingState: "confirmed" | "cancelled" | "pending";
    billingState: "captured" | "refunded" | "failed" | "pending";
    reconciliationReported: "consistent" | "conflict";
  }): void {
    const { bookingState, billingState, reconciliationReported } = params;

    const hasConflict =
      (bookingState === "confirmed" && (billingState === "refunded" || billingState === "failed")) ||
      (bookingState === "cancelled" && billingState === "captured");

    if (hasConflict && reconciliationReported === "consistent") {
      throw new FailureRecoveryObservabilitySecurityError(
        `Incomplete recovery detected: Conflicting state between booking ('${bookingState}') and billing ('${billingState}') was erroneously marked as consistent.`
      );
    }
  }

  /**
   * OBS-09: Prevent administrators from changing critical settings without appropriate audit records.
   */
  static assertAdminConfigurationAuditRecorded(params: {
    actorId: string;
    actorRole: string;
    settingKey: string;
    auditRecordId?: string;
    reason?: string;
  }): void {
    const { actorId, actorRole, settingKey, auditRecordId, reason } = params;

    if (CRITICAL_SETTINGS.has(settingKey)) {
      if (!auditRecordId || auditRecordId.trim().length === 0) {
        throw new FailureRecoveryObservabilitySecurityError(
          `Unauthorized critical configuration modification: Admin '${actorId}' (${actorRole}) attempted to modify '${settingKey}' without generating an audit record.`
        );
      }

      if (!reason || reason.trim().length < 5) {
        throw new FailureRecoveryObservabilitySecurityError(
          `Critical configuration modification rejected: Admin '${actorId}' must provide a justified audit reason (minimum 5 chars) for setting '${settingKey}'.`
        );
      }
    }
  }

  /**
   * OBS-10: Prevent backup restoration from being assumed successful without verification.
   */
  static assertBackupRestorationVerified(params: {
    backupId: string;
    databaseName: string;
    checksumMatched: boolean;
    rowCountVerified: boolean;
    syntheticReadPassed: boolean;
    reportedRestorationSuccess: boolean;
  }): void {
    const {
      backupId,
      databaseName,
      checksumMatched,
      rowCountVerified,
      syntheticReadPassed,
      reportedRestorationSuccess,
    } = params;

    const allVerified = checksumMatched && rowCountVerified && syntheticReadPassed;

    if (reportedRestorationSuccess && !allVerified) {
      throw new FailureRecoveryObservabilitySecurityError(
        `Unverified backup restoration: Restoration for backup '${backupId}' on '${databaseName}' cannot be declared successful without completing all verifications (checksum: ${checksumMatched}, row count: ${rowCountVerified}, synthetic read: ${syntheticReadPassed}).`
      );
    }
  }
}
