import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { subscriptions, payments, billingEvents, billingAccounts, invoices, invoiceItems } from "@/server/db/schema";
import { notificationService } from "@/server/services/notification";
import Stripe from "stripe";

import { getPaymentProviderConfig } from "@/server/services/billing/config";

export async function POST(req: Request) {
  const config = await getPaymentProviderConfig("stripe");

  if (!config.secretKey || !config.webhookSecret) {
    console.error("[Stripe Webhook] Webhook endpoint called but payment configuration is missing/incomplete:", config.missingFields);
    return new NextResponse(
      JSON.stringify({ 
        error: "Stripe webhook is not configured on this server.",
        code: "PAYMENT_CONFIGURATION_UNAVAILABLE" 
      }), 
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const stripe = new Stripe(config.secretKey, {
    apiVersion: "2023-10-16" as any,
  });

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  try {
    const rawBody = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, config.webhookSecret);
    } catch (err: any) {
      console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`);
      return new NextResponse(`Webhook signature verification failed: ${err.message}`, { status: 400 });
    }

    const eventType = event.type;

    // 1. Audit log the billing event
    await db.insert(billingEvents).values({
      eventType,
      payload: event as any,
    });

    // 2. Handle specific Stripe lifecycle events
    switch (eventType) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const orgId = session.client_reference_id || session.metadata?.organizationId;
        const planId = (session.metadata?.planId || "starter").toLowerCase();
        const stripeCustomerId = session.customer as string;
        const stripeSubId = session.subscription as string;

        if (orgId) {
          // 1. Ensure or update billing account
          let acc = await db.query.billingAccounts.findFirst({
            where: eq(billingAccounts.organizationId, orgId),
          });

          if (!acc) {
            const [newAcc] = await db
              .insert(billingAccounts)
              .values({
                organizationId: orgId,
                stripeCustomerId,
                email: session.customer_details?.email || "customer@operator.ai",
                currency: session.currency?.toUpperCase() || "USD",
              })
              .returning();
            acc = newAcc;
          } else if (stripeCustomerId && acc.stripeCustomerId !== stripeCustomerId) {
            await db
              .update(billingAccounts)
              .set({ stripeCustomerId, updatedAt: new Date() })
              .where(eq(billingAccounts.id, acc.id));
          }

          // 2. Update subscription to active
          const existingSub = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.organizationId, orgId),
          });

          const now = new Date();
          const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

          if (existingSub) {
            await db
              .update(subscriptions)
              .set({
                planId,
                status: "active",
                stripeSubscriptionId: stripeSubId || existingSub.stripeSubscriptionId,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                cancelAtPeriodEnd: false,
                updatedAt: now,
              })
              .where(eq(subscriptions.id, existingSub.id));
          } else {
            await db.insert(subscriptions).values({
              organizationId: orgId,
              planId,
              status: "active",
              stripeSubscriptionId: stripeSubId,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: false,
            });
          }
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object as any;
        const subId = subscription.id;
        const status = subscription.status;
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        const cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);
        
        if (subId) {
          const subRecord = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.stripeSubscriptionId, subId),
          });
          
          if (subRecord) {
            const mappedStatus = status === "active" ? "active" : status === "past_due" ? "past_due" : status === "canceled" ? "canceled" : "trialing";
            await db
              .update(subscriptions)
              .set({
                status: mappedStatus,
                currentPeriodEnd,
                cancelAtPeriodEnd,
                updatedAt: new Date(),
              })
              .where(eq(subscriptions.id, subRecord.id));
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const subId = subscription.id;
        
        if (subId) {
          const subRecord = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.stripeSubscriptionId, subId),
          });
          
          if (subRecord) {
            // Mark subscription canceled while preserving historical data
            await db
              .update(subscriptions)
              .set({
                status: "canceled",
                canceledAt: new Date(),
                endedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(subscriptions.id, subRecord.id));
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const stripeInvoice = event.data.object as any;
        const subId = stripeInvoice.subscription as string;
        
        if (subId) {
          const subRecord = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.stripeSubscriptionId, subId),
          });
          
          if (subRecord) {
            // Set subscription status to past_due for grace period handling
            await db
              .update(subscriptions)
              .set({
                status: "past_due",
                updatedAt: new Date(),
              })
              .where(eq(subscriptions.id, subRecord.id));

            // Notify billing contact
            const recipientEmail = stripeInvoice.customer_email;
            if (recipientEmail) {
              const warningHtml = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #ef4444;">Payment Action Required — Operator AI</h2>
                  <p>Your recent renewal payment could not be processed. Your subscription is in a 3-day grace period.</p>
                  <p>Please update your payment method in your billing dashboard to ensure uninterrupted AI receptionist service.</p>
                </div>
              `;
              notificationService.sendEmail(
                recipientEmail,
                "Action Required: Renewal payment failed for Operator AI",
                warningHtml
              ).catch((err) => console.error("[Stripe Webhook] Error sending payment failed email:", err));
            }
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const stripeInvoice = event.data.object as any;
        const subId = stripeInvoice.subscription as string;
        const totalAmount = (stripeInvoice.amount_paid / 100).toFixed(2);
        const taxAmount = ((stripeInvoice.tax || 0) / 100).toFixed(2);
        const subtotalAmount = (Number(totalAmount) - Number(taxAmount)).toFixed(2);
        const currency = stripeInvoice.currency?.toUpperCase() || "USD";
        const chargeId = stripeInvoice.charge as string || `ch_stripe_${Math.random().toString(36).substring(2, 8)}`;
        const invoiceNumber = stripeInvoice.number || `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

        if (subId) {
          const subRecord = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.stripeSubscriptionId, subId),
          });
          
          if (subRecord) {
            // If subscription was past_due, restore to active
            if (subRecord.status === "past_due") {
              await db
                .update(subscriptions)
                .set({ status: "active", updatedAt: new Date() })
                .where(eq(subscriptions.id, subRecord.id));
            }

            // Find or seed billing account
            let acc = await db.query.billingAccounts.findFirst({
              where: eq(billingAccounts.organizationId, subRecord.organizationId),
            });
            
            if (!acc) {
              const [newAcc] = await db
                .insert(billingAccounts)
                .values({
                  organizationId: subRecord.organizationId,
                  stripeCustomerId: stripeInvoice.customer as string,
                  email: stripeInvoice.customer_email || "billing@operatorai.internal",
                  currency,
                })
                .returning();
              acc = newAcc;
            }
            
            if (acc) {
              // 1. Create Invoice Record with dynamic tax breakdown
              const [createdInvoice] = await db
                .insert(invoices)
                .values({
                  billingAccountId: acc.id,
                  subscriptionId: subRecord.id,
                  number: invoiceNumber,
                  status: "paid",
                  subtotal: subtotalAmount,
                  tax: taxAmount,
                  total: totalAmount,
                  paidAt: new Date(),
                  pdfUrl: stripeInvoice.hosted_invoice_url || stripeInvoice.invoice_pdf || null,
                })
                .returning();

              // 2. Insert line items
              const lines = stripeInvoice.lines?.data || [];
              if (lines.length > 0) {
                for (const line of lines) {
                  await db.insert(invoiceItems).values({
                    invoiceId: createdInvoice.id,
                    description: line.description || "Subscription Plan",
                    amount: ((line.amount || 0) / 100).toFixed(2),
                    quantity: line.quantity || 1,
                  });
                }
              } else {
                await db.insert(invoiceItems).values({
                  invoiceId: createdInvoice.id,
                  description: "Monthly Platform Subscription",
                  amount: subtotalAmount,
                  quantity: 1,
                });
              }

              // 3. Record Payment
              await db.insert(payments).values({
                billingAccountId: acc.id,
                subscriptionId: subRecord.id,
                amount: totalAmount,
                currency,
                status: "succeeded",
                providerPaymentId: chargeId,
                invoiceId: createdInvoice.id,
              });

              // 4. Dispatch Automated Invoice Receipt Email
              const recipientEmail = stripeInvoice.customer_email || acc.email;
              if (recipientEmail) {
                const emailHtml = `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2>Payment Receipt — ${invoiceNumber}</h2>
                    <p>Thank you for your payment. Your subscription is active and in good standing.</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                      <tr><td style="padding: 8px 0; color: #666;">Invoice Number:</td><td style="text-align: right; font-weight: bold;">${invoiceNumber}</td></tr>
                      <tr><td style="padding: 8px 0; color: #666;">Subtotal:</td><td style="text-align: right;">$${subtotalAmount}</td></tr>
                      <tr><td style="padding: 8px 0; color: #666;">Taxes / Fees:</td><td style="text-align: right;">$${taxAmount}</td></tr>
                      <tr style="border-top: 1px solid #eee;"><td style="padding: 10px 0; font-size: 16px; font-weight: bold;">Total Paid:</td><td style="text-align: right; font-size: 16px; font-weight: bold; color: #10b981;">$${totalAmount} ${currency}</td></tr>
                    </table>
                    <p style="margin-top: 24px; font-size: 13px; color: #888;">If you have any billing inquiries, please reply to this email or visit your organization settings.</p>
                  </div>
                `;
                notificationService.sendEmail(
                  recipientEmail,
                  `Receipt for your Operator AI subscription (${invoiceNumber})`,
                  emailHtml
                ).catch((err) => console.error("[Stripe Webhook] Error sending invoice email:", err));
              }
            }
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Stripe Webhook processing failed:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 400 });
  }
}
