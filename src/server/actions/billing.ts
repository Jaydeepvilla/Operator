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

/**
 * Loads billing portal dashboard data with safe fallback seeding.
 */
export async function getBillingPortalDataAction() {
  try {
    const { organizationId } = await getVerifiedOrgContext();
    
    // Resolve subscription
    let sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, organizationId),
    });

    // Seed default free subscription if none exists
    if (!sub) {
      const [newSub] = await db
        .insert(subscriptions)
        .values({
          organizationId,
          planId: "free",
          status: "trialing",
        })
        .returning();
      sub = newSub;
    }

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
      subscription: sub,
      account,
      invoices: invoicesList,
      payments: paymentsList,
      usageCounters: counters,
      paymentStatus,
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load billing portal details" };
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
 * Direct subscription upgrade action with strict configuration validation.
 */
export async function upgradeSubscriptionAction(planId: string) {
  const correlationId = generateCorrelationId();
  try {
    const { organizationId } = await getVerifiedOrgContext();
    
    const validPlans = ["starter", "pro", "business", "enterprise"];
    if (!planId || !validPlans.includes(planId.toLowerCase())) {
      throw new CheckoutValidationError(`Invalid plan selection: ${planId || "none"}.`, {
        correlationId,
      });
    }

    let sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, organizationId),
    });

    if (!sub) {
      throw new CheckoutValidationError("No existing subscription record found for organization.", {
        correlationId,
      });
    }

    // Check payment provider configuration state first
    const paymentStatus = await getPaymentProviderStatus("stripe", organizationId);
    if (!paymentStatus.isAvailable) {
      console.warn(`[Billing Upgrade] Configuration unavailable for org ${organizationId}. Missing: ${paymentStatus.missingFields.join(", ")}. Correlation: ${correlationId}`);
      return {
        success: false as const,
        code: (paymentStatus.state === "DISABLED" ? "PAYMENT_PROVIDER_DISABLED" : "PAYMENT_CONFIGURATION_UNAVAILABLE") as any,
        message: "Online checkout is temporarily unavailable. Please try again later.",
        retryable: false,
        correlationId,
        missingRequirements: paymentStatus.missingFields,
      };
    }

    // Resolve or create customer account
    let account = await billingRepository.getBillingAccount(organizationId);
    if (!account) {
      account = await billingRepository.createBillingAccount({
        organizationId,
        email: "billing@customer.com",
        currency: "USD",
      });
    }

    // Trigger Stripe customer and subscription creation
    const stripeBilling = ProviderRegistry.getBillingProvider("stripe");
    const stripeSubProvider = ProviderRegistry.getSubscriptionProvider("stripe");

    let stripeCustomerId = account.stripeCustomerId;
    if (!stripeCustomerId) {
      const cust = await stripeBilling.createCustomer(account.email, undefined, { organizationId }, organizationId);
      stripeCustomerId = cust.id;
      await db
        .update(billingAccounts)
        .set({ stripeCustomerId, updatedAt: new Date() })
        .where(eq(billingAccounts.id, account.id));
    }

    const priceId = process.env[`STRIPE_PRICE_${planId.toUpperCase()}`] || `price_${planId}`;
    const stripeSub = await stripeSubProvider.createSubscription(stripeCustomerId, priceId, 14, undefined, organizationId);

    // Update DB Sub only when successfully returned from Stripe
    await db
      .update(subscriptions)
      .set({
        planId,
        status: stripeSub.status === "active" ? "active" : "trialing",
        stripeSubscriptionId: stripeSub.id,
        currentPeriodStart: stripeSub.currentPeriodStart,
        currentPeriodEnd: stripeSub.currentPeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, sub.id));

    revalidatePath("/billing");
    return { success: true as const, correlationId };
  } catch (error: any) {
    const controlled = formatControlledBillingError(error, correlationId);
    return controlled;
  }
}

/**
 * Subscription cancellation action.
 */
export async function cancelSubscriptionAction() {
  const correlationId = generateCorrelationId();
  try {
    const { organizationId } = await getVerifiedOrgContext();
    
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, organizationId),
    });

    if (!sub) throw new CheckoutValidationError("No active subscription found to cancel.", { correlationId });

    if (sub.stripeSubscriptionId) {
      try {
        const paymentStatus = await getPaymentProviderStatus("stripe", organizationId);
        if (paymentStatus.isAvailable) {
          const stripe = ProviderRegistry.getSubscriptionProvider("stripe");
          await stripe.cancelSubscription(sub.stripeSubscriptionId, false, organizationId);
        }
      } catch (providerErr) {
        console.warn(`[Billing Cancel] Provider cancel warning [${correlationId}]:`, providerErr);
      }
    }

    await db
      .update(subscriptions)
      .set({
        planId: "free",
        status: "canceled",
        stripeSubscriptionId: null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, sub.id));

    revalidatePath("/billing");
    return { success: true as const, correlationId };
  } catch (error: any) {
    const controlled = formatControlledBillingError(error, correlationId);
    return controlled;
  }
}

// --- Coupons & Analytics ---
export async function getCouponsAction() {
  try {
    const couponsList = await billingRepository.getCoupons();
    return { success: true, coupons: couponsList };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load coupons" };
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
    const metrics = await billingRepository.getRevenueAnalytics();
    return { success: true, metrics };
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
      throw new Error("Organization not found");
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
    return { success: false, error: error?.message || "Failed to load payment infrastructure setup" };
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
    return { success: false, error: error?.message || "Failed to load invoices", invoices: [] };
  }
}
