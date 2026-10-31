import { RoutingContextBuilder } from "@/server/services/routing/context-builder";
import { RouteDecisionEngine } from "@/server/services/routing/decision-engine";
import { RouteDecision } from "@/server/services/routing/types";
import { validateIntendedDestination } from "./destination-validator";

export { validateIntendedDestination };

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
