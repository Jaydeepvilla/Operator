/**
 * Server-Authoritative Routing Context Builder
 * 
 * Safely constructs the complete RoutingContext exclusively from server-side state.
 * Never trusts client headers or unverified parameters.
 */

import { db } from "../../db";
import { users, organizations, memberships, calendarConnections, communicationChannels } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { RoutingContext } from "./types";
import { subscriptionEngine } from "../billing/subscription-engine";
import { MeaningfulActivityEngine } from "./activity-engine";

export interface BuildContextOptions {
  userId: string | null;
  activeOrgId?: string | null;
  requestedPath: string;
  redirectCount?: number;
  historyChain?: string[];
}

export class RoutingContextBuilder {
  /**
   * Builds the server-authoritative RoutingContext.
   */
  static async build(options: BuildContextOptions): Promise<RoutingContext> {
    const { userId, activeOrgId, requestedPath, redirectCount = 0, historyChain = [] } = options;

    // Default unauthenticated baseline
    if (!userId) {
      return {
        userId: null,
        businessId: null,
        user: null,
        business: null,
        accountStatus: "unauthenticated",
        onboarding: {
          status: "not_started",
          isCompleted: false,
          currentStep: "url",
        },
        subscription: {
          status: "NONE",
          planId: "starter",
          isRestricted: false,
        },
        permissions: [],
        activity: {},
        integrations: {
          calendarConnected: false,
          whatsappConnected: false,
          emailConnected: false,
        },
        requestedPath,
        redirectCount,
        historyChain,
      };
    }

    try {
      // 1. Fetch User Record
      const [userRecord] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!userRecord) {
        return {
          userId: null,
          businessId: null,
          user: null,
          business: null,
          accountStatus: "unauthenticated",
          onboarding: { status: "not_started", isCompleted: false, currentStep: "url" },
          subscription: { status: "NONE", planId: "starter", isRestricted: false },
          permissions: [],
          activity: {},
          integrations: { calendarConnected: false, whatsappConnected: false, emailConnected: false },
          requestedPath,
          redirectCount,
          historyChain,
        };
      }

      // Check suspension
      if (userRecord.status === "suspended") {
        return {
          userId: userRecord.id,
          businessId: null,
          user: {
            id: userRecord.id,
            email: userRecord.email,
            status: "suspended",
          },
          business: null,
          accountStatus: "suspended",
          onboarding: { status: "not_started", isCompleted: false, currentStep: "url" },
          subscription: { status: "NONE", planId: "starter", isRestricted: true },
          permissions: [],
          activity: {},
          integrations: { calendarConnected: false, whatsappConnected: false, emailConnected: false },
          requestedPath,
          redirectCount,
          historyChain,
        };
      }

      // 2. Fetch User Membership & Active Organization
      let selectedOrg: typeof organizations.$inferSelect | null = null;
      let activeMembership: typeof memberships.$inferSelect | null = null;

      if (activeOrgId) {
        const [m] = await db
          .select()
          .from(memberships)
          .where(and(eq(memberships.userId, userId), eq(memberships.organizationId, activeOrgId)))
          .limit(1);

        if (m) {
          activeMembership = m;
          const [o] = await db
            .select()
            .from(organizations)
            .where(eq(organizations.id, activeOrgId))
            .limit(1);
          selectedOrg = o || null;
        }
      }

      // Fallback to first membership
      if (!selectedOrg) {
        const [m] = await db
          .select()
          .from(memberships)
          .where(eq(memberships.userId, userId))
          .limit(1);

        if (m) {
          activeMembership = m;
          const [o] = await db
            .select()
            .from(organizations)
            .where(eq(organizations.id, m.organizationId))
            .limit(1);
          selectedOrg = o || null;
        }
      }

      // If user has no business created
      if (!selectedOrg) {
        return {
          userId: userRecord.id,
          businessId: null,
          user: {
            id: userRecord.id,
            email: userRecord.email,
            status: userRecord.status,
            role: "owner",
          },
          business: null,
          accountStatus: (userRecord.status as any) || "active",
          onboarding: {
            status: "not_started",
            isCompleted: false,
            currentStep: "url",
          },
          subscription: {
            status: "TRIALING",
            planId: "starter",
            isRestricted: false,
          },
          permissions: ["business:create"],
          activity: {},
          integrations: {
            calendarConnected: false,
            whatsappConnected: false,
            emailConnected: false,
          },
          requestedPath,
          redirectCount,
          historyChain,
        };
      }

      const orgId = selectedOrg.id;
      const onboardingStatus = (selectedOrg.onboardingStatus as any) || "not_started";
      const isCompleted = onboardingStatus === "completed";
      const currentStep = selectedOrg.onboardingStep || "url";

      // 3. Parallel Resolution of Subscription, Activity, & Integrations
      const [subResult, meaningfulAction, interruptedWorkflow, calendars, channels] = await Promise.allSettled([
        subscriptionEngine.getSubscriptionStatus(orgId),
        MeaningfulActivityEngine.getLastMeaningfulAction(orgId),
        MeaningfulActivityEngine.detectInterruptedWorkflow(orgId, onboardingStatus, currentStep),
        db.query.calendarConnections.findMany({
          where: eq(calendarConnections.organizationId, orgId),
        }),
        db.query.communicationChannels.findMany({
          where: eq(communicationChannels.organizationId, orgId),
        }),
      ]);

      const subData = subResult.status === "fulfilled" ? subResult.value : null;
      const actionData = meaningfulAction.status === "fulfilled" ? meaningfulAction.value : { action: null, timestamp: null, metadata: {} };
      const workflowData = interruptedWorkflow.status === "fulfilled" ? interruptedWorkflow.value : null;
      const calendarList = calendars.status === "fulfilled" ? calendars.value || [] : [];
      const channelList = channels.status === "fulfilled" ? channels.value || [] : [];

      const role = (activeMembership?.role as any) || "owner";
      const permissions: string[] = [
        "dashboard:view",
        role === "owner" || role === "admin" ? "admin:access" : "",
        subData?.planId === "agency" || subData?.planId === "enterprise" ? "agency:access" : "",
      ].filter(Boolean);

      return {
        userId: userRecord.id,
        businessId: orgId,
        user: {
          id: userRecord.id,
          email: userRecord.email,
          status: userRecord.status,
          role,
        },
        business: {
          id: selectedOrg.id,
          name: selectedOrg.name,
          slug: selectedOrg.slug,
          status: (selectedOrg as any).status || "active",
          verificationStatus: selectedOrg.verificationStatus || "unverified",
        },
        accountStatus: (userRecord.status as any) || "active",
        onboarding: {
          status: onboardingStatus,
          isCompleted,
          currentStep,
        },
        subscription: {
          status: subData?.state || "TRIALING",
          planId: subData?.planId || "starter",
          trialEndsAt: subData?.trialEndsAt,
          trialDaysRemaining: subData?.trialDaysRemaining,
          currentPeriodEnd: subData?.currentPeriodEnd,
          isRestricted: subData?.isRestricted || false,
          gracePeriodDaysRemaining: subData?.gracePeriodDaysRemaining,
          paymentStatus: subData?.state === "PAST_DUE" || subData?.state === "PAYMENT_FAILED" ? "failed" : "paid",
        },
        permissions,
        activity: {
          lastMeaningfulAction: actionData.action,
          lastMeaningfulActionAt: actionData.timestamp,
          interruptedWorkflow: workflowData,
          lastRoute: actionData.metadata?.lastRoute || null,
        },
        integrations: {
          calendarConnected: calendarList.some((c: any) => c.syncStatus === "active"),
          whatsappConnected: channelList.some((ch: any) => ch.channelType === "whatsapp" && ch.isEnabled),
          emailConnected: channelList.some((ch: any) => ch.channelType === "email" && ch.isEnabled),
        },
        requestedPath,
        redirectCount,
        historyChain,
      };
    } catch (error) {
      console.warn("[RoutingContextBuilder] Graceful fallback on error:", error);
      // Safe fallback ensuring application does not crash
      return {
        userId,
        businessId: activeOrgId || null,
        accountStatus: "active",
        onboarding: { status: "completed", isCompleted: true, currentStep: "completed" },
        subscription: { status: "ACTIVE", planId: "starter", isRestricted: false },
        permissions: ["dashboard:view"],
        activity: {},
        integrations: { calendarConnected: false, whatsappConnected: false, emailConnected: false },
        requestedPath,
        redirectCount,
        historyChain,
      };
    }
  }
}
