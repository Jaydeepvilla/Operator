/**
 * Smart Route Decision Engine
 * 
 * Centralized, deterministic routing resolution based on:
 * 1. AUTHENTICATION
 * 2. ACCOUNT/BUSINESS EXISTENCE
 * 3. SECURITY/AUTHORIZATION
 * 4. REQUIRED ACCOUNT ACTION
 * 5. ONBOARDING
 * 6. SUBSCRIPTION/BILLING BLOCKER
 * 7. INTERRUPTED WORKFLOW
 * 8. EXPLICIT USER DESTINATION
 * 9. CONTINUE PREVIOUS WORKFLOW
 * 10. ACTIVITY-BASED RECOMMENDATION
 * 11. DEFAULT DASHBOARD
 */

import {
  RoutingContext,
  RouteDecision,
  ROUTE_DECISION_PRIORITY,
  RouteDecisionPriorityName,
  RouteDecisionReason,
} from "./types";
import { isValidAppRoute } from "@/lib/constants/routes";

const PUBLIC_ROUTES = new Set([
  "/",
  "/pricing",
  "/features",
  "/about",
  "/contact",
  "/demo",
  "/integrations",
  "/security",
  "/docs",
  "/changelog",
  "/privacy",
  "/terms",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/email-sent",
  "/email-verified",
  "/session-expired",
  "/account-locked",
]);

function isPublicPath(path: string): boolean {
  const cleanPath = path.split("?")[0];
  if (PUBLIC_ROUTES.has(cleanPath)) return true;
  if (cleanPath.startsWith("/api/") || cleanPath.startsWith("/_next") || cleanPath.startsWith("/widget-frame")) {
    return true;
  }
  return false;
}

function normalizePath(path: string): string {
  if (!path) return "/";
  const trimmed = path.trim();
  return trimmed.endsWith("/") && trimmed.length > 1 ? trimmed.slice(0, -1) : trimmed;
}

export class RouteDecisionEngine {
  /**
   * Evaluates server-authoritative routing context and produces a single deterministic route decision.
   */
  static resolve(context: RoutingContext): RouteDecision {
    const requested = normalizePath(context.requestedPath || "/dashboard");
    const requestedBase = requested.split("?")[0];
    const redirectCount = context.redirectCount || 0;
    const historyChain = context.historyChain || [];

    // ── 0. REDIRECT LOOP DETECTION & BREAKING ────────────────────────────────
    if (redirectCount >= 5 || (historyChain.length > 0 && historyChain.filter((p) => p === requested).length >= 2)) {
      console.warn(`[ROUTE_LOOP_PREVENTED] Loop detected for path: ${requested}. Fallback to safe destination.`);
      const safeFallback = context.userId ? (context.onboarding.isCompleted ? "/dashboard" : "/onboarding") : "/sign-in";
      return {
        destination: safeFallback,
        reason: "REDIRECT_LOOP_PREVENTED",
        priority: "SECURITY_AUTHORIZATION",
        priorityLevel: ROUTE_DECISION_PRIORITY.SECURITY_AUTHORIZATION,
        replace: true,
        loopDetected: true,
      };
    }

    let decision: RouteDecision;

    // ── 1. AUTHENTICATION ───────────────────────────────────────────────────
    if (!context.userId || context.accountStatus === "unauthenticated") {
      if (isPublicPath(requestedBase)) {
        decision = {
          destination: requested,
          reason: "ALREADY_AT_DESTINATION",
          priority: "AUTHENTICATION",
          priorityLevel: ROUTE_DECISION_PRIORITY.AUTHENTICATION,
          replace: false,
        };
      } else {
        const redirectParam = requested !== "/dashboard" && requested !== "/" ? `?redirect=${encodeURIComponent(requested)}` : "";
        decision = {
          destination: `/sign-in${redirectParam}`,
          reason: "UNAUTHENTICATED",
          priority: "AUTHENTICATION",
          priorityLevel: ROUTE_DECISION_PRIORITY.AUTHENTICATION,
          replace: true,
        };
      }
      return RouteDecisionEngine.finalize(context, decision);
    }

    // ── 2. ACCOUNT/BUSINESS EXISTENCE ───────────────────────────────────────
    if (!context.businessId || !context.business) {
      if (requestedBase === "/onboarding") {
        decision = {
          destination: requested,
          reason: "ALREADY_AT_DESTINATION",
          priority: "BUSINESS_EXISTENCE",
          priorityLevel: ROUTE_DECISION_PRIORITY.BUSINESS_EXISTENCE,
          replace: false,
        };
      } else {
        decision = {
          destination: "/onboarding",
          reason: "BUSINESS_NOT_CREATED",
          priority: "BUSINESS_EXISTENCE",
          priorityLevel: ROUTE_DECISION_PRIORITY.BUSINESS_EXISTENCE,
          replace: true,
        };
      }
      return RouteDecisionEngine.finalize(context, decision);
    }

    // ── 3. SECURITY / AUTHORIZATION ─────────────────────────────────────────
    if (context.accountStatus === "suspended" || context.user?.status === "suspended") {
      decision = {
        destination: "/account-locked",
        reason: "ACCOUNT_SUSPENDED",
        priority: "SECURITY_AUTHORIZATION",
        priorityLevel: ROUTE_DECISION_PRIORITY.SECURITY_AUTHORIZATION,
        replace: true,
      };
      return RouteDecisionEngine.finalize(context, decision);
    }

    // Role-based route guard: /agency routes require agency role or plan
    if (requestedBase.startsWith("/agency")) {
      const isAgencyAllowed =
        context.user?.role === "owner" ||
        context.permissions.includes("agency:access") ||
        context.subscription.planId === "agency" ||
        context.subscription.planId === "enterprise";

      if (!isAgencyAllowed) {
        decision = {
          destination: "/dashboard",
          reason: "UNAUTHORIZED_ROLE",
          priority: "SECURITY_AUTHORIZATION",
          priorityLevel: ROUTE_DECISION_PRIORITY.SECURITY_AUTHORIZATION,
          replace: true,
        };
        return RouteDecisionEngine.finalize(context, decision);
      }
    }

    // Role-based route guard: /admin routes require owner/admin privileges
    if (requestedBase.startsWith("/admin")) {
      const isAdminAllowed =
        context.user?.role === "owner" ||
        context.user?.role === "admin" ||
        context.permissions.includes("admin:access");

      if (!isAdminAllowed) {
        decision = {
          destination: "/dashboard",
          reason: "PERMISSION_DENIED",
          priority: "SECURITY_AUTHORIZATION",
          priorityLevel: ROUTE_DECISION_PRIORITY.SECURITY_AUTHORIZATION,
          replace: true,
        };
        return RouteDecisionEngine.finalize(context, decision);
      }
    }

    // ── 4. REQUIRED ACCOUNT ACTION ──────────────────────────────────────────
    if (context.accountStatus === "pending_verification") {
      decision = {
        destination: "/verify-email",
        reason: "REQUIRED_VERIFICATION",
        priority: "REQUIRED_ACCOUNT_ACTION",
        priorityLevel: ROUTE_DECISION_PRIORITY.REQUIRED_ACCOUNT_ACTION,
        replace: true,
      };
      return RouteDecisionEngine.finalize(context, decision);
    }

    // ── 5. ONBOARDING ───────────────────────────────────────────────────────
    if (!context.onboarding.isCompleted && context.onboarding.status !== "completed") {
      if (requestedBase === "/onboarding") {
        decision = {
          destination: requested,
          reason: "ALREADY_AT_DESTINATION",
          priority: "ONBOARDING",
          priorityLevel: ROUTE_DECISION_PRIORITY.ONBOARDING,
          replace: false,
        };
      } else {
        const step = context.onboarding.currentStep;
        const stepParam = step && step !== "url" && step !== "not_started" ? `?step=${step}` : "";
        decision = {
          destination: `/onboarding${stepParam}`,
          reason: "ONBOARDING_INCOMPLETE",
          priority: "ONBOARDING",
          priorityLevel: ROUTE_DECISION_PRIORITY.ONBOARDING,
          replace: true,
        };
      }
      return RouteDecisionEngine.finalize(context, decision);
    }

    // If onboarding IS completed, prevent trapping user on /onboarding
    if (context.onboarding.isCompleted && requestedBase === "/onboarding") {
      decision = {
        destination: "/dashboard",
        reason: "ONBOARDING_ALREADY_COMPLETED",
        priority: "ONBOARDING",
        priorityLevel: ROUTE_DECISION_PRIORITY.ONBOARDING,
        replace: true,
      };
      return RouteDecisionEngine.finalize(context, decision);
    }

    // ── 6. SUBSCRIPTION / BILLING BLOCKER ───────────────────────────────────
    const subStatus = context.subscription.status;
    const isSuspendedOrExpired = subStatus === "SUSPENDED" || subStatus === "EXPIRED";
    const graceRemaining = context.subscription.gracePeriodDaysRemaining;
    const isGraceExpired =
      (subStatus === "PAYMENT_FAILED" || subStatus === "PAST_DUE") &&
      graceRemaining !== null &&
      graceRemaining !== undefined &&
      graceRemaining <= 0;

    if (isSuspendedOrExpired || isGraceExpired) {
      const allowedBillingRoutes = ["/billing", "/billing/reactivate", "/settings/account"];
      if (allowedBillingRoutes.some((r) => requestedBase.startsWith(r))) {
        decision = {
          destination: requested,
          reason: "ALREADY_AT_DESTINATION",
          priority: "BILLING_BLOCKER",
          priorityLevel: ROUTE_DECISION_PRIORITY.BILLING_BLOCKER,
          replace: false,
        };
      } else {
        const target = isSuspendedOrExpired ? "/billing/reactivate" : "/billing?failed=true";
        decision = {
          destination: target,
          reason: isSuspendedOrExpired ? "SUBSCRIPTION_SUSPENDED" : "PAYMENT_FAILED_GRACE_EXPIRED",
          priority: "BILLING_BLOCKER",
          priorityLevel: ROUTE_DECISION_PRIORITY.BILLING_BLOCKER,
          replace: true,
        };
      }
      return RouteDecisionEngine.finalize(context, decision);
    }

    // ── 7. INTERRUPTED WORKFLOW ─────────────────────────────────────────────
    // Interrupted workflows are triggered only on landing/entry routes (e.g. / or /dashboard or login transitions)
    const isEntryRoute = requestedBase === "/" || requestedBase === "/dashboard" || requestedBase === "/login-success";

    if (isEntryRoute && context.activity.interruptedWorkflow) {
      const workflow = context.activity.interruptedWorkflow;
      decision = {
        destination: workflow.targetRoute,
        reason: workflow.reason,
        priority: "INTERRUPTED_WORKFLOW",
        priorityLevel: ROUTE_DECISION_PRIORITY.INTERRUPTED_WORKFLOW,
        replace: false,
        state: { actionableMessage: workflow.actionableMessage },
      };
      return RouteDecisionEngine.finalize(context, decision);
    }

    // ── 8. EXPLICIT USER DESTINATION ────────────────────────────────────────
    // If the user explicitly requested a valid internal route (other than generic landing)
    if (!isEntryRoute && isValidAppRoute(requestedBase)) {
      decision = {
        destination: requested,
        reason: "EXPLICIT_DESTINATION_ALLOWED",
        priority: "EXPLICIT_DESTINATION",
        priorityLevel: ROUTE_DECISION_PRIORITY.EXPLICIT_DESTINATION,
        replace: false,
      };
      return RouteDecisionEngine.finalize(context, decision);
    }

    // ── 9. CONTINUE PREVIOUS WORKFLOW ───────────────────────────────────────
    if (isEntryRoute && context.activity.lastRoute && isValidAppRoute(context.activity.lastRoute) && context.activity.lastRoute !== "/dashboard") {
      decision = {
        destination: context.activity.lastRoute,
        reason: "CONTINUE_LAST_ROUTE",
        priority: "CONTINUE_PREVIOUS_WORKFLOW",
        priorityLevel: ROUTE_DECISION_PRIORITY.CONTINUE_PREVIOUS_WORKFLOW,
        replace: false,
      };
      return RouteDecisionEngine.finalize(context, decision);
    }

    // ── 10. ACTIVITY-BASED RECOMMENDATION ───────────────────────────────────
    if (isEntryRoute && context.activity.lastMeaningfulAction === "WEBSITE_IMPORT_COMPLETED") {
      decision = {
        destination: "/kb",
        reason: "ACTIVITY_RECOMMENDATION",
        priority: "ACTIVITY_RECOMMENDATION",
        priorityLevel: ROUTE_DECISION_PRIORITY.ACTIVITY_RECOMMENDATION,
        replace: false,
      };
      return RouteDecisionEngine.finalize(context, decision);
    }

    // ── 11. DEFAULT DASHBOARD ───────────────────────────────────────────────
    decision = {
      destination: "/dashboard",
      reason: "DEFAULT_DASHBOARD",
      priority: "DEFAULT_DASHBOARD",
      priorityLevel: ROUTE_DECISION_PRIORITY.DEFAULT_DASHBOARD,
      replace: false,
    };
    return RouteDecisionEngine.finalize(context, decision);
  }

  /**
   * Finalizes the decision, normalizes redirects, detects identical current/destination paths,
   * and outputs observability logging.
   */
  private static finalize(context: RoutingContext, decision: RouteDecision): RouteDecision {
    const current = normalizePath(context.requestedPath || "/dashboard");
    const target = normalizePath(decision.destination);

    // If current path matches destination, eliminate redundant redirect
    if (current === target || current.split("?")[0] === target.split("?")[0]) {
      decision = {
        ...decision,
        destination: current,
        reason: "ALREADY_AT_DESTINATION",
        replace: false,
      };
    }

    // Routing Observability (Phase 17)
    if (current !== decision.destination) {
      console.log(
        `[ROUTE_DECISION] from: "${current}" to: "${decision.destination}" reason: ${decision.reason} priority: ${decision.priority} (org: ${context.businessId || "none"}, user: ${context.userId || "anon"})`
      );
    }

    return decision;
  }
}
