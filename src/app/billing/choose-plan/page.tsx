"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/shared/button";
import { cn } from "@/components/shared/utils";
import {
  REGIONAL_CONFIGS,
  type SupportedCurrency,
  getLocalizedPlans,
} from "@/lib/billing/plans";

export default function ChoosePlanPage() {
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>("USD");
  const [yearly, setYearly] = useState(false);

  const regionConfig = REGIONAL_CONFIGS[selectedCurrency] || REGIONAL_CONFIGS.USD;
  const plans = getLocalizedPlans(selectedCurrency);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20">
      <header className="border-b border-border/80 bg-card/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <span className="text-primary font-black">OPERATOR</span>
          <span className="text-muted-foreground text-xs font-semibold px-2 py-0.5 rounded-full bg-muted">
            Choose Plan
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {(["USD", "GBP", "INR"] as SupportedCurrency[]).map((cur) => (
            <button
              key={cur}
              type="button"
              onClick={() => setSelectedCurrency(cur)}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                selectedCurrency === cur
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              {cur}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight mb-3">
            Select a plan to start your 14-day free trial
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Every plan includes a 14-day trial with $0 charged today. Card or UPI required to activate. Cancel anytime with zero charge before your trial ends.
          </p>

          {/* Monthly / Annual Toggle */}
          <div className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/60 backdrop-blur-xs p-1.5 shadow-xs">
            <button
              type="button"
              onClick={() => setYearly(false)}
              className={cn(
                "h-8 px-4 text-xs rounded-full font-semibold transition-all cursor-pointer select-none",
                !yearly
                  ? "bg-primary text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              className={cn(
                "h-8 pl-4 pr-3 text-xs rounded-full font-semibold transition-all cursor-pointer select-none flex items-center gap-1.5",
                yearly
                  ? "bg-primary text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              <span>Annual</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight bg-emerald-500/20 text-emerald-400">
                2 mos free
              </span>
            </button>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => {
            const isPopular = plan.id === "professional";
            const displayPrice = yearly ? plan.yearlyPrice : plan.monthlyPrice;

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative rounded-2xl flex flex-col justify-between p-6 transition-all duration-200",
                  isPopular
                    ? "border-2 border-primary bg-card/90 shadow-lg md:-translate-y-1.5"
                    : "border border-border/80 bg-card/50 hover:border-primary/40"
                )}
              >
                {isPopular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary text-white shadow-sm">
                      <Sparkles className="h-3 w-3" />
                      Popular
                    </span>
                  </div>
                )}

                <div>
                  <div className="border-b border-border/60 pb-4 mb-4">
                    <h2 className="text-xl font-bold">{plan.name}</h2>
                    <p className="text-xs text-muted-foreground min-h-[32px] mt-1">{plan.bestFor}</p>
                    <div className="flex items-baseline gap-1 mt-4">
                      <span className="text-4xl font-extrabold tracking-tight">
                        {plan.currencySymbol}{displayPrice.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground font-semibold">/month</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground/75 mt-1">
                      + applicable taxes (excl. GST/VAT)
                    </div>
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{plan.limits.conversations.toLocaleString()} conversations / mo</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium">
                      {plan.limits.voiceMinutes > 0 ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span>{plan.limits.voiceMinutes} voice minutes included</span>
                        </>
                      ) : (
                        <>
                          <span className="text-muted-foreground/60 w-3.5 text-center font-mono">—</span>
                          <span className="text-muted-foreground">Voice calls not included</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{plan.limits.calendars} business calendar</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/60">
                  <Button
                    asChild
                    variant={isPopular ? "default" : "outline"}
                    className="w-full font-semibold justify-center"
                  >
                    <Link
                      href={`/billing/checkout?plan=${plan.id}&interval=${yearly ? "yearly" : "monthly"}&currency=${selectedCurrency}`}
                    >
                      Start 14-Day Free Trial
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Link>
                  </Button>
                  <p className="text-center text-[11px] text-muted-foreground/80 mt-2 font-medium">
                    14 days free • $0 today • Cancel anytime
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <footer className="border-t border-border/60 py-6 px-6 text-center text-xs text-muted-foreground">
        Operator AI • Secure 256-bit Encrypted Checkout • Excl. GST/VAT
      </footer>
    </div>
  );
}

