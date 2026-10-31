/**
 * Operator Plan Configurations & Regional Pricing
 * Bridges to the Authoritative Catalog in src/lib/billing/catalog.ts
 *
 * Single Source of Truth for Plan Configurations, Pricing, Limits, and Entitlements.
 */

import {
  PlanId,
  SupportedCurrency,
  BillingInterval,
  MASTER_PLANS,
  REGION_CONFIGS,
  computeRegionalPrices,
  formatMoney,
  normalizePlanId,
  isAllowedPlanId,
  isAllowedInterval,
  BASE_PRICES_USD,
} from "./catalog";

export type { PlanId, SupportedCurrency, BillingInterval };
export { formatMoney, normalizePlanId, isAllowedPlanId, isAllowedInterval };

export type UsageLimitBehavior = "BLOCK" | "SOFT_LIMIT" | "OVERAGE" | "UPGRADE_REQUIRED";

export interface PlanLimits {
  conversations: number;
  voiceMinutes: number; // Regional minutes applied via getLocalizedPlan
  trialVoiceMinutes: number; // 30 min cap during trial
  calendars: number | null;
  knowledgeArticles: number;
  teamMembers: number;
  locations: number;
  support: string;
}

export interface PlanFeatures {
  websiteWidget: boolean;
  sms: boolean;
  email: boolean;
  whatsapp: boolean;
  instagramFacebook: boolean;
  voiceAI: boolean;
  missedCallTextBack: boolean; // Coming soon (Honesty Rule)
  callRecordingsTranscripts: boolean;
  callTransfer: boolean;
  smsWhatsappReminders: boolean;
  depositsPaymentLinks: boolean;
  roiDashboard: boolean | "basic" | "full" | "full_csv";
  advancedLeadQualification: boolean;
  crmWebhookIntegrations: boolean; // Coming soon (Honesty Rule)
  customCallRouting: boolean;
  teamRolesAuditLog: boolean;
  dedicatedOnboarding: boolean;
  customAiTraining: boolean;
  analyticsExport: boolean;
  slaGuarantee: boolean;
}

export interface PlanConfig {
  id: PlanId;
  name: string;
  bestFor: string;
  description: string;
  cardCopy: string;
  price: number; // Monthly price in active currency
  monthlyPrice: number;
  yearlyPrice: number; // Discounted monthly rate or yearly rate
  yearlyTotal: number;
  currency: string;
  currencySymbol: string;
  trialDays: number;
  trialNote: string;
  highlight?: boolean;
  badge?: string | null;
  limits: PlanLimits;
  features: PlanFeatures;
  usageLimitBehavior: UsageLimitBehavior;
}

export const SUPPORTED_BILLING_CURRENCIES = ["USD", "GBP", "INR", "EUR"] as const;

// Base published rates for quick static resolution (matches P3 exactly)
export const REGIONAL_CONFIGS_STATIC = {
  USD: {
    currency: "USD",
    symbol: "$",
    locale: "en-US",
    marketName: "United States",
    headlineHero: "Stop losing customers to voicemail.",
    extraVoiceMinute: "$0.45",
    extraConversations: "$25",
    setupFee: "$149",
    plans: {
      starter: { price: 79, monthlyPrice: 79, yearlyPrice: 66, yearlyTotal: 790, voiceMinutes: 0 },
      professional: { price: 199, monthlyPrice: 199, yearlyPrice: 166, yearlyTotal: 1990, voiceMinutes: 250 },
      business: { price: 399, monthlyPrice: 399, yearlyPrice: 333, yearlyTotal: 3990, voiceMinutes: 600 },
    },
  },
  GBP: {
    currency: "GBP",
    symbol: "£",
    locale: "en-GB",
    marketName: "United Kingdom",
    headlineHero: "Stop losing customers to voicemail.",
    extraVoiceMinute: "£0.35",
    extraConversations: "£19",
    setupFee: "£109",
    plans: {
      starter: { price: 59, monthlyPrice: 59, yearlyPrice: 49, yearlyTotal: 589, voiceMinutes: 0 },
      professional: { price: 149, monthlyPrice: 149, yearlyPrice: 124, yearlyTotal: 1489, voiceMinutes: 250 },
      business: { price: 299, monthlyPrice: 299, yearlyPrice: 248, yearlyTotal: 2979, voiceMinutes: 600 },
    },
  },
  INR: {
    currency: "INR",
    symbol: "₹",
    locale: "en-IN",
    marketName: "India",
    headlineHero: "Reply to every WhatsApp enquiry, even at 2 AM.",
    extraVoiceMinute: "₹26",
    extraConversations: "₹1,430",
    setupFee: "₹4,499",
    plans: {
      starter: { price: 2499, monthlyPrice: 2499, yearlyPrice: 2083, yearlyTotal: 24999, voiceMinutes: 0 },
      professional: { price: 5999, monthlyPrice: 5999, yearlyPrice: 4999, yearlyTotal: 62499, voiceMinutes: 100 },
      business: { price: 12499, monthlyPrice: 12499, yearlyPrice: 10416, yearlyTotal: 124999, voiceMinutes: 300 },
    },
  },
  EUR: {
    currency: "EUR",
    symbol: "€",
    locale: "de-DE",
    marketName: "Europe",
    headlineHero: "Stop losing customers to voicemail.",
    extraVoiceMinute: "€0.40",
    extraConversations: "€22",
    setupFee: "€139",
    plans: {
      starter: { price: 75, monthlyPrice: 75, yearlyPrice: 63, yearlyTotal: 750, voiceMinutes: 0 },
      professional: { price: 189, monthlyPrice: 189, yearlyPrice: 158, yearlyTotal: 1890, voiceMinutes: 250 },
      business: { price: 379, monthlyPrice: 379, yearlyPrice: 316, yearlyTotal: 3790, voiceMinutes: 600 },
    },
  },
};

export const REGIONAL_CONFIGS = REGIONAL_CONFIGS_STATIC as any;
export const REGIONAL_PRICING = {
  USD: REGIONAL_CONFIGS_STATIC.USD.plans,
  GBP: REGIONAL_CONFIGS_STATIC.GBP.plans,
  INR: REGIONAL_CONFIGS_STATIC.INR.plans,
  EUR: REGIONAL_CONFIGS_STATIC.EUR.plans,
};

/**
 * Base Plan Catalog Configurations (USD standard base)
 */
export const PLAN_CATALOG: Record<string, PlanConfig> = {
  starter: {
    id: "starter",
    name: "Starter",
    bestFor: "One-location businesses that want automated chat & WhatsApp booking",
    description: "Answer website and WhatsApp enquiries and book appointments automatically.",
    cardCopy: "Answer website and WhatsApp enquiries and book appointments automatically.",
    price: 79,
    monthlyPrice: 79,
    yearlyPrice: 66,
    yearlyTotal: 790,
    currency: "USD",
    currencySymbol: "$",
    trialDays: 14,
    trialNote: "14-day free trial on Starter • Card on file required • $0 today",
    highlight: false,
    badge: null,
    limits: {
      conversations: 500,
      voiceMinutes: 0,
      trialVoiceMinutes: 0,
      calendars: 1,
      knowledgeArticles: 20,
      teamMembers: 1,
      locations: 1,
      support: "Email support",
    },
    features: {
      websiteWidget: true,
      whatsapp: true,
      sms: false,
      email: true,
      instagramFacebook: false,
      voiceAI: false, // Phone calls start at Pro
      missedCallTextBack: false,
      callRecordingsTranscripts: false,
      callTransfer: false,
      smsWhatsappReminders: false,
      depositsPaymentLinks: false,
      roiDashboard: false,
      advancedLeadQualification: false,
      crmWebhookIntegrations: false,
      customCallRouting: false,
      teamRolesAuditLog: false,
      dedicatedOnboarding: false,
      customAiTraining: false,
      analyticsExport: false,
      slaGuarantee: false,
    },
    usageLimitBehavior: "BLOCK",
  },
  professional: {
    id: "professional",
    name: "Pro",
    bestFor: "Growing businesses needing a full AI phone receptionist + WhatsApp",
    description: "Never miss a customer call or inquiry. Includes 24/7 phone answering and staff transfer.",
    cardCopy: "Never miss a customer call or inquiry. Includes 24/7 phone answering and staff transfer.",
    price: 199,
    monthlyPrice: 199,
    yearlyPrice: 166,
    yearlyTotal: 1990,
    currency: "USD",
    currencySymbol: "$",
    trialDays: 14,
    trialNote: "14-day free trial on Pro • 30 mins voice during trial • $0 today",
    highlight: true,
    badge: "Most Popular",
    limits: {
      conversations: 2000,
      voiceMinutes: 250,
      trialVoiceMinutes: 30,
      calendars: 1,
      knowledgeArticles: 100,
      teamMembers: 3,
      locations: 1,
      support: "Priority email support",
    },
    features: {
      websiteWidget: true,
      whatsapp: true,
      sms: true,
      email: true,
      instagramFacebook: true,
      voiceAI: true,
      missedCallTextBack: false, // Coming soon
      callRecordingsTranscripts: true,
      callTransfer: true,
      smsWhatsappReminders: true,
      depositsPaymentLinks: true,
      roiDashboard: true,
      advancedLeadQualification: true,
      crmWebhookIntegrations: false, // Coming soon
      customCallRouting: false,
      teamRolesAuditLog: false,
      dedicatedOnboarding: false,
      customAiTraining: true,
      analyticsExport: true,
      slaGuarantee: false,
    },
    usageLimitBehavior: "OVERAGE",
  },
  business: {
    id: "business",
    name: "Business",
    bestFor: "Multi-location clinics, salons, and offices requiring custom rules",
    description: "Enterprise receptionist with multi-location scheduling, custom routing rules, and audit logs.",
    cardCopy: "Enterprise receptionist with multi-location scheduling, custom routing rules, and audit logs.",
    price: 399,
    monthlyPrice: 399,
    yearlyPrice: 333,
    yearlyTotal: 3990,
    currency: "USD",
    currencySymbol: "$",
    trialDays: 14,
    trialNote: "14-day free trial on Business • 30 mins voice during trial • $0 today",
    highlight: false,
    badge: "Scale",
    limits: {
      conversations: 4000,
      voiceMinutes: 600,
      trialVoiceMinutes: 30,
      calendars: null, // Unlimited
      knowledgeArticles: 500,
      teamMembers: 10,
      locations: 5,
      support: "Priority email + dedicated onboarding call",
    },
    features: {
      websiteWidget: true,
      whatsapp: true,
      sms: true,
      email: true,
      instagramFacebook: true,
      voiceAI: true,
      missedCallTextBack: false, // Coming soon
      callRecordingsTranscripts: true,
      callTransfer: true,
      smsWhatsappReminders: true,
      depositsPaymentLinks: true,
      roiDashboard: true,
      advancedLeadQualification: true,
      crmWebhookIntegrations: false, // Coming soon
      customCallRouting: true,
      teamRolesAuditLog: true,
      dedicatedOnboarding: true,
      customAiTraining: true,
      analyticsExport: true,
      slaGuarantee: true,
    },
    usageLimitBehavior: "OVERAGE",
  },
};

// Aliases for quick lookup
PLAN_CATALOG.pro = PLAN_CATALOG.professional;

/**
 * Resolves standard billing currency from ISO country code.
 */
export function getCurrencyForCountry(countryCode?: string | null): string {
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
  const normalized = normalizePlanId(planId);
  return PLAN_CATALOG[normalized] || PLAN_CATALOG.starter;
}

/**
 * Returns a localized plan configuration strictly derived from authoritative regional pricing.
 */
export function getLocalizedPlan(
  planId: string | null | undefined,
  currency?: string | null,
  countryCode?: string | null
): PlanConfig {
  const normPlanId = normalizePlanId(planId);
  const basePlan = PLAN_CATALOG[normPlanId];
  const targetCurrency = (
    currency && ["USD", "GBP", "INR", "EUR"].includes(currency.toUpperCase())
      ? currency.toUpperCase()
      : getCurrencyForCountry(countryCode)
  );

  const regional = (REGIONAL_CONFIGS_STATIC as any)[targetCurrency] || REGIONAL_CONFIGS_STATIC.USD;
  const rates = regional.plans[normPlanId];

  return {
    ...basePlan,
    price: rates.price,
    monthlyPrice: rates.monthlyPrice,
    yearlyPrice: rates.yearlyPrice,
    yearlyTotal: rates.yearlyTotal,
    currency: targetCurrency,
    currencySymbol: regional.symbol,
    limits: {
      ...basePlan.limits,
      voiceMinutes: rates.voiceMinutes,
    },
  };
}

/**
 * Returns all active commercial plans localized to a specific currency/country.
 */
export function getLocalizedPlans(currency?: string | null, countryCode?: string | null): PlanConfig[] {
  const planIds: PlanId[] = ["starter", "professional", "business"];
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
