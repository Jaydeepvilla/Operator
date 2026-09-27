"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Button } from "@/components/shared/button";
import { SessionAwareCta } from "@/components/marketing/session-aware-cta";
import { NativeButton } from "@/components/shared/native";
import { cn } from "@/components/shared/utils";
import {
  ArrowRight,
  Mic,
  MessageSquare,
  Phone,
  Calendar,
  TrendingUp,
  Brain,
  BarChart3,
  Shield,
  Building2,
  Zap,
  Sparkles,
  Play,
  Pause,
  Database,
  Lock,
  Terminal,
  Activity,
  Workflow,
  CheckCircle2,
  Clock,
  Code,
  Copy,
  Check,
  UserCheck,
  FileJson,
  Key
} from "lucide-react";
import { InteractiveIndustryExplorer } from "@/components/marketing/visualizations/industry-explorer";
import { VoiceAiFlow } from "@/components/marketing/visualizations/voice-ai-flow";
import { GsapScrollSection, GsapReveal, AnimatedCounter } from "@/components/marketing/gsap-scroll-section";
import { FeatureCard } from "@/components/marketing/feature-card";

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
  }
];

export default function FeaturesPage() {
  const [activeTour, setActiveTour] = useState(0);
  const [tourPaused, setTourPaused] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<"api" | "webhook" | "sdk" | "mcp">("api");
  const [activeWorkflowNode, setActiveWorkflowNode] = useState<string>("trigger");
  const [isCopied, setIsCopied] = useState(false);

  // Tour Auto-cycle logic
  useEffect(() => {
    if (tourPaused) return;
    const interval = setInterval(() => {
      setActiveTour((prev) => (prev + 1) % TOUR_STEPS.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [tourPaused]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(CODE_SNIPPETS[activeCodeTab]);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="relative flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/20">
      <MarketingNav />

      <main className="flex-1 overflow-x-hidden">
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 1: HERO
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="relative overflow-hidden pt-space-28 pb-space-16 md:pt-space-32 md:pb-space-20">
          <div className="absolute inset-0 dot-grid opacity-15 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-screen bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08),transparent_70%)] pointer-events-none" />

          <GsapScrollSection animation="fade-up" className="relative mx-auto max-w-5xl px-space-6 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Engineered Capabilities</span>
            </div>

            <h1 className="text-display-lg md:text-display-xl tracking-tight leading-display text-foreground font-bold max-w-3xl mb-space-5">
              The AI Business Operating System.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[hsl(260_80%_65%)] to-[hsl(280_75%_55%)]">
                Redefined.
              </span>
            </h1>

            <p className="mx-auto max-w-2xl text-body-md md:text-body-lg text-muted-foreground leading-relaxed mb-space-10">
              An omnipresent front desk that runs phone operations, qualifies leads, secures deposits, and coordinates calendars 24/7. Not a generic chatbot — a complete office scheduler.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-space-4 mb-space-14 w-full">
              <Button asChild variant="default" size="lg" className="w-full sm:w-auto font-semibold">
                <Link href="/sign-up">
                  Try Operator Free <ArrowRight className="h-4 w-4 ml-1.5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto font-semibold">
                <Link href="/demo">
                  Book Live Demo
                </Link>
              </Button>
            </div>

            {/* Interactive Hero Waveform Visualizer */}
            <div className="w-full max-w-4xl p-space-6 md:p-space-8 rounded-3xl border border-[hsl(var(--foreground)/0.08)] bg-card/40 backdrop-blur-md relative overflow-hidden shadow-lg">
              <div className="absolute inset-0 dot-grid opacity-10 pointer-events-none" />
              <div className="relative z-10">
                <VoiceAiFlow />
              </div>
            </div>
          </GsapScrollSection>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 2: INTERACTIVE AI EXPERIENCE TOUR
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="relative mx-auto max-w-5xl px-space-6 pb-space-24 z-10">
          <GsapScrollSection animation="fade-up">
            <div className="text-center mb-space-12">
              <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
                <Workflow className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Interactive Simulation</span>
              </div>
              <h2 className="text-heading-xl tracking-tight-md font-bold text-foreground">
                End-to-End Automation.
                <br />
                <span className="text-primary">Watch the full loop run.</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-8 items-stretch">
              {/* Left: Interactive Stepper Timeline */}
              <div className="lg:col-span-5 flex flex-col justify-between gap-space-3">
                <div className="flex flex-col gap-space-2.5 max-h-[380px] overflow-y-auto pr-space-1.5 no-scrollbar">
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
                          "w-full text-left relative p-space-4 border rounded-xl flex items-center gap-space-4 transition-all duration-300 cursor-pointer select-none",
                          isActive
                            ? "border-primary/40 bg-primary/[0.04] shadow-xs"
                            : "border-[hsl(var(--foreground)/0.06)] bg-card/30 hover:border-[hsl(var(--foreground)/0.14)] hover:bg-card/50"
                        ].join(" ")}
                      >
                        {/* Active highlight line indicator */}
                        {isActive && (
                          <span className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
                        )}

                        <div className={[
                          "flex items-center justify-center h-8 w-8 rounded-lg shrink-0 transition-colors duration-300",
                          isActive ? "bg-primary/15 text-primary" : "bg-[hsl(var(--foreground)/0.04)] text-muted-foreground"
                        ].join(" ")}>
                          {step.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className={[
                              "text-body-sm font-semibold transition-colors duration-300",
                              isActive ? "text-foreground font-bold" : "text-muted-foreground"
                            ].join(" ")}>
                              {step.title}
                            </h3>
                            <span className="text-[9px] font-mono text-muted-foreground/70 tracking-wider uppercase">
                              {step.label}
                            </span>
                          </div>
                          <p className={[
                            "text-caption mt-space-1 leading-relaxed transition-colors duration-300",
                            isActive ? "text-foreground/75" : "text-muted-foreground/60"
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
                  className="mt-space-2 border border-[hsl(var(--foreground)/0.08)] bg-card/25 hover:bg-card/50 text-caption py-space-2.5 px-space-4 rounded-xl flex items-center justify-center gap-space-2 transition-all cursor-pointer font-semibold text-muted-foreground select-none"
                >
                  {tourPaused ? (
                    <>
                      <Play className="h-3.5 w-3.5 text-primary shrink-0" /> Resume Auto-Simulation Loop
                    </>
                  ) : (
                    <>
                      <Pause className="h-3.5 w-3.5 text-amber-500 shrink-0" /> Pause Simulation Loop
                    </>
                  )}
                </NativeButton>
              </div>

              {/* Right: Sandbox Window */}
              <div className="lg:col-span-7 rounded-2xl border border-[hsl(var(--foreground)/0.08)] bg-card/70 backdrop-blur-xs shadow-lg p-space-7 md:p-space-8 flex flex-col justify-between relative overflow-hidden min-h-[420px]">
                <div className="absolute inset-0 dot-grid opacity-[0.03] pointer-events-none" />

                {/* Browser Chrome Header */}
                <div className="flex items-center justify-between border-b border-[hsl(var(--foreground)/0.06)] pb-space-3.5 mb-space-6 relative z-10">
                  <div className="flex items-center gap-space-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
                  </div>
                  <div className="text-[10px] font-mono tracking-widest text-muted-foreground/60 uppercase font-semibold">
                    Operator AI Agent Live Runtime
                  </div>
                  <div className="w-10" />
                </div>

                {/* Dynamic Step View */}
                <div className="flex-1 flex flex-col justify-center relative z-10">
                  {activeTour === 0 && (
                    <div className="space-y-space-4 text-center max-w-sm mx-auto py-space-6 animate-in fade-in duration-300">
                      <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary animate-pulse">
                        <Phone className="h-7 w-7" />
                      </div>
                      <div className="space-y-space-1.5">
                        <p className="text-body-md font-bold text-foreground">Inbound Telephone Triage</p>
                        <p className="text-caption font-mono text-emerald-500 font-bold tracking-wider">
                          +1 (555) 019-2834 RINGING...
                        </p>
                        <p className="text-caption text-muted-foreground leading-relaxed">
                          Incoming customer call captured on main clinic line. Initializing semantic SIP duplex gateway stream.
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTour === 1 && (
                    <div className="space-y-space-3 max-w-md mx-auto w-full py-space-4 animate-in fade-in duration-300">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-md bg-[hsl(var(--foreground)/0.06)] flex items-center justify-center text-muted-foreground">
                          <Phone className="h-3 w-3" />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground/60 font-medium">Customer (Voice)</span>
                      </div>
                      <div className="bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.06)] p-space-3.5 rounded-xl text-caption leading-relaxed text-foreground">
                        "Hi! I chipped my front tooth eating lunch, do you have any emergency availability tomorrow morning?"
                      </div>

                      <div className="flex items-center gap-2 mt-space-2 justify-end">
                        <span className="text-[10px] font-mono text-primary font-semibold">Operator AI (Voice Greeting)</span>
                        <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                          <Mic className="h-3 w-3 animate-pulse" />
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-primary to-[hsl(280_75%_55%)] text-white p-space-3.5 rounded-xl rounded-tr-none text-caption leading-relaxed shadow-sm">
                        "Oh, I'm sorry to hear that. A chipped tooth can be very uncomfortable. We prioritize emergency visits — let me check Dr. Mitchell's emergency slots for tomorrow morning."
                      </div>
                    </div>
                  )}

                  {activeTour === 2 && (
                    <div className="space-y-space-3.5 max-w-sm mx-auto w-full text-center py-space-6 animate-in fade-in duration-300">
                      <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                        <Calendar className="h-7 w-7 animate-pulse" />
                      </div>
                      <div className="space-y-space-2">
                        <p className="text-body-md font-bold text-foreground">Active Slot Matcher</p>
                        <div className="inline-flex gap-space-2 items-center justify-center bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.06)] px-space-3 py-space-2 rounded-lg">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          <span className="text-caption font-mono text-foreground font-bold">Matching: Tomorrow at 10:00 AM</span>
                        </div>
                        <p className="text-caption text-muted-foreground leading-relaxed">
                          Triage reasoning identifies urgent chipped tooth and blocks calendar parameters with zero human intervention.
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTour === 3 && (
                    <div className="bg-card border border-[hsl(var(--foreground)/0.08)] p-space-5 rounded-xl max-w-md mx-auto w-full shadow-xs animate-in fade-in duration-300">
                      <div className="flex items-center justify-between border-b border-[hsl(var(--foreground)/0.05)] pb-space-3 mb-space-3">
                        <span className="text-caption font-bold text-foreground font-mono">Google Calendar Matrix</span>
                        <span className="text-[9px] uppercase font-mono tracking-widest text-emerald-500 bg-emerald-500/10 px-space-2 py-space-0.5 rounded-full font-bold">Confirmed</span>
                      </div>
                      <div className="space-y-space-2 font-mono text-[11px]">
                        <div className="flex justify-between border-b border-[hsl(var(--foreground)/0.03)] pb-space-1.5">
                          <span className="text-muted-foreground">Appointment:</span>
                          <span className="text-foreground font-semibold">Emergency Cleaning & Review</span>
                        </div>
                        <div className="flex justify-between border-b border-[hsl(var(--foreground)/0.03)] pb-space-1.5">
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
                    <div className="max-w-xs mx-auto border border-border/50 bg-card/80 p-space-4.5 rounded-2xl relative shadow-md animate-in fade-in duration-300">
                      <div className="flex items-center gap-space-2 mb-space-3">
                        <div className="h-6 w-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">SMS Outbound Dispatch</span>
                      </div>
                      <p className="text-body-sm font-semibold text-foreground mb-space-1">Appointment Locked</p>
                      <p className="text-caption text-muted-foreground leading-relaxed bg-[hsl(var(--foreground)/0.02)] p-space-3 rounded-lg border border-[hsl(var(--foreground)/0.04)] font-mono">
                        "Bright Smile: Your emergency cleaning with Dr. Mitchell is confirmed for tomorrow at 10:00 AM. Click to complete medical forms: link.operator.ai/c/283"
                      </p>
                    </div>
                  )}

                  {activeTour === 5 && (
                    <div className="bg-card border border-[hsl(var(--foreground)/0.08)] p-space-5 rounded-xl max-w-sm mx-auto w-full shadow-xs animate-in fade-in duration-300">
                      <div className="flex items-center justify-between border-b border-[hsl(var(--foreground)/0.05)] pb-space-3 mb-space-4">
                        <span className="text-caption font-bold text-foreground font-mono">Stripe Deposit Gate</span>
                        <span className="text-[9px] uppercase font-mono tracking-widest text-primary bg-primary/10 px-space-2 py-space-0.5 rounded-full font-bold">Verified</span>
                      </div>
                      <div className="space-y-space-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-caption font-semibold text-foreground">Emergency Retainer Fee</p>
                            <p className="text-[10px] text-muted-foreground">Bright Smile Dental Clinic</p>
                          </div>
                          <p className="text-body-md font-mono text-foreground font-bold">$50.00</p>
                        </div>
                        <div className="text-center text-caption text-emerald-500 font-bold bg-emerald-500/10 py-space-1.5 rounded-lg border border-emerald-500/20 font-mono">
                          ✓ SECURE PAYMENT PROCESSED
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTour === 6 && (
                    <div className="bg-card border border-[hsl(var(--foreground)/0.08)] p-space-5 rounded-xl max-w-md mx-auto w-full shadow-xs animate-in fade-in duration-300">
                      <div className="flex items-center gap-space-2.5 border-b border-[hsl(var(--foreground)/0.05)] pb-space-3 mb-space-4">
                        <div className="h-6 w-6 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                          <Database className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-caption font-bold text-foreground">EHR Practice Management CRM</span>
                      </div>
                      <div className="space-y-space-2 text-[11px] font-mono">
                        <div className="flex justify-between border-b border-[hsl(var(--foreground)/0.03)] pb-space-1.5">
                          <span className="text-muted-foreground">Patient:</span>
                          <span className="text-foreground font-semibold">John Doe (New Record)</span>
                        </div>
                        <div className="flex justify-between border-b border-[hsl(var(--foreground)/0.03)] pb-space-1.5">
                          <span className="text-muted-foreground">Triage Priority:</span>
                          <span className="text-amber-500 font-semibold">[Emergency chipped_tooth]</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Deposit Hold:</span>
                          <span className="text-emerald-500 font-semibold">$50.00 Paid (Stripe)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer status */}
                <div className="border-t border-[hsl(var(--foreground)/0.06)] pt-space-3 text-caption text-muted-foreground flex items-center justify-between relative z-10">
                  <span className="text-[11px] font-mono">Live Sandbox State</span>
                  <span className="flex items-center gap-1.5 text-primary text-[11px] font-mono font-semibold">
                    <Sparkles className="h-3 w-3 animate-pulse" /> All micro-services active
                  </span>
                </div>
              </div>
            </div>
          </GsapScrollSection>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 3: CORE CAPABILITIES (Bento Hierarchy)
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="mx-auto max-w-5xl px-space-6 pb-space-28 z-10 relative">
          <GsapScrollSection animation="fade-up">
            <div className="text-center mb-space-16">
              <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
                <Activity className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Full Platform Suite</span>
              </div>
              <h2 className="text-heading-xl tracking-tight-md font-bold text-foreground">
                Built for Action.
                <br />
                <span className="text-primary">Not just simple answering.</span>
              </h2>
              <p className="text-body-sm text-muted-foreground mt-space-3 max-w-lg mx-auto">
                Purpose-built intelligence layers that take real business actions instead of giving generic replies.
              </p>
            </div>

            {/* Bento Grid with Clear Visual Hierarchy */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-space-6 items-stretch">
              {/* Flagship Feature #1: Operator Voice AI (8 cols) */}
              <FeatureCard
                variant="flagship"
                className="md:col-span-8"
                badge="Flagship Engine"
                icon={<Mic className="h-6 w-6 text-primary" />}
                title="Ultra-Low Latency Voice AI"
                description="Answer inbound phone calls with zero robotic hesitation. Operator processes natural speech, evaluates conversational intent, and answers questions with conversational fluidity."
                footer={
                  <div className="space-y-space-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-muted-foreground uppercase tracking-wider">SIP Audio Round-trip Latency</span>
                      <span className="text-emerald-500 font-bold">&lt; 850ms</span>
                    </div>
                    <div className="h-1.5 w-full bg-[hsl(var(--foreground)/0.06)] rounded-full overflow-hidden">
                      <div className="h-full w-4/5 bg-gradient-to-r from-primary to-[hsl(280_75%_55%)] rounded-full" />
                    </div>
                  </div>
                }
              />

              {/* Supporting Feature #2: Calendar Synchronization (4 cols) */}
              <FeatureCard
                variant="standard"
                className="md:col-span-4"
                badge="Bi-Directional"
                icon={<Calendar className="h-5 w-5 text-emerald-500" />}
                title="Calendar Sync"
                description="Scan provider availability, enforce buffer slots, and lock reservations dynamically in Google Calendar and Outlook."
                footer={
                  <div className="flex items-center justify-between text-[11px] font-mono text-emerald-500 font-bold bg-emerald-500/10 px-space-3 py-space-2 rounded-lg border border-emerald-500/20">
                    <span>Collision Checks:</span>
                    <span>100% Conflict-Free</span>
                  </div>
                }
              />

              {/* Supporting Feature #3: Omnichannel Continuity (4 cols) */}
              <FeatureCard
                variant="standard"
                className="md:col-span-4"
                badge="Omnichannel"
                icon={<MessageSquare className="h-5 w-5 text-indigo-500" />}
                title="Channel Continuity"
                description="Maintain unified context across WhatsApp, SMS, Web Chat, and Meta Messenger from a single shared memory brain."
                footer={
                  <div className="flex flex-wrap gap-1.5">
                    {["WhatsApp", "Web", "SMS", "Instagram"].map((c) => (
                      <span key={c} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                        {c}
                      </span>
                    ))}
                  </div>
                }
              />

              {/* Flagship Feature #4: Lead Qualification Engine (8 cols) */}
              <FeatureCard
                variant="flagship"
                className="md:col-span-8"
                badge="Revenue Engine"
                icon={<UserCheck className="h-6 w-6 text-primary" />}
                title="Lead Qualification & Triage Logic"
                description="Filter inquiries against custom clinical parameters, copay values, and insurance criteria. Prioritize high-value procedures immediately and route edge cases to staff."
                footer={
                  <div className="grid grid-cols-2 gap-space-4 p-space-3.5 rounded-xl border border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)]">
                    <div>
                      <div className="text-display-xs font-mono font-bold text-foreground">85%</div>
                      <div className="text-[10px] uppercase font-mono text-muted-foreground mt-0.5">Automated Intake Capture</div>
                    </div>
                    <div>
                      <div className="text-display-xs font-mono font-bold text-emerald-500">3.5x</div>
                      <div className="text-[10px] uppercase font-mono text-muted-foreground mt-0.5">Booking Conversion Lift</div>
                    </div>
                  </div>
                }
              />

              {/* Utility Feature #5: Vector Knowledge Base (6 cols) */}
              <FeatureCard
                variant="standard"
                className="md:col-span-6"
                badge="Vector RAG"
                icon={<Database className="h-5 w-5 text-amber-500" />}
                title="Business Knowledge Ingestion"
                description="Upload PDFs, service menus, insurance sheets, and FAQs. Operator quotes verified clinic facts with zero hallucinatory drift."
                footer={
                  <div className="text-center text-caption font-mono text-amber-500 bg-amber-500/10 py-space-1.5 rounded-lg border border-amber-500/20 font-bold">
                    ✓ Vector Semantic Index Synced
                  </div>
                }
              />

              {/* Utility Feature #6: Executive Analytics (6 cols) */}
              <FeatureCard
                variant="standard"
                className="md:col-span-6"
                badge="Telemetry"
                icon={<BarChart3 className="h-5 w-5 text-emerald-500" />}
                title="Operational Intelligence"
                description="Monitor appointment volume, caller drop-off points, revenue generated, and caller sentiment across all phone channels."
                footer={
                  <div className="text-center text-caption font-mono text-emerald-500 bg-emerald-500/10 py-space-1.5 rounded-lg border border-emerald-500/20 font-bold">
                    ✓ 50+ Real-Time KPI Dimensions
                  </div>
                }
              />
            </div>
          </GsapScrollSection>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 4: WORKFLOW ARCHITECT (Interactive Visual Pipeline)
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="mx-auto max-w-5xl px-space-6 pb-space-28 z-10 relative">
          <GsapScrollSection animation="fade-up">
            <div className="text-center mb-space-12">
              <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
                <Workflow className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Workflow Architect</span>
              </div>
              <h2 className="text-heading-xl tracking-tight-md font-bold text-foreground">
                Automate Trigger Sequences.
                <br />
                <span className="text-primary">Customize AI actions instantly.</span>
              </h2>
            </div>

            <div className="relative rounded-3xl border border-[hsl(var(--foreground)/0.08)] bg-card/25 backdrop-blur-xs p-space-6 md:p-space-10 overflow-hidden shadow-sm">
              <div className="absolute inset-0 dot-grid opacity-15 pointer-events-none" />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-8 items-center relative z-10">
                {/* Left: Workflow Builder Node Switcher */}
                <div className="lg:col-span-5 space-y-space-3">
                  {[
                    { id: "trigger", step: "1", title: "Inbound Hook", desc: "Captures caller audio stream and resolves geographic routing.", color: "primary" },
                    { id: "reasoning", step: "2", title: "Semantic Evaluator", desc: "Triages intent vectors, insurance data, and urgency score.", color: "indigo" },
                    { id: "action", step: "3", title: "Integration Dispatch", desc: "Locks calendar, generates payment link, pushes EHR note.", color: "emerald" },
                  ].map((node) => {
                    const isActive = activeWorkflowNode === node.id;
                    return (
                      <NativeButton
                        key={node.id}
                        type="button"
                        onClick={() => setActiveWorkflowNode(node.id)}
                        className={[
                          "w-full text-left p-space-4 border rounded-xl flex items-start gap-space-3.5 transition-all duration-200 cursor-pointer select-none",
                          isActive
                            ? "border-primary bg-primary/10 shadow-xs"
                            : "border-[hsl(var(--foreground)/0.06)] bg-card/40 hover:border-[hsl(var(--foreground)/0.12)]"
                        ].join(" ")}
                      >
                        <span className={[
                          "h-6 w-6 rounded flex items-center justify-center shrink-0 mt-0.5 font-mono text-[11px] font-bold",
                          isActive ? "bg-primary text-primary-foreground" : "bg-[hsl(var(--foreground)/0.06)] text-muted-foreground"
                        ].join(" ")}>
                          {node.step}
                        </span>
                        <div>
                          <h4 className="text-body-sm font-semibold text-foreground">{node.title}</h4>
                          <p className="text-caption text-muted-foreground mt-space-1 leading-relaxed">
                            {node.desc}
                          </p>
                        </div>
                      </NativeButton>
                    );
                  })}
                </div>

                {/* Right: Visual Pipeline Sandbox */}
                <div className="lg:col-span-7 bg-card border border-[hsl(var(--foreground)/0.08)] rounded-2xl p-space-7 min-h-[320px] flex flex-col justify-between relative overflow-hidden shadow-lg">
                  <div className="flex items-center justify-between border-b border-[hsl(var(--foreground)/0.08)] pb-space-3.5 mb-space-6 relative z-10">
                    <div className="flex items-center gap-space-2">
                      <Terminal className="h-4 w-4 text-primary" />
                      <span className="text-[11px] font-mono tracking-widest text-muted-foreground uppercase font-semibold">
                        Pipeline Node Inspector
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="text-[10px] font-mono uppercase text-emerald-500 font-bold">Live</span>
                    </div>
                  </div>

                  {/* Active Node Payload Preview */}
                  <div className="flex-1 flex flex-col justify-center relative z-10 w-full max-w-lg mx-auto">
                    {activeWorkflowNode === "trigger" && (
                      <div className="space-y-space-4 text-center animate-in fade-in duration-300">
                        <div className="inline-flex px-space-4 py-space-2 rounded-xl bg-primary/10 border border-primary/20 text-primary font-mono text-body-sm font-bold">
                          Trigger: Inbound_SIP_Bridge
                        </div>
                        <p className="text-body-sm text-muted-foreground">
                          Call captured on primary office number. Initialized duplex audio stream in 14ms.
                        </p>
                        <div className="flex items-center justify-center gap-space-3 font-mono text-[11px] text-muted-foreground">
                          <span className="px-2.5 py-1 rounded bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.06)]">Codec: Opus 48kHz</span>
                          <span className="px-2.5 py-1 rounded bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.06)]">Carrier: Vonage HD</span>
                        </div>
                      </div>
                    )}

                    {activeWorkflowNode === "reasoning" && (
                      <div className="space-y-space-4 text-center animate-in fade-in duration-300">
                        <div className="inline-flex px-space-4 py-space-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-body-sm font-bold">
                          Reasoning: Clinical_Triage
                        </div>
                        <p className="text-body-sm text-muted-foreground">
                          Extracted intent: emergency_tooth_repair. Matched Delta Dental PPO copay parameters.
                        </p>
                        <div className="flex items-center justify-center gap-space-3 font-mono text-[11px] text-muted-foreground">
                          <span className="px-2.5 py-1 rounded bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.06)]">Confidence: 99.4%</span>
                          <span className="px-2.5 py-1 rounded bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.06)]">Urgency: High</span>
                        </div>
                      </div>
                    )}

                    {activeWorkflowNode === "action" && (
                      <div className="space-y-space-4 text-center animate-in fade-in duration-300">
                        <div className="inline-flex px-space-4 py-space-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-body-sm font-bold">
                          Action: Multi_Dispatch_Lock
                        </div>
                        <p className="text-body-sm text-muted-foreground">
                          Calendar block locked for Dr. Mitchell tomorrow at 10:00 AM. Confirmation SMS dispatched. Lead record populated.
                        </p>
                        <div className="flex items-center justify-center gap-space-3 font-mono text-[11px] text-muted-foreground">
                          <span className="px-2.5 py-1 rounded bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.06)]">Google Cal: Locked</span>
                          <span className="px-2.5 py-1 rounded bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.06)]">EHR: Synced</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[hsl(var(--foreground)/0.06)] pt-space-3 text-[10px] font-mono text-muted-foreground/60 flex items-center justify-between">
                    <span>Protocol: WebRTC/SIP RFC 3261</span>
                    <span className="text-emerald-500 font-bold">Zero Dropped Packets</span>
                  </div>
                </div>
              </div>
            </div>
          </GsapScrollSection>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 5: INDUSTRY VERTICALS (Cross-Fade Animated Tabs)
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="mx-auto max-w-5xl px-space-6 pb-space-28 z-10 relative">
          <GsapScrollSection animation="fade-up">
            <div className="text-center mb-space-12">
              <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Industry Specializations</span>
              </div>
              <h2 className="text-heading-xl tracking-tight-md font-bold text-foreground">
                Industry Verticals.
                <br />
                <span className="text-primary">Tailored automation rules.</span>
              </h2>
            </div>

            <InteractiveIndustryExplorer />
          </GsapScrollSection>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 6: LATENCY PIPELINE TIMELINE
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="mx-auto max-w-5xl px-space-6 pb-space-28 z-10 relative">
          <GsapScrollSection animation="fade-up">
            <div className="text-center mb-space-16">
              <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Sub-Second Processing</span>
              </div>
              <h2 className="text-heading-xl tracking-tight-md font-bold text-foreground">
                Voice Triage Pipeline.
                <br />
                <span className="text-primary">Latency metrics breakdown.</span>
              </h2>
            </div>

            <div className="relative border-l border-[hsl(var(--foreground)/0.08)] pl-space-6 md:pl-space-8 space-y-space-8 max-w-3xl mx-auto">
              {[
                { step: "1. Audio SIP Stream Ingestion", latency: "< 80ms", desc: "Connects call audio bridge directly to Operator AI cores with high-fidelity duplex transmission pathways.", color: "primary" },
                { step: "2. Speech Recognition & Transcription", latency: "< 120ms", desc: "Converts spoken audio frequencies into clean text, filters background acoustic static, and parses semantic pauses.", color: "primary" },
                { step: "3. Triage Reasoning Core", latency: "< 250ms", desc: "Evaluates caller intent, ranks booking priority, checks active knowledge sheets, and verifies parameters.", color: "indigo" },
                { step: "4. Calendar Synced Lock", latency: "< 350ms", desc: "Queries scheduling systems (Google Calendar, Outlook, EHR grids) and confirms the reserved slot block.", color: "emerald" },
              ].map((item, idx) => (
                <div key={idx} className="relative">
                  <span className="absolute -left-[31px] md:-left-[39px] top-1 h-4 w-4 rounded-full bg-primary border-4 border-background" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-2">
                    <h4 className="text-body-md font-bold text-foreground">{item.step}</h4>
                    <span className="text-caption font-mono text-primary font-bold">{item.latency}</span>
                  </div>
                  <p className="text-caption text-muted-foreground mt-space-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </GsapScrollSection>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 7: DEVELOPER PLATFORM (Polyglot Code Sandbox)
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="mx-auto max-w-5xl px-space-6 pb-space-28 z-10 relative">
          <GsapScrollSection animation="fade-up">
            <div className="text-center mb-space-12">
              <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
                <Code className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Developer Sandbox</span>
              </div>
              <h2 className="text-heading-xl tracking-tight-md font-bold text-foreground">
                Developer Platform.
                <br />
                <span className="text-primary">Integrate with 1 line of code.</span>
              </h2>
            </div>

            <div className="rounded-2xl border border-[hsl(var(--foreground)/0.08)] bg-card overflow-hidden shadow-lg">
              {/* Header Tab Bar */}
              <div className="bg-[hsl(var(--foreground)/0.02)] border-b border-[hsl(var(--foreground)/0.06)] px-space-5 py-space-3 flex items-center justify-between flex-wrap gap-space-3">
                <div className="flex gap-space-1.5">
                  {(["api", "webhook", "sdk", "mcp"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveCodeTab(tab)}
                      className={cn(
                        "px-space-3 py-space-1.5 text-caption font-mono font-semibold rounded-lg transition-colors cursor-pointer select-none",
                        activeCodeTab === tab
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--foreground)/0.04)]"
                      )}
                    >
                      {tab.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-space-3">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider hidden sm:inline">
                    API Sandbox v2.4
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 text-caption font-mono text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-[hsl(var(--foreground)/0.05)] transition-colors cursor-pointer"
                  >
                    {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{isCopied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              {/* Code Sandbox Viewport */}
              <div className="p-space-6 bg-[#07090E] text-slate-300 font-mono text-[11px] overflow-x-auto leading-relaxed min-h-64 flex flex-col justify-center">
                <pre className="whitespace-pre">
                  <code>{CODE_SNIPPETS[activeCodeTab]}</code>
                </pre>
              </div>
            </div>
          </GsapScrollSection>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 8: PROVEN METRICS (Animated Counters)
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="mx-auto max-w-5xl px-space-6 pb-space-28 z-10 relative">
          <GsapScrollSection animation="fade-up">
            <div className="text-center mb-space-16">
              <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Performance Records</span>
              </div>
              <h2 className="text-heading-xl tracking-tight-md font-bold text-foreground">
                Proven Metrics.
                <br />
                <span className="text-primary">Measurable business growth.</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-space-6 text-center">
              <div className="p-space-6 rounded-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/40 backdrop-blur-xs">
                <p className="text-display-md font-mono font-bold text-primary mb-space-1">
                  <AnimatedCounter value="+40%" />
                </p>
                <p className="text-caption text-muted-foreground font-medium">Revenue increase</p>
              </div>
              <div className="p-space-6 rounded-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/40 backdrop-blur-xs">
                <p className="text-display-md font-mono font-bold text-primary mb-space-1">
                  <AnimatedCounter value="95%" />
                </p>
                <p className="text-caption text-muted-foreground font-medium">Lead capture rate</p>
              </div>
              <div className="p-space-6 rounded-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/40 backdrop-blur-xs">
                <p className="text-display-md font-mono font-bold text-primary mb-space-1">
                  <AnimatedCounter value="94%" />
                </p>
                <p className="text-caption text-muted-foreground font-medium">Calendar fill rate</p>
              </div>
              <div className="p-space-6 rounded-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/40 backdrop-blur-xs">
                <p className="text-display-md font-mono font-bold text-primary mb-space-1">
                  <AnimatedCounter value="< 2s" />
                </p>
                <p className="text-caption text-muted-foreground font-medium">Response time</p>
              </div>
            </div>
          </GsapScrollSection>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 9: FINAL CTA
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="relative py-space-28 md:py-space-36 overflow-hidden border-t border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.01)]">
          <div className="absolute inset-0 dot-grid grid-fade-y pointer-events-none opacity-20" />
          <div className="relative mx-auto max-w-2xl px-space-6 text-center">
            <GsapScrollSection animation="scale-up">
              <h2 className="text-heading-xl tracking-tight-sm leading-snug font-bold text-foreground mb-space-5">
                Ready to automate
                <br />
                your front desk <span className="text-primary">live?</span>
              </h2>
              <p className="text-muted-foreground text-body-md md:text-body-lg mb-space-8 max-w-xl mx-auto leading-relaxed">
                Deploy Operator AI on your business phone line in 30 minutes. Full access to calendars, voice AI, and intake workflows.
              </p>
              <div className="flex flex-col sm:flex-row gap-space-4 justify-center">
                <SessionAwareCta
                  signedInText="Go to Dashboard"
                  signedOutText="Start Free Trial"
                  signedOutHref="/sign-in"
                  size="lg"
                />
                <Button asChild variant="outline" size="lg">
                  <Link href="/pricing">
                    View Pricing Schedules
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
