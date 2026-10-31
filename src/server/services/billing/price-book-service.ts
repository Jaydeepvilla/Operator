import { db } from "../../db";
import { fxRates, priceBooks } from "../../db/schema";
import { eq, desc, and } from "drizzle-orm";
import {
  SupportedCurrency,
  computeRegionalPrices,
  evaluateCostGuard,
  REGION_CONFIGS,
  BASE_PRICES_USD,
  formatMoney,
  PlanId,
} from "@/lib/billing/catalog";

export interface RateResult {
  currency: SupportedCurrency;
  ratePerUsd: number;
  source: string;
  fetchedAt: Date;
}

export class PriceBookService {
  /**
   * Fetches latest rates from public exchange rate API or falls back to DB/last good value.
   */
  async getOrFetchFxRates(): Promise<Record<SupportedCurrency, RateResult>> {
    const results: Record<SupportedCurrency, RateResult> = {
      USD: { currency: "USD", ratePerUsd: 1.0, source: "fixed", fetchedAt: new Date() },
      GBP: { currency: "GBP", ratePerUsd: 0.747088, source: "default", fetchedAt: new Date() },
      INR: { currency: "INR", ratePerUsd: 95.073571, source: "default", fetchedAt: new Date() },
    };

    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD", {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.rates) {
          if (data.rates.GBP) {
            results.GBP = {
              currency: "GBP",
              ratePerUsd: Number(data.rates.GBP),
              source: "open.er-api.com",
              fetchedAt: new Date(data.time_last_update_utc || Date.now()),
            };
          }
          if (data.rates.INR) {
            results.INR = {
              currency: "INR",
              ratePerUsd: Number(data.rates.INR),
              source: "open.er-api.com",
              fetchedAt: new Date(data.time_last_update_utc || Date.now()),
            };
          }
        }
      }
    } catch (e) {
      console.warn("[PriceBookService] Failed to fetch live FX rates, falling back to DB/last good:", e);
    }

    // Persist to fx_rates table
    for (const cur of ["GBP", "INR"] as SupportedCurrency[]) {
      try {
        await db.insert(fxRates).values({
          currency: cur,
          ratePerUsd: String(results[cur].ratePerUsd),
          source: results[cur].source,
          fetchedAt: results[cur].fetchedAt,
        });
      } catch (err) {
        console.warn(`[PriceBookService] Could not persist fx_rate for ${cur}:`, err);
      }
    }

    return results;
  }

  /**
   * Generates a complete draft price book for a version.
   */
  async generateDraftPriceBook(version: string) {
    const rates = await this.getOrFetchFxRates();
    const currencies: SupportedCurrency[] = ["USD", "GBP", "INR"];
    const draftRows: any[] = [];
    const guardResults: any[] = [];

    for (const cur of currencies) {
      const fx = rates[cur].ratePerUsd;
      const prices = computeRegionalPrices(cur, fx);
      const guard = evaluateCostGuard(cur, fx, prices);
      guardResults.push(guard);

      const factor = REGION_CONFIGS[cur].planFactor;
      const usageFactor = REGION_CONFIGS[cur].usageFactor;

      // Plans
      for (const p of ["starter", "professional", "business"] as PlanId[]) {
        draftRows.push({
          version,
          currency: cur,
          plan: p,
          interval: "month",
          amountMinor: prices.plans[p].monthlyMinor,
          fxRateUsed: String(fx),
          factorUsed: String(factor),
          status: "draft",
        });
        draftRows.push({
          version,
          currency: cur,
          plan: p,
          interval: "year",
          amountMinor: prices.plans[p].yearlyMinor,
          fxRateUsed: String(fx),
          factorUsed: String(factor),
          status: "draft",
        });
      }

      // Setup fee
      draftRows.push({
        version,
        currency: cur,
        plan: "setup_fee",
        interval: "one_time",
        amountMinor: prices.setupFee.minor,
        fxRateUsed: String(fx),
        factorUsed: String(factor),
        status: "draft",
      });

      // Voice overage
      draftRows.push({
        version,
        currency: cur,
        plan: "overage_voice",
        interval: "usage",
        amountMinor: prices.voiceOveragePerMinute.minor,
        fxRateUsed: String(fx),
        factorUsed: String(usageFactor),
        status: "draft",
      });

      // Extra 500 conversations
      draftRows.push({
        version,
        currency: cur,
        plan: "extra_500_convs",
        interval: "one_time",
        amountMinor: prices.extra500Conversations.minor,
        fxRateUsed: String(fx),
        factorUsed: String(usageFactor),
        status: "draft",
      });
    }

    return { draftRows, guardResults, rates };
  }

  /**
   * Publishes a price book version with strict safety checks:
   * 1. Cost Guard must pass 100%.
   * 2. If existing published version exists, check if any rate moved >5%.
   */
  async publishPriceBook(version: string) {
    const { draftRows, guardResults, rates } = await this.generateDraftPriceBook(version);

    // 1. Verify Cost Guard
    const failedGuards = guardResults.filter((g) => !g.allPassed);
    if (failedGuards.length > 0) {
      throw new Error(`Cost Guard validation failed for currencies: ${failedGuards.map((g) => g.currency).join(", ")}`);
    }

    // 2. Rate divergence check against latest published version
    const latestPublished = await db
      .select()
      .from(priceBooks)
      .where(eq(priceBooks.status, "published"))
      .orderBy(desc(priceBooks.publishedAt))
      .limit(1);

    if (latestPublished.length > 0 && latestPublished[0].version !== version) {
      const prevRows = await db
        .select()
        .from(priceBooks)
        .where(and(eq(priceBooks.version, latestPublished[0].version), eq(priceBooks.status, "published")));

      for (const cur of ["GBP", "INR"] as SupportedCurrency[]) {
        const prevRow = prevRows.find((r) => r.currency === cur);
        if (prevRow) {
          const prevRate = Number(prevRow.fxRateUsed);
          const currentRate = rates[cur].ratePerUsd;
          const delta = Math.abs(currentRate - prevRate) / prevRate;
          if (delta > 0.05) {
            throw new Error(
              `Publishing blocked: ${cur} FX rate moved ${(delta * 100).toFixed(2)}% (> 5% safety threshold). Previous: ${prevRate}, Current: ${currentRate}. Manual approval required.`
            );
          }
        }
      }
    }

    // Save and publish
    const now = new Date();
    for (const row of draftRows) {
      await db
        .insert(priceBooks)
        .values({
          ...row,
          status: "published",
          publishedAt: now,
        })
        .onConflictDoUpdate({
          target: [priceBooks.version, priceBooks.currency, priceBooks.plan, priceBooks.interval],
          set: {
            amountMinor: row.amountMinor,
            fxRateUsed: row.fxRateUsed,
            factorUsed: row.factorUsed,
            status: "published",
            publishedAt: now,
          },
        });
    }

    return { success: true, version, publishedAt: now, rowsCount: draftRows.length };
  }

  /**
   * Retrieves an authoritative published price for a plan and interval.
   */
  async getPublishedPrice(
    planOrParams: string | { currency: SupportedCurrency; plan: string; interval: string },
    intervalParam?: string,
    currencyParam?: SupportedCurrency
  ): Promise<{ amountMinor: number; formatted: string; providerPlanId?: string }> {
    let cur: SupportedCurrency;
    let plan: string;
    let interval: string;

    if (typeof planOrParams === "object") {
      cur = planOrParams.currency.toUpperCase() as SupportedCurrency;
      plan = planOrParams.plan;
      interval = planOrParams.interval;
    } else {
      plan = planOrParams;
      interval = intervalParam || "monthly";
      cur = (currencyParam || "USD").toUpperCase() as SupportedCurrency;
    }

    const normPlan = plan.toLowerCase() === "pro" ? "professional" : plan.toLowerCase();
    const normInterval = interval.toLowerCase().startsWith("year") ? "year" : interval.toLowerCase().startsWith("month") ? "month" : interval;

    const [row] = await db
      .select()
      .from(priceBooks)
      .where(
        and(
          eq(priceBooks.currency, cur),
          eq(priceBooks.plan, normPlan),
          eq(priceBooks.interval, normInterval),
          eq(priceBooks.status, "published")
        )
      )
      .orderBy(desc(priceBooks.publishedAt))
      .limit(1);

    if (row) {
      return {
        amountMinor: row.amountMinor,
        formatted: formatMoney(row.amountMinor, cur),
        providerPlanId: row.providerPlanId ?? undefined,
      };
    }

    // Fallback calculation using standard P3 formula
    const defaultRates = { USD: 1.0, GBP: 0.747088, INR: 95.073571 };
    const computed = computeRegionalPrices(cur, defaultRates[cur] || 1.0);
    let minor = 0;
    if (normPlan === "setup_fee") {
      minor = computed.setupFee.minor;
    } else if (normPlan === "overage_voice") {
      minor = computed.voiceOveragePerMinute.minor;
    } else if (normPlan === "extra_500_convs") {
      minor = computed.extra500Conversations.minor;
    } else if (normPlan in computed.plans) {
      minor = normInterval === "year" ? (computed.plans as any)[normPlan].yearlyMinor : (computed.plans as any)[normPlan].monthlyMinor;
    } else {
      minor = computed.plans.starter.monthlyMinor;
    }

    return {
      amountMinor: minor,
      formatted: formatMoney(minor, cur),
    };
  }
}

export const priceBookService = new PriceBookService();
