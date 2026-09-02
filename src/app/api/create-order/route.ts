import { NextRequest, NextResponse } from "next/server";
import { getRazorpayClient } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let { amount, currency = "INR", receipt, notes } = body;

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: "Razorpay credentials are not configured on the server." },
        { status: 401 }
      );
    }

    // Validate amount
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount < 100) {
      return NextResponse.json(
        {
          error: "Invalid amount. Minimum amount must be at least 100 paise (₹1.00).",
        },
        { status: 400 }
      );
    }

    const razorpay = getRazorpayClient();

    const orderOptions = {
      amount: Math.round(parsedAmount),
      currency: (currency || "INR").toUpperCase(),
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: notes || {},
    };

    const order = await razorpay.orders.create(orderOptions);

    return NextResponse.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
    });
  } catch (error: any) {
    console.error("Razorpay order creation error:", error);

    const statusCode = error?.statusCode || error?.status || 500;
    const errorMessage =
      error?.error?.description ||
      error?.message ||
      "Failed to create Razorpay order.";

    return NextResponse.json(
      {
        error: errorMessage,
        details: error?.error || undefined,
      },
      { status: statusCode === 401 ? 401 : 500 }
    );
  }
}
