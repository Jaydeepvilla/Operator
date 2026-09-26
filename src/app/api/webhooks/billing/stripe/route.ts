import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getPaymentProviderConfig } from "@/server/services/billing/config";
import { webhookProcessor } from "@/server/services/billing/webhook-processor";

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

    const result = await webhookProcessor.processEvent({
      provider: "stripe",
      providerEventId: event.id,
      eventType: event.type,
      payload: event,
    });

    return NextResponse.json({
      received: true,
      processed: result.processed,
      duplicate: result.duplicate,
    });
  } catch (error: any) {
    console.error("Stripe Webhook processing failed:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 400 });
  }
}
