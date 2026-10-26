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
 * Regional pricing catalog ensuring currency integrity across international markets.
 */
export const REGIONAL_PRICING: Record<
  string,
  Record<string, { price: number; monthlyPrice: number; yearlyPrice: number }>
> = {
  USD: {
    starter: { price: 49, monthlyPrice: 49, yearlyPrice: 39 },
    professional: { price: 149, monthlyPrice: 149, yearlyPrice: 119 },
    business: { price: 349, monthlyPrice: 349, yearlyPrice: 279 },
  },
  INR: {
    starter: { price: 3999, monthlyPrice: 3999, yearlyPrice: 3199 },
    professional: { price: 11999, monthlyPrice: 11999, yearlyPrice: 9599 },
    business: { price: 27999, monthlyPrice: 27999, yearlyPrice: 22399 },
  },
  EUR: {
    starter: { price: 45, monthlyPrice: 45, yearlyPrice: 35 },
    professional: { price: 139, monthlyPrice: 139, yearlyPrice: 109 },
    business: { price: 319, monthlyPrice: 319, yearlyPrice: 259 },
  },
  GBP: {
    starter: { price: 39, monthlyPrice: 39, yearlyPrice: 29 },
    professional: { price: 119, monthlyPrice: 119, yearlyPrice: 95 },
    business: { price: 279, monthlyPrice: 279, yearlyPrice: 219 },
  },
};

export const SUPPORTED_BILLING_CURRENCIES = ["USD", "INR", "EUR", "GBP"] as const;
export type SupportedCurrency = (typeof SUPPORTED_BILLING_CURRENCIES)[number];

/**
 * Resolves standard billing currency from ISO country code.
 */
export function getCurrencyForCountry(countryCode?: string | null): SupportedCurrency {
  if (!countryCode) return "USD";
  const upper = countryCode.toUpperCase().trim();
  if (upper === "IN") return "INR";
  if (upper === "GB" || upper === "UK") return "GBP";
  if (["DE", "FR", "IT", "ES", "NL", "BE", "AT", "PT", "IE", "FI", "GR"].includes(upper)) {
    return "EUR";
  }
  return "USD";
}

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
 * Returns a localized plan configuration strictly derived from authoritative regional pricing.
 * Preserves checkout currency integrity by forbidding client-side price tampering.
 */
export function getLocalizedPlan(
  planId: string | null | undefined,
  currency?: string | null,
  countryCode?: string | null
): PlanConfig {
  const basePlan = getPlan(planId);
  const targetCurrency: SupportedCurrency = (
    currency && SUPPORTED_BILLING_CURRENCIES.includes(currency.toUpperCase() as SupportedCurrency)
      ? currency.toUpperCase()
      : getCurrencyForCountry(countryCode)
  ) as SupportedCurrency;

  const normalizedPlanId = basePlan.id.toLowerCase();
  const regionalRates = REGIONAL_PRICING[targetCurrency]?.[normalizedPlanId] || REGIONAL_PRICING.USD[normalizedPlanId];

  return {
    ...basePlan,
    price: regionalRates.price,
    monthlyPrice: regionalRates.monthlyPrice,
    yearlyPrice: regionalRates.yearlyPrice,
    currency: targetCurrency,
  };
}

/**
 * Returns all active commercial plans localized to a specific currency/country.
 */
export function getLocalizedPlans(currency?: string | null, countryCode?: string | null): PlanConfig[] {
  const planIds = ["starter", "professional", "business"];
  return planIds.map((id) => getLocalizedPlan(id, currency, countryCode));
}

/**
 * Returns all active commercial plans in order of hierarchy (USD default).
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
