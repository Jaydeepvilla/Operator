import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { subscriptions, payments, billingEvents, billingAccounts, invoices, invoiceItems } from "@/server/db/schema";
import { notificationService } from "@/server/services/notification";
import { razorpayProvider } from "@/server/services/billing/providers/razorpay";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (signature && !razorpayProvider.verifyWebhookSignature(rawBody, signature)) {
      return new NextResponse("Invalid Razorpay webhook signature", { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;

    // 1. Audit log the event
    await db.insert(billingEvents).values({
      eventType: `razorpay.${eventType}`,
      payload: event as any,
    });

    switch (eventType) {
      case "payment.captured":
      case "order.paid": {
        const paymentObj = event.payload?.payment?.entity || event.payload?.order?.entity;
        const orgId = paymentObj?.notes?.organizationId;
        const subId = paymentObj?.notes?.subscriptionId;
        const amount = ((paymentObj?.amount || 0) / 100).toFixed(2);
        const currency = paymentObj?.currency?.toUpperCase() || "INR";

        if (orgId) {
          const subRecord = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.organizationId, orgId),
          });

          if (subRecord) {
            await db
              .update(subscriptions)
              .set({ status: "active", updatedAt: new Date() })
              .where(eq(subscriptions.id, subRecord.id));

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
                  subscriptionId: subRecord.id,
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
                subscriptionId: subRecord.id,
                amount,
                currency,
                status: "succeeded",
                providerPaymentId: paymentObj.id,
                invoiceId: createdInvoice.id,
              });
            }
          }
        }
        break;
      }

      case "subscription.activated":
      case "subscription.charged": {
        const subObj = event.payload?.subscription?.entity;
        const orgId = subObj?.notes?.organizationId;
        if (orgId) {
          await db
            .update(subscriptions)
            .set({
              status: "active",
              razorpaySubscriptionId: subObj.id,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.organizationId, orgId));
        }
        break;
      }

      case "subscription.halted":
      case "subscription.cancelled": {
        const subObj = event.payload?.subscription?.entity;
        const orgId = subObj?.notes?.organizationId;
        if (orgId) {
          await db
            .update(subscriptions)
            .set({
              status: "canceled",
              canceledAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.organizationId, orgId));
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Razorpay webhook processing failed:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 400 });
  }
}
