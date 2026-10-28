import { db } from "@/server/db";
import { auditLogs } from "@/server/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { ReportingSecurityService } from "./reporting-security";

export class AuditService {
  async log(params: {
    organizationId?: string;
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    // SEARCH-10: Security-sensitive activity cannot be logged with missing required audit metadata
    if (params.organizationId && params.userId) {
      ReportingSecurityService.validateMandatoryAuditRecord({
        organizationId: params.organizationId,
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        ipAddress: params.ipAddress || "127.0.0.1",
        userAgent: params.userAgent,
        metadata: params.metadata,
      });
    }

    await db.insert(auditLogs).values({
      organizationId: params.organizationId,
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      metadata: params.metadata || {},
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * SEARCH-09: Prevent unauthorized users from changing audit records (Immutability guarantee)
   */
  async update(callerRole?: string): Promise<never> {
    ReportingSecurityService.assertAuditLogImmutability("update", callerRole);
    throw new Error("Unreachable");
  }

  /**
   * SEARCH-09: Prevent unauthorized users from deleting audit records (Immutability guarantee)
   */
  async delete(callerRole?: string): Promise<never> {
    ReportingSecurityService.assertAuditLogImmutability("delete", callerRole);
    throw new Error("Unreachable");
  }

  async getLogs(organizationId: string, limit = 50, offset = 0) {
    if (!organizationId) {
      throw new Error("Organization ID is required to query audit logs");
    }

    // SEARCH-06: Cap pagination to prevent resource exhaustion
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(0, offset);

    return await db.query.auditLogs.findMany({
      where: eq(auditLogs.organizationId, organizationId),
      orderBy: [desc(auditLogs.createdAt)],
      limit: safeLimit,
      offset: safeOffset,
      with: {
        user: true,
      },
    });
  }
}

export const auditService = new AuditService();
