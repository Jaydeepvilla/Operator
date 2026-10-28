/**
 * Abuse, Fraud & Availability Security Authority
 * 
 * Enforces Section 18 Hardening Guarantees:
 * - ABUSE-01: Prevention of automated account creation abuse & disposable email spam
 * - ABUSE-02: Telephony and messaging outbound cost throttling & velocity caps
 * - ABUSE-03: Prevention of appointment spam and malicious booking floods (slot starvation)
 * - ABUSE-04: Prevention of resource exhaustion through oversized uploads / payloads
 * - ABUSE-05: Prevention of brute-force login attempts via account lockout & IP throttling
 * - ABUSE-06: Prevention of runaway AI tool loops and infinite token consumption
 * - ABUSE-07: Queue retry bounds & dead-letter queue (DLQ) exponential backoff
 * - ABUSE-08: Public endpoint concurrency limits & capacity protection
 * - ABUSE-09: Multi-tenant fair-share resource allocation (anti-monopolization)
 * - ABUSE-10: Prevention of free trial, promo plan, and payment fingerprint recycling abuse
 * - ABUSE-11: Protection of usage counters from unauthorized user manipulation
 * - ABUSE-12: Tamper-proofing of security monitoring and alerting configurations
 */

export class AbuseFraudSecurityError extends Error {
  constructor(message: string, public readonly code: string = "ABUSE_FRAUD_VIOLATION") {
    super(message);
    this.name = "AbuseFraudSecurityError";
  }
}

// Known disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "10minutemail.com",
  "tempmail.com",
  "guerrillamail.com",
  "throwawaymail.com",
  "sharklasers.com",
  "yopmail.com",
]);

export class AbuseFraudSecurityService {
  /**
   * ABUSE-01: Prevent automated account creation abuse.
   */
  static assertAccountCreationPermitted(params: {
    email: string;
    ipAddress: string;
    captchaVerified?: boolean;
    accountsCreatedInWindow: number;
    maxAccountsPerWindow?: number;
  }): void {
    const { email, ipAddress, captchaVerified, accountsCreatedInWindow, maxAccountsPerWindow = 3 } = params;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      throw new AbuseFraudSecurityError("Account creation rejected: Valid email address is required");
    }

    const domain = email.split("@")[1]?.toLowerCase().trim();
    if (domain && DISPOSABLE_DOMAINS.has(domain)) {
      throw new AbuseFraudSecurityError(
        `Account creation rejected: Disposable/temporary email domains (${domain}) are prohibited`
      );
    }

    if (accountsCreatedInWindow >= maxAccountsPerWindow) {
      if (!captchaVerified) {
        throw new AbuseFraudSecurityError(
          `Account creation rate limit reached: IP '${ipAddress}' created ${accountsCreatedInWindow} accounts. CAPTCHA verification required`
        );
      }
      if (accountsCreatedInWindow >= maxAccountsPerWindow * 3) {
        throw new AbuseFraudSecurityError(
          `Account creation abuse detected: IP '${ipAddress}' exceeded absolute velocity limits`
        );
      }
    }
  }

  /**
   * ABUSE-02: Prevent repeated calls or messages that generate unexpected provider costs.
   */
  static assertCommunicationVelocityPermitted(params: {
    organizationId: string;
    channel: "voice" | "sms" | "email";
    outboundCountLastHour: number;
    hourlyLimit: number;
    costThresholdExceeded?: boolean;
  }): void {
    const { organizationId, channel, outboundCountLastHour, hourlyLimit, costThresholdExceeded } = params;

    if (costThresholdExceeded) {
      throw new AbuseFraudSecurityError(
        `Outbound communication halted: Organization '${organizationId}' has reached its provider cost spend ceiling for ${channel}`
      );
    }

    if (outboundCountLastHour >= hourlyLimit) {
      throw new AbuseFraudSecurityError(
        `Rate limit exceeded: Organization '${organizationId}' reached maximum outbound ${channel} limit (${outboundCountLastHour}/${hourlyLimit} per hour)`
      );
    }
  }

  /**
   * ABUSE-03: Prevent appointment spam and malicious booking floods.
   */
  static assertAppointmentFloodProtection(params: {
    ipAddress: string;
    customerIdentifier: string;
    bookingsInWindow: number;
    maxAllowed?: number;
  }): void {
    const { ipAddress, customerIdentifier, bookingsInWindow, maxAllowed = 5 } = params;

    if (bookingsInWindow >= maxAllowed) {
      throw new AbuseFraudSecurityError(
        `Booking flood detected: ${customerIdentifier} from IP '${ipAddress}' created ${bookingsInWindow} bookings within the active window (limit: ${maxAllowed}). Temporary booking cooldown enforced.`
      );
    }
  }

  /**
   * ABUSE-04: Prevent resource exhaustion through oversized uploads or expensive requests.
   */
  static assertPayloadResourceBounds(params: {
    byteSize: number;
    maxAllowedBytes: number;
    complexityScore?: number;
    maxComplexity?: number;
  }): void {
    const { byteSize, maxAllowedBytes, complexityScore, maxComplexity = 100 } = params;

    if (byteSize > maxAllowedBytes) {
      const mbSize = (byteSize / (1024 * 1024)).toFixed(1);
      const maxMb = (maxAllowedBytes / (1024 * 1024)).toFixed(1);
      throw new AbuseFraudSecurityError(
        `Payload too large: Request size (${mbSize} MB) exceeds maximum permitted limit of ${maxMb} MB (413)`
      );
    }

    if (complexityScore !== undefined && complexityScore > maxComplexity) {
      throw new AbuseFraudSecurityError(
        `Expensive request rejected: Request computational complexity (${complexityScore}) exceeds ceiling (${maxComplexity})`
      );
    }
  }

  /**
   * ABUSE-05: Prevent repeated failed login attempts from overwhelming authentication.
   */
  static assertLoginAttemptPermitted(params: {
    targetEmail: string;
    ipAddress: string;
    failedAttempts: number;
    isLocked: boolean;
    lockoutUntil?: Date;
    maxAttempts?: number;
  }): void {
    const { targetEmail, ipAddress, failedAttempts, isLocked, lockoutUntil, maxAttempts = 5 } = params;

    if (isLocked) {
      const remainingSeconds = lockoutUntil ? Math.max(0, Math.ceil((lockoutUntil.getTime() - Date.now()) / 1000)) : 900;
      throw new AbuseFraudSecurityError(
        `Account locked: Too many failed login attempts for '${targetEmail}'. Please retry in ${remainingSeconds} second(s).`
      );
    }

    if (failedAttempts >= maxAttempts) {
      throw new AbuseFraudSecurityError(
        `Authentication velocity limit reached: IP '${ipAddress}' has exceeded ${maxAttempts} failed login attempts. Account temporarily locked.`
      );
    }
  }

  /**
   * ABUSE-06: Prevent AI tool loops from generating runaway model usage.
   */
  static assertAiExecutionLoopBounds(params: {
    toolCallCount: number;
    maxToolCalls?: number;
    recursionDepth: number;
    maxDepth?: number;
    tokenBudgetRemaining: number;
  }): void {
    const { toolCallCount, maxToolCalls = 10, recursionDepth, maxDepth = 5, tokenBudgetRemaining } = params;

    if (recursionDepth >= maxDepth) {
      throw new AbuseFraudSecurityError(
        `Runaway AI execution halted: Maximum recursion depth of ${maxDepth} reached.`
      );
    }

    if (toolCallCount >= maxToolCalls) {
      throw new AbuseFraudSecurityError(
        `Runaway AI execution halted: Maximum tool call invocation limit (${maxToolCalls}) reached in single turn.`
      );
    }

    if (tokenBudgetRemaining <= 0) {
      throw new AbuseFraudSecurityError(
        "Runaway AI execution halted: Model token budget exhausted for current session."
      );
    }
  }

  /**
   * ABUSE-07: Prevent unlimited retries from exhausting workers or queues.
   */
  static assertQueueRetryPermitted(params: {
    currentRetryCount: number;
    maxRetries?: number;
    baseBackoffMs?: number;
  }): { shouldRetry: boolean; backoffMs: number; isDeadLetter: boolean } {
    const { currentRetryCount, maxRetries = 5, baseBackoffMs = 1000 } = params;

    if (currentRetryCount >= maxRetries) {
      return {
        shouldRetry: false,
        backoffMs: 0,
        isDeadLetter: true,
      };
    }

    // Exponential backoff: base * 2^retry
    const backoffMs = baseBackoffMs * Math.pow(2, currentRetryCount);
    return {
      shouldRetry: true,
      backoffMs,
      isDeadLetter: false,
    };
  }

  /**
   * ABUSE-08: Prevent public endpoints from allowing unbounded resource consumption.
   */
  static assertPublicEndpointConcurrency(params: {
    activeConcurrentRequests: number;
    maxConcurrent?: number;
    queueSize: number;
    maxQueueSize?: number;
  }): void {
    const { activeConcurrentRequests, maxConcurrent = 100, queueSize, maxQueueSize = 250 } = params;

    if (activeConcurrentRequests >= maxConcurrent && queueSize >= maxQueueSize) {
      throw new AbuseFraudSecurityError(
        `Endpoint saturated: Active concurrency (${activeConcurrentRequests}) and backlog queue (${queueSize}) exceeded capacity. Request shed (503 Service Unavailable).`
      );
    }
  }

  /**
   * ABUSE-09: Prevent one tenant from monopolizing shared resources.
   */
  static assertTenantFairShareQuota(params: {
    organizationId: string;
    activeTenantWorkloads: number;
    globalActiveWorkloads: number;
    maxTenantSharePercent?: number;
  }): void {
    const { organizationId, activeTenantWorkloads, globalActiveWorkloads, maxTenantSharePercent = 40 } = params;

    if (globalActiveWorkloads > 10) {
      const tenantPercent = Math.round((activeTenantWorkloads / globalActiveWorkloads) * 100);
      if (tenantPercent > maxTenantSharePercent) {
        throw new AbuseFraudSecurityError(
          `Tenant fair-share quota exceeded: Organization '${organizationId}' is consuming ${tenantPercent}% of shared capacity (max: ${maxTenantSharePercent}%). Workload queued.`
        );
      }
    }
  }

  /**
   * ABUSE-10: Prevent abuse of free trials, promotional plans or account limits.
   */
  static assertTrialEligibility(params: {
    organizationId: string;
    domain: string;
    paymentFingerprint?: string;
    previousTrialFingerprints?: string[];
    previousTrialDomains?: string[];
  }): void {
    const { organizationId, domain, paymentFingerprint, previousTrialFingerprints = [], previousTrialDomains = [] } = params;

    if (domain && previousTrialDomains.includes(domain.toLowerCase().trim())) {
      throw new AbuseFraudSecurityError(
        `Promotional trial ineligible: Business domain '${domain}' has already consumed a trial period.`
      );
    }

    if (paymentFingerprint && previousTrialFingerprints.includes(paymentFingerprint)) {
      throw new AbuseFraudSecurityError(
        "Promotional trial ineligible: Payment method fingerprint has already been used for a previous trial."
      );
    }
  }

  /**
   * ABUSE-11: Prevent unauthorized changes to usage counters.
   */
  static assertUsageCounterMutationAuthorized(actor: {
    userId: string;
    role: string;
    isSystemWorker?: boolean;
    isPlatformSuperAdmin?: boolean;
  }): void {
    if (!actor.isSystemWorker && !actor.isPlatformSuperAdmin) {
      throw new AbuseFraudSecurityError(
        `Unauthorized usage counter modification: Role '${actor.role}' cannot manually alter consumed quota counters. Mutations are restricted to system billing authorities.`
      );
    }
  }

  /**
   * ABUSE-12: Prevent monitoring and alerting from being disabled by ordinary users.
   */
  static assertAlertingConfigurationModificationAuthorized(
    actor: { role: string; isPlatformSuperAdmin?: boolean },
    targetAction: "disable" | "modify" | "enable"
  ): void {
    if (targetAction === "disable") {
      if (!actor.isPlatformSuperAdmin) {
        throw new AbuseFraudSecurityError(
          `Unauthorized alerting configuration: Security and availability monitoring alerts cannot be disabled by '${actor.role}'. Superadmin authority required.`
        );
      }
    }
  }
}
