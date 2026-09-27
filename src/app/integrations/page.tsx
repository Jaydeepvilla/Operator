"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Button } from "@/components/shared/button";
import { cn } from "@/components/shared/utils";

import googleIcon from "@/assets/google.svg";
import microsoftIcon from "@/assets/microsoft.svg";
import calendlyIcon from "@/assets/calendly.svg";
import openaiIcon from "@/assets/openai.svg";
import razorpayIcon from "@/assets/razorpay.svg";
import slackIcon from "@/assets/slack-logo.svg";
import whatsappIcon from "@/assets/whatsapp-text.svg";
import zoomIcon from "@/assets/zoom-app.svg";
import hubspotIcon from "@/assets/hubspot.svg";
import metaIcon from "@/assets/meta.svg";
import stripeIcon from "@/assets/stripe.svg";
import twilioIcon from "@/assets/twilio.svg";

import {
  Sparkles,
  ArrowRight,
  Search,
  CheckCircle2,
  Clock,
  Terminal,
  Copy,
  Check,
  Zap,
  MessageSquare,
  Workflow,
  ShieldCheck,
  FileJson,
  Phone,
  Key,
  LayoutGrid,
  ListFilter,
  Layers,
  ArrowUpRight
} from "lucide-react";
import { GsapScrollSection, GsapReveal } from "@/components/marketing/gsap-scroll-section";
import { IntegrationCard, IntegrationData } from "@/components/marketing/integration-card";

// ─── SVG LOGOS ────────────────────────────────────────────────────────────
const LOGOS = {
  operator: (className = "h-8 w-auto object-contain") => (
    <Image
      src="/logo.png"
      alt="Operator AI"
      width={32}
      height={32}
      unoptimized
      className={className}
    />
  ),
  googleCalendar: (
    <img src={googleIcon.src || googleIcon} alt="Google Calendar" className="h-7 w-auto object-contain" />
  ),
  outlook: (
    <img src={microsoftIcon.src || microsoftIcon} alt="Outlook" className="h-7 w-auto object-contain" />
  ),
  whatsapp: (
    <img src={whatsappIcon.src || whatsappIcon} alt="WhatsApp" className="h-7 w-auto object-contain" />
  ),
  zoom: (
    <img src={zoomIcon.src || zoomIcon} alt="Zoom" className="h-7 w-auto object-contain" />
  ),
  slack: (
    <img src={slackIcon.src || slackIcon} alt="Slack" className="h-7 w-auto object-contain" />
  ),
  hubspot: (
    <img src={hubspotIcon.src || hubspotIcon} alt="HubSpot" className="h-7 w-auto object-contain" />
  ),
  meta: (
    <img src={metaIcon.src || metaIcon} alt="Meta" className="h-7 w-auto object-contain" />
  ),
  calendly: (
    <img src={calendlyIcon.src || calendlyIcon} alt="Calendly" className="h-7 w-auto object-contain" />
  ),
  vonage: (
    <div className="h-7 w-7 flex items-center justify-center rounded-lg bg-blue-600/10 text-blue-500 font-bold">
      <Phone className="h-4 w-4" />
    </div>
  ),
  openai: (
    <img src={openaiIcon.src || openaiIcon} alt="OpenAI" className="h-7 w-auto object-contain" />
  ),
  razorpay: (
    <img src={razorpayIcon.src || razorpayIcon} alt="Razorpay" className="h-7 w-auto object-contain" />
  ),
  stripe: (
    <img src={stripeIcon.src || stripeIcon} alt="Stripe" className="h-7 w-auto object-contain" />
  ),
  twilio: (
    <img src={twilioIcon.src || twilioIcon} alt="Twilio" className="h-7 w-auto object-contain" />
  ),
};

const CATEGORIES = [
  "All",
  "Communication",
  "Scheduling",
  "Payments",
  "Telephony",
  "CRM",
  "AI",
];

const INTEGRATIONS: IntegrationData[] = [
  {
    id: "google-calendar",
    name: "Google Calendar",
    category: "Scheduling",
    status: "live",
    logo: LOGOS.googleCalendar,
    desc: "Real-time bi-directional schedule sync. Automatically scans chair availability and avoids double bookings.",
    features: ["Two-way sync", "Real-time conflict detection", "Buffer time configuration", "Multi-calendar mappings"],
    difficulty: "Instant",
    popularity: "Core",
    capabilities: "Scans provider rosters instantly and locks reservations with zero appointment collision."
  },
  {
    id: "calendly",
    name: "Calendly",
    category: "Scheduling",
    status: "live",
    logo: LOGOS.calendly,
    desc: "Connect your team's existing Calendly event types. Operator AI schedules appointments using your established booking links.",
    features: ["Event type sync", "Round-robin schedules", "Custom intake fields", "Timezone alignment"],
    difficulty: "Instant",
    popularity: "Popular",
    capabilities: "Pulls custom intake questions from Calendly and populates answers from live caller conversations."
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    category: "Communication",
    status: "live",
    logo: LOGOS.whatsapp,
    desc: "Dispatches automated appointment confirmations, reminders, and intake qualification chats via official Meta WhatsApp APIs.",
    features: ["Template notifications", "Post-call intake forms", "Rich media documents", "Zero ban risk"],
    difficulty: "1-Click",
    popularity: "Core",
    capabilities: "Sends interactive WhatsApp confirmation buttons immediately after a phone call completes."
  },
  {
    id: "stripe",
    name: "Stripe Payments",
    category: "Payments",
    status: "live",
    logo: LOGOS.stripe,
    desc: "Secure appointment deposits and upfront retainers with automated SMS/email payment links before calendar slots lock.",
    features: ["Instant checkout links", "Deposit holding", "Automatic refund logic", "PCI-DSS Level 1"],
    difficulty: "1-Click",
    popularity: "Core",
    capabilities: "Dispatches secure deposit links via SMS during phone triage to guarantee appointment attendance."
  },
  {
    id: "razorpay",
    name: "Razorpay",
    category: "Payments",
    status: "live",
    logo: LOGOS.razorpay,
    desc: "Collect UPI, Net Banking, credit cards, and auto payment links seamlessly across voice and messaging channels.",
    features: ["UPI & QR collection", "WhatsApp payment links", "Smart webhooks", "Automatic reconciliation"],
    difficulty: "1-Click",
    popularity: "Core",
    capabilities: "Validates booking deposits with instant UPI payment prompts sent directly to caller phones."
  },
  {
    id: "twilio",
    name: "Twilio Voice & SMS",
    category: "Telephony",
    status: "live",
    logo: LOGOS.twilio,
    desc: "Enterprise telecom carrier routing. Connect your existing business phone number via high-speed SIP trunking.",
    features: ["SIP Trunking", "Local & toll-free numbers", "High-throughput SMS", "Sub-second audio bridge"],
    difficulty: "1-Click",
    popularity: "Core",
    capabilities: "Hooks existing office phone numbers with duplex audio streaming under 800ms latency."
  },
  {
    id: "slack",
    name: "Slack Notifications",
    category: "Communication",
    status: "live",
    logo: LOGOS.slack,
    desc: "Push qualified lead summaries, VIP caller notifications, and urgent human transfer alerts directly to team channels.",
    features: ["Lead channel alerts", "Human transfer pings", "Threaded transcripts", "One-click call join"],
    difficulty: "1-Click",
    popularity: "Popular",
    capabilities: "Notifies front desk staff when an emergency caller requests human escalation."
  },
  {
    id: "hubspot",
    name: "HubSpot CRM",
    category: "CRM",
    status: "live",
    logo: LOGOS.hubspot,
    desc: "Sync contacts, qualification data, call audio recordings, and chat transcripts directly to deals and pipelines.",
    features: ["Contact profile sync", "Deal stage automation", "Audio timeline logs", "Custom field mapping"],
    difficulty: "Setup Required",
    popularity: "Core",
    capabilities: "Maps insurance status, budget, and caller urgency directly to custom HubSpot pipeline properties."
  },
  {
    id: "outlook",
    name: "Microsoft Outlook",
    category: "Scheduling",
    status: "live",
    logo: LOGOS.outlook,
    desc: "Full synchronization with Microsoft 365, Outlook Calendar, and Teams meeting scheduling systems.",
    features: ["M365 cloud sync", "Multi-chair routing", "Real-time availability", "Teams link creation"],
    difficulty: "Instant",
    popularity: "Standard",
    capabilities: "Checks Microsoft 365 calendars dynamically and blocks booked slots across the organization."
  },
  {
    id: "openai",
    name: "OpenAI Models",
    category: "AI",
    status: "live",
    logo: LOGOS.openai,
    desc: "Underlying conversational reasoning models with custom system prompts tailored to your business domain.",
    features: ["Domain adaptation", "Function calling", "Zero-shot classification", "Structured JSON output"],
    difficulty: "Setup Required",
    popularity: "Core",
    capabilities: "Evaluates raw conversational dialogue and translates customer intents into structured API payloads."
  },
  {
    id: "meta",
    name: "Meta Messenger & IG",
    category: "Communication",
    status: "coming-soon",
    logo: LOGOS.meta,
    desc: "Answer customer inquiries and schedule consultations natively inside Instagram DMs and Facebook Pages.",
    features: ["Instagram DM triage", "Facebook Page responses", "Lead qualification", "Ad conversion sync"],
    difficulty: "Setup Required",
    popularity: "Popular",
    capabilities: "Qualifies social media inquiries using the same rules and calendar availability as phone callers."
  },
  {
    id: "zoom",
    name: "Zoom Meetings",
    category: "Communication",
    status: "coming-soon",
    logo: LOGOS.zoom,
    desc: "Automatically provision personalized Zoom video consultation URLs upon appointment confirmation.",
    features: ["Dynamic meeting URLs", "Passcode security", "Host delegation keys", "Calendar integration"],
    difficulty: "1-Click",
    popularity: "Popular",
    capabilities: "Generates secure meeting links and appends them to appointment confirmation SMS messages."
  }
];

// Developer Code Snippets
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

console.log(\`Lead routed successfully. ID: \${response.id}\`);`,
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

const WORKFLOW_STEPS = [
  {
    id: "widget",
    title: "Inbound Channel",
    desc: "Customer dials office phone line",
    icon: <Phone className="h-5 w-5 text-primary" />,
    payload: {
      event: "call.inbound",
      caller: {
        number: "+15550192834",
        city: "San Francisco",
        source: "Google Local Search"
      },
      duration: "00:02"
    }
  },
  {
    id: "operator",
    title: "Operator AI",
    desc: "Triages symptoms & intent",
    icon: <Sparkles className="h-5 w-5 text-primary" />,
    payload: {
      event: "ai.intent_triaged",
      intent: "emergency_tooth_chipped",
      confidence: 0.994,
      urgency: "high"
    }
  },
  {
    id: "calendar",
    title: "Google Calendar",
    desc: "Locks slot with Dr. Mitchell",
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    payload: {
      event: "calendar.locked",
      chair: "Chair #2",
      provider: "Dr. Mitchell",
      slot: "Tomorrow at 10:00 AM"
    }
  },
  {
    id: "payment",
    title: "Deposit Gate",
    desc: "Processes $50 retainer hold",
    icon: <Zap className="h-5 w-5 text-amber-500" />,
    payload: {
      event: "payment.hold_created",
      amount: 50.00,
      currency: "USD",
      status: "authorized"
    }
  },
  {
    id: "sms",
    title: "SMS Dispatch",
    desc: "Dispatches intake forms",
    icon: <MessageSquare className="h-5 w-5 text-indigo-500" />,
    payload: {
      event: "sms.dispatched",
      to: "+15550192834",
      body: "Appointment locked for tomorrow at 10:00 AM. Click to fill pre-care forms: link.operator.ai/c/283"
    }
  }
];

export default function IntegrationsPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeVisualId, setActiveVisualId] = useState<string>("google-calendar");
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectedIds, setConnectedIds] = useState<string[]>(["google-calendar", "stripe", "twilio"]);
  const [activeCodeTab, setActiveCodeTab] = useState<"api" | "webhook" | "sdk" | "mcp">("api");
  const [isCopied, setIsCopied] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Workflow auto-loop interval simulation
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % WORKFLOW_STEPS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Command palette focus hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "/") {
        if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(CODE_SNIPPETS[activeCodeTab]);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleConnect = (id: string) => {
    if (connectedIds.includes(id)) {
      setConnectedIds(connectedIds.filter((item) => item !== id));
      return;
    }
    setConnectingId(id);
    setTimeout(() => {
      setConnectedIds([...connectedIds, id]);
      setConnectingId(null);
    }, 1200);
  };

  // Filter list
  const filtered = INTEGRATIONS.filter((i) => {
    const matchesCategory = activeCategory === "All" || i.category === activeCategory;
    const matchesSearch =
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featured = INTEGRATIONS.slice(0, 6);

  // Visual layout pre-computed coordinates (center = 50, radius = 37, rounded to 2 decimals)
  // Deterministic values guarantee 100% hydration matching between SSR and Client
  const visualNodes = [
    { id: "google-calendar", label: "Google Cal", logo: LOGOS.googleCalendar, angle: 0, x: 87, y: 50 },
    { id: "outlook", label: "Outlook", logo: LOGOS.outlook, angle: 30, x: 82.04, y: 68.5 },
    { id: "whatsapp", label: "WhatsApp", logo: LOGOS.whatsapp, angle: 60, x: 68.5, y: 82.04 },
    { id: "stripe", label: "Stripe", logo: LOGOS.stripe, angle: 90, x: 50, y: 87 },
    { id: "razorpay", label: "Razorpay", logo: LOGOS.razorpay, angle: 120, x: 31.5, y: 82.04 },
    { id: "zoom", label: "Zoom", logo: LOGOS.zoom, angle: 150, x: 17.96, y: 68.5 },
    { id: "slack", label: "Slack", logo: LOGOS.slack, angle: 180, x: 13, y: 50 },
    { id: "hubspot", label: "HubSpot", logo: LOGOS.hubspot, angle: 210, x: 17.96, y: 31.5 },
    { id: "meta", label: "Meta", logo: LOGOS.meta, angle: 240, x: 31.5, y: 17.96 },
    { id: "calendly", label: "Calendly", logo: LOGOS.calendly, angle: 270, x: 50, y: 13 },
    { id: "twilio", label: "Twilio", logo: LOGOS.twilio, angle: 300, x: 68.5, y: 17.96 },
    { id: "openai", label: "OpenAI", logo: LOGOS.openai, angle: 330, x: 82.04, y: 31.5 },
  ];

  return (
    <div className="relative flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/20">
      <MarketingNav />

      <main className="flex-1 overflow-x-hidden relative">
        {/* Top atmospheric ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.06),transparent_65%)] pointer-events-none z-0" />

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 1: HERO
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="relative mx-auto max-w-5xl px-space-6 pt-space-28 pb-space-12 md:pt-space-32 md:pb-space-16 text-center z-10">
          <GsapScrollSection animation="fade-up">
            <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Unified Ecosystem</span>
            </div>

            <h1 className="text-display-lg md:text-display-xl font-bold tracking-tight leading-display text-foreground mb-space-5 max-w-4xl mx-auto">
              One AI context.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[hsl(260_80%_65%)] to-[hsl(280_75%_55%)]">
                Connected to your entire business.
              </span>
            </h1>

            <p className="mx-auto max-w-xl text-body-md md:text-body-lg text-muted-foreground leading-relaxed">
              Operator connects natively with your calendars, messaging suites, databases, and payment gates with zero fragile webhooks.
            </p>
          </GsapScrollSection>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 2: ELEVATED NETWORK GRAPH VISUALIZER
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="relative max-w-5xl mx-auto px-space-6 pb-space-28 z-10">
          <GsapScrollSection animation="scale-up">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-8 items-center rounded-3xl border border-[hsl(var(--foreground)/0.08)] bg-card/30 backdrop-blur-xs p-space-6 md:p-space-8 overflow-hidden relative shadow-md">
              <div className="absolute inset-0 dot-grid opacity-25 pointer-events-none" />

              {/* Left Side: Circular Orbital Graph (7 cols) */}
              <div className="lg:col-span-7 relative flex items-center justify-center min-h-[380px] md:min-h-[460px]">
                <div className="relative aspect-square w-full max-w-[360px] md:max-w-[430px] flex items-center justify-center select-none">
                  {/* Concentric subtle guide rings */}
                  <div className="absolute inset-4 rounded-full border border-[hsl(var(--foreground)/0.05)] border-dashed pointer-events-none animate-[spin_120s_linear_infinite]" />
                  <div className="absolute inset-16 rounded-full border border-[hsl(var(--foreground)/0.04)] pointer-events-none" />

                  {/* SVG glowing connection pathways */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                    <defs>
                      <linearGradient id="activeLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.4" />
                      </linearGradient>
                    </defs>
                    {visualNodes.map((node) => {
                      const isHovered = activeVisualId === node.id;
                      const isConnected = connectedIds.includes(node.id);

                      return (
                        <path
                          key={node.id}
                          d={`M ${node.x} ${node.y} L 50 50`}
                          stroke={isHovered ? "url(#activeLineGrad)" : isConnected ? "hsl(var(--primary)/0.35)" : "hsl(var(--foreground)/0.06)"}
                          strokeWidth={isHovered ? "0.9" : isConnected ? "0.5" : "0.3"}
                          strokeDasharray={isHovered ? "2 1" : "none"}
                          className="transition-all duration-300"
                        />
                      );
                    })}
                  </svg>

                  {/* Center Core: Operator 3D Logo */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
                    <div className="relative w-18 h-18 md:w-22 md:h-22 flex items-center justify-center rounded-full bg-card shadow-2xl border-2 border-primary/30 p-2.5 select-none group cursor-pointer">
                      <div className="absolute -inset-2 rounded-full bg-primary/20 animate-ping duration-1000 pointer-events-none" />
                      <div className="absolute -inset-4 rounded-full bg-primary/10 animate-pulse pointer-events-none" />
                      <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                        <Image
                          src="/logo.png"
                          alt="Operator AI Core"
                          width={80}
                          height={80}
                          unoptimized
                          priority
                          className="w-full h-full object-contain drop-shadow-md transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Orbital Integration Nodes */}
                  {visualNodes.map((node) => {
                    const isHovered = activeVisualId === node.id;
                    const isConnected = connectedIds.includes(node.id);

                    return (
                      <div
                        key={node.id}
                        onMouseEnter={() => setActiveVisualId(node.id)}
                        onClick={() => setActiveVisualId(node.id)}
                        style={{
                          left: `${node.x}%`,
                          top: `${node.y}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                        className={cn(
                          "absolute z-20 cursor-pointer transition-all duration-300",
                          isHovered ? "scale-125 z-40" : "scale-100"
                        )}
                      >
                        <div
                          className={cn(
                            "w-11 h-11 rounded-full p-[2px] transition-all duration-300 bg-card border shadow-sm",
                            isHovered
                              ? "border-primary shadow-lg shadow-primary/30 ring-2 ring-primary/20"
                              : isConnected
                              ? "border-primary/40"
                              : "border-[hsl(var(--foreground)/0.08)] hover:border-[hsl(var(--foreground)/0.18)]"
                          )}
                        >
                          <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center relative p-space-1.5 bg-white">
                            {node.logo}
                            {isConnected && (
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-card" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Side: Detailed Capabilities Inspector Card (5 cols) */}
              <div className="lg:col-span-5 relative z-30 flex flex-col justify-center">
                {(() => {
                  const activeNode = INTEGRATIONS.find((i) => i.id === activeVisualId) || INTEGRATIONS[0];
                  const isConnected = connectedIds.includes(activeNode.id);
                  const isLoading = connectingId === activeNode.id;

                  return (
                    <div className="rounded-2xl border border-[hsl(var(--foreground)/0.08)] bg-card/70 backdrop-blur-xs p-space-6 shadow-md transition-all duration-300">
                      <div className="flex items-center gap-space-3.5 mb-space-5">
                        <div className="w-12 h-12 rounded-xl bg-white border border-[hsl(var(--foreground)/0.08)] p-space-2 flex items-center justify-center shadow-xs shrink-0">
                          {activeNode.logo}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <h4 className="text-title-md font-bold text-foreground leading-snug truncate">
                            {activeNode.name}
                          </h4>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono font-semibold">
                            {activeNode.category}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "ml-auto text-[9px] uppercase font-mono tracking-wider px-space-2.5 py-space-1 rounded-full border font-bold whitespace-nowrap leading-none",
                            isConnected
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : "bg-[hsl(var(--foreground)/0.03)] text-muted-foreground border-[hsl(var(--foreground)/0.06)]"
                          )}
                        >
                          {isConnected ? "Linked" : "Available"}
                        </span>
                      </div>

                      <p className="text-body-sm text-muted-foreground leading-relaxed mb-space-5">
                        {activeNode.desc}
                      </p>

                      <div className="border-t border-[hsl(var(--foreground)/0.05)] pt-space-4 mb-space-5">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 block mb-space-1.5 font-semibold">
                          Active AI Function:
                        </span>
                        <p className="text-caption text-foreground/85 leading-relaxed bg-[hsl(var(--foreground)/0.02)] border border-[hsl(var(--foreground)/0.04)] p-space-3 rounded-xl font-medium">
                          {activeNode.capabilities}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-space-3 pt-space-2">
                        <div className="text-[11px] text-muted-foreground font-mono">
                          <span>Difficulty: </span>
                          <span className="text-foreground font-bold">{activeNode.difficulty}</span>
                        </div>

                        {activeNode.status === "live" ? (
                          <Button
                            onClick={() => handleConnect(activeNode.id)}
                            variant={isConnected ? "outline" : "default"}
                            size="sm"
                            disabled={isLoading}
                            className="font-semibold text-caption h-8"
                          >
                            {isLoading ? "Connecting..." : isConnected ? "Disconnect" : "Connect Integration"}
                          </Button>
                        ) : (
                          <span className="text-caption font-semibold text-amber-500 bg-amber-500/10 px-space-2.5 py-space-1 rounded-full border border-amber-500/15">
                            Coming Soon
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </GsapScrollSection>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 3: CORE MAPPINGS (Featured 6 Integrations)
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="mx-auto max-w-5xl px-space-6 pb-space-28 z-10 relative">
          <GsapScrollSection animation="fade-up">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-4 mb-space-12">
              <div>
                <div className="inline-flex items-center gap-space-2 px-space-3 py-space-1 rounded-full border border-primary/20 bg-primary/5 mb-space-4">
                  <span className="text-[10px] uppercase font-mono tracking-widest font-bold text-primary">Core Mappings</span>
                </div>
                <h2 className="text-heading-xl tracking-tight-md font-bold text-foreground">
                  Featured Integrations.
                  <br />
                  <span className="text-primary">Native zero-code adapters.</span>
                </h2>
              </div>
              <p className="text-caption md:text-body-sm text-muted-foreground max-w-xs leading-relaxed">
                Pre-built two-way synchronizations configured for dental clinics, law practices, and service businesses.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-6">
              {featured.map((item) => (
                <IntegrationCard
                  key={item.id}
                  integration={item}
                  variant="featured"
                  isConnected={connectedIds.includes(item.id)}
                  isLoading={connectingId === item.id}
                  onConnect={handleConnect}
                />
              ))}
            </div>
          </GsapScrollSection>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 4: AUTOMATION TIMELINE & PAYLOAD INSPECTOR
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="mx-auto max-w-5xl px-space-6 pb-space-28 z-10 relative">
          <GsapScrollSection animation="fade-up">
            <div className="text-center mb-space-12">
              <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
                <Workflow className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Intelligent Routing</span>
              </div>
              <h2 className="text-heading-xl tracking-tight-md font-bold text-foreground">
                Automation Showcases.
                <br />
                <span className="text-primary">Ecosystem Workflow In Action</span>
              </h2>
            </div>

            <div className="relative rounded-3xl border border-[hsl(var(--foreground)/0.08)] bg-card/25 backdrop-blur-xs p-space-6 md:p-space-10 overflow-hidden shadow-sm">
              <div className="absolute inset-0 dot-grid opacity-15 pointer-events-none" />

              {/* Status Header */}
              <div className="flex items-center justify-between mb-space-8 relative z-10">
                <div className="flex items-center gap-space-2.5">
                  <span className="relative flex h-2 w-2">
                    <span
                      className={cn(
                        "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                        isPaused ? "bg-amber-400" : "bg-emerald-400"
                      )}
                    />
                    <span
                      className={cn(
                        "relative inline-flex rounded-full h-2 w-2",
                        isPaused ? "bg-amber-500" : "bg-emerald-500"
                      )}
                    />
                  </span>
                  <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
                    {isPaused ? "Simulation Paused • Click any step" : "Live Automation Simulation"}
                  </span>
                </div>
                {isPaused && (
                  <button
                    onClick={() => setIsPaused(false)}
                    className="text-caption text-primary hover:text-primary-hover font-bold transition-colors cursor-pointer select-none"
                  >
                    Resume Loop
                  </button>
                )}
              </div>

              {/* Steps Track */}
              <div className="relative z-10 flex flex-col lg:flex-row items-stretch justify-between gap-space-4 mb-space-8">
                {WORKFLOW_STEPS.map((step, idx) => {
                  const isActive = activeStep === idx;
                  return (
                    <div
                      key={step.id}
                      onClick={() => {
                        setActiveStep(idx);
                        setIsPaused(true);
                      }}
                      className={cn(
                        "flex-1 p-space-4 rounded-xl border transition-all duration-300 cursor-pointer select-none",
                        isActive
                          ? "border-primary bg-primary/10 shadow-xs"
                          : "border-[hsl(var(--foreground)/0.06)] bg-card/40 hover:border-[hsl(var(--foreground)/0.12)]"
                      )}
                    >
                      <div className="flex items-center gap-space-3 mb-space-2">
                        <span className={cn(
                          "w-6 h-6 rounded flex items-center justify-center font-mono text-[11px] font-bold shrink-0",
                          isActive ? "bg-primary text-primary-foreground" : "bg-[hsl(var(--foreground)/0.05)] text-muted-foreground"
                        )}>
                          0{idx + 1}
                        </span>
                        <h4 className="text-body-sm font-semibold text-foreground truncate">{step.title}</h4>
                      </div>
                      <p className="text-caption text-muted-foreground leading-snug line-clamp-2">
                        {step.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Payload Inspector Terminal */}
              <div className="relative z-10 border border-[hsl(var(--foreground)/0.08)] bg-black/95 rounded-2xl overflow-hidden shadow-md">
                <div className="flex items-center justify-between px-space-4 py-space-2.5 border-b border-white/5 bg-white/5">
                  <div className="flex items-center gap-space-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                    <span className="text-[10px] text-zinc-400 font-mono ml-space-2 uppercase tracking-wider">
                      payload_inspector.json
                    </span>
                  </div>
                  <div className="flex items-center gap-space-3 font-mono text-[10px]">
                    <span className="text-zinc-500">active_step:</span>
                    <span className="text-primary font-bold">{WORKFLOW_STEPS[activeStep].id}</span>
                  </div>
                </div>

                <div className="p-space-5 font-mono text-caption text-zinc-300 overflow-x-auto leading-relaxed">
                  <pre className="text-left">
                    {JSON.stringify(WORKFLOW_STEPS[activeStep].payload, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </GsapScrollSection>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 5: DIRECTORY EXPLORER (Broken Monotony with Grid & Density List)
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="mx-auto max-w-5xl px-space-6 pb-space-28 z-10 relative">
          <GsapScrollSection animation="fade-up">
            <div className="text-center mb-space-10">
              <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Directory Index</span>
              </div>
              <h2 className="text-heading-xl tracking-tight-md font-bold text-foreground">
                Explore Directory.
                <br />
                <span className="text-primary">Search & Filter Integrations</span>
              </h2>
            </div>

            {/* Search Bar + View Mode Switcher */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-space-4 mb-space-8">
              <div className="relative flex-1 w-full max-w-lg">
                <div className="relative rounded-xl border border-[hsl(var(--foreground)/0.08)] bg-card/60 p-space-2 flex items-center gap-space-2 shadow-xs">
                  <Search className="h-4 w-4 text-muted-foreground/60 ml-space-2 shrink-0" />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-body-sm outline-none border-none py-space-1 text-foreground placeholder:text-muted-foreground/50"
                    placeholder="Search tools, telephony, calendars, CRMs..."
                  />
                  <div className="hidden sm:flex items-center gap-1 bg-[hsl(var(--foreground)/0.04)] border border-[hsl(var(--foreground)/0.08)] px-space-2 py-0.5 rounded text-[10px] text-muted-foreground font-mono shrink-0 mr-space-1">
                    <span>⌘</span>
                    <span>K</span>
                  </div>
                </div>
              </div>

              {/* View Mode Toggle: Grid vs Compact List */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl border border-[hsl(var(--foreground)/0.08)] bg-card/40 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-1.5 rounded-lg text-caption font-semibold transition-colors cursor-pointer flex items-center gap-1.5",
                    viewMode === "grid"
                      ? "bg-foreground text-background shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Grid View"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden md:inline text-[11px]">Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-1.5 rounded-lg text-caption font-semibold transition-colors cursor-pointer flex items-center gap-1.5",
                    viewMode === "list"
                      ? "bg-foreground text-background shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Compact List View"
                >
                  <ListFilter className="h-4 w-4" />
                  <span className="hidden md:inline text-[11px]">Dense List</span>
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="overflow-x-auto w-full mb-space-8 no-scrollbar">
              <div className="inline-flex items-center gap-space-2 pb-space-1">
                {CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat;
                  const count =
                    cat === "All"
                      ? INTEGRATIONS.length
                      : INTEGRATIONS.filter((i) => i.category === cat).length;

                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        "h-8 px-space-3.5 text-caption rounded-full font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "border border-[hsl(var(--foreground)/0.06)] bg-card/30 text-muted-foreground hover:text-foreground hover:bg-card/60"
                      )}
                    >
                      <span>{cat}</span>
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                          isActive ? "bg-white/20 text-white" : "bg-[hsl(var(--foreground)/0.05)] text-muted-foreground"
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Results Grid or Dense List View */}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-5">
                {filtered.map((item) => (
                  <IntegrationCard
                    key={item.id}
                    integration={item}
                    variant="directory"
                    isConnected={connectedIds.includes(item.id)}
                    isLoading={connectingId === item.id}
                    onConnect={handleConnect}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-space-2.5">
                {filtered.map((item) => (
                  <IntegrationCard
                    key={item.id}
                    integration={item}
                    variant="compact-row"
                    isConnected={connectedIds.includes(item.id)}
                    isLoading={connectingId === item.id}
                    onConnect={handleConnect}
                  />
                ))}
              </div>
            )}

            {filtered.length === 0 && (
              <div className="text-center py-space-16 text-muted-foreground rounded-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/20">
                <Search className="h-8 w-8 mx-auto mb-space-3 opacity-30 text-primary" />
                <p className="text-body-sm font-semibold text-foreground">No integrations match your search</p>
                <p className="text-caption text-muted-foreground mt-space-1">
                  Try other keywords or request a custom webhook adapter below.
                </p>
              </div>
            )}
          </GsapScrollSection>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 6: DEVELOPER API PLAYGROUND
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="mx-auto max-w-5xl px-space-6 pb-space-28 z-10 relative">
          <GsapScrollSection animation="fade-up">
            <div className="text-center mb-space-12">
              <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
                <Terminal className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Custom SDKs</span>
              </div>
              <h2 className="text-heading-xl tracking-tight-md font-bold text-foreground">
                Engineered for customization.
                <br />
                <span className="text-primary">Integrate anything with code.</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-6 items-stretch">
              {/* Left pane: selector tabs */}
              <div className="flex flex-col gap-space-2 justify-center">
                {[
                  { id: "api", title: "REST API Client", desc: "Interact directly via RESTful requests", icon: <Terminal className="h-4 w-4" /> },
                  { id: "webhook", title: "Webhook Payload", desc: "Listen for real-time appointment events", icon: <FileJson className="h-4 w-4" /> },
                  { id: "sdk", title: "Python SDK", desc: "Query conversations programmatically", icon: <Terminal className="h-4 w-4" /> },
                  { id: "mcp", title: "MCP Config", desc: "Model Context Protocol configuration", icon: <Key className="h-4 w-4" /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCodeTab(tab.id as any)}
                    className={cn(
                      "text-left p-space-4 rounded-xl border transition-all duration-200 flex items-start gap-space-3.5 cursor-pointer",
                      activeCodeTab === tab.id
                        ? "border-primary/30 bg-card/90 shadow-xs"
                        : "border-transparent hover:bg-card/40"
                    )}
                  >
                    <div
                      className={cn(
                        "p-space-2 rounded-lg shrink-0",
                        activeCodeTab === tab.id ? "bg-primary/10 text-primary" : "bg-[hsl(var(--foreground)/0.03)] text-muted-foreground"
                      )}
                    >
                      {tab.icon}
                    </div>
                    <div>
                      <span className="text-body-sm font-semibold text-foreground block">{tab.title}</span>
                      <span className="text-caption text-muted-foreground block mt-0.5 leading-snug">{tab.desc}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Right pane: code playground */}
              <div className="lg:col-span-2 relative rounded-2xl border border-[hsl(var(--foreground)/0.08)] bg-[#0A0E17] text-slate-200 overflow-hidden flex flex-col min-h-96 shadow-lg">
                <div className="flex items-center justify-between px-space-5 py-space-3 border-b border-slate-800 bg-slate-900/60 shrink-0">
                  <div className="flex items-center gap-space-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span className="text-caption font-mono text-slate-400 ml-space-2.5">
                      {activeCodeTab === "api" && "routes.ts"}
                      {activeCodeTab === "webhook" && "webhook.json"}
                      {activeCodeTab === "sdk" && "sdk_query.py"}
                      {activeCodeTab === "mcp" && "mcp.json"}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 text-caption font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800 p-1.5 rounded-md transition-colors cursor-pointer"
                  >
                    {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{isCopied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <div className="flex-1 p-space-6 overflow-auto font-mono text-caption leading-relaxed bg-[#07090E]">
                  <pre className="text-left whitespace-pre-wrap select-all">
                    {CODE_SNIPPETS[activeCodeTab]}
                  </pre>
                </div>
              </div>
            </div>
          </GsapScrollSection>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 7: REQUEST CUSTOM INTEGRATION
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="relative border-t border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.015)] py-space-24 z-10">
          <GsapScrollSection animation="scale-up" className="container mx-auto max-w-4xl px-space-6 text-center">
            <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">SLA Custom Queue</span>
            </div>
            <h2 className="text-heading-xl tracking-tight-xs mb-space-4 max-w-xl mx-auto font-bold leading-snug">
              Missing something?
              <br />
              Request a <span className="text-primary">custom integration.</span>
            </h2>
            <p className="text-body-md text-muted-foreground mb-space-8 max-w-md mx-auto leading-relaxed">
              Agencies and Business plan customers get priority queue slots. Most custom tools ship within 4 weeks.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-6 text-left max-w-2xl mx-auto mb-space-10">
              <div className="p-space-5 rounded-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/60 backdrop-blur-xs flex gap-space-3.5 shadow-xs">
                <div className="p-space-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl h-fit shrink-0">
                  <Check className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-body-sm font-bold text-foreground mb-space-1">Priority SLA Queuing</h4>
                  <p className="text-caption text-muted-foreground leading-relaxed">
                    Fast-tracked scoping, sandbox testing, and production rollout matching your security requirements.
                  </p>
                </div>
              </div>
              <div className="p-space-5 rounded-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/60 backdrop-blur-xs flex gap-space-3.5 shadow-xs">
                <div className="p-space-2.5 bg-primary/10 text-primary rounded-xl h-fit shrink-0">
                  <Check className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-body-sm font-bold text-foreground mb-space-1">Custom Webhook Mappings</h4>
                  <p className="text-caption text-muted-foreground leading-relaxed">
                    Map custom JSON schemas, authorization headers, and parameter transforms directly inside your dashboard.
                  </p>
                </div>
              </div>
            </div>

            <Button asChild size="lg" className="w-full sm:w-auto font-semibold">
              <Link href="/contact" className="flex items-center gap-2">
                Request Integration <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </GsapScrollSection>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}