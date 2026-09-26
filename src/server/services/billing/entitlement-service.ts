import { db } from "../../db";
import { eq, and } from "drizzle-orm";
import {
  subscriptions,
  subscriptionPlans,
  usageCounters,
  usageRecords,
  services,
  businessSettings,
  knowledgeChunks,
  communicationChannels,
  staffMembers,
  organizations,
  calendarConnections,
} from "../../db/schema";
import {
  getPlan,
  getPlanFeature,
  getPlanLimit,
  PLAN_CATALOG,
  PlanConfig,
  PlanFeatures,
  PlanLimits,
  UsageLimitBehavior,
} from "@/lib/billing/plans";
import { subscriptionEngine, DynamicSubscriptionStatus } from "./subscription-engine";

export type FeatureKey =
  | keyof PlanFeatures
  | "voice_ai"
  | "sms_messaging"
  | "email_responses"
  | "custom_ai_training"
  | "social_messaging"
  | "calendar_sync"
  | "advanced_lead_qualification"
  | "white_label"
  | "multi_location"
  | "analytics_export"
  | "dedicated_onboarding"
  | "sla_guarantee";

export type MetricKey = keyof PlanLimits;

export class EntitlementError extends Error {
  readonly feature: string;
  readonly requiredPlan: string;
  readonly status: number;

  constructor(message: string, feature: string, requiredPlan = "professional") {
    super(message);
    this.name = "EntitlementError";
    this.feature = feature;
    this.requiredPlan = requiredPlan;
    this.status = 403;
  }
}

export interface UsageCheckResult {
  allowed: boolean;
  current: number;
  limit: number | null;
  percentage: number;
  state: "NORMAL" | "WARNING_80" | "WARNING_90" | "LIMIT_REACHED";
  action: "ALLOW" | "WARN" | "BLOCK" | "OVERAGE" | "UPGRADE_REQUIRED";
  warningMessage?: string;
  behavior: UsageLimitBehavior;
}

export interface CalendarLimitResult {
  allowed: boolean;
  current: number;
  limit: number | null;
  message?: string;
  targetPlan?: string;
}

// Normalize snake_case feature names to camelCase PlanFeatures keys
function normalizeFeatureKey(feature: FeatureKey): keyof PlanFeatures {
  const map: Record<string, keyof PlanFeatures> = {
    voice_ai: "voiceAI",
    sms_messaging: "sms",
    email_responses: "email",
    custom_ai_training: "customAiTraining",
    social_messaging: "instagramFacebook",
    advanced_lead_qualification: "advancedLeadQualification",
    analytics_export: "analyticsExport",
    dedicated_onboarding: "dedicatedOnboarding",
    sla_guarantee: "slaGuarantee",
    white_label: "analyticsExport",
    multi_location: "analyticsExport",
  };
  return (map[feature as string] || feature) as keyof PlanFeatures;
}

export const entitlementService = {
  /**
   * Seeds default commercial plans into subscription_plans table if missing.
   */
  async seedCommercialPlans() {
    for (const [id, config] of Object.entries(PLAN_CATALOG)) {
      await db
        .insert(subscriptionPlans)
        .values({
          id,
          name: config.name,
          description: config.description,
          price: String(config.price),
          interval: "month",
          features: Object.keys(config.features).filter((k) => (config.features as any)[k]),
        })
        .onConflictDoUpdate({
          target: subscriptionPlans.id,
          set: {
            name: config.name,
            price: String(config.price),
            updatedAt: new Date(),
          },
        });
    }
  },

  /**
   * Single Source of Truth Entitlement Check.
   * Checks whether the organization has access to a specific feature flag.
   * Never relies on checking plan name strings like `if (plan === 'pro')`.
   */
  async can(organizationId: string, feature: FeatureKey): Promise<boolean> {
    const status = await subscriptionEngine.getSubscriptionStatus(organizationId);

    // If subscription is suspended or expired, block operational capabilities
    if (status.isRestricted) {
      return false;
    }

    const normalizedKey = normalizeFeatureKey(feature);
    return Boolean(status.plan.features[normalizedKey]);
  },

  /**
   * Backwards-compatible alias for can().
   */
  async canAccess(organizationId: string, feature: FeatureKey): Promise<boolean> {
    return this.can(organizationId, feature);
  },

  /**
   * Enforces feature access server-side. Throws EntitlementError if unauthorized.
   */
  async requireFeature(organizationId: string, feature: FeatureKey) {
    const allowed = await this.can(organizationId, feature);
    if (!allowed) {
      let requiredPlan = "professional";
      if (feature === "whatsapp" || feature === "instagramFacebook" || feature === "social_messaging") {
        requiredPlan = "professional";
      } else if (
        feature === "analyticsExport" ||
        feature === "dedicatedOnboarding" ||
        feature === "slaGuarantee" ||
        feature === "analytics_export"
      ) {
        requiredPlan = "business";
      }

      throw new EntitlementError(
        `Feature '${feature}' is not included in your current subscription. Upgrade to ${requiredPlan.toUpperCase()} to unlock.`,
        feature,
        requiredPlan
      );
    }
  },

  /**
   * Checks whether live operational capabilities (AI receptionist, messaging, voice AI, booking automation)
   * are allowed for this workspace. When SUSPENDED, EXPIRED, or CANCELED, operational capabilities are halted
   * while dashboard, settings, billing, and knowledge base remain accessible.
   */
  async isOperationalAllowed(organizationId: string): Promise<boolean> {
    const status = await subscriptionEngine.getSubscriptionStatus(organizationId);
    return !status.isRestricted;
  },

  /**
   * Checks calendar integration limits dynamically.
   * Starter: maxCalendars = 1
   * Professional: maxCalendars = 3
   * Business: maxCalendars = null (Unlimited)
   */
  async checkCalendarLimit(organizationId: string): Promise<CalendarLimitResult> {
    const status = await subscriptionEngine.getSubscriptionStatus(organizationId);
    const limit = status.plan.limits.calendars;

    // Fetch actual connected calendar count from database
    const connections = await db
      .select()
      .from(calendarConnections)
      .where(eq(calendarConnections.organizationId, organizationId));

    const current = connections.length;

    // Unlimited calendars on Business
    if (limit === null) {
      return { allowed: true, current, limit: null };
    }

    if (current >= limit) {
      if (limit === 1) {
        return {
          allowed: false,
          current,
          limit,
          message: "You've reached your calendar limit. Upgrade to Professional to connect up to 3 calendars.",
          targetPlan: "professional",
        };
      } else {
        return {
          allowed: false,
          current,
          limit,
          message: "You've reached the 3-calendar limit. Business supports unlimited calendar integrations.",
          targetPlan: "business",
        };
      }
    }

    return { allowed: true, current, limit };
  },

  /**
   * Evaluates resource usage against plan limits and returns progressive warning states (80%, 90%, 100%).
   */
  async checkUsage(organizationId: string, metric: "conversations" | "voice_minutes"): Promise<UsageCheckResult> {
    const status = await subscriptionEngine.getSubscriptionStatus(organizationId);
    const plan = status.plan;
    const limit = metric === "conversations" ? plan.limits.conversations : plan.limits.voiceMinutes;
    const current =
      metric === "conversations"
        ? status.usage.conversations.current
        : status.usage.voiceMinutes.current;

    const percentage = limit ? Math.min(100, Math.round((current / limit) * 100)) : 0;
    const behavior = plan.usageLimitBehavior;

    if (current >= limit) {
      if (behavior === "OVERAGE") {
        return {
          allowed: true,
          current,
          limit,
          percentage,
          state: "LIMIT_REACHED",
          action: "OVERAGE",
          warningMessage: `You've used ${current.toLocaleString()} / ${limit.toLocaleString()} ${metric.replace("_", " ")}. Business overage rates apply.`,
          behavior,
        };
      } else {
        return {
          allowed: false,
          current,
          limit,
          percentage,
          state: "LIMIT_REACHED",
          action: behavior === "UPGRADE_REQUIRED" ? "UPGRADE_REQUIRED" : "BLOCK",
          warningMessage: `You have reached 100% of your monthly ${metric.replace("_", " ")} allowance. Upgrade your plan to continue processing calls without interruption.`,
          behavior,
        };
      }
    }

    if (percentage >= 90) {
      return {
        allowed: true,
        current,
        limit,
        percentage,
        state: "WARNING_90",
        action: "WARN",
        warningMessage: `You've used 90% of your monthly ${metric.replace("_", " ")} (${current.toLocaleString()} / ${limit.toLocaleString()}). Consider upgrading before reaching your limit.`,
        behavior,
      };
    }

    if (percentage >= 80) {
      return {
        allowed: true,
        current,
        limit,
        percentage,
        state: "WARNING_80",
        action: "WARN",
        warningMessage: `You're approaching your monthly ${metric.replace("_", " ")} limit (${current.toLocaleString()} / ${limit.toLocaleString()}).`,
        behavior,
      };
    }

    return {
      allowed: true,
      current,
      limit,
      percentage,
      state: "NORMAL",
      action: "ALLOW",
      behavior,
    };
  },

  /**
   * Records resource consumption dynamically and increments counters.
   */
  async recordUsage(
    organizationId: string,
    metric: "conversations" | "voice_minutes",
    amount = 1
  ): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    action: "allow" | "warn" | "block" | "overage";
  }> {
    const status = await subscriptionEngine.getSubscriptionStatus(organizationId);
    const limit =
      metric === "conversations"
        ? status.plan.limits.conversations
        : status.plan.limits.voiceMinutes;

    let [counter] = await db
      .select()
      .from(usageCounters)
      .where(
        and(
          eq(usageCounters.organizationId, organizationId),
          eq(usageCounters.metricName, metric)
        )
      )
      .limit(1);

    const now = new Date();
    const defaultReset = status.currentPeriodEnd;

    if (!counter) {
      const [newCounter] = await db
        .insert(usageCounters)
        .values({
          organizationId,
          metricName: metric,
          currentValue: amount,
          limitValue: limit,
          resetDate: defaultReset,
        })
        .returning();
      counter = newCounter;
    } else {
      let nextValue = counter.currentValue + amount;
      if (now.getTime() > new Date(counter.resetDate).getTime()) {
        nextValue = amount;
        await db
          .update(usageCounters)
          .set({
            currentValue: nextValue,
            limitValue: limit,
            resetDate: defaultReset,
            updatedAt: now,
          })
          .where(eq(usageCounters.id, counter.id));
      } else {
        await db
          .update(usageCounters)
          .set({
            currentValue: nextValue,
            limitValue: limit,
            updatedAt: now,
          })
          .where(eq(usageCounters.id, counter.id));
      }
      counter.currentValue = nextValue;
    }

    // Insert audit ledger entry
    await db.insert(usageRecords).values({
      organizationId,
      metricName: metric,
      amount,
    });

    let action: "allow" | "warn" | "block" | "overage" = "allow";
    let allowed = true;

    if (counter.currentValue > limit) {
      if (status.plan.usageLimitBehavior === "OVERAGE") {
        action = "overage";
        allowed = true;
      } else {
        action = "block";
        allowed = false;
      }
    } else if (counter.currentValue >= limit * 0.8) {
      action = "warn";
    }

    return {
      allowed,
      current: counter.currentValue,
      limit,
      action,
    };
  },

  /**
   * Backwards-compatible getSubscription resolver.
   */
  async getSubscription(organizationId: string) {
    const status = await subscriptionEngine.getSubscriptionStatus(organizationId);
    return {
      subscription: status,
      planId: status.plan.id,
      planConfig: status.plan,
      status: status.state.toLowerCase(),
      isActive: status.state === "ACTIVE" || status.state === "TRIALING",
      isPastDue: status.state === "PAST_DUE",
      isCanceled: status.state === "CANCELED" || status.state === "EXPIRED",
    };
  },

  /**
   * Returns resource usage, limit, and status.
   */
  async getUsage(organizationId: string, metric: "conversations" | "voice_minutes") {
    const check = await this.checkUsage(organizationId, metric);
    const legacyState = check.state === "LIMIT_REACHED" ? "limit_reached" : check.state === "WARNING_80" ? "warning_80" : check.state.toLowerCase();
    return {
      metric,
      current: check.current,
      limit: check.limit,
      remaining: check.limit ? Math.max(0, check.limit - check.current) : 999999,
      percentage: check.percentage,
      state: legacyState,
      action: check.action,
      warningMessage: check.warningMessage,
      resetDate: null,
    };
  },

  /**
   * Dynamically calculates plan-specific onboarding checklist requirements.
   */
  async getPlanOnboardingRequirements(organizationId: string) {
    const status = await subscriptionEngine.getSubscriptionStatus(organizationId);
    const plan = status.plan;

    const steps = [
      { id: "business_profile", title: "Business Profile & Contact Info", required: true },
      { id: "services", title: "Bookable Services & Pricing", required: true },
      { id: "business_hours", title: "Operating Hours & Weekly Availability", required: true },
      { id: "knowledge_base", title: "Knowledge Base FAQs & Training Chunks", required: true },
      { id: "calendar_connection", title: "Staff Calendar Sync", required: plan.limits.calendars !== 0 },
      { id: "voice_telephony", title: "Voice AI Receptionist & Phone Number", required: plan.features.voiceAI },
      { id: "channels_messaging", title: "SMS / WhatsApp Messaging Channel", required: plan.features.whatsapp || plan.features.sms },
      { id: "website_widget", title: "Website Booking & Intake Widget", required: plan.features.websiteWidget },
    ];

    return {
      planId: plan.id,
      planName: plan.name,
      steps,
    };
  },

  /**
   * Calculates actual business readiness score derived dynamically from database records.
   */
  async getBusinessReadinessScore(organizationId: string) {
    const [
      org,
      servicesList,
      settings,
      chunks,
      channelsList,
      staffList,
    ] = await Promise.all([
      db.query.organizations.findFirst({ where: eq(organizations.id, organizationId) }),
      db.query.services.findMany({ where: eq(services.organizationId, organizationId) }),
      db.query.businessSettings.findFirst({ where: eq(businessSettings.organizationId, organizationId) }),
      db.query.knowledgeChunks.findMany({ where: eq(knowledgeChunks.organizationId, organizationId) }),
      db.query.communicationChannels.findMany({ where: eq(communicationChannels.organizationId, organizationId) }),
      db.query.staffMembers.findMany({ where: eq(staffMembers.organizationId, organizationId) }),
    ]);

    const checks = {
      profileComplete: Boolean(org?.name && org?.phone && org?.timezone),
      servicesConfigured: servicesList.length > 0,
      hoursConfigured: Boolean(settings?.businessHours && Object.keys(settings.businessHours as any).length > 0),
      knowledgeIngested: chunks.length > 0,
      channelsConfigured: channelsList.length > 0,
      staffAdded: staffList.length > 0,
    };

    const weights = {
      profileComplete: 20,
      servicesConfigured: 25,
      hoursConfigured: 15,
      knowledgeIngested: 20,
      channelsConfigured: 10,
      staffAdded: 10,
    };

    let score = 0;
    if (checks.profileComplete) score += weights.profileComplete;
    if (checks.servicesConfigured) score += weights.servicesConfigured;
    if (checks.hoursConfigured) score += weights.hoursConfigured;
    if (checks.knowledgeIngested) score += weights.knowledgeIngested;
    if (checks.channelsConfigured) score += weights.channelsConfigured;
    if (checks.staffAdded) score += weights.staffAdded;

    const completedItems: string[] = [];
    const missingItems: string[] = [];

    if (checks.profileComplete) completedItems.push("Business profile");
    else missingItems.push("Business profile");

    if (checks.servicesConfigured) completedItems.push("Services");
    else missingItems.push("Services");

    if (checks.hoursConfigured) completedItems.push("Business hours");
    else missingItems.push("Business hours");

    if (checks.knowledgeIngested) completedItems.push("Knowledge base");
    else missingItems.push("Knowledge base");

    if (checks.channelsConfigured) completedItems.push("AI receptionist channels");
    else missingItems.push("AI receptionist channels");

    return {
      score,
      isReadyForProduction: score >= 80,
      checks,
      completedItems,
      missingItems,
      metrics: {
        servicesCount: servicesList.length,
        knowledgeChunksCount: chunks.length,
        channelsCount: channelsList.length,
        staffCount: staffList.length,
      },
    };
  },
};
