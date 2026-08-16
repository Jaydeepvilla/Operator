import type { Metadata } from"next";
import Link from"next/link";
import { Button } from "@/components/shared/button";
import { SessionAwareCta } from "@/components/marketing/session-aware-cta";
import { MarketingNav } from"@/components/marketing/nav";
import { MarketingFooter } from"@/components/marketing/footer";
import { ArrowRight, Check, Heart, Zap, Globe, Shield, Users, Target } from"lucide-react";

export const metadata: Metadata = {
 title:"About Operator | Our Mission, Team & Story",
 description:
 "Learn about Operator— our mission to give every service business access to enterprise-grade AI, our founding story, and the team building the future of business communication.",
};

const VALUES = [
 { title:"Customer Obsession", desc:"Every feature we build starts with a real problem from a real business owner. We listen before we code."},
 { title:"Speed of Delivery", desc:"Service businesses move fast. Their AI should move faster. We build for speed, not ceremonies."},
 { title:"Uncompromising Security", desc:"Medical records, legal consultations, financial data. We treat your customer's data with the care it deserves."},
 { title:"Radical Accessibility", desc:"AI shouldn't require a technical team. A dentist should be able to launch in 30 minutes without reading a manual."},
 { title:"Outcome-Focused", desc:"We don't measure features shipped. We measure revenue captured, leads qualified, and calls answered for our customers."},
 { title:"Community First", desc:"Agency partners, resellers, and direct customers are all first-class citizens. We grow together."},
];

const TIMELINE = [
 { year:"2023", q:"Q1", event:"Problem Discovery", desc:"Our founders spent 3 months interviewing dental clinic owners, law firms, and salon managers. The same problem surfaced in every conversation: missed calls and slow responses were losing thousands of dollars every week."},
 { year:"2023", q:"Q2", event:"First Prototype", desc:"Built a basic AI chat widget for a dental clinic in Mumbai. Within 30 days, they had booked 40+ new patient appointments through the widget — all outside business hours."},
 { year:"2023", q:"Q3", event:"Voice AI Addition", desc:"The clinic asked: can it answer phone calls too? Six weeks later, the first version of Nexx Voice AI answered its first real inbound call. The caller didn't know it wasn't human."},
 { year:"2023", q:"Q4", event:"Multi-Industry Expansion", desc:"Expanded to law firms, salons, real estate agencies, and gyms. Each industry had unique needs — we built the Knowledge Base system to handle them without custom engineering."},
 { year:"2024", q:"Q1", event:"Omnichannel Launch", desc:"Added WhatsApp, SMS, Instagram, and Facebook Messenger. One AI brain now handles all channels from a unified inbox."},
 { year:"2024", q:"Q2", event:"Agency Platform", desc:"Launched the white-label Agency plan. The first agency went from signup to managing 12 client accounts in under 48 hours."},
 { year:"2024", q:"Q3", event:"Billing & Scale", desc:"Launched Stripe + Razorpay billing, usage metering, and the full subscription infrastructure. Platform became self-sustaining."},
 { year:"2025", q:"Now", event:"Launch", desc:"Operatoris now production-ready. Launching publicly to serve thousands of service businesses globally."},
];

const ROADMAP = [
 { item:"Multi-language Voice AI (Spanish, Hindi, Arabic)", status:"In Progress"},
 { item:"CRM integrations (HubSpot, Salesforce)", status:"Planned Q3 2025"},
 { item:"AI-powered outbound calling campaigns", status:"Planned Q3 2025"},
 { item:"Video consultation booking", status:"Planned Q4 2025"},
 { item:"Revenue forecasting from conversation data", status:"Planned Q4 2025"},
 { item:"Franchise-level analytics dashboard", status:"Planned 2026"},
];

const TEAM = [
 { name:"Rohan Mehta", role:"Co-Founder & CEO", bio:"10 years building SaaS products for healthcare and professional services. Previously led product at a health-tech startup serving 2M patients.", initials:"RM"},
 { name:"Aisha Patel", role:"Co-Founder & CTO", bio:"AI researcher turned engineer. Built conversational AI systems at scale. Specializes in voice AI, NLP, and real-time infrastructure.", initials:"AP"},
 { name:"Marcus Thompson", role:"Head of Growth", bio:"Former VP Sales at a Series B SaaS. Helped 3 companies go from 100 to 10,000 customers. Obsessed with conversion rate optimization.", initials:"MT"},
 { name:"Priya Singh", role:"Head of Customer Success", bio:"Spent 7 years managing enterprise software onboarding. Believes the best retention is a customer who sees ROI in week one.", initials:"PS"},
 { name:"David Chen", role:"Lead AI Engineer", bio:"ML engineering background from autonomous systems. Now building AI that sounds human — and performs better than one.", initials:"DC"},
 { name:"We're Hiring", role:"Various Roles", bio:"Looking for designers, engineers, and customer success specialists who believe AI should serve real businesses, not just Silicon Valley.", initials:"?", isHiring: true },
];

export default function AboutPage() {
 return (
 <div className="relative flex flex-col min-h-screen bg-background text-foreground overflow-x-hidden">
 <MarketingNav />

 <main className="flex-1">
 {/* Hero */}
 <section className="relative overflow-hidden">
 <div className="absolute inset-space-0 dot-grid grid-fade-b pointer-events-none"/>
 <div className="absolute top-space-0 left-1/2 -translate-x-1/2 w-[var(--bg-blob)] h-[var(--bg-blob-h)] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08),transparent_70%)] pointer-events-none"/>

 <div className="relative mx-auto max-w-5xl px-space-6 pt-32 pb-space-16 text-center">
 <p className="text-body-sm text-primary mb-space-4">Our story</p>
 <h1 className="text-display-xl tracking-tight-xs leading-display text-foreground mb-space-6">
 Built for the businesses
 <br />
 <span className="text-primary">the AI industry forgot.</span>
 </h1>
 <p className="mx-auto max-w-2xl text-title-lg text-muted-foreground leading-relaxed mb-space-10">
 While AI companies raced to serve Fortune 500 enterprises, millions of dentists, lawyers, salon owners, and gym managers were still losing revenue to voicemail. We built Operator to fix that.
 </p>
 <div className="flex flex-wrap justify-center gap-space-6 mb-space-16">
 {[
 { value:"2023", label:"Founded"},
 { value:"500+", label:"Businesses Served"},
 { value:"40+", label:"Countries"},
 { value:"2M+", label:"Conversations Handled"},
 ].map((m) => (
 <div key={m.label} className="text-center radius-lg border border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)] px-space-8 py-space-5 min-w-32">
 <p className="text-heading-lg text-primary font-mono mb-space-1">{m.value}</p>
 <p className="text-caption text-muted-foreground">{m.label}</p>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* Mission & Vision */}
 <section className="border-y border-[hsl(var(--foreground)/0.06)] py-space-20">
 <div className="mx-auto max-w-5xl px-space-6">
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-8">
 <div className="radius-2xl border border-primary/20 bg-primary/[0.03] p-space-8">
 <div className="h-10 w-10 radius-lg bg-primary/10 text-primary flex items-center justify-center mb-space-5">
 <Target className="h-5 w-5"/>
 </div>
 <h2 className="text-title-lg text-foreground mb-space-4 font-semibold">Our Mission</h2>
 <p className="text-muted-foreground leading-relaxed text-body-md">
 To give every service business — regardless of size, budget, or technical skill — access to the same AI-powered customer experience that was previously only available to enterprise companies with million-dollar technology budgets.
 </p>
 <p className="text-muted-foreground leading-relaxed text-body-md mt-space-4">
 A dental clinic in Lagos should have the same 24/7 Operator AI as a hospital chain. A solo lawyer in Mumbai should never miss a lead because they were in court.
 </p>
 </div>
 <div className="radius-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/65 p-space-8">
 <div className="h-10 w-10 radius-lg bg-primary/10 text-primary flex items-center justify-center mb-space-5">
 <Globe className="h-5 w-5"/>
 </div>
 <h2 className="text-title-lg text-foreground mb-space-4 font-semibold">Our Vision</h2>
 <p className="text-muted-foreground leading-relaxed text-body-md">
 A world where no service business ever loses a customer to a missed call, a slow response, or an after-hours inquiry that goes unanswered.
 </p>
 <p className="text-muted-foreground leading-relaxed text-body-md mt-space-4">
 Where Operator AI is as common and essential as a point-of-sale terminal — invisible infrastructure that powers every customer interaction, automatically, everywhere.
 </p>
 </div>
 </div>
 </div>
 </section>

 {/* Why Nexx Exists */}
 <section className="py-space-28 md:py-space-36">
 <div className="mx-auto max-w-3xl px-space-6">
 <div className="mb-space-12 text-center">
 <div className="inline-flex items-center gap-space-2 px-space-4 py-space-2 radius-full border border-primary/20 bg-primary/5 mb-space-6">
 <span className="text-caption uppercase tracking-widest text-primary font-semibold">Why We Exist</span>
 </div>
 <h2 className="text-heading-lg tracking-tight-sm text-foreground mb-space-6">
 Our Foundational Story.
 <br />
 The problem <span className="text-primary">nobody was solving.</span>
 </h2>
 </div>
 <div className="space-y-space-6 text-muted-foreground text-body-md leading-relaxed">
 <p className="text-foreground/80">
 Our founders spent years working with service businesses across India and Southeast Asia. The pattern was always the same.
 </p>
 <p>
 A dental clinic had 60 calls go to voicemail on a Monday. They had one receptionist, and she was at lunch. A competing clinic down the road answered instantly and took those patients. The dental clinic lost $8,000 in potential revenue before 2pm.
 </p>
 <p>
 A law firm was missing 40% of its web form inquiries because the associate responsible for follow-up was in depositions all week. Those leads went cold. Some hired a competitor.
 </p>
 <p>
 The tools available were either too expensive (enterprise chatbot platforms at $2,000+/month), too complex (requiring a developer to set up), or too simple (FAQ bots that couldn't book appointments or handle real conversations).
 </p>
 <p className="text-foreground/80">
 So we built Operator. A complete Operator AI platform that any business owner can deploy in 30 minutes, for the price of a part-time employee's daily rate.
 </p>
 </div>
 </div>
 </section>

 {/* Values */}
 <section className="py-space-20 border-y border-[hsl(var(--foreground)/0.06)]">
 <div className="mx-auto max-w-5xl px-space-6">
 <div className="mb-space-16 text-center">
 <div className="inline-flex items-center gap-space-2 px-space-4 py-space-2 radius-full border border-primary/20 bg-primary/5 mb-space-6">
 <span className="text-caption uppercase tracking-widest text-primary font-semibold">Our Values</span>
 </div>
 <h2 className="text-heading-lg tracking-tight-sm text-foreground">
 Core Principles.
 <br />
 What we <span className="text-primary">stand for.</span>
 </h2>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-6">
 {VALUES.map((v) => {
 const isDarkCard = v.title ==="Uncompromising Security";
 return (
 <div
 key={v.title}
 className={`radius-2xl p-space-6 transition-all duration-300 ${isDarkCard
 ?"bg-foreground text-background scale-[1.02] border-none"
 :"border border-[hsl(var(--foreground)/0.06)] bg-card/65 hover:border-primary/20"
 }`}
 >
 <h3 className={`text-body-sm font-semibold mb-space-2 ${isDarkCard ?"text-background":"text-foreground"}`}>{v.title}</h3>
 <p className={`text-body-sm leading-relaxed ${isDarkCard ?"text-background/80":"text-muted-foreground"}`}>{v.desc}</p>
 </div>
 );
 })}
 </div>
 </div>
 </section>

 {/* Timeline */}
 <section className="py-space-28 md:py-space-36">
 <div className="mx-auto max-w-3xl px-space-6">
 <div className="mb-space-16 text-center">
 <div className="inline-flex items-center gap-space-2 px-space-4 py-space-2 radius-full border border-primary/20 bg-primary/5 mb-space-6">
 <span className="text-caption uppercase tracking-widest text-primary font-semibold">Product Journey</span>
 </div>
 <h2 className="text-heading-lg tracking-tight-sm text-foreground">
 Timeline Roadmap.
 <br />
 From <span className="text-primary">insight to product.</span>
 </h2>
 </div>
 <div className="relative">
 {/* Vertical Animated Dotted Connector (Image 5 style) */}
 <div className="absolute left-space-19 top-space-2 bottom-space-2 w-1 hidden sm:block">
 <svg className="w-full h-full"preserveAspectRatio="none">
 <line x1="2"y1="0"x2="2"y2="100%"stroke="hsl(var(--primary)/0.25)"strokeWidth="2"strokeDasharray="6 4"className="animate-dash-scroll"/>
 </svg>
 </div>
 <div className="space-y-space-6">
 {TIMELINE.map((t, i) => (
 <div key={i} className="flex gap-space-6 sm:gap-space-8 items-start">
 <div className="text-right shrink-0 w-16 hidden sm:block pt-space-1">
 <p className="text-caption text-primary font-semibold font-mono leading-none mb-space-1">{t.year}</p>
 <p className="text-caption text-muted-foreground font-mono">{t.q}</p>
 </div>
 {/* Circle Indicator (Image 5 style) */}
 <div className="relative hidden sm:flex">
 <div className="h-6 w-6 radius-full border border-primary bg-card text-primary flex items-center justify-center text-caption font-semibold mt-space-1 shrink-0 z-10 font-mono">
 {i + 1}
 </div>
 </div>
 <div className="flex-1 radius-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/65 p-space-5 hover:border-primary/20 hover:scale-[1.01] transition-all">
 <div className="flex items-center gap-space-2 mb-space-2">
 <span className="text-caption uppercase tracking-wider text-primary sm:hidden font-semibold font-mono">{t.year} {t.q}</span>
 <span className="text-body-sm font-semibold text-foreground">{t.event}</span>
 </div>
 <p className="text-body-sm text-muted-foreground leading-relaxed">{t.desc}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </section>

 {/* Leadership */}
 <section className="py-space-20 border-y border-[hsl(var(--foreground)/0.06)]">
 <div className="mx-auto max-w-5xl px-space-6">
 <div className="mb-space-16 text-center">
 <div className="inline-flex items-center gap-space-2 px-space-4 py-space-2 radius-full border border-primary/20 bg-primary/5 mb-space-6">
 <span className="text-caption uppercase tracking-widest text-primary font-semibold">Leadership</span>
 </div>
 <h2 className="text-heading-lg tracking-tight-sm text-foreground">
 The Team.
 <br />
 Building the <span className="text-primary">future of Operator.</span>
 </h2>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-6">
 {TEAM.map((p) => (
 <div
 key={p.name}
 className={`radius-2xl border p-space-6 hover:border-primary/20 hover:scale-[1.02] transition-all duration-300 bg-card/65 flex flex-col justify-between ${p.isHiring ?"border-dashed border-[hsl(var(--foreground)/0.15)] bg-card/30":"border-[hsl(var(--foreground)/0.06)]"
 }`}
 >
 <div>
 <div className="h-12 w-12 radius-xl bg-primary/10 text-primary flex items-center justify-center text-body-sm mb-space-5 font-semibold">
 {p.initials}
 </div>
 <h3 className="text-body-sm font-semibold text-foreground mb-space-1">{p.name}</h3>
 <p className="text-caption text-primary mb-space-3">{p.role}</p>
 <p className="text-caption text-muted-foreground leading-relaxed">{p.bio}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* Roadmap */}
 <section className="py-space-28 md:py-space-36">
 <div className="mx-auto max-w-3xl px-space-6">
 <div className="mb-space-12 text-center">
 <div className="inline-flex items-center gap-space-2 px-space-4 py-space-2 radius-full border border-primary/20 bg-primary/5 mb-space-6">
 <span className="text-caption uppercase tracking-widest text-primary font-semibold">Roadmap</span>
 </div>
 <h2 className="text-heading-lg tracking-tight-sm text-foreground">
 Future Vision.
 <br />
 What we're <span className="text-primary">building next.</span>
 </h2>
 </div>
 <div className="radius-xl border border-[hsl(var(--foreground)/0.06)] divide-y divide-[hsl(var(--foreground)/0.06)]">
 {ROADMAP.map((r) => (
 <div key={r.item} className="flex items-center justify-between p-space-5 hover:bg-[hsl(var(--foreground)/0.02)] transition-colors">
 <div className="flex items-center gap-space-3">
 <Check className="h-4 w-4 text-primary shrink-0"/>
 <span className="text-body-sm text-foreground/80">{r.item}</span>
 </div>
 <span className={`text-caption radius-full px-space-3 py-space-1 shrink-0 ml-space-4 ${r.status ==="In Progress"?"bg-primary/10 text-primary":"bg-[hsl(var(--foreground)/0.04)] text-muted-foreground"
 }`}>
 {r.status}
 </span>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* CTA */}
 <section className="relative py-space-28 md:py-space-36 overflow-hidden border-t border-[hsl(var(--foreground)/0.06)]">
 <div className="absolute inset-space-0 dot-grid grid-fade-y pointer-events-none"/>
 <div className="relative mx-auto max-w-2xl px-space-6 text-center">
 <div className="inline-flex items-center gap-space-2 px-space-4 py-space-2 radius-full border border-primary/20 bg-primary/5 mb-space-6">
 <span className="text-caption uppercase tracking-widest text-primary font-semibold">Join Us</span>
 </div>
 <h2 className="text-heading-lg sm:text-heading-lg tracking-tight-sm text-foreground mb-space-5">
 Start Today.
 <br />
 Ready to be part of the <span className="text-primary">story?</span>
 </h2>
 <p className="text-muted-foreground text-title-lg mb-space-8">Start your Operator AI workspace today. Free for 14 days.</p>
 <div className="flex flex-col sm:flex-row gap-space-4 justify-center">
 <SessionAwareCta
 signedInText="Go to Dashboard"
 signedOutText="Start free trial"
 signedOutHref="/sign-in"
 size="lg"
 />
 <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
 <Link href="/contact">Talk to Us</Link>
 </Button>
 </div>
 </div>
 </section>
 </main>

 <MarketingFooter />
 </div>
 );
}
