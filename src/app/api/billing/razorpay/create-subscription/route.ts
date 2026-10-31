import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { priceBookService } from "@/server/services/billing/price-book-service";
import { couponService } from "@/server/services/billing/coupon-service";
import { validatePlanIntent } from "@/lib/billing/plan-intent";
import { getPaymentProviderConfig } from "@/server/services/billing/config";

export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { planId: inputPlan, interval: inputInterval, couponCode } = body;

    const validated = validatePlanIntent(inputPlan, inputInterval, "INR");
    if (!validated) {
      return NextResponse.json({ error: "Invalid plan or interval" }, { status: 400 });
    }

    const { planId, interval } = validated;

    // Fetch authoritative server price from published price book (Requirement 1, 3)
    const priceRow = await priceBookService.getPublishedPrice(planId, interval, "INR");
    if (!priceRow) {
      return NextResponse.json({ error: "Published pricing not found for plan" }, { status: 404 });
    }

    let amountPaise = priceRow.amountMinor;

    // Validate coupon code server-side if provided
    if (couponCode) {
      const couponCheck = await couponService.validateCoupon(couponCode);
      if (couponCheck.valid && couponCheck.discountPercent) {
        amountPaise = couponService.calculateDiscountedAmount(amountPaise, couponCheck.discountPercent);
      }
    }

    // Fail closed if payment credentials are not configured
    // Use platform Razorpay credentials for SaaS subscription billing
    const config = await getPaymentProviderConfig("razorpay");
    if (!config.secretKey || !config.publishableKey) {
      return NextResponse.json(
        { error: "Razorpay payment provider is not configured.", code: "PAYMENT_CONFIGURATION_UNAVAILABLE" },
        { status: 503 }
      );
    }

    const keyId = config.publishableKey;
    const keySecret = config.secretKey;
    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

    // 14-day trial period start timestamp (Unix timestamp in seconds)
    const nowSec = Math.floor(Date.now() / 1000);
    const startAt = nowSec + 14 * 24 * 60 * 60;
    const roundedAmountPaise = Math.round(amountPaise);

    // 1. Resolve or create Razorpay Plan
    let rzpPlanId = priceRow.providerPlanId;
    if (!rzpPlanId || rzpPlanId.startsWith("pending_")) {
      const planRes = await fetch("https://api.razorpay.com/v1/plans", {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          period: interval === "yearly" ? "yearly" : "monthly",
          interval: 1,
          item: {
            name: `Operator AI ${planId.toUpperCase()} (${interval})`,
            amount: roundedAmountPaise,
            currency: "INR",
            description: `Subscription for ${planId} plan on Operator AI`,
          },
        }),
      });

      if (!planRes.ok) {
        const errText = await planRes.text();
        console.error("Razorpay Plan creation error:", errText);
        let errorDetail = "";
        try {
          const parsed = JSON.parse(errText);
          errorDetail = parsed.error?.description || parsed.error?.message || "";
        } catch {
          errorDetail = errText;
        }

        const isSubscriptionFeatureDisabled =
          errorDetail.toLowerCase().includes("subscription") ||
          errorDetail.toLowerCase().includes("not enabled") ||
          errorDetail.toLowerCase().includes("not activated");

        return NextResponse.json(
          {
            error: isSubscriptionFeatureDisabled
              ? "Razorpay Subscriptions (e-Mandate) is not yet active on your Razorpay dashboard. Please activate Subscriptions in your Razorpay account settings to accept automated trial mandates."
              : errorDetail
              ? `Payment gateway error: ${errorDetail}`
              : "Failed to initialize plan on payment gateway",
            details: errText,
            code: "GATEWAY_ERROR",
          },
          { status: 502 }
        );
      }

      const planData = await planRes.json();
      rzpPlanId = planData.id;
    }

    // 2. Create Razorpay Subscription with start_at set to 14 days in future
    const subRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: rzpPlanId,
        total_count: interval === "yearly" ? 5 : 12,
        quantity: 1,
        start_at: startAt,
        customer_notify: 1,
        notes: {
          organizationId: orgId,
          userId,
          planId,
          interval,
          currency: "INR",
          couponCode: couponCode || "",
        },
      }),
    });

    if (!subRes.ok) {
      const errText = await subRes.text();
      console.error("Razorpay Subscription creation error:", errText);
      let errorDetail = "";
      try {
        const parsed = JSON.parse(errText);
        errorDetail = parsed.error?.description || parsed.error?.message || "";
      } catch {
        errorDetail = errText;
      }

      const isSubscriptionFeatureDisabled =
        errorDetail.toLowerCase().includes("subscription") ||
        errorDetail.toLowerCase().includes("not enabled") ||
        errorDetail.toLowerCase().includes("recurring");

      return NextResponse.json(
        {
          error: isSubscriptionFeatureDisabled
            ? "Razorpay Subscriptions is not yet active on your Razorpay dashboard. Please activate Subscriptions in your Razorpay account settings."
            : errorDetail
            ? `Payment gateway error: ${errorDetail}`
            : "Failed to create subscription mandate",
          details: errText,
          code: "SUBSCRIPTION_MANDATE_ERROR",
        },
        { status: 502 }
      );
    }

    const subData = await subRes.json();

    return NextResponse.json({
      subscriptionId: subData.id,
      keyId,
      amountPaise,
      currency: "INR",
      planId,
      interval,
      startAt,
    });
  } catch (error: any) {
    console.error("Razorpay create-subscription route error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

