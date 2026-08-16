import { ScrollReveal } from "@/components/motion/scroll-reveal";
import Link from"next/link";
import { auth } from "@/lib/auth/server";
import { MarketingNav } from"@/components/marketing/nav";
import { MarketingFooter } from"@/components/marketing/footer";
import { InteractiveArchitecture } from"@/components/marketing/interactive-architecture";
import { DashboardPreview } from"@/components/marketing/visualizations/dashboard-preview";
import { ProductSimulation } from"@/components/marketing/visualizations/product-simulation";
import { InteractiveIndustryExplorer } from"@/components/marketing/visualizations/industry-explorer";
import { ROISimulatorSection } from"@/components/marketing/visualizations/revenue-recovery-simulator";
import { SessionAwareCta } from "@/components/marketing/session-aware-cta";
import {
 ArrowRight,
 Check,
 ChevronRight,
 Activity,
 PhoneOff,
 Clock,
 UserX,
 TrendingUp,
 Shield,
 Zap,
 Sparkles,
 XCircle,
 Scale,
 Scissors,
 Home,
} from"lucide-react";
import { Button } from"@/components/shared/button";
export const metadata = {
 title: "Operator — Never Miss Another Customer | 24/7 Operator AI",
 description:
 "Operator answers every call, books every appointment, and qualifies every lead — 24/7, in under 2 seconds. Built for dental, medical, salons, law firms, and service businesses.",
};
/* ── Trust Metrics (shown in hero) ─────────────────────────────────── */
const TRUST_METRICS = [
 { value: "+40%", label: "Revenue increase" },
 { value: "95%", label: "Lead capture rate" },
 { value: "94%", label: "Calendar fill rate" },
 { value: "<2s", label: "Response time" },
];
/* ── Social Proof Ticker Items ─────────────────────────────────────── */
const TICKER_ITEMS = [
 { metric: "+40%", text: "revenue increase — Bright Smile Dental" },
 { metric: "95%", text: "lead capture rate — Okonkwo Law Group" },
 { metric: "94%", text: "calendar utilization — Luxe Skin & Beauty" },
 { metric: "2s", text: "average response time — Verified" },
 { metric: "500+", text: "service businesses trust Operator" },
 { metric: "24/7", text: "always-on Operator AI coverage" },
 { metric: "EHR/CRM", text: "native calendar integrations" },
];
/* ── Pain Points ───────────────────────────────────────────────────── */
const PAIN_STATS = [
 {
 stat:"62%",
 headline:"of callers hang up if not answered",
 detail:"They don't leave voicemails. They call your competitor.",
 icon: <PhoneOff className="h-5 w-5"/>,
 },
 {
 stat:"$1,200",
 headline:"average lifetime value per missed lead",
 detail:"Every unanswered call is thousands in lost revenue.",
 icon: <TrendingUp className="h-5 w-5"/>,
 },
 {
 stat:"35%",
 headline:"of calls come outside business hours",
 detail:"Evenings, weekends, lunch breaks — your busiest missed windows.",
 icon: <Clock className="h-5 w-5"/>,
 },
];
/* ── Pricing Data ──────────────────────────────────────────────────── */
const PLANS = [
 {
 name:"Starter",
 price:"$49",
 desc:"For solo practitioners & independent studios",
 features: [
 "500 conversations/mo",
 "100 voice minutes included",
 "Website chat widget",
 "1 calendar integration",
 "Email support",
 ],
 highlight: false,
 cta:"Start free trial",
 },
 {
 name:"Professional",
 price:"$149",
 desc:"For growing clinics & professional offices",
 features: [
 "2,500 conversations/mo",
 "500 voice minutes included",
 "All channels (WhatsApp, Web, Voice)",
 "Lead intake qualification card",
 "3 calendar sync channels",
 "Priority customer support",
 ],
 highlight: true,
 cta:"Start free trial",
 },
 {
 name:"Business",
 price:"$349",
 desc:"For multi-location & enterprise practices",
 features: [
 "10,000 conversations/mo",
 "2,000 voice minutes included",
 "5 locations mapping",
 "EHR/CRM custom sync integrations",
 "Dedicated account manager",
 "SLA availability guarantee",
 ],
 highlight: false,
 cta:"Start free trial",
 },
];
/* ── Comparison Badges (absorbed from old section) ─────────────────── */
const COMPARISON_BADGES = [
 { label:"vs. Hiring staff", value:"Save 90% on costs"},
 { label:"vs. Answering service", value:"10× faster response"},
 { label:"vs. Doing nothing", value:"Recover $60k+/year"},
];
export default async function HomePage() {
 const { userId } = await auth();
 return (
 <div className="relative flex flex-col min-h-screen bg-background text-foreground">
 <MarketingNav />
 <main className="flex-1 overflow-x-hidden">
 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 1: HERO — Emotional hook + trust metrics + CTA
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <section
 id="hero"
 className="relative overflow-hidden gradient-hero pt-space-28 pb-space-20 md:pt-space-32 md:pb-space-24"
 >
<ScrollReveal stagger>

 {/* Dotted grid background */}
 <div className="absolute inset-space-0 dot-grid opacity-10 pointer-events-none"/>
 {/* Radial glow */}
 <div className="absolute top-space-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-screen bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.12),transparent_70%)] pointer-events-none"/>
 <div className="relative mx-auto max-w-screen-xl px-space-6 flex flex-col items-center mt-space-16">
 {/* Announcement pill */}
 <div className="flex justify-center mb-space-8">
 <Link
 href="/changelog"
 className="inline-flex items-center gap-space-3 radius-full border border-border-muted bg-bg-layer-2/60 p-space-1 pr-space-4 hover:border-foreground/20 hover:bg-bg-layer-2 transition-all group"
 >
 <span className="inline-flex items-center gap-space-1.5 bg-primary/10 text-primary px-space-3 py-space-1 radius-full text-caption font-normal">
 <Sparkles className="h-3 w-3 shrink-0"/> New Updates
 </span>
 <span className="text-caption text-muted-foreground font-medium flex items-center gap-space-1">
 Discover what is fresh in version 2.1
 <ChevronRight className="h-3 w-3 text-muted-foreground/60 group-hover:translate-x-0.5 transition-transform"/>
 </span>
 </Link>
 </div>
 {/* Headline — Emotional, memorable, simple */}
 <h1 className="text-center text-display-xl md:text-display-2xl tracking-tight leading-display text-foreground mb-space-6 font-semibold max-w-2xl">
 <span className="block">Never Miss Another</span>
 <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-[hsl(280_75%_55%)]">
 Customer.
 </span>
 </h1>
 {/* Subtitle */}
 <p className="mx-auto max-w-2xl text-center text-body-lg text-muted-foreground leading-relaxed mb-space-10">
 Operator answers every call, books every appointment, and
 qualifies every lead
 <br className="hidden sm:inline"/>— 24/7, in under 2 seconds.
 Built for service businesses.
 </p>
 {/* CTAs */}
 <div className="flex flex-col sm:flex-row items-center justify-center gap-space-4 mb-space-12 w-full">
 {userId ? (
 <Button asChild variant="default" size="lg" className="cursor-pointer w-full sm:w-auto">
 <Link href="/dashboard">
 Go to Dashboard <ArrowRight className="h-4 w-4"/>
 </Link>
 </Button>
 ) : (
 <>
 <Button asChild variant="outline" size="lg" className="cursor-pointer w-full sm:w-auto">
 <Link href="/demo">
 Learn more
 </Link>
 </Button>
 <Button asChild variant="default" size="lg" className="cursor-pointer w-full sm:w-auto">
 <Link href="/sign-up">
 Get started today <ArrowRight className="h-4 w-4"/>
 </Link>
 </Button>
 </>
 )}
 </div>
 {/* Browser preview window — cropped, non-interactive */}
 <div className="relative w-full max-w-screen-xl mt-space-4">
 <div className="absolute -inset-space-10 mesh-glow opacity-[0.12] pointer-events-none z-0"/>
 <div className="relative z-10 radius-2xl overflow-hidden max-h-128 pointer-events-none select-none shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.12)]">
 <DashboardPreview />
 </div>
 {/* Bottom fade */}
 <div className="absolute bottom-space-0 left-space-0 right-space-0 h-40 bg-gradient-to-t from-background via-background/80 to-transparent z-20 pointer-events-none" />
 </div>
 {/* Partner/Brand logos strip */}
 <div className="mt-space-16 border-t border-border-muted pt-space-10 text-center w-full max-w-4xl">
 <p className="text-caption text-muted-foreground uppercase tracking-widest mb-space-8 font-semibold opacity-85">
 Trusted by 500+ clinics, salons, law firms, and service brands
 </p>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-y-space-6 gap-x-space-8 items-center justify-items-center opacity-65 hover:opacity-90 transition-opacity duration-300">
 
 {/* CareDental Logo */}
 <div className="flex items-center gap-space-2.5 group/logo select-none cursor-default">
 <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover/logo:bg-emerald-500/20 transition-colors">
 <Activity className="h-4 w-4" />
 </div>
 <span className="text-body-md tracking-tight">
 <span className="text-muted-foreground font-light">Care</span>
 <span className="text-foreground font-semibold">Dental</span>
 </span>
 </div>

 {/* Vanguard Law Logo */}
 <div className="flex items-center gap-space-2.5 group/logo select-none cursor-default">
 <div className="h-7 w-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover/logo:bg-indigo-500/20 transition-colors">
 <Scale className="h-4 w-4" />
 </div>
 <span className="text-body-md tracking-tight">
 <span className="text-foreground font-semibold">Vanguard</span>
 <span className="text-muted-foreground font-light ml-space-0.5">Law</span>
 </span>
 </div>

 {/* Aura Studios Logo */}
 <div className="flex items-center gap-space-2.5 group/logo select-none cursor-default">
 <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover/logo:bg-amber-500/20 transition-colors">
 <Scissors className="h-4 w-4" />
 </div>
 <span className="text-body-sm tracking-wider uppercase font-bold text-foreground group-hover/logo:text-amber-500 transition-colors">
 Aura<span className="text-muted-foreground font-light text-caption tracking-normal lowercase ml-space-1">studios</span>
 </span>
 </div>

 {/* Apex Realty Logo */}
 <div className="flex items-center gap-space-2.5 group/logo select-none cursor-default">
 <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover/logo:bg-primary/20 transition-colors">
 <Home className="h-4 w-4" />
 </div>
 <span className="text-body-md tracking-tight">
 <span className="text-foreground font-medium">Apex</span>
 <span className="text-primary font-bold ml-space-0.5">Realty</span>
 </span>
 </div>

 </div>
 </div>
 </div>
 
</ScrollReveal>
</section>
 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 2: SOCIAL PROOF STRIP — Horizontal brand ribbon
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <section
 id="social-proof"
 className="py-space-8 overflow-hidden relative"
 >
<ScrollReveal stagger>

 <div className="w-full py-space-4 md:py-space-5 bg-gradient-to-r from-primary to-[hsl(280_75%_55%)] flex overflow-hidden">
 <div className="ticker-track flex flex-row w-max">
 {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => (
 <div
 key={idx}
 className="flex items-center gap-space-4 px-space-8 shrink-0 text-white"
 >
 <span className="text-body-md md:text-title-sm font-semibold font-mono">
 {item.metric}
 </span>
 <span className="text-body-md md:text-title-sm font-semibold whitespace-nowrap opacity-95">
 {item.text}
 </span>
 <span className="text-body-md md:text-title-sm opacity-60 select-none ml-space-4">
 ✦
 </span>
 </div>
 ))}
 </div>
 </div>
 
</ScrollReveal>
</section>
 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 3: THE PROBLEM — What happens when you miss a call
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <div className="section-break"/>
 <section
 id="the-problem"
 className="py-space-24 lg:py-space-32 bg-bg-layer-0 relative overflow-hidden"
 >
<ScrollReveal stagger>

 {/* Decorative mesh glow */}
 <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-full max-w-2xl h-svh bg-[radial-gradient(ellipse_at_center,hsl(var(--state-error-text)/0.02),transparent_70%)] pointer-events-none blur-3xl"/>
 <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-full max-w-2xl h-svh bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.02),transparent_70%)] pointer-events-none blur-3xl"/>
 <div className="relative mx-auto max-w-6xl px-space-6">
 {/* Centered Section Header */}
 <div className="text-center max-w-3xl mx-auto mb-space-16">
 {/* Brand pill — same pattern as other sections */}
 <div className="inline-flex items-center gap-space-2 px-space-4 py-space-2 radius-full border border-[hsl(var(--state-error-text)/0.3)] bg-[hsl(var(--state-error-text)/0.08)] mb-space-6">
 <PhoneOff className="h-3 w-3 text-[hsl(var(--state-error-text))]"/>
 <span className="text-caption uppercase tracking-widest text-[hsl(var(--state-error-text))] font-semibold">
 The Silent Revenue Killer
 </span>
 </div>
 <h2 className="text-heading-xl tracking-tight-sm leading-snug text-foreground mb-space-4">
 The High Cost of a<br />{""}
 <span className="text-[hsl(var(--state-error-text))]">
 Missed Call
 </span>
 </h2>
 <p className="text-body-lg text-muted-foreground mt-space-5 leading-relaxed max-w-xl mx-auto">
 Every missed call is a missed patient, client, or booking. The
 math is simple, brutal, and compounds every day you don&apos;t
 fix it.
 </p>
 </div>
 {/* Centered 3-Column Stats Row */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-space-8 border-b border-border-muted pb-space-16 mb-space-16 text-center">
 <div className="space-y-space-3">
 <p className="text-heading-lg font-semibold text-[hsl(var(--state-error-text))]">
 62%
 </p>
 <h4 className="text-title-lg font-semibold text-foreground">
 Hang-up Rate
 </h4>
 <p className="text-body-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
 Callers hang up when they hit voicemail and immediately call
 your competitor.
 </p>
 </div>
 <div className="space-y-space-3">
 <p className="text-heading-lg font-semibold text-foreground">
 $1,200
 </p>
 <h4 className="text-title-lg font-semibold text-foreground">
 Missed Lead Value
 </h4>
 <p className="text-body-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
 The average lifetime value of a single missed service business
 lead.
 </p>
 </div>
 <div className="space-y-space-3">
 <p className="text-heading-lg font-semibold text-foreground">35%</p>
 <h4 className="text-title-lg font-semibold text-foreground">
 After-Hours Calls
 </h4>
 <p className="text-body-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
 Of calls come evenings, weekends, or lunch breaks when you are
 closed.
 </p>
 </div>
 </div>
 {/* Side-by-Side Comparison Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-space-8 items-stretch">
 {/* WITHOUT OPERATOR CARD */}
 <div className="radius-2xl border border-[hsl(var(--state-error-text)/0.12)] bg-[hsl(var(--state-error-bg)/0.5)] p-space-8 ] hover:-translate-y-1 transition-all duration-350 ease-out relative overflow-hidden group">
 <div className="absolute top-space-0 right-space-0 w-32 h-32 bg-[radial-gradient(ellipse_at_center,rgba(240,68,56,0.04),transparent_70%)] pointer-events-none"/>
 <div className="flex items-center gap-space-3 mb-space-6">
 <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--state-error-bg))] text-[hsl(var(--state-error-text))]">
 <UserX className="h-4 w-4"/>
 </div>
 <span className="text-caption uppercase tracking-wider text-[hsl(var(--state-error-text))] font-semibold">
 Without Operator
 </span>
 </div>
 <ul className="space-y-space-4">
 <li className="flex items-start text-body-sm text-foreground/90">
 <span className="text-[hsl(var(--state-error-text))] mr-space-3 select-none flex items-center justify-center h-5 w-5 shrink-0 mt-space-0.5">
 <XCircle className="h-4 w-4"/>
 </span>
 <span className="leading-snug">
 Calls go to voicemail after hours
 </span>
 </li>
 <li className="flex items-start text-body-sm text-foreground/90">
 <span className="text-[hsl(var(--state-error-text))] mr-space-3 select-none flex items-center justify-center h-5 w-5 shrink-0 mt-space-0.5">
 <XCircle className="h-4 w-4"/>
 </span>
 <span className="leading-snug">
 <span className="inline-flex items-center px-space-2 py-space-0.5 rounded-full bg-primary/15 text-primary font-semibold text-caption mr-space-1.5">
 30%+
 </span>
 of leads never call back
 </span>
 </li>
 <li className="flex items-start text-body-sm text-foreground/90">
 <span className="text-[hsl(var(--state-error-text))] mr-space-3 select-none flex items-center justify-center h-5 w-5 shrink-0 mt-space-0.5">
 <XCircle className="h-4 w-4"/>
 </span>
 <span className="leading-snug">
 Staff interrupted during appointments
 </span>
 </li>
 <li className="flex items-start text-body-sm text-foreground/90">
 <span className="text-[hsl(var(--state-error-text))] mr-space-3 select-none flex items-center justify-center h-5 w-5 shrink-0 mt-space-0.5">
 <XCircle className="h-4 w-4"/>
 </span>
 <span className="leading-snug">
 Manual booking errors &amp; double-books
 </span>
 </li>
 <li className="flex items-start text-body-sm text-foreground/90">
 <span className="text-[hsl(var(--state-error-text))] mr-space-3 select-none flex items-center justify-center h-5 w-5 shrink-0 mt-space-0.5">
 <XCircle className="h-4 w-4"/>
 </span>
 <span className="leading-snug">
 Zero data on missed opportunities
 </span>
 </li>
 </ul>
 </div>
 {/* WITH OPERATOR CARD */}
 <div className="radius-2xl border border-primary/20 bg-[hsl(var(--primary)/0.03)] p-space-8 hover:-translate-y-1 transition-all duration-350 ease-out relative overflow-hidden group">
 {/* Subtle brand blue/purple glow on the right, matches reference image style */}
 <div className="absolute right-[-10%] top-[-10%] w-72 h-72 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.12),transparent_70%)] pointer-events-none blur-2xl z-0"/>
 <div className="flex items-center gap-space-3 mb-space-6 relative z-10">
 <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
 <Zap className="h-4 w-4"/>
 </div>
 <span className="text-caption uppercase tracking-wider text-primary font-semibold">
 With Operator
 </span>
 </div>
 <ul className="space-y-space-4 relative z-10">
 <li className="flex items-start text-body-sm text-foreground/95">
 <span className="text-primary mr-space-3 select-none flex items-center justify-center h-5 w-5 shrink-0 mt-space-0.5">
 <Check className="h-4 w-4 stroke-[2.5]"/>
 </span>
 <span className="leading-snug font-medium">
 Every call answered in
 <span className="inline-flex items-center px-space-2 py-space-0.5 rounded-full bg-primary/15 text-primary font-semibold text-caption mx-space-1.5">
 under 2s
 </span>
 </span>
 </li>
 <li className="flex items-start text-body-sm text-foreground/95">
 <span className="text-primary mr-space-3 select-none flex items-center justify-center h-5 w-5 shrink-0 mt-space-0.5">
 <Check className="h-4 w-4 stroke-[2.5]"/>
 </span>
 <span className="leading-snug font-medium">
 <span className="inline-flex items-center px-space-2 py-space-0.5 rounded-full bg-primary/15 text-primary font-semibold text-caption mr-space-1.5">
 95%
 </span>
 of leads captured and qualified
 </span>
 </li>
 <li className="flex items-start text-body-sm text-foreground/95">
 <span className="text-primary mr-space-3 select-none flex items-center justify-center h-5 w-5 shrink-0 mt-space-0.5">
 <Check className="h-4 w-4 stroke-[2.5]"/>
 </span>
 <span className="leading-snug font-medium">
 Appointments booked{" "}
 <span className="inline-flex items-center px-space-2 py-space-0.5 rounded-full bg-primary/15 text-primary font-semibold text-caption mx-space-1.5">
 24/7
 </span>{" "}
 automatically
 </span>
 </li>
 <li className="flex items-start text-body-sm text-foreground/95">
 <span className="text-primary mr-space-3 select-none flex items-center justify-center h-5 w-5 shrink-0 mt-space-0.5">
 <Check className="h-4 w-4 stroke-[2.5]"/>
 </span>
 <span className="leading-snug font-medium">
 Real-time calendar sync, zero conflicts
 </span>
 </li>
 <li className="flex items-start text-body-sm text-foreground/95">
 <span className="text-primary mr-space-3 select-none flex items-center justify-center h-5 w-5 shrink-0 mt-space-0.5">
 <Check className="h-4 w-4 stroke-[2.5]"/>
 </span>
 <span className="leading-snug font-medium">
 Full analytics dashboard on every interaction
 </span>
 </li>
 </ul>
 </div>
 </div>
 </div>
 
</ScrollReveal>
</section>
 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 4: HOW IT WORKS — Architecture diagram centerpiece
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <div className="section-break"/>
 <section
 id="how-it-works"
 className="relative py-space-24 lg:py-space-32 overflow-hidden architecture-bg"
 >
<ScrollReveal stagger>

 <div className="absolute inset-space-0 dot-grid opacity-8 pointer-events-none"/>
 <div className="relative mx-auto max-w-6xl px-space-6">
 <div className="text-center mb-space-16">
 <div className="inline-flex items-center gap-space-2 px-space-4 py-space-2 radius-full border border-primary/20 bg-primary/5 mb-space-4">
 <Activity className="h-3 w-3 text-primary"/>
 <span className="text-caption uppercase tracking-widest text-primary">
 How It Works
 </span>
 </div>
 <h2 className="text-heading-xl tracking-tight-sm leading-snug text-foreground mb-space-4">
 Every channel. One brain.
 <br />
 <span className="text-primary">Zero missed leads.</span>
 </h2>
 <p className="text-muted-foreground text-body-md max-w-2xl mx-auto leading-relaxed">
 Phone, WhatsApp, Instagram, website chat — Operator handles them
 all and routes to bookings, CRM, and analytics automatically.
 </p>
 </div>
 {/* 3-Layer Interactive Architecture — the"aha"moment */}
 <InteractiveArchitecture />
 </div>
 
</ScrollReveal>
</section>
 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 5: SEE IT IN ACTION — Product simulation
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <div className="section-break"/>
 <section
 id="live-demo"
 className="py-space-24 lg:py-space-32 bg-[hsl(var(--foreground)/0.01)]"
 >
<ScrollReveal stagger>

 <div className="mx-auto max-w-6xl px-space-6">
 <div className="text-center mb-space-16">
 <div className="inline-flex items-center gap-space-2 px-space-4 py-space-2 radius-full border border-primary/20 bg-primary/5 mb-space-4">
 <Zap className="h-3 w-3 text-primary"/>
 <span className="text-caption uppercase tracking-widest text-primary font-semibold">
 Live Demo
 </span>
 </div>
 <h2 className="text-heading-xl tracking-tight-sm leading-snug text-foreground mb-space-4">
 Watch Operator work
 <br />
 <span className="text-primary">in real time.</span>
 </h2>
 <p className="text-muted-foreground text-body-md max-w-lg mx-auto leading-relaxed">
 From first hello to confirmed booking — see exactly what happens
 behind the scenes when a customer calls your business.
 </p>
 </div>
 {/* Chat & Database Simulation */}
 <ProductSimulation />
 </div>
 
</ScrollReveal>
</section>
 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 5.5: GETTING STARTED — Tilted Onboarding Steps
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <div className="section-break"/>
 <section
 id="getting-started"
 className="py-space-24 lg:py-space-32 relative overflow-hidden"
 >
<ScrollReveal stagger>

 <div className="absolute inset-space-0 dot-grid opacity-10 pointer-events-none"/>
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-96 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.06),transparent_70%)] pointer-events-none"/>
 <div className="relative mx-auto max-w-5xl px-space-6">
 {/* Header */}
 <div className="text-center mb-space-16">
 <div className="inline-flex items-center gap-space-2 px-space-4 py-space-2 radius-full border border-primary/20 bg-primary/5 mb-space-4">
 <span className="text-caption uppercase tracking-widest text-primary font-semibold">
 Simple Onboarding
 </span>
 </div>
 <h2 className="text-heading-xl tracking-tight-sm leading-snug text-foreground mb-space-4">
 Simple Onboarding.
 <br />
 <span className="text-primary">We make it super easy.</span>
 </h2>
 <p className="text-muted-foreground text-body-md max-w-xl mx-auto leading-relaxed">
 Connect your business, train your custom Operator AI, and
 launch. You will be set up in under 30 minutes.
 </p>
 </div>
 {/* Three Tilted Steps Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-space-8 md:gap-space-6 px-space-4 md:px-space-0 items-stretch">
 {/* Step 1: Connect (Tilted Left) */}
 <div className="tilted-card-left radius-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/65 p-space-8 flex flex-col justify-between relative overflow-hidden">
 <div className="absolute top-space-0 right-space-0 w-32 h-32 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.04),transparent_70%)] pointer-events-none"/>
 <div>
 <span className="text-caption uppercase tracking-wider text-primary font-mono font-semibold">
 01 / Connect
 </span>
 <h3 className="text-title-lg text-foreground mt-space-2 mb-space-3 font-semibold">
 Link Your Channels
 </h3>
 <p className="text-body-sm text-muted-foreground leading-relaxed mb-space-6">
 Route your business phone line, connect WhatsApp Business,
 and embed our elegant chat widget in one click.
 </p>
 </div>
 {/* Mockup Inside Card */}
 <div className="radius-xl border border-[hsl(var(--foreground)/0.06)] bg-card p-space-4 space-y-space-2 mt-auto">
 <div className="flex justify-between items-center text-caption pb-space-2 border-b border-[hsl(var(--foreground)/0.04)]">
 <span className="text-foreground font-mono">
 Channels Integration
 </span>
 <span className="text-success-500 font-semibold font-mono">
 ✓ Online
 </span>
 </div>
 <div className="flex justify-between items-center text-caption py-space-1">
 <span className="text-muted-foreground">Phone Routing</span>
 <span className="radius-full bg-success-500/10 px-space-2 py-space-0.5 text-success-500 text-caption uppercase font-mono text-caption">
 Active
 </span>
 </div>
 <div className="flex justify-between items-center text-caption py-space-1">
 <span className="text-muted-foreground">WhatsApp API</span>
 <span className="radius-full bg-success-500/10 px-space-2 py-space-0.5 text-success-500 text-caption uppercase font-mono text-caption">
 Active
 </span>
 </div>
 <div className="flex justify-between items-center text-caption py-space-1">
 <span className="text-muted-foreground">Web Widget</span>
 <span className="radius-full bg-primary/10 px-space-2 py-space-0.5 text-primary text-caption uppercase font-mono text-caption">
 Connected
 </span>
 </div>
 </div>
 </div>
 {/* Step 2: Train (Straight Center) */}
 <div className="tilted-card-center radius-2xl border border-[hsl(var(--foreground)/0.08)] bg-card p-space-8 flex flex-col justify-between relative overflow-hidden">
 <div className="absolute top-space-0 right-space-0 w-32 h-32 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.06),transparent_70%)] pointer-events-none"/>
 <div className="absolute top-space-4 right-space-4 h-2 w-2 radius-full bg-primary animate-pulse"/>
 <div>
 <span className="text-caption uppercase tracking-wider text-primary font-mono font-semibold">
 02 / Train
 </span>
 <h3 className="text-title-lg text-foreground mt-space-2 mb-space-3 font-semibold">
 Teach Your AI
 </h3>
 <p className="text-body-sm text-muted-foreground leading-relaxed mb-space-6">
 Paste your website link, upload instruction PDFs, or list
 custom FAQs. Operator converts them into business
 knowledge instantly.
 </p>
 </div>
 {/* Mockup Inside Card */}
 <div className="radius-xl border border-[hsl(var(--foreground)/0.08)] bg-card p-space-4 space-y-space-3 mt-auto">
 <div className="text-caption font-mono border-b border-[hsl(var(--foreground)/0.04)] pb-space-2 flex items-center justify-between">
 <span className="text-foreground">Add Custom FAQ</span>
 <span className="text-primary font-mono">✦ Ready</span>
 </div>
 <div className="space-y-space-1">
 <div className="text-caption text-muted-foreground leading-relaxed bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.05)] rounded p-space-2">
 Q: What is our cancellation policy?
 <br />
 A: Free cancellation up to 24 hours prior.
 </div>
 </div>
 <Button className="w-full bg-foreground py-space-2 text-center text-caption text-background font-normal hover:opacity-90 transition-all select-none cursor-pointer">
 Train Operator AI ✦
 </Button>
 </div>
 </div>
 {/* Step 3: Go Live (Tilted Right) */}
 <div className="tilted-card-right radius-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/65 p-space-8 flex flex-col justify-between relative overflow-hidden">
 <div className="absolute top-space-0 right-space-0 w-32 h-32 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.04),transparent_70%)] pointer-events-none"/>
 <div>
 <span className="text-caption uppercase tracking-wider text-primary font-mono font-semibold">
 03 / Go Live
 </span>
 <h3 className="text-title-lg text-foreground mt-space-2 mb-space-3 font-semibold">
 Review & Go Live
 </h3>
 <p className="text-body-sm text-muted-foreground leading-relaxed mb-space-6">
 Test Operator AI live in a simulation chat/call
 sandbox, tune the voice style, and activate 24/7 client
 coverage.
 </p>
 </div>
 {/* Mockup Inside Card */}
 <div className="radius-xl border border-[hsl(var(--foreground)/0.06)] bg-card p-space-4 space-y-space-2 mt-auto">
 <div className="flex justify-between items-center text-caption pb-space-2 border-b border-[hsl(var(--foreground)/0.04)]">
 <span className="text-foreground font-mono">
 Review Checklist
 </span>
 <span className="text-success-500 font-semibold font-mono">
 ✓ Validated
 </span>
 </div>
 <ul className="space-y-space-2 text-caption">
 <li className="flex items-center gap-space-2 text-foreground/80">
 <span className="text-success-500 font-semibold font-mono">
 ✓
 </span>{""}
 Voice Engine Pitch (Professional)
 </li>
 <li className="flex items-center gap-space-2 text-foreground/80">
 <span className="text-success-500 font-semibold font-mono">
 ✓
 </span>{""}
 Direct Forwarding Set (Forward to Staff)
 </li>
 <li className="flex items-center gap-space-2 text-foreground/80">
 <span className="text-success-500 font-semibold font-mono">
 ✓
 </span>{""}
 Calendar Booking Active (Google Calendar)
 </li>
 </ul>
 <div className="radius-md bg-success-500/10 border border-success-500/20 py-space-1.5 text-center text-caption text-success-500 font-semibold font-mono uppercase mt-space-2 select-none text-caption">
 ● Operator AI Live
 </div>
 </div>
 </div>
 </div>
 </div>
 
</ScrollReveal>
</section>
 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 6: BUILT FOR YOUR INDUSTRY — Industry explorer
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <div className="section-break"/>
 <section id="industries"className="py-space-24 lg:py-space-32">
<ScrollReveal stagger>

 <div className="mx-auto max-w-6xl px-space-6">
 {/* Centered header */}
 <div className="text-center max-w-3xl mx-auto mb-space-14">
 <div className="inline-flex items-center gap-space-2 px-space-4 py-space-2 radius-full border border-primary/20 bg-primary/5 mb-space-6">
 <Activity className="h-3 w-3 text-primary"/>
 <span className="text-caption uppercase tracking-widest text-primary font-semibold">
 Industries
 </span>
 </div>
 <h2 className="text-heading-xl tracking-tight-sm leading-snug text-foreground mb-space-4">
 Configured for your industry
 <br />
 <span className="text-primary">on day one.</span>
 </h2>
 <p className="text-muted-foreground text-body-md max-w-xl mx-auto leading-relaxed mb-space-8">
 Pre-built conversation flows, intake forms, and integrations for
 your exact vertical. Switch industries below to see how Operator
 adapts instantly.
 </p>
 </div>
 {/* Interactive Industry Switcher */}
 <InteractiveIndustryExplorer />
 </div>
 
</ScrollReveal>
</section>
 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 7: REVENUE RECOVERY — Merged ROI calculator
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <div className="section-break"/>
 <ROISimulatorSection />
 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 8: PRICING — Enhanced with comparison row
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <div className="section-break"/>
 <section id="pricing"className="py-space-24 lg:py-space-32">
<ScrollReveal stagger>

 <div className="mx-auto max-w-5xl px-space-6">
 <div className="text-center mb-space-16">
 <div className="inline-flex items-center gap-space-2 px-space-4 py-space-2 radius-full border border-primary/20 bg-primary/5 mb-space-4">
 <span className="text-caption uppercase tracking-widest text-primary font-semibold">
 Pricing
 </span>
 </div>
 <h2 className="text-heading-xl tracking-tight-sm leading-snug text-foreground mb-space-4">
 Simple pricing. Instant setup.
 <br />
 <span className="text-primary">Cancel anytime.</span>
 </h2>
 <p className="text-muted-foreground text-body-md max-w-lg mx-auto leading-relaxed">
 Every plan starts with a 14-day free trial. Setup takes under 30
 minutes. No contracts, no surprises.
 </p>
 </div>
 {/* Pricing cards */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-6 mb-space-10">
 {PLANS.map((plan) => (
 <div
 key={plan.name}
 className={`relative radius-xl flex flex-col justify-between transition-all duration-300 ${
 plan.highlight
 ?"pricing-card-popular pt-space-10 px-space-6 pb-space-6"
 :"border border-[hsl(var(--foreground)/0.06)] bg-card/40 p-space-6"
 }`}
 >
 {plan.highlight && (
 <div className="absolute top-space-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 radius-full bg-gradient-to-r from-primary to-[hsl(280_75%_55%)] px-space-4 py-space-1 text-caption text-primary-foreground whitespace-nowrap font-semibold">
 ✦ Most Popular
 </div>
 )}
 <div>
 <h3 className="text-title-lg text-foreground mb-space-1">
 {plan.name}
 </h3>
 <p className="text-body-sm text-muted-foreground mb-space-4 min-h-10">
 {plan.desc}
 </p>
 <div className="flex items-end gap-space-1 mb-space-6">
 <span className="text-heading-lg text-foreground font-mono">
 {plan.price}
 </span>
 <span className="text-muted-foreground text-body-sm mb-space-1">
 /month
 </span>
 </div>
 <ul className="space-y-space-3 border-t border-[hsl(var(--foreground)/0.04)] pt-space-4 mb-space-8">
 {plan.features.map((f) => (
 <li
 key={f}
 className="flex items-start gap-space-2 text-body-sm"
 >
 <Check className="h-4 w-4 text-primary shrink-0 mt-space-1"/>
 <span className="text-foreground/80">{f}</span>
 </li>
 ))}
 </ul>
 </div>
 <Button
 asChild
 variant={plan.highlight ? "default" : "outline"}
 className="w-full"
 >
 <Link href="/sign-up">{plan.cta}</Link>
 </Button>
 </div>
 ))}
 </div>
 {/* Comparison badges — absorbed from old Comparison section */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-3 mb-space-8">
 {COMPARISON_BADGES.map((c) => (
 <div
 key={c.label}
 className="comparison-badge flex flex-col items-center gap-space-1"
 >
 <span className="text-caption text-muted-foreground font-normal">
 {c.label}
 </span>
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
 <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform"/>
 </Link>
 </div>
 </div>
 
</ScrollReveal>
</section>
 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 9: FINAL CTA — High-urgency gradient close
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <div className="section-break"/>
 <section
 id="cta-final"
 className="relative py-space-28 lg:py-space-32 overflow-hidden cta-mesh"
 >
<ScrollReveal stagger>

 <div className="absolute inset-space-0 dot-grid opacity-10 pointer-events-none"/>
 {/* Extra mesh glow */}
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-80 mesh-glow opacity-50 pointer-events-none"/>
 <div className="relative mx-auto max-w-2xl px-space-6 text-center">
 <div className="inline-flex items-center gap-space-2 px-space-4 py-space-2 radius-full border border-primary/20 bg-primary/5 mb-space-6">
 <span className="text-caption uppercase tracking-widest text-primary font-semibold">
 Get Started
 </span>
 </div>
 <h2 className="text-heading-xl md:text-display-lg tracking-tight-xs leading-tight text-foreground mb-space-6">
 Your next customer
 <br />
 is calling <span className="text-primary">right now.</span>
 </h2>
 <p className="text-muted-foreground text-title-md leading-relaxed mb-space-10 max-w-lg mx-auto">
 Every minute without Operator is another missed appointment,
 another lost lead, another customer who chose your competitor. Fix
 it today.
 </p>
 <div className="flex flex-col sm:flex-row items-center justify-center gap-space-4 mb-space-6">
 <SessionAwareCta
 signedInText="Go to Dashboard"
 signedOutText="Start your free trial"
 signedOutHref="/sign-up"
 variant="default"
 size="lg"
 />
 <Button asChild variant="outline" size="lg" className="cursor-pointer">
 <Link href="/demo">
 Book a live demo <ArrowRight className="h-3.5 w-3.5"/>
 </Link>
 </Button>
 </div>
 <div className="flex items-center justify-center gap-space-4 text-caption text-muted-foreground">
 <span className="flex items-center gap-space-1">
 <Check className="h-3 w-3 text-primary"/> No credit card
 </span>
 <span className="h-3 w-px bg-[hsl(var(--foreground)/0.1)]"/>
 <span className="flex items-center gap-space-1">
 <Check className="h-3 w-3 text-primary"/> Setup in 30 min
 </span>
 <span className="h-3 w-px bg-[hsl(var(--foreground)/0.1)]"/>
 <span className="flex items-center gap-space-1">
 <Check className="h-3 w-3 text-primary"/> Cancel anytime
 </span>
 </div>
 </div>
 
</ScrollReveal>
</section>
 </main>
 <MarketingFooter />
 </div>
 );
}
