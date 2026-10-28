import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db";
import { 
  billingAccounts, 
  invoices, 
  payments, 
  usageCounters, 
  plans, 
  coupons, 
  discounts, 
  revenueMetrics,
  subscriptions,
  subscriptionPlans
} from "../db/schema";

export const billingRepository = {
  // --- Billing Profile ---
  async getBillingAccount(organizationId: string) {
    const [acc] = await db
      .select()
      .from(billingAccounts)
      .where(eq(billingAccounts.organizationId, organizationId));
    return acc || null;
  },

  async getPaymentMethods(billingAccountId: string) {
    // We need to import paymentMethods from schema
    // Let's assume it's imported above
    const { paymentMethods } = require("../db/schema");
    return db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.billingAccountId, billingAccountId));
  },

  async createBillingAccount(data: typeof billingAccounts.$inferInsert) {
    const [acc] = await db
      .insert(billingAccounts)
      .values(data)
      .returning();
    return acc;
  },

  // --- Plans & Coupons ---
  async getPlans() {
    return db.select().from(plans).where(eq(plans.status, "active"));
  },

  async getCoupons() {
    return db.select().from(coupons).where(eq(coupons.isActive, true));
  },

  async createCoupon(data: typeof coupons.$inferInsert) {
    const [coupon] = await db
      .insert(coupons)
      .values(data)
      .returning();
    return coupon;
  },

  // --- Statements & Invoices ---
  async getInvoices(billingAccountId: string) {
    return db
      .select()
      .from(invoices)
      .where(eq(invoices.billingAccountId, billingAccountId))
      .orderBy(desc(invoices.createdAt));
  },

  async getPayments(billingAccountId: string) {
    return db
      .select()
      .from(payments)
      .where(eq(payments.billingAccountId, billingAccountId))
      .orderBy(desc(payments.createdAt));
  },

  async getUsageCounters(organizationId: string) {
    return db
      .select()
      .from(usageCounters)
      .where(eq(usageCounters.organizationId, organizationId));
  },

  // --- Financial Analytics Dashboard ---
  async getRevenueAnalytics(organizationId: string) {
    if (!organizationId) {
      throw new Error("Organization ID is required for revenue analytics");
    }
    const { financialMetricsService } = await import("../services/billing/financial-metrics");
    const metrics = await financialMetricsService.calculateRealtimeMetrics(organizationId);

    return {
      mrr: `$${metrics.mrr.toLocaleString()}.00`,
      arr: `$${metrics.arr.toLocaleString()}.00`,
      churnRate: `${metrics.churnRate}%`,
      ltv: `$${metrics.ltv.toLocaleString()}.00`,
      arpu: `$${metrics.arpu.toLocaleString()}.00`,
      netRevenue: `$${metrics.netRevenue.toLocaleString()}.00`,
      grossRevenue: `$${metrics.grossRevenue.toLocaleString()}.00`
    };
  }
};
