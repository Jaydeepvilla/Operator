import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpaySignature } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required payment verification fields (razorpay_order_id, razorpay_payment_id, razorpay_signature).",
        },
        { status: 400 }
      );
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        {
          success: false,
          error: "RAZORPAY_KEY_SECRET is not configured on the server.",
        },
        { status: 500 }
      );
    }

    const isValid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment verification failed: Invalid signature mismatch.",
        },
        { status: 400 }
      );
    }

    const today = new Date();
    const formattedDate = today.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const amountInPaise = body.amountInPaise || 14900;
    const totalAmount = amountInPaise / 100;
    const subtotal = Number((totalAmount / 1.18).toFixed(2));
    const tax = Number((totalAmount - subtotal).toFixed(2));
    const invoiceNum = `OPR-INV-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, "0")}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const invoice = {
      invoiceNumber: invoiceNum,
      date: formattedDate,
      planName: body.planName || "Operator AI Subscription",
      description: body.description || "24/7 AI Voice & Multichannel Receptionist Tier",
      amount: totalAmount,
      subtotal: subtotal,
      tax: tax,
      total: totalAmount,
      currency: body.currency || "INR",
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      customerName: body.customerName || body.prefill?.name || "Valued Customer",
      customerEmail: body.customerEmail || body.prefill?.email || "customer@example.com",
      customerPhone: body.customerPhone || body.prefill?.contact || "",
      businessName: "Operator AI (Nexx Technologies)",
      businessAddress: "Nexx Technologies HQ, Tech Boulevard Suite 400",
      businessGst: "27AAACN8491F1Z8",
      supportEmail: "hello@nexxtecchnologies.com",
    };

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully.",
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      invoice,
    });
  } catch (error: any) {
    console.error("Razorpay signature verification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Internal payment verification error.",
      },
      { status: 500 }
    );
  }
}
