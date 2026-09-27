import { RoutingContextBuilder } from "@/server/services/routing/context-builder";
import { RouteDecisionEngine } from "@/server/services/routing/decision-engine";
import { RouteDecision } from "@/server/services/routing/types";

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
  decision?: RouteDecision;
}

/**
 * Authoritative User Destination Resolver:
 * Integrates with the centralized Smart Route Decision Engine to determine
 * deterministic destination based on authentication, business existence,
 * onboarding, subscription blockers, and interrupted workflows.
 */
export async function resolveUserDestination(
  userId: string,
  intendedRedirect?: string | null,
  activeOrgId?: string | null
): Promise<RouteResolution> {
  const safeIntended = validateIntendedDestination(intendedRedirect);
  const requestedPath = safeIntended || "/dashboard";

  const context = await RoutingContextBuilder.build({
    userId,
    activeOrgId,
    requestedPath,
  });

  const decision = RouteDecisionEngine.resolve(context);

  return {
    destination: decision.destination,
    onboardingStatus: context.onboarding.status,
    onboardingStep: context.onboarding.currentStep,
    hasVerifiedOrg: !!context.business && context.onboarding.isCompleted,
    activeOrgId: context.businessId,
    userStatus: context.accountStatus,
    decision,
  };
}
