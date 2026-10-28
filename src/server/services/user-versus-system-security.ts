/**
 * Complete User-Versus-System Interaction Scenarios Security Authority
 * 
 * Enforces Section 20 Hardening Guarantees:
 * - UVSS-01: Prevent a user from submitting a request for which they lack permission
 * - UVSS-02: Prevent the system from trusting user-provided ownership identifiers
 * - UVSS-03: Prevent the system from trusting unverified AI output
 * - UVSS-04: Prevent the user from bypassing required server-side validation
 * - UVSS-05: Prevent a race condition when two users change the same resource
 * - UVSS-06: Prevent the system from accepting stale authorization or configuration
 * - UVSS-07: Prevent the user from repeating a non-idempotent action without safeguards
 * - UVSS-08: Prevent the system from confirming an action before persistence
 * - UVSS-09: Prevent the system from silently losing a user's work after a recoverable error
 * - UVSS-10: Prevent a malicious user from making another user's session perform an action
 * - UVSS-11: Prevent external service failures from corrupting internal state
 * - UVSS-12: Prevent the system from continuing a sensitive action after permission revocation
 * - UVSS-13: Prevent an administrator from accidentally exposing or deleting tenant data
 * - UVSS-14: Prevent an AI action from exceeding the permissions of the business and requesting user
 * - UVSS-15: Prevent security controls from being skipped in alternate routes, background jobs or internal APIs
 * - UVSS-16: Prevent recovery workflows from weakening authorization or data-integrity checks
 */

export class UserVersusSystemSecurityError extends Error {
  constructor(message: string, public readonly code: string = "USER_VERSUS_SYSTEM_VIOLATION") {
    super(message);
    this.name = "UserVersusSystemSecurityError";
  }
}

export class UserVersusSystemSecurityService {
  /**
   * UVSS-01: Prevent a user from submitting a request for which they lack permission.
   */
  static assertUserPermission(actor: {
    userId: string;
    role: string;
    permissions: string[];
  }, requiredPermission: string): void {
    if (!actor.permissions || !actor.permissions.includes(requiredPermission)) {
      throw new UserVersusSystemSecurityError(
        `Access denied: User '${actor.userId}' with role '${actor.role}' lacks required permission '${requiredPermission}'`
      );
    }
  }

  /**
   * UVSS-02: Prevent the system from trusting user-provided ownership identifiers.
   */
  static assertOwnershipContextVerified(
    session: { organizationId: string; userId: string },
    requestedResource: { organizationId: string; ownerUserId?: string },
    clientSuppliedOrgId?: string
  ): void {
    if (clientSuppliedOrgId && clientSuppliedOrgId !== session.organizationId) {
      throw new UserVersusSystemSecurityError(
        `Ownership mismatch detected: Client-supplied organization '${clientSuppliedOrgId}' does not match authenticated session '${session.organizationId}'. System rejects unverified client ownership identifiers.`
      );
    }

    if (requestedResource.organizationId !== session.organizationId) {
      throw new UserVersusSystemSecurityError(
        `Access denied: Resource belongs to organization '${requestedResource.organizationId}', not session '${session.organizationId}'.`
      );
    }
  }

  /**
   * UVSS-03: Prevent the system from trusting unverified AI output.
   */
  static assertAiOutputVerified(aiOutput: {
    suggestedAction: string;
    confidenceScore: number;
    minConfidenceRequired?: number;
    isSchemaValid: boolean;
    policyComplianceVerified: boolean;
    containsHallucinatedEntities?: boolean;
  }): void {
    const {
      suggestedAction,
      confidenceScore,
      minConfidenceRequired = 0.8,
      isSchemaValid,
      policyComplianceVerified,
      containsHallucinatedEntities,
    } = aiOutput;

    if (!isSchemaValid) {
      throw new UserVersusSystemSecurityError(
        `Unverified AI output rejected: Action '${suggestedAction}' failed strict schema validation.`
      );
    }

    if (containsHallucinatedEntities) {
      throw new UserVersusSystemSecurityError(
        `Unverified AI output rejected: Action '${suggestedAction}' references unverified or hallucinated database entities.`
      );
    }

    if (!policyComplianceVerified) {
      throw new UserVersusSystemSecurityError(
        `Unverified AI output rejected: Action '${suggestedAction}' has not been verified against business security policies.`
      );
    }

    if (confidenceScore < minConfidenceRequired) {
      throw new UserVersusSystemSecurityError(
        `Unverified AI output rejected: Confidence score (${confidenceScore}) is below required safety threshold (${minConfidenceRequired}).`
      );
    }
  }

  /**
   * UVSS-04: Prevent the user from bypassing required server-side validation.
   */
  static assertServerSideValidation<T>(
    data: unknown,
    validator: (input: unknown) => { isValid: boolean; errors?: string[]; sanitized?: T }
  ): T {
    const result = validator(data);
    if (!result.isValid) {
      const issues = result.errors?.join(", ") || "Validation failed";
      throw new UserVersusSystemSecurityError(
        `Server-side validation failure: Client input violated required constraints (${issues}). Client-side validation cannot bypass server constraints.`
      );
    }
    return (result.sanitized !== undefined ? result.sanitized : data) as T;
  }

  /**
   * UVSS-05: Prevent a race condition when two users change the same resource.
   */
  static assertOptimisticConcurrencyLock(
    currentVersion: number,
    incomingVersion: number,
    resourceId: string
  ): void {
    if (incomingVersion !== currentVersion) {
      throw new UserVersusSystemSecurityError(
        `Concurrent modification conflict: Resource '${resourceId}' was updated to version ${currentVersion} while client was editing version ${incomingVersion}. Concurrent write rejected (409 Conflict).`
      );
    }
  }

  /**
   * UVSS-06: Prevent the system from accepting stale authorization or configuration.
   */
  static assertAuthorizationFreshness(authContext: {
    tokenIssuedAt: Date;
    permissionsRevokedAt?: Date;
    isSessionRevoked?: boolean;
    cachedConfigVersion: number;
    authoritativeConfigVersion: number;
  }): void {
    const { tokenIssuedAt, permissionsRevokedAt, isSessionRevoked, cachedConfigVersion, authoritativeConfigVersion } = authContext;

    if (isSessionRevoked) {
      throw new UserVersusSystemSecurityError(
        "Stale authorization rejected: User session has been revoked."
      );
    }

    if (permissionsRevokedAt && tokenIssuedAt.getTime() < permissionsRevokedAt.getTime()) {
      throw new UserVersusSystemSecurityError(
        "Stale authorization rejected: Token was issued prior to recent permission revocation. Re-authentication required."
      );
    }

    if (cachedConfigVersion < authoritativeConfigVersion) {
      throw new UserVersusSystemSecurityError(
        `Stale configuration rejected: Cached configuration version ${cachedConfigVersion} is superseded by authoritative version ${authoritativeConfigVersion}. Cache invalidation required.`
      );
    }
  }

  /**
   * UVSS-07: Prevent the user from repeating a non-idempotent action without safeguards.
   */
  static assertNonIdempotentActionSafeguards(params: {
    actionName: string;
    idempotencyKey?: string;
    isActionInFlight?: boolean;
  }): void {
    const { actionName, idempotencyKey, isActionInFlight } = params;

    if (!idempotencyKey || idempotencyKey.trim().length === 0) {
      throw new UserVersusSystemSecurityError(
        `Non-idempotent action rejected: Action '${actionName}' requires a valid idempotency key to prevent accidental duplicate execution.`
      );
    }

    if (isActionInFlight) {
      throw new UserVersusSystemSecurityError(
        `Action in flight: Action '${actionName}' with idempotency key '${idempotencyKey}' is currently processing. Repeat request blocked.`
      );
    }
  }

  /**
   * UVSS-08: Prevent the system from confirming an action before persistence.
   */
  static assertActionDurablePersistence(params: {
    actionId: string;
    transactionCommitted: boolean;
  }): void {
    const { actionId, transactionCommitted } = params;

    if (!transactionCommitted) {
      throw new UserVersusSystemSecurityError(
        `Premature confirmation prevented: Action '${actionId}' has not been committed to durable persistence. Confirmation to client is withheld.`
      );
    }
  }

  /**
   * UVSS-09: Prevent the system from silently losing a user's work after a recoverable error.
   */
  static preserveWorkOnRecoverableError<T>(params: {
    userId: string;
    draftPayload: T;
    error: Error;
    draftStore: Map<string, { payload: T; savedAt: Date }>;
  }): { recoveryToken: string; preserved: boolean } {
    const { userId, draftPayload, error, draftStore } = params;

    const recoveryToken = `recov_${userId}_${Date.now()}`;
    draftStore.set(recoveryToken, {
      payload: draftPayload,
      savedAt: new Date(),
    });

    return {
      recoveryToken,
      preserved: true,
    };
  }

  /**
   * UVSS-10: Prevent a malicious user from making another user's session perform an action.
   */
  static assertSessionIntegrityAgainstHijacking(params: {
    sessionOrigin: string;
    requestOrigin?: string;
    csrfToken?: string;
    expectedCsrfToken?: string;
    sessionUserAgentHash: string;
    requestUserAgentHash: string;
  }): void {
    const {
      sessionOrigin,
      requestOrigin,
      csrfToken,
      expectedCsrfToken,
      sessionUserAgentHash,
      requestUserAgentHash,
    } = params;

    if (requestOrigin && requestOrigin !== sessionOrigin) {
      throw new UserVersusSystemSecurityError(
        `Cross-origin request rejected: Request origin '${requestOrigin}' does not match session origin '${sessionOrigin}'. Cross-site invocation blocked.`
      );
    }

    if (expectedCsrfToken && (!csrfToken || csrfToken !== expectedCsrfToken)) {
      throw new UserVersusSystemSecurityError(
        "CSRF protection violation: State-changing operation lacks valid anti-CSRF token."
      );
    }

    if (sessionUserAgentHash !== requestUserAgentHash) {
      throw new UserVersusSystemSecurityError(
        "Session hijacking detected: Client fingerprint / user-agent mismatch detected on active session."
      );
    }
  }

  /**
   * UVSS-11: Prevent external service failures from corrupting internal state.
   */
  static assertExternalServiceFaultIsolation(params: {
    serviceName: string;
    externalResponse: { isError: boolean; status?: number; payload?: unknown };
    rollbackHandler: () => void;
  }): void {
    const { serviceName, externalResponse, rollbackHandler } = params;

    if (externalResponse.isError || (externalResponse.status && externalResponse.status >= 500)) {
      rollbackHandler();
      throw new UserVersusSystemSecurityError(
        `External fault isolated: Upstream service '${serviceName}' failed with status ${externalResponse.status || '5xx'}. Internal state rolled back cleanly.`
      );
    }
  }

  /**
   * UVSS-12: Prevent the system from continuing a sensitive action after permission revocation.
   */
  static assertActiveOperationPermissionValid(params: {
    operationId: string;
    userId: string;
    currentRole: string;
    requiredRole: string;
    isRevoked: boolean;
  }): void {
    const { operationId, userId, currentRole, requiredRole, isRevoked } = params;

    if (isRevoked || currentRole !== requiredRole) {
      throw new UserVersusSystemSecurityError(
        `In-flight operation halted: User '${userId}' permissions revoked or downgraded during execution of operation '${operationId}'. Pipeline terminated.`
      );
    }
  }

  /**
   * UVSS-13: Prevent an administrator from accidentally exposing or deleting tenant data.
   */
  static assertDestructiveAdminOperationAuthorized(params: {
    adminUserId: string;
    targetOrganizationId: string;
    operationType: "delete_tenant" | "export_all" | "purge_records";
    confirmationPhrase: string;
    mfaVerified: boolean;
  }): void {
    const { adminUserId, targetOrganizationId, operationType, confirmationPhrase, mfaVerified } = params;

    const expectedPhrase = `CONFIRM_${operationType.toUpperCase()}_${targetOrganizationId}`;

    if (!mfaVerified) {
      throw new UserVersusSystemSecurityError(
        `Destructive admin action rejected: Step-up MFA verification is mandatory for '${operationType}' on organization '${targetOrganizationId}'.`
      );
    }

    if (confirmationPhrase !== expectedPhrase) {
      throw new UserVersusSystemSecurityError(
        `Destructive admin action rejected: Invalid confirmation phrase '${confirmationPhrase}'. Expected '${expectedPhrase}'.`
      );
    }
  }

  /**
   * UVSS-14: Prevent an AI action from exceeding the permissions of the business and requesting user.
   */
  static assertAiActionWithinCompositePermissions(params: {
    action: string;
    userPermissions: string[];
    businessPlanPermissions: string[];
    aiAllowedTools: string[];
  }): void {
    const { action, userPermissions, businessPlanPermissions, aiAllowedTools } = params;

    if (!businessPlanPermissions.includes(action)) {
      throw new UserVersusSystemSecurityError(
        `Composite permission denied: Business subscription plan does not allow AI action '${action}'.`
      );
    }

    if (!userPermissions.includes(action)) {
      throw new UserVersusSystemSecurityError(
        `Composite permission denied: Requesting user lacks permission to authorize AI action '${action}'.`
      );
    }

    if (!aiAllowedTools.includes(action)) {
      throw new UserVersusSystemSecurityError(
        `Composite permission denied: AI agent is not configured or authorized to execute tool '${action}'.`
      );
    }
  }

  /**
   * UVSS-15: Prevent security controls from being skipped in alternate routes, background jobs or internal APIs.
   */
  static assertUniversalSecurityBoundaryEnforced(context: {
    routeType: "public_api" | "internal_rpc" | "background_worker" | "cron_job";
    tenantIdVerified: boolean;
    inputValidated: boolean;
    callerAuthorized: boolean;
  }): void {
    const { routeType, tenantIdVerified, inputValidated, callerAuthorized } = context;

    if (!tenantIdVerified) {
      throw new UserVersusSystemSecurityError(
        `Universal security boundary violation: Route type '${routeType}' executed without tenant boundary verification.`
      );
    }

    if (!callerAuthorized) {
      throw new UserVersusSystemSecurityError(
        `Universal security boundary violation: Route type '${routeType}' executed without caller authorization.`
      );
    }

    if (!inputValidated) {
      throw new UserVersusSystemSecurityError(
        `Universal security boundary violation: Route type '${routeType}' executed without server-side input validation.`
      );
    }
  }

  /**
   * UVSS-16: Prevent recovery workflows from weakening authorization or data-integrity checks.
   */
  static assertRecoveryWorkflowSecurityStandards(params: {
    workflowName: string;
    isRecoveryMode: boolean;
    bypassAuthRequested?: boolean;
    bypassValidationRequested?: boolean;
    bypassTenantIsolationRequested?: boolean;
  }): void {
    const { workflowName, bypassAuthRequested, bypassValidationRequested, bypassTenantIsolationRequested } = params;

    if (bypassAuthRequested) {
      throw new UserVersusSystemSecurityError(
        `Security standard breach: Recovery workflow '${workflowName}' cannot weaken or bypass authorization checks.`
      );
    }

    if (bypassValidationRequested) {
      throw new UserVersusSystemSecurityError(
        `Security standard breach: Recovery workflow '${workflowName}' cannot weaken or bypass schema validation.`
      );
    }

    if (bypassTenantIsolationRequested) {
      throw new UserVersusSystemSecurityError(
        `Security standard breach: Recovery workflow '${workflowName}' cannot weaken or bypass tenant isolation barriers.`
      );
    }
  }
}

