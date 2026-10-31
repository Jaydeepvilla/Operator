"use client";

import { useState, useEffect, useMemo, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import {
  Check,
  Shield,
  Lock,
  Sparkles,
  Tag,
  Loader2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { cn } from "@/components/shared/utils";
import {
  formatMoney,
  type PlanId,
  type BillingInterval,
  type SupportedCurrency,
  MASTER_PLANS,
  REGIONAL_FACTORS,
} from "@/lib/billing/catalog";
import { validatePlanIntent } from "@/lib/billing/plan-intent";
import { Logo } from "@/components/shared/logo";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Resolve plan intent from searchParams or defaults
  const rawPlan = searchParams.get("plan");
  const rawInterval = searchParams.get("interval");
  const rawCurrency = searchParams.get("currency");
  const rawOffer = searchParams.get("offer");

  const validated = useMemo(
    () => validatePlanIntent(rawPlan || "professional", rawInterval || "monthly", rawCurrency || "USD"),
    [rawPlan, rawInterval, rawCurrency]
  );

  const planId: PlanId = validated?.planId || "professional";
  const [interval, setInterval] = useState<BillingInterval>(validated?.interval || "monthly");
  const [currency, setCurrency] = useState<SupportedCurrency>(validated?.currency || "INR");

  const [couponCode, setCouponCode] = useState(rawOffer?.toUpperCase() || "");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountPercent: number;
    message: string;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [razorpayReady, setRazorpayReady] = useState(false);

  const plan = MASTER_PLANS[planId];
  const isYearly = interval === "yearly";

  // Compute authoritative base & regional prices
  const basePriceMinor = isYearly ? plan.baseYearlyUSD : plan.baseMonthlyUSD;
  const factor = REGIONAL_FACTORS[currency]?.plan ?? 1.0;

  // Indicative fallback exchange rates for UI preview before server-verified token
  const indicativeRates: Record<SupportedCurrency, number> = {
    USD: 1.0,
    GBP: 0.747,
    INR: 95.07,
  };

  const calculatedBaseMinor = useMemo(() => {
    if (currency === "USD") return basePriceMinor;
    if (currency === "GBP") {
      const gbp = Math.round((basePriceMinor / 100) * factor * indicativeRates.GBP);
      const rounded = Math.round(gbp / 10) * 10 - 1;
      return rounded * 100;
    }
    // INR nearest 500 minus 1
    const inr = Math.round((basePriceMinor / 100) * factor * indicativeRates.INR);
    const rounded = Math.round(inr / 500) * 500 - 1;
    return rounded * 100;
  }, [basePriceMinor, factor, currency]);

  // Setup fee calculation (waived on yearly plans per P2)
  const setupFeeMinor = useMemo(() => {
    if (isYearly) return 0;
    if (currency === "USD") return 14900;
    if (currency === "GBP") return 10900;
    return 449900; // ₹4,499 in paise
  }, [isYearly, currency]);

  // Discounted first charge calculation (applied only if coupon valid)
  const firstChargePlanAmount = useMemo(() => {
    if (!appliedCoupon) return calculatedBaseMinor;
    const factor = (100 - appliedCoupon.discountPercent) / 100;
    return Math.round(calculatedBaseMinor * factor);
  }, [calculatedBaseMinor, appliedCoupon]);

  const totalFirstCharge = firstChargePlanAmount + setupFeeMinor;

  // 14-day trial date calculations
  const today = new Date();
  const trialEndsDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const formattedTrialDate = trialEndsDate.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Automatically check launch coupon if passed in query param
  useEffect(() => {
    if (rawOffer && rawOffer.toUpperCase() === "LAUNCH30" && !appliedCoupon) {
      validateCoupon("LAUNCH30");
    }
  }, [rawOffer]);

  const validateCoupon = async (codeToTest: string) => {
    if (!codeToTest.trim()) return;
    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const res = await fetch("/api/billing/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeToTest.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedCoupon({
          code: data.code,
          discountPercent: data.discountPercent,
          message: data.message,
        });
      } else {
        setCouponError(data.error || "Invalid coupon code");
        setAppliedCoupon(null);
      }
    } catch {
      setCouponError("Could not validate coupon. Try again.");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleCheckoutSubmit = async () => {
    setIsSubmitting(true);
    setCheckoutError(null);

    try {
      // Razorpay Checkout (Primary Gateway - Subscriptions & Direct Card/UPI/Netbanking)
      const res = await fetch("/api/billing/razorpay/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          interval,
          couponCode: appliedCoupon?.code,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to initialize payment gateway");
      }

      const data = await res.json();

      if (!window.Razorpay) {
        throw new Error("Razorpay checkout SDK failed to load. Please refresh.");
      }

      const options = {
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "Operator AI",
        description: `14-day free trial on ${plan.displayName} Plan ($0 today)`,
        image: "https://operator.nexxtechnologies.com/logo.png",
        handler: function (response: any) {
          router.push(`/billing/success?provider=razorpay&subscription_id=${response.razorpay_subscription_id}`);
        },
        theme: {
          color: "#6366f1",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        setCheckoutError(response.error?.description || "Payment mandate authentication failed");
      });
      rzp.open();
    } catch (err: any) {
      setCheckoutError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20">
      {/* Load Razorpay SDK on-demand */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={() => setRazorpayReady(true)}
      />

      {/* Header */}
      <header className="border-b border-border/80 bg-card/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo href="/pricing" />
          <span className="text-muted-foreground text-xs font-semibold px-2.5 py-0.5 rounded-full bg-muted border border-border/50">
            Checkout
          </span>
        </div>
        <div className="flex items-center gap-2">
          {(["INR", "USD", "GBP"] as SupportedCurrency[]).map((cur) => (
            <button
              key={cur}
              type="button"
              onClick={() => setCurrency(cur)}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                currency === cur
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              {cur}
            </button>
          ))}
        </div>
      </header>

      {/* Main Checkout View */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Column: Order Summary & Guarantee */}
          <div className="md:col-span-7 space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
                <Sparkles className="h-3 w-3" />
                14-Day Free Trial ($0 Charged Today)
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Activate your {plan.displayName} plan
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Your card or UPI will be saved to prevent interruptions. You will not be charged today.
              </p>
            </div>

            {/* Plan Card Summary */}
            <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-border/60">
                <div>
                  <h2 className="text-lg font-bold">{plan.displayName} Plan</h2>
                  <p className="text-xs text-muted-foreground">{plan.bestFor}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-extrabold">
                    {formatMoney(calculatedBaseMinor, currency)}
                  </span>
                  <span className="text-xs text-muted-foreground block">
                    /{interval === "yearly" ? "year" : "month"}
                  </span>
                </div>
              </div>

              {/* Billing Cycle Switcher */}
              <div className="flex items-center justify-between py-2 text-xs">
                <span className="font-semibold text-muted-foreground">Billing Cycle:</span>
                <div className="inline-flex items-center gap-1 bg-muted/60 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setInterval("monthly")}
                    className={cn(
                      "px-3 py-1 rounded-md font-semibold transition-all cursor-pointer",
                      interval === "monthly" ? "bg-card shadow-xs text-foreground" : "text-muted-foreground"
                    )}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterval("yearly")}
                    className={cn(
                      "px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1",
                      interval === "yearly" ? "bg-card shadow-xs text-foreground" : "text-muted-foreground"
                    )}
                  >
                    <span>Annual</span>
                    <span className="text-[10px] text-emerald-400 font-bold">(2 mos free)</span>
                  </button>
                </div>
              </div>

              {/* Included Plan Highlights */}
              <div className="space-y-2 pt-2 text-xs">
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{plan.limits.conversations.toLocaleString()} conversations per billing cycle</span>
                </div>
                <div className="flex items-center gap-2">
                  {plan.id === "starter" ? (
                    <>
                      <span className="text-muted-foreground/60 w-3.5 text-center font-mono">—</span>
                      <span className="text-muted-foreground">Voice calling starts at Pro</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>
                        30 voice minutes cap during trial (
                        {currency === "INR"
                          ? plan.limits.voiceMinutesByRegion.INR
                          : plan.limits.voiceMinutesByRegion.USD}{" "}
                        mins after conversion)
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>1 business calendar sync & appointment booking</span>
                </div>
              </div>
            </div>

            {/* Launch Promo Code Box */}
            <div className="p-4 rounded-xl bg-card/60 border border-border/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-primary" />
                  Promotion Code
                </span>
                {appliedCoupon && (
                  <span className="text-xs text-emerald-400 font-semibold">
                    {appliedCoupon.code} applied (30% off 3 cycles)
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. LAUNCH30"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  disabled={isValidatingCoupon || !!appliedCoupon}
                  className="flex-1 px-3 py-1.5 text-xs bg-muted/40 border border-border/80 rounded-lg uppercase tracking-wider font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {appliedCoupon ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponCode("");
                    }}
                    className="text-xs"
                  >
                    Remove
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => validateCoupon(couponCode)}
                    disabled={isValidatingCoupon || !couponCode.trim()}
                    className="text-xs"
                  >
                    {isValidatingCoupon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                  </Button>
                )}
              </div>
              {couponError && <p className="text-[11px] text-destructive font-medium">{couponError}</p>}
            </div>

            {/* Trust Assurance Line */}
            <div className="p-4 rounded-xl bg-muted/20 border border-border/60 text-xs text-muted-foreground space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Zero Risk • Cancel Anytime Policy</span>
              </div>
              <p>
                You can cancel anytime before {formattedTrialDate} directly from your dashboard with zero charge.
                All data and settings remain securely preserved.
              </p>
            </div>
          </div>

          {/* Right Column: Transparent Billing Summary & Checkout Trigger */}
          <div className="md:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-md space-y-5">
              <h3 className="text-base font-bold text-foreground border-b border-border/60 pb-3">
                Payment Summary
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Due Today:</span>
                  <span className="font-extrabold text-emerald-400 text-lg">
                    {formatMoney(0, currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                  <span className="text-muted-foreground">Trial Duration:</span>
                  <span className="font-semibold text-foreground">14 Days Free</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">First Charge Date:</span>
                  <span className="font-semibold text-foreground">{formattedTrialDate}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Recurring Subscription:</span>
                  <span className="font-semibold text-foreground">
                    {formatMoney(firstChargePlanAmount, currency)}
                    {appliedCoupon && (
                      <span className="line-through text-muted-foreground/60 ml-1">
                        {formatMoney(calculatedBaseMinor, currency)}
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Setup Fee ({isYearly ? "Waived" : "One-Time"}):
                  </span>
                  <span className={cn("font-semibold", isYearly ? "text-emerald-400" : "text-foreground")}>
                    {isYearly ? "Free ($0)" : formatMoney(setupFeeMinor, currency)}
                  </span>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-baseline justify-between">
                  <span className="font-bold text-foreground">First Charge Total:</span>
                  <span className="text-xl font-black text-foreground">
                    {formatMoney(totalFirstCharge, currency)}
                  </span>
                </div>

                <p className="text-[11px] text-muted-foreground/75 leading-tight">
                  Excl. GST/VAT. Applicable taxes calculated at renewal where required.
                </p>
              </div>

              {checkoutError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {/* Checkout CTA Button */}
              <Button
                size="lg"
                onClick={handleCheckoutSubmit}
                disabled={isSubmitting}
                className="w-full font-bold shadow-md shadow-primary/25 cursor-pointer py-6 text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Connecting Gateway...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Start 14-Day Free Trial ({formatMoney(0, currency)} Today)
                  </>
                )}
              </Button>

              {/* Accepted Payment Methods */}
              <div className="text-center pt-2">
                <span className="text-[11px] text-muted-foreground block mb-1">
                  Accepted Payment Methods ({currency === "INR" ? "India" : "Global"}):
                </span>
                <span className="text-xs font-semibold text-foreground/80">
                  {currency === "INR"
                    ? "UPI AutoPay • Credit & Debit Cards • Netbanking"
                    : "Visa • Mastercard • Amex • Apple Pay • Google Pay"}
                </span>
              </div>
            </div>

            <div className="text-center text-xs text-muted-foreground">
              By continuing, you agree to Operator's{" "}
              <Link href="/terms" className="underline hover:text-foreground">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
              .
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/60 py-6 px-6 text-center text-xs text-muted-foreground">
        Operator AI • 256-bit SSL Encrypted Mandate Verification • Zero Charge Today
      </footer>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
