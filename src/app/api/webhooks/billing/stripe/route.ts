import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { subscriptions, payments, billingEvents, billingAccounts, invoices, invoiceItems } from "@/server/db/schema";
import { notificationService } from "@/server/services/notification";
import Stripe from "stripe";

export async function POST(req: Request) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecret || !webhookSecret) {
    console.error("[Stripe Webhook] Missing Stripe configuration variables");
    return new NextResponse("Stripe configuration error", { status: 500 });
  }

  const stripe = new Stripe(stripeSecret, {
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
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
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

    // 2. Handle specific Stripe events
    switch (eventType) {
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object as any;
        const subId = subscription.id;
        const status = subscription.status;
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        
        if (subId) {
          const subRecord = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.stripeSubscriptionId, subId),
          });
          
          if (subRecord) {
            await db
              .update(subscriptions)
              .set({
                status: status === "active" ? "active" : "trialing",
                currentPeriodEnd,
                updatedAt: new Date(),
              })
              .where(eq(subscriptions.id, subRecord.id));
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
