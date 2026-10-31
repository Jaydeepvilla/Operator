import type { SupportedCurrency } from "./catalog";

export const ALLOWED_PLANS = ["starter", "pro", "professional", "business"] as const;
export type AllowedPlanInput = (typeof ALLOWED_PLANS)[number];

export const ALLOWED_INTERVALS = ["monthly", "yearly"] as const;
export type AllowedInterval = (typeof ALLOWED_INTERVALS)[number];

export const PLAN_INTENT_COOKIE = "operator_plan_intent";

export interface PlanIntentData {
  planId: "starter" | "professional" | "business";
  interval: AllowedInterval;
  currency?: SupportedCurrency;
}

/**
 * Normalizes and validates plan intent parameters.
 * Returns null if invalid.
 */
export function validatePlanIntent(
  plan?: string | null,
  interval?: string | null,
  currency?: string | null
): PlanIntentData | null {
  if (!plan) return null;
  const normalizedPlan = plan.toLowerCase().trim();
  let resolvedPlanId: "starter" | "professional" | "business";

  if (normalizedPlan === "starter") {
    resolvedPlanId = "starter";
  } else if (normalizedPlan === "pro" || normalizedPlan === "professional") {
    resolvedPlanId = "professional";
  } else if (normalizedPlan === "business") {
    resolvedPlanId = "business";
  } else {
    return null;
  }

  const normalizedInterval = (interval?.toLowerCase().trim() as AllowedInterval) || "monthly";
  const resolvedInterval: AllowedInterval = normalizedInterval === "yearly" ? "yearly" : "monthly";

  let resolvedCurrency: SupportedCurrency | undefined = undefined;
  if (currency) {
    const curUpper = currency.toUpperCase().trim();
    if (curUpper === "USD" || curUpper === "GBP" || curUpper === "INR") {
      resolvedCurrency = curUpper as SupportedCurrency;
    }
  }

  return {
    planId: resolvedPlanId,
    interval: resolvedInterval,
    currency: resolvedCurrency,
  };
}

/**
 * Serializes plan intent into a signed/encoded string for cookie storage.
 * Works seamlessly across both Node.js and Browser environments.
 */
export function serializePlanIntent(data: PlanIntentData): string {
  const jsonStr = JSON.stringify(data);
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    return window.btoa(unescape(encodeURIComponent(jsonStr)));
  }
  return Buffer.from(jsonStr).toString("base64");
}

/**
 * Parses and validates plan intent from cookie string.
 * Works seamlessly across both Node.js and Browser environments.
 */
export function deserializePlanIntent(val?: string | null): PlanIntentData | null {
  if (!val) return null;
  try {
    let decoded = "";
    if (typeof window !== "undefined" && typeof window.atob === "function") {
      decoded = decodeURIComponent(escape(window.atob(val)));
    } else {
      decoded = Buffer.from(val, "base64").toString("utf-8");
    }
    const parsed = JSON.parse(decoded);
    return validatePlanIntent(parsed.planId, parsed.interval, parsed.currency);
  } catch {
    return null;
  }
}
