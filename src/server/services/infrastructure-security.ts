/**
 * Infrastructure, Secrets & Deployment Security Authority
 * 
 * Enforces Section 17 Hardening Guarantees:
 * - INFRA-01: Prevention of production secrets committed to source control
 * - INFRA-02: Prevention of development/test credentials in production
 * - INFRA-03: Prevention of missing environment variables & unsafe fallback defaults
 * - INFRA-04: Prevention of debug mode exposing production internals
 * - INFRA-05: Authorization enforcement on deployment & release actions
 * - INFRA-06: Prevention of unreviewed/untested automatic deployments
 * - INFRA-07: Release planning & safety controls for database migrations
 * - INFRA-08: Health checks fail closed on critical dependency failures (503)
 * - INFRA-09: Telemetry heartbeats & dead-man switch preventing silent outages
 * - INFRA-10: Resource exhaustion & rate-limiting on public endpoints
 * - INFRA-11: Dependency vulnerability audit gates
 * - INFRA-12: Build environment secret isolation from untrusted scripts
 * - INFRA-13: Rollback data preservation & post-release write protection
 * - INFRA-14: Disaster recovery validation & restoration drill recency
 */

export class InfrastructureSecurityError extends Error {
  constructor(message: string, public readonly code: string = "INFRASTRUCTURE_SECURITY_VIOLATION") {
    super(message);
    this.name = "InfrastructureSecurityError";
  }
}

// Patterns of real credentials and private keys
const SECRET_SIGNATURE_PATTERNS = [
  /sk_live_[0-9a-zA-Z]{24,}/,
  /rzp_live_[0-9a-zA-Z]{14,}/,
  /ghp_[0-9a-zA-Z]{36}/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/,
  /sq0csp-[0-9a-zA-Z\-_]{43}/,
  /xox[baprs]-[0-9]{10,}-[0-9a-zA-Z]+/,
];

// Development credential signatures prohibited in production
const DEV_CREDENTIAL_PATTERNS = [
  /^sk_test_/,
  /^rzp_test_/,
  /^test_secret_/,
  /dummy/i,
  /demo_secret/i,
  /password123/i,
  /postgres:\/\/.*localhost/i,
  /127\.0\.0\.1:5432/i,
];

// Required environment variables in production
export const MANDATORY_PRODUCTION_ENV_VARS = [
  "DATABASE_URL",
  "APP_URL",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
];

export class InfrastructureSecurityService {
  /**
   * INFRA-01: Prevent production secrets from being committed to source control.
   */
  static assertNoCommittedSecrets(fileContent: string, filePath: string): void {
    if (!fileContent || typeof fileContent !== "string") return;

    for (const pattern of SECRET_SIGNATURE_PATTERNS) {
      if (pattern.test(fileContent)) {
        throw new InfrastructureSecurityError(
          `Security violation in '${filePath}': Production secret pattern detected. Committing live API keys or private keys to source control is prohibited.`
        );
      }
    }

    // Explicit check for .env files containing production live secrets
    if (filePath.endsWith(".env") || filePath.endsWith(".env.production")) {
      if (/sk_live_|rzp_live_|password=postgres/i.test(fileContent)) {
        throw new InfrastructureSecurityError(
          `Security violation: '${filePath}' contains unmasked production credentials and cannot be committed.`
        );
      }
    }
  }

  /**
   * INFRA-02: Prevent development credentials from being used unintentionally in production.
   */
  static assertProductionCredentialHygiene(env: Record<string, string | undefined>): void {
    const isProduction = env.NODE_ENV === "production";
    if (!isProduction) return;

    const credentialsToCheck = [
      { key: "DATABASE_URL", value: env.DATABASE_URL },
      { key: "RAZORPAY_KEY_ID", value: env.RAZORPAY_KEY_ID },
      { key: "RAZORPAY_KEY_SECRET", value: env.RAZORPAY_KEY_SECRET },
      { key: "STRIPE_SECRET_KEY", value: env.STRIPE_SECRET_KEY },
      { key: "SESSION_SECRET", value: env.SESSION_SECRET },
    ];

    for (const { key, value } of credentialsToCheck) {
      if (value) {
        for (const devPattern of DEV_CREDENTIAL_PATTERNS) {
          if (devPattern.test(value)) {
            throw new InfrastructureSecurityError(
              `Production deployment halted: Environment variable '${key}' is using a development/test credential pattern in production environment.`
            );
          }
        }
      }
    }
  }

  /**
   * INFRA-03: Prevent missing environment variables from causing unsafe fallback behavior.
   */
  static validateMandatoryEnvironmentVariables(
    env: Record<string, string | undefined>,
    isProduction: boolean = false
  ): void {
    if (!isProduction) return;

    const missing: string[] = [];

    for (const reqKey of MANDATORY_PRODUCTION_ENV_VARS) {
      const val = env[reqKey];
      if (!val || !val.trim() || val === "undefined" || val === "null") {
        missing.push(reqKey);
      }
    }

    if (missing.length > 0) {
      throw new InfrastructureSecurityError(
        `Production deployment halted: Missing required environment variables [${missing.join(", ")}]. Silent fallback to mock or insecure defaults is strictly prohibited.`
      );
    }
  }

  /**
   * INFRA-04: Prevent debug mode from exposing production internals.
   */
  static assertDebugModeDisabledInProduction(config: {
    nodeEnv: string;
    debugFlag?: boolean;
    exposeInternalDiagnostics?: boolean;
  }): void {
    if (config.nodeEnv === "production") {
      if (config.debugFlag === true) {
        throw new InfrastructureSecurityError(
          "Production security violation: DEBUG mode must be disabled in production."
        );
      }
      if (config.exposeInternalDiagnostics === true) {
        throw new InfrastructureSecurityError(
          "Production security violation: Internal diagnostics cannot be publicly exposed in production."
        );
      }
    }
  }

  /**
   * INFRA-05: Prevent unauthorized deployment or release actions.
   */
  static assertDeploymentAuthorized(actor: {
    userId: string;
    role: string;
    mfaVerified: boolean;
    branch: string;
    targetEnvironment: string;
  }): void {
    if (actor.targetEnvironment === "production") {
      if (actor.role !== "owner" && actor.role !== "release_manager") {
        throw new InfrastructureSecurityError(
          `Deployment unauthorized: Role '${actor.role}' does not possess production release authority.`
        );
      }

      if (!actor.mfaVerified) {
        throw new InfrastructureSecurityError(
          "Deployment unauthorized: Multi-Factor Authentication (MFA) is strictly required for production releases."
        );
      }

      const validProductionBranches = ["main", "master", "release"];
      if (!validProductionBranches.includes(actor.branch)) {
        throw new InfrastructureSecurityError(
          `Deployment unauthorized: Cannot deploy directly to production from feature branch '${actor.branch}'. Releases must originate from protected branches [${validProductionBranches.join(", ")}].`
        );
      }
    }
  }

  /**
   * INFRA-06: Prevent unreviewed changes from being deployed automatically.
   */
  static assertReleasePullRequestReviewed(releaseContext: {
    prNumber: number;
    approvedReviews: number;
    ciPassed: boolean;
    signedCommit: boolean;
  }): void {
    if (!releaseContext.ciPassed) {
      throw new InfrastructureSecurityError(
        `Release gate failed: CI build and automated test suite must pass before deployment.`
      );
    }

    if (releaseContext.approvedReviews < 1) {
      throw new InfrastructureSecurityError(
        `Release gate failed: PR #${releaseContext.prNumber} requires at least 1 peer approval before production release.`
      );
    }

    if (!releaseContext.signedCommit) {
      throw new InfrastructureSecurityError(
        `Release gate failed: Commits deployed to production must have verified cryptographic signatures.`
      );
    }
  }

  /**
   * INFRA-07: Prevent database migrations from running without an appropriate release plan.
   */
  static assertReleaseMigrationSafety(plan: {
    releaseId: string;
    migrationCount: number;
    isDestructive: boolean;
    maintenanceWindow: boolean;
    rollbackVerified: boolean;
  }): void {
    if (plan.migrationCount > 0 && plan.isDestructive) {
      if (!plan.maintenanceWindow) {
        throw new InfrastructureSecurityError(
          `Release plan rejected: Destructive schema migration requires an approved maintenance window to prevent live request disruption.`
        );
      }

      if (!plan.rollbackVerified) {
        throw new InfrastructureSecurityError(
          `Release plan rejected: Verified rollback script is strictly required for destructive migrations.`
        );
      }
    }
  }

  /**
   * INFRA-08: Prevent health checks from reporting full readiness when critical dependencies are unavailable.
   */
  static evaluateOverallHealth(
    dependencies: Record<string, { status: "ok" | "error"; critical?: boolean; error?: string }>,
    isProduction: boolean = false
  ): { isHealthy: boolean; httpStatus: number; degradedDependencies: string[] } {
    const degradedDependencies: string[] = [];

    for (const [name, check] of Object.entries(dependencies)) {
      // In production, database and payments are always critical
      const isCritical = check.critical !== undefined ? check.critical : (name === "database" || (name === "razorpay" && isProduction));

      if (check.status === "error" && isCritical) {
        degradedDependencies.push(name);
      }
    }

    const isHealthy = degradedDependencies.length === 0;
    return {
      isHealthy,
      httpStatus: isHealthy ? 200 : 503,
      degradedDependencies,
    };
  }

  /**
   * INFRA-09: Prevent monitoring failures from hiding critical service outages.
   */
  static evaluateTelemetryHeartbeat(
    lastHeartbeat: Date | string,
    maxIntervalSeconds: number = 120
  ): { alertTriggered: boolean; message?: string } {
    const hbDate = lastHeartbeat instanceof Date ? lastHeartbeat : new Date(lastHeartbeat);
    if (isNaN(hbDate.getTime())) {
      return {
        alertTriggered: true,
        message: "Dead-man switch alert: Invalid or missing telemetry heartbeat.",
      };
    }

    const elapsedSeconds = Math.floor((Date.now() - hbDate.getTime()) / 1000);
    if (elapsedSeconds > maxIntervalSeconds) {
      return {
        alertTriggered: true,
        message: `Dead-man switch alert: No monitoring heartbeat received for ${elapsedSeconds}s (threshold: ${maxIntervalSeconds}s). Possible silent outage.`,
      };
    }

    return { alertTriggered: false };
  }

  /**
   * INFRA-10: Prevent resource exhaustion through abuse of public endpoints.
   */
  static assertPublicEndpointAbuseProtection(
    ipAddress: string,
    endpoint: string,
    hitsInWindow: number,
    maxAllowedHits: number = 60
  ): void {
    if (!ipAddress || ipAddress === "unknown") {
      throw new InfrastructureSecurityError("Request rejected: Client IP address required for rate limiting");
    }

    if (hitsInWindow > maxAllowedHits) {
      throw new InfrastructureSecurityError(
        `Rate limit exceeded: IP '${ipAddress}' made ${hitsInWindow} requests to '${endpoint}' (max: ${maxAllowedHits}/window). Request rejected (429).`
      );
    }
  }

  /**
   * INFRA-11: Prevent dependency vulnerabilities from being ignored without assessment.
   */
  static assertVulnerabilityAuditPasses(auditReport: {
    criticalCount: number;
    highCount: number;
    unassessedCount: number;
    signedExceptionApproved?: boolean;
  }): void {
    const { criticalCount, highCount, unassessedCount, signedExceptionApproved } = auditReport;

    if (criticalCount > 0 && !signedExceptionApproved) {
      throw new InfrastructureSecurityError(
        `Security gate failed: ${criticalCount} critical vulnerability/vulnerabilities detected in dependencies without signed security exemption.`
      );
    }

    if (highCount > 0 && !signedExceptionApproved) {
      throw new InfrastructureSecurityError(
        `Security gate failed: ${highCount} high vulnerability/vulnerabilities detected in dependencies without signed security exemption.`
      );
    }

    if (unassessedCount > 0 && !signedExceptionApproved) {
      throw new InfrastructureSecurityError(
        `Security gate failed: ${unassessedCount} unassessed dependency vulnerabilities detected.`
      );
    }
  }

  /**
   * INFRA-12: Prevent untrusted build scripts from accessing production secrets unnecessarily.
   */
  static sanitizeBuildEnvironment(
    env: Record<string, string | undefined>
  ): Record<string, string | undefined> {
    const sanitized: Record<string, string | undefined> = {};
    const RESTRICTED_SECRETS = new Set([
      "DATABASE_URL",
      "STRIPE_SECRET_KEY",
      "RAZORPAY_KEY_SECRET",
      "TWILIO_AUTH_TOKEN",
      "JWT_SECRET",
      "SESSION_SECRET",
      "SSH_PRIVATE_KEY",
      "AWS_SECRET_ACCESS_KEY",
    ]);

    for (const [k, v] of Object.entries(env)) {
      if (!RESTRICTED_SECRETS.has(k)) {
        sanitized[k] = v;
      }
    }

    return sanitized;
  }

  /**
   * INFRA-13: Prevent rollback from destroying data created after the previous release.
   */
  static assertRollbackDataPreservation(
    targetReleaseVersion: string,
    currentLiveVersion: string,
    postReleaseRecordCount: number,
    dataMigrationExecuted: boolean
  ): void {
    if (postReleaseRecordCount > 0 && dataMigrationExecuted) {
      throw new InfrastructureSecurityError(
        `Rollback blocked: ${postReleaseRecordCount} record(s) created under current schema release '${currentLiveVersion}'. Rolling back to '${targetReleaseVersion}' would destroy live customer data. A forward-fix migration or delta export is required.`
      );
    }
  }

  /**
   * INFRA-14: Prevent recovery plans from being considered valid without restoration tests.
   */
  static assertDisasterRecoveryPlanTested(plan: {
    drPlanId: string;
    lastRestorationTestDate: Date | string;
    testResult: "passed" | "failed";
    maxTestAgeDays?: number;
  }): void {
    const { drPlanId, lastRestorationTestDate, testResult, maxTestAgeDays = 90 } = plan;

    if (testResult !== "passed") {
      throw new InfrastructureSecurityError(
        `Disaster recovery plan '${drPlanId}' is invalid: Most recent restoration test result was '${testResult}'.`
      );
    }

    const testDate = lastRestorationTestDate instanceof Date ? lastRestorationTestDate : new Date(lastRestorationTestDate);
    if (isNaN(testDate.getTime())) {
      throw new InfrastructureSecurityError(
        `Disaster recovery plan '${drPlanId}' is invalid: Invalid restoration test date.`
      );
    }

    const ageDays = Math.floor((Date.now() - testDate.getTime()) / (1000 * 60 * 60 * 24));
    if (ageDays > maxTestAgeDays) {
      throw new InfrastructureSecurityError(
        `Disaster recovery plan '${drPlanId}' is expired: Last successful drill was ${ageDays} days ago (exceeds ${maxTestAgeDays}-day threshold).`
      );
    }
  }
}
