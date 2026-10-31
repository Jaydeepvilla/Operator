import { db } from "../../db";
import { subscriptions, auditLogs, billingAccounts } from "../../db/schema";
import { eq, or, isNotNull, and, desc } from "drizzle-orm";
import { getPaymentProviderConfig } from "./config";
import Stripe from "stripe";
import { logger } from "@/lib/logger";

export interface ReconciliationReport {
  scanned: number;
  discrepancies: number;
  corrected: number;
  unresolved: number;
  providerErrors: Array<{ provider: string; error: string }>;
  durationMs: number;
}

export interface ReconcileOptions {
  batchSize?: number;
  dryRun?: boolean;
  stripeClient?: any;
  razorpayFetcher?: (subscriptionId: string) => Promise<any>;
}

export class BillingReconciliationService {
  /**
   * Executes daily reconciliation between local subscription state and authoritative Stripe/Razorpay state.
   * Safe correction rules:
   * - Never downgrades on transient network/rate-limit failures.
   * - Never triggers live charges, refunds, or customer emails during reconciliation.
   * - Enforces tenant isolation (only updates target organization's record).
   * - Records a durable audit trail of all corrections and discrepancies.
   * - Isolates provider execution so an outage in one provider does not block the other.
   */
  async runDailyReconciliation(options: ReconcileOptions = {}): Promise<ReconciliationReport> {
    const startTime = Date.now();
    const batchSize = options.batchSize || 100;
    const report: ReconciliationReport = {
      scanned: 0,
      discrepancies: 0,
      corrected: 0,
      unresolved: 0,
      providerErrors: [],
      durationMs: 0,
    };

    // 1. Reconcile Stripe Subscriptions
    try {
      await this.reconcileStripeSubscriptions(batchSize, options, report);
    } catch (err: any) {
      report.providerErrors.push({
        provider: "stripe",
        error: err?.message || "Unhandled Stripe reconciliation error",
      });
      logger.error("[Reconciliation] Critical Stripe runner error", { error: err });
    }

    // 2. Reconcile Razorpay Subscriptions (Isolated from Stripe)
    try {
      await this.reconcileRazorpaySubscriptions(batchSize, options, report);
    } catch (err: any) {
      report.providerErrors.push({
        provider: "razorpay",
        error: err?.message || "Unhandled Razorpay reconciliation error",
      });
      logger.error("[Reconciliation] Critical Razorpay runner error", { error: err });
    }

    report.durationMs = Date.now() - startTime;

    // 3. Persist system audit log entry for run visibility
    try {
      await db.insert(auditLogs).values({
        action: "billing_reconciliation_run",
        resource: "system_billing",
        metadata: {
          scanned: report.scanned,
          discrepancies: report.discrepancies,
          corrected: report.corrected,
          unresolved: report.unresolved,
          providerErrorsCount: report.providerErrors.length,
          durationMs: report.durationMs,
        },
      });
    } catch (logErr) {
      logger.warn("[Reconciliation] Failed to write system audit log", { error: logErr });
    }

    return report;
  }

  /**
   * Reconciles subscriptions backed by Stripe.
   */
  private async reconcileStripeSubscriptions(
    limit: number,
    options: ReconcileOptions,
    report: ReconciliationReport
  ): Promise<void> {
    let stripe = options.stripeClient;

    if (!stripe) {
      const config = await getPaymentProviderConfig("stripe");
      if (!config.secretKey) {
        // Stripe not configured in this environment; safely skip without error
        return;
      }
      stripe = new Stripe(config.secretKey, { apiVersion: "2023-10-16" as any });
    }

    // Find subscriptions with active/trialing/past_due local states having a Stripe ID
    const localSubs = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          isNotNull(subscriptions.stripeSubscriptionId),
          or(
            eq(subscriptions.status, "active"),
            eq(subscriptions.status, "trialing"),
            eq(subscriptions.status, "past_due")
          )
        )
      )
      .orderBy(desc(subscriptions.updatedAt))
      .limit(limit);

    for (const sub of localSubs) {
      report.scanned++;
      const subId = sub.stripeSubscriptionId!;

      try {
        const stripeSub = await stripe.subscriptions.retrieve(subId);

        // 1. Detect Status Discrepancy
        const isProviderTerminated =
          stripeSub.status === "canceled" ||
          stripeSub.status === "incomplete_expired" ||
          stripeSub.status === "unpaid";

        const isLocalActive = sub.status === "active" || sub.status === "trialing";

        if (isProviderTerminated && isLocalActive) {
          report.discrepancies++;

          if (!options.dryRun) {
            await db
              .update(subscriptions)
              .set({
                status: "canceled",
                canceledAt: new Date(stripeSub.canceled_at ? stripeSub.canceled_at * 1000 : Date.now()),
                cancelAtPeriodEnd: Boolean(stripeSub.cancel_at_period_end),
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(subscriptions.id, sub.id),
                  eq(subscriptions.organizationId, sub.organizationId) // Tenant isolation
                )
              );

            await db.insert(auditLogs).values({
              organizationId: sub.organizationId,
              action: "reconciliation_status_corrected",
              resource: `subscription:${sub.id}`,
              metadata: {
                provider: "stripe",
                providerSubscriptionId: subId,
                previousStatus: sub.status,
                newStatus: "canceled",
                reason: `Stripe status was '${stripeSub.status}' while local status was '${sub.status}'`,
              },
            });

            report.corrected++;
          }
        } else if (stripeSub.cancel_at_period_end !== sub.cancelAtPeriodEnd) {
          // 2. Detect Scheduled Cancellation Discrepancy
          report.discrepancies++;

          if (!options.dryRun) {
            await db
              .update(subscriptions)
              .set({
                cancelAtPeriodEnd: Boolean(stripeSub.cancel_at_period_end),
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(subscriptions.id, sub.id),
                  eq(subscriptions.organizationId, sub.organizationId)
                )
              );

            await db.insert(auditLogs).values({
              organizationId: sub.organizationId,
              action: "reconciliation_cancel_at_period_end_corrected",
              resource: `subscription:${sub.id}`,
              metadata: {
                provider: "stripe",
                providerSubscriptionId: subId,
                cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
              },
            });

            report.corrected++;
          }
        }
      } catch (err: any) {
        const is404 = err?.statusCode === 404 || err?.status === 404 || err?.code === "resource_missing";
        const isRateLimit = err?.statusCode === 429 || err?.status === 429;

        if (is404) {
          report.discrepancies++;
          report.unresolved++;

          // Record durable discrepancy without destructive delete
          await db.insert(auditLogs).values({
            organizationId: sub.organizationId,
            action: "reconciliation_unresolved_discrepancy",
            resource: `subscription:${sub.id}`,
            metadata: {
              provider: "stripe",
              providerSubscriptionId: subId,
              error: "Subscription ID not found on Stripe provider",
            },
          });
        } else if (isRateLimit) {
          // Never downgrade on rate limit
          report.providerErrors.push({
            provider: "stripe",
            error: "Stripe API rate limit exceeded during reconciliation",
          });
          break; // Stop further requests to avoid exacerbating rate limits
        } else {
          report.providerErrors.push({
            provider: "stripe",
            error: err?.message || "Failed to retrieve Stripe subscription",
          });
        }
      }
    }
  }

  /**
   * Reconciles subscriptions backed by Razorpay.
   */
  private async reconcileRazorpaySubscriptions(
    limit: number,
    options: ReconcileOptions,
    report: ReconciliationReport
  ): Promise<void> {
    const config = await getPaymentProviderConfig("razorpay");
    const isConfigured = Boolean(config.publishableKey && config.secretKey);

    const localSubs = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          isNotNull(subscriptions.razorpaySubscriptionId),
          or(
            eq(subscriptions.status, "active"),
            eq(subscriptions.status, "trialing"),
            eq(subscriptions.status, "past_due")
          )
        )
      )
      .orderBy(desc(subscriptions.updatedAt))
      .limit(limit);

    for (const sub of localSubs) {
      report.scanned++;
      const subId = sub.razorpaySubscriptionId!;

      try {
        let rzpSub: any = null;

        if (options.razorpayFetcher) {
          rzpSub = await options.razorpayFetcher(subId);
        } else if (isConfigured) {
          const creds = `${config.publishableKey}:${config.secretKey}`;
          const auth = `Basic ${Buffer.from(creds).toString("base64")}`;
          const res = await fetch(`https://api.razorpay.com/v1/subscriptions/${subId}`, {
            headers: { Authorization: auth },
          });

          if (!res.ok) {
            if (res.status === 404) {
              throw { status: 404, message: "Subscription not found on Razorpay" };
            }
            if (res.status === 429) {
              throw { status: 429, message: "Razorpay rate limited" };
            }
            throw new Error(`Razorpay API returned status ${res.status}`);
          }
          rzpSub = await res.json();
        } else {
          // Not configured in this environment
          continue;
        }

        // Razorpay statuses: 'created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed', 'expired'
        const isProviderTerminated =
          rzpSub.status === "cancelled" ||
          rzpSub.status === "completed" ||
          rzpSub.status === "expired";

        const isLocalActive = sub.status === "active" || sub.status === "trialing";

        if (isProviderTerminated && isLocalActive) {
          report.discrepancies++;

          if (!options.dryRun) {
            await db
              .update(subscriptions)
              .set({
                status: "canceled",
                canceledAt: new Date(rzpSub.ended_at ? rzpSub.ended_at * 1000 : Date.now()),
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(subscriptions.id, sub.id),
                  eq(subscriptions.organizationId, sub.organizationId)
                )
              );

            await db.insert(auditLogs).values({
              organizationId: sub.organizationId,
              action: "reconciliation_status_corrected",
              resource: `subscription:${sub.id}`,
              metadata: {
                provider: "razorpay",
                providerSubscriptionId: subId,
                previousStatus: sub.status,
                newStatus: "canceled",
                reason: `Razorpay status was '${rzpSub.status}' while local status was '${sub.status}'`,
              },
            });

            report.corrected++;
          }
        }
      } catch (err: any) {
        const is404 = err?.status === 404;
        const isRateLimit = err?.status === 429;

        if (is404) {
          report.discrepancies++;
          report.unresolved++;

          await db.insert(auditLogs).values({
            organizationId: sub.organizationId,
            action: "reconciliation_unresolved_discrepancy",
            resource: `subscription:${sub.id}`,
            metadata: {
              provider: "razorpay",
              providerSubscriptionId: subId,
              error: "Subscription ID not found on Razorpay provider",
            },
          });
        } else if (isRateLimit) {
          report.providerErrors.push({
            provider: "razorpay",
            error: "Razorpay API rate limit exceeded during reconciliation",
          });
          break;
        } else {
          report.providerErrors.push({
            provider: "razorpay",
            error: err?.message || "Failed to retrieve Razorpay subscription",
          });
        }
      }
    }
  }
}

export const billingReconciliationService = new BillingReconciliationService();
