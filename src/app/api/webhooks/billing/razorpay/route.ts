import { NextResponse } from "next/server";
import { razorpayProvider } from "@/server/services/billing/providers/razorpay";
import { webhookProcessor } from "@/server/services/billing/webhook-processor";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (signature && !razorpayProvider.verifyWebhookSignature(rawBody, signature)) {
      return new NextResponse("Invalid Razorpay webhook signature", { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;
    // Derive unique provider event ID from payment, order, subscription, or event id
    const providerEventId =
      event.event_id ||
      event.payload?.payment?.entity?.id ||
      event.payload?.subscription?.entity?.id ||
      event.payload?.order?.entity?.id ||
      `rzp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const result = await webhookProcessor.processEvent({
      provider: "razorpay",
      providerEventId,
      eventType,
      payload: event,
    });

    return NextResponse.json({
      received: true,
      processed: result.processed,
      duplicate: result.duplicate,
    });
  } catch (error: any) {
    console.error("Razorpay webhook processing failed:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 400 });
  }
}
