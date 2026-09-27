"use client";

import * as React from "react";
import { useRef, useEffect } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  GsapScrollSection,
  GsapReveal,
  AnimatedCounter,
} from "@/components/marketing/gsap-scroll-section";
import { SessionAwareCta } from "@/components/marketing/session-aware-cta";
import { DashboardPreview } from "@/components/marketing/visualizations/dashboard-preview";
import { ProductSimulation } from "@/components/marketing/visualizations/product-simulation";
import { InteractiveIndustryExplorer } from "@/components/marketing/visualizations/industry-explorer";
import { ROISimulatorSection } from "@/components/marketing/visualizations/revenue-recovery-simulator";
import { Button } from "@/components/shared/button";
import {
  ArrowRight,
  Check,
  ChevronRight,
  PhoneOff,
  Clock,
  TrendingUp,
  Zap,
  Sparkles,
  XCircle,
  Phone,
  Bot,
  Calendar,
  BarChart3,
  Activity,
  Shield,
  Globe,
  MessageSquare,
} from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ── Data ──────────────────────────────────────────────────────── */

const PAIN_STATS = [
  {
    stat: "62%",
    label: "of callers hang up",
    sublabel: "if not answered immediately",
    icon: PhoneOff,
  },
  {
    stat: "$1,200",
    label: "average lifetime value",
    sublabel: "lost per missed lead",
    icon: TrendingUp,
  },
  {
    stat: "35%",
    label: "of calls arrive",
    sublabel: "outside business hours",
    icon: Clock,
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Customer Calls",
    description: "A call, WhatsApp message, or chat comes in — at any hour.",
    icon: Phone,
  },
  {
    step: "02",
    title: "Operator Answers",
    description: "AI picks up in under 2 seconds. Greets, qualifies, and captures every detail.",
    icon: Bot,
  },
  {
    step: "03",
    title: "Booked & Notified",
    description: "Appointment confirmed, calendar synced, lead card created — all automatically.",
    icon: Calendar,
  },
];

const FEATURES = [
  {
    title: "Voice & Chat AI",
    description: "Natural conversations across phone, WhatsApp, and web chat. Feels human, works 24/7.",
    icon: MessageSquare,
  },
  {
    title: "Instant Booking",
    description: "Syncs with Google Calendar, Calendly, and EHR systems. Zero double-bookings.",
    icon: Calendar,
  },
  {
    title: "Lead Intelligence",
    description: "Every interaction creates a qualified lead card with intent scoring and follow-up triggers.",
    icon: BarChart3,
  },
  {
    title: "Multi-Channel",
    description: "One brain across phone, WhatsApp, Instagram DM, and your website widget.",
    icon: Globe,
  },
  {
    title: "Real-Time Analytics",
    description: "Live dashboard showing calls answered, leads captured, revenue recovered, and trends.",
    icon: Activity,
  },
  {
    title: "Enterprise Security",
    description: "SOC 2 compliant, end-to-end encrypted, HIPAA-ready for healthcare practices.",
    icon: Shield,
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "$49",
    period: "/month",
    desc: "For solo practitioners & independent studios",
    features: [
      "500 conversations/mo",
      "100 voice minutes included",
      "Website chat widget",
      "1 calendar integration",
      "Email support",
    ],
    highlight: false,
    cta: "Start free trial",
  },
  {
    name: "Professional",
    price: "$149",
    period: "/month",
    desc: "For growing clinics & professional offices",
    features: [
      "2,500 conversations/mo",
      "500 voice minutes included",
      "All channels (WhatsApp, Web, Voice)",
      "Lead intake qualification card",
      "3 calendar sync channels",
      "Priority customer support",
    ],
    highlight: true,
    cta: "Start free trial",
  },
  {
    name: "Business",
    price: "$349",
    period: "/month",
    desc: "For multi-location & enterprise practices",
    features: [
      "10,000 conversations/mo",
      "2,000 voice minutes included",
      "5 locations mapping",
      "EHR/CRM custom sync integrations",
      "Dedicated account manager",
      "SLA availability guarantee",
    ],
    highlight: false,
    cta: "Start free trial",
  },
];

const TICKER_ITEMS = [
  { metric: "+40%", text: "revenue increase — Bright Smile Dental" },
  { metric: "95%", text: "lead capture rate — Okonkwo Law Group" },
  { metric: "94%", text: "calendar utilization — Luxe Skin & Beauty" },
  { metric: "2s", text: "average response time — Verified" },
  { metric: "500+", text: "service businesses trust Operator" },
  { metric: "24/7", text: "always-on Operator AI coverage" },
];

/* ── Main Component ────────────────────────────────────────────── */
export function LandingPageClient() {
  const heroRef = useRef<HTMLDivElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);

  // Hero entrance animation
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || !heroContentRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

      tl.fromTo(
        ".hero-pill",
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6 }
      )
        .fromTo(
          ".hero-headline",
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.8 },
          "-=0.3"
        )
        .fromTo(
          ".hero-subtitle",
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.7 },
          "-=0.5"
        )
        .fromTo(
          ".hero-cta-group",
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6 },
          "-=0.4"
        )
        .fromTo(
          ".hero-trust-row > *",
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 },
          "-=0.3"
        )
        .fromTo(
          ".hero-preview",
          { opacity: 0, y: 60, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 1, ease: "power3.out" },
          "-=0.4"
        );
    }, heroContentRef.current);

    return () => ctx.revert();
  }, []);

  // Hero parallax on scroll
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || !heroRef.current) return;

    const ctx = gsap.context(() => {
      gsap.to(".hero-preview", {
        y: -30,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1.5,
        },
      });
    }, heroRef.current!);

    return () => ctx.revert();
  }, []);

  return (
    <main className="flex-1 overflow-x-hidden">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECTION 1: HERO — Cinematic entrance
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        id="hero"
        ref={heroRef}
        className="relative overflow-hidden pt-space-16 pb-space-16 md:pt-space-24 md:pb-space-20"
      >
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08),transparent_70%)]" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,hsl(280_75%_55%/0.04),transparent_70%)]" />
        </div>

        <div ref={heroContentRef} className="relative mx-auto max-w-screen-xl px-space-6">
          <div className="flex flex-col items-center text-center mt-space-8">
            {/* Announcement pill */}
            <Link
              href="/changelog"
              className="hero-pill inline-flex items-center gap-space-2 radius-full border border-border-muted bg-bg-layer-2/40 py-space-1 pl-space-1 pr-space-4 hover:border-foreground/20 hover:bg-bg-layer-2/60 transition-all group mb-space-8"
            >
              <span className="inline-flex items-center gap-space-1.5 bg-primary/10 text-primary px-space-3 py-space-1 radius-full text-caption font-medium">
                <Sparkles className="h-3 w-3 shrink-0" /> What&apos;s new
              </span>
              <span className="text-caption text-muted-foreground font-medium flex items-center gap-space-1">
                Version 2.1 is live
                <ChevronRight className="h-3 w-3 text-muted-foreground/60 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>

            {/* Headline */}
            <h1 className="hero-headline text-display-lg md:text-display-xl tracking-tight leading-[1.05] text-foreground font-semibold max-w-3xl mb-space-5">
              Stop losing customers
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[hsl(270_75%_58%)] to-[hsl(280_75%_55%)]">
                to voicemail.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="hero-subtitle mx-auto max-w-xl text-body-lg text-muted-foreground leading-relaxed mb-space-8">
              Operator is the AI receptionist that answers every call, books
              appointments, and qualifies leads — 24/7, in under 2 seconds.
            </p>

            {/* CTAs */}
            <div className="hero-cta-group flex flex-col sm:flex-row items-center gap-space-3 mb-space-10">
              <SessionAwareCta
                signedInText="Go to Dashboard"
                signedOutText="Start free trial"
                size="lg"
              />
              <Button asChild variant="outline" size="lg" className="cursor-pointer w-full sm:w-auto">
                <Link href="/demo" className="flex items-center gap-space-2">
                  Watch demo <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            {/* Trust row */}
            <div className="hero-trust-row flex flex-wrap items-center justify-center gap-space-6 mb-space-12 text-caption text-muted-foreground">
              <span className="flex items-center gap-space-1.5">
                <Check className="h-3.5 w-3.5 text-primary" /> No credit card required
              </span>
              <span className="hidden sm:block h-3 w-px bg-border-muted" />
              <span className="flex items-center gap-space-1.5">
                <Check className="h-3.5 w-3.5 text-primary" /> Setup in 30 minutes
              </span>
              <span className="hidden sm:block h-3 w-px bg-border-muted" />
              <span className="flex items-center gap-space-1.5">
                <Check className="h-3.5 w-3.5 text-primary" /> Cancel anytime
              </span>
            </div>

            {/* Dashboard Preview */}
            <div className="hero-preview relative w-full max-w-5xl">
              <div className="absolute -inset-space-8 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.06),transparent_70%)] pointer-events-none z-0" />
              <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.7)] border border-border bg-card max-h-[420px] md:max-h-[480px] flex flex-col [mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)]">
                {/* Browser chrome */}
                <div className="flex items-center justify-between px-space-4 py-space-2.5 bg-muted/40 dark:bg-card/70 border-b border-border backdrop-blur-md shrink-0">
                  <div className="flex items-center gap-space-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#FF5F56]/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#27C93F]/80" />
                  </div>
                  <div className="flex items-center gap-space-2 bg-background/80 border border-border px-space-3 py-0.5 radius-full text-caption font-mono text-muted-foreground">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs">app.operator.ai</span>
                  </div>
                  <div className="flex items-center gap-space-2 text-caption text-emerald-600 dark:text-emerald-400 font-mono text-xs hidden sm:flex">
                    <span>⚡ Live</span>
                  </div>
                </div>
                <div className="relative flex-1 overflow-hidden">
                  <DashboardPreview />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECTION 2: SOCIAL PROOF TICKER
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="section-break" />
      <section className="py-space-4 overflow-hidden">
        <div className="w-full py-space-4 bg-gradient-to-r from-primary to-[hsl(280_75%_55%)] flex overflow-hidden">
          <div className="ticker-track flex flex-row w-max">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-space-3 px-space-8 shrink-0 text-white"
              >
                <span className="text-body-md font-semibold font-mono">
                  {item.metric}
                </span>
                <span className="text-body-md font-medium whitespace-nowrap opacity-90">
                  {item.text}
                </span>
                <span className="text-body-md opacity-40 select-none ml-space-3">✦</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECTION 3: THE PROBLEM — Pain Point (Merged)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="section-break" />
      <section
        id="the-problem"
        className="py-space-24 lg:py-space-32 relative overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,hsl(var(--state-error-text)/0.03),transparent_70%)]" />
        </div>

        <div className="relative mx-auto max-w-5xl px-space-6">
          {/* Section Header */}
          <GsapReveal className="text-center mb-space-16">
            <div className="inline-flex items-center gap-space-2 px-space-4 py-space-1.5 radius-full border border-[hsl(var(--state-error-text)/0.2)] bg-[hsl(var(--state-error-text)/0.06)] mb-space-6">
              <PhoneOff className="h-3 w-3 text-[hsl(var(--state-error-text))]" />
              <span className="text-caption uppercase tracking-widest text-[hsl(var(--state-error-text))] font-semibold">
                The Problem
              </span>
            </div>
            <h2 className="text-heading-xl tracking-tight leading-snug text-foreground mb-space-4 max-w-2xl mx-auto">
              Every missed call is a
              <br />
              <span className="text-[hsl(var(--state-error-text))]">missed customer.</span>
            </h2>
            <p className="text-body-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
              The math is simple. The cost compounds every day you don&apos;t fix it.
            </p>
          </GsapReveal>

          {/* Pain Stat Cards */}
          <GsapScrollSection
            animation="fade-up"
            staggerSelector=".pain-card"
            stagger={0.2}
            className="grid grid-cols-1 md:grid-cols-3 gap-space-6 mb-space-16"
          >
            {PAIN_STATS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.stat}
                  className="pain-card group relative rounded-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/60 p-space-8 text-center hover:border-[hsl(var(--state-error-text)/0.2)] transition-all duration-300"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--state-error-text)/0.08)] text-[hsl(var(--state-error-text))] mb-space-4 group-hover:scale-110 transition-transform">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-heading-lg font-semibold text-foreground mb-space-2">
                    <AnimatedCounter value={item.stat} />
                  </p>
                  <p className="text-body-sm text-foreground font-medium mb-space-1">
                    {item.label}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    {item.sublabel}
                  </p>
                </div>
              );
            })}
          </GsapScrollSection>

          {/* Without / With Comparison */}
          <GsapScrollSection
            animation="fade-up"
            staggerSelector=".compare-card"
            stagger={0.25}
            className="grid grid-cols-1 md:grid-cols-2 gap-space-6"
          >
            {/* WITHOUT */}
            <div className="compare-card rounded-2xl border border-[hsl(var(--state-error-text)/0.1)] bg-[hsl(var(--state-error-bg)/0.3)] p-space-8 relative overflow-hidden">
              <div className="flex items-center gap-space-3 mb-space-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--state-error-bg))] text-[hsl(var(--state-error-text))]">
                  <XCircle className="h-4 w-4" />
                </div>
                <span className="text-caption uppercase tracking-wider text-[hsl(var(--state-error-text))] font-semibold">
                  Without Operator
                </span>
              </div>
              <ul className="space-y-space-3">
                {[
                  "Calls go to voicemail after hours",
                  "30%+ of leads never call back",
                  "Staff interrupted during appointments",
                  "Manual booking errors & double-books",
                  "Zero data on missed opportunities",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-space-3 text-body-sm text-foreground/80">
                    <XCircle className="h-4 w-4 text-[hsl(var(--state-error-text))] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* WITH */}
            <div className="compare-card rounded-2xl border border-primary/15 bg-[hsl(var(--primary)/0.03)] p-space-8 relative overflow-hidden">
              <div className="absolute right-[-10%] top-[-10%] w-64 h-64 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.08),transparent_70%)] pointer-events-none" />
              <div className="flex items-center gap-space-3 mb-space-6 relative z-10">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Zap className="h-4 w-4" />
                </div>
                <span className="text-caption uppercase tracking-wider text-primary font-semibold">
                  With Operator
                </span>
              </div>
              <ul className="space-y-space-3 relative z-10">
                {[
                  { text: "Every call answered in", badge: "under 2s" },
                  { text: "leads captured and qualified", badge: "95%" },
                  { text: "Appointments booked", badge: "24/7" },
                  { text: "Real-time calendar sync, zero conflicts", badge: null },
                  { text: "Full analytics on every interaction", badge: null },
                ].map((item) => (
                  <li key={item.text} className="flex items-start gap-space-3 text-body-sm text-foreground/90">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5 stroke-[2.5]" />
                    <span className="font-medium">
                      {item.badge && (
                        <span className="inline-flex items-center px-space-2 py-space-0.5 rounded-full bg-primary/12 text-primary font-semibold text-caption mr-space-1.5">
                          {item.badge}
                        </span>
                      )}
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </GsapScrollSection>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECTION 4: HOW IT WORKS — 3-step horizontal flow
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="section-break" />
      <section
        id="how-it-works"
        className="relative py-space-24 lg:py-space-32 overflow-hidden architecture-bg"
      >
        <div className="relative mx-auto max-w-5xl px-space-6">
          <GsapReveal className="text-center mb-space-16">
            <div className="inline-flex items-center gap-space-2 px-space-4 py-space-1.5 radius-full border border-primary/20 bg-primary/5 mb-space-6">
              <Activity className="h-3 w-3 text-primary" />
              <span className="text-caption uppercase tracking-widest text-primary font-semibold">
                How It Works
              </span>
            </div>
            <h2 className="text-heading-xl tracking-tight leading-snug text-foreground mb-space-4 max-w-2xl mx-auto">
              Three steps.
              <br />
              <span className="text-primary">Zero missed leads.</span>
            </h2>
            <p className="text-body-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
              From incoming call to confirmed booking — Operator handles every
              step automatically.
            </p>
          </GsapReveal>

          <GsapScrollSection
            animation="fade-up"
            staggerSelector=".step-card"
            stagger={0.2}
            className="grid grid-cols-1 md:grid-cols-3 gap-space-8"
          >
            {HOW_IT_WORKS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.step}
                  className="step-card group relative rounded-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/50 p-space-8 hover:border-primary/20 hover:bg-card/80 transition-all duration-300"
                >
                  {/* Step number */}
                  <span className="text-[80px] font-bold text-[hsl(var(--foreground)/0.03)] absolute top-space-4 right-space-6 select-none leading-none">
                    {step.step}
                  </span>

                  <div className="relative z-10">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/8 text-primary mb-space-5 group-hover:bg-primary/12 transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-title-lg text-foreground font-semibold mb-space-2">
                      {step.title}
                    </h3>
                    <p className="text-body-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Connector arrow (hidden on last card and mobile) */}
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div className="hidden md:flex absolute -right-[28px] top-1/2 -translate-y-1/2 z-20 h-8 w-8 items-center justify-center rounded-full bg-background border border-border-muted">
                      <ArrowRight className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                </div>
              );
            })}
          </GsapScrollSection>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECTION 5: SEE IT IN ACTION — Product simulation
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="section-break" />
      <section id="live-demo" className="py-space-24 lg:py-space-32">
        <div className="mx-auto max-w-6xl px-space-6">
          <GsapReveal className="text-center mb-space-16">
            <div className="inline-flex items-center gap-space-2 px-space-4 py-space-1.5 radius-full border border-primary/20 bg-primary/5 mb-space-6">
              <Zap className="h-3 w-3 text-primary" />
              <span className="text-caption uppercase tracking-widest text-primary font-semibold">
                Live Demo
              </span>
            </div>
            <h2 className="text-heading-xl tracking-tight leading-snug text-foreground mb-space-4 max-w-2xl mx-auto">
              Watch Operator work
              <br />
              <span className="text-primary">in real time.</span>
            </h2>
            <p className="text-body-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
              From first hello to confirmed booking — see exactly what happens
              when a customer reaches your business.
            </p>
          </GsapReveal>

          <GsapReveal animation="scale-up" duration={1}>
            <ProductSimulation />
          </GsapReveal>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECTION 6: FEATURES GRID — Premium bento layout
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="section-break" />
      <section id="features" className="py-space-24 lg:py-space-32 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.04),transparent_70%)]" />
        </div>

        <div className="relative mx-auto max-w-5xl px-space-6">
          <GsapReveal className="text-center mb-space-16">
            <div className="inline-flex items-center gap-space-2 px-space-4 py-space-1.5 radius-full border border-primary/20 bg-primary/5 mb-space-6">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-caption uppercase tracking-widest text-primary font-semibold">
                Features
              </span>
            </div>
            <h2 className="text-heading-xl tracking-tight leading-snug text-foreground mb-space-4 max-w-2xl mx-auto">
              Everything you need.
              <br />
              <span className="text-primary">Nothing you don&apos;t.</span>
            </h2>
            <p className="text-body-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Built specifically for service businesses — from solo practices to
              multi-location enterprises.
            </p>
          </GsapReveal>

          <GsapScrollSection
            animation="fade-up"
            staggerSelector=".feature-card"
            stagger={0.1}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-5"
          >
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="feature-card group rounded-2xl border border-[hsl(var(--foreground)/0.05)] bg-card/40 p-space-7 hover:border-primary/15 hover:bg-card/70 transition-all duration-300"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8 text-primary mb-space-4 group-hover:bg-primary/12 group-hover:scale-110 transition-all">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-title-md text-foreground font-semibold mb-space-2">
                    {feat.title}
                  </h3>
                  <p className="text-body-sm text-muted-foreground leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              );
            })}
          </GsapScrollSection>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECTION 7: INDUSTRY EXPLORER
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="section-break" />
      <section id="industries" className="py-space-24 lg:py-space-32">
        <div className="mx-auto max-w-6xl px-space-6">
          <GsapReveal className="text-center max-w-3xl mx-auto mb-space-14">
            <div className="inline-flex items-center gap-space-2 px-space-4 py-space-1.5 radius-full border border-primary/20 bg-primary/5 mb-space-6">
              <Activity className="h-3 w-3 text-primary" />
              <span className="text-caption uppercase tracking-widest text-primary font-semibold">
                Industries
              </span>
            </div>
            <h2 className="text-heading-xl tracking-tight leading-snug text-foreground mb-space-4">
              Configured for your industry
              <br />
              <span className="text-primary">on day one.</span>
            </h2>
            <p className="text-body-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Pre-built conversation flows, intake forms, and integrations for
              your exact vertical.
            </p>
          </GsapReveal>

          <GsapReveal animation="fade-up">
            <InteractiveIndustryExplorer />
          </GsapReveal>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECTION 8: ROI CALCULATOR
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="section-break" />
      <GsapReveal animation="fade-up">
        <ROISimulatorSection />
      </GsapReveal>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECTION 9: PRICING
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="section-break" />
      <section id="pricing" className="py-space-24 lg:py-space-32">
        <div className="mx-auto max-w-5xl px-space-6">
          <GsapReveal className="text-center mb-space-16">
            <div className="inline-flex items-center gap-space-2 px-space-4 py-space-1.5 radius-full border border-primary/20 bg-primary/5 mb-space-6">
              <span className="text-caption uppercase tracking-widest text-primary font-semibold">
                Pricing
              </span>
            </div>
            <h2 className="text-heading-xl tracking-tight leading-snug text-foreground mb-space-4">
              Simple pricing.
              <br />
              <span className="text-primary">Cancel anytime.</span>
            </h2>
            <p className="text-body-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Every plan starts with a 14-day free trial. Setup takes under 30
              minutes. No contracts.
            </p>
          </GsapReveal>

          <GsapScrollSection
            animation="fade-up"
            staggerSelector=".pricing-card"
            stagger={0.15}
            className="grid grid-cols-1 sm:grid-cols-3 gap-space-6 mb-space-10"
          >
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`pricing-card relative rounded-2xl flex flex-col justify-between transition-all duration-300 ${
                  plan.highlight
                    ? "pricing-card-popular pt-space-10 px-space-6 pb-space-6"
                    : "border border-[hsl(var(--foreground)/0.06)] bg-card/40 p-space-6"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 radius-full bg-gradient-to-r from-primary to-[hsl(280_75%_55%)] px-space-4 py-space-1 text-caption text-primary-foreground whitespace-nowrap font-semibold">
                    ✦ Most Popular
                  </div>
                )}
                <div>
                  <h3 className="text-title-lg text-foreground mb-space-1">{plan.name}</h3>
                  <p className="text-body-sm text-muted-foreground mb-space-4 min-h-10">
                    {plan.desc}
                  </p>
                  <div className="flex items-end gap-space-1 mb-space-6">
                    <span className="text-heading-lg text-foreground font-mono">{plan.price}</span>
                    <span className="text-muted-foreground text-body-sm mb-space-1">{plan.period}</span>
                  </div>
                  <ul className="space-y-space-3 border-t border-[hsl(var(--foreground)/0.04)] pt-space-4 mb-space-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-space-2 text-body-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-space-1" />
                        <span className="text-foreground/80">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <SessionAwareCta
                  signedInText="Go to Dashboard"
                  signedOutText={plan.cta}
                  variant={plan.highlight ? "default" : "outline"}
                  size="md"
                  className="w-full"
                  showIcon={false}
                />
              </div>
            ))}
          </GsapScrollSection>

          {/* Comparison badges */}
          <GsapReveal animation="fade-up" delay={0.2}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-3 mb-space-8">
              {[
                { label: "vs. Hiring staff", value: "Save 90% on costs" },
                { label: "vs. Answering service", value: "10× faster response" },
                { label: "vs. Doing nothing", value: "Recover $60k+/year" },
              ].map((c) => (
                <div
                  key={c.label}
                  className="comparison-badge flex flex-col items-center gap-space-1"
                >
                  <span className="text-caption text-muted-foreground">{c.label}</span>
                  <span>{c.value}</span>
                </div>
              ))}
            </div>
            <div className="text-center">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-space-2 text-body-sm text-muted-foreground hover:text-foreground transition-colors group"
              >
                View full plans, custom call packages & agency options
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </GsapReveal>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECTION 10: FINAL CTA — Closing push
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="section-break" />
      <section
        id="cta-final"
        className="relative py-space-28 lg:py-space-32 overflow-hidden cta-mesh"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.1),transparent_70%)]" />
        </div>

        <GsapReveal animation="scale-up" className="relative mx-auto max-w-2xl px-space-6 text-center">
          <div className="inline-flex items-center gap-space-2 px-space-4 py-space-1.5 radius-full border border-primary/20 bg-primary/5 mb-space-6">
            <span className="text-caption uppercase tracking-widest text-primary font-semibold">
              Get Started
            </span>
          </div>
          <h2 className="text-heading-xl md:text-display-lg tracking-tight leading-tight text-foreground mb-space-6">
            Your next customer
            <br />
            is calling <span className="text-primary">right now.</span>
          </h2>
          <p className="text-muted-foreground text-title-md leading-relaxed mb-space-10 max-w-lg mx-auto">
            Every minute without Operator is another missed appointment, another
            lost lead. Fix it today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-space-4 mb-space-6">
            <SessionAwareCta
              signedInText="Go to Dashboard"
              signedOutText="Start your free trial"
              size="lg"
            />
            <Button asChild variant="outline" size="lg" className="cursor-pointer">
              <Link href="/demo" className="flex items-center gap-space-2">
                Book a live demo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="flex items-center justify-center gap-space-4 text-caption text-muted-foreground">
            <span className="flex items-center gap-space-1">
              <Check className="h-3 w-3 text-primary" /> No credit card
            </span>
            <span className="h-3 w-px bg-[hsl(var(--foreground)/0.1)]" />
            <span className="flex items-center gap-space-1">
              <Check className="h-3 w-3 text-primary" /> Setup in 30 min
            </span>
            <span className="h-3 w-px bg-[hsl(var(--foreground)/0.1)]" />
            <span className="flex items-center gap-space-1">
              <Check className="h-3 w-3 text-primary" /> Cancel anytime
            </span>
          </div>
        </GsapReveal>
      </section>
    </main>
  );
}
