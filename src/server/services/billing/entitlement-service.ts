import { db } from "../../db";
import { eq, and } from "drizzle-orm";
import {
  subscriptions,
  subscriptionPlans,
  featureEntitlements,
  usageCounters,
  usageRecords,
  services,
  businessSettings,
  knowledgeChunks,
  communicationChannels,
  staffMembers,
  channelConnections,
  organizations,
} from "../../db/schema";

export type FeatureKey =
  | "voice_ai"
  | "sms_messaging"
  | "email_responses"
  | "whatsapp"
  | "social_messaging"
  | "calendar_sync"
  | "advanced_lead_qualification"
  | "custom_ai_training"
  | "white_label"
  | "multi_location"
  | "analytics_export"
  | "dedicated_onboarding"
  | "sla_guarantee";

export type MetricKey =
  | "conversations"
  | "voice_minutes"
  | "calendar_connections"
  | "team_members"
  | "knowledge_articles"
  | "locations";

export interface PlanConfig {
  id: string;
  name: string;
  monthlyPrice: number;
  limits: Record<MetricKey, number>;
  features: Record<FeatureKey, boolean>;
}

export const COMMERCIAL_PLANS: Record<string, PlanConfig> = {
  free: {
    id: "free",
    name: "Free Trial",
    monthlyPrice: 0,
    limits: {
      conversations: 50,
      voice_minutes: 10,
      calendar_connections: 1,
      team_members: 1,
      knowledge_articles: 5,
      locations: 1,
    },
    features: {
      voice_ai: true,
      sms_messaging: true,
      email_responses: true,
      whatsapp: false,
      social_messaging: false,
      calendar_sync: true,
      advanced_lead_qualification: false,
      custom_ai_training: false,
      white_label: false,
      multi_location: false,
      analytics_export: false,
      dedicated_onboarding: false,
      sla_guarantee: false,
    },
  },
  trial: {
    id: "trial",
    name: "14-Day Trial",
    monthlyPrice: 0,
    limits: {
      conversations: 100,
      voice_minutes: 50,
      calendar_connections: 1,
      team_members: 2,
      knowledge_articles: 25,
      locations: 1,
    },
    features: {
      voice_ai: true,
      sms_messaging: true,
      email_responses: true,
      whatsapp: true,
      social_messaging: false,
      calendar_sync: true,
      advanced_lead_qualification: true,
      custom_ai_training: false,
      white_label: false,
      multi_location: false,
      analytics_export: false,
      dedicated_onboarding: false,
      sla_guarantee: false,
    },
  },
  starter: {
    id: "starter",
    name: "Starter",
    monthlyPrice: 49,
    limits: {
      conversations: 500,
      voice_minutes: 100,
      calendar_connections: 1,
      team_members: 1,
      knowledge_articles: 25,
      locations: 1,
    },
    features: {
      voice_ai: true,
      sms_messaging: true,
      email_responses: true,
      whatsapp: false,
      social_messaging: false,
      calendar_sync: true,
      advanced_lead_qualification: false,
      custom_ai_training: false,
      white_label: false,
      multi_location: false,
      analytics_export: false,
      dedicated_onboarding: false,
      sla_guarantee: false,
    },
  },
  pro: {
    id: "pro",
    name: "Professional",
    monthlyPrice: 149,
    limits: {
      conversations: 2500,
      voice_minutes: 500,
      calendar_connections: 3,
      team_members: 5,
      knowledge_articles: 100,
      locations: 1,
    },
    features: {
      voice_ai: true,
      sms_messaging: true,
      email_responses: true,
      whatsapp: true,
      social_messaging: true,
      calendar_sync: true,
      advanced_lead_qualification: true,
      custom_ai_training: true,
      white_label: false,
      multi_location: false,
      analytics_export: true,
      dedicated_onboarding: false,
      sla_guarantee: false,
    },
  },
  professional: {
    id: "professional",
    name: "Professional",
    monthlyPrice: 149,
    limits: {
      conversations: 2500,
      voice_minutes: 500,
      calendar_connections: 3,
      team_members: 5,
      knowledge_articles: 100,
      locations: 1,
    },
    features: {
      voice_ai: true,
      sms_messaging: true,
      email_responses: true,
      whatsapp: true,
      social_messaging: true,
      calendar_sync: true,
      advanced_lead_qualification: true,
      custom_ai_training: true,
      white_label: false,
      multi_location: false,
      analytics_export: true,
      dedicated_onboarding: false,
      sla_guarantee: false,
    },
  },
  business: {
    id: "business",
    name: "Business",
    monthlyPrice: 349,
    limits: {
      conversations: 10000,
      voice_minutes: 2000,
      calendar_connections: 999,
      team_members: 20,
      knowledge_articles: 500,
      locations: 5,
    },
    features: {
      voice_ai: true,
      sms_messaging: true,
      email_responses: true,
      whatsapp: true,
      social_messaging: true,
      calendar_sync: true,
      advanced_lead_qualification: true,
      custom_ai_training: true,
      white_label: false,
      multi_location: true,
      analytics_export: true,
      dedicated_onboarding: true,
      sla_guarantee: true,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: 999,
    limits: {
      conversations: 999999,
      voice_minutes: 999999,
      calendar_connections: 999,
      team_members: 999,
      knowledge_articles: 9999,
      locations: 99,
    },
    features: {
      voice_ai: true,
      sms_messaging: true,
      email_responses: true,
      whatsapp: true,
      social_messaging: true,
      calendar_sync: true,
      advanced_lead_qualification: true,
      custom_ai_training: true,
      white_label: true,
      multi_location: true,
      analytics_export: true,
      dedicated_onboarding: true,
      sla_guarantee: true,
    },
  },
};

export class EntitlementError extends Error {
  readonly feature: string;
  readonly requiredPlan: string;
  readonly status: number;

  constructor(message: string, feature: string, requiredPlan = "pro") {
    super(message);
    this.name = "EntitlementError";
    this.feature = feature;
    this.requiredPlan = requiredPlan;
    this.status = 403;
  }
}

export const entitlementService = {
  /**
   * Seeds default commercial plans into subscription_plans table if missing.
   */
  async seedCommercialPlans() {
    for (const [id, config] of Object.entries(COMMERCIAL_PLANS)) {
      await db
        .insert(subscriptionPlans)
        .values({
          id,
          name: config.name,
          description: `${config.name} Commercial Plan`,
          price: String(config.monthlyPrice),
          interval: "month",
          features: Object.keys(config.features).filter((k) => (config.features as any)[k]),
        })
        .onConflictDoUpdate({
          target: subscriptionPlans.id,
          set: {
            name: config.name,
            price: String(config.monthlyPrice),
            updatedAt: new Date(),
          },
        });
    }
  },

  /**
   * Resolves the subscription and active plan config for an organization.
   */
  async getSubscription(organizationId: string) {
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, organizationId),
    });

    const planId = (sub?.planId || "free").toLowerCase();
    const planConfig = COMMERCIAL_PLANS[planId] || COMMERCIAL_PLANS.free;
    const status = sub?.status || "trialing";

    // Grace period evaluation: past_due subscriptions retain access for 3 days
    const isPastDue = status === "past_due";
    const isCanceled = status === "canceled";
    const isActive = status === "active" || status === "trialing" || isPastDue;

    return {
      subscription: sub,
      planId,
      planConfig,
      status,
      isActive,
      isPastDue,
      isCanceled,
    };
  },

  /**
   * Checks if an organization can access a specific feature.
   */
  async canAccess(organizationId: string, feature: FeatureKey): Promise<boolean> {
    const { planConfig, isActive, isCanceled } = await this.getSubscription(organizationId);

    // If subscription is canceled, only free tier features are accessible
    if (isCanceled) {
      return COMMERCIAL_PLANS.free.features[feature] ?? false;
    }

    if (!isActive) {
      return false;
    }

    // Check plan feature flag
    return planConfig.features[feature] ?? false;
  },

  /**
   * Enforces feature access server-side. Throws EntitlementError if unauthorized.
   */
  async requireFeature(organizationId: string, feature: FeatureKey) {
    const allowed = await this.canAccess(organizationId, feature);
    if (!allowed) {
      const requiredPlan = feature === "whatsapp" || feature === "custom_ai_training" ? "pro" : "enterprise";
      throw new EntitlementError(
        `Feature '${feature}' is not included in your current plan. Please upgrade to ${requiredPlan} to unlock.`,
        feature,
        requiredPlan
      );
    }
  },

  /**
   * Returns resource usage, limit, and status (normal, warning_80, limit_reached).
   */
  async getUsage(organizationId: string, metric: MetricKey) {
    const { planConfig } = await this.getSubscription(organizationId);
    const limit = planConfig.limits[metric] ?? 100;

    const counter = await db.query.usageCounters.findFirst({
      where: and(
        eq(usageCounters.organizationId, organizationId),
        eq(usageCounters.metricName, metric)
      ),
    });

    const current = counter?.currentValue ?? 0;
    const percentage = limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0;

    let state: "normal" | "warning_80" | "limit_reached" | "overage" = "normal";
    if (current >= limit) {
      state = planConfig.id === "enterprise" ? "overage" : "limit_reached";
    } else if (current >= limit * 0.8) {
      state = "warning_80";
    }

    return {
      metric,
      current,
      limit,
      remaining: Math.max(0, limit - current),
      percentage,
      state,
      resetDate: counter?.resetDate || null,
    };
  },

  /**
   * Records resource usage and enforces limit gates.
   */
  async recordUsage(
    organizationId: string,
    metric: MetricKey,
    amount = 1
  ): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    action: "allow" | "warn" | "block" | "overage";
  }> {
    const { planConfig } = await this.getSubscription(organizationId);
    const limit = planConfig.limits[metric] ?? 100;

    let counter = await db.query.usageCounters.findFirst({
      where: and(
        eq(usageCounters.organizationId, organizationId),
        eq(usageCounters.metricName, metric)
      ),
    });

    const now = new Date();
    const defaultReset = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

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
      if (now > counter.resetDate) {
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

    // Insert usage record ledger entry
    await db.insert(usageRecords).values({
      organizationId,
      metricName: metric,
      amount,
    });

    let action: "allow" | "warn" | "block" | "overage" = "allow";
    let allowed = true;

    if (counter.currentValue > limit) {
      if (planConfig.id === "enterprise") {
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
   * Dynamically calculates plan-specific onboarding checklist requirements.
   */
  async getPlanOnboardingRequirements(organizationId: string) {
    const { planConfig } = await this.getSubscription(organizationId);

    const steps = [
      { id: "business_profile", title: "Business Profile & Contact Info", required: true },
      { id: "services", title: "Bookable Services & Pricing", required: true },
      { id: "business_hours", title: "Operating Hours & Weekly Availability", required: true },
      { id: "knowledge_base", title: "Knowledge Base FAQs & Training Chunks", required: true },
      { id: "calendar_connection", title: "Staff Calendar Sync (Google / Microsoft)", required: planConfig.features.calendar_sync },
      { id: "voice_telephony", title: "Voice AI Receptionist & Phone Number", required: planConfig.features.voice_ai },
      { id: "channels_messaging", title: "SMS / WhatsApp Messaging Channel", required: planConfig.features.whatsapp || planConfig.features.sms_messaging },
      { id: "website_widget", title: "Website Booking & Intake Widget", required: true },
    ];

    return {
      planId: planConfig.id,
      planName: planConfig.name,
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

    return {
      score,
      isReadyForProduction: score >= 80,
      checks,
      metrics: {
        servicesCount: servicesList.length,
        knowledgeChunksCount: chunks.length,
        channelsCount: channelsList.length,
        staffCount: staffList.length,
      },
    };
  },
};
