import { NextResponse } from "next/server";
import crypto from "crypto";
import { razorpayProvider } from "@/server/services/billing/providers/razorpay";
import { webhookProcessor } from "@/server/services/billing/webhook-processor";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature || !razorpayProvider.verifyWebhookSignature(rawBody, signature)) {
      return new NextResponse("Invalid or missing Razorpay webhook signature", { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;
    // Derive unique provider event ID from header, event_id, or eventType-scoped entity ID to avoid collision-suppression across event types
    const headerEventId = req.headers.get("x-razorpay-event-id");
    const providerEventId =
      headerEventId ||
      event.event_id ||
      (event.payload?.payment?.entity?.id ? `${eventType}_${event.payload.payment.entity.id}` : null) ||
      (event.payload?.subscription?.entity?.id ? `${eventType}_${event.payload.subscription.entity.id}` : null) ||
      (event.payload?.order?.entity?.id ? `${eventType}_${event.payload.order.entity.id}` : null) ||
      `rzp_${crypto.createHash("sha256").update(rawBody).digest("hex")}`;

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
