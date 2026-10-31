/**
 * Operator Authoritative Billing & Plan Catalog
 * Single Source of Truth for Plan Configurations, Pricing, Limits, and Entitlements.
 *
 * Requirements P1-P9:
 * - All base prices stored as integer minor units in USD (cents).
 * - Regional currencies: USD ($), GBP (£), INR (₹).
 * - Exact regional plan/usage factors and P3 rounding rules.
 * - P4 entitlements & limits per billing period.
 * - P5 feature access matrix with Honesty Rule.
 */

export type PlanId = "starter" | "professional" | "business";

export type BillingInterval = "monthly" | "yearly";

export type SupportedCurrency = "USD" | "GBP" | "INR";

export interface PlanLimits {
  conversations: number;
  voiceMinutes: number; // Region-specific: US/UK vs India
  trialVoiceMinutes: number; // 30 mins during trial for Pro/Business, 0 for Starter
  locations: number;
  teamMembers: number; // Staff members with schedules
  knowledgeArticles: number;
  support: string;
}

export interface PlanFeatures {
  websiteWidget: boolean;
  whatsapp: boolean;
  aiAnswers: boolean;
  appointmentBooking: boolean; // Business-wide external calendar sync
  leadCaptureInbox: boolean;
  emailAlertsHandoff: boolean;
  emailReminders: boolean;
  voiceAI: boolean; // Phone calls start at Pro
  missedCallTextBack: boolean; // Coming soon (Honesty Rule)
  callRecordingsTranscripts: boolean;
  callTransfer: boolean;
  smsWhatsappReminders: boolean;
  noShowRecovery: boolean; // Coming soon (Honesty Rule)
  depositsPaymentLinks: boolean;
  roiDashboard: "basic" | "full" | "full_csv";
  crmWebhookIntegrations: boolean; // Coming soon (Honesty Rule)
  customCallRouting: boolean;
  teamRolesAuditLog: boolean;
  onboardingCall: boolean;
}

export interface BasePlanItem {
  id: PlanId;
  name: string;
  displayName: string;
  bestFor: string;
  description: string;
  baseMonthlyUSD: number; // Minor units (cents), e.g. 7900 ($79)
  baseYearlyUSD: number; // Minor units (cents), 10 x monthly = 79000 ($790)
  highlight?: boolean;
  badge?: string | null;
  limits: {
    conversations: number;
    voiceMinutesByRegion: Record<SupportedCurrency, number>;
    trialVoiceMinutes: number;
    locations: number;
    teamMembers: number;
    knowledgeArticles: number;
    support: string;
  };
  features: PlanFeatures;
}

// P2: Base Prices in USD minor units (cents)
export const BASE_PRICES_USD = {
  starter: {
    monthly: 7900, // $79
    yearly: 79000, // $790 (10x monthly)
  },
  professional: {
    monthly: 19900, // $199
    yearly: 199000, // $1,990
  },
  business: {
    monthly: 39900, // $399
    yearly: 399000, // $3,990
  },
  setupFee: 14900, // $149
  voiceOveragePerMin: 45, // $0.45 / min (45 cents)
  extra500Conversations: 2500, // $25 (2500 cents)
} as const;

// P3: Regional Factors & Config
export interface RegionConfig {
  currency: SupportedCurrency;
  symbol: string;
  locale: string;
  paymentProvider: "stripe" | "razorpay";
  planFactor: number;
  usageFactor: number;
}

export const REGION_CONFIGS: Record<SupportedCurrency, RegionConfig> = {
  USD: {
    currency: "USD",
    symbol: "$",
    locale: "en-US",
    paymentProvider: "stripe",
    planFactor: 1.0,
    usageFactor: 1.0,
  },
  GBP: {
    currency: "GBP",
    symbol: "£",
    locale: "en-GB",
    paymentProvider: "stripe",
    planFactor: 1.0,
    usageFactor: 1.0,
  },
  INR: {
    currency: "INR",
    symbol: "₹",
    locale: "en-IN",
    paymentProvider: "razorpay",
    planFactor: 0.33,
    usageFactor: 0.6,
  },
};

export const REGIONAL_FACTORS = {
  USD: { plan: 1.0, usage: 1.0 },
  GBP: { plan: 1.0, usage: 1.0 },
  INR: { plan: 0.33, usage: 0.6 },
};

// P9: Cost Guard Unit Costs (in USD dollars)
export const UNIT_COSTS_USD = {
  voicePerMinute: 0.18,
  conversation: 0.014,
  fixedPerCustomerMonth: 6.0,
  paymentFeePercentage: 0.03, // 3%
  typicalUsagePercentage: 0.6, // 60%
} as const;

// P3: Rounding Rules
export function roundPlanPrice(rawMajor: number, currency: SupportedCurrency): number {
  if (currency === "USD") {
    return Math.round(rawMajor);
  }
  if (currency === "GBP") {
    // Nearest 10 minus 1
    return Math.round(rawMajor / 10) * 10 - 1;
  }
  if (currency === "INR") {
    // Nearest 500 minus 1
    return Math.round(rawMajor / 500) * 500 - 1;
  }
  return Math.round(rawMajor);
}

export function roundUsagePrice(rawMajor: number, currency: SupportedCurrency): number {
  if (currency === "USD" || currency === "GBP") {
    // Nearest 0.05
    return Number((Math.round(rawMajor / 0.05) * 0.05).toFixed(2));
  }
  if (currency === "INR") {
    // Nearest 1
    return Math.round(rawMajor);
  }
  return rawMajor;
}

export function roundExtraConversationsPrice(rawMajor: number, currency: SupportedCurrency): number {
  if (currency === "USD" || currency === "GBP") {
    // Nearest 1
    return Math.round(rawMajor);
  }
  if (currency === "INR") {
    // Nearest 10
    return Math.round(rawMajor / 10) * 10;
  }
  return Math.round(rawMajor);
}

// Compute prices for a currency given live exchange rate
export function computeRegionalPrices(currency: SupportedCurrency, fxRatePerUsd: number) {
  const config = REGION_CONFIGS[currency];
  const planFactor = config.planFactor;
  const usageFactor = config.usageFactor;

  // Starter
  const starterMoRaw = (BASE_PRICES_USD.starter.monthly / 100) * planFactor * fxRatePerUsd;
  const starterMoMajor = roundPlanPrice(starterMoRaw, currency);
  const starterYrRaw = (BASE_PRICES_USD.starter.yearly / 100) * planFactor * fxRatePerUsd;
  const starterYrMajor = roundPlanPrice(starterYrRaw, currency);

  // Pro
  const proMoRaw = (BASE_PRICES_USD.professional.monthly / 100) * planFactor * fxRatePerUsd;
  const proMoMajor = roundPlanPrice(proMoRaw, currency);
  const proYrRaw = (BASE_PRICES_USD.professional.yearly / 100) * planFactor * fxRatePerUsd;
  const proYrMajor = roundPlanPrice(proYrRaw, currency);

  // Business
  const bizMoRaw = (BASE_PRICES_USD.business.monthly / 100) * planFactor * fxRatePerUsd;
  const bizMoMajor = roundPlanPrice(bizMoRaw, currency);
  const bizYrRaw = (BASE_PRICES_USD.business.yearly / 100) * planFactor * fxRatePerUsd;
  const bizYrMajor = roundPlanPrice(bizYrRaw, currency);

  // Setup fee
  const setupRaw = (BASE_PRICES_USD.setupFee / 100) * planFactor * fxRatePerUsd;
  const setupMajor = roundPlanPrice(setupRaw, currency);

  // Voice overage per minute
  const overageRaw = (BASE_PRICES_USD.voiceOveragePerMin / 100) * usageFactor * fxRatePerUsd;
  const overageMajor = roundUsagePrice(overageRaw, currency);

  // Extra 500 conversations
  const extraConvsRaw = (BASE_PRICES_USD.extra500Conversations / 100) * usageFactor * fxRatePerUsd;
  const extraConvsMajor = roundExtraConversationsPrice(extraConvsRaw, currency);

  return {
    currency,
    symbol: config.symbol,
    fxRateUsed: fxRatePerUsd,
    planFactor,
    usageFactor,
    plans: {
      starter: {
        monthlyMajor: starterMoMajor,
        monthlyMinor: Math.round(starterMoMajor * 100),
        yearlyMajor: starterYrMajor,
        yearlyMinor: Math.round(starterYrMajor * 100),
      },
      professional: {
        monthlyMajor: proMoMajor,
        monthlyMinor: Math.round(proMoMajor * 100),
        yearlyMajor: proYrMajor,
        yearlyMinor: Math.round(proYrMajor * 100),
      },
      business: {
        monthlyMajor: bizMoMajor,
        monthlyMinor: Math.round(bizMoMajor * 100),
        yearlyMajor: bizYrMajor,
        yearlyMinor: Math.round(bizYrMajor * 100),
      },
    },
    setupFee: {
      major: setupMajor,
      minor: Math.round(setupMajor * 100),
    },
    voiceOveragePerMinute: {
      major: overageMajor,
      minor: Math.round(overageMajor * 100),
    },
    extra500Conversations: {
      major: extraConvsMajor,
      minor: Math.round(extraConvsMajor * 100),
    },
  };
}

// P9: Cost Guard Evaluation
export function evaluateCostGuard(currency: SupportedCurrency, fxRatePerUsd: number, prices: ReturnType<typeof computeRegionalPrices>) {
  const unitVoice = UNIT_COSTS_USD.voicePerMinute * fxRatePerUsd;
  const unitConv = UNIT_COSTS_USD.conversation * fxRatePerUsd;
  const unitFixed = UNIT_COSTS_USD.fixedPerCustomerMonth * fxRatePerUsd;
  const feePct = UNIT_COSTS_USD.paymentFeePercentage;
  const typPct = UNIT_COSTS_USD.typicalUsagePercentage;

  const planResults: Record<
    PlanId,
    {
      priceMajor: number;
      typicalMarginPct: number;
      typicalPass: boolean;
      fullMarginPct: number;
      fullPass: boolean;
    }
  > = {} as any;

  const planLimits: Record<PlanId, { convs: number; voice: number }> = {
    starter: { convs: 500, voice: 0 },
    professional: { convs: 2000, voice: currency === "INR" ? 100 : 250 },
    business: { convs: 4000, voice: currency === "INR" ? 300 : 600 },
  };

  for (const planId of ["starter", "professional", "business"] as PlanId[]) {
    const price = prices.plans[planId].monthlyMajor;
    const limits = planLimits[planId];

    // Typical 60%
    const typCost = limits.voice * typPct * unitVoice + limits.convs * typPct * unitConv + unitFixed + price * feePct;
    const typMargin = (price - typCost) / price;

    // Full 100%
    const fullCost = limits.voice * 1.0 * unitVoice + limits.convs * 1.0 * unitConv + unitFixed + price * feePct;
    const fullMargin = (price - fullCost) / price;

    planResults[planId] = {
      priceMajor: price,
      typicalMarginPct: typMargin * 100,
      typicalPass: typMargin >= 0.4,
      fullMarginPct: fullMargin * 100,
      fullPass: fullMargin > 0,
    };
  }

  // Usage price checks
  const minOverage = unitVoice * 1.5;
  const overagePass = prices.voiceOveragePerMinute.major >= minOverage;

  const minExtraConvs = 500 * unitConv * 1.5;
  const extraConvsPass = prices.extra500Conversations.major >= minExtraConvs;

  const allPassed =
    Object.values(planResults).every((p) => p.typicalPass && p.fullPass) && overagePass && extraConvsPass;

  return {
    currency,
    allPassed,
    plans: planResults,
    usage: {
      voiceOverage: {
        price: prices.voiceOveragePerMinute.major,
        minRequired: minOverage,
        passed: overagePass,
      },
      extra500Convs: {
        price: prices.extra500Conversations.major,
        minRequired: minExtraConvs,
        passed: extraConvsPass,
      },
    },
  };
}

// Currency Display Helper with Indian Lakh/Crore and standard formatting
export function formatMoney(amountMinor: number, currency: string, options?: { showZeroMinor?: boolean }): string {
  const cur = (currency || "USD").toUpperCase();
  const major = amountMinor / 100;
  const locale = cur === "INR" ? "en-IN" : cur === "GBP" ? "en-GB" : "en-US";
  const hasDecimals = amountMinor % 100 !== 0;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: cur,
    minimumFractionDigits: hasDecimals || options?.showZeroMinor ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(major);
}

// Master Plan Specifications (P1, P4, P5)
export const MASTER_PLANS: Record<PlanId, BasePlanItem> = {
  starter: {
    id: "starter",
    name: "starter",
    displayName: "Starter",
    bestFor: "One-location businesses that want automated chat & WhatsApp booking",
    description: "Answer website and WhatsApp enquiries and book appointments automatically 24/7.",
    baseMonthlyUSD: BASE_PRICES_USD.starter.monthly,
    baseYearlyUSD: BASE_PRICES_USD.starter.yearly,
    highlight: false,
    badge: null,
    limits: {
      conversations: 500,
      voiceMinutesByRegion: { USD: 0, GBP: 0, INR: 0 },
      trialVoiceMinutes: 0,
      locations: 1,
      teamMembers: 1,
      knowledgeArticles: 20,
      support: "Email support",
    },
    features: {
      websiteWidget: true,
      whatsapp: true,
      aiAnswers: true,
      appointmentBooking: true,
      leadCaptureInbox: true,
      emailAlertsHandoff: true,
      emailReminders: true,
      voiceAI: false, // Phone calls start at Pro
      missedCallTextBack: false,
      callRecordingsTranscripts: false,
      callTransfer: false,
      smsWhatsappReminders: false,
      noShowRecovery: false,
      depositsPaymentLinks: false,
      roiDashboard: "basic",
      crmWebhookIntegrations: false,
      customCallRouting: false,
      teamRolesAuditLog: false,
      onboardingCall: false,
    },
  },
  professional: {
    id: "professional",
    name: "professional",
    displayName: "Pro",
    bestFor: "Growing businesses needing a full AI phone receptionist + WhatsApp",
    description: "Never miss a customer call or inquiry. Includes 24/7 phone answering and staff transfer.",
    baseMonthlyUSD: BASE_PRICES_USD.professional.monthly,
    baseYearlyUSD: BASE_PRICES_USD.professional.yearly,
    highlight: true,
    badge: "Most Popular",
    limits: {
      conversations: 2000,
      voiceMinutesByRegion: { USD: 250, GBP: 250, INR: 100 },
      trialVoiceMinutes: 30,
      locations: 1,
      teamMembers: 3,
      knowledgeArticles: 100,
      support: "Priority email support",
    },
    features: {
      websiteWidget: true,
      whatsapp: true,
      aiAnswers: true,
      appointmentBooking: true,
      leadCaptureInbox: true,
      emailAlertsHandoff: true,
      emailReminders: true,
      voiceAI: true,
      missedCallTextBack: false, // Coming soon
      callRecordingsTranscripts: true,
      callTransfer: true,
      smsWhatsappReminders: true,
      noShowRecovery: false, // Coming soon
      depositsPaymentLinks: true,
      roiDashboard: "full",
      crmWebhookIntegrations: false, // Coming soon
      customCallRouting: false,
      teamRolesAuditLog: false,
      onboardingCall: false,
    },
  },
  business: {
    id: "business",
    name: "business",
    displayName: "Business",
    bestFor: "Multi-location clinics, salons, and offices requiring custom rules",
    description: "Enterprise receptionist with multi-location scheduling, custom routing rules, and audit logs.",
    baseMonthlyUSD: BASE_PRICES_USD.business.monthly,
    baseYearlyUSD: BASE_PRICES_USD.business.yearly,
    highlight: false,
    badge: "Scale",
    limits: {
      conversations: 4000,
      voiceMinutesByRegion: { USD: 600, GBP: 600, INR: 300 },
      trialVoiceMinutes: 30,
      locations: 5,
      teamMembers: 10,
      knowledgeArticles: 500,
      support: "Priority email + dedicated onboarding call",
    },
    features: {
      websiteWidget: true,
      whatsapp: true,
      aiAnswers: true,
      appointmentBooking: true,
      leadCaptureInbox: true,
      emailAlertsHandoff: true,
      emailReminders: true,
      voiceAI: true,
      missedCallTextBack: false, // Coming soon
      callRecordingsTranscripts: true,
      callTransfer: true,
      smsWhatsappReminders: true,
      noShowRecovery: false, // Coming soon
      depositsPaymentLinks: true,
      roiDashboard: "full_csv",
      crmWebhookIntegrations: false, // Coming soon
      customCallRouting: true,
      teamRolesAuditLog: true,
      onboardingCall: true,
    },
  },
};

// Aliases lookup
export function normalizePlanId(rawId?: string | null): PlanId {
  const norm = (rawId || "starter").toLowerCase().trim();
  if (norm === "pro" || norm === "professional") return "professional";
  if (norm === "business" || norm === "biz" || norm === "enterprise") return "business";
  return "starter";
}

// Allowlist validator
export function isAllowedPlanId(planId: string): planId is PlanId {
  const norm = planId.toLowerCase().trim();
  return ["starter", "pro", "professional", "business"].includes(norm);
}

export function isAllowedInterval(interval: string): interval is BillingInterval {
  const norm = interval.toLowerCase().trim();
  return ["monthly", "yearly"].includes(norm);
}
