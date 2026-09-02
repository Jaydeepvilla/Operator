import { db } from "@/server/db";
import { users, organizations, memberships } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Validates that a requested redirect path is a safe, internal relative URL.
 * Prevents open-redirect phishing attacks.
 */
export function validateIntendedDestination(url?: string | null): string | null {
  if (!url || typeof url !== "string") {
    return null;
  }

  const trimmed = url.trim();

  // Must start with '/' and must not start with '//' or contain protocol schemes
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("://")) {
    return null;
  }

  // Reject sensitive internal API routes or auth pages as redirect destinations
  if (
    trimmed.startsWith("/api/") ||
    trimmed.startsWith("/sign-in") ||
    trimmed.startsWith("/sign-up") ||
    trimmed.startsWith("/forgot-password") ||
    trimmed.startsWith("/reset-password") ||
    trimmed.startsWith("/login-success")
  ) {
    return null;
  }

  return trimmed;
}

export interface RouteResolution {
  destination: string;
  onboardingStatus: "not_started" | "in_progress" | "completed" | "skipped";
  onboardingStep: string;
  hasVerifiedOrg: boolean;
  activeOrgId: string | null;
  userStatus: string;
}

/**
 * Single Authoritative Routing Engine:
 * Inspects backend state for the authenticated user and determines their exact target destination.
 */
export async function resolveUserDestination(
  userId: string,
  intendedRedirect?: string | null,
  activeOrgId?: string | null
): Promise<RouteResolution> {
  // 1. Fetch User Record
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return {
      destination: "/sign-in",
      onboardingStatus: "not_started",
      onboardingStep: "url",
      hasVerifiedOrg: false,
      activeOrgId: null,
      userStatus: "unknown",
    };
  }

  if (user.status === "suspended") {
    return {
      destination: "/account-locked",
      onboardingStatus: "not_started",
      onboardingStep: "url",
      hasVerifiedOrg: false,
      activeOrgId: null,
      userStatus: "suspended",
    };
  }

  // 2. Fetch User Workspaces / Memberships
  let selectedOrg: typeof organizations.$inferSelect | null = null;

  if (activeOrgId) {
    const [matchingMembership] = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, userId),
          eq(memberships.organizationId, activeOrgId)
        )
      )
      .limit(1);

    if (matchingMembership) {
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, activeOrgId))
        .limit(1);
      selectedOrg = org || null;
    }
  }

  // Fallback to primary membership
  if (!selectedOrg) {
    const [primaryMembership] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, userId))
      .limit(1);

    if (primaryMembership) {
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, primaryMembership.organizationId))
        .limit(1);
      selectedOrg = org || null;
    }
  }

  // 3. Evaluate Workspace & Onboarding State
  if (!selectedOrg) {
    return {
      destination: "/onboarding",
      onboardingStatus: "not_started",
      onboardingStep: "url",
      hasVerifiedOrg: false,
      activeOrgId: null,
      userStatus: user.status,
    };
  }

  const onboardingStatus = (selectedOrg.onboardingStatus as any) || "not_started";
  const onboardingStep = selectedOrg.onboardingStep || "url";
  const hasVerifiedOrg = selectedOrg.verificationStatus === "verified" || onboardingStatus === "completed";

  // If onboarding is NOT completed, direct them back to their exact unfinished step
  if (onboardingStatus !== "completed" && !hasVerifiedOrg) {
    const stepParam = onboardingStep && onboardingStep !== "url" ? `?step=${onboardingStep}` : "";
    return {
      destination: `/onboarding${stepParam}`,
      onboardingStatus,
      onboardingStep,
      hasVerifiedOrg: false,
      activeOrgId: selectedOrg.id,
      userStatus: user.status,
    };
  }

  // 4. Onboarding is Completed -> Route to Safe Intended Destination or /dashboard
  const safeDestination = validateIntendedDestination(intendedRedirect) || "/dashboard";

  return {
    destination: safeDestination,
    onboardingStatus: "completed",
    onboardingStep: "completed",
    hasVerifiedOrg: true,
    activeOrgId: selectedOrg.id,
    userStatus: user.status,
  };
}
