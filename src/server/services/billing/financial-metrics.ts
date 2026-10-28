import { db } from "../../db";
import { 
  subscriptions, 
  subscriptionPlans,
  billingAccounts, 
  payments, 
  invoices, 
  refunds, 
  revenueMetrics,
  organizations
} from "../../db/schema";
import { eq, and, gte, lte, desc, inArray, sql } from "drizzle-orm";
import { ReportingSecurityService } from "../reporting-security";

export interface FinancialKPIs {
  mrr: number;
  arr: number;
  arpu: number;
  ltv: number;
  historicalLtv?: number;
  ltvModel?: "churn_derived" | "24_month_assumption" | "zero";
  ltvLabel?: string;
  churnRate: number; // in percentage e.g. 2.4%
  grossRevenue: number;
  netRevenue: number;
  currencyBreakdown?: Record<string, { gross: number; net: number; refunds: number }>;
  primaryCurrency?: string;
  activeSubscriptionsCount: number;
  trialingCount: number;
  cancelledCount: number;
  totalCustomers: number;
  revenueGrowthPercent: number;
  mrrHistory: { month: string; mrr: number; revenue: number }[];
}

const PLAN_MONTHLY_VALUES: Record<string, number> = {
  free: 0,
  starter: 29,
  pro: 79,
  business: 199,
  agency: 299,
  enterprise: 499,
};

export const financialMetricsService = {
  /**
   * Calculate live real-time financial indicators across subscriptions, payments, and invoices.
   */
  async calculateRealtimeMetrics(organizationId: string): Promise<FinancialKPIs> {
    const verifiedOrgId = ReportingSecurityService.assertAnalyticsQueryAuthorized({ organizationId });
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // 1. Fetch database subscription plans to get authoritative pricing and intervals
    const dbPlans = await db.select().from(subscriptionPlans);
    const planMap = new Map<string, { price: number; interval: string }>();
    for (const dp of dbPlans) {
      const p = parseFloat(dp.price) || 0;
      planMap.set(dp.id.toLowerCase(), { price: p, interval: dp.interval || "month" });
    }

    // 2. Fetch all subscriptions strictly scoped to organization
    const allSubs = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, verifiedOrgId));

    let activeMRR = 0;
    let activePayingCount = 0;
    let trialingCount = 0;
    let cancelledLast30Days = 0;
    let activeSubscriptionsCount = 0;

    for (const sub of allSubs) {
      const pKey = sub.planId?.toLowerCase() || "";
      const dbPlan = planMap.get(pKey);
      let planMonthlyPrice = 0;
      if (dbPlan) {
        // Normalize annual subscription to monthly MRR
        planMonthlyPrice = dbPlan.interval === "year" 
          ? Math.round((dbPlan.price / 12) * 100) / 100 
          : dbPlan.price;
      } else {
        planMonthlyPrice = PLAN_MONTHLY_VALUES[pKey] ?? 0;
      }

      if (sub.status === "active") {
        activeSubscriptionsCount++;
        if (planMonthlyPrice > 0) {
          activeMRR += planMonthlyPrice;
          activePayingCount++;
        }
      } else if (sub.status === "trialing") {
        trialingCount++;
      } else if (sub.status === "canceled" || sub.status === "past_due") {
        if (sub.updatedAt && new Date(sub.updatedAt) >= thirtyDaysAgo) {
          cancelledLast30Days++;
        }
      }
    }

    // 3. Fetch payments & refunds strictly scoped to tenant billing account
    let allPayments: (typeof payments.$inferSelect)[] = [];
    let allRefunds: (typeof refunds.$inferSelect)[] = [];

    if (organizationId) {
      const [bAccount] = await db
        .select()
        .from(billingAccounts)
        .where(eq(billingAccounts.organizationId, organizationId))
        .limit(1);

      if (bAccount) {
        allPayments = await db
          .select()
          .from(payments)
          .where(eq(payments.billingAccountId, bAccount.id));

        const paymentIds = allPayments.map((p) => p.id);
        if (paymentIds.length > 0) {
          allRefunds = await db
            .select()
            .from(refunds)
            .where(inArray(refunds.paymentId, paymentIds));
        }
      }
    } else {
      allPayments = await db.select().from(payments);
      allRefunds = await db.select().from(refunds);
    }

    let currentPeriodGross = 0;
    let previousPeriodGross = 0;
    let totalLifetimeRevenue = 0;

    // Track currency-separated breakdown to prevent mixed-currency corruption
    const currencyTotals: Record<string, { gross: number; refunds: number; net: number }> = {};
    const primaryCurrency = allPayments[0]?.currency || "USD";

    for (const p of allPayments) {
      const cur = (p.currency || primaryCurrency).toUpperCase();
      if (!currencyTotals[cur]) {
        currencyTotals[cur] = { gross: 0, refunds: 0, net: 0 };
      }
      const amt = parseFloat(p.amount) || 0;
      if (p.status === "succeeded" || p.status === "completed") {
        totalLifetimeRevenue += amt;
        const pDate = new Date(p.createdAt);
        if (pDate >= thirtyDaysAgo) {
          currentPeriodGross += amt;
          currencyTotals[cur].gross = Math.round((currencyTotals[cur].gross + amt) * 100) / 100;
        } else if (pDate >= sixtyDaysAgo && pDate < thirtyDaysAgo) {
          previousPeriodGross += amt;
        }
      }
    }

    let currentPeriodRefunds = 0;
    const paymentCurrencyMap = new Map<string, string>();
    for (const p of allPayments) {
      paymentCurrencyMap.set(p.id, (p.currency || primaryCurrency).toUpperCase());
    }

    for (const r of allRefunds) {
      const rAmt = parseFloat(r.amount) || 0;
      const cur = paymentCurrencyMap.get(r.paymentId) || primaryCurrency;
      if (!currencyTotals[cur]) {
        currencyTotals[cur] = { gross: 0, refunds: 0, net: 0 };
      }
      if (r.status === "succeeded" || r.status === "completed") {
        const rDate = new Date(r.createdAt);
        if (rDate >= thirtyDaysAgo) {
          currentPeriodRefunds += rAmt;
          currencyTotals[cur].refunds = Math.round((currencyTotals[cur].refunds + rAmt) * 100) / 100;
        }
      }
    }

    for (const cur of Object.keys(currencyTotals)) {
      currencyTotals[cur].net = Math.max(0, Math.round((currencyTotals[cur].gross - currencyTotals[cur].refunds) * 100) / 100);
    }

    const currentPeriodNet = Math.max(0, currentPeriodGross - currentPeriodRefunds);

    // 4. Compute derived indicators with honest zero states (no fabricated defaults)
    const mrr = Math.round((activeMRR > 0 ? activeMRR : currentPeriodGross) * 100) / 100;
    const arr = Math.round(mrr * 12 * 100) / 100;

    const totalAudience = activePayingCount + cancelledLast30Days;
    const churnRate = totalAudience > 0 
      ? Math.round(((cancelledLast30Days / totalAudience) * 100) * 10) / 10 
      : 0;

    const arpu = activePayingCount > 0 
      ? Math.round((mrr / activePayingCount) * 100) / 100 
      : 0;

    let ltv = 0;
    let ltvModel: "churn_derived" | "24_month_assumption" | "zero" = "zero";
    let ltvLabel = "LTV ($0.00)";

    if (arpu > 0) {
      if (churnRate > 0) {
        ltv = Math.round((arpu / (churnRate / 100)) * 100) / 100;
        ltvModel = "churn_derived";
        ltvLabel = "Estimated LTV (Churn-Adjusted)";
      } else {
        ltv = Math.round(arpu * 24 * 100) / 100; // 24-month horizon projection model
        ltvModel = "24_month_assumption";
        ltvLabel = "Projected LTV (24-Month Horizon Model)";
      }
    }

    // Actual data-derived empirical customer lifetime value (historical realized spend per paying customer)
    const historicalLtv = activePayingCount > 0 
      ? Math.round((totalLifetimeRevenue / activePayingCount) * 100) / 100 
      : 0;

    // Revenue Velocity / Growth %
    let revenueGrowthPercent = 0;
    if (previousPeriodGross > 0) {
      revenueGrowthPercent = Math.round(((currentPeriodGross - previousPeriodGross) / previousPeriodGross) * 1000) / 10;
    } else if (currentPeriodGross > 0) {
      revenueGrowthPercent = 100;
    }

    // 5. Calculate real 6-month historical MRR & revenue trend from database records
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mrrHistory: { month: string; mrr: number; revenue: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthLabel = months[monthStart.getMonth()];

      // Real payments in this calendar window
      let monthGross = 0;
      for (const p of allPayments) {
        if (p.status === "succeeded" || p.status === "completed") {
          const pDate = new Date(p.createdAt);
          if (pDate >= monthStart && pDate < monthEnd) {
            monthGross += parseFloat(p.amount) || 0;
          }
        }
      }

      // Real refunds in this calendar window
      let monthRefunds = 0;
      for (const r of allRefunds) {
        if (r.status === "succeeded" || r.status === "completed") {
          const rDate = new Date(r.createdAt);
          if (rDate >= monthStart && rDate < monthEnd) {
            monthRefunds += parseFloat(r.amount) || 0;
          }
        }
      }

      const calculatedRevenue = Math.max(0, Math.round((monthGross - monthRefunds) * 100) / 100);

      // Real active subscription MRR in this month
      let calculatedMRR = 0;
      for (const sub of allSubs) {
        const pKey = sub.planId?.toLowerCase() || "";
        const dbPlan = planMap.get(pKey);
        let planMonthlyPrice = 0;
        if (dbPlan) {
          planMonthlyPrice = dbPlan.interval === "year" 
            ? Math.round((dbPlan.price / 12) * 100) / 100 
            : dbPlan.price;
        } else {
          planMonthlyPrice = PLAN_MONTHLY_VALUES[pKey] ?? 0;
        }

        if (planMonthlyPrice > 0) {
          const subCreated = sub.createdAt ? new Date(sub.createdAt) : new Date(0);
          const subUpdated = sub.updatedAt ? new Date(sub.updatedAt) : new Date();
          if (subCreated < monthEnd) {
            if (sub.status === "active") {
              calculatedMRR += planMonthlyPrice;
            } else if ((sub.status === "canceled" || sub.status === "past_due") && subUpdated >= monthStart) {
              calculatedMRR += planMonthlyPrice;
            }
          }
        }
      }

      mrrHistory.push({
        month: monthLabel,
        mrr: calculatedMRR,
        revenue: calculatedRevenue,
      });
    }

    return {
      mrr,
      arr,
      arpu,
      ltv,
      historicalLtv,
      ltvModel,
      ltvLabel,
      churnRate,
      grossRevenue: Math.round(currentPeriodGross * 100) / 100,
      netRevenue: Math.round(currentPeriodNet * 100) / 100,
      currencyBreakdown: currencyTotals,
      primaryCurrency,
      activeSubscriptionsCount,
      trialingCount,
      cancelledCount: cancelledLast30Days,
      totalCustomers: allSubs.length,
      revenueGrowthPercent,
      mrrHistory,
    };
  },
};
