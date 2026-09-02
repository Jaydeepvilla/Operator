import { AuthorizedContext, OrgRole, AuthorizationError } from "./authorization";

export type AppPermission =
  | "calls:read"
  | "calls:manage"
  | "calls:delete"
  | "leads:read"
  | "leads:manage"
  | "leads:export"
  | "appointments:read"
  | "appointments:manage"
  | "services:read"
  | "services:manage"
  | "kb:read"
  | "kb:manage"
  | "billing:read"
  | "billing:manage"
  | "integrations:read"
  | "integrations:manage"
  | "settings:read"
  | "settings:manage"
  | "members:read"
  | "members:invite"
  | "members:manage"
  | "workspace:manage"
  | "workspace:delete";

const ROLE_PERMISSIONS: Record<OrgRole, AppPermission[]> = {
  owner: [
    "calls:read", "calls:manage", "calls:delete",
    "leads:read", "leads:manage", "leads:export",
    "appointments:read", "appointments:manage",
    "services:read", "services:manage",
    "kb:read", "kb:manage",
    "billing:read", "billing:manage",
    "integrations:read", "integrations:manage",
    "settings:read", "settings:manage",
    "members:read", "members:invite", "members:manage",
    "workspace:manage", "workspace:delete"
  ],
  admin: [
    "calls:read", "calls:manage", "calls:delete",
    "leads:read", "leads:manage", "leads:export",
    "appointments:read", "appointments:manage",
    "services:read", "services:manage",
    "kb:read", "kb:manage",
    "billing:read", "billing:manage",
    "integrations:read", "integrations:manage",
    "settings:read", "settings:manage",
    "members:read", "members:invite", "members:manage",
    "workspace:manage"
  ],
  manager: [
    "calls:read", "calls:manage",
    "leads:read", "leads:manage",
    "appointments:read", "appointments:manage",
    "services:read", "services:manage",
    "kb:read", "kb:manage",
    "billing:read",
    "integrations:read", "integrations:manage",
    "settings:read",
    "members:read"
  ],
  staff: [
    "calls:read", "calls:manage",
    "leads:read", "leads:manage",
    "appointments:read", "appointments:manage",
    "services:read",
    "kb:read",
    "settings:read"
  ],
};

/**
 * Checks if a specific role possesses the required permission.
 */
export function hasPermission(role: OrgRole, permission: AppPermission): boolean {
  const allowed = ROLE_PERMISSIONS[role];
  return allowed ? allowed.includes(permission) : false;
}

/**
 * Server-authoritative assertion: Throws AuthorizationError (403) if the context role lacks permission.
 */
export function assertPermission(context: AuthorizedContext, permission: AppPermission) {
  if (!hasPermission(context.role, permission)) {
    throw new AuthorizationError(
      `Forbidden: Role '${context.role}' does not possess required permission '${permission}'.`
    );
  }
}
