/**
 * Server-Authoritative Route Guard
 * 
 * Provides a single, unified entry point for route protection across Next.js layouts,
 * server actions, and middleware transitions.
 * Eliminates conflicting redirects.
 */

import { auth } from "@/lib/auth/server";
import { RoutingContextBuilder } from "./context-builder";
import { RouteDecisionEngine } from "./decision-engine";
import { RouteDecision } from "./types";
import { redirect } from "next/navigation";

export interface RouteGuardOptions {
  requestedPath: string;
  activeOrgId?: string | null;
  redirectCount?: number;
  historyChain?: string[];
  autoRedirect?: boolean;
}

export async function evaluateRouteGuard(options: RouteGuardOptions): Promise<RouteDecision> {
  const { userId, orgId } = await auth();
  const effectiveOrgId = options.activeOrgId || orgId;

  const context = await RoutingContextBuilder.build({
    userId,
    activeOrgId: effectiveOrgId,
    requestedPath: options.requestedPath,
    redirectCount: options.redirectCount,
    historyChain: options.historyChain,
  });

  const decision = RouteDecisionEngine.resolve(context);

  if (options.autoRedirect && decision.replace && decision.destination !== options.requestedPath) {
    redirect(decision.destination);
  }

  return decision;
}
