"use server";

import { revalidatePath } from "next/cache";
import { billingRepository } from "../repositories/billing";
import { financialMetricsService } from "../services/billing/financial-metrics";
import { db } from "../db";
import { eq, desc, and } from "drizzle-orm";
import { 
  subscriptions, 
  billingAccounts, 
  payments, 
  invoices, 
  businessPaymentSettings, 
  organizations 
} from "../db/schema";
import { ProviderRegistry } from "../services/billing/providers/registry";
import "../services/billing/providers/stripe"; // Load provider registration
import { 
  getPaymentProviderStatus, 
  requirePaymentProviderConfiguration,
  formatControlledBillingError,
  generateCorrelationId,
  CheckoutValidationError,
  PaymentUnavailableError
} from "../services/billing/config";
import { requireOrganizationAccess } from "@/lib/auth/server";

async function getVerifiedOrgContext() {
  const { organizationId, userId } = await requireOrganizationAccess();
  return { organizationId, userId };
}

/**
 * Returns public-safe configuration status for the organization's billing provider.
 */
export async function getPaymentConfigStatusAction(providerId = "stripe") {
  try {
    const { organizationId } = await getVerifiedOrgContext();
    const status = await getPaymentProviderStatus(providerId, organizationId);
    return { success: true, status };
  } catch (error: any) {
    const controlled = formatControlledBillingError(error);
    return controlled;
  }
}

import { subscriptionEngine } from "../services/billing/subscription-engine";
import { getPlan, PLAN_CATALOG, getAllPlans } from "@/lib/billing/plans";

/**
 * Loads billing portal dashboard data using the central dynamic SubscriptionEngine.
 */
export async function getBillingPortalDataAction() {
  try {
    const { organizationId } = await getVerifiedOrgContext();
    
    // Resolve dynamic subscription status from SubscriptionEngine
    const dynamicStatus = await subscriptionEngine.getSubscriptionStatus(organizationId);

    // Resolve customer billing account
    let account = await billingRepository.getBillingAccount(organizationId);
    if (!account) {
      account = await billingRepository.createBillingAccount({
        organizationId,
        email: "billing@customer.com",
        currency: "USD",
      });
    }

    const invoicesList = await billingRepository.getInvoices(account.id);
    const paymentsList = await billingRepository.getPayments(account.id);
    const counters = await billingRepository.getUsageCounters(organizationId);
    const paymentStatus = await getPaymentProviderStatus("stripe", organizationId);

    return {
      success: true,
      subscription: {
        id: organizationId,
        organizationId,
        planId: dynamicStatus.planId,
        status: dynamicStatus.state.toLowerCase(),
        state: dynamicStatus.state,
        currentPeriodStart: dynamicStatus.currentPeriodStart,
        currentPeriodEnd: dynamicStatus.currentPeriodEnd,
        cancelAtPeriodEnd: dynamicStatus.cancelAtPeriodEnd,
        trialDaysRemaining: dynamicStatus.trialDaysRemaining,
        trialStartedAt: dynamicStatus.trialStartedAt,
        trialEndsAt: dynamicStatus.trialEndsAt,
        gracePeriodDaysRemaining: dynamicStatus.gracePeriodDaysRemaining,
        isRestricted: dynamicStatus.isRestricted,
        plan: dynamicStatus.plan,
        usage: dynamicStatus.usage,
      },
      availablePlans: getAllPlans(),
      account,
      invoices: invoicesList,
      payments: paymentsList,
      usageCounters: counters,
      paymentStatus,
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "We couldn't load your billing details. Refresh the page or try again shortly." };
  }
}

/**
 * Initiates a hosted online checkout session with full configuration validation.
 */
export async function createCheckoutSessionAction(params: {
  planId: string;
  successUrl?: string;
  cancelUrl?: string;
}) {
  const correlationId = generateCorrelationId();
  const { planId } = params;

  try {
    const { organizationId } = await getVerifiedOrgContext();

    // 1. Validate Plan ID
    const validPlans = ["starter", "pro", "business", "enterprise"];
    if (!planId || !validPlans.includes(planId.toLowerCase())) {
      throw new CheckoutValidationError(`Invalid plan selection: ${planId || "none"}.`, {
        correlationId,
      });
    }

    // 2. Select Payment Provider (Razorpay as primary or fallback)
    const providerName = (process.env.RAZORPAY_KEY_ID || !process.env.STRIPE_SECRET_KEY) ? "razorpay" : "stripe";
    
    // 3. Resolve customer billing account
    let account = await billingRepository.getBillingAccount(organizationId);
    if (!account) {
      account = await billingRepository.createBillingAccount({
        organizationId,
        email: "billing@customer.com",
        currency: providerName === "razorpay" ? "INR" : "USD",
      });
    }

    const host = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const baseOrigin = host.startsWith("http") ? host : `https://${host}`;

    if (providerName === "razorpay") {
      const rzp = ProviderRegistry.getSubscriptionProvider("razorpay");
      const session = await rzp.createCheckoutSession!({
        organizationId,
        customerId: account.razorpayCustomerId || undefined,
        customerEmail: account.email,
        priceId: `plan_${planId}`,
        mode: "subscription",
        successUrl: params.successUrl || `${baseOrigin}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: params.cancelUrl || `${baseOrigin}/billing?checkout=cancelled`,
        metadata: {
          organizationId,
          planId,
          correlationId,
        },
      });

      return {
        success: true,
        url: session.url,
        sessionId: session.id,
        correlationId,
      };
    }

    // 4. Resolve Stripe Provider
    const stripe = ProviderRegistry.getSubscriptionProvider("stripe");
    if (!stripe.createCheckoutSession) {
      throw new PaymentUnavailableError("Checkout sessions are not supported by the configured provider.", {
        correlationId,
      });
    }

    const priceId = process.env[`STRIPE_PRICE_${planId.toUpperCase()}`] || `price_${planId}`;

    const session = await stripe.createCheckoutSession({
      organizationId,
      customerId: account.stripeCustomerId || undefined,
      customerEmail: account.email,
      priceId,
      mode: "subscription",
      successUrl: params.successUrl || `${baseOrigin}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: params.cancelUrl || `${baseOrigin}/billing?checkout=cancelled`,
      metadata: {
        organizationId,
        planId,
        correlationId,
      },
    });

    return {
      success: true,
      url: session.url,
      sessionId: session.id,
      correlationId,
    };
  } catch (error: any) {
    const controlled = formatControlledBillingError(error, correlationId);
    return controlled;
  }
}

/**
 * Dynamic plan change action: determines upgrade vs downgrade.
 * If downgrade and current usage exceeds target limits, schedules downgrade at period end.
 * If upgrade, unlocks features and raises limits immediately.
 */
export async function upgradeSubscriptionAction(newPlanId: string) {
  const correlationId = generateCorrelationId();
  try {
    const { organizationId } = await getVerifiedOrgContext();
    const currentStatus = await subscriptionEngine.getSubscriptionStatus(organizationId);

    const targetPlan = getPlan(newPlanId);
    const currentPlan = currentStatus.plan;

    // Determine if this is an upgrade or a downgrade
    const isDowngrade = targetPlan.price < currentPlan.price;

    if (isDowngrade) {
      const result = await subscriptionEngine.downgradePlan(organizationId, targetPlan.id);
      revalidatePath("/billing");
      return {
        success: true as const,
        scheduledAtPeriodEnd: result.scheduledAtPeriodEnd,
        message: result.message,
        correlationId,
      };
    }

    // Upgrade immediately
    await subscriptionEngine.upgradePlan(organizationId, targetPlan.id);
    revalidatePath("/billing");
    return {
      success: true as const,
      scheduledAtPeriodEnd: false,
      message: `Upgraded to ${targetPlan.name} plan successfully!`,
      correlationId,
    };
  } catch (error: any) {
    const controlled = formatControlledBillingError(error, correlationId);
    return controlled;
  }
}

/**
 * Subscription cancellation request:
 * Keeps subscription active until current period end according to SaaS best practices.
 */
export async function cancelSubscriptionAction() {
  const correlationId = generateCorrelationId();
  try {
    const { organizationId } = await getVerifiedOrgContext();
    const canceledSub = await subscriptionEngine.requestCancellation(organizationId);

    revalidatePath("/billing");
    return { 
      success: true as const, 
      periodEnd: canceledSub.currentPeriodEnd,
      correlationId 
    };
  } catch (error: any) {
    const controlled = formatControlledBillingError(error, correlationId);
    return controlled;
  }
}

/**
 * Revokes scheduled cancellation and restores active status seamlessly.
 */
export async function revokeCancellationAction() {
  const correlationId = generateCorrelationId();
  try {
    const { organizationId } = await getVerifiedOrgContext();
    await subscriptionEngine.revokeCancellation(organizationId);

    revalidatePath("/billing");
    return { success: true as const, correlationId };
  } catch (error: any) {
    const controlled = formatControlledBillingError(error, correlationId);
    return controlled;
  }
}

/**
 * Returns the dynamic real-time subscription status.
 */
export async function getDynamicSubscriptionStatusAction() {
  try {
    const { organizationId } = await getVerifiedOrgContext();
    const status = await subscriptionEngine.getSubscriptionStatus(organizationId);
    return { success: true, status };
  } catch (error: any) {
    return { success: false, error: error?.message || "We couldn't load your subscription status. Refresh the page to retry." };
  }
}

// --- Coupons & Analytics ---
export async function getCouponsAction() {
  try {
    const couponsList = await billingRepository.getCoupons();
    return { success: true, coupons: couponsList };
  } catch (error: any) {
    return { success: false, error: error?.message || "We couldn't load available promotional codes." };
  }
}

export async function createCouponAction(data: {
  code: string;
  type: string;
  value: string;
  expirationDays?: number;
}) {
  try {
    const expirationDate = data.expirationDays 
      ? new Date(Date.now() + data.expirationDays * 24 * 60 * 60 * 1000) 
      : null;

    const coupon = await billingRepository.createCoupon({
      code: data.code.toUpperCase(),
      type: data.type,
      value: data.value,
      expirationDate,
      usageLimit: 100,
    });

    revalidatePath("/agency/billing");
    return { success: true, coupon };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save discount coupon" };
  }
}

export async function getRevenueMetricsAction() {
  try {
    const metrics = await financialMetricsService.calculateRealtimeMetrics();
    return { 
      success: true, 
      metrics: {
        ...metrics,
        mrr: `$${metrics.mrr.toLocaleString()}.00`,
        arr: `$${metrics.arr.toLocaleString()}.00`,
        churnRate: `${metrics.churnRate}%`,
        ltv: `$${metrics.ltv.toLocaleString()}.00`,
        arpu: `$${metrics.arpu.toLocaleString()}.00`,
        netRevenue: `$${metrics.netRevenue.toLocaleString()}.00`,
        grossRevenue: `$${metrics.grossRevenue.toLocaleString()}.00`,
      }
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to compile financial metrics" };
  }
}

// ── Global Billing Infrastructure Actions ──

import { PaymentRecommendationEngine } from "../services/billing/recommendation";

export async function getPaymentProvidersAction() {
  try {
    const { organizationId } = await getVerifiedOrgContext();

    // 1. Get organization profile context
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!org) {
      throw new Error("Business account not found");
    }

    // 2. Perform region, currency and language auto-detection
    let country = "US";
    let currency = "USD";
    let language = "en";

    const timezoneLower = org.timezone.toLowerCase();
    const addressLower = (org.address || "").toLowerCase();

    if (timezoneLower.includes("kolkata") || timezoneLower.includes("calcutta") || addressLower.includes("india") || addressLower.includes("in")) {
      country = "IN";
      currency = "INR";
      language = "hi";
    } else if (timezoneLower.includes("europe") || addressLower.includes("germany") || addressLower.includes("france") || addressLower.includes("de")) {
      country = "DE";
      currency = "EUR";
      language = "de";
    }

    // 3. Query compatible providers
    const compat = await PaymentRecommendationEngine.getCompatibleProviders({
      country,
      currency,
      language,
    });

    // 4. Fetch current business connection settings
    const activeConnections = await db.query.businessPaymentSettings.findMany({
      where: eq(businessPaymentSettings.organizationId, organizationId),
    });

    // 5. Get system status
    const status = await getPaymentProviderStatus("stripe", organizationId);

    return {
      success: true,
      country,
      currency,
      language,
      recommended: compat.recommended,
      supported: compat.supported,
      connections: activeConnections,
      systemStatus: status,
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "We couldn't load your payment provider settings." };
  }
}

export async function updateProviderSettingsAction(data: {
  providerId: string;
  connectionStatus: "connected" | "disconnected" | "pending_verification";
  isSandbox: boolean;
  credentials: Record<string, string>;
}) {
  try {
    const { organizationId } = await getVerifiedOrgContext();

    // Check if configuration already exists
    const existing = await db.query.businessPaymentSettings.findFirst({
      where: and(
        eq(businessPaymentSettings.organizationId, organizationId),
        eq(businessPaymentSettings.providerId, data.providerId)
      ),
    });

    if (existing) {
      await db
        .update(businessPaymentSettings)
        .set({
          connectionStatus: data.connectionStatus,
          isSandbox: data.isSandbox,
          credentials: data.credentials,
          updatedAt: new Date(),
        })
        .where(eq(businessPaymentSettings.id, existing.id));
    } else {
      await db
        .insert(businessPaymentSettings)
        .values({
          organizationId,
          providerId: data.providerId,
          connectionStatus: data.connectionStatus,
          isSandbox: data.isSandbox,
          credentials: data.credentials,
        });
    }

    revalidatePath("/billing");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save payment settings" };
  }
}

/**
 * Returns real-time aggregated financial indicators (MRR, ARR, LTV, ARPU, Churn)
 */
export async function getRealtimeFinancialMetricsAction() {
  try {
    const { organizationId } = await getVerifiedOrgContext();
    const metrics = await financialMetricsService.calculateRealtimeMetrics(organizationId);
    return { success: true, data: metrics };
  } catch (error: any) {
    console.error("getRealtimeFinancialMetricsAction error:", error);
    return { success: false, error: error?.message || "Failed to compute financial metrics" };
  }
}

/**
 * Returns all generated invoice records and line items for the organization.
 */
export async function getOrganizationInvoicesAction() {
  try {
    const { organizationId } = await getVerifiedOrgContext();
    
    // Find billing account
    const acc = await db.query.billingAccounts.findFirst({
      where: eq(billingAccounts.organizationId, organizationId),
    });

    if (!acc) {
      return { success: true, invoices: [] };
    }

    const orgInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.billingAccountId, acc.id))
      .orderBy(desc(invoices.createdAt));

    return { success: true, invoices: orgInvoices };
  } catch (error: any) {
    console.error("getOrganizationInvoicesAction error:", error);
    return { success: false, error: error?.message || "We couldn't load your invoice history. Try again shortly.", invoices: [] };
  }
}
