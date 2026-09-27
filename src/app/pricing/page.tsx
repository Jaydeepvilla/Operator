"use client";

import { useState } from "react";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Check, ArrowRight, Shield, Building2, Sparkles, Zap, Lock, Headphones } from "lucide-react";
import { Button } from "@/components/shared/button";
import { SessionAwareCta } from "@/components/marketing/session-aware-cta";
import { cn } from "@/components/shared/utils";
import { RazorpayCheckoutButton } from "@/components/billing/razorpay-checkout-button";
import { getAllPlans } from "@/lib/billing/plans";
import { GsapScrollSection, GsapReveal, AnimatedCounter } from "@/components/marketing/gsap-scroll-section";
import { PricingComparisonTable, FeatureCategory } from "@/components/marketing/pricing-comparison-table";
import { AnimatedAccordion } from "@/components/marketing/animated-accordion";

const PLANS = getAllPlans().map((p) => ({
  id: p.id,
  name: p.name,
  price: p.price,
  monthlyPrice: p.price,
  yearlyPrice: p.yearlyPrice,
  desc: p.description,
  highlight: Boolean(p.highlight) || p.id === "professional",
  badge: p.badge || (p.id === "professional" ? "Most Popular" : undefined),
  limits: p.limits,
  features: {
    "Conversations": `${p.limits.conversations.toLocaleString()} / mo`,
    "Voice AI Minutes": `${p.limits.voiceMinutes.toLocaleString()} min / mo`,
    "Website Widget": p.features.websiteWidget,
    "SMS Messaging": p.features.sms,
    "Email Responses": p.features.email,
    "WhatsApp": p.features.whatsapp,
    "Instagram / Facebook": p.features.instagramFacebook,
    "Calendar Integrations": p.limits.calendars === null ? "Unlimited" : `${p.limits.calendars} calendar${p.limits.calendars > 1 ? "s" : ""}`,
    "Lead Qualification": p.features.advancedLeadQualification ? "Advanced" : "Basic",
    "Knowledge Base Articles": `${p.limits.knowledgeArticles} articles`,
    "Team Members": `${p.limits.teamMembers}`,
    "Locations": `${p.limits.locations}`,
    "Analytics Dashboard": p.features.analyticsExport ? "Full + Export" : p.id === "professional" ? "Advanced" : "Basic",
    "Custom AI Training": p.features.customAiTraining,
    "Agency / White Label": false,
    "Dedicated Onboarding": p.features.dedicatedOnboarding,
    "SLA Guarantee": p.features.slaGuarantee ? "99.9%" : false,
    "Support": p.id === "business" ? "Dedicated CSM" : p.id === "professional" ? "Priority Email + Chat" : "Email",
  },
}));

const FEATURE_CATEGORIES: FeatureCategory[] = [
  { label: "Core Messaging", features: ["Conversations", "Website Widget", "SMS Messaging", "Email Responses", "WhatsApp", "Instagram / Facebook"] },
  { label: "Voice AI", features: ["Voice AI Minutes"] },
  { label: "Scheduling", features: ["Calendar Integrations"] },
  { label: "AI & Automation", features: ["Lead Qualification", "Knowledge Base Articles", "Custom AI Training"] },
  { label: "Platform", features: ["Team Members", "Locations", "Analytics Dashboard", "Agency / White Label"] },
  { label: "Support & SLA", features: ["Dedicated Onboarding", "SLA Guarantee", "Support"] },
];

const FAQ_ITEMS = [
  {
    q: "Is there a free trial on all plans?",
    a: "Yes. Every plan includes a 14-day free trial with full feature access, real phone numbers, and active integrations. No credit card required to start."
  },
  {
    q: "What happens after my 14-day trial ends?",
    a: "You will receive an automated summary notice 3 days before your trial ends. You can select a subscription tier or do nothing — we never charge you automatically without your confirmation."
  },
  {
    q: "Can I switch or cancel plans at any time?",
    a: "Yes. Upgrade, downgrade, or cancel whenever you choose. Upgrades take effect immediately with prorated credits. Downgrades or cancellations apply at your next billing cycle with zero penalties."
  },
  {
    q: "How are conversations counted across channels?",
    a: "A conversation is counted as one complete inbound or outbound customer interaction (e.g., an entire phone call session, an SMS thread, or a web chat exchange). We do not charge per individual message."
  },
  {
    q: "Do unused voice AI minutes roll over to next month?",
    a: "Voice AI minutes reset at the start of each monthly billing cycle to maintain high-throughput carrier bandwidth allocations. Overage minutes can be billed at standard micro-rates if enabled."
  },
  {
    q: "Are there setup, onboarding, or onboarding migration fees?",
    a: "There are zero setup fees on any plan. Our Business tier includes a dedicated onboarding engineer who will configure your EHR/CRM calendar mappings and custom prompts with white-glove assistance."
  }
];

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);

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
            <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Transparent Pricing</span>
            </div>

            <h1 className="text-display-lg md:text-display-xl font-bold tracking-tight leading-display text-foreground mb-space-5">
              Predictable pricing for
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[hsl(260_80%_65%)] to-[hsl(280_75%_55%)]">
                every size of business.
              </span>
            </h1>

            <p className="mx-auto max-w-xl text-body-md md:text-body-lg text-muted-foreground leading-relaxed mb-space-10">
              Start free for 14 days. Full access to voice AI, calendars, and messaging integrations. Cancel anytime.
            </p>

            {/* Monthly / Annual Toggle Switch */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--foreground)/0.08)] bg-card/60 backdrop-blur-xs p-1.5 shadow-xs mb-space-8">
              <button
                type="button"
                onClick={() => setYearly(false)}
                className={cn(
                  "h-8 px-space-4 text-caption rounded-full font-semibold transition-all duration-200 cursor-pointer select-none",
                  !yearly
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
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
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>Annual</span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-tight uppercase transition-colors",
                    yearly ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"
                  )}
                >
                  Save 20%
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
            {PLANS.map((plan) => {
              const isPopular = plan.highlight;
              const displayPrice = yearly ? plan.yearlyPrice : plan.monthlyPrice;
              const savings = (plan.monthlyPrice - plan.yearlyPrice) * 12;

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "pricing-card-item relative rounded-2xl flex flex-col justify-between transition-all duration-300",
                    isPopular
                      ? "pricing-card-popular pt-space-10 px-space-7 pb-space-7 shadow-[0_12px_45px_rgb(0,0,0,0.1)] md:-translate-y-2"
                      : "border border-[hsl(var(--foreground)/0.08)] bg-card/45 backdrop-blur-xs p-space-6 md:p-space-7 hover:border-primary/30 hover:shadow-md"
                  )}
                >
                  {/* Floating Popular Pill Badge */}
                  {plan.badge && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                      <span className="inline-flex items-center gap-1.5 px-space-3.5 py-space-1 rounded-full text-[11px] font-mono uppercase font-bold tracking-wider bg-gradient-to-r from-primary to-[hsl(280_75%_55%)] text-primary-foreground shadow-md shadow-primary/20">
                        <Sparkles className="h-3 w-3" />
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div>
                    {/* Header info */}
                    <div className="border-b border-[hsl(var(--foreground)/0.05)] pb-space-5 mb-space-5">
                      <h2 className="text-title-lg font-bold text-foreground mb-space-1">{plan.name}</h2>
                      <p className="text-caption text-muted-foreground leading-relaxed min-h-[36px]">
                        {plan.desc}
                      </p>

                      <div className="flex items-baseline gap-space-1.5 mt-space-4">
                        <span className="text-display-md font-mono font-bold text-foreground tracking-tight">
                          ${displayPrice}
                        </span>
                        <span className="text-body-sm text-muted-foreground font-mono">/month</span>
                      </div>

                      {yearly && (
                        <div className="text-[11px] font-mono text-emerald-500 font-semibold mt-space-1">
                          Save ${savings}/year with annual billing
                        </div>
                      )}
                    </div>

                    {/* Quick highlights list */}
                    <div className="space-y-space-2.5 mb-space-8">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70 font-semibold block mb-space-2">
                        Included capabilities:
                      </span>
                      {Object.entries(plan.features).slice(0, 7).map(([featName, featVal]) => {
                        const isExcluded = featVal === false;
                        return (
                          <div
                            key={featName}
                            className={cn(
                              "flex items-start gap-space-2.5 text-caption leading-snug",
                              isExcluded ? "text-muted-foreground/40 line-through" : "text-foreground/85"
                            )}
                          >
                            {isExcluded ? (
                              <span className="text-muted-foreground/30 font-mono text-[11px] mt-0.5">—</span>
                            ) : (
                              <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                            )}
                            <span>
                              <strong className="font-semibold text-foreground">{featName}:</strong>{" "}
                              {featVal === true ? "Included" : featVal === false ? "Not included" : String(featVal)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="space-y-space-3 pt-space-4 border-t border-[hsl(var(--foreground)/0.05)]">
                    <Button
                      asChild
                      variant={isPopular ? "default" : "outline"}
                      size="lg"
                      className="w-full font-semibold shadow-xs justify-center"
                    >
                      <Link href="/sign-up">
                        {isPopular ? "Start 14-Day Free Trial" : "Start Free Trial"}
                      </Link>
                    </Button>

                    {/* Integrated Payment Gate for instant checkout */}
                    <RazorpayCheckoutButton
                      amountInPaise={displayPrice * 100}
                      planName={`${plan.name} Plan (${yearly ? "Annual" : "Monthly"})`}
                      description={`Subscription for Operator AI ${plan.name} Plan`}
                      variant="ghost"
                      size="sm"
                      className="w-full text-[11px] text-muted-foreground hover:text-foreground border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all"
                      onSuccess={(payment) => {
                        window.location.href = `/onboarding?plan=${plan.id}&payment_id=${payment.payment_id}`;
                      }}
                    >
                      <span className="flex items-center justify-center gap-1.5 font-medium">
                        Instant Checkout with Razorpay (${displayPrice})
                      </span>
                    </RazorpayCheckoutButton>

                    <p className="text-center text-[10px] font-mono text-muted-foreground/60">
                      No credit card required for trial · Cancel anytime
                    </p>
                  </div>
                </div>
              );
            })}
          </GsapScrollSection>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 3: ENTERPRISE CUSTOM BANNER (Breather Moment)
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="mx-auto max-w-5xl px-space-6 pb-space-24 z-10 relative">
          <GsapScrollSection animation="scale-up">
            <div className="relative rounded-2xl border border-[hsl(var(--foreground)/0.08)] bg-card/30 backdrop-blur-xs p-space-8 md:p-space-10 flex flex-col md:flex-row items-center justify-between gap-space-6 overflow-hidden">
              <div className="absolute inset-0 dot-grid opacity-10 pointer-events-none" />
              <div className="flex items-center gap-space-5 relative z-10">
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-primary font-bold mb-1">
                    <Shield className="h-3 w-3" /> Custom Volume & HIPAA SLA
                  </div>
                  <h3 className="text-title-lg font-bold text-foreground mb-1">Enterprise & Multi-Clinic Networks</h3>
                  <p className="text-caption md:text-body-sm text-muted-foreground max-w-xl leading-relaxed">
                    Custom voice minute pools, dedicated telephony gateways, BAA agreements, custom CRM adapters, and a dedicated Customer Success Manager.
                  </p>
                </div>
              </div>

              <Button asChild variant="outline" size="lg" className="shrink-0 relative z-10 font-semibold">
                <Link href="/contact" className="flex items-center gap-2">
                  Contact Sales <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </GsapScrollSection>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 4: FULL FEATURE COMPARISON (Considered Design Object)
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="mx-auto max-w-5xl px-space-6 pb-space-28 z-10 relative">
          <GsapScrollSection animation="fade-up">
            <div className="text-center mb-space-12">
              <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Granular Audit</span>
              </div>
              <h2 className="text-heading-xl tracking-tight-md font-bold text-foreground">
                Detailed Breakdown.
                <br />
                <span className="text-primary">Full Feature Matrix.</span>
              </h2>
              <p className="text-body-sm text-muted-foreground mt-space-3 max-w-lg mx-auto">
                Review every capability, telephony limit, and platform integration side-by-side to make the right operational choice.
              </p>
            </div>

            <PricingComparisonTable
              plans={PLANS}
              categories={FEATURE_CATEGORIES}
              yearly={yearly}
            />
          </GsapScrollSection>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 5: TRUST STATS & METRICS (Animated Counters)
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="border-y border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.015)] py-space-16 z-10 relative">
          <GsapScrollSection animation="fade-up" className="mx-auto max-w-5xl px-space-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-8 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-space-4">
                <div className="p-space-3 rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-title-lg font-bold text-foreground mb-1">Enterprise Security</div>
                  <p className="text-caption text-muted-foreground leading-relaxed">
                    SOC2-ready framework, HIPAA-ready infrastructure, AES-256 data encryption at rest and in transit.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-space-4">
                <div className="p-space-3 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0 border border-emerald-500/20">
                  <Headphones className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-title-lg font-bold text-foreground mb-1">Human Onboarding</div>
                  <p className="text-caption text-muted-foreground leading-relaxed">
                    Real audio engineers assist with calendar synchronization and custom intake workflow setup on all tiers.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-space-4">
                <div className="p-space-3 rounded-xl bg-indigo-500/10 text-indigo-500 shrink-0 border border-indigo-500/20">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-title-lg font-bold text-foreground mb-1">Zero Vendor Lock-in</div>
                  <p className="text-caption text-muted-foreground leading-relaxed">
                    Export your call transcripts, lead records, and caller audio archives at any time with a single click.
                  </p>
                </div>
              </div>
            </div>
          </GsapScrollSection>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 6: FREQUENTLY ASKED QUESTIONS (Smooth Height Accordion)
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="py-space-28 md:py-space-32 z-10 relative">
          <GsapScrollSection animation="fade-up" className="mx-auto max-w-3xl px-space-6">
            <div className="text-center mb-space-16">
              <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
                <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Answers & Clarity</span>
              </div>
              <h2 className="text-heading-xl tracking-tight-md font-bold text-foreground">
                Pricing FAQ.
                <br />
                <span className="text-primary">Frequently asked questions.</span>
              </h2>
            </div>

            <AnimatedAccordion items={FAQ_ITEMS} allowMultiple={false} />
          </GsapScrollSection>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 7: FINAL CTA
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="relative py-space-28 md:py-space-36 overflow-hidden border-t border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.01)]">
          <div className="absolute inset-0 dot-grid grid-fade-y pointer-events-none opacity-20" />
          <div className="relative mx-auto max-w-2xl px-space-6 text-center">
            <GsapScrollSection animation="scale-up">
              <h2 className="text-heading-xl tracking-tight-sm leading-snug font-bold text-foreground mb-space-5">
                Start Free.
                <br />
                Ready to <span className="text-primary">deploy your front desk?</span>
              </h2>
              <p className="text-muted-foreground text-body-md md:text-body-lg mb-space-8 max-w-lg mx-auto leading-relaxed">
                Start your 14-day free trial today. Immediate SIP gateway testing. No credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-space-4 justify-center">
                <SessionAwareCta
                  signedInText="Go to Dashboard"
                  signedOutText="Start Free Trial"
                  signedOutHref="/sign-in"
                  size="lg"
                />
                <Button asChild variant="outline" size="lg">
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
