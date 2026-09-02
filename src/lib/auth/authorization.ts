import { auth, currentUser } from "./server";
import { db } from "@/server/db";
import { memberships, organizations } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

export class AuthorizationError extends Error {
  constructor(message = "Unauthorized: Access denied or resource not found") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export type OrgRole = "owner" | "admin" | "manager" | "staff";

export interface AuthorizedContext {
  userId: string;
  organizationId: string;
  role: OrgRole;
  membership: {
    id: string;
    organizationId: string;
    userId: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    [key: string]: any;
  };
}

/**
 * Robust, server-authoritative helper to establish the security boundary:
 * 1. Resolves the authenticated user.
 * 2. Resolves the active organization from server session/cookie context.
 * 3. Verifies that the user has an active, valid membership in that organization.
 * 4. Optionally checks if the user's role satisfies required privileges.
 * 5. Returns full authorized context.
 * 
 * Never blindly trusts memberships[0] or unvalidated client-provided IDs.
 */
export async function requireOrganizationAccess(
  allowedRoles?: OrgRole[]
): Promise<AuthorizedContext> {
  const { userId, orgId } = await auth();

  if (!userId) {
    throw new AuthorizationError("Authentication required. Please log in.");
  }

  if (!orgId) {
    throw new AuthorizationError("No active organization associated with this session.");
  }

  // Authoritatively verify membership in DB for the active organization
  const [membership] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.organizationId, orgId)
      )
    )
    .limit(1);

  if (!membership) {
    throw new AuthorizationError("Access denied: You do not have an active membership in this organization.");
  }

  const role = membership.role as OrgRole;

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    throw new AuthorizationError("Forbidden: Insufficient organization privileges.");
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (!org) {
    throw new AuthorizationError("Organization not found or inactive.");
  }

  return {
    userId,
    organizationId: orgId,
    role,
    membership,
    organization: org,
  };
}

/**
 * Enforces Administrator or Owner level permissions in the active organization.
 */
export async function requireAdminAccess(): Promise<AuthorizedContext> {
  return requireOrganizationAccess(["owner", "admin"]);
}

/**
 * Enforces Manager, Admin, or Owner level permissions in the active organization.
 */
export async function requireManagerAccess(): Promise<AuthorizedContext> {
  return requireOrganizationAccess(["owner", "admin", "manager"]);
}

/**
 * Verifies that a specific database resource belongs to the authorized organization.
 * Throws a safe AuthorizationError (not revealing existence in foreign tenants).
 */
export async function assertResourceOwnership<T extends { id: string; organizationId: string }>(
  table: any,
  resourceId: string,
  organizationId: string,
  resourceLabel = "Resource"
): Promise<T> {
  if (!resourceId || !organizationId) {
    throw new AuthorizationError(`${resourceLabel} not found or access denied.`);
  }

  const [record] = await db
    .select()
    .from(table)
    .where(and(eq(table.id, resourceId), eq(table.organizationId, organizationId)))
    .limit(1);

  if (!record) {
    throw new AuthorizationError(`${resourceLabel} not found or access denied.`);
  }

  return record as T;
}
