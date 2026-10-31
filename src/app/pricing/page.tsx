"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import {
  Check,
  ArrowRight,
  Shield,
  Building2,
  Sparkles,
  Zap,
  Lock,
  Headphones,
  Phone,
  MessageSquare,
  Calendar,
  Globe,
  Tag,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { SessionAwareCta } from "@/components/marketing/session-aware-cta";
import { cn } from "@/components/shared/utils";
import {
  REGIONAL_CONFIGS,
  type SupportedCurrency,
  getLocalizedPlans,
} from "@/lib/billing/plans";
import { GsapScrollSection, GsapReveal } from "@/components/marketing/gsap-scroll-section";
import { AnimatedAccordion } from "@/components/marketing/animated-accordion";

interface ComparisonRow {
  name: string;
  starter: string | boolean;
  pro: string | boolean;
  business: string | boolean;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  { name: "Website chat widget", starter: true, pro: true, business: true },
  { name: "WhatsApp conversations", starter: true, pro: true, business: true },
  {
    name: "AI answers from documents & FAQs",
    starter: "Up to 20 docs",
    pro: "Up to 100 docs",
    business: "Higher limit",
  },
  {
    name: "Appointment booking & calendar sync",
    starter: "1 business calendar",
    pro: "1 business calendar",
    business: "1 business calendar",
  },
  { name: "Locations", starter: "1", pro: "1", business: "Up to 5" },
  { name: "Lead capture & shared inbox", starter: true, pro: true, business: true },
  { name: "Email alerts & handoff to a human", starter: true, pro: true, business: true },
  { name: "Email reminders", starter: true, pro: true, business: true },
  {
    name: "Voice AI call triage & automated call summaries",
    starter: false,
    pro: true,
    business: true,
  },
  { name: "Missed-call text-back", starter: false, pro: "Coming soon", business: "Coming soon" },
  { name: "Call recordings & transcripts", starter: false, pro: true, business: true },
  { name: "Transfer calls to a human phone number", starter: false, pro: true, business: true },
  {
    name: "SMS & WhatsApp reminders, no-show recovery, waitlist",
    starter: false,
    pro: "Reminders (Recovery coming soon)",
    business: "Reminders (Recovery coming soon)",
  },
  { name: "Deposits & payment links", starter: false, pro: true, business: true },
  {
    name: "ROI dashboard (calls, bookings, revenue recovered)",
    starter: "Basic analytics",
    pro: true,
    business: "Yes, with CSV export",
  },
  { name: "CRM and webhook integrations", starter: false, pro: false, business: "Coming soon" },
  {
    name: "Custom call routing & business-hours rules",
    starter: false,
    pro: false,
    business: true,
  },
  { name: "Team roles & audit log", starter: false, pro: false, business: true },
  { name: "Onboarding call", starter: false, pro: false, business: true },
  { name: "Support", starter: "Email", pro: "Priority email", business: "Priority, with onboarding" },
];

const PRICING_FAQS = [
  {
    q: "Why doesn't Starter include phone calls?",
    a: "Phone answering has real per-minute carrier costs, so it starts at Pro. Starter keeps chat and WhatsApp booking affordable for solo practices and single-location businesses.",
  },
  {
    q: "What counts as a conversation?",
    a: "One conversation is one customer thread on chat or WhatsApp, from the first message until it goes quiet. We never bill per individual message back and forth.",
  },
  {
    q: "What happens if I use all my voice minutes?",
    a: "Calls keep being answered without interruption. Extra minutes are billed at the standard overage rate for your market.",
  },
  {
    q: "Can I forward only missed or after-hours calls?",
    a: "Yes. Many customers forward only unanswered and after-hours calls, which uses far fewer minutes while ensuring zero customer inquiries slip through the cracks.",
  },
  {
    q: "Do I need a contract?",
    a: "No. Plans are monthly with no long-term commitment. You can cancel anytime before your next billing date.",
  },
  {
    q: "What if the AI can't answer something?",
    a: "It tells the customer it will pass the question on, alerts your team immediately, and on Pro and Business can transfer the call directly to a person.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes. Upgrade or downgrade at any time, and the change applies from your next billing date with prorated adjustments.",
  },
];

export default function PricingPage() {
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>("USD");
  const [yearly, setYearly] = useState(false);

  const regionConfig = REGIONAL_CONFIGS[selectedCurrency] || REGIONAL_CONFIGS.USD;
  const plans = useMemo(() => {
    return getLocalizedPlans(selectedCurrency);
  }, [selectedCurrency]);

  return (
    <div className="relative flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/20">
      <MarketingNav />

      <main className="flex-1 overflow-x-hidden">
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 1: HERO
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="relative overflow-hidden pt-space-28 pb-space-12 md:pt-space-32 md:pb-space-16">
          <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[500px] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.09),transparent_70%)] pointer-events-none" />

          <GsapScrollSection animation="fade-up" className="relative mx-auto max-w-4xl px-space-6 text-center">
            {/* Regional Currency Selector Tabs */}
            <div className="inline-flex items-center gap-1 p-1 rounded-full border border-border/80 bg-card/60 backdrop-blur-md mb-space-6 shadow-xs">
              {(["USD", "GBP", "INR"] as SupportedCurrency[]).map((cur) => {
                const reg = REGIONAL_CONFIGS[cur];
                const isActive = selectedCurrency === cur;
                return (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => setSelectedCurrency(cur)}
                    className={cn(
                      "px-3.5 py-1 text-caption font-semibold rounded-full transition-all duration-150 cursor-pointer flex items-center gap-1.5",
                      isActive
                        ? "bg-primary text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    )}
                  >
                    <span>{reg.symbol} {cur}</span>
                    <span className="text-xs opacity-75 font-normal">({reg.marketName})</span>
                  </button>
                );
              })}
            </div>

            {/* Headline */}
            <h1 className="text-display-lg md:text-display-xl font-bold tracking-tight leading-display text-foreground mb-space-4">
              Never miss another customer.
            </h1>

            {/* Market-Specific Sub-headline Variant */}
            <div className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-caption font-medium text-primary mb-space-5">
              {regionConfig.headlineHero}
            </div>

            <p className="mx-auto max-w-2xl text-body-md md:text-body-lg text-muted-foreground leading-relaxed mb-space-8">
              Operator answers chats and messages around the clock, books appointments into your calendar, and provides conversational voice AI call triage on Pro and Business plans. Simple monthly plans. No long-term contract.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-space-3 mb-space-4">
              <SessionAwareCta
                signedInText="Go to Dashboard"
                signedOutText="Start Free Trial"
                signedOutHref="/sign-up"
                size="lg"
              />
              <Button asChild variant="outline" size="lg" className="font-semibold">
                <Link href="/demo">
                  Book a Demo
                </Link>
              </Button>
            </div>

            {/* Reassuring Line Under Buttons */}
            <p className="text-caption text-muted-foreground/80 font-medium max-w-lg mx-auto">
              14-day free trial ($0 today) on all plans. Payment method saved to start. Cancel anytime before trial ends.
            </p>

            {/* Monthly / Annual Billing Toggle */}
            <div className="mt-space-8 inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/60 backdrop-blur-xs p-1.5 shadow-xs">
              <button
                type="button"
                onClick={() => setYearly(false)}
                className={cn(
                  "h-8 px-space-4 text-caption rounded-full font-semibold transition-all duration-200 cursor-pointer select-none",
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
                  "h-8 pl-space-4 pr-space-3 text-caption rounded-full font-semibold transition-all duration-200 cursor-pointer select-none flex items-center gap-2",
                  yearly
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <span>Annual</span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-semibold tracking-tight uppercase transition-colors",
                    yearly ? "bg-white/20 text-white" : "bg-emerald-500/15 text-emerald-400"
                  )}
                >
                  Pay 10 mos, get 12
                </span>
              </button>
            </div>
          </GsapScrollSection>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 2: PLAN CARDS (3 TIERS)
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="relative mx-auto max-w-6xl px-space-6 pb-space-20 z-10">
          <GsapScrollSection
            animation="fade-up"
            staggerSelector=".pricing-card-item"
            stagger={0.1}
            className="grid grid-cols-1 md:grid-cols-3 gap-space-6 items-stretch"
          >
            {plans.map((plan) => {
              const isPopular = plan.id === "professional";
              const displayPrice = yearly ? plan.yearlyPrice : plan.monthlyPrice;
              const formattedPrice = displayPrice.toLocaleString();

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "pricing-card-item relative rounded-2xl flex flex-col justify-between transition-all duration-300",
                    isPopular
                      ? "border-2 border-primary bg-card/90 pt-space-10 px-space-7 pb-space-7 shadow-[0_12px_45px_rgb(0,0,0,0.1)] md:-translate-y-2 ring-1 ring-primary/40"
                      : "border border-border/80 bg-card/45 backdrop-blur-xs p-space-6 md:p-space-7 hover:border-primary/40 hover:shadow-md"
                  )}
                >
                  {/* Floating Most Popular Badge */}
                  {isPopular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-caption font-semibold uppercase tracking-wider bg-gradient-to-r from-primary to-violet-600 text-white shadow-md shadow-primary/30">
                        <Sparkles className="h-3 w-3" />
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div>
                    {/* Header */}
                    <div className="border-b border-border/60 pb-space-5 mb-space-5">
                      <div className="flex items-center justify-between mb-1">
                        <h2 className="text-title-lg font-bold text-foreground">{plan.name}</h2>
                        {plan.id === "starter" && (
                          <span className="text-xs font-semibold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full">
                            Chat & WhatsApp
                          </span>
                        )}
                        {plan.id === "business" && (
                          <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                            Multi-Location
                          </span>
                        )}
                      </div>

                      <p className="text-caption text-muted-foreground leading-relaxed min-h-[38px]">
                        {plan.bestFor}
                      </p>

                      {/* Pricing block */}
                      <div className="flex items-baseline gap-space-2 mt-space-5 mb-space-1">
                        <span className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                          {plan.currencySymbol}{formattedPrice}
                        </span>
                        <span className="text-body-sm text-muted-foreground font-semibold">/month</span>
                      </div>

                      {yearly ? (
                        <div className="text-caption text-emerald-400 font-semibold mt-1">
                          Setup fee waived · 2 months free annually
                        </div>
                      ) : (
                        <div className="text-caption text-muted-foreground mt-1">
                          Billed monthly · Cancel anytime
                        </div>
                      )}
                      <div className="text-[11px] text-muted-foreground/75 mt-0.5">
                        + applicable taxes (excl. GST/VAT)
                      </div>
                    </div>

                    {/* Card Copy Summary */}
                    <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 mb-space-6 text-body-sm text-foreground/90 leading-snug">
                      {plan.cardCopy}
                    </div>

                    {/* Monthly Included Capacity */}
                    <div className="space-y-space-2.5 mb-space-6">
                      <span className="text-caption font-mono uppercase tracking-widest text-muted-foreground/80 font-bold block mb-space-2">
                        Included Each Month:
                      </span>

                      <div className="flex items-center gap-2.5 text-body-sm text-foreground">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>
                          <strong>{plan.limits.conversations.toLocaleString()}</strong> conversations / mo
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 text-body-sm text-foreground">
                        {plan.limits.voiceMinutes > 0 ? (
                          <>
                            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                            <span>
                              <strong>{plan.limits.voiceMinutes}</strong> voice minutes included
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-muted-foreground/80 font-mono text-body-sm w-4 text-center">—</span>
                            <span className="text-muted-foreground">
                              Voice minutes: <strong>None</strong> (Starts at Pro)
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 text-body-sm text-foreground">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>
                          {plan.limits.calendars === 1
                            ? "1 business calendar"
                            : `Up to ${plan.limits.calendars} business calendars`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 text-body-sm text-foreground">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>
                          {plan.limits.locations === 1
                            ? "1 business location"
                            : `Up to ${plan.limits.locations} business locations`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="space-y-space-3 pt-space-4 border-t border-border/60">
                    <Button
                      asChild
                      variant={isPopular ? "default" : "outline"}
                      size="lg"
                      className={cn(
                        "w-full font-semibold shadow-xs justify-center",
                        isPopular
                          ? "bg-primary text-white hover:bg-primary-hover shadow-md shadow-primary/25"
                          : "border border-border/80 text-foreground hover:bg-muted/40"
                      )}
                    >
                      <Link
                        href={`/sign-up?plan=${plan.id}&interval=${yearly ? "yearly" : "monthly"}&currency=${selectedCurrency}`}
                      >
                        Start 14-Day Free Trial
                      </Link>
                    </Button>

                    <p className="text-center text-[12px] text-muted-foreground/75 font-medium">
                      14 days free • $0 today • Cancel anytime
                    </p>
                  </div>
                </div>
              );
            })}
          </GsapScrollSection>

          {/* Launch Special Offer Ribbon */}
          <div className="mt-space-6 p-space-4 rounded-2xl bg-primary/[0.07] border border-primary/25 flex flex-col sm:flex-row items-center justify-between gap-space-4 text-center sm:text-left">
            <div className="flex items-center gap-space-3">
              <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Tag className="h-4 w-4" />
              </div>
              <div>
                <span className="text-body-sm font-bold text-foreground block">
                  Early Adopter Launch Offer: 30% Off for 3 Months
                </span>
                <span className="text-caption text-muted-foreground">
                  Available for the first 5 customers in exchange for a testimonial and case study permission.
                </span>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="font-semibold shrink-0">
              <Link
                href={`/sign-up?plan=professional&interval=${yearly ? "yearly" : "monthly"}&currency=${selectedCurrency}&offer=launch30`}
              >
                Claim Launch Offer
              </Link>
            </Button>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 3: USAGE, BILLING & OVERAGE RULES
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="mx-auto max-w-5xl px-space-6 pb-space-20 z-10 relative">
          <GsapScrollSection animation="fade-up">
            <div className="text-center mb-space-8">
              <h2 className="text-title-xl font-bold text-foreground">
                Usage, Billing & Overage Rules ({regionConfig.marketName})
              </h2>
              <p className="text-body-sm text-muted-foreground mt-1 max-w-xl mx-auto">
                Extra usage is billed per unit with no hidden penalties. The setup fee is completely waived on annual plans.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-4 mb-space-8">
              <div className="p-space-5 rounded-2xl bg-card border border-border/80 text-center sm:text-left shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Extra Voice Minutes
                </span>
                <div className="text-3xl font-extrabold text-foreground mb-1">
                  {regionConfig.extraVoiceMinute}
                  <span className="text-body-sm font-normal text-muted-foreground"> / min</span>
                </div>
                <p className="text-caption text-muted-foreground">
                  Billed only when included voice minutes are exceeded. Calls never drop.
                </p>
              </div>

              <div className="p-space-5 rounded-2xl bg-card border border-border/80 text-center sm:text-left shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Extra 500 Conversations
                </span>
                <div className="text-3xl font-extrabold text-foreground mb-1">
                  {regionConfig.extraConversations}
                </div>
                <p className="text-caption text-muted-foreground">
                  Added automatically in 500-conversation bundles if monthly volume spikes.
                </p>
              </div>

              <div className="p-space-5 rounded-2xl bg-card border border-border/80 text-center sm:text-left shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  One-Time Setup Fee
                </span>
                <div className="text-3xl font-extrabold text-foreground mb-1">
                  {regionConfig.setupFee}
                </div>
                <p className="text-caption text-emerald-400 font-medium">
                  Waived 100% on annual billing plans. Covers guided calendar and channel setup.
                </p>
              </div>
            </div>

            <div className="p-space-5 rounded-xl bg-card/40 border border-border/60 text-caption text-muted-foreground/90 space-y-2">
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                <span><strong>Annual billing:</strong> Pay for 10 months and get 12. Setup fee is completely waived.</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                <span><strong>Trial policy:</strong> 14 days free on Starter. 7-day money-back pilot on Pro and Business.</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                <span><strong>Taxes:</strong> Applicable taxes (such as GST in India or VAT in the UK) are calculated at checkout where required.</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                <span><strong>Cancel anytime:</strong> Monthly subscriptions can be canceled before the next renewal date with zero cancellation fee.</span>
              </div>
            </div>
          </GsapScrollSection>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 4: FULL FEATURE COMPARISON TABLE
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="mx-auto max-w-5xl px-space-6 pb-space-24 z-10 relative">
          <GsapScrollSection animation="fade-up">
            <div className="text-center mb-space-10">
              <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-4">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="text-caption uppercase tracking-widest font-semibold text-primary">
                  What is Included
                </span>
              </div>
              <h2 className="text-heading-xl tracking-tight-md font-bold text-foreground">
                Compare Plan Features Side-by-Side
              </h2>
              <p className="text-body-sm text-muted-foreground mt-2 max-w-lg mx-auto">
                Starter covers chat and WhatsApp only. AI phone answering, call recordings, and live call transfers begin at Pro.
              </p>
            </div>

            {/* Responsive Comparison Table */}
            <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40">
                    <th className="p-4 text-body-sm font-bold text-foreground">Feature</th>
                    <th className="p-4 text-body-sm font-bold text-foreground text-center w-36">Starter</th>
                    <th className="p-4 text-body-sm font-bold text-primary text-center w-44 bg-primary/5">
                      Pro (Popular)
                    </th>
                    <th className="p-4 text-body-sm font-bold text-foreground text-center w-44">Business</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-body-sm">
                  {COMPARISON_ROWS.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-medium text-foreground">{row.name}</td>
                      <td className="p-4 text-center">
                        {typeof row.starter === "boolean" ? (
                          row.starter ? (
                            <Check className="h-4 w-4 text-emerald-400 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground/80 font-mono">—</span>
                          )
                        ) : (
                          <span className="text-caption font-semibold text-foreground/80">{row.starter}</span>
                        )}
                      </td>
                      <td className="p-4 text-center bg-primary/[0.02]">
                        {typeof row.pro === "boolean" ? (
                          row.pro ? (
                            <Check className="h-4 w-4 text-primary mx-auto" />
                          ) : (
                            <span className="text-muted-foreground/80 font-mono">—</span>
                          )
                        ) : (
                          <span className="text-caption font-semibold text-primary">{row.pro}</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {typeof row.business === "boolean" ? (
                          row.business ? (
                            <Check className="h-4 w-4 text-emerald-400 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground/80 font-mono">—</span>
                          )
                        ) : (
                          <span className="text-caption font-semibold text-foreground/80">{row.business}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GsapScrollSection>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 5: FREQUENTLY ASKED QUESTIONS
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="py-space-16 z-10 relative border-t border-border/60">
          <GsapScrollSection animation="fade-up" className="mx-auto max-w-3xl px-space-6">
            <div className="text-center mb-space-12">
              <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-4">
                <HelpCircle className="h-3.5 w-3.5 text-primary" />
                <span className="text-caption uppercase tracking-widest font-semibold text-primary">
                  Got Questions?
                </span>
              </div>
              <h2 className="text-heading-xl tracking-tight-md font-bold text-foreground">
                Frequently Asked Questions
              </h2>
            </div>

            <AnimatedAccordion items={PRICING_FAQS} allowMultiple={false} />
          </GsapScrollSection>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 6: FINAL CTA
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="relative py-space-24 overflow-hidden border-t border-border/60 bg-muted/10">
          <div className="relative mx-auto max-w-2xl px-space-6 text-center">
            <GsapScrollSection animation="scale-up">
              <h2 className="text-heading-xl font-bold text-foreground mb-space-4">
                Ready to answer every customer inquiry?
              </h2>
              <p className="text-muted-foreground text-body-md mb-space-8 max-w-lg mx-auto leading-relaxed">
                Start with a 14-day free trial on Starter or a 7-day pilot on Pro and Business. No long-term contracts.
              </p>
              <div className="flex flex-col sm:flex-row gap-space-3 justify-center">
                <SessionAwareCta
                  signedInText="Go to Dashboard"
                  signedOutText="Start Free Trial"
                  signedOutHref="/sign-up"
                  size="lg"
                />
                <Button asChild variant="outline" size="lg" className="font-semibold">
                  <Link href="/demo">
                    Schedule Live Demo
                  </Link>
                </Button>
              </div>
            </GsapScrollSection>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
