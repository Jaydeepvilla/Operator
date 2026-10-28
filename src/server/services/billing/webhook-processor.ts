import { db } from "../../db";
import { eq, and } from "drizzle-orm";
import {
  billingEvents,
  subscriptions,
  billingAccounts,
  invoices,
  invoiceItems,
  payments,
  refunds,
  organizations,
} from "../../db/schema";
import { subscriptionEngine } from "./subscription-engine";
import { getPlan } from "@/lib/billing/plans";
import { billingSecurityService } from "./billing-security";

export interface ProcessWebhookResult {
  processed: boolean;
  duplicate: boolean;
  eventType: string;
  providerEventId: string;
  message: string;
}

export class WebhookProcessor {
  /**
   * Enforces webhook idempotency and routes events to the SubscriptionEngine.
   */
  async processEvent(params: {
    provider: "razorpay" | "stripe";
    providerEventId: string;
    eventType: string;
    payload: any;
  }): Promise<ProcessWebhookResult> {
    const { provider, providerEventId, eventType, payload } = params;

    // 1. Atomic database-enforced idempotency claim
    let eventRecordId: string;
    try {
      const [inserted] = await db
        .insert(billingEvents)
        .values({
          provider,
          providerEventId,
          eventType: `${provider}.${eventType}`,
          status: "processing",
          payload: {
            providerEventId,
            provider,
            eventType,
            receivedAt: new Date().toISOString(),
            raw: payload,
          },
        })
        .returning({ id: billingEvents.id });

      eventRecordId = inserted.id;
    } catch (err: any) {
      // Check for PostgreSQL unique constraint violation (code 23505 or DrizzleQueryError wrapping PostgresError)
      const isUniqueViolation =
        err?.code === "23505" ||
        err?.cause?.code === "23505" ||
        err?.cause?.constraint_name === "billing_events_provider_event_unique" ||
        err?.message?.includes("billing_events_provider_event_unique") ||
        err?.message?.includes("unique constraint") ||
        err?.cause?.message?.includes("unique constraint");

      if (isUniqueViolation) {
        // Query the existing event state
        const [existing] = await db
          .select()
          .from(billingEvents)
          .where(
            and(
              eq(billingEvents.provider, provider),
              eq(billingEvents.providerEventId, providerEventId)
            )
          )
          .limit(1);

        if (!existing) {
          throw err;
        }

        // Case A: Event already processed completely
        if (existing.status === "processed") {
          console.info(`[WebhookProcessor] Duplicate event ${providerEventId} (${eventType}) already processed. Skipping.`);
          return {
            processed: false,
            duplicate: true,
            eventType,
            providerEventId,
            message: "Event already processed (idempotent).",
          };
        }

        // Case B: Event is currently being processed by another worker
        if (existing.status === "processing") {
          const processingAgeMs = Date.now() - existing.createdAt.getTime();
          // If less than 5 minutes old, assume active concurrent worker
          if (processingAgeMs < 5 * 60 * 1000) {
            console.info(`[WebhookProcessor] Event ${providerEventId} is currently being processed by an active concurrent worker.`);
            return {
              processed: false,
              duplicate: true,
              eventType,
              providerEventId,
              message: "Event is currently processing.",
            };
          }
          // Lease expired (> 5 minutes); previous worker crashed. Reclaim processing.
          console.warn(`[WebhookProcessor] Reclaiming abandoned processing lease for event ${providerEventId}.`);
          eventRecordId = existing.id;
        } else if (existing.status === "failed") {
          // Case C: Previous processing failed. Allow retry.
          console.info(`[WebhookProcessor] Retrying failed event ${providerEventId}.`);
          await db
            .update(billingEvents)
            .set({ status: "processing", error: null })
            .where(eq(billingEvents.id, existing.id));
          eventRecordId = existing.id;
        } else {
          eventRecordId = existing.id;
        }
      } else {
        throw err;
      }
    }

    // 2. Dispatch event to handler with transactional completion and failure recording
    try {
      if (provider === "razorpay") {
        await this.handleRazorpayEvent(eventType, payload, providerEventId);
      } else if (provider === "stripe") {
        await this.handleStripeEvent(eventType, payload, providerEventId);
      }

      // Mark permanently processed
      await db
        .update(billingEvents)
        .set({
          status: "processed",
          processedAt: new Date(),
          error: null,
        })
        .where(eq(billingEvents.id, eventRecordId));

      return {
        processed: true,
        duplicate: false,
        eventType,
        providerEventId,
        message: "Webhook processed successfully.",
      };
    } catch (error: any) {
      console.error(`[WebhookProcessor] Processing failed for event ${providerEventId}:`, error);
      // Record failure state
      await db
        .update(billingEvents)
        .set({
          status: "failed",
          error: error?.message || "Unknown processing error",
        })
        .where(eq(billingEvents.id, eventRecordId));

      throw error;
    }
  }

  /**
   * Processes verified Razorpay events using the SubscriptionEngine.
   */
  private async handleRazorpayEvent(eventType: string, event: any, eventId: string) {
    switch (eventType) {
      case "payment.captured":
      case "order.paid": {
        const paymentObj = 
          event.payload?.payment?.entity || 
          event.payment?.entity || 
          event.payload?.order?.entity || 
          event.order?.entity || 
          event;
        const orgId = paymentObj?.notes?.organizationId;
        const planId = (paymentObj?.notes?.planId || "starter").toLowerCase();
        const amount = ((paymentObj?.amount || 0) / 100).toFixed(2);
        const currency = paymentObj?.currency?.toUpperCase() || "INR";

        if (orgId) {
          const [org] = await db
            .select({ id: organizations.id })
            .from(organizations)
            .where(eq(organizations.id, orgId))
            .limit(1);

          if (!org) {
            console.warn(`[WebhookProcessor] Razorpay event ${eventId} references unknown organization ${orgId}. Skipping.`);
            break;
          }

          // Convert trial to active paid subscription via central engine
          await subscriptionEngine.convertTrialToPaid({
            organizationId: orgId,
            planId,
            paymentProvider: "razorpay",
            providerSubscriptionId: paymentObj?.notes?.subscriptionId || paymentObj.id,
            providerCustomerId: paymentObj.customer_id,
          });

          // Ensure billing account and invoice record
          let acc = await db.query.billingAccounts.findFirst({
            where: eq(billingAccounts.organizationId, orgId),
          });

          if (!acc) {
            const [newAcc] = await db
              .insert(billingAccounts)
              .values({
                organizationId: orgId,
                email: paymentObj.email || "billing@customer.com",
                currency,
              })
              .returning();
            acc = newAcc;
          }

          if (acc) {
            const invNum = `INV-RZP-${Date.now()}`;
            const [createdInvoice] = await db
              .insert(invoices)
              .values({
                billingAccountId: acc.id,
                number: invNum,
                status: "paid",
                subtotal: amount,
                tax: "0.00",
                total: amount,
                paidAt: new Date(),
              })
              .returning();

            await db.insert(payments).values({
              billingAccountId: acc.id,
              amount,
              currency,
              status: "succeeded",
              providerPaymentId: paymentObj.id,
              invoiceId: createdInvoice.id,
            });
          }
        }
        break;
      }

      case "subscription.activated":
      case "subscription.charged": {
        const subObj = 
          event.payload?.subscription?.entity || 
          event.subscription?.entity || 
          event;
        const orgId = subObj?.notes?.organizationId;
        const planId = (subObj?.notes?.planId || "starter").toLowerCase();

        if (orgId) {
          const [org] = await db
            .select({ id: organizations.id })
            .from(organizations)
            .where(eq(organizations.id, orgId))
            .limit(1);

          if (!org) {
            console.warn(`[WebhookProcessor] Razorpay subscription event ${eventId} references unknown organization ${orgId}. Skipping.`);
            break;
          }

          await subscriptionEngine.convertTrialToPaid({
            organizationId: orgId,
            planId,
            paymentProvider: "razorpay",
            providerSubscriptionId: subObj.id,
          });
        }
        break;
      }

      case "payment.failed": {
        const paymentObj = 
          event.payload?.payment?.entity || 
          event.payment?.entity || 
          event;
        const orgId = paymentObj?.notes?.organizationId;
        if (orgId) {
          const currentStatus = await subscriptionEngine.getSubscriptionStatus(orgId);
          const incomingEventTimestamp = event.created_at ? event.created_at * 1000 : Date.now();
          const currentStateTimestamp = currentStatus.currentPeriodStart ? new Date(currentStatus.currentPeriodStart).getTime() : 0;

          const reversalCheck = billingSecurityService.preventStateReversal({
            currentStatus: currentStatus.state,
            currentStateTimestamp,
            incomingStatus: "PAST_DUE",
            incomingEventTimestamp,
          });

          if (!reversalCheck.allowed) {
            console.warn(`[WebhookProcessor] Discarded replayed payment.failed event for org ${orgId}: ${reversalCheck.reason}`);
            break;
          }

          await subscriptionEngine.recordPaymentFailure(orgId, paymentObj.error_description || "Payment authorization failed");
        }
        break;
      }

      case "subscription.halted":
      case "subscription.cancelled": {
        const subObj = 
          event.payload?.subscription?.entity || 
          event.subscription?.entity || 
          event;
        const orgId = subObj?.notes?.organizationId;
        if (orgId) {
          await subscriptionEngine.requestCancellation(orgId);
        }
        break;
      }

      case "refund.processed":
      case "refund.created":
      case "payment.refunded": {
        const refundObj = 
          event.payload?.refund?.entity || 
          event.refund?.entity || 
          event.payload?.payment?.entity || 
          event.payment?.entity || 
          event;
        const providerPaymentId = refundObj?.payment_id || refundObj?.id;
        const refundAmount = ((refundObj?.amount || 0) / 100).toFixed(2);
        const refundStatus = refundObj?.status === "processed" || refundObj?.status === "refunded" ? "succeeded" : "pending";

        if (providerPaymentId) {
          const [payment] = await db
            .select()
            .from(payments)
            .where(eq(payments.providerPaymentId, providerPaymentId))
            .limit(1);

          if (payment) {
            const existingRefunds = await db
              .select()
              .from(refunds)
              .where(eq(refunds.paymentId, payment.id));

            const totalRefunded = existingRefunds
              .filter((r) => r.status === "succeeded" || r.status === "completed")
              .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

            const paymentAmt = parseFloat(payment.amount) || 0;
            const remainingRefundable = Math.max(0, paymentAmt - totalRefunded);
            const rAmtNum = parseFloat(refundAmount) || 0;

            if (rAmtNum <= (remainingRefundable + 0.001) && rAmtNum > 0) {
              await db.insert(refunds).values({
                paymentId: payment.id,
                amount: refundAmount,
                status: refundStatus,
                providerRefundId: refundObj?.id || eventId,
                reason: refundObj?.notes?.reason || "Processed refund",
              });

              if ((totalRefunded + rAmtNum) >= (paymentAmt - 0.001) && payment.invoiceId) {
                await db
                  .update(invoices)
                  .set({ status: "refunded" })
                  .where(eq(invoices.id, payment.invoiceId));
              }
            }
          }
        }
        break;
      }
    }
  }

  /**
   * Processes verified Stripe events using the SubscriptionEngine.
   */
  private async handleStripeEvent(eventType: string, event: any, eventId: string) {
    switch (eventType) {
      case "checkout.session.completed": {
        const session = event.data?.object as any;
        const orgId = session?.client_reference_id || session?.metadata?.organizationId;
        const planId = (session?.metadata?.planId || "starter").toLowerCase();

        if (orgId) {
          const [org] = await db
            .select({ id: organizations.id })
            .from(organizations)
            .where(eq(organizations.id, orgId))
            .limit(1);

          if (!org) {
            console.warn(`[WebhookProcessor] Stripe checkout event ${eventId} references unknown organization ${orgId}. Skipping.`);
            break;
          }

          await subscriptionEngine.convertTrialToPaid({
            organizationId: orgId,
            planId,
            paymentProvider: "stripe",
            providerSubscriptionId: session.subscription as string,
            providerCustomerId: session.customer as string,
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data?.object as any;
        const orgId = sub?.metadata?.organizationId;
        if (orgId) {
          if (sub.status === "active") {
            await subscriptionEngine.recordPaymentRecovery(orgId);
          } else if (sub.status === "past_due") {
            const currentStatus = await subscriptionEngine.getSubscriptionStatus(orgId);
            const incomingEventTimestamp = event.created ? event.created * 1000 : Date.now();
            const currentStateTimestamp = currentStatus.currentPeriodStart ? new Date(currentStatus.currentPeriodStart).getTime() : 0;

            const reversalCheck = billingSecurityService.preventStateReversal({
              currentStatus: currentStatus.state,
              currentStateTimestamp,
              incomingStatus: "PAST_DUE",
              incomingEventTimestamp,
            });

            if (reversalCheck.allowed) {
              await subscriptionEngine.recordPaymentFailure(orgId, "Stripe invoice past due");
            } else {
              console.warn(`[WebhookProcessor] Discarded replayed Stripe past_due event for org ${orgId}: ${reversalCheck.reason}`);
            }
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data?.object as any;
        const orgId = sub?.metadata?.organizationId;
        if (orgId) {
          await subscriptionEngine.requestCancellation(orgId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data?.object as any;
        const subId = invoice?.subscription as string | undefined;
        if (subId) {
          const subRecord = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.stripeSubscriptionId, subId),
          });
          if (subRecord) {
            await subscriptionEngine.recordPaymentFailure(
              subRecord.organizationId,
              invoice.last_payment_error?.message || "Invoice charge failed"
            );
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data?.object as any;
        const subId = invoice?.subscription as string | undefined;
        if (subId) {
          const subRecord = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.stripeSubscriptionId, subId),
          });
          if (subRecord) {
            await subscriptionEngine.recordPaymentRecovery(subRecord.organizationId);
          }
        }
        break;
      }
    }
  }
}

export const webhookProcessor = new WebhookProcessor();
