/**
 * Operator Dynamic Plan Catalog
 * Single Source of Truth for Plan Configurations, Pricing, Limits, and Entitlements.
 * Never hardcode plan names or limits elsewhere in the application.
 */

export type PlanId = "starter" | "professional" | "business" | string;

export type UsageLimitBehavior = "BLOCK" | "SOFT_LIMIT" | "OVERAGE" | "UPGRADE_REQUIRED";

export interface PlanLimits {
  conversations: number;
  voiceMinutes: number;
  calendars: number | null; // null represents unlimited calendars
  knowledgeArticles: number;
  teamMembers: number;
  locations: number;
}

export interface PlanFeatures {
  websiteWidget: boolean;
  sms: boolean;
  email: boolean;
  whatsapp: boolean;
  instagramFacebook: boolean;
  voiceAI: boolean;
  advancedLeadQualification: boolean;
  customAiTraining: boolean;
  analyticsExport: boolean;
  dedicatedOnboarding: boolean;
  slaGuarantee: boolean;
}

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  price: number; // Monthly price in USD
  monthlyPrice: number; // Alias for price for compatibility
  yearlyPrice: number; // Discounted monthly rate when billed annually
  currency: string;
  trialDays: number;
  highlight?: boolean;
  badge?: string | null;
  limits: PlanLimits;
  features: PlanFeatures;
  usageLimitBehavior: UsageLimitBehavior;
}

export const PLAN_CATALOG: Record<string, PlanConfig> = {
  starter: {
    id: "starter",
    name: "Starter",
    description: "For solo practitioners, freelancers, and small single-location businesses.",
    price: 49,
    monthlyPrice: 49,
    yearlyPrice: 39,
    currency: "USD",
    trialDays: 14,
    highlight: false,
    badge: null,
    limits: {
      conversations: 500,
      voiceMinutes: 100,
      calendars: 1,
      knowledgeArticles: 25,
      teamMembers: 1,
      locations: 1,
    },
    features: {
      websiteWidget: true,
      sms: true,
      email: true,
      whatsapp: false,
      instagramFacebook: false,
      voiceAI: true,
      advancedLeadQualification: false,
      customAiTraining: false,
      analyticsExport: false,
      dedicatedOnboarding: false,
      slaGuarantee: false,
    },
    usageLimitBehavior: "UPGRADE_REQUIRED",
  },

  professional: {
    id: "professional",
    name: "Professional",
    description: "For growing service businesses that need full omnichannel coverage.",
    price: 149,
    monthlyPrice: 149,
    yearlyPrice: 119,
    currency: "USD",
    trialDays: 14,
    highlight: true,
    badge: "Most Popular",
    limits: {
      conversations: 2500,
      voiceMinutes: 500,
      calendars: 3,
      knowledgeArticles: 100,
      teamMembers: 5,
      locations: 1,
    },
    features: {
      websiteWidget: true,
      sms: true,
      email: true,
      whatsapp: true,
      instagramFacebook: true,
      voiceAI: true,
      advancedLeadQualification: true,
      customAiTraining: true,
      analyticsExport: false,
      dedicatedOnboarding: false,
      slaGuarantee: false,
    },
    usageLimitBehavior: "UPGRADE_REQUIRED",
  },

  business: {
    id: "business",
    name: "Business",
    description: "For multi-location businesses, franchises, and high-volume operations.",
    price: 349,
    monthlyPrice: 349,
    yearlyPrice: 279,
    currency: "USD",
    trialDays: 14,
    highlight: false,
    badge: "Scale & Enterprise",
    limits: {
      conversations: 10000,
      voiceMinutes: 2000,
      calendars: null, // Unlimited
      knowledgeArticles: 500,
      teamMembers: 20,
      locations: 5,
    },
    features: {
      websiteWidget: true,
      sms: true,
      email: true,
      whatsapp: true,
      instagramFacebook: true,
      voiceAI: true,
      advancedLeadQualification: true,
      customAiTraining: true,
      analyticsExport: true,
      dedicatedOnboarding: true,
      slaGuarantee: true,
    },
    usageLimitBehavior: "OVERAGE",
  },
};

/**
 * Returns a plan configuration record by ID with safe fallback to Starter.
 */
export function getPlan(planId: string | null | undefined): PlanConfig {
  const normalized = (planId || "starter").toLowerCase();
  if (normalized.includes("biz") || normalized.includes("enterprise")) {
    return PLAN_CATALOG.business;
  }
  if (normalized.includes("pro")) {
    return PLAN_CATALOG.professional;
  }
  return PLAN_CATALOG[normalized] || PLAN_CATALOG.starter;
}

/**
 * Returns all active commercial plans in order of hierarchy.
 */
export function getAllPlans(): PlanConfig[] {
  return [PLAN_CATALOG.starter, PLAN_CATALOG.professional, PLAN_CATALOG.business];
}

/**
 * Retrieves a dynamic limit for a given plan.
 */
export function getPlanLimit<K extends keyof PlanLimits>(
  planId: string | null | undefined,
  limitKey: K
): PlanLimits[K] {
  const plan = getPlan(planId);
  return plan.limits[limitKey];
}

/**
 * Retrieves a feature entitlement flag for a given plan.
 */
export function getPlanFeature<K extends keyof PlanFeatures>(
  planId: string | null | undefined,
  featureKey: K
): PlanFeatures[K] {
  const plan = getPlan(planId);
  return plan.features[featureKey];
}
