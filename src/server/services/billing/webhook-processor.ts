import { db } from "../../db";
import { eq, and } from "drizzle-orm";
import {
  billingEvents,
  subscriptions,
  billingAccounts,
  invoices,
  invoiceItems,
  payments,
} from "../../db/schema";
import { subscriptionEngine } from "./subscription-engine";
import { getPlan } from "@/lib/billing/plans";

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

    // 1. Idempotency Check: check if providerEventId has already been recorded
    const existingEvents = await db
      .select()
      .from(billingEvents)
      .where(eq(billingEvents.eventType, `${provider}.${eventType}`));

    const isDuplicate = existingEvents.some((ev) => {
      const p = ev.payload as any;
      return p?.providerEventId === providerEventId || p?.id === providerEventId;
    });

    if (isDuplicate) {
      console.log(`[WebhookProcessor] Duplicate event ${providerEventId} (${eventType}) ignored.`);
      return {
        processed: false,
        duplicate: true,
        eventType,
        providerEventId,
        message: "Event already processed (idempotent).",
      };
    }

    // 2. Record event in billingEvents to claim idempotency lock
    await db.insert(billingEvents).values({
      eventType: `${provider}.${eventType}`,
      payload: {
        providerEventId,
        provider,
        eventType,
        receivedAt: new Date().toISOString(),
        raw: payload,
      },
    });

    // 3. Dispatch to appropriate lifecycle handler
    if (provider === "razorpay") {
      await this.handleRazorpayEvent(eventType, payload, providerEventId);
    } else if (provider === "stripe") {
      await this.handleStripeEvent(eventType, payload, providerEventId);
    }

    return {
      processed: true,
      duplicate: false,
      eventType,
      providerEventId,
      message: "Webhook processed successfully.",
    };
  }

  /**
   * Processes verified Razorpay events using the SubscriptionEngine.
   */
  private async handleRazorpayEvent(eventType: string, event: any, eventId: string) {
    switch (eventType) {
      case "payment.captured":
      case "order.paid": {
        const paymentObj = event.payload?.payment?.entity || event.payload?.order?.entity;
        const orgId = paymentObj?.notes?.organizationId;
        const planId = (paymentObj?.notes?.planId || "starter").toLowerCase();
        const amount = ((paymentObj?.amount || 0) / 100).toFixed(2);
        const currency = paymentObj?.currency?.toUpperCase() || "INR";

        if (orgId) {
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
        const subObj = event.payload?.subscription?.entity;
        const orgId = subObj?.notes?.organizationId;
        const planId = (subObj?.notes?.planId || "starter").toLowerCase();

        if (orgId) {
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
        const paymentObj = event.payload?.payment?.entity;
        const orgId = paymentObj?.notes?.organizationId;
        if (orgId) {
          await subscriptionEngine.recordPaymentFailure(orgId, paymentObj.error_description || "Payment authorization failed");
        }
        break;
      }

      case "subscription.halted":
      case "subscription.cancelled": {
        const subObj = event.payload?.subscription?.entity;
        const orgId = subObj?.notes?.organizationId;
        if (orgId) {
          await subscriptionEngine.requestCancellation(orgId);
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
            await subscriptionEngine.recordPaymentFailure(orgId, "Stripe invoice past due");
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
        const subId = invoice.subscription as string;
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
        const subId = invoice.subscription as string;
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
