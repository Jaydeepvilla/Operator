import { NextRequest, NextResponse } from "next/server";
import { getRazorpayClient } from "@/lib/razorpay";
import { priceBookService } from "@/server/services/billing/price-book-service";
import { normalizePlanId } from "@/lib/billing/catalog";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { planId = "starter", interval = "monthly", receipt, notes = {} } = body;

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Razorpay payment provider is not configured on the server." },
        { status: 503 }
      );
    }

    const normPlan = normalizePlanId(planId);
    const normInterval = interval === "yearly" ? "year" : "month";

    // Strictly resolve price from authoritative published price book - IGNORE any client-supplied amount
    const priceInfo = await priceBookService.getPublishedPrice({
      currency: "INR",
      plan: normPlan,
      interval: normInterval,
    });

    const parsedAmount = priceInfo.amountMinor;
    if (parsedAmount < 100) {
      return NextResponse.json(
        { error: "Invalid price resolution from published price book." },
        { status: 400 }
      );
    }

    const razorpay = getRazorpayClient();
    const orderOptions = {
      amount: parsedAmount,
      currency: "INR",
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: {
        ...notes,
        planId: normPlan,
        interval: normInterval,
        authoritativePriceMinor: String(parsedAmount),
      },
    };

    const order = await razorpay.orders.create(orderOptions);

    return NextResponse.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
      keyId,
    });
  } catch (error: any) {
    console.error("[Create Order] Order creation error:", error?.message);
    const statusCode = error?.statusCode || error?.status || 500;
    return NextResponse.json(
      { error: error?.message || "Failed to create order on server." },
      { status: statusCode }
    );
  }
}
