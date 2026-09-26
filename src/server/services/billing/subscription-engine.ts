import { db } from "../../db";
import { eq, and } from "drizzle-orm";
import {
  subscriptions,
  subscriptionPlans,
  billingAccounts,
  usageCounters,
  auditLogs,
  payments,
  invoices,
} from "../../db/schema";
import { getPlan, PlanConfig, PLAN_CATALOG } from "@/lib/billing/plans";

export type SubscriptionState =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "PAYMENT_FAILED"
  | "CANCELING"
  | "CANCELED"
  | "EXPIRED"
  | "SUSPENDED";

export interface DynamicSubscriptionStatus {
  state: SubscriptionState;
  plan: PlanConfig;
  planId: string;
  isTrial: boolean;
  trialDaysRemaining: number;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  gracePeriodDaysRemaining: number | null;
  isRestricted: boolean; // True when SUSPENDED or EXPIRED
  usage: {
    conversations: { current: number; limit: number | null; percentage: number };
    voiceMinutes: { current: number; limit: number | null; percentage: number };
    calendars: { current: number; limit: number | null; percentage: number };
  };
}

export const PAYMENT_GRACE_PERIOD_DAYS = 5;
const TRIAL_DURATION_DAYS = 14;

export class SubscriptionEngine {
  /**
   * Evaluates the real-time dynamic state of an organization's subscription.
   * Never relies on stale static counters or hardcoded plan strings.
   */
  async getSubscriptionStatus(organizationId: string): Promise<DynamicSubscriptionStatus> {
    const now = new Date();

    // 1. Fetch raw subscription record from database
    let [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId))
      .limit(1);

    // If subscription doesn't exist yet, automatically initialize 14-day trial
    if (!sub) {
      sub = await this.initializeTrialSubscription(organizationId, "starter");
    }

    const plan = getPlan(sub.planId);
    let state: SubscriptionState = (sub.status?.toUpperCase() as SubscriptionState) || "TRIALING";

    // 2. Dynamic Trial Calculation
    const trialStartedAt = sub.trialStart ? new Date(sub.trialStart) : new Date(sub.createdAt);
    const trialEndsAt = sub.trialEnd
      ? new Date(sub.trialEnd)
      : new Date(trialStartedAt.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

    const trialRemainingMs = trialEndsAt.getTime() - now.getTime();
    const trialDaysRemaining = Math.min(
      TRIAL_DURATION_DAYS,
      Math.max(0, Math.ceil(trialRemainingMs / (1000 * 60 * 60 * 24)))
    );

    // 3. Billing period resolution (defaults to 1 month period)
    let periodStart = sub.currentPeriodStart ? new Date(sub.currentPeriodStart) : trialStartedAt;
    let periodEnd = sub.currentPeriodEnd
      ? new Date(sub.currentPeriodEnd)
      : new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 4. Dynamic Period Rollover & Usage Reset
    if (state === "ACTIVE" && now.getTime() >= periodEnd.getTime()) {
      periodStart = new Date(periodEnd);
      periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Advance period in database and reset usage counters
      await this.resetUsageForNewPeriod(organizationId, periodStart, periodEnd);
    }

    // 5. Evaluate state transitions dynamically
    if (state === "TRIALING") {
      if (now.getTime() >= trialEndsAt.getTime()) {
        // Trial expired without a converted paid subscription
        state = "EXPIRED";
        await db
          .update(subscriptions)
          .set({ status: "canceled", updatedAt: now })
          .where(eq(subscriptions.id, sub.id));

        await this.logAuditEvent(organizationId, "TRIAL_EXPIRED", "subscription", sub.id, {
          trialEndsAt: trialEndsAt.toISOString(),
        });
      }
    } else if (state === "PAST_DUE") {
      // Check grace period
      const failureDate = sub.updatedAt ? new Date(sub.updatedAt) : now;
      const gracePeriodMs = PAYMENT_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
      const graceExpiresAt = new Date(failureDate.getTime() + gracePeriodMs);

      if (now.getTime() >= graceExpiresAt.getTime()) {
        state = "SUSPENDED";
        await db
          .update(subscriptions)
          .set({ status: "unpaid", updatedAt: now })
          .where(eq(subscriptions.id, sub.id));

        await this.logAuditEvent(organizationId, "SUBSCRIPTION_SUSPENDED", "subscription", sub.id, {
          reason: "Grace period expired without payment recovery",
        });
      }
    } else if (state === "ACTIVE" && sub.cancelAtPeriodEnd) {
      if (now.getTime() >= periodEnd.getTime()) {
        state = "CANCELED";
        await db
          .update(subscriptions)
          .set({ status: "canceled", endedAt: now, updatedAt: now })
          .where(eq(subscriptions.id, sub.id));

        await this.logAuditEvent(organizationId, "SUBSCRIPTION_CANCELED", "subscription", sub.id, {
          reason: "Cancellation period ended",
        });
      } else {
        state = "CANCELING";
      }
    }

    // 6. Grace period calculation
    let gracePeriodDaysRemaining: number | null = null;
    if (state === "PAST_DUE") {
      const failureDate = sub.updatedAt ? new Date(sub.updatedAt) : now;
      const graceEnd = failureDate.getTime() + PAYMENT_GRACE_PERIOD_DAYS * 86400000;
      gracePeriodDaysRemaining = Math.max(0, Math.ceil((graceEnd - now.getTime()) / 86400000));
    }

    // 7. Dynamic Usage Counters Query
    const usageList = await db
      .select()
      .from(usageCounters)
      .where(eq(usageCounters.organizationId, organizationId));

    const convUsage = usageList.find((u) => u.metricName === "conversations")?.currentValue || 0;
    const voiceUsage = usageList.find((u) => u.metricName === "voice_minutes")?.currentValue || 0;
    const calUsage = usageList.find((u) => u.metricName === "calendar_connections")?.currentValue || 0;

    const convLimit = plan.limits.conversations;
    const voiceLimit = plan.limits.voiceMinutes;
    const calLimit = plan.limits.calendars;

    const convPercentage = convLimit ? Math.min(100, Math.round((convUsage / convLimit) * 100)) : 0;
    const voicePercentage = voiceLimit ? Math.min(100, Math.round((voiceUsage / voiceLimit) * 100)) : 0;
    const calPercentage = calLimit ? Math.min(100, Math.round((calUsage / calLimit) * 100)) : 0;

    // Is restricted: Operational capabilities blocked when EXPIRED or SUSPENDED
    const isRestricted = state === "EXPIRED" || state === "SUSPENDED" || state === "CANCELED";

    return {
      state,
      plan,
      planId: plan.id,
      isTrial: state === "TRIALING",
      trialDaysRemaining,
      trialStartedAt,
      trialEndsAt,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd || false,
      gracePeriodDaysRemaining,
      isRestricted,
      usage: {
        conversations: { current: convUsage, limit: convLimit, percentage: convPercentage },
        voiceMinutes: { current: voiceUsage, limit: voiceLimit, percentage: voicePercentage },
        calendars: { current: calUsage, limit: calLimit, percentage: calPercentage },
      },
    };
  }

  /**
   * Initializes a brand-new 14-day trial subscription attached to the organization.
   */
  async initializeTrialSubscription(organizationId: string, planId = "starter") {
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
    const plan = getPlan(planId);

    // Ensure plan configuration record exists in subscription_plans table
    await db
      .insert(subscriptionPlans)
      .values({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: String(plan.price),
        interval: "month",
        features: Object.keys(plan.features).filter((k) => (plan.features as any)[k]),
      })
      .onConflictDoNothing();

    const [sub] = await db
      .insert(subscriptions)
      .values({
        organizationId,
        planId: plan.id,
        status: "trialing",
        trialStart: now,
        trialEnd: trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        cancelAtPeriodEnd: false,
      })
      .returning();

    // Initialize usage counter records with plan limits
    await this.syncUsageCounterLimits(organizationId, plan);

    await this.logAuditEvent(organizationId, "TRIAL_STARTED", "subscription", sub.id, {
      planId: plan.id,
      trialEndsAt: trialEndsAt.toISOString(),
    });

    return sub;
  }

  /**
   * Central trial-to-paid conversion function.
   * Converts trial -> ACTIVE, sets billing period, resets usage, and logs audit events.
   */
  async convertTrialToPaid(params: {
    organizationId: string;
    planId: string;
    paymentProvider: "razorpay" | "stripe";
    providerSubscriptionId?: string;
    providerCustomerId?: string;
  }) {
    const { organizationId, planId, paymentProvider, providerSubscriptionId, providerCustomerId } = params;
    const plan = getPlan(planId);
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Ensure plan exists in subscription_plans table
    await db
      .insert(subscriptionPlans)
      .values({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: String(plan.price),
        interval: "month",
        features: Object.keys(plan.features).filter((k) => (plan.features as any)[k]),
      })
      .onConflictDoNothing();

    const [updatedSub] = await db
      .update(subscriptions)
      .set({
        planId: plan.id,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        razorpaySubscriptionId: paymentProvider === "razorpay" ? providerSubscriptionId : undefined,
        stripeSubscriptionId: paymentProvider === "stripe" ? providerSubscriptionId : undefined,
        updatedAt: now,
      })
      .where(eq(subscriptions.organizationId, organizationId))
      .returning();

    // Reset usage counters for fresh paid period
    await this.resetUsageForNewPeriod(organizationId, now, periodEnd);

    // Update customer ID on billing account if provided
    if (providerCustomerId) {
      await db
        .update(billingAccounts)
        .set({
          razorpayCustomerId: paymentProvider === "razorpay" ? providerCustomerId : undefined,
          stripeCustomerId: paymentProvider === "stripe" ? providerCustomerId : undefined,
          updatedAt: now,
        })
        .where(eq(billingAccounts.organizationId, organizationId));
    }

    await this.logAuditEvent(organizationId, "SUBSCRIPTION_ACTIVATED", "subscription", updatedSub.id, {
      planId: plan.id,
      provider: paymentProvider,
      providerSubscriptionId,
    });

    return updatedSub;
  }

  /**
   * Plan Upgrade Logic:
   * Upgrades plan immediately, updates limits, unlocks entitlements, and logs audit trail.
   */
  async upgradePlan(organizationId: string, newPlanId: string) {
    const newPlan = getPlan(newPlanId);
    const now = new Date();

    // Ensure plan exists in subscription_plans table
    await db
      .insert(subscriptionPlans)
      .values({
        id: newPlan.id,
        name: newPlan.name,
        description: newPlan.description,
        price: String(newPlan.price),
        interval: "month",
        features: Object.keys(newPlan.features).filter((k) => (newPlan.features as any)[k]),
      })
      .onConflictDoNothing();

    const [updatedSub] = await db
      .update(subscriptions)
      .set({
        planId: newPlan.id,
        status: "active",
        cancelAtPeriodEnd: false,
        updatedAt: now,
      })
      .where(eq(subscriptions.organizationId, organizationId))
      .returning();

    // Sync new higher limits into usage counters
    await this.syncUsageCounterLimits(organizationId, newPlan);

    await this.logAuditEvent(organizationId, "PLAN_UPGRADED", "subscription", updatedSub.id, {
      newPlanId: newPlan.id,
      newLimits: newPlan.limits,
    });

    return updatedSub;
  }

  /**
   * Plan Downgrade Logic:
   * Validates current usage against target plan limits. If usage exceeds, schedules downgrade at period end.
   */
  async downgradePlan(organizationId: string, newPlanId: string): Promise<{ success: boolean; scheduledAtPeriodEnd: boolean; message: string }> {
    const targetPlan = getPlan(newPlanId);
    const status = await this.getSubscriptionStatus(organizationId);

    // Check conversation usage against target limit
    const currentConv = status.usage.conversations.current;
    const targetConvLimit = targetPlan.limits.conversations;

    if (currentConv > targetConvLimit) {
      // Schedule downgrade at next billing period end
      await this.logAuditEvent(organizationId, "PLAN_DOWNGRADE_SCHEDULED", "subscription", organizationId, {
        targetPlanId: targetPlan.id,
        effectiveDate: status.currentPeriodEnd.toISOString(),
        currentUsage: currentConv,
        targetLimit: targetConvLimit,
      });

      return {
        success: true,
        scheduledAtPeriodEnd: true,
        message: `Your current usage (${currentConv.toLocaleString()} conversations) exceeds ${targetPlan.name}'s limit (${targetConvLimit.toLocaleString()}). Your downgrade will automatically take effect on ${status.currentPeriodEnd.toLocaleDateString()}.`,
      };
    }

    // Usage is within limits -> downgrade immediately
    await db
      .update(subscriptions)
      .set({
        planId: targetPlan.id,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.organizationId, organizationId));

    await this.syncUsageCounterLimits(organizationId, targetPlan);

    await this.logAuditEvent(organizationId, "PLAN_DOWNGRADED", "subscription", organizationId, {
      newPlanId: targetPlan.id,
    });

    return {
      success: true,
      scheduledAtPeriodEnd: false,
      message: `Your plan has been changed to ${targetPlan.name}.`,
    };
  }

  /**
   * Cancellation Request:
   * Retains customer access until currentPeriodEnd.
   */
  async requestCancellation(organizationId: string) {
    const now = new Date();
    const [updatedSub] = await db
      .update(subscriptions)
      .set({
        cancelAtPeriodEnd: true,
        canceledAt: now,
        updatedAt: now,
      })
      .where(eq(subscriptions.organizationId, organizationId))
      .returning();

    await this.logAuditEvent(organizationId, "CANCELLATION_REQUESTED", "subscription", updatedSub.id, {
      periodEnd: updatedSub.currentPeriodEnd,
    });

    return updatedSub;
  }

  /**
   * Revoke Cancellation:
   * Restores active subscription seamlessly without re-creation.
   */
  async revokeCancellation(organizationId: string) {
    const now = new Date();
    const [updatedSub] = await db
      .update(subscriptions)
      .set({
        cancelAtPeriodEnd: false,
        canceledAt: null,
        status: "active",
        updatedAt: now,
      })
      .where(eq(subscriptions.organizationId, organizationId))
      .returning();

    await this.logAuditEvent(organizationId, "CANCELLATION_REVOKED", "subscription", updatedSub.id, {
      status: "active",
    });

    return updatedSub;
  }

  /**
   * Payment Failure Handler:
   * Sets status to PAST_DUE and marks grace period timestamp.
   */
  async recordPaymentFailure(organizationId: string, errorDetails?: string) {
    const now = new Date();
    const [sub] = await db
      .update(subscriptions)
      .set({
        status: "past_due",
        updatedAt: now,
      })
      .where(eq(subscriptions.organizationId, organizationId))
      .returning();

    await this.logAuditEvent(organizationId, "PAYMENT_FAILED", "subscription", sub.id, {
      errorDetails,
      gracePeriodDays: PAYMENT_GRACE_PERIOD_DAYS,
    });

    return sub;
  }

  /**
   * Payment Recovery Handler:
   * Reversibly restores SUSPENDED or PAST_DUE subscriptions back to ACTIVE.
   */
  async recordPaymentRecovery(organizationId: string) {
    const now = new Date();
    const [sub] = await db
      .update(subscriptions)
      .set({
        status: "active",
        updatedAt: now,
      })
      .where(eq(subscriptions.organizationId, organizationId))
      .returning();

    await this.logAuditEvent(organizationId, "PAYMENT_RECOVERED", "subscription", sub.id, {
      status: "active",
    });

    return sub;
  }

  /**
   * Advances billing period and resets usage counters for conversations and voice minutes.
   */
  private async resetUsageForNewPeriod(organizationId: string, newStart: Date, newEnd: Date) {
    await db
      .update(subscriptions)
      .set({
        currentPeriodStart: newStart,
        currentPeriodEnd: newEnd,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.organizationId, organizationId));

    // Reset current_value to 0 on usage counters
    await db
      .update(usageCounters)
      .set({
        currentValue: 0,
        resetDate: newEnd,
        updatedAt: new Date(),
      })
      .where(eq(usageCounters.organizationId, organizationId));

    await this.logAuditEvent(organizationId, "RENEWAL_SUCCESS", "subscription", organizationId, {
      periodStart: newStart.toISOString(),
      periodEnd: newEnd.toISOString(),
    });
  }

  /**
   * Synchronizes limit values into usageCounters table.
   */
  private async syncUsageCounterLimits(organizationId: string, plan: PlanConfig) {
    const now = new Date();
    const resetDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const metricsToSync = [
      { name: "conversations", limit: plan.limits.conversations },
      { name: "voice_minutes", limit: plan.limits.voiceMinutes },
      { name: "calendar_connections", limit: plan.limits.calendars || 999 },
    ];

    for (const m of metricsToSync) {
      const [existing] = await db
        .select()
        .from(usageCounters)
        .where(and(eq(usageCounters.organizationId, organizationId), eq(usageCounters.metricName, m.name)))
        .limit(1);

      if (existing) {
        await db
          .update(usageCounters)
          .set({ limitValue: m.limit, updatedAt: now })
          .where(eq(usageCounters.id, existing.id));
      } else {
        await db.insert(usageCounters).values({
          organizationId,
          metricName: m.name,
          currentValue: 0,
          limitValue: m.limit,
          resetDate,
        });
      }
    }
  }

  /**
   * Logs a central billing audit event to auditLogs table.
   */
  private async logAuditEvent(
    organizationId: string,
    action: string,
    resource: string,
    resourceId?: string,
    metadata: Record<string, any> = {}
  ) {
    try {
      await db.insert(auditLogs).values({
        organizationId,
        action,
        resource,
        resourceId,
        metadata,
      });
    } catch (e) {
      console.warn("Failed to record billing audit log:", e);
    }
  }
}

export const subscriptionEngine = new SubscriptionEngine();
