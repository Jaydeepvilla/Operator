/**
 * Operator Dynamic Plan Catalog
 * Single Source of Truth for Plan Configurations, Pricing, Limits, and Entitlements.
 * Never hardcode plan names or limits elsewhere in the application.
 *
 * Updated with exact regional pricing (US $, UK £, India ₹),
 * telephony rules (Phone calls start at Pro), and entitlement caps.
 */

export type PlanId = "starter" | "professional" | "business" | string;

export type UsageLimitBehavior = "BLOCK" | "SOFT_LIMIT" | "OVERAGE" | "UPGRADE_REQUIRED";

export interface PlanLimits {
  conversations: number;
  voiceMinutes: number; // Regional minutes applied via getLocalizedPlan
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
  missedCallTextBack: boolean;
  callRecordingsTranscripts: boolean;
  callTransfer: boolean;
  smsWhatsappReminders: boolean;
  depositsPaymentLinks: boolean;
  roiDashboard: boolean;
  advancedLeadQualification: boolean;
  crmWebhookIntegrations: boolean;
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
  yearlyPrice: number; // Discounted monthly rate when billed annually (10 months for 12)
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
export type SupportedCurrency = (typeof SUPPORTED_BILLING_CURRENCIES)[number];

export interface RegionalRules {
  currency: SupportedCurrency;
  symbol: string;
  marketName: string;
  headlineHero: string;
  extraVoiceMinute: string;
  extraConversations: string;
  setupFee: string;
  plans: Record<
    "starter" | "professional" | "business",
    {
      price: number;
      monthlyPrice: number;
      yearlyPrice: number; // Pay for 10 months, get 12
      voiceMinutes: number;
    }
  >;
}

export const REGIONAL_CONFIGS: Record<SupportedCurrency, RegionalRules> = {
  USD: {
    currency: "USD",
    symbol: "$",
    marketName: "United States",
    headlineHero: "Stop losing customers to voicemail.",
    extraVoiceMinute: "$0.45",
    extraConversations: "$25",
    setupFee: "$149",
    plans: {
      starter: { price: 79, monthlyPrice: 79, yearlyPrice: 66, voiceMinutes: 0 },
      professional: { price: 199, monthlyPrice: 199, yearlyPrice: 166, voiceMinutes: 250 },
      business: { price: 399, monthlyPrice: 399, yearlyPrice: 333, voiceMinutes: 600 },
    },
  },
  GBP: {
    currency: "GBP",
    symbol: "£",
    marketName: "United Kingdom",
    headlineHero: "Stop losing customers to voicemail.",
    extraVoiceMinute: "£0.35",
    extraConversations: "£20",
    setupFee: "£119",
    plans: {
      starter: { price: 59, monthlyPrice: 59, yearlyPrice: 49, voiceMinutes: 0 },
      professional: { price: 159, monthlyPrice: 159, yearlyPrice: 133, voiceMinutes: 250 },
      business: { price: 319, monthlyPrice: 319, yearlyPrice: 266, voiceMinutes: 600 },
    },
  },
  INR: {
    currency: "INR",
    symbol: "₹",
    marketName: "India",
    headlineHero: "Reply to every WhatsApp enquiry, even at 2 AM.",
    extraVoiceMinute: "₹10",
    extraConversations: "₹1,500",
    setupFee: "₹2,999",
    plans: {
      starter: { price: 2499, monthlyPrice: 2499, yearlyPrice: 2083, voiceMinutes: 0 },
      professional: { price: 6999, monthlyPrice: 6999, yearlyPrice: 5833, voiceMinutes: 150 },
      business: { price: 14999, monthlyPrice: 14999, yearlyPrice: 12499, voiceMinutes: 400 },
    },
  },
  EUR: {
    currency: "EUR",
    symbol: "€",
    marketName: "Europe",
    headlineHero: "Stop losing customers to voicemail.",
    extraVoiceMinute: "€0.40",
    extraConversations: "€22",
    setupFee: "€139",
    plans: {
      starter: { price: 75, monthlyPrice: 75, yearlyPrice: 63, voiceMinutes: 0 },
      professional: { price: 189, monthlyPrice: 189, yearlyPrice: 158, voiceMinutes: 250 },
      business: { price: 379, monthlyPrice: 379, yearlyPrice: 316, voiceMinutes: 600 },
    },
  },
};

/**
 * Backward compatibility alias for test suites and existing services
 */
export const REGIONAL_PRICING = {
  USD: REGIONAL_CONFIGS.USD.plans,
  GBP: REGIONAL_CONFIGS.GBP.plans,
  INR: REGIONAL_CONFIGS.INR.plans,
  EUR: REGIONAL_CONFIGS.EUR.plans,
};

/**
 * Base Plan Catalog Configurations (USD standard base)
 */
export const PLAN_CATALOG: Record<string, PlanConfig> = {
  starter: {
    id: "starter",
    name: "Starter",
    bestFor: "One-location businesses that want chat and WhatsApp booking",
    description: "Answer website and WhatsApp enquiries and book appointments automatically.",
    cardCopy: "Answer website and WhatsApp enquiries and book appointments automatically.",
    price: 79,
    monthlyPrice: 79,
    yearlyPrice: 66,
    currency: "USD",
    currencySymbol: "$",
    trialDays: 14,
    trialNote: "14-day free trial on Starter",
    highlight: false,
    badge: null,
    limits: {
      conversations: 500,
      voiceMinutes: 0,
      calendars: 1,
      knowledgeArticles: 20,
      teamMembers: 2,
      locations: 1,
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
      roiDashboard: false, // Basic analytics only
      advancedLeadQualification: false,
      crmWebhookIntegrations: false,
      customCallRouting: false,
      teamRolesAuditLog: false,
      dedicatedOnboarding: false,
      customAiTraining: false,
      analyticsExport: false,
      slaGuarantee: false,
    },
    usageLimitBehavior: "UPGRADE_REQUIRED",
  },

  professional: {
    id: "professional",
    name: "Pro",
    bestFor: "Clinics, salons and offices that want calls answered and fewer no-shows",
    description: "Everything in Starter, plus an AI phone receptionist, missed-call text-back, reminders and deposits.",
    cardCopy: "Everything in Starter, plus an AI phone receptionist, missed-call text-back, reminders and deposits.",
    price: 199,
    monthlyPrice: 199,
    yearlyPrice: 166,
    currency: "USD",
    currencySymbol: "$",
    trialDays: 7,
    trialNote: "7-day pilot with money-back guarantee",
    highlight: true,
    badge: "Most Popular",
    limits: {
      conversations: 2000,
      voiceMinutes: 250,
      calendars: 3,
      knowledgeArticles: 100,
      teamMembers: 5,
      locations: 1,
    },
    features: {
      websiteWidget: true,
      whatsapp: true,
      sms: true,
      email: true,
      instagramFacebook: true,
      voiceAI: true,
      missedCallTextBack: true,
      callRecordingsTranscripts: true,
      callTransfer: true,
      smsWhatsappReminders: true,
      depositsPaymentLinks: true,
      roiDashboard: true,
      advancedLeadQualification: true,
      crmWebhookIntegrations: false,
      customCallRouting: false,
      teamRolesAuditLog: false,
      dedicatedOnboarding: false,
      customAiTraining: true,
      analyticsExport: false,
      slaGuarantee: false,
    },
    usageLimitBehavior: "OVERAGE",
  },

  business: {
    id: "business",
    name: "Business",
    bestFor: "Multi-location practices and busy front desks",
    description: "Everything in Pro for up to 5 locations, with integrations, custom call routing and onboarding help.",
    cardCopy: "Everything in Pro for up to 5 locations, with integrations, custom call routing and onboarding help.",
    price: 399,
    monthlyPrice: 399,
    yearlyPrice: 333,
    currency: "USD",
    currencySymbol: "$",
    trialDays: 7,
    trialNote: "7-day pilot with money-back guarantee",
    highlight: false,
    badge: "Scale & Enterprise",
    limits: {
      conversations: 4000,
      voiceMinutes: 600,
      calendars: 10,
      knowledgeArticles: 500,
      teamMembers: 20,
      locations: 5,
    },
    features: {
      websiteWidget: true,
      whatsapp: true,
      sms: true,
      email: true,
      instagramFacebook: true,
      voiceAI: true,
      missedCallTextBack: true,
      callRecordingsTranscripts: true,
      callTransfer: true,
      smsWhatsappReminders: true,
      depositsPaymentLinks: true,
      roiDashboard: true,
      advancedLeadQualification: true,
      crmWebhookIntegrations: true,
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

  const regional = REGIONAL_CONFIGS[targetCurrency] || REGIONAL_CONFIGS.USD;
  const planKey = (basePlan.id === "business" ? "business" : basePlan.id === "professional" ? "professional" : "starter") as "starter" | "professional" | "business";
  const rates = regional.plans[planKey];

  return {
    ...basePlan,
    price: rates.price,
    monthlyPrice: rates.monthlyPrice,
    yearlyPrice: rates.yearlyPrice,
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
