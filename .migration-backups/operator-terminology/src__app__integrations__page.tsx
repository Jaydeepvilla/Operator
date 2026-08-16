"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { cn } from "@/components/shared/utils";

import googleIcon from "@/assets/google.svg";
import microsoftIcon from "@/assets/microsoft.svg";
import calendlyIcon from "@/assets/calendly.svg";
import stripeIcon from "@/assets/stripe.svg";
import openaiIcon from "@/assets/openai.svg";
import razorpayIcon from "@/assets/razorpay.svg";
import slackIcon from "@/assets/slack-logo.svg";
import whatsappIcon1 from "@/assets/whatsapp.svg";
import whatsappIcon from "@/assets/whatsapp-text.svg";
import zoomIcon from "@/assets/zoom-app.svg";
import hubspotIcon from "@/assets/hubspot.svg";
import metaIcon from "@/assets/meta.svg";
import {
 Sparkles,
 ArrowRight,
 Search,
 CheckCircle2,
 Clock,
 Cpu,
 Code2,
 Terminal,
 Copy,
 Check,
 Zap,
 Plus,
 MessageSquare,
 Calendar,
 DollarSign,
 Workflow,
 ChevronRight,
 ShieldCheck,
 FileJson,
 Key
} from "lucide-react";

// ─── TYPES & DATA ────────────────────────────────────────────────────────────

interface Integration {
 id: string;
 name: string;
 category: string;
 status: "live" | "coming-soon";
 logo: React.ReactNode;
 desc: string;
 features: string[];
 difficulty: "Instant" | "1-Click" | "Setup Required";
 popularity: "Core" | "Popular" | "Standard";
 capabilities: string;
}

// Custom Premium SVG Logos for Integrations
// Custom Premium SVG Logos for Integrations
const LOGOS = {
 operator: (className = "h-8 w-auto object-contain text-primary") => (
 <svg viewBox="0 0 24 24" fill="none" className={className}>
 <path
 d="M 3 13 L 3 8 A 5 5 0 0 1 8 3 L 16 3 A 5 5 0 0 1 21 8 L 21 16 A 5 5 0 0 1 16 21 L 9 21 A 2 2 0 0 1 9 17 L 15 17 A 2 2 0 0 0 17 15 L 17 9 A 2 2 0 0 0 15 7 L 9 7 A 2 2 0 0 0 7 9 L 7 13 A 2 2 0 0 1 3 13 Z"
 fill="currentColor"
 />
 <rect x="3" y="17" width="4" height="4" rx="1.2" fill="currentColor" />
 </svg>
 ),
 googleCalendar: (
 <img src={googleIcon.src || googleIcon} alt="Google Calendar" className="h-8 w-auto object-contain max-w-full" />
 ),
 outlook: (
 <img src={microsoftIcon.src || microsoftIcon} alt="Outlook" className="h-8 w-auto object-contain max-w-full" />
 ),
 whatsapp: (
 <img src={whatsappIcon.src || whatsappIcon} alt="WhatsApp" className="h-8 w-auto object-contain max-w-full" />
 ),
 stripe: (
 <img src={stripeIcon.src || stripeIcon} alt="Stripe" className="h-8 w-auto object-contain max-w-full" />
 ),
 zoom: (
 <img src={zoomIcon.src || zoomIcon} alt="Zoom" className="h-8 w-auto object-contain max-w-full" />
 ),
 slack: (
 <img src={slackIcon.src || slackIcon} alt="Slack" className="h-8 w-auto object-contain max-w-full" />
 ),
 hubspot: (
 <img src={hubspotIcon.src || hubspotIcon} alt="HubSpot" className="h-8 w-auto object-contain max-w-full" />
 ),
 meta: (
 <img src={metaIcon.src || metaIcon} alt="Meta" className="h-8 w-auto object-contain max-w-full" />
 ),
 calendly: (
 <img src={calendlyIcon.src || calendlyIcon} alt="Calendly" className="h-8 w-auto object-contain max-w-full" />
 ),
 msg91: (
 <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-orange-600/10 border border-orange-500/20 text-orange-500">
 <MessageSquare className="h-4.5 w-4.5" />
 </div>
 ),
 openai: (
 <img src={openaiIcon.src || openaiIcon} alt="OpenAI" className="h-8 w-auto object-contain max-w-full" />
 ),
 razorpay: (
 <img src={razorpayIcon.src || razorpayIcon} alt="Razorpay" className="h-8 w-auto object-contain max-w-full" />
 )
};

const CATEGORIES = [
 "All",
 "Communication",
 "Voice",
 "Payments",
 "Scheduling",
 "CRM",
 "AI",
 "Developer",
 "Analytics"
];

const INTEGRATIONS: Integration[] = [
 {
 id: "google-calendar",
 name: "Google Calendar",
 category: "Scheduling",
 status: "live",
 logo: LOGOS.googleCalendar,
 desc: "Sync appointments to Google Calendar. Real-time availability checks and double-booking avoidance.",
 features: ["Two-way sync", "Real-time availability check", "Buffer-time configuration", "Multi-calendar mappings"],
 difficulty: "Instant",
 popularity: "Core",
 capabilities: "Checks organizational calendars instantly and posts newly booked leads directly into availability blocks."
 },
 {
 id: "calendly",
 name: "Calendly",
 category: "Scheduling",
 status: "live",
 logo: LOGOS.calendly,
 desc: "Connect your existing Calendly event types. AI books meetings using your standard schedules.",
 features: ["Event type sync", "Direct URL embedding", "Round-robin schedules", "Timezone alignment"],
 difficulty: "Instant",
 popularity: "Popular",
 capabilities: "Extracts custom questions from Calendly links and populates them using qualified lead details during chats."
 },
 {
 id: "whatsapp",
 name: "WhatsApp Business",
 category: "Communication",
 status: "live",
 logo: LOGOS.whatsapp,
 desc: "Send alerts, transactional reminders, and run customer intake qualification via official WhatsApp Business API.",
 features: ["Template alerts", "Intake qualification flow", "Rich-media messaging", "Broadcast sequences"],
 difficulty: "1-Click",
 popularity: "Core",
 capabilities: "Initiates post-call check-ins and qualification forms directly over WhatsApp messages."
 },
 {
  id: "msg91",
  name: "MSG91 SMS",
  category: "Communication",
  status: "live",
  logo: LOGOS.msg91,
  desc: "Send and receive SMS messages. Enterprise-grade SMS delivery flow APIs.",
  features: ["OTP authentication", "Template-based flow SMS", "High throughput routing", "Real-time delivery status reports"],
  difficulty: "1-Click",
  popularity: "Core",
  capabilities: "Triggers notifications and check-ins via the premium MSG91 routing framework."
  },
 {
 id: "stripe",
 name: "Stripe",
 category: "Payments",
 status: "live",
 logo: LOGOS.stripe,
 desc: "Collect deposits, handle booking fees, and trigger invoices directly inside the voice or chat widget.",
 features: ["Direct deposit logic", "In-call credit card processing", "Automatic invoicing", "No-show penalty locks"],
 difficulty: "1-Click",
 popularity: "Core",
 capabilities: "Validates card holds in real-time before finalizing appointment holds on the schedule."
 },
 {
 id: "slack",
 name: "Slack",
 category: "Communication",
 status: "live",
 logo: LOGOS.slack,
 desc: "Receive real-time notifications about qualified leads, booked appointments, or live handover alerts.",
 features: ["Handover channels", "Lead summary alerts", "Direct message routing", "Interactive notification actions"],
 difficulty: "1-Click",
 popularity: "Popular",
 capabilities: "Alerts agents when a caller requests human escalation, with a quick-link to drop into the browser call."
 },
 {
 id: "zoom",
 name: "Zoom Meetings",
 category: "Voice",
 status: "coming-soon",
 logo: LOGOS.zoom,
 desc: "Generate custom virtual meeting URLs instantly upon appointment confirmation.",
 features: ["Auto Zoom link creation", "Dynamic password locking", "Host delegation keys", "Calendar sync updates"],
 difficulty: "1-Click",
 popularity: "Popular",
 capabilities: "Appends unique video links to calendar events and transactional reminder templates."
 },
 {
 id: "hubspot",
 name: "HubSpot CRM",
 category: "CRM",
 status: "coming-soon",
 logo: LOGOS.hubspot,
 desc: "Sync leads, qualified profiles, call recordings, and chat transcripts directly to contact records.",
 features: ["Contact profile syncing", "Pipeline deals updates", "Call log timeline additions", "Custom intake variables mapping"],
 difficulty: "Setup Required",
 popularity: "Core",
 capabilities: "Maps qualified lead attributes directly to matching custom fields inside HubSpot pipelines."
 },
 {
 id: "meta",
 name: "Meta Messenger",
 category: "Communication",
 status: "coming-soon",
 logo: LOGOS.meta,
 desc: "Handle customer queries and schedule appointments natively from Facebook DMs and Instagram DMs.",
 features: ["Instagram DM integration", "Facebook page messaging", "Intake mapping", "Ad attribution trackers"],
 difficulty: "Setup Required",
 popularity: "Popular",
 capabilities: "Qualifies social media message leads using the exact same playbook as your website chatbot."
 },
 {
 id: "outlook",
 name: "Microsoft Outlook",
 category: "Scheduling",
 status: "live",
 logo: LOGOS.outlook,
 desc: "Seamless synchronization with Outlook Calendar and Microsoft 365 schedules.",
 features: ["M365 accounts sync", "Outlook calendar routing", "Real-time availability", "Teams meeting support"],
 difficulty: "Instant",
 popularity: "Standard",
 capabilities: "Monitors Outlook calendar flags to block availability dynamically on Operator receptionist grids."
 },
 {
 id: "openai",
 name: "OpenAI GPT-4",
 category: "AI",
 status: "live",
 logo: LOGOS.openai,
 desc: "The baseline semantic intelligence engine. Custom model fine-tuning for your business domain.",
 features: ["Deep language context mapping", "Semantic intent routers", "Zero-shot profile classifiers", "Tool calls handler"],
 difficulty: "Setup Required",
 popularity: "Core",
 capabilities: "Translates conversational intents into structured API payloads for other connected integrations."
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
 title: "Website Widget",
 desc: "Customer schedules call",
 icon: <MessageSquare className="h-5 w-5 text-blue-500" />,
 color: "bg-blue-500/10 text-blue-500",
 glowColor: "shadow-blue-500/20",
 payload: {
 event: "widget.booking_request",
 visitor: {
 id: "vis_8b2m9",
 page: "/pricing"
 },
 message: "Can I book a consultation?"
 }
 },
 {
 id: "operator",
 title: "Operator AI",
 desc: "Qualifies booking intent",
 logo: LOGOS.operator("w-5.5 h-5.5 text-black "),
 isBrand: true,
 color: "bg-neutral-500/10 text-neutral-500",
 glowColor: "shadow-primary/20",
 payload: {
 event: "ai.intent_classified",
 intent: "schedule_meeting",
 confidence: 0.99
 }
 },
 {
 id: "calendar",
 title: "Google Calendar",
 desc: "Syncs agent availability",
 logo: LOGOS.googleCalendar,
 isBrand: true,
 color: "bg-blue-500/10 text-blue-500",
 glowColor: "shadow-blue-500/20",
 payload: {
 event: "calendar.checked",
 selected_slot: {
 start: "2026-07-19T10:00:00Z",
 reserved: true
 }
 }
 },
 {
 id: "stripe",
 title: "Stripe Payment",
 desc: "Collects deposit hold",
 logo: LOGOS.stripe,
 isBrand: true,
 color: "bg-indigo-500/10 text-indigo-500",
 glowColor: "shadow-indigo-500/20",
 payload: {
 event: "payment.hold_created",
 amount: 5000,
 currency: "usd",
 status: "success"
 }
 },
 {
 id: "msg91",
 title: "MSG91 SMS",
 desc: "Sends SMS reminder",
 logo: LOGOS.msg91,
 isBrand: true,
 color: "bg-orange-500/10 text-orange-500",
 glowColor: "shadow-orange-500/20",
 payload: {
 event: "sms.dispatched",
 to: "+15550199",
 body: "Consultation confirmed tomorrow at 10:00 AM.",
 status: "sent"
 }
 }
];

export default function IntegrationsPage() {
 const [activeCategory, setActiveCategory] = useState("All");
 const [searchQuery, setSearchQuery] = useState("");
 const [activeVisualId, setActiveVisualId] = useState<string>("google-calendar");
 const [connectingId, setConnectingId] = useState<string | null>(null);
 const [connectedIds, setConnectedIds] = useState<string[]>(["google-calendar", "openai"]);
 const [activeCodeTab, setActiveCodeTab] = useState<"api" | "webhook" | "sdk" | "mcp">("api");
 const [isCopied, setIsCopied] = useState(false);
 const [activeStep, setActiveStep] = useState(0);
 const [isPaused, setIsPaused] = useState(false);
 const searchInputRef = useRef<HTMLInputElement>(null);

 // Workflow auto-loop interval simulation
 useEffect(() => {
 if (isPaused) return;
 const interval = setInterval(() => {
 setActiveStep((prev) => (prev + 1) % 5);
 }, 4000);
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
 }, 1500);
 };

 // Filter list
 const filtered = INTEGRATIONS.filter((i) => {
 const matchesCategory = activeCategory === "All" || i.category === activeCategory;
 const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.desc.toLowerCase().includes(searchQuery.toLowerCase());
 return matchesCategory && matchesSearch;
 });

 const featured = INTEGRATIONS.slice(0, 6);

 // Visual layout circle math for AI Visualizer
 const visualNodes = [
 { id: "google-calendar", label: "Google", logo: LOGOS.googleCalendar, angle: 0 },
 { id: "outlook", label: "Outlook", logo: LOGOS.outlook, angle: 32 },
 { id: "whatsapp", label: "WhatsApp", logo: LOGOS.whatsapp, angle: 65 },
 { id: "stripe", label: "Stripe", logo: LOGOS.stripe, angle: 98 },
 { id: "zoom", label: "Zoom", logo: LOGOS.zoom, angle: 131 },
 { id: "slack", label: "Slack", logo: LOGOS.slack, angle: 164 },
 { id: "hubspot", label: "HubSpot", logo: LOGOS.hubspot, angle: 197 },
 { id: "meta", label: "Meta", logo: LOGOS.meta, angle: 230 },
 { id: "calendly", label: "Calendly", logo: LOGOS.calendly, angle: 263 },
 { id: "msg91", label: "MSG91", logo: LOGOS.msg91, angle: 296 },
 { id: "openai", label: "OpenAI", logo: LOGOS.openai, angle: 329 }
 ];

 return (
 <div className="relative flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/20">
 <MarketingNav />

 <main className="flex-1 overflow-x-hidden relative">
 {/* Glows */}
 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.04),transparent_60%)] pointer-events-none z-0" />

 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 1: HERO
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <section className="relative mx-auto max-w-5xl px-space-6 pt-space-28 pb-space-12 text-center z-10">
 <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 radius-full border border-primary/20 bg-primary/5 mb-space-6 animate-fade-in">
 <Sparkles className="h-3.5 w-3.5 text-primary" />
 <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Unified Ecosystem</span>
 </div>
 <h1 className="text-display-xl tracking-tight-xs leading-display text-foreground mb-space-5 max-w-4xl mx-auto">
 One AI context.
 <br />
 <span className="text-primary">Connected to your entire business.</span>
 </h1>
 <p className="mx-auto max-w-xl text-title-lg text-muted-foreground leading-relaxed">
 Operator connects natively with your calendars, messaging suites, databases, and payment gates. No complex piping required.
 </p>
 </section>

 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 2: AI VISUALIZATION
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <section className="relative max-w-5xl mx-auto px-space-6 pb-space-24 z-10">
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-8 items-center rounded-3xl border border-[hsl(var(--foreground)/0.06)] bg-card/25 backdrop-blur-xs p-space-8 overflow-hidden relative">
 {/* Background Grid */}
 <div className="absolute inset-space-0 dot-grid opacity-35" />

 {/* Left Side: Circular Node Graph (column-span 7) */}
 <div className="lg:col-span-7 relative flex items-center justify-center min-h-[380px] md:min-h-[460px]">
 <div className="relative aspect-square w-full max-w-[360px] md:max-w-[420px] flex items-center justify-center overflow-visible select-none">
 {/* Glowing lines representation from nodes to center */}
 <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
 <defs>
 <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
 <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
 <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
 </linearGradient>
 </defs>
 {visualNodes.map((node) => {
 const rad = (node.angle * Math.PI) / 180;
 const startX = 50 + Math.cos(rad) * 36;
 const startY = 50 + Math.sin(rad) * 36;
 const isHovered = activeVisualId === node.id;
 return (
 <path
 key={node.id}
 d={`M ${startX} ${startY} L 50 50`}
 stroke={isHovered ? "hsl(var(--primary))" : "hsl(var(--foreground)/0.08)"}
 strokeWidth={isHovered ? "0.6" : "0.3"}
 strokeDasharray={isHovered ? "2 1" : "none"}
 className="transition-all duration-300"
 />
 );
 })}
 </svg>

 {/* Center Core: Operator */}
 <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
 <div className="relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center rounded-full bg-black text-background shadow-lg border border-[hsl(var(--foreground)/0.08)] p-space-4.5 md:p-space-5.5">
 <div className="absolute -inset-space-1.5 rounded-full bg-primary/20 animate-ping duration-1000" />
 <div className="absolute -inset-space-3 rounded-full bg-primary/10 animate-pulse" />
 {LOGOS.operator("w-full h-full text-background")}
 </div>
 </div>

 {/* Orbital Integration Nodes */}
 {visualNodes.map((node) => {
 const rad = (node.angle * Math.PI) / 180;
 const xPos = 50 + Math.cos(rad) * 36;
 const yPos = 50 + Math.sin(rad) * 36;
 const isHovered = activeVisualId === node.id;
 const isConnected = connectedIds.includes(node.id);

 return (
 <div
 key={node.id}
 onMouseEnter={() => setActiveVisualId(node.id)}
 style={{
 left: `${xPos}%`,
 top: `${yPos}%`,
 transform: "translate(-50%, -50%)"
 }}
 className={cn(
 "absolute z-20 cursor-pointer transition-all duration-300",
 isHovered ? "scale-115" : "scale-100"
 )}
 >
 <div className={cn(
 "w-11 h-11 rounded-full p-[2px] transition-all duration-300 bg-card border",
 isHovered
 ? "border-primary shadow-lg shadow-primary/20"
 : "border-[hsl(var(--foreground)/0.06)] hover:border-[hsl(var(--foreground)/0.15)]"
 )}>
 <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center relative p-space-2 bg-white">
 {node.logo}
 {isConnected && (
 <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card flex items-center justify-center" />
 )}
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Right Side: Detailed capabilities card (column-span 5) */}
 <div className="lg:col-span-5 relative z-30 flex flex-col justify-center">
 {(() => {
 const activeNode = INTEGRATIONS.find((i) => i.id === activeVisualId);
 if (!activeNode) return null;
 const isConnected = connectedIds.includes(activeNode.id);
 const isLoading = connectingId === activeNode.id;
 return (
 <div className="rounded-2xl border border-[hsl(var(--foreground)/0.08)] bg-card/65 p-space-6 shadow-md transition-all duration-300">
 <div className="flex items-center gap-space-3 mb-space-5">
 <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-[hsl(var(--foreground)/0.08)] p-space-2 flex items-center justify-center shadow-2xs">
 {activeNode.logo}
 </div>
 <div className="flex flex-col">
 <h4 className="text-title-md font-bold text-foreground leading-none mb-space-1.5">{activeNode.name}</h4>
 <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">{activeNode.category}</span>
 </div>
 <span className={cn(
 "ml-auto text-[9px] uppercase tracking-wider px-space-2.5 py-space-1 rounded-full border font-bold whitespace-nowrap leading-none",
 isConnected
 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
 : "bg-[hsl(var(--foreground)/0.03)] text-muted-foreground border-[hsl(var(--foreground)/0.06)]"
 )}>
 {isConnected ? "Connected" : "Not Linked"}
 </span>
 </div>

 <p className="text-body-sm text-muted-foreground leading-relaxed mb-space-5">
 {activeNode.desc}
 </p>

 <div className="border-t border-[hsl(var(--foreground)/0.05)] pt-space-4 mb-space-6">
 <span className="text-caption text-foreground/50 block mb-space-2 font-semibold">Active AI Capability:</span>
 <p className="text-caption text-foreground leading-relaxed bg-[hsl(var(--foreground)/0.015)] border border-[hsl(var(--foreground)/0.03)] p-space-3.5 radius-lg font-medium">
 {activeNode.capabilities}
 </p>
 </div>

 <div className="flex items-center justify-between gap-space-3">
 <div className="text-caption text-muted-foreground">
 <span className="block font-semibold">Integration Difficulty:</span>
 <span className="text-foreground font-bold">{activeNode.difficulty}</span>
 </div>
 {activeNode.status === "live" ? (
 <Button
 onClick={() => handleConnect(activeNode.id)}
 variant={isConnected ? "outline" : "default"}
 size="sm"
 disabled={isLoading}
 >
 {isLoading ? "Connecting..." : isConnected ? "Disconnect" : "Connect now"}
 </Button>
 ) : (
 <span className="text-caption text-amber-600 bg-amber-500/10 px-space-2.5 py-space-1 radius-full font-bold border border-amber-500/15">
 Coming Soon
 </span>
 )}
 </div>
 </div>
 );
 })()}
 </div>
 </div>
 </section>

 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 3: FEATURED INTEGRATIONS
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <section className="mx-auto max-w-5xl px-space-6 pb-space-24 z-10 relative">
 <div className="text-center md:text-left mb-space-12">
 <h2 className="text-heading-xl tracking-tight-md text-foreground">
 Core Mappings.
 <br />
 <span className="text-primary">Featured Integrations.</span>
 </h2>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-6">
 {featured.map((item) => {
 const isConnected = connectedIds.includes(item.id);
 const isLoading = connectingId === item.id;
 return (
 <div
 key={item.id}
 className="group relative rounded-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/35 p-space-6 flex flex-col justify-between hover:scale-[1.02] hover:border-primary/20 transition-all duration-300"
 >
 <div>
 <div className="flex items-center justify-between mb-space-5">
 <div className="h-8 flex items-center justify-start">
 {item.logo}
 </div>
 <div className="flex items-center gap-space-1.5">
 <span className={cn(
 "text-[9px] font-bold uppercase tracking-wider px-space-2.5 py-space-1 rounded-full border whitespace-nowrap leading-none",
 isConnected
 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
 : "bg-[hsl(var(--foreground)/0.03)] text-muted-foreground border-[hsl(var(--foreground)/0.06)]"
 )}>
 {isConnected ? "Connected" : "Not Linked"}
 </span>
 </div>
 </div>

 <h3 className="text-title-md font-bold text-foreground mb-space-2">{item.name}</h3>
 <p className="text-caption text-muted-foreground leading-relaxed mb-space-5">{item.desc}</p>

 <div className="flex flex-wrap gap-space-1 mb-space-6">
 {item.features.slice(0, 2).map((f) => (
 <span key={f} className="text-[10px] bg-[hsl(var(--foreground)/0.02)] border border-[hsl(var(--foreground)/0.04)] px-space-2 py-space-1 rounded-full text-foreground/80">
 {f}
 </span>
 ))}
 </div>
 </div>

 <Button
 onClick={() => handleConnect(item.id)}
 variant={isConnected ? "outline" : "default"}
 className="w-full text-caption"
 disabled={isLoading}
 >
 {isLoading ? (
 <span className="flex items-center gap-space-2">
 <svg className="animate-spin h-3.5 w-3.5 text-current" viewBox="0 0 24 24" fill="none">
 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
 </svg>
 Connecting...
 </span>
 ) : isConnected ? (
 "Disconnect"
 ) : (
 "Connect Tool"
 )}
 </Button>
 </div>
 );
 })}
 </div>
 </section>

 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 4: AUTOMATION SHOWCASE (TIMELINE)
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <section className="mx-auto max-w-5xl px-space-6 pb-space-24 z-10 relative">
 <div className="text-center mb-space-12">
 <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
 <Workflow className="h-3.5 w-3.5 text-primary" />
 <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Intelligent Routing</span>
 </div>
 <h2 className="text-heading-xl tracking-tight-md text-foreground">
 Automation Showcases.
 <br />
 <span className="text-primary">Ecosystem Workflow In Action</span>
 </h2>
 </div>

 <div className="relative rounded-3xl border border-[hsl(var(--foreground)/0.06)] bg-card/15 p-space-6 md:p-space-10 overflow-hidden">
 {/* Background Grid */}
 <div className="absolute inset-space-0 dot-grid opacity-20" />

 {/* Pipeline Header */}
 <div className="flex items-center justify-between mb-space-8 relative z-10">
 <div className="flex items-center gap-space-2.5">
 <span className="relative flex h-2 w-2">
 <span className={cn(
 "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
 isPaused ? "bg-amber-400" : "bg-emerald-400"
 )} />
 <span className={cn(
 "relative inline-flex rounded-full h-2 w-2",
 isPaused ? "bg-amber-500" : "bg-emerald-500"
 )} />
 </span>
 <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
 {isPaused ? "Simulation Paused • Click to Resume" : "Live Automation Simulation"}
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

 {/* Pipeline Track */}
 <div className="relative z-10 flex flex-col lg:flex-row items-stretch justify-between gap-space-8 lg:gap-space-4 mb-space-8">
 {/* Connector lines (Desktop only) */}
 <div className="hidden lg:block absolute top-[36px] left-[5%] right-[5%] h-[2px] bg-[hsl(var(--foreground)/0.06)] -z-10">
 <div 
 className="h-full bg-gradient-to-r from-primary to-primary-hover transition-all duration-700 ease-in-out" 
 style={{
 width: `${(activeStep / 4) * 100}%`
 }}
 />
 {/* Sliding glowing dot */}
 <div 
 className="absolute top-1/2 w-3.5 h-3.5 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.65)] -translate-y-1/2 transition-all duration-700 ease-in-out -translate-x-1/2"
 style={{
 left: `${(activeStep / 4) * 100}%`
 }}
 />
 </div>

 {WORKFLOW_STEPS.map((step, idx) => {
 const isActive = activeStep === idx;
 const isCompleted = idx < activeStep;
 return (
 <div
 key={step.id}
 onClick={() => {
 setActiveStep(idx);
 setIsPaused(true);
 }}
 className="flex-1 flex flex-row lg:flex-col items-center lg:text-center gap-space-4 cursor-pointer select-none group"
 >
 {/* Node Bubble */}
 <div className="relative shrink-0">
 <div className={cn(
 "w-18 h-18 rounded-full flex items-center justify-center transition-all duration-300 border bg-card",
 isActive 
 ? "border-primary shadow-lg shadow-primary/20 scale-110 ring-4 ring-primary/10"
 : isCompleted
 ? "border-primary/40 shadow-sm"
 : "border-[hsl(var(--foreground)/0.08)] group-hover:border-[hsl(var(--foreground)/0.15)] group-hover:scale-105"
 )}>
 <div className={cn(
 "w-14 h-14 rounded-full overflow-hidden flex items-center justify-center p-space-2.5 bg-white transition-all duration-300",
 isActive ? "scale-105" : ""
 )}>
 {step.logo || step.icon}
 </div>
 </div>


 </div>

 {/* Node Metadata */}
 <div className="flex flex-col lg:items-center">
 <h4 className={cn(
 "text-body-sm font-bold transition-colors duration-300",
 isActive ? "text-primary scale-105" : "text-foreground group-hover:text-primary/80"
 )}>
 {step.title}
 </h4>
 <p className="text-caption text-muted-foreground leading-snug mt-space-1 max-w-[180px]">
 {step.desc}
 </p>
 </div>
 </div>
 );
 })}
 </div>

 {/* Live Data Payload Inspector Terminal */}
 <div className="relative z-10 border border-[hsl(var(--foreground)/0.06)] bg-black/90 rounded-2xl overflow-hidden shadow-md">
 {/* Terminal Title Bar */}
 <div className="flex items-center justify-between px-space-4 py-space-2.5 border-b border-white/5 bg-white/2.5">
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

 {/* Terminal Code Content */}
 <div className="p-space-4 md:p-space-5 font-mono text-caption text-zinc-300 overflow-x-auto select-text no-scrollbar leading-relaxed">
 <pre className="text-left">
 {JSON.stringify(WORKFLOW_STEPS[activeStep].payload, null, 2)}
 </pre>
 </div>
 </div>
 </div>
 </section>

 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 5: CATEGORY BROWSER & DIRECTORY SEARCH
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <section className="mx-auto max-w-5xl px-space-6 pb-space-24 z-10 relative">
 <div className="text-center mb-space-12">
 <h2 className="text-heading-xl tracking-tight-md text-foreground">
 Explore Directory.
 <br />
 <span className="text-primary">Search & Filter Integrations</span>
 </h2>
 </div>

 {/* Floating Command Search Bar */}
 <div className="relative max-w-xl mx-auto mb-space-10">
 <div className="relative rounded-full border border-[hsl(var(--foreground)/0.08)] bg-card/65 p-space-1.5 flex items-center gap-space-2 shadow-xs">
 <Search className="h-4.5 w-4.5 text-muted-foreground/50 ml-space-3 shrink-0" />
 <input
 ref={searchInputRef}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full bg-transparent text-body-sm outline-none border-none py-space-1.5 text-foreground placeholder:text-muted-foreground/45"
 placeholder="Search integrations directory..."
 />
 <div className="hidden sm:flex items-center gap-space-1 bg-[hsl(var(--foreground)/0.04)] border border-[hsl(var(--foreground)/0.08)] px-space-2.5 py-space-1 rounded-md text-[10px] text-muted-foreground font-mono shrink-0 mr-space-1">
 <span>⌘</span>
 <span>K</span>
 </div>
 </div>
 </div>

 {/* Premium Segmented Filters */}
 <div className="overflow-x-auto w-full mb-space-10 no-scrollbar">
 <div className="inline-flex items-center gap-space-1.5 rounded-full border border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)] p-space-1.5 min-w-full md:min-w-0">
 {CATEGORIES.map((cat) => {
 const isActive = activeCategory === cat;
 return (
 <button
 key={cat}
 onClick={() => setActiveCategory(cat)}
 className={cn(
 "h-space-8 text-caption rounded-full transition-all duration-200 select-none cursor-pointer font-semibold px-space-4 whitespace-nowrap",
 isActive
 ? "bg-[#0A0E17] text-background shadow-xs"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 {cat}
 </button>
 );
 })}
 </div>
 </div>

 {/* Dynamic Cards Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-6">
 {filtered.map((item) => {
 const isConnected = connectedIds.includes(item.id);
 const isLoading = connectingId === item.id;
 return (
 <div
 key={item.id}
 className="group relative rounded-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/35 p-space-6 flex flex-col justify-between hover:scale-[1.02] hover:border-primary/20 transition-all duration-300"
 >
 <div>
 <div className="flex items-center justify-between mb-space-5">
 <div className="h-8 flex items-center justify-start">
 {item.logo}
 </div>
 <div className="flex items-center gap-space-1.5">
 <span className={cn(
 "text-[9px] font-bold uppercase tracking-wider px-space-2.5 py-space-1 rounded-full border whitespace-nowrap leading-none",
 item.status === "live"
 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
 : "bg-amber-500/10 text-amber-600 border-amber-500/20"
 )}>
 {item.status === "live" ? "Live" : "Soon"}
 </span>
 <span className="text-[9px] font-bold uppercase tracking-wider px-space-2.5 py-space-1 rounded-full border whitespace-nowrap leading-none bg-[hsl(var(--foreground)/0.02)] text-muted-foreground border-[hsl(var(--foreground)/0.05)]">
 {item.difficulty}
 </span>
 </div>
 </div>

 <h3 className="text-title-md font-bold text-foreground mb-space-2">{item.name}</h3>
 <p className="text-caption text-muted-foreground leading-relaxed mb-space-5">{item.desc}</p>

 <ul className="space-y-space-2 border-t border-[hsl(var(--foreground)/0.04)] pt-space-4 mb-space-6">
 {item.features.map((f) => (
 <li key={f} className="flex items-center gap-space-2 text-caption text-foreground/80">
 <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
 <span>{f}</span>
 </li>
 ))}
 </ul>
 </div>

 {item.status === "live" ? (
 <Button
 onClick={() => handleConnect(item.id)}
 variant={isConnected ? "outline" : "default"}
 className="w-full text-caption"
 disabled={isLoading}
 >
 {isLoading ? (
 "Connecting..."
 ) : isConnected ? (
 "Disconnect"
 ) : (
 "Connect Tool"
 )}
 </Button>
 ) : (
 <div className="flex items-center justify-center gap-space-2 py-space-2 radius-lg border border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.01)] text-caption text-muted-foreground font-semibold">
 <Clock className="h-3.5 w-3.5" />
 <span>In Development</span>
 </div>
 )}
 </div>
 );
 })}
 </div>

 {filtered.length === 0 && (
 <div className="text-center py-space-16 text-muted-foreground rounded-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/25">
 <Search className="h-8 w-8 mx-auto mb-space-4 opacity-30 text-primary" />
 <p className="text-body-sm font-semibold">No integrations match your search query</p>
 <p className="text-caption text-muted-foreground mt-space-1">Try searching for other terms or request a custom integration below.</p>
 </div>
 )}
 </section>

 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 6: DEVELOPER CODE PLAYGROUND
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <section className="mx-auto max-w-5xl px-space-6 pb-space-24 z-10 relative">
 <div className="text-center mb-space-12">
 <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border border-primary/20 bg-primary/5 mb-space-6">
 <Code2 className="h-3.5 w-3.5 text-primary" />
 <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">Developer API</span>
 </div>
 <h2 className="text-heading-xl tracking-tight-md text-foreground">
 Engineered for customization.
 <br />
 <span className="text-primary">Integrate anything with code.</span>
 </h2>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-6 items-stretch">
 {/* Left pane: selector tabs */}
 <div className="flex flex-col gap-space-2 justify-center">
 {[
 { id: "api", title: "cURL API Client", desc: "Interact directly via RESTful requests", icon: <Terminal className="h-4.5 w-4.5" /> },
 { id: "webhook", title: "Webhook Payload", desc: "Listen for real-time appointment events", icon: <FileJson className="h-4.5 w-4.5" /> },
 { id: "sdk", title: "Python SDK", desc: "Query conversations programmatically", icon: <Terminal className="h-4.5 w-4.5" /> },
 { id: "mcp", title: "MCP Config", desc: "Model Context Protocol configuration", icon: <Key className="h-4.5 w-4.5" /> }
 ].map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveCodeTab(tab.id as any)}
 className={cn(
 "text-left p-space-4 rounded-xl border transition-all duration-300 flex items-start gap-space-3.5 cursor-pointer",
 activeCodeTab === tab.id
 ? "border-primary/20 bg-card shadow-xs"
 : "border-transparent hover:bg-card/30"
 )}
 >
 <div className={cn("p-space-2 rounded-lg shrink-0", activeCodeTab === tab.id ? "bg-primary/10 text-primary" : "bg-[hsl(var(--foreground)/0.03)] text-muted-foreground")}>
 {tab.icon}
 </div>
 <div>
 <span className="text-body-sm font-bold text-foreground block">{tab.title}</span>
 <span className="text-caption text-muted-foreground block mt-space-0.5 leading-snug">{tab.desc}</span>
 </div>
 </button>
 ))}
 </div>

 {/* Right pane: code playground */}
 <div className="lg:col-span-2 relative rounded-2xl border border-[hsl(var(--foreground)/0.08)] bg-[#0A0E17] text-slate-200 overflow-hidden flex flex-col min-h-96">
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
 className="p-space-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
 >
 {isCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
 </button>
 </div>
 <div className="flex-1 p-space-5 overflow-auto font-mono text-caption leading-relaxed bg-[#0A0E17]">
 <pre className="text-left whitespace-pre-wrap select-all">
 {CODE_SNIPPETS[activeCodeTab]}
 </pre>
 </div>
 </div>
 </div>
 </section>

 {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECTION 7: REQUEST CUSTOM INTEGRATION
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <section className="relative border-t border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.015)] py-space-24 z-10">
 <div className="container mx-auto max-w-4xl px-space-6 text-center">
 <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 radius-full border border-primary/20 bg-primary/5 mb-space-6">
 <ShieldCheck className="h-3.5 w-3.5 text-primary" />
 <span className="text-[11px] uppercase tracking-widest font-semibold text-primary">SLA Custom Queue</span>
 </div>
 <h2 className="text-heading-xl tracking-tight-xs mb-space-4 max-w-xl mx-auto leading-snug">
 Missing something?
 <br />
 Request a <span className="text-primary">custom integration.</span>
 </h2>
 <p className="text-body-md text-muted-foreground mb-space-8 max-w-md mx-auto leading-relaxed">
 Agencies and Business plan customers get priority integration queue slots. Most custom tools ship within 4 weeks.
 </p>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-space-6 text-left max-w-2xl mx-auto mb-space-10">
 <div className="p-space-5 radius-xl border border-[hsl(var(--foreground)/0.04)] bg-card/45 backdrop-blur-xs flex gap-space-3.5">
 <div className="p-space-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl h-fit">
 <Check className="h-4.5 w-4.5" />
 </div>
 <div>
 <h4 className="text-body-sm font-bold text-foreground mb-space-1">Priority SLA Queuing</h4>
 <p className="text-caption text-muted-foreground leading-relaxed">Fast-tracked planning, testing, and rollout protocols matching organizational guidelines.</p>
 </div>
 </div>
 <div className="p-space-5 radius-xl border border-[hsl(var(--foreground)/0.04)] bg-card/45 backdrop-blur-xs flex gap-space-3.5">
 <div className="p-space-2.5 bg-primary/10 text-primary rounded-xl h-fit">
 <Check className="h-4.5 w-4.5" />
 </div>
 <div>
 <h4 className="text-body-sm font-bold text-foreground mb-space-1">Custom Webhook Mappings</h4>
 <p className="text-caption text-muted-foreground leading-relaxed">Map custom headers, response shapes, and validation tokens directly inside dashboard.</p>
 </div>
 </div>
 </div>

 <Button asChild size="lg" className="w-full sm:w-auto">
 <Link href="/contact">Request Integration <ArrowRight className="h-4 w-4" /></Link>
 </Button>
 </div>
 </section>
 </main>

 <MarketingFooter />
 </div>
 );
}