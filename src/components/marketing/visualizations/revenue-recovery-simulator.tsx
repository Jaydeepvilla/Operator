"use client";

import { useState, useEffect, useRef } from"react";
import Link from"next/link";
import {
 ArrowRight,
 TrendingDown,
 TrendingUp,
 HeartPulse,
 Stethoscope,
 Scale,
 Dumbbell,
 Home,
 Sparkles,
 PhoneCall,
 BadgeDollarSign,
 CalendarCheck,
} from"lucide-react";
import { Button } from"@/components/shared/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/shared/tabs";
import { Input } from"@/components/shared/input";

/* ── Industry Presets ──────────────────────────────────────────────────────── */

interface IndustryPreset {
 name: string;
 icon: React.ReactNode;
 missedCallsWeekly: number;
 ticketValue: number;
}

const INDUSTRIES: Record<string, IndustryPreset> = {
 dental: {
 name:"Dental",
 icon: <HeartPulse className="h-3.5 w-3.5"/>,
 missedCallsWeekly: 22,
 ticketValue: 240,
 },
 medical: {
 name:"Medical",
 icon: <Stethoscope className="h-3.5 w-3.5"/>,
 missedCallsWeekly: 26,
 ticketValue: 300,
 },
 salon: {
 name:"Salon & Spa",
 icon: <Sparkles className="h-3.5 w-3.5"/>,
 missedCallsWeekly: 18,
 ticketValue: 110,
 },
 law: {
 name:"Law Firm",
 icon: <Scale className="h-3.5 w-3.5"/>,
 missedCallsWeekly: 12,
 ticketValue: 450,
 },
 gym: {
 name:"Gym & Fitness",
 icon: <Dumbbell className="h-3.5 w-3.5"/>,
 missedCallsWeekly: 32,
 ticketValue: 75,
 },
 realestate: {
 name:"Real Estate",
 icon: <Home className="h-3.5 w-3.5"/>,
 missedCallsWeekly: 15,
 ticketValue: 900,
 },
};

/* ── Animated Counter Hook ─────────────────────────────────────────────────── */

function useAnimatedValue(target: number, duration = 700) {
 const [displayed, setDisplayed] = useState(target);
 const raf = useRef<number | null>(null);
 const prevTarget = useRef(target);

 useEffect(() => {
 if (prevTarget.current === target) return;
 const start = displayed;
 const delta = target - start;
 const startTime = performance.now();
 prevTarget.current = target;

 const tick = (now: number) => {
 const elapsed = now - startTime;
 const progress = Math.min(elapsed / duration, 1);
 const eased = 1 - Math.pow(1 - progress, 3);
 setDisplayed(Math.round(start + delta * eased));
 if (progress < 1) raf.current = requestAnimationFrame(tick);
 };

 raf.current = requestAnimationFrame(tick);
 return () => { if (raf.current) cancelAnimationFrame(raf.current); };
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [target]);

 return displayed;
}

/* ── Utility ───────────────────────────────────────────────────────────────── */

const usd = (v: number) =>
 new Intl.NumberFormat("en-US", { style:"currency", currency:"USD", maximumFractionDigits: 0 }).format(v);

/* ══════════════════════════════════════════════════════════════════════════════
 EXPORTED COMPONENT
 ═══════════════════════════════════════════════════════════════════════════════*/

export function ROISimulatorSection() {
 const [industry, setIndustry] = useState("dental");
 const [missedCalls, setMissedCalls] = useState(INDUSTRIES.dental.missedCallsWeekly);
 const [ticketValue, setTicketValue] = useState(INDUSTRIES.dental.ticketValue);

 const handleIndustryChange = (key: string) => {
 setIndustry(key);
 const p = INDUSTRIES[key];
 if (p) {
 setMissedCalls(p.missedCallsWeekly);
 setTicketValue(p.ticketValue);
 }
 };

 /* ── Derived Calculations ── */
 const annualMissed = missedCalls * 52;
 const annualLeak = annualMissed * ticketValue;
 const recovered = Math.round(annualLeak * 0.95);
 const aiCost = (missedCalls > 25 ? 249 : missedCalls > 12 ? 149 : 79) * 12;
 const netYield = Math.max(0, recovered - aiCost);
 const roiMult = aiCost > 0 ? (recovered / aiCost).toFixed(1) :"0.0";
 const apptCaptured = Math.round(annualMissed * 0.95 * 0.62);
 const dailyCost = Math.round(annualLeak * 0.62 / 365);

 /* ── Animated Values ── */
 const animLeak = useAnimatedValue(annualLeak);
 const animRecovered = useAnimatedValue(recovered);
 const animNet = useAnimatedValue(netYield);
 const animAppt = useAnimatedValue(apptCaptured);

 return (
 <>
 {/* ══════════════════════════════════════════════════════════════
 SECTION 1 — Impact Header
 ══════════════════════════════════════════════════════════════ */}
 <section className="relative py-space-24 lg:py-space-32 overflow-hidden">
 {/* Background */}
 <div className="absolute inset-space-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,hsl(var(--state-error-text)/0.04),transparent_70%)] pointer-events-none"/>
 <div className="absolute inset-space-0 dot-grid opacity-[0.07] pointer-events-none"/>

 <div className="relative z-10 mx-auto max-w-5xl px-space-6 text-center">
 {/* Pill */}
 <div className="inline-flex items-center gap-space-2 px-space-4 py-space-2 rounded-full border-[hsl(var(--state-error-text)/0.3)] bg-[hsl(var(--state-error-text)/0.06)] mb-space-8">
 <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--state-error-text))] animate-pulse"/>
 <span className="text-caption uppercase tracking-widest text-[hsl(var(--state-error-text))] font-semibold">Revenue Diagnostic</span>
 </div>

 {/* Headline */}
 <h2 className="text-heading-xl lg:text-display-lg font-semibold tracking-tight text-foreground leading-tight mb-space-6">
 Your Front Desk Is<br />
 <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--state-error-text))] to-[hsl(0_80%_65%)]">
 Leaking Revenue
 </span>
 </h2>
 <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-space-16">
 Every unanswered call is a booking at your competitor. See exactly what this costs — and how much Operator recovers.
 </p>

 {/* 3 Impact Stats */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-space-px bg-border-muted rounded-2xl overflow-hidden border border-border-muted">
 {[
 { icon: <PhoneCall className="h-5 w-5"/>, stat:"62%", label:"Of callers who hit voicemail book with a competitor instead", color:"text-[hsl(var(--state-error-text))]"},
 { icon: <BadgeDollarSign className="h-5 w-5"/>, stat:"$1,200", label:"Average lifetime value of a single missed service business lead", color:"text-foreground"},
 { icon: <CalendarCheck className="h-5 w-5"/>, stat:"35%", label:"Of calls come after-hours when your front desk is closed", color:"text-foreground"},
 ].map((item, i) => (
 <div key={i} className="bg-card/60 backdrop-blur-sm px-space-8 py-space-10 flex flex-col items-center text-center gap-space-3">
 <div className="flex items-center justify-center h-10 w-10 radius-xl bg-[hsl(var(--foreground)/0.04)] border border-border-muted text-muted-foreground">
 {item.icon}
 </div>
 <p className={`text-heading-xl font-semibold ${item.color}`}>{item.stat}</p>
 <p className="text-body-sm text-muted-foreground leading-relaxed max-w-xs">{item.label}</p>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ══════════════════════════════════════════════════════════════
 SECTION 2 — ROI Calculator
 ══════════════════════════════════════════════════════════════ */}
 <div className="section-break"/>
 <section className="relative py-space-24 lg:py-space-32 overflow-hidden bg-[hsl(var(--foreground)/0.01)] border-t border-border-muted">
 <div className="absolute inset-space-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,hsl(var(--primary)/0.06),transparent_70%)] pointer-events-none"/>

 <div className="relative z-10 mx-auto max-w-6xl px-space-6">

 {/* Section Header */}
 <div className="text-center mb-space-16">
 <div className="inline-flex items-center gap-space-2 px-space-4 py-space-2 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
 <TrendingUp className="h-3 w-3 text-primary"/>
 <span className="text-caption uppercase tracking-widest text-primary font-semibold">ROI Calculator</span>
 </div>
 <h2 className="text-heading-xl font-semibold tracking-tight text-foreground mb-space-4">
 Calculate Your
 <br />
 <span className="text-primary">Revenue Recovery</span>
 </h2>
 <p className="text-body-md text-muted-foreground max-w-xl mx-auto leading-relaxed">
 Adjust the inputs below to your business. Watch Operator's impact update live.
 </p>
 </div>

 {/* Industry Selector */}
  <Tabs value={industry} onValueChange={(val: any) => handleIndustryChange(val)} variant="pills" className="w-full flex justify-center mb-space-12">
  <TabsList className="bg-transparent border-none flex-wrap justify-center gap-space-2">
  {Object.entries(INDUSTRIES).map(([key, ind]) => (
    <TabsTrigger
      key={key}
      value={key}
      className="inline-flex items-center gap-space-2 px-space-4 py-space-2 rounded-full border text-body-sm font-normal transition-all duration-200 cursor-pointer border-border-muted text-muted-foreground bg-background hover:text-foreground hover:border-primary/40 hover:bg-primary/5 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary"
    >
      <span className="shrink-0">{ind.icon}</span>
      {ind.name}
    </TabsTrigger>
  ))}
  </TabsList>
  </Tabs>

 {/* Main Calculator Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-6 items-stretch">

 {/* LEFT — Inputs */}
 <div className="lg:col-span-5 radius-2xl border border-border-muted bg-card/50 backdrop-blur-sm p-space-8 flex flex-col gap-space-10">
 <div>
 <p className="text-caption uppercase tracking-widest text-muted-foreground font-semibold mb-space-6">Your Numbers</p>

 {/* Slider 1 */}
 <div className="space-y-space-4 mb-space-8">
 <div className="flex items-center justify-between">
 <label className="text-body-sm font-semibold text-foreground">Weekly Missed Calls</label>
 <span className="inline-flex items-center px-space-3 py-space-1 radius-md bg-primary/10 border border-primary/15 text-primary font-semibold text-body-sm">
 {missedCalls} / wk
 </span>
 </div>
 <Input
 type="range"min="2"max="60"
 value={missedCalls}
 onChange={(e) => setMissedCalls(Number(e.target.value))}
 className="w-full h-2 radius-md appearance-none cursor-pointer accent-primary"
 style={{ background:`linear-gradient(to right, hsl(var(--primary)) ${((missedCalls - 2) / 58) * 100}%, hsl(var(--foreground)/0.1) ${((missedCalls - 2) / 58) * 100}%)`}}
 />
 <div className="flex justify-between text-caption text-muted-foreground/60">
 <span>2 / wk</span><span>60 / wk</span>
 </div>
 <p className="text-caption text-muted-foreground">
 That's <span className="text-foreground font-semibold">{annualMissed.toLocaleString()} missed opportunities</span> per year
 </p>
 </div>

 {/* Slider 2 */}
 <div className="space-y-space-4">
 <div className="flex items-center justify-between">
 <label className="text-body-sm font-semibold text-foreground">Avg. Appointment Value</label>
 <span className="inline-flex items-center px-space-3 py-space-1 radius-md bg-primary/10 border border-primary/15 text-primary font-semibold text-body-sm">
 ${ticketValue}
 </span>
 </div>
 <Input
 type="range"min="50"max="1200"step="25"
 value={ticketValue}
 onChange={(e) => setTicketValue(Number(e.target.value))}
 className="w-full h-2 radius-md appearance-none cursor-pointer accent-primary"
 style={{ background:`linear-gradient(to right, hsl(var(--primary)) ${((ticketValue - 50) / 1150) * 100}%, hsl(var(--foreground)/0.1) ${((ticketValue - 50) / 1150) * 100}%)`}}
 />
 <div className="flex justify-between text-caption text-muted-foreground/60">
 <span>$50</span><span>$1,200</span>
 </div>
 <p className="text-caption text-muted-foreground">
 Annual exposure: <span className="text-[hsl(var(--state-error-text))] font-semibold">{usd(annualLeak)}</span>
 </p>
 </div>
 </div>

 {/* Before / After mini row */}
 <div className="grid grid-cols-2 gap-space-4 pt-space-4 border-t border-border-muted">
 <div className="radius-xl bg-[hsl(var(--state-error-text)/0.06)] border border-[hsl(var(--state-error-text)/0.15)] p-space-4">
 <div className="flex items-center gap-space-2 mb-space-2">
 <TrendingDown className="h-3.5 w-3.5 text-[hsl(var(--state-error-text))]"/>
 <span className="text-caption uppercase tracking-wider text-[hsl(var(--state-error-text))] font-semibold">Without AI</span>
 </div>
 <p className="text-title-lg font-semibold text-[hsl(var(--state-error-text))]">{usd(animLeak)}</p>
 <p className="text-caption text-muted-foreground mt-space-1">annual revenue lost</p>
 </div>
 <div className="radius-xl bg-primary/5 border border-primary/20 p-space-4">
 <div className="flex items-center gap-space-2 mb-space-2">
 <TrendingUp className="h-3.5 w-3.5 text-primary"/>
 <span className="text-caption uppercase tracking-wider text-primary font-semibold">With Operator</span>
 </div>
 <p className="text-title-lg font-semibold text-primary">{usd(animRecovered)}</p>
 <p className="text-caption text-muted-foreground mt-space-1">revenue recovered</p>
 </div>
 </div>
 </div>

 {/* RIGHT — Results */}
 <div className="lg:col-span-7 flex flex-col gap-space-4">

 {/* Net Yield — Hero card */}
 <div className="relative radius-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-card/70 p-space-8 overflow-hidden flex-shrink-0">
 <div className="absolute top-space-0 right-space-0 w-64 h-64 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.15),transparent_65%)] pointer-events-none"/>
 <div className="relative z-10">
 <div className="flex items-center gap-space-2 mb-space-4">
 <span className="h-2 w-2 radius-md bg-primary animate-pulse"/>
 <span className="text-caption uppercase tracking-widest text-primary font-semibold">Net Annual Yield</span>
 </div>
 <p className="text-display-lg font-semibold text-foreground tracking-tight">
 {usd(animNet)}
 </p>
 <p className="text-body-sm text-muted-foreground mt-space-2">
 After deducting AI subscription cost — <span className="text-primary font-semibold">{roiMult}× ROI</span> on your investment
 </p>

 {/* Mini stat row inside hero */}
 <div className="grid grid-cols-2 gap-space-4 mt-space-6 pt-space-6 border-t border-primary/15">
 <div>
 <p className="text-heading-md font-semibold text-foreground">{animAppt.toLocaleString()}</p>
 <p className="text-caption text-muted-foreground mt-space-1">appointments auto-booked / yr</p>
 </div>
 <div>
 <p className="text-heading-md font-semibold text-[hsl(var(--state-error-text))]">{usd(dailyCost)}</p>
 <p className="text-caption text-muted-foreground mt-space-1">revenue lost every day without AI</p>
 </div>
 </div>
 </div>
 </div>

 {/* CTA Card */}
 <div className="relative radius-2xl border border-border-muted bg-card/60 backdrop-blur-sm p-space-8 overflow-hidden flex-1 flex flex-col justify-between">
 <div className="absolute bottom-space-0 right-space-0 w-48 h-48 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--primary)/0.08),transparent_70%)] pointer-events-none"/>
 <div className="relative z-10">
 <p className="text-title-lg font-semibold text-foreground leading-snug mb-space-2">
 Ready to stop the leak?
 </p>
 <p className="text-body-sm text-muted-foreground leading-relaxed">
 Deploy Operator AI in under 30 minutes. No hardware. No long-term contracts.
 </p>
 </div>
 <div className="relative z-10 flex flex-col sm:flex-row items-center gap-space-3 mt-space-6 w-full">
  <Button asChild size="lg" className="flex-1 w-full">
    <Link href="/sign-up">
      Deploy Operator
      <ArrowRight className="h-4 w-4" />
    </Link>
  </Button>
  <Button asChild variant="outline" size="lg" className="flex-1 w-full">
    <Link href="/contact">
      Talk to a specialist
    </Link>
  </Button>
 </div>
 </div>

 </div>
 </div>

 </div>
 </section>
 </>
 );
}

/* ── Backward-compat default export ───────────────────────────────────────── */
export function CostOfSilenceSection() {
 return null;
}

export function RevenueRecoverySimulator() {
 return <ROISimulatorSection />;
}
