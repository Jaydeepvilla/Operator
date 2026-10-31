import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import Stripe from "stripe";
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
    const { planId: inputPlan, interval: inputInterval, currency: inputCurrency, couponCode } = body;

    const targetCurrency = inputCurrency === "GBP" ? "GBP" : "USD";
    const validated = validatePlanIntent(inputPlan, inputInterval, targetCurrency);
    if (!validated) {
      return NextResponse.json({ error: "Invalid plan or interval" }, { status: 400 });
    }

    const { planId, interval } = validated;

    // Fetch authoritative server price from published price book
    const priceRow = await priceBookService.getPublishedPrice(planId, interval, targetCurrency);
    if (!priceRow) {
      return NextResponse.json({ error: "Published pricing not found for plan" }, { status: 404 });
    }

    let amountMinor = priceRow.amountMinor;

    // Validate coupon code server-side if provided
    if (couponCode) {
      const couponCheck = await couponService.validateCoupon(couponCode);
      if (couponCheck.valid && couponCheck.discountPercent) {
        amountMinor = couponService.calculateDiscountedAmount(amountMinor, couponCheck.discountPercent);
      }
    }

    // Fail closed if payment credentials are not configured
    const config = await getPaymentProviderConfig("stripe", orgId);
    if (!config.secretKey) {
      return NextResponse.json(
        { error: "Stripe payment provider is not configured.", code: "PAYMENT_CONFIGURATION_UNAVAILABLE" },
        { status: 503 }
      );
    }

    const stripe = new Stripe(config.secretKey, {
      apiVersion: "2023-10-16" as any,
    });

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "operator.nexxtechnologies.com";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const origin = `${proto}://${host}`;

    // Requirement 5: mode=subscription, trial_period_days=14, payment_method_collection=always,
    // trial_settings.end_behavior.missing_payment_method set to cancel
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_collection: "always",
      subscription_data: {
        trial_period_days: 14,
        trial_settings: {
          end_behavior: {
            missing_payment_method: "cancel",
          },
        },
        metadata: {
          organizationId: orgId,
          userId,
          planId,
          interval,
          currency: targetCurrency,
          couponCode: couponCode || "",
        },
      },
      line_items: [
        {
          price_data: {
            currency: targetCurrency.toLowerCase(),
            product_data: {
              name: `Operator AI ${planId.toUpperCase()} (${interval})`,
              description: `14-day trial, then ${targetCurrency} ${amountMinor / 100} / ${interval}`,
            },
            unit_amount: amountMinor,
            recurring: {
              interval: interval === "yearly" ? "year" : "month",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing/checkout?plan=${planId}&interval=${interval}&currency=${targetCurrency}`,
      metadata: {
        organizationId: orgId,
        userId,
        planId,
        interval,
        currency: targetCurrency,
      },
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error("Stripe create-checkout-session route error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

