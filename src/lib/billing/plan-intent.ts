import { cookies } from "next/headers";
import { db } from "@/server/db";
import { pendingCheckouts } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
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
 */
export function serializePlanIntent(data: PlanIntentData): string {
  return Buffer.from(JSON.stringify(data)).toString("base64");
}

/**
 * Parses and validates plan intent from cookie string.
 */
export function deserializePlanIntent(val?: string | null): PlanIntentData | null {
  if (!val) return null;
  try {
    const decoded = Buffer.from(val, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    return validatePlanIntent(parsed.planId, parsed.interval, parsed.currency);
  } catch {
    return null;
  }
}

/**
 * Server-side helper to read plan intent from cookies.
 */
export async function getPlanIntentFromCookies(): Promise<PlanIntentData | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(PLAN_INTENT_COOKIE);
    return deserializePlanIntent(cookie?.value);
  } catch {
    return null;
  }
}

/**
 * Server-side helper to set plan intent cookie.
 */
export async function setPlanIntentCookie(data: PlanIntentData): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(PLAN_INTENT_COOKIE, serializePlanIntent(data), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
  } catch (err) {
    console.warn("Failed to set plan intent cookie:", err);
  }
}

/**
 * Server-side helper to clear plan intent cookie once checkout is completed.
 */
export async function clearPlanIntentCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(PLAN_INTENT_COOKIE);
  } catch {
    // Ignore error
  }
}

/**
 * Persists or updates a pending checkout record for an authenticated user/org.
 */
export async function persistPendingCheckout(params: {
  userId: string;
  organizationId?: string | null;
  planId: "starter" | "professional" | "business";
  interval: AllowedInterval;
  currency?: SupportedCurrency;
}): Promise<string> {
  const currency = params.currency || "USD";

  // Check existing pending checkout
  const existing = await db
    .select()
    .from(pendingCheckouts)
    .where(
      and(
        eq(pendingCheckouts.userId, params.userId),
        eq(pendingCheckouts.status, "pending")
      )
    )
    .orderBy(desc(pendingCheckouts.createdAt))
    .limit(1);

  if (existing.length > 0) {
    const id = existing[0].id;
    await db
      .update(pendingCheckouts)
      .set({
        planId: params.planId,
        interval: params.interval,
        currency,
        organizationId: params.organizationId || existing[0].organizationId,
        updatedAt: new Date(),
      })
      .where(eq(pendingCheckouts.id, id));
    return id;
  }

  const [created] = await db
    .insert(pendingCheckouts)
    .values({
      userId: params.userId,
      organizationId: params.organizationId || null,
      planId: params.planId,
      interval: params.interval,
      currency,
      status: "pending",
    })
    .returning();

  return created.id;
}

/**
 * Retrieves the latest pending checkout for a user.
 */
export async function getPendingCheckoutForUser(userId: string) {
  const [checkout] = await db
    .select()
    .from(pendingCheckouts)
    .where(
      and(
        eq(pendingCheckouts.userId, userId),
        eq(pendingCheckouts.status, "pending")
      )
    )
    .orderBy(desc(pendingCheckouts.createdAt))
    .limit(1);

  return checkout || null;
}

