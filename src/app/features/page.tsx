"use client";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Button } from "@/components/shared/button";
import { SessionAwareCta } from "@/components/marketing/session-aware-cta";
import { NativeA, NativeImg, NativeButton } from "@/components/shared/native";
import {
 ArrowRight,
 Check,
 Mic,
 MessageSquare,
 Phone,
 Calendar,
 TrendingUp,
 Brain,
 BarChart3,
 Globe,
 Shield,
 Building2,
 ChevronRight,
 Zap,
 Sparkles,
 Play,
 Pause,
 Database,
 Lock,
 Terminal,
 Activity,
 Workflow,
 Plus,
 Mail,
 UserCheck,
 CheckCircle2,
 FileText,
 Clock,
 ArrowUpRight,
 Code
} from "lucide-react";
import { InteractiveIndustryExplorer } from "@/components/marketing/visualizations/industry-explorer";
import { VoiceAiFlow } from "@/components/marketing/visualizations/voice-ai-flow";

// ─── DEVELOPER CODE SNIPPETS ──────────────────────────────────────────────────
const CODE_SNIPPETS = {
 api: `// 1. Initialize Operator Client
import { Operator } from "@operator/sdk";

const operator = new Operator({
 apiKey: process.env.OPERATOR_API_KEY
});

// 2. Trigger Custom Lead Intent Routing
const response = await operator.routes.dispatch({
 phone: "+15550199",
 intent: "lead_qualification",
 context: {
 budget: "$10k+",
 timeline: "immediate",
 source: "Google Ads"
 }
});

console.log(\`Lead routed. ID: \${response.id}\`);`,
 webhook: `{
 "event": "appointment.confirmed",
 "timestamp": "2026-07-18T14:52:00Z",
 "data": {
 "id": "apt_9k2m31a9",
 "lead": {
 "name": "Jane Doe",
 "email": "jane@example.com",
 "phone": "+15550199"
 },
 "appointment": {
 "startsAt": "2026-07-19T10:00:00Z",
 "duration": 30,
 "service": "Virtual Consultation"
 },
 "deposit": {
 "amount": 5000,
 "status": "paid",
 "stripeChargeId": "ch_3k1n29"
 }
 }
}`,
 sdk: `from operator_sdk import OperatorClient

# Instantiating client
client = OperatorClient(api_key="op_live_secret")

# Fetch active call details
call = client.calls.get("call_182a931z")

# Extract structured insights
insights = call.extract_insights(
 keys=["name", "budget_status", "preferred_date"]
)

print(f"Name: {insights.get('name')}")
print(f"Qualified: {insights.get('budget_status')}")`,
 mcp: `// Model Context Protocol (MCP) configuration
{
 "mcpServers": {
 "operator-receptionist": {
 "command": "npx",
 "args": ["-y", "@operator-ai/mcp-server"],
 "env": {
 "OPERATOR_API_KEY": "op_live_secret"
 }
 }
 }
}`
};

// ─── TOUR STEPS DATA ──────────────────────────────────────────────────────────
interface TourStep {
 title: string;
 label: string;
 desc: string;
 icon: React.ReactNode;
}

const TOUR_STEPS: TourStep[] = [
 {
 title: "Customer Calls",
 label: "Inbound Dial",
 desc: "A customer calls your number. The system hooks the audio stream instantly.",
 icon: <Phone className="h-4 w-4" />
 },
 {
 title: "Operator Answers",
 label: "AI Greeting",
 desc: "Operator AI picks up within 1 second, answering questions with natural voice.",
 icon: <Mic className="h-4 w-4" />
 },
 {
 title: "Books Appointment",
 label: "Live Scheduling",
 desc: "AI guides caller through scheduling, locking their slot on the fly.",
 icon: <Calendar className="h-4 w-4" />
 },
 {
 title: "Updates Calendar",
 label: "Calendar Lock",
 desc: "Syncs directly with Google/Outlook, preventing double bookings instantly.",
 icon: <CheckCircle2 className="h-4 w-4" />
 },
 {
 title: "Sends SMS",
 label: "Text Dispatch",
 desc: "Sends real-time reminder SMS with calendar coordinates and pre-care details.",
 icon: <MessageSquare className="h-4 w-4" />
 },
 {
 title: "Collects Deposit",
 label: "Stripe Payment",
 desc: "Collects upfront deposits securely before finalizing calendar slots.",
 icon: <Shield className="h-4 w-4" />
 },
 {
 title: "Updates CRM",
 label: "Data Ingestion",
 desc: "Ingests qualified context directly into contact records and CRM databases.",
 icon: <Database className="h-4 w-4" />
 },
 {
 title: "Sends Email",
 label: "Follow-up",
 desc: "Dispatches automated clinical or corporate intake documents.",
 icon: <Mail className="h-4 w-4" />
 }
];

export default function FeaturesPage() {
 const [activeTour, setActiveTour] = useState(0);
 const [tourPaused, setTourPaused] = useState(false);
 const [activeCodeTab, setActiveCodeTab] = useState<"api" | "webhook" | "sdk" | "mcp">("api");
 const [activeCapId, setActiveCapId] = useState<string>("voice");
 const [activeWorkflowNode, setActiveWorkflowNode] = useState<string>("trigger");

 // Tour Auto-cycle logic
 useEffect(() => {
 if (tourPaused) return;
 const interval = setInterval(() => {
 setActiveTour((prev) => (prev + 1) % TOUR_STEPS.length);
 }, 3000);
 return () => clearInterval(interval);
 }, [tourPaused]);

 return (
 <div className="relative flex flex-col min-h-screen bg-background text-foreground">
 <MarketingNav />

 <main className="flex-1 overflow-x-hidden">
 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 1: HERO
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <section className="relative overflow-hidden pt-space-28 pb-space-20 md:pt-space-32 md:pb-space-24">
<ScrollReveal stagger>

 <div className="absolute inset-space-0 dot-grid opacity-15 pointer-events-none" />
 <div className="absolute top-space-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-screen bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08),transparent_70%)] pointer-events-none" />

 <div className="relative mx-auto max-w-5xl px-space-6 flex flex-col items-center mt-space-12 text-center">
 <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
 <Sparkles className="h-3 w-3 text-primary" />
 <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Capabilities Overview</span>
 </div>

 <h1 className="text-display-lg md:text-display-xl tracking-tight leading-display text-foreground font-semibold max-w-3xl mb-space-5">
 The AI Business Operating System.
 <br />
 <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[hsl(280_75%_55%)]">
 Redefined.
 </span>
 </h1>

 <p className="mx-auto max-w-2xl text-body-md md:text-body-lg text-muted-foreground leading-relaxed mb-space-10">
 An omnipresent front desk that runs phone operations, qualifies leads, secures deposits, and coordinates calendars 24/7. Not a generic chatbot. A complete office scheduler.
 </p>

 <div className="flex flex-col sm:flex-row items-center justify-center gap-space-4 mb-space-16 w-full">
 <Button asChild variant="default" size="lg" className="w-full sm:w-auto">
 <Link href="/sign-up">
 Try Operator Free <ArrowRight className="h-4 w-4" />
 </Link>
 </Button>
 <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
 <Link href="/demo">
 Book Live Demo
 </Link>
 </Button>
 </div>

 {/* Interactive Hero Waveform Visualizer */}
 <div className="w-full max-w-4xl p-space-6 md:p-space-8 rounded-3xl border border-[hsl(var(--foreground)/0.06)] bg-card/35 backdrop-blur-md relative overflow-hidden shadow-lg">
 <div className="absolute inset-space-0 dot-grid opacity-10 pointer-events-none" />
 <div className="relative z-10">
 <VoiceAiFlow />
 </div>
 </div>
 </div>
 
</ScrollReveal>
</section>

 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 2: INTERACTIVE AI EXPERIENCE TOUR
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <section className="relative mx-auto max-w-5xl px-space-6 pb-space-24 z-10">
<ScrollReveal stagger>

 <div className="text-center mb-space-12">
 <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
 <Workflow className="h-3.5 w-3.5 text-primary" />
 <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Interactive Simulation</span>
 </div>
 <h2 className="text-heading-xl tracking-tight-md text-foreground">
 End-to-End Automation.
 <br />
 <span className="text-primary">Watch the full loop run.</span>
 </h2>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-8 items-stretch">
 {/* Left: Interactive Stepper Timeline */}
 <div className="lg:col-span-5 flex flex-col justify-between gap-space-2.5">
 <div className="flex flex-col gap-space-2.5 max-h-[380px] overflow-y-auto pr-space-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-[hsl(var(--foreground)/0.05)] [&::-webkit-scrollbar-track]:rounded-full">
 {TOUR_STEPS.map((step, idx) => {
 const isActive = activeTour === idx;
 return (
 <NativeButton
 key={step.title}
 type="button"
 onClick={() => {
 setActiveTour(idx);
 setTourPaused(true);
 }}
 className={[
 "w-full text-left relative p-space-4 border rounded-xl flex items-center gap-space-4 transition-all duration-305 cursor-pointer select-none",
 isActive
 ? "border-primary/30 bg-primary/[0.03] shadow-xs"
 : "border-[hsl(var(--foreground)/0.05)] bg-card/25 hover:border-[hsl(var(--foreground)/0.12)] hover:bg-card/45"
 ].join(" ")}
 >
 {/* Active highlight line indicator */}
 {isActive && (
 <span className="absolute left-space-0 top-1/4 bottom-1/4 w-0.5 bg-primary radius-full" />
 )}

 <div className={[
 "flex items-center justify-center h-8 w-8 radius-lg shrink-0 transition-colors duration-300",
 isActive ? "bg-primary/10 text-primary" : "bg-[hsl(var(--foreground)/0.04)] text-muted-foreground"
 ].join(" ")}>
 {step.icon}
 </div>

 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between">
 <h3 className={[
 "text-body-sm font-semibold transition-colors duration-305",
 isActive ? "text-foreground font-bold" : "text-muted-foreground"
 ].join(" ")}>
 {step.title}
 </h3>
 <span className="text-[9px] font-mono text-muted-foreground/80 tracking-wider uppercase">
 {step.label}
 </span>
 </div>
 <p className={[
 "text-caption mt-space-1 leading-relaxed transition-colors duration-305",
 isActive ? "text-muted-foreground" : "text-muted-foreground/70"
 ].join(" ")}>
 {step.desc}
 </p>
 </div>
 </NativeButton>
 );
 })}
 </div>

 {/* Pause / Play Loop button */}
 <NativeButton
 type="button"
 onClick={() => setTourPaused(!tourPaused)}
 className="mt-space-2 border border-[hsl(var(--foreground)/0.06)] bg-card/20 hover:bg-card/40 hover:border-[hsl(var(--foreground)/0.15)] text-caption py-space-2.5 px-space-4 radius-lg flex items-center justify-center gap-space-2 transition-all cursor-pointer font-semibold text-muted-foreground select-none"
 >
 {tourPaused ? (
 <>
 <Play className="h-3 w-3 text-primary shrink-0" /> Resume Auto-Simulation Loop
 </>
 ) : (
 <>
 <Pause className="h-3 w-3 text-amber-500 shrink-0" /> Pause Simulation Loop
 </>
 )}
 </NativeButton>
 </div>

 {/* Right: Premium Visualization Preview Window */}
 <div className="lg:col-span-7 rounded-[24px] border border-[hsl(var(--foreground)/0.08)] bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-space-8 flex flex-col justify-between relative overflow-hidden min-h-[420px] ring-1 ring-white/50 ">
 <div className="absolute inset-space-0 dot-grid opacity-[0.03] pointer-events-none" />
 <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[hsl(var(--foreground)/0.1)] to-transparent" />

 {/* Browser Chrome Header */}
 <div className="flex items-center justify-between border-b border-[hsl(var(--foreground)/0.06)] pb-space-4 mb-space-8 relative z-10">
 <div className="flex items-center gap-space-1.5">
 <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56] border border-[#ff5f56]/20 shadow-sm" />
 <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e] border border-[#ffbd2e]/20 shadow-sm" />
 <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f] border border-[#27c93f]/20 shadow-sm" />
 </div>
 <div className="text-[10px] font-mono tracking-widest text-muted-foreground/50 uppercase font-semibold">
 Operator AI Agent Sandbox
 </div>
 <div className="w-10" />
 </div>

 {/* Live Sandbox Content area */}
 <div className="flex-1 flex flex-col justify-center relative z-10">
 {activeTour === 0 && (
 <div className="space-y-space-4 text-center max-w-sm mx-auto py-space-6">
 <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary animate-bounce">
 <Phone className="h-7 w-7" />
 </div>
 <div className="space-y-space-1.5">
 <p className="text-body-sm font-semibold text-foreground">Inbound Telephone Triage</p>
 <p className="text-caption font-mono text-emerald-500 font-bold tracking-wider animate-pulse">
 +1 (555) 019-2834 RINGING...
 </p>
 <p className="text-caption text-muted-foreground max-w-xs mx-auto leading-relaxed">
 Incoming customer call captured on main clinic line. Initializing semantic SIP gateway stream.
 </p>
 </div>
 </div>
 )}

 {activeTour === 1 && (
 <div className="space-y-space-3.5 max-w-md mx-auto w-full py-space-4">
 <div className="flex items-center gap-space-2.5">
 <div className="h-6 w-6 rounded-lg bg-[hsl(var(--foreground)/0.06)] flex items-center justify-center text-muted-foreground">
 <Phone className="h-3 w-3" />
 </div>
 <span className="text-[10px] font-mono text-muted-foreground/60 font-medium">Customer (Voice)</span>
 </div>
 <div className="bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.06)] p-space-3.5 radius-xl text-caption leading-relaxed text-foreground">
 "Hi! I chipped my front tooth eating lunch, do you have any emergency availability tomorrow morning?"
 </div>

 <div className="flex items-center gap-space-2.5 mt-space-2 justify-end">
 <span className="text-[10px] font-mono text-primary font-semibold">Operator AI (Greeting)</span>
 <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
 <Mic className="h-3 w-3 animate-pulse" />
 </div>
 </div>
 <div className="bg-gradient-to-br from-primary to-[hsl(280_75%_55%)] text-white p-space-3.5 radius-xl radius-tr-none text-caption leading-relaxed">
 "Oh, I'm sorry to hear that. A chipped tooth can be very uncomfortable. Yes, we prioritize emergency cases. Let me scan our doctor's schedule for tomorrow morning."
 </div>
 </div>
 )}

 {activeTour === 2 && (
 <div className="space-y-space-3.5 max-w-sm mx-auto w-full text-center py-space-6">
 <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
 <Calendar className="h-7 w-7 animate-pulse" />
 </div>
 <div className="space-y-space-2">
 <p className="text-body-sm font-semibold text-foreground">Active Slot Matcher</p>
 <div className="inline-flex gap-space-2 items-center justify-center bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.06)] p-space-2.5 radius-lg">
 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
 <span className="text-caption font-mono text-foreground font-bold">Matching: Tomorrow at 10:00 AM</span>
 </div>
 <p className="text-caption text-muted-foreground leading-relaxed">
 Triage logic identifies the chipped tooth as urgent and searches calendar parameters for available emergency slots.
 </p>
 </div>
 </div>
 )}

 {activeTour === 3 && (
 <div className="bg-card border border-[hsl(var(--foreground)/0.06)] p-space-5 radius-xl max-w-md mx-auto w-full">
 <div className="flex items-center justify-between border-b border-[hsl(var(--foreground)/0.05)] pb-space-3 mb-space-3">
 <span className="text-caption font-bold text-foreground">Google Calendar Matrix</span>
 <span className="text-[9px] uppercase font-mono tracking-widest text-emerald-500 bg-emerald-500/10 px-space-2 py-space-0.5 rounded-full font-bold">Confirmed</span>
 </div>
 <div className="space-y-space-2.5 font-mono text-[11px]">
 <div className="flex justify-between border-b border-[hsl(var(--foreground)/0.03)] pb-space-2">
 <span className="text-muted-foreground">Appointment:</span>
 <span className="text-foreground font-semibold">Emergency Cleaning & Review</span>
 </div>
 <div className="flex justify-between border-b border-[hsl(var(--foreground)/0.03)] pb-space-2">
 <span className="text-muted-foreground">Doctor Chair:</span>
 <span className="text-foreground font-semibold">Chair #2 (Dr. Mitchell)</span>
 </div>
 <div className="flex justify-between">
 <span className="text-muted-foreground">Time Locked:</span>
 <span className="text-foreground font-semibold">Tomorrow, 10:00 AM - 10:45 AM</span>
 </div>
 </div>
 </div>
 )}

 {activeTour === 4 && (
 <div className="max-w-xs mx-auto border border-border-muted bg-card/60 p-space-4.5 radius-2xl relative shadow-md">
 <div className="flex items-center gap-space-2 mb-space-3">
 <div className="h-6 w-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500">
 <MessageSquare className="h-3.5 w-3.5" />
 </div>
 <span className="text-[10px] font-mono text-muted-foreground">Immediate SMS Alert</span>
 </div>
 <p className="text-body-sm font-semibold text-foreground mb-space-1">SMS Confirmed</p>
 <p className="text-caption text-muted-foreground leading-relaxed bg-[hsl(var(--foreground)/0.02)] p-space-3 rounded-lg border border-[hsl(var(--foreground)/0.04)] font-mono">
 "Bright Smile: Your chipped tooth cleaning with Dr. Mitchell is confirmed for tomorrow at 10:00 AM. Click here to confirm insurance copy details: link.operator.ai/c/283"
 </p>
 </div>
 )}

 {activeTour === 5 && (
 <div className="bg-card border border-[hsl(var(--foreground)/0.06)] p-space-5 radius-xl max-w-sm mx-auto w-full">
 <div className="flex items-center justify-between border-b border-[hsl(var(--foreground)/0.05)] pb-space-3 mb-space-4">
 <span className="text-caption font-bold text-foreground font-mono">Stripe Checkout Gate</span>
 <span className="text-[9px] uppercase font-mono tracking-widest text-primary bg-primary/10 px-space-2 py-space-0.5 rounded-full font-bold">Verified</span>
 </div>
 <div className="space-y-space-4">
 <div className="flex justify-between items-center">
 <div>
 <p className="text-caption font-semibold text-foreground">Emergency Retainer Fee</p>
 <p className="text-[10px] text-muted-foreground">Bright Smile Dental</p>
 </div>
 <p className="text-body-sm font-mono text-foreground font-bold">$50.00</p>
 </div>
 <div className="bg-[hsl(var(--foreground)/0.02)] p-space-3 border border-[hsl(var(--foreground)/0.04)] radius-lg flex items-center justify-between text-[11px] font-mono">
 <span className="text-muted-foreground">Card Authorized:</span>
 <span className="text-foreground">Visa Ending in 4242</span>
 </div>
 <div className="text-center text-caption text-emerald-500 font-bold bg-emerald-500/10 py-space-1.5 radius-lg border border-emerald-500/20 font-mono">
 ✓ SECURE PAYMENT AUTHORIZED
 </div>
 </div>
 </div>
 )}

 {activeTour === 6 && (
 <div className="bg-card border border-[hsl(var(--foreground)/0.06)] p-space-5 radius-xl max-w-md mx-auto w-full">
 <div className="flex items-center gap-space-2.5 border-b border-[hsl(var(--foreground)/0.05)] pb-space-3 mb-space-4">
 <div className="h-6 w-6 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-500">
 <Database className="h-3.5 w-3.5" />
 </div>
 <span className="text-caption font-bold text-foreground">Practice Management CRM</span>
 </div>
 <div className="space-y-space-3 text-[11px] font-mono">
 <div className="grid grid-cols-3 border-b border-[hsl(var(--foreground)/0.03)] pb-space-2">
 <span className="text-muted-foreground">Patient:</span>
 <span className="col-span-2 text-foreground font-semibold text-right">John Doe (New Lead)</span>
 </div>
 <div className="grid grid-cols-3 border-b border-[hsl(var(--foreground)/0.03)] pb-space-2">
 <span className="text-muted-foreground">Phone:</span>
 <span className="col-span-2 text-foreground font-semibold text-right">+1 (555) 019-2834</span>
 </div>
 <div className="grid grid-cols-3 border-b border-[hsl(var(--foreground)/0.03)] pb-space-2">
 <span className="text-muted-foreground">Triage Tag:</span>
 <span className="col-span-2 text-red-500 font-semibold text-right">[Emergency chipped_tooth]</span>
 </div>
 <div className="grid grid-cols-3">
 <span className="text-muted-foreground">Retainer:</span>
 <span className="col-span-2 text-emerald-500 font-semibold text-right">$50.00 Paid (Stripe)</span>
 </div>
 </div>
 </div>
 )}

 {activeTour === 7 && (
 <div className="bg-card border border-[hsl(var(--foreground)/0.06)] p-space-5 radius-xl max-w-md mx-auto w-full">
 <div className="flex items-center justify-between border-b border-[hsl(var(--foreground)/0.05)] pb-space-3 mb-space-3">
 <span className="text-caption font-bold text-foreground font-mono">Mail Client Sandbox</span>
 <span className="text-[10px] text-muted-foreground/60 font-mono">10:01 PM</span>
 </div>
 <div className="space-y-space-2 text-[11px] font-mono">
 <p className="border-b border-[hsl(var(--foreground)/0.03)] pb-space-2 text-muted-foreground">
 To: <span className="text-foreground">john.doe@gmail.com</span>
 </p>
 <p className="border-b border-[hsl(var(--foreground)/0.03)] pb-space-2 text-muted-foreground">
 Subject: <span className="text-foreground font-semibold">Appointment Details & Clinical Forms</span>
 </p>
 <p className="text-muted-foreground leading-relaxed pt-space-1.5">
 Please review the emergency appointment details and fill out the attached HIPAA medical intake forms before your visit tomorrow morning.
 </p>
 </div>
 </div>
 )}
 </div>

 {/* Status bar info */}
 <div className="border-t border-[hsl(var(--foreground)/0.05)] pt-space-3 text-caption text-muted-foreground flex items-center justify-between relative z-10">
 <span>Visual Sandbox Auto-simulation</span>
 <span className="flex items-center gap-space-1 text-primary">
 <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Sandbox Online
 </span>
 </div>
 </div>
 </div>
 
</ScrollReveal>
</section>

 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 3: CORE CAPABILITIES GRID
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <section className="mx-auto max-w-5xl px-space-6 pb-space-24 z-10 relative">
<ScrollReveal stagger>

 <div className="text-center mb-space-16">
 <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
 <Activity className="h-3.5 w-3.5 text-primary" />
 <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Full Toolkit</span>
 </div>
 <h2 className="text-heading-xl tracking-tight-md text-foreground">
 Built for Action.
 <br />
 <span className="text-primary">Not just simple answering.</span>
 </h2>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-12 gap-space-6">
 {/* Core Capability 1: Voice AI (Column Span 7) */}
 <div className="md:col-span-7 rounded-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/35 p-space-6 flex flex-col justify-between hover:scale-[1.01] hover:border-primary/20 transition-all duration-300">
 <div>
 <div className="h-8 flex items-center justify-start mb-space-4">
 <Mic className="h-6 w-6 text-primary" />
 </div>
 <h3 className="text-title-md font-bold text-foreground mb-space-2">Operator Voice AI</h3>
 <p className="text-caption text-muted-foreground leading-relaxed mb-space-6">
 Answer inbound calls instantly on your number. Handles complex customer queries, verifies limits, and books appointments automatically using natural conversation.
 </p>
 </div>

 {/* Sub-Visualizer */}
 <div className="bg-[hsl(var(--foreground)/0.02)] border border-[hsl(var(--foreground)/0.04)] p-space-4.5 radius-xl">
 <div className="flex items-center justify-between mb-space-2.5">
 <span className="text-[10px] font-mono text-muted-foreground uppercase">Response Latency</span>
 <span className="text-caption font-mono text-emerald-500 font-bold">&lt; 900ms</span>
 </div>
 <div className="h-1.5 w-full bg-[hsl(var(--foreground)/0.05)] radius-full overflow-hidden">
 <div className="h-full w-4/5 bg-gradient-to-r from-primary to-[hsl(280_75%_55%)] radius-full" />
 </div>
 </div>
 </div>

 {/* Core Capability 2: Omnichannel (Column Span 5) */}
 <div className="md:col-span-5 rounded-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/35 p-space-6 flex flex-col justify-between hover:scale-[1.01] hover:border-primary/20 transition-all duration-300">
 <div>
 <div className="h-8 flex items-center justify-start mb-space-4">
 <MessageSquare className="h-6 w-6 text-indigo-500" />
 </div>
 <h3 className="text-title-md font-bold text-foreground mb-space-2">Omnichannel Care</h3>
 <p className="text-caption text-muted-foreground leading-relaxed mb-space-6">
 Maintain context continuity across WhatsApp, SMS, Web Chat, Instagram DM, and Facebook Messenger from a single unified AI brain.
 </p>
 </div>

 <div className="flex gap-space-1.5">
 {["WhatsApp", "Web", "SMS", "Instagram"].map((chan) => (
 <span key={chan} className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-space-2.5 py-space-1 rounded-full font-semibold font-mono">
 {chan}
 </span>
 ))}
 </div>
 </div>

 {/* Core Capability 3: Booking (Column Span 5) */}
 <div className="md:col-span-5 rounded-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/35 p-space-6 flex flex-col justify-between hover:scale-[1.01] hover:border-primary/20 transition-all duration-300">
 <div>
 <div className="h-8 flex items-center justify-start mb-space-4">
 <Calendar className="h-6 w-6 text-emerald-500" />
 </div>
 <h3 className="text-title-md font-bold text-foreground mb-space-2">Calendar Synchronization</h3>
 <p className="text-caption text-muted-foreground leading-relaxed mb-space-6">
 Scan availability, respect custom buffer slots, map multi-staff rosters, and lock schedules dynamically in Google Calendar and Microsoft Outlook.
 </p>
 </div>

 <div className="bg-[hsl(var(--foreground)/0.02)] p-space-3.5 border border-[hsl(var(--foreground)/0.04)] radius-xl flex items-center justify-between text-caption font-mono">
 <span className="text-muted-foreground">Collision check status:</span>
 <span className="text-emerald-500 font-bold">100% Conflict-Free</span>
 </div>
 </div>

 {/* Core Capability 4: Qualification (Column Span 7) */}
 <div className="md:col-span-7 rounded-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/35 p-space-6 flex flex-col justify-between hover:scale-[1.01] hover:border-primary/20 transition-all duration-300">
 <div>
 <div className="h-8 flex items-center justify-start mb-space-4">
 <UserCheck className="h-6 w-6 text-primary" />
 </div>
 <h3 className="text-title-md font-bold text-foreground mb-space-2">Lead Qualification Engine</h3>
 <p className="text-caption text-muted-foreground leading-relaxed mb-space-6">
 Filter prospects based on custom questionnaire parameters, copay values, and target budgets. Automatically escalate high-priority leads and reject cold queries.
 </p>
 </div>

 <div className="bg-[hsl(var(--foreground)/0.02)] border border-[hsl(var(--foreground)/0.04)] p-space-4.5 radius-xl flex items-center gap-space-4">
 <div className="text-center flex-1">
 <p className="text-body-sm font-bold text-foreground font-mono">85%</p>
 <p className="text-[10px] text-muted-foreground uppercase mt-space-1">Intake score</p>
 </div>
 <div className="w-[1px] h-8 bg-[hsl(var(--foreground)/0.06)]" />
 <div className="text-center flex-1">
 <p className="text-body-sm font-bold text-emerald-500 font-mono">3.5x</p>
 <p className="text-[10px] text-muted-foreground uppercase mt-space-1">Conversions</p>
 </div>
 </div>
 </div>

 {/* Core Capability 5: Knowledge (Column Span 6) */}
 <div className="md:col-span-6 rounded-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/35 p-space-6 flex flex-col justify-between hover:scale-[1.01] hover:border-primary/20 transition-all duration-300">
 <div>
 <div className="h-8 flex items-center justify-start mb-space-4">
 <Database className="h-6 w-6 text-amber-500" />
 </div>
 <h3 className="text-title-md font-bold text-foreground mb-space-2">Business Knowledge Base</h3>
 <p className="text-caption text-muted-foreground leading-relaxed mb-space-6">
 Ingest PDF files, FAQ lists, pricing sheets, or crawl websites. AI resolves customer questions with absolute accuracy, quoting local reference citations.
 </p>
 </div>

 <div className="bg-amber-500/5 border border-amber-500/20 p-space-3.5 radius-xl text-caption text-amber-400 font-mono text-center">
 ✓ Vector RAG Sync Complete
 </div>
 </div>

 {/* Core Capability 6: Analytics (Column Span 6) */}
 <div className="md:col-span-6 rounded-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/35 p-space-6 flex flex-col justify-between hover:scale-[1.01] hover:border-primary/20 transition-all duration-300">
 <div>
 <div className="h-8 flex items-center justify-start mb-space-4">
 <BarChart3 className="h-6 w-6 text-emerald-500" />
 </div>
 <h3 className="text-title-md font-bold text-foreground mb-space-2">Conversation Analytics</h3>
 <p className="text-caption text-muted-foreground leading-relaxed mb-space-6">
 Track conversation volume, booking rates, average call duration, user sentiment scoring, and attribution funnels inside a central dashboard.
 </p>
 </div>

 <div className="bg-emerald-500/5 border border-emerald-500/20 p-space-3.5 radius-xl text-caption text-emerald-400 font-mono text-center">
 ✓ 50+ KPI Metrics Monitored Daily
 </div>
 </div>
 </div>
 
</ScrollReveal>
</section>

 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 4: AI WORKFLOW SHOWCASE
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <section className="mx-auto max-w-5xl px-space-6 pb-space-24 z-10 relative">
<ScrollReveal stagger>

 <div className="text-center mb-space-12">
 <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
 <Workflow className="h-3.5 w-3.5 text-primary" />
 <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Workflow Architect</span>
 </div>
 <h2 className="text-heading-xl tracking-tight-md text-foreground">
 Automate Trigger Sequences.
 <br />
 <span className="text-primary">Customize AI actions instantly.</span>
 </h2>
 </div>

 <div className="relative rounded-3xl border border-[hsl(var(--foreground)/0.06)] bg-card/15 p-space-6 md:p-space-10 overflow-hidden">
 <div className="absolute inset-space-0 dot-grid opacity-15" />

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-8 items-center relative z-10">
 {/* Left: Workflow Builder Node Switcher */}
 <div className="lg:col-span-5 space-y-space-3">
 <NativeButton
 type="button"
 onClick={() => setActiveWorkflowNode("trigger")}
 className={[
 "w-full text-left p-space-4 border rounded-xl flex items-start gap-space-3.5 transition-all cursor-pointer select-none",
 activeWorkflowNode === "trigger"
 ? "border-primary bg-primary/5 shadow-xs"
 : "border-[hsl(var(--foreground)/0.05)] bg-card/35 hover:border-[hsl(var(--foreground)/0.12)]"
 ].join(" ")}
 >
 <span className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-space-0.5 font-bold">1</span>
 <div>
 <h4 className="text-body-sm font-semibold text-foreground">Inbound Trigger Hook</h4>
 <p className="text-caption text-muted-foreground mt-space-1 leading-relaxed">
 Matches call context, checks active location routing pipelines.
 </p>
 </div>
 </NativeButton>

 <NativeButton
 type="button"
 onClick={() => setActiveWorkflowNode("reasoning")}
 className={[
 "w-full text-left p-space-4 border rounded-xl flex items-start gap-space-3.5 transition-all cursor-pointer select-none",
 activeWorkflowNode === "reasoning"
 ? "border-indigo-500 bg-indigo-500/5 shadow-xs"
 : "border-[hsl(var(--foreground)/0.05)] bg-card/35 hover:border-[hsl(var(--foreground)/0.12)]"
 ].join(" ")}
 >
 <span className="h-6 w-6 rounded bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 mt-space-0.5 font-bold">2</span>
 <div>
 <h4 className="text-body-sm font-semibold text-foreground">Semantic AI Evaluator</h4>
 <p className="text-caption text-muted-foreground mt-space-1 leading-relaxed">
 Triages intent vectors, crawls knowledge databases for relevant facts.
 </p>
 </div>
 </NativeButton>

 <NativeButton
 type="button"
 onClick={() => setActiveWorkflowNode("action")}
 className={[
 "w-full text-left p-space-4 border rounded-xl flex items-start gap-space-3.5 transition-all cursor-pointer select-none",
 activeWorkflowNode === "action"
 ? "border-emerald-500 bg-emerald-500/5 shadow-xs"
 : "border-[hsl(var(--foreground)/0.05)] bg-card/35 hover:border-[hsl(var(--foreground)/0.12)]"
 ].join(" ")}
 >
 <span className="h-6 w-6 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-space-0.5 font-bold">3</span>
 <div>
 <h4 className="text-body-sm font-semibold text-foreground">Integration Dispatch</h4>
 <p className="text-caption text-muted-foreground mt-space-1 leading-relaxed">
 Updates Google Calendars, dispatches confirmations, pushes lead cards to CRM.
 </p>
 </div>
 </NativeButton>
 </div>

 {/* Right: Visual Pipeline Sandbox */}
 <div className="lg:col-span-7 bg-card border border-[hsl(var(--foreground)/0.08)] radius-2xl p-space-8 min-h-[320px] flex flex-col justify-between relative overflow-hidden group shadow-xl">
 {/* Background Textures */}
 <div className="absolute inset-space-0 dot-grid opacity-[0.03] pointer-events-none" />
 <div className="absolute inset-space-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
 
 {/* Header */}
 <div className="flex items-center justify-between border-b border-[hsl(var(--foreground)/0.08)] pb-space-4 mb-space-6 relative z-10">
 <div className="flex items-center gap-space-2">
 <div className="flex items-center gap-space-1.5 mr-space-4">
 <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56] border border-[#ff5f56]/20" />
 <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e] border border-[#ffbd2e]/20" />
 <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f] border border-[#27c93f]/20" />
 </div>
 <span className="text-[11px] font-mono tracking-widest text-muted-foreground/60 uppercase flex items-center gap-space-2">
 <Terminal className="h-3 w-3" />
 Live Sandbox Pipeline Flow
 </span>
 </div>
 <div className="flex items-center gap-space-2">
 <span className="relative flex h-2 w-2">
 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
 <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
 </span>
 <span className="text-[11px] font-mono tracking-widest text-primary uppercase">
 Active: Step 0{activeWorkflowNode === "trigger" ? "1" : activeWorkflowNode === "reasoning" ? "2" : "3"}
 </span>
 </div>
 </div>

 <div className="flex-1 flex flex-col justify-center relative z-10 w-full max-w-lg mx-auto">
 {activeWorkflowNode === "trigger" && (
 <div className="space-y-space-6 text-center animate-in fade-in zoom-in-95 duration-500">
 <div className="inline-flex items-center justify-center p-space-0.5 rounded-xl bg-gradient-to-b from-primary/30 to-primary/5 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.15)]">
 <div className="px-space-5 py-space-3 bg-background rounded-[10px] border border-primary/20 flex items-center gap-space-3 font-mono">
 <Activity className="h-4 w-4 text-primary animate-pulse" />
 <span className="text-primary font-semibold tracking-wide">Trigger: Inbound_Call</span>
 </div>
 </div>
 <p className="text-body-sm text-muted-foreground leading-relaxed">
 Phone call received. Resolving carrier routing metadata. Routing to Dental Clinic assistant.
 </p>
 <div className="flex items-center justify-center gap-space-4 pt-space-2">
 <div className="px-space-3 py-space-1.5 rounded-md bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.05)] flex items-center gap-space-2">
 <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">Protocol</span>
 <span className="text-[11px] font-mono text-muted-foreground">SIP/WebRTC</span>
 </div>
 <div className="px-space-3 py-space-1.5 rounded-md bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.05)] flex items-center gap-space-2">
 <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">Latency</span>
 <span className="text-[11px] font-mono text-emerald-500">12ms</span>
 </div>
 </div>
 </div>
 )}

 {activeWorkflowNode === "reasoning" && (
 <div className="space-y-space-6 text-center animate-in fade-in zoom-in-95 duration-500">
 <div className="inline-flex items-center justify-center p-space-0.5 rounded-xl bg-gradient-to-b from-indigo-500/30 to-indigo-500/5 shadow-[0_0_30px_-5px_rgba(99,102,241,0.15)]">
 <div className="px-space-5 py-space-3 bg-background rounded-[10px] border border-indigo-500/20 flex items-center gap-space-3 font-mono">
 <Brain className="h-4 w-4 text-indigo-500 animate-pulse" />
 <span className="text-indigo-500 font-semibold tracking-wide">Reasoning: Intent_Matcher</span>
 </div>
 </div>
 <p className="text-body-sm text-muted-foreground leading-relaxed">
 Caller query matches <span className="text-indigo-500 font-medium">"schedule_appointment"</span>. Extraction context: Emergency chip tooth clean tomorrow morning.
 </p>
 <div className="flex items-center justify-center gap-space-4 pt-space-2">
 <div className="px-space-3 py-space-1.5 rounded-md bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.05)] flex items-center gap-space-2">
 <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">Confidence</span>
 <span className="text-[11px] font-mono text-indigo-500">99.8%</span>
 </div>
 <div className="px-space-3 py-space-1.5 rounded-md bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.05)] flex items-center gap-space-2">
 <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">Vector</span>
 <span className="text-[11px] font-mono text-muted-foreground">0x8F2...A1B</span>
 </div>
 </div>
 </div>
 )}

 {activeWorkflowNode === "action" && (
 <div className="space-y-space-6 text-center animate-in fade-in zoom-in-95 duration-500">
 <div className="inline-flex items-center justify-center p-space-0.5 rounded-xl bg-gradient-to-b from-emerald-500/30 to-emerald-500/5 shadow-[0_0_30px_-5px_rgba(16,185,129,0.15)]">
 <div className="px-space-5 py-space-3 bg-background rounded-[10px] border border-emerald-500/20 flex items-center gap-space-3 font-mono">
 <Calendar className="h-4 w-4 text-emerald-500 animate-pulse" />
 <span className="text-emerald-500 font-semibold tracking-wide">Action: Google_Calendar_Lock</span>
 </div>
 </div>
 <p className="text-body-sm text-muted-foreground leading-relaxed">
 Calendar block locked for Dr. Mitchell tomorrow at 10:00 AM. Confirmation SMS dispatched. Lead record populated.
 </p>
 <div className="flex items-center justify-center gap-space-4 pt-space-2">
 <div className="px-space-3 py-space-1.5 rounded-md bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.05)] flex items-center gap-space-2">
 <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">Auth</span>
 <span className="text-[11px] font-mono text-emerald-500">OAUTH2_VALID</span>
 </div>
 <div className="px-space-3 py-space-1.5 rounded-md bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.05)] flex items-center gap-space-2">
 <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">Sync</span>
 <span className="text-[11px] font-mono text-emerald-500">SUCCESS</span>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* Footer status */}
 <div className="mt-space-8 pt-space-4 border-t border-[hsl(var(--foreground)/0.08)] flex items-center justify-between relative z-10">
 <div className="flex items-center gap-space-3">
 <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
 <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">State Parameters Verified</span>
 </div>
 <div className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest flex items-center gap-space-2">
 <Zap className="h-3 w-3 text-amber-500" />
 Live Feedback Loop
 </div>
 </div>
 </div>
 </div>
 </div>
 
</ScrollReveal>
</section>

 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 5: INDUSTRY SOLUTIONS
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <section className="mx-auto max-w-5xl px-space-6 pb-space-24 z-10 relative">
<ScrollReveal stagger>

 <div className="text-center mb-space-12">
 <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
 <Building2 className="h-3.5 w-3.5 text-primary" />
 <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Tailored Agents</span>
 </div>
 <h2 className="text-heading-xl tracking-tight-md text-foreground">
 Industry Verticals.
 <br />
 <span className="text-primary">Tailored automation rules.</span>
 </h2>
 </div>

 {/* Renders the pre-existing InteractiveIndustryExplorer component */}
 <InteractiveIndustryExplorer />
 
</ScrollReveal>
</section>

 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 6: AUTOMATION TIMELINE
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <section className="mx-auto max-w-5xl px-space-6 pb-space-24 z-10 relative">
<ScrollReveal stagger>

 <div className="text-center mb-space-16">
 <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
 <Clock className="h-3.5 w-3.5 text-primary" />
 <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Processing Pipeline</span>
 </div>
 <h2 className="text-heading-xl tracking-tight-md text-foreground">
 Voice Triage Pipeline.
 <br />
 <span className="text-primary">Latency metrics breakdown.</span>
 </h2>
 </div>

 <div className="relative border-l border-[hsl(var(--foreground)/0.06)] pl-space-6 md:pl-space-8 space-y-space-8 max-w-3xl mx-auto">
 {/* Timeline Item 1 */}
 <div className="relative">
 <span className="absolute -left-[30px] md:-left-[38px] top-space-0.5 h-4.5 w-4.5 rounded-full bg-primary border-4 border-background" />
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-2">
 <h4 className="text-body-sm font-semibold text-foreground">1. Audio SIP Stream Ingestion</h4>
 <span className="text-caption font-mono text-primary font-semibold">&lt; 80ms</span>
 </div>
 <p className="text-caption text-muted-foreground mt-space-1.5 leading-relaxed">
 Connects call audio bridge directly to Operator AI cores with high-fidelity duplex transmission pathways.
 </p>
 </div>

 {/* Timeline Item 2 */}
 <div className="relative">
 <span className="absolute -left-[30px] md:-left-[38px] top-space-0.5 h-4.5 w-4.5 rounded-full bg-primary/60 border-4 border-background" />
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-2">
 <h4 className="text-body-sm font-semibold text-foreground">2. Speech Recognition & Transcription</h4>
 <span className="text-caption font-mono text-primary font-semibold">&lt; 120ms</span>
 </div>
 <p className="text-caption text-muted-foreground mt-space-1.5 leading-relaxed">
 Converts spoken audio frequencies into clean text, filters background static, and parses semantic breaks.
 </p>
 </div>

 {/* Timeline Item 3 */}
 <div className="relative">
 <span className="absolute -left-[30px] md:-left-[38px] top-space-0.5 h-4.5 w-4.5 rounded-full bg-indigo-500 border-4 border-background" />
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-2">
 <h4 className="text-body-sm font-semibold text-foreground">3. Triage Reasoning Core</h4>
 <span className="text-caption font-mono text-indigo-400 font-semibold">&lt; 250ms</span>
 </div>
 <p className="text-caption text-muted-foreground mt-space-1.5 leading-relaxed">
 Evaluates caller intent, ranks booking priority, checks active knowledge sheets, and verifies parameters.
 </p>
 </div>

 {/* Timeline Item 4 */}
 <div className="relative">
 <span className="absolute -left-[30px] md:-left-[38px] top-space-0.5 h-4.5 w-4.5 rounded-full bg-emerald-500 border-4 border-background" />
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-2">
 <h4 className="text-body-sm font-semibold text-foreground">4. Calendar Synced Lock</h4>
 <span className="text-caption font-mono text-emerald-400 font-semibold">&lt; 350ms</span>
 </div>
 <p className="text-caption text-muted-foreground mt-space-1.5 leading-relaxed">
 Queries scheduling systems (Google Calendar, Outlook, EHR grids) and confirms the reserved slot block.
 </p>
 </div>
 </div>
 
</ScrollReveal>
</section>



 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 8: ENTERPRISE FEATURES
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <section className="mx-auto max-w-5xl px-space-6 pb-space-24 z-10 relative">
<ScrollReveal stagger>

 <div className="text-center mb-space-16">
 <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
 <Building2 className="h-3.5 w-3.5 text-primary" />
 <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Scaling Systems</span>
 </div>
 <h2 className="text-heading-xl tracking-tight-md text-foreground">
 Enterprise & White Label.
 <br />
 <span className="text-primary">Built for scale.</span>
 </h2>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-space-6">
 {/* Multi-Location Card */}
 <div className="rounded-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/35 p-space-6 flex flex-col justify-between hover:scale-[1.01] hover:border-primary/20 transition-all duration-300">
 <div>
 <h3 className="text-title-md font-bold text-foreground mb-space-2">Multi-Location Platform</h3>
 <p className="text-caption text-muted-foreground leading-relaxed mb-space-6">
 Manage multiple franchise branches or clinical locations under one login directory. Map location-specific phone channels, sync calendars per chair, and set distinct regional FAQs.
 </p>
 </div>

 <div className="border-t border-[hsl(var(--foreground)/0.05)] pt-space-4 mt-space-2 flex items-center justify-between text-caption font-mono">
 <span className="text-muted-foreground">Management Panel:</span>
 <span className="text-primary font-bold">Centralized Dashboard</span>
 </div>
 </div>

 {/* White-Label Card */}
 <div className="rounded-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/35 p-space-6 flex flex-col justify-between hover:scale-[1.01] hover:border-primary/20 transition-all duration-300">
 <div>
 <h3 className="text-title-md font-bold text-foreground mb-space-2">Agency & White Label</h3>
 <p className="text-caption text-muted-foreground leading-relaxed mb-space-6">
 Resell Operator AI workspaces under your own brand identity. Configure custom domains, set custom client pricing structures, manage reseller invoicing pipelines, and customize dashboards.
 </p>
 </div>

 <div className="border-t border-[hsl(var(--foreground)/0.05)] pt-space-4 mt-space-2 flex items-center justify-between text-caption font-mono">
 <span className="text-muted-foreground">Client Interface:</span>
 <span className="text-primary font-bold">Fully Rebranded Panel</span>
 </div>
 </div>
 </div>
 
</ScrollReveal>
</section>

 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 9: SECURITY & COMPLIANCE
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <section className="mx-auto max-w-5xl px-space-6 pb-space-24 z-10 relative">
<ScrollReveal stagger>

 <div className="text-center mb-space-16">
 <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
 <Shield className="h-3.5 w-3.5 text-primary" />
 <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Compliance Safe</span>
 </div>
 <h2 className="text-heading-xl tracking-tight-md text-foreground">
 Security & Compliance.
 <br />
 <span className="text-primary">HIPAA ready. SOC2 compliant.</span>
 </h2>
 </div>

 <div className="rounded-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/15 p-space-6 md:p-space-8 overflow-hidden max-w-3xl mx-auto relative">
 <div className="absolute inset-space-0 dot-grid opacity-10 pointer-events-none" />

 <div className="grid grid-cols-1 md:grid-cols-2 gap-space-6 relative z-10">
 <div className="space-y-space-4">
 <div className="flex items-center gap-space-2">
 <Lock className="h-4 w-4 text-emerald-500" />
 <h4 className="text-body-sm font-semibold text-foreground">HIPAA Compliant (Medical)</h4>
 </div>
 <p className="text-caption text-muted-foreground leading-relaxed">
 Encryption at rest and in transit covers patient intake forms, EHR sync, and voice transcript files, protecting sensitive health data under full compliance rules.
 </p>
 </div>

 <div className="space-y-space-4">
 <div className="flex items-center gap-space-2">
 <Shield className="h-4 w-4 text-indigo-500" />
 <h4 className="text-body-sm font-semibold text-foreground">SOC2 Type II & GDPR Ready</h4>
 </div>
 <p className="text-caption text-muted-foreground leading-relaxed">
 Tenant data isolation, role-based access controllers (RBAC), and admin audit logging frameworks maintain enterprise security guidelines.
 </p>
 </div>
 </div>
 </div>
 
</ScrollReveal>
</section>

 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 10: DEVELOPER PLATFORM
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <section className="mx-auto max-w-5xl px-space-6 pb-space-24 z-10 relative">
<ScrollReveal stagger>

 <div className="text-center mb-space-12">
 <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
 <Code className="h-3.5 w-3.5 text-primary" />
 <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Developer APIs</span>
 </div>
 <h2 className="text-heading-xl tracking-tight-md text-foreground">
 Developer Platform.
 <br />
 <span className="text-primary">Integrate with 1 line of code.</span>
 </h2>
 </div>

 <div className="rounded-2xl border border-[hsl(var(--foreground)/0.06)] bg-card overflow-hidden">
 {/* Developer tabs header */}
 <div className="bg-[hsl(var(--foreground)/0.015)] border-b border-[hsl(var(--foreground)/0.05)] px-space-4 py-space-3 flex items-center justify-between flex-wrap gap-space-2">
 <div className="flex gap-space-1">
 {(["api", "webhook", "sdk", "mcp"] as const).map((tab) => (
 <NativeButton
 key={tab}
 type="button"
 onClick={() => setActiveCodeTab(tab)}
 className={[
 "px-space-3 py-space-1.5 text-caption font-semibold rounded-lg select-none cursor-pointer transition-colors duration-200",
 activeCodeTab === tab
 ? "bg-[#0A0E17] text-background"
 : "text-muted-foreground hover:text-foreground"
 ].join(" ")}
 >
 {tab.toUpperCase()}
 </NativeButton>
 ))}
 </div>

 <span className="text-caption font-mono text-muted-foreground/40 tracking-wider uppercase">
 API Sandbox v2.1
 </span>
 </div>

 {/* Code Box area */}
 <div className="p-space-5 bg-[#07090E] text-slate-300 font-mono text-[11px] overflow-x-auto leading-relaxed min-h-64 flex flex-col justify-center">
 <pre className="whitespace-pre">
 <code>{CODE_SNIPPETS[activeCodeTab]}</code>
 </pre>
 </div>
 </div>
 
</ScrollReveal>
</section>

 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 11: CUSTOMER SUCCESS
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <section className="mx-auto max-w-5xl px-space-6 pb-space-24 z-10 relative">
<ScrollReveal stagger>

 <div className="text-center mb-space-16">
 <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
 <TrendingUp className="h-3.5 w-3.5 text-primary" />
 <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Performance Records</span>
 </div>
 <h2 className="text-heading-xl tracking-tight-md text-foreground">
 Proven Metrics.
 <br />
 <span className="text-primary">Measurable business growth.</span>
 </h2>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-space-6 text-center">
 <div className="p-space-5 rounded-xl border border-[hsl(var(--foreground)/0.05)] bg-[hsl(var(--foreground)/0.015)]">
 <p className="text-heading-lg font-mono font-bold text-primary mb-space-1">+40%</p>
 <p className="text-caption text-muted-foreground">Revenue increase</p>
 </div>
 <div className="p-space-5 rounded-xl border border-[hsl(var(--foreground)/0.05)] bg-[hsl(var(--foreground)/0.015)]">
 <p className="text-heading-lg font-mono font-bold text-primary mb-space-1">95%</p>
 <p className="text-caption text-muted-foreground">Lead capture rate</p>
 </div>
 <div className="p-space-5 rounded-xl border border-[hsl(var(--foreground)/0.05)] bg-[hsl(var(--foreground)/0.015)]">
 <p className="text-heading-lg font-mono font-bold text-primary mb-space-1">94%</p>
 <p className="text-caption text-muted-foreground">Calendar fill rate</p>
 </div>
 <div className="p-space-5 rounded-xl border border-[hsl(var(--foreground)/0.05)] bg-[hsl(var(--foreground)/0.015)]">
 <p className="text-heading-lg font-mono font-bold text-primary mb-space-1">&lt; 2s</p>
 <p className="text-caption text-muted-foreground">Response time</p>
 </div>
 </div>
 
</ScrollReveal>
</section>

 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 12: FINAL CTA
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <section className="relative py-space-28 md:py-space-36 overflow-hidden border-t border-[hsl(var(--foreground)/0.06)]">
<ScrollReveal stagger>

 <div className="absolute inset-space-0 dot-grid grid-fade-y pointer-events-none opacity-20" />
 <div className="relative mx-auto max-w-2xl px-space-6 text-center">
 <h2 className="text-heading-xl tracking-tight-sm leading-snug text-foreground mb-space-5">
 Ready to automate
 <br />
 your front desk <span className="text-primary">live?</span>
 </h2>
 <p className="text-muted-foreground text-body-md mb-space-8 max-w-xl mx-auto leading-relaxed">
 Set up Operator AI in 30 minutes. No complex setups or coding background required.
 </p>
 <div className="flex flex-col sm:flex-row gap-space-4 justify-center">
 <SessionAwareCta
 signedInText="Go to Dashboard"
 signedOutText="Start Free Trial"
 signedOutHref="/sign-in"
 variant="default"
 size="lg"
 />
 <Button asChild variant="outline" size="lg">
 <Link href="/pricing">
 View Pricing Schedules
 </Link>
 </Button>
 </div>
 </div>
 
</ScrollReveal>
</section>
 </main>

 <MarketingFooter />
 </div>
 );
}
