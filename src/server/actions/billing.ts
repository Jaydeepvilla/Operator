"use server";

import { auth } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { billingRepository } from "../repositories/billing";
import { billingService } from "../services/billing/billing";
import { financialMetricsService } from "../services/billing/financial-metrics";
import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import { subscriptions, billingAccounts, paymentMethods, payments, invoices, invoiceItems } from "../db/schema";
import { ProviderRegistry } from "../services/billing/providers/registry";
import "../services/billing/providers/stripe"; // Load provider registration

async function getVerifiedUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

async function getVerifiedOrgContext() {
  const { orgId } = await auth();
  if (!orgId) throw new Error("No organization selected");
  return orgId;
}

export async function getBillingPortalDataAction() {
  try {
    const orgId = await getVerifiedOrgContext();
    
    // Resolve subscription
    let sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, orgId),
    });

    // Seed default subscription if none exists
    if (!sub) {
      const [newSub] = await db
        .insert(subscriptions)
        .values({
          organizationId: orgId,
          planId: "free",
          status: "trialing",
        })
        .returning();
      sub = newSub;
    }

    // Resolve customer billing account
    let account = await billingRepository.getBillingAccount(orgId);
    if (!account) {
      account = await billingRepository.createBillingAccount({
        organizationId: orgId,
        email: "billing@customer.com",
        currency: "USD",
      });
    }

    const invoicesList = await billingRepository.getInvoices(account.id);
    const paymentsList = await billingRepository.getPayments(account.id);
    const counters = await billingRepository.getUsageCounters(orgId);

    return {
      success: true,
      subscription: sub,
      account,
      invoices: invoicesList,
      payments: paymentsList,
      usageCounters: counters,
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load billing portal details" };
  }
}

export async function upgradeSubscriptionAction(planId: string) {
  try {
    const orgId = await getVerifiedOrgContext();
    
    let sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, orgId),
    });

    if (!sub) {
      throw new Error("Subscription parameters missing");
    }

    // Resolve or create customer account
    let account = await billingRepository.getBillingAccount(orgId);
    if (!account) {
      account = await billingRepository.createBillingAccount({
        organizationId: orgId,
        email: "billing@customer.com",
        currency: "USD",
      });
    }

    // Trigger Stripe subscription creation
    const stripe = ProviderRegistry.getSubscriptionProvider("stripe");
    const stripeCustomer = ProviderRegistry.getBillingProvider("stripe");
    
    const stripeCust = await stripeCustomer.createCustomer(account.email);
    const stripeSub = await stripe.createSubscription(stripeCust.id, `price_${planId}`);

    // Update DB Sub
    await db
      .update(subscriptions)
      .set({
        planId,
        status: "active",
        stripeSubscriptionId: stripeSub.id,
        currentPeriodStart: stripeSub.currentPeriodStart,
        currentPeriodEnd: stripeSub.currentPeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, sub.id));

    // Register a payment record
    const amount = planId === "pro" ? "79.00" : planId === "business" ? "299.00" : "0.00";
    if (parseFloat(amount) > 0) {
      await db.insert(payments).values({
        billingAccountId: account.id,
        subscriptionId: sub.id,
        amount,
        currency: "USD",
        status: "succeeded",
        providerPaymentId: `ch_${Math.random().toString(36).substring(2, 10)}`,
      });
    }

    revalidatePath("/billing");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to transition subscription tier" };
  }
}

export async function cancelSubscriptionAction() {
  try {
    const orgId = await getVerifiedOrgContext();
    
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, orgId),
    });

    if (!sub) throw new Error("No active subscription");

    if (sub.stripeSubscriptionId) {
      const stripe = ProviderRegistry.getSubscriptionProvider("stripe");
      await stripe.cancelSubscription(sub.stripeSubscriptionId);
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
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Cancellation failed" };
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
import { businessPaymentSettings as businessPaymentSettingsTable, organizations as organizationsTable } from "../db/schema";
import { and as dbAnd } from "drizzle-orm";

export async function getPaymentProvidersAction() {
  try {
    const orgId = await getVerifiedOrgContext();

    // 1. Get organization profile context
    const org = await db.query.organizations.findFirst({
      where: eq(organizationsTable.id, orgId),
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
      where: eq(businessPaymentSettingsTable.organizationId, orgId),
    });

    return {
      success: true,
      country,
      currency,
      language,
      recommended: compat.recommended,
      supported: compat.supported,
      connections: activeConnections,
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
    const orgId = await getVerifiedOrgContext();

    // Check if configuration already exists
    const existing = await db.query.businessPaymentSettings.findFirst({
      where: dbAnd(
        eq(businessPaymentSettingsTable.organizationId, orgId),
        eq(businessPaymentSettingsTable.providerId, data.providerId)
      ),
    });

    if (existing) {
      await db
        .update(businessPaymentSettingsTable)
        .set({
          connectionStatus: data.connectionStatus,
          isSandbox: data.isSandbox,
          credentials: data.credentials,
          updatedAt: new Date(),
        })
        .where(eq(businessPaymentSettingsTable.id, existing.id));
    } else {
      await db
        .insert(businessPaymentSettingsTable)
        .values({
          organizationId: orgId,
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
    const orgId = await getVerifiedOrgContext();
    const metrics = await financialMetricsService.calculateRealtimeMetrics(orgId);
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
    const orgId = await getVerifiedOrgContext();
    
    // Find billing account
    const acc = await db.query.billingAccounts.findFirst({
      where: eq(billingAccounts.organizationId, orgId),
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
