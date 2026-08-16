"use client";
import { ScrollReveal } from "@/components/motion/scroll-reveal";


import { useState, Fragment } from"react";
import Link from"next/link";
import { MarketingNav } from"@/components/marketing/nav";
import { MarketingFooter } from"@/components/marketing/footer";
import { Check, X, ArrowRight, ChevronRight, Shield, Building2 } from"lucide-react";
import { Button } from"@/components/shared/button";
import { SessionAwareCta } from "@/components/marketing/session-aware-cta";
import { NativeTable } from "@/components/shared/native";
import { cn } from "@/components/shared/utils";

const PLANS = [
 {
 id:"starter",
 name:"Starter",
 monthlyPrice: 49,
 yearlyPrice: 39,
 desc:"For solo practitioners, freelancers, and small single-location businesses.",
 highlight: false,
 badge: null,
 features: {
 "Conversations":"500 / month",
 "Voice AI Minutes":"100 min / month",
 "Website Widget": true,
 "SMS Messaging": true,
 "Email Responses": true,
 "WhatsApp": false,
 "Instagram / Facebook": false,
 "Calendar Integrations":"1 calendar",
 "Lead Qualification":"Basic",
 "Knowledge Base Articles":"25 articles",
 "Team Members":"1",
 "Locations":"1",
 "Analytics Dashboard":"Basic",
 "Custom AI Training": false,
 "Agency / White Label": false,
 "Dedicated Onboarding": false,
 "SLA Guarantee": false,
 "Support":"Email",
 },
 },
 {
 id:"professional",
 name:"Professional",
 monthlyPrice: 149,
 yearlyPrice: 119,
 desc:"For growing service businesses that need full omnichannel coverage.",
 highlight: true,
 badge:"Most Popular",
 features: {
 "Conversations":"2,500 / month",
 "Voice AI Minutes":"500 min / month",
 "Website Widget": true,
 "SMS Messaging": true,
 "Email Responses": true,
 "WhatsApp": true,
 "Instagram / Facebook": true,
 "Calendar Integrations":"3 calendars",
 "Lead Qualification":"Advanced + Scoring",
 "Knowledge Base Articles":"100 articles",
 "Team Members":"5",
 "Locations":"1",
 "Analytics Dashboard":"Advanced",
 "Custom AI Training": true,
 "Agency / White Label": false,
 "Dedicated Onboarding": false,
 "SLA Guarantee": false,
 "Support":"Priority Email + Chat",
 },
 },
 {
 id:"business",
 name:"Business",
 monthlyPrice: 349,
 yearlyPrice: 279,
 desc:"For multi-location businesses, franchises, and high-volume operations.",
 highlight: false,
 badge: null,
 features: {
 "Conversations":"10,000 / month",
 "Voice AI Minutes":"2,000 min / month",
 "Website Widget": true,
 "SMS Messaging": true,
 "Email Responses": true,
 "WhatsApp": true,
 "Instagram / Facebook": true,
 "Calendar Integrations":"Unlimited",
 "Lead Qualification":"Advanced + Custom Flows",
 "Knowledge Base Articles":"500 articles",
 "Team Members":"20",
 "Locations":"5",
 "Analytics Dashboard":"Full + Export",
 "Custom AI Training": true,
 "Agency / White Label": false,
 "Dedicated Onboarding": true,
 "SLA Guarantee":"99.9%",
 "Support":"Dedicated CSM",
 },
 },
];

const FEATURE_CATEGORIES = [
 { label:"Core Messaging", features: ["Conversations","Website Widget","SMS Messaging","Email Responses","WhatsApp","Instagram / Facebook"] },
 { label:"Voice AI", features: ["Voice AI Minutes"] },
 { label:"Scheduling", features: ["Calendar Integrations"] },
 { label:"AI & Automation", features: ["Lead Qualification","Knowledge Base Articles","Custom AI Training"] },
 { label:"Platform", features: ["Team Members","Locations","Analytics Dashboard","Agency / White Label"] },
 { label:"Support & SLA", features: ["Dedicated Onboarding","SLA Guarantee","Support"] },
];

function FeatureCell({ value }: { value: string | boolean | null }) {
 if (value === true) return <Check className="h-4 w-4 text-primary mx-auto"/>;
 if (value === false) return <span className="text-body-sm text-muted-foreground/40">—</span>;
 return <span className="text-caption text-foreground/80">{value}</span>;
}

export default function PricingPage() {
 const [yearly, setYearly] = useState(false);

 return (
 <div className="relative flex flex-col min-h-screen bg-background text-foreground">
 <MarketingNav />

 <main className="flex-1 overflow-x-hidden">
 {/* Hero */}
 <section className="relative overflow-hidden">
<ScrollReveal stagger>

 <div className="absolute inset-space-0 dot-grid grid-fade-b pointer-events-none"/>
 <div className="absolute top-space-0 left-1/2 -translate-x-1/2 w-[var(--bg-blob)] h-[var(--bg-blob-h)] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08),transparent_70%)] pointer-events-none"/>

 <div className="relative mx-auto max-w-5xl px-space-6 pt-32 pb-space-16 text-center">
 <p className="text-body-sm text-primary mb-space-4">Pricing</p>
 <h1 className="text-display-xl tracking-tight-xs leading-display text-foreground mb-space-5">
 Plans for every
 <br />
 <span className="text-primary">size of business</span>
 </h1>
 <p className="mx-auto max-w-xl text-title-lg text-muted-foreground leading-relaxed mb-space-10">
 Start free for 14 days. No credit card required. Cancel anytime. Scale as you grow.
 </p>

  {/* Toggle */}
  <div className="inline-flex items-center gap-space-1.5 radius-full border border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--foreground)/0.03)] p-space-1.5 mb-space-12">
  <button 
   onClick={() => setYearly(false)}
   className={cn(
     "h-space-8 text-caption rounded-full transition-all duration-200 select-none cursor-pointer font-semibold",
     !yearly 
       ? "bg-[#0A0E17] text-white px-space-4 shadow-xs" 
       : "text-muted-foreground hover:text-foreground pl-space-0.5 pr-space-3"
   )}
  >
   Monthly
  </button>
  <button 
   onClick={() => setYearly(true)}
   className={cn(
     "h-space-8 text-caption rounded-full transition-all duration-200 select-none cursor-pointer font-semibold flex items-center gap-space-1.5",
     yearly 
       ? "bg-[#0A0E17] text-white pl-space-4 pr-space-3 shadow-xs" 
       : "text-muted-foreground hover:text-foreground pl-space-3 pr-space-0.5"
   )}
  >
   <span>Yearly</span>
   <span className={cn(
     "radius-full px-space-2 py-space-0.5 text-caption font-semibold transition-colors",
     yearly ? "bg-white/20 text-white" : "bg-primary/20 text-primary"
   )}>
     Save 20%
   </span>
  </button>
  </div>
 </div>
 
</ScrollReveal>
</section>

 {/* Plan Cards */}
 <section className="mx-auto max-w-5xl px-space-6 pb-space-16">
<ScrollReveal stagger>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-5">
 {PLANS.map((plan) => (
 <div
 key={plan.id}
 className={`relative radius-2xl flex flex-col transition-all duration-300 hover:scale-[1.02] ${plan.highlight
 ?"pricing-card-popular pt-space-10 px-space-6 pb-space-6 "
 :"border border-[hsl(var(--foreground)/0.06)] bg-card/65 p-space-6 hover:border-primary/20"
 }`}
 >
 {plan.badge && (
 <div className={`absolute top-space-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 radius-full px-space-4 py-space-1 text-caption whitespace-nowrap ${plan.id ==="professional"?"bg-gradient-to-r from-primary to-[hsl(280_75%_55%)] text-primary-foreground":"bg-primary/80 text-primary-foreground"
 } font-semibold`}>
 {plan.id ==="professional"?"✦":""}{plan.badge}
 </div>
 )}

 <div className="mb-space-5">
 <h2 className="text-body-md text-foreground mb-space-1 font-semibold">{plan.name}</h2>
 <p className="text-caption text-muted-foreground leading-relaxed mb-space-4 min-h-10">{plan.desc}</p>
 <div className="flex items-end gap-space-1">
 <span className="text-heading-lg text-foreground font-mono">
 ${yearly ? plan.yearlyPrice : plan.monthlyPrice}
 </span>
 <span className="text-muted-foreground text-body-sm mb-space-1">/month</span>
 </div>
 {yearly && (
 <p className="text-caption text-primary mt-space-1 font-mono">
 ${(plan.monthlyPrice - plan.yearlyPrice) * 12}/year saved
 </p>
 )}
 </div>

 <ul className="space-y-space-2 mb-space-7 flex-1">
 {Object.entries(plan.features).slice(0, 8).map(([key, val]) => (
 <li key={key} className="flex items-start gap-space-2 text-caption">
 {val === false ? (
 <span className="text-muted-foreground/30 mt-space-1">—</span>
 ) : (
 <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-space-1"/>
 )}
 <span className={val === false ?"text-muted-foreground/50 line-through":"text-foreground/80"}>
 <span className="text-foreground/60">{key}:</span> {val === true ?"Included": val === false ?"Not included": String(val)}
 </span>
 </li>
 ))}
 </ul>

 <div className="space-y-space-3">
 <Button
  asChild
  variant={plan.highlight ? "default" : "outline"}
  className="w-full"
>
  <Link href="/sign-up">Start Free Trial</Link>
</Button>
 <p className="text-center text-caption text-muted-foreground">14-day free trial · No credit card</p>
 </div>
 </div>
 ))}
 </div>
 
</ScrollReveal>
</section>

 {/* Enterprise CTA */}
 <section className="mx-auto max-w-5xl px-space-6 pb-space-16">
<ScrollReveal stagger>

 <div className="radius-xl border border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)] p-space-8 flex flex-col sm:flex-row items-center justify-between gap-space-6">
 <div className="flex items-center gap-space-4">
 <div className="h-10 w-10 radius-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
 <Building2 className="h-5 w-5"/>
 </div>
 <div>
 <h3 className="text-foreground">Enterprise Plan</h3>
 <p className="text-body-sm text-muted-foreground">Custom volume, SLAs, HIPAA-ready, dedicated infrastructure, and white-glove support.</p>
 </div>
 </div>
  <Button asChild variant="outline" className="shrink-0">
  <Link href="/contact">
  Contact Sales <ArrowRight className="h-4 w-4"/>
  </Link>
  </Button>
 </div>
 
</ScrollReveal>
</section>

 {/* Full Feature Comparison Table */}
 <section className="mx-auto max-w-5xl px-space-6 pb-space-24">
<ScrollReveal stagger>

 <div className="text-center mb-space-12">
 <div className="inline-flex items-center gap-space-2 px-space-4 py-space-2 radius-full border border-primary/20 bg-primary/5 mb-space-6">
 <span className="text-caption uppercase tracking-widest text-primary font-semibold">Compare Plans</span>
 </div>
 <h2 className="text-heading-lg tracking-tight-md text-center text-foreground">
 Detailed Breakdown.
 <br />
 <span className="text-primary">Full Feature Comparison</span>
 </h2>
 </div>
 <div className="overflow-x-auto w-full radius-xl border border-[hsl(var(--foreground)/0.06)]">
 <NativeTable className="w-full text-body-sm min-w-full">
 <thead>
 <tr className="border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)]">
 <th className="px-space-6 py-space-4 text-left text-body-sm text-foreground/70 w-48">Feature</th>
 {PLANS.map((p) => (
 <th key={p.id} className={`px-space-5 py-space-4 text-center text-body-sm ${p.highlight ?"text-primary":"text-foreground"}`}>
 {p.name}
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 {FEATURE_CATEGORIES.map((cat) => (
 <Fragment key={cat.label}>
 <tr className="border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.03)]">
 <td colSpan={PLANS.length + 1} className="px-space-6 py-space-3 text-caption uppercase tracking-wider text-muted-foreground">
 {cat.label}
 </td>
 </tr>
 {cat.features.map((feat, i) => (
 <tr
 key={feat}
 className={`border-b border-[hsl(var(--foreground)/0.04)] hover:bg-[hsl(var(--foreground)/0.02)] transition-colors ${i % 2 === 1 ?"bg-[hsl(var(--foreground)/0.01)]":""
 }`}
 >
 <td className="px-space-6 py-space-4 text-body-sm text-foreground/80">{feat}</td>
 {PLANS.map((p) => (
 <td key={p.id} className="px-space-5 py-space-4 text-center">
 <FeatureCell value={p.features[feat as keyof typeof p.features] ?? false} />
 </td>
 ))}
 </tr>
 ))}
 </Fragment>
 ))}
 </tbody>
 </NativeTable>
 </div>
 
</ScrollReveal>
</section>

 {/* Trust Signals */}
 <section className="border-t border-[hsl(var(--foreground)/0.06)] py-space-16">
<ScrollReveal stagger>

 <div className="mx-auto max-w-5xl px-space-6">
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-6">
 {[
 { title:"Enterprise Security", desc:"SOC2-ready, end-to-end encryption, multi-tenant data isolation"},
 { title:"Expert Support", desc:"Real humans available. No bots. Setup assistance included on all plans."},
 { title:"No Lock-in", desc:"Cancel anytime. Export your data anytime. We believe in earned loyalty."},
 ].map((t) => (
 <div key={t.title} className="flex items-start gap-space-4 radius-lg border border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)] p-space-5">
 <Shield className="h-5 w-5 shrink-0 mt-space-1 text-primary"/>
 <div>
 <p className="text-body-sm text-foreground mb-space-1">{t.title}</p>
 <p className="text-caption text-muted-foreground leading-relaxed">{t.desc}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 
</ScrollReveal>
</section>

 {/* FAQ */}
 <section className="py-space-28 md:py-space-36 border-t border-[hsl(var(--foreground)/0.06)]">
<ScrollReveal stagger>

 <div className="mx-auto max-w-3xl px-space-6">
 <div className="mb-space-16 text-center">
 <div className="inline-flex items-center gap-space-2 px-space-4 py-space-2 radius-full border border-primary/20 bg-primary/5 mb-space-6">
 <span className="text-caption uppercase tracking-widest text-primary font-semibold">FAQ</span>
 </div>
 <h2 className="text-heading-lg tracking-tight-sm text-foreground">
 Pricing FAQ.
 <br />
 Frequently <span className="text-primary">asked questions.</span>
 </h2>
 </div>
 <div className="space-y-space-0">
 {[
 { q:"Is there a free trial?", a:"Yes. Every plan includes a 14-day free trial with full feature access. No credit card required."},
 { q:"What happens after my trial?", a:"You'll receive a reminder 3 days before your trial ends. You can choose a plan or cancel — no automatic charges."},
 { q:"Can I change plans anytime?", a:"Yes. Upgrade or downgrade at any time. Upgrades are instant. Downgrades take effect at the next billing cycle."},
 { q:"How are conversations counted?", a:"Each conversation is one complete session (e.g., one phone call, one chat session, one email thread). Not per-message."},
 { q:"Do voice minutes roll over?", a:"Unused voice minutes do not roll over. They reset on your billing date each month."},
 { q:"Are there setup or onboarding fees?", a:"No setup fees on any plan. Business plans include a dedicated onboarding specialist at no extra cost."},
 ].map((faq, i) => (
 <details key={i} className="group border-b border-[hsl(var(--foreground)/0.06)]">
 <summary className="flex items-center justify-between py-space-5 cursor-pointer list-none text-body-md text-foreground hover:text-primary transition-colors">
 {faq.q}
 <ChevronRight className="h-4 w-4 text-muted-foreground group-open:rotate-90 transition-transform shrink-0 ml-space-4"/>
 </summary>
 <div className="pb-space-5 text-body-sm text-muted-foreground leading-relaxed">{faq.a}</div>
 </details>
 ))}
 </div>
 </div>
 
</ScrollReveal>
</section>

 {/* Final CTA */}
 <section className="relative py-space-28 md:py-space-36 overflow-hidden border-t border-[hsl(var(--foreground)/0.06)]">
<ScrollReveal stagger>

 <div className="absolute inset-space-0 dot-grid grid-fade-y pointer-events-none"/>
 <div className="relative mx-auto max-w-2xl px-space-6 text-center">
 <div className="inline-flex items-center gap-space-2 px-space-4 py-space-2 radius-full border border-primary/20 bg-primary/5 mb-space-6">
 <span className="text-caption uppercase tracking-widest text-primary font-semibold">Get Started</span>
 </div>
 <h2 className="text-heading-lg sm:text-heading-lg tracking-tight-sm text-foreground mb-space-5">
 Start Free.
 <br />
 Ready to <span className="text-primary">get started?</span>
 </h2>
 <p className="text-muted-foreground text-title-lg mb-space-8">Start your 14-day free trial today. Full access. No credit card required.</p>
 <SessionAwareCta
    signedInText="Go to Dashboard"
    signedOutText="Start free trial"
    signedOutHref="/sign-in"
    size="lg"
  />
 </div>
 
</ScrollReveal>
</section>
 </main>

 <MarketingFooter />
 </div>
 );
}
