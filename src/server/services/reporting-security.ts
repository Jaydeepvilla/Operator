/**
 * Reporting, Search & Analytics Security Authority
 * 
 * Enforces Section 14 Hardening Guarantees:
 * - SEARCH-01: Global search scoping & cross-tenant record prevention
 * - SEARCH-02: Filter sanitization & tenant restriction enforcement
 * - SEARCH-03: Exported report record integrity & scope assertion
 * - SEARCH-04: Analytics query tenant authorization & isolation
 * - SEARCH-05: Parameter validation & SQL injection defense
 * - SEARCH-06: Resource limit enforcement on expensive aggregations
 * - SEARCH-07: Cross-tenant dashboard cache isolation
 * - SEARCH-08: Metrics freshness metadata & stale-as-realtime prevention
 * - SEARCH-09: Audit log immutability (blocking updates and deletes)
 * - SEARCH-10: Mandatory audit logging for security-sensitive operations
 */

import crypto from "crypto";

export class ReportingSecurityError extends Error {
  constructor(message: string, public readonly code: string = "REPORTING_SECURITY_VIOLATION") {
    super(message);
    this.name = "ReportingSecurityError";
  }
}

export interface SearchRecordItem {
  id: string;
  organizationId: string;
  type: string;
  title: string;
  description?: string | null;
  [key: string]: any;
}

export interface ReportQueryParameters {
  metrics: string[];
  dimensions?: string[];
  groupBy?: string[];
  startDate?: string | Date;
  endDate?: string | Date;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: Record<string, any>;
}

export interface ValidatedReportQuery {
  organizationId: string;
  metrics: string[];
  dimensions: string[];
  startDate: Date;
  endDate: Date;
  limit: number;
  offset: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  filters: Record<string, any>;
  dateRangeDays: number;
}

export interface DashboardCachePayload<T = any> {
  organizationId: string;
  cacheKey: string;
  generatedAt: string;
  data: T;
  isRealtime: boolean;
  ttlSeconds: number;
}

export interface MetricsFreshnessMetadata {
  isRealtime: boolean;
  asOf: string;
  freshnessSeconds: number;
  isStale: boolean;
  staleReason?: string;
}

export interface MandatoryAuditEventInput {
  organizationId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: Date | string;
  metadata?: Record<string, any>;
}

// Allowed metrics whitelist
export const ALLOWED_REPORT_METRICS = new Set([
  "call_volume",
  "call_duration",
  "booking_count",
  "booking_revenue",
  "conversion_rate",
  "gross_revenue",
  "net_revenue",
  "lead_count",
  "average_lead_score",
  "escalation_rate",
  "mrr",
  "arr",
  "arpu",
  "churn_rate",
  "active_subscriptions",
  "feedback_rating",
]);

// Allowed dimensions whitelist
export const ALLOWED_REPORT_DIMENSIONS = new Set([
  "day",
  "week",
  "month",
  "year",
  "hour",
  "status",
  "channel",
  "service_id",
  "agent_id",
  "lead_status",
  "intent",
  "direction",
]);

// Allowed filter keys whitelist
export const ALLOWED_FILTER_KEYS = new Set([
  "organizationId",
  "status",
  "dateFrom",
  "dateTo",
  "startDate",
  "endDate",
  "serviceId",
  "channel",
  "leadScore",
  "assignedTo",
  "searchQuery",
  "category",
  "limit",
  "offset",
  "type",
  "leadProfileId",
  "direction",
]);

// SQL Injection pattern detector
const SQL_INJECTION_PATTERN = /(?:--|\/\*|\*\/|;|'|"|\b(?:UNION\s+SELECT|DROP\s+TABLE|ALTER\s+TABLE|EXEC\s*\(|INSERT\s+INTO|DELETE\s+FROM|TRUNCATE\s+TABLE)\b)/i;

// Security-sensitive actions requiring non-empty audit metadata
export const MANDATORY_SECURITY_ACTIONS = new Set([
  "AUTH_LOGIN",
  "AUTH_LOGIN_FAILED",
  "AUTH_LOGOUT",
  "AUTH_PASSWORD_CHANGE",
  "AUTH_MFA_ENABLE",
  "AUTH_MFA_DISABLE",
  "RBAC_ROLE_CHANGE",
  "USER_INVITE",
  "USER_REMOVE",
  "USER_SUSPEND",
  "BUSINESS_IDENTITY_UPDATE",
  "SETTINGS_UPDATE",
  "BUSINESS_DECOMMISSION",
  "DESTRUCTIVE_RESET",
  "DATA_EXPORT",
  "INTEGRATION_CONNECT",
  "INTEGRATION_REVOKE",
  "API_KEY_ROTATE",
  "BILLING_PLAN_CHANGE",
  "BOOKING_POLICY_CHANGE",
  "TELEPHONY_ROUTING_CHANGE",
]);

export class ReportingSecurityService {
  /**
   * SEARCH-01: Prevent global search from returning records outside authorized scope.
   */
  static assertSearchScope<T extends { organizationId?: string; type?: string }>(
    results: T[],
    authorizedOrgId: string,
    userRole: string = "member",
    allowedCategories?: string[]
  ): T[] {
    if (!authorizedOrgId || typeof authorizedOrgId !== "string" || !authorizedOrgId.trim()) {
      throw new ReportingSecurityError("Authorized organization ID is required for search scoping");
    }

    const cleanOrgId = authorizedOrgId.trim();

    for (const item of results) {
      if (!item.organizationId || item.organizationId !== cleanOrgId) {
        throw new ReportingSecurityError(
          `Unauthorized search result: record belonging to organization '${item.organizationId}' leaked into search results for '${cleanOrgId}'`
        );
      }
    }

    // Role-based category restriction (e.g. non-admins cannot search billing/internal audit items)
    return results.filter((item) => {
      if (allowedCategories && item.type && !allowedCategories.includes(item.type)) {
        return false;
      }
      if (userRole === "member" && (item.type === "billing" || item.type === "audit")) {
        return false;
      }
      return true;
    });
  }

  /**
   * SEARCH-02: Prevent filters from bypassing tenant restrictions.
   */
  static sanitizeAndEnforceFilterScope(
    userFilters: Record<string, any> | undefined,
    authorizedOrgId: string
  ): Record<string, any> {
    if (!authorizedOrgId || typeof authorizedOrgId !== "string" || !authorizedOrgId.trim()) {
      throw new ReportingSecurityError("Authorized organization context required to enforce filter scope");
    }

    const cleanOrgId = authorizedOrgId.trim();
    const sanitized: Record<string, any> = {};

    if (userFilters && typeof userFilters === "object") {
      // Check for tenant override attempt
      const candidateTenantKeys = ["organizationId", "tenantId", "org_id", "businessId", "account_id"];
      for (const key of candidateTenantKeys) {
        if (key in userFilters && userFilters[key]) {
          const suppliedVal = String(userFilters[key]).trim();
          if (suppliedVal !== cleanOrgId) {
            throw new ReportingSecurityError(
              `Filter tenant restriction bypass detected: filter parameter '${key}' ('${suppliedVal}') does not match authorized organization '${cleanOrgId}'`
            );
          }
        }
      }

      // Sanitize filter fields and reject injection tokens
      for (const [key, val] of Object.entries(userFilters)) {
        if (!ALLOWED_FILTER_KEYS.has(key)) {
          continue; // Strip unwhitelisted query filters
        }

        if (typeof val === "string") {
          if (SQL_INJECTION_PATTERN.test(val)) {
            throw new ReportingSecurityError(`Unsafe SQL sequence detected in filter key '${key}'`);
          }
          sanitized[key] = val.trim();
        } else if (typeof val === "number" || typeof val === "boolean") {
          sanitized[key] = val;
        } else if (val instanceof Date) {
          sanitized[key] = val;
        }
      }
    }

    // Authoritative tenant binding
    sanitized.organizationId = cleanOrgId;
    return sanitized;
  }

  /**
   * SEARCH-03: Prevent exported reports from containing unauthorized records.
   */
  static assertReportExportScope(
    records: Array<{ organizationId?: string; [key: string]: any }>,
    authorizedOrgId: string,
    userRole: string = "member"
  ): void {
    if (!authorizedOrgId || typeof authorizedOrgId !== "string" || !authorizedOrgId.trim()) {
      throw new ReportingSecurityError("Authorized organization context required for export scope verification");
    }

    const cleanOrgId = authorizedOrgId.trim();

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      if (!record.organizationId || record.organizationId !== cleanOrgId) {
        throw new ReportingSecurityError(
          `Export security violation at record ${i}: record belongs to tenant '${record.organizationId}' instead of authorized tenant '${cleanOrgId}'`
        );
      }

      // Restrict sensitive financial fields from non-admin export
      if (userRole !== "admin" && userRole !== "owner") {
        const sensitiveKeys = ["netProfit", "providerSecret", "internalNotes", "commissionMargin"];
        for (const sKey of sensitiveKeys) {
          if (sKey in record && record[sKey] !== undefined) {
            throw new ReportingSecurityError(
              `Export security violation: role '${userRole}' is unauthorized to export protected column '${sKey}'`
            );
          }
        }
      }
    }
  }

  /**
   * SEARCH-04: Prevent analytics queries from exposing another business's data.
   */
  static assertAnalyticsQueryAuthorized(params: {
    organizationId: string;
    userRole?: string;
    requestedTenantId?: string;
  }): string {
    const { organizationId, requestedTenantId } = params;

    if (!organizationId || typeof organizationId !== "string" || !organizationId.trim()) {
      throw new ReportingSecurityError(
        "Analytics query rejected: non-empty organizationId is strictly required to prevent cross-tenant exposure"
      );
    }

    const cleanOrgId = organizationId.trim();

    // Reject wildcards or multi-tenant matchers
    if (cleanOrgId === "*" || cleanOrgId === "%" || cleanOrgId.toLowerCase() === "all") {
      throw new ReportingSecurityError("Wildcard or cross-tenant analytics queries are strictly prohibited");
    }

    if (requestedTenantId && typeof requestedTenantId === "string") {
      const cleanRequested = requestedTenantId.trim();
      if (cleanRequested && cleanRequested !== cleanOrgId) {
        throw new ReportingSecurityError(
          `Cross-tenant analytics query attempt: requested tenant '${cleanRequested}' does not match authenticated session '${cleanOrgId}'`
        );
      }
    }

    return cleanOrgId;
  }

  /**
   * SEARCH-05: Prevent user-supplied report parameters from causing unsafe queries.
   */
  static validateReportParameters(
    params: ReportQueryParameters,
    authorizedOrgId: string
  ): ValidatedReportQuery {
    const cleanOrgId = this.assertAnalyticsQueryAuthorized({ organizationId: authorizedOrgId });

    if (!params.metrics || !Array.isArray(params.metrics) || params.metrics.length === 0) {
      throw new ReportingSecurityError("Report parameters must include at least one valid metric");
    }

    // Validate metrics against allowlist
    for (const metric of params.metrics) {
      if (!ALLOWED_REPORT_METRICS.has(metric)) {
        throw new ReportingSecurityError(`Unsafe or unsupported report metric: '${metric}'`);
      }
    }

    // Validate dimensions / group-by
    const rawDimensions = params.dimensions || params.groupBy || ["day"];
    if (!Array.isArray(rawDimensions) || rawDimensions.length === 0) {
      throw new ReportingSecurityError("Report dimensions must be a valid array");
    }

    for (const dim of rawDimensions) {
      if (!ALLOWED_REPORT_DIMENSIONS.has(dim)) {
        throw new ReportingSecurityError(`Unsafe or unsupported report dimension: '${dim}'`);
      }
    }

    // Date parsing and validation
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (params.startDate) {
      startDate = new Date(params.startDate);
      if (isNaN(startDate.getTime())) {
        throw new ReportingSecurityError("Invalid startDate parameter: unable to parse valid date");
      }
    } else {
      // Default: past 30 days
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    if (params.endDate) {
      endDate = new Date(params.endDate);
      if (isNaN(endDate.getTime())) {
        throw new ReportingSecurityError("Invalid endDate parameter: unable to parse valid date");
      }
    } else {
      endDate = now;
    }

    if (startDate > endDate) {
      throw new ReportingSecurityError("Invalid date range: startDate cannot be after endDate");
    }

    const dateRangeDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Sort validation
    let sortBy = params.sortBy ? params.sortBy.trim() : "date";
    if (SQL_INJECTION_PATTERN.test(sortBy)) {
      throw new ReportingSecurityError("Unsafe sequence in sortBy parameter");
    }

    const sortOrder = params.sortOrder === "asc" ? "asc" : "desc";

    // Enforce resource limits
    const { safeLimit } = this.assertReportResourceLimits({
      startDate,
      endDate,
      limit: params.limit,
      requestedGranularity: rawDimensions[0],
    });

    const offset = Math.max(0, Number(params.offset) || 0);

    // Sanitize filters
    const sanitizedFilters = this.sanitizeAndEnforceFilterScope(params.filters, cleanOrgId);

    return {
      organizationId: cleanOrgId,
      metrics: params.metrics,
      dimensions: rawDimensions,
      startDate,
      endDate,
      limit: safeLimit,
      offset,
      sortBy,
      sortOrder,
      filters: sanitizedFilters,
      dateRangeDays,
    };
  }

  /**
   * SEARCH-06: Prevent expensive reports from exhausting shared resources.
   */
  static assertReportResourceLimits(params: {
    startDate: Date;
    endDate: Date;
    limit?: number;
    requestedGranularity?: string;
  }): { safeLimit: number; dateRangeDays: number } {
    const { startDate, endDate, limit, requestedGranularity } = params;

    const spanMs = endDate.getTime() - startDate.getTime();
    const dateRangeDays = Math.ceil(spanMs / (1000 * 60 * 60 * 24));

    // Resource constraint: max time span for day-level aggregations
    const MAX_REPORT_SPAN_DAYS = 366;
    if (dateRangeDays > MAX_REPORT_SPAN_DAYS && requestedGranularity === "day") {
      throw new ReportingSecurityError(
        `Report query exceeds resource limit: maximum time span is ${MAX_REPORT_SPAN_DAYS} days (requested ${dateRangeDays} days)`
      );
    }

    // Resource constraint: max time span for hourly aggregations
    if (requestedGranularity === "hour" && dateRangeDays > 31) {
      throw new ReportingSecurityError(
        `Report query exceeds resource limit: hourly granularity cannot exceed 31 days (requested ${dateRangeDays} days)`
      );
    }

    // Row limit constraints
    const MAX_ROW_LIMIT = 50000;
    const DEFAULT_ROW_LIMIT = 1000;

    if (limit !== undefined && limit !== null) {
      const parsedLimit = Number(limit);
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        throw new ReportingSecurityError("Report limit parameter must be a positive integer");
      }
      if (parsedLimit > MAX_ROW_LIMIT) {
        throw new ReportingSecurityError(
          `Report query exceeds resource limit: maximum allowable record limit is ${MAX_ROW_LIMIT} (requested ${parsedLimit})`
        );
      }
      return { safeLimit: parsedLimit, dateRangeDays };
    }

    return { safeLimit: DEFAULT_ROW_LIMIT, dateRangeDays };
  }

  /**
   * SEARCH-07: Prevent cached dashboard results from leaking between accounts.
   */
  static generateTenantCacheKey(
    prefix: string,
    organizationId: string,
    params: Record<string, any> = {}
  ): string {
    if (!organizationId || typeof organizationId !== "string" || !organizationId.trim()) {
      throw new ReportingSecurityError("Tenant organization ID required to generate isolated cache key");
    }

    const cleanOrg = organizationId.trim();
    const sortedParamStr = JSON.stringify(params, Object.keys(params).sort());
    const paramHash = crypto.createHash("sha256").update(sortedParamStr).digest("hex").slice(0, 16);

    return `dashboard:cache:${prefix}:tenant:${cleanOrg}:${paramHash}`;
  }

  static verifyCachedResultTenantMatch<T = any>(
    cachedEntry: DashboardCachePayload<T> | null | undefined,
    expectedOrgId: string
  ): DashboardCachePayload<T> | null {
    if (!cachedEntry) return null;

    if (!expectedOrgId || typeof expectedOrgId !== "string") {
      throw new ReportingSecurityError("Expected organization ID required for cache tenant verification");
    }

    const cleanExpected = expectedOrgId.trim();

    if (!cachedEntry.organizationId || cachedEntry.organizationId !== cleanExpected) {
      throw new ReportingSecurityError(
        `Cross-tenant cache leakage detected! Cached item belongs to '${cachedEntry.organizationId}', but accessed by '${cleanExpected}'. Cache partition invalidation triggered.`
      );
    }

    return cachedEntry;
  }

  /**
   * SEARCH-08: Prevent inaccurate or stale metrics from being presented as real-time truth.
   */
  static tagMetricsFreshness<T extends object>(
    data: T,
    generatedAt: Date | string,
    maxRealtimeAgeSeconds: number = 60
  ): T & { _freshness: MetricsFreshnessMetadata } {
    const genDate = generatedAt instanceof Date ? generatedAt : new Date(generatedAt);
    if (isNaN(genDate.getTime())) {
      throw new ReportingSecurityError("Invalid generatedAt date provided for metrics freshness tagging");
    }

    const now = Date.now();
    const freshnessSeconds = Math.max(0, Math.floor((now - genDate.getTime()) / 1000));
    const isStale = freshnessSeconds > maxRealtimeAgeSeconds;
    const isRealtime = !isStale;

    const freshnessMeta: MetricsFreshnessMetadata = {
      isRealtime,
      asOf: genDate.toISOString(),
      freshnessSeconds,
      isStale,
      ...(isStale
        ? {
            staleReason: `Metrics generated ${freshnessSeconds}s ago exceed real-time threshold of ${maxRealtimeAgeSeconds}s`,
          }
        : {}),
    };

    return {
      ...data,
      _freshness: freshnessMeta,
    };
  }

  /**
   * SEARCH-09: Prevent unauthorized users from changing or deleting audit records.
   */
  static assertAuditLogImmutability(operation: "insert" | "update" | "delete", callerRole?: string): void {
    if (operation === "update") {
      throw new ReportingSecurityError(
        `Audit records are strictly immutable: UPDATE operation is prohibited even for role '${callerRole || "unknown"}'`
      );
    }

    if (operation === "delete") {
      throw new ReportingSecurityError(
        `Audit records are strictly immutable: DELETE operation is prohibited even for role '${callerRole || "unknown"}'`
      );
    }
  }

  /**
   * SEARCH-10: Prevent security-sensitive activity from being omitted from required audit logs.
   */
  static validateMandatoryAuditRecord(entry: MandatoryAuditEventInput): MandatoryAuditEventInput {
    if (!entry.action || typeof entry.action !== "string" || !entry.action.trim()) {
      throw new ReportingSecurityError("Audit log action is required");
    }

    const action = entry.action.trim().toUpperCase();

    // If action is categorized as security-sensitive, enforce non-empty mandatory audit metadata
    if (MANDATORY_SECURITY_ACTIONS.has(action)) {
      if (!entry.organizationId || typeof entry.organizationId !== "string" || !entry.organizationId.trim()) {
        throw new ReportingSecurityError(
          `Security-sensitive action '${action}' cannot omit required 'organizationId' audit metadata`
        );
      }

      if (!entry.userId || typeof entry.userId !== "string" || !entry.userId.trim()) {
        throw new ReportingSecurityError(
          `Security-sensitive action '${action}' cannot omit required 'userId' actor audit metadata`
        );
      }

      if (!entry.resource || typeof entry.resource !== "string" || !entry.resource.trim()) {
        throw new ReportingSecurityError(
          `Security-sensitive action '${action}' cannot omit required 'resource' audit metadata`
        );
      }

      if (!entry.ipAddress || typeof entry.ipAddress !== "string" || !entry.ipAddress.trim()) {
        throw new ReportingSecurityError(
          `Security-sensitive action '${action}' cannot omit required 'ipAddress' audit metadata`
        );
      }
    }

    return {
      ...entry,
      action,
      organizationId: entry.organizationId.trim(),
      userId: entry.userId.trim(),
      resource: entry.resource.trim(),
      ipAddress: entry.ipAddress?.trim() || "127.0.0.1",
      timestamp: entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp || Date.now()),
    };
  }
}

