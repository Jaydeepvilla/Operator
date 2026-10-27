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
import geminiIcon from "@/assets/gemini.svg";
import razorpayIcon from "@/assets/razorpay.svg";
import whatsappIcon from "@/assets/whatsapp-text.svg";
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
import { Input } from "@/components/shared/input";

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
    <svg viewBox="0 0 24 24" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
    </svg>
  ),
  outlook: (
    <svg viewBox="0 0 129 129" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 0h61.3v61.3H0z" fill="#f25022"/>
      <path d="M67.7 0H129v61.3H67.7z" fill="#7fba00"/>
      <path d="M0 67.7h61.3V129H0z" fill="#00a4ef"/>
      <path d="M67.7 67.7H129V129H67.7z" fill="#ffb900"/>
    </svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.012 2C6.49 2 2 6.48 2 12c0 1.76.46 3.48 1.33 4.99L2 22l5.16-1.31A9.95 9.95 0 0 0 12.01 22c5.52 0 10.01-4.48 10.01-10s-4.49-10-10.01-10zm5.82 14.15c-.24.68-1.4 1.31-1.94 1.39-.52.08-1.18.11-1.9-.13-.44-.14-1-.33-1.74-.65-3.08-1.33-5.1-4.44-5.25-4.65-.15-.21-1.25-1.66-1.25-3.17 0-1.51.79-2.25 1.07-2.56.28-.31.62-.39.83-.39.21 0 .41 0 .59.01.19.01.44-.07.69.53.26.62.88 2.14.96 2.3.08.16.13.35.03.56-.1.21-.16.34-.31.52-.16.18-.33.4-.47.54-.16.16-.32.33-.14.64.18.31.81 1.33 1.74 2.16 1.19 1.06 2.19 1.39 2.5 1.55.31.16.49.13.67-.08.18-.21.77-.9 1-.1.2-.23.23-.49.44-.41.21.08 1.33.63 1.56.74.23.11.38.16.44.26.06.1.06.6-.18 1.28z" fill="#25D366"/>
    </svg>
  ),
  meta: (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.522 6c-1.748 0-3.324.97-4.322 2.502C12.202 6.97 10.626 6 8.878 6 5.637 6 3 8.687 3 12s2.637 6 5.878 6c1.748 0 3.324-.97 4.322-2.502 1 .16 2.576 1.13 4.322 1.13 3.241 0 5.878-2.687 5.878-6S20.763 6 17.522 6zm-8.644 9.6c-2.028 0-3.678-1.615-3.678-3.6 0-1.985 1.65-3.6 3.678-3.6 2.029 0 3.678 1.615 3.678 3.6 0 1.985-1.649 3.6-3.678 3.6zm8.644 0c-2.029 0-3.678-1.615-3.678-3.6 0-1.985 1.649-3.6 3.678-3.6 2.028 0 3.678 1.615 3.678 3.6 0 1.985-1.65 3.6-3.678 3.6z" fill="#0081FB"/>
    </svg>
  ),
  calendly: (
    <svg viewBox="50 40 300 260" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <path fill="#006bff" d="M231.58,223.23C220.65,232.93,207,245,182.25,245h-14.8c-17.91,0-34.2-6.51-45.86-18.31-11.39-11.53-17.66-27.31-17.66-44.44V162c0-17.13,6.27-32.91,17.66-44.44,11.66-11.8,27.95-18.3,45.86-18.3h14.8c24.78,0,38.4,12.06,49.33,21.76,11.35,10,21.14,18.74,47.25,18.74a75.11,75.11,0,0,0,11.89-.95l-.09-.23a89.53,89.53,0,0,0-5.49-11.28L267.69,97.07a89.65,89.65,0,0,0-77.64-44.82H155.14A89.65,89.65,0,0,0,77.5,97.07L60.05,127.3a89.67,89.67,0,0,0,0,89.65L77.5,247.18A89.65,89.65,0,0,0,155.14,292h34.91a89.65,89.65,0,0,0,77.64-44.82L285.14,217a89.53,89.53,0,0,0,5.49-11.28l.09-.22a74,74,0,0,0-11.89-1c-26.11,0-35.9,8.69-47.25,18.74" />
      <path fill="#006bff" d="M182.25,117.61h-14.8c-27.26,0-45.17,19.47-45.17,44.39v20.25c0,24.92,17.91,44.39,45.17,44.39h14.8c39.72,0,36.6-40.5,96.58-40.5a91.64,91.64,0,0,1,16.94,1.56,89.54,89.54,0,0,0,0-31.15,92.51,92.51,0,0,1-16.94,1.56c-60,0-56.86-40.5-96.58-40.5" />
      <path fill="#006bff" d="M330.23,202.5a83.62,83.62,0,0,0-34.45-14.81c0,.11,0,.2,0,.3a89.7,89.7,0,0,1-5,17.45,65.58,65.58,0,0,1,28.48,11.73c0,.08-.05.18-.08.27a153.57,153.57,0,1,1,0-90.63c0,.09.05.19.08.27a65.45,65.45,0,0,1-28.48,11.72,90.3,90.3,0,0,1,5,17.47,2.33,2.33,0,0,0,0,.28,83.6,83.6,0,0,0,34.45-14.8c9.82-7.27,7.92-15.48,6.43-20.34a172.13,172.13,0,1,0,0,101.43c1.49-4.86,3.39-13.07-6.43-20.34" />
      <path fill="#0ae8f0" d="M290.72,138.8a74,74,0,0,1-11.89,1c-26.11,0-35.9-8.69-47.24-18.74-10.94-9.7-24.56-21.77-49.34-21.77h-14.8c-17.92,0-34.2,6.51-45.86,18.31-11.39,11.53-17.66,27.31-17.66,44.44v20.25c0,17.13,6.27,32.91,17.66,44.44,11.66,11.8,27.94,18.3,45.86,18.3h14.8c24.78,0,38.4-12.06,49.34-21.76,11.34-10,21.13-18.74,47.24-18.74a75.11,75.11,0,0,1,11.89.95,89,89,0,0,0,5-17.45,2.68,2.68,0,0,0,0-.3,92.51,92.51,0,0,0-16.94-1.55c-60,0-56.86,40.51-96.58,40.51h-14.8c-27.26,0-45.17-19.48-45.17-44.4V162c0-24.92,17.91-44.39,45.17-44.39h14.8c39.72,0,36.6,40.49,96.58,40.49a91.64,91.64,0,0,0,16.94-1.55c0-.09,0-.18,0-.28a90.3,90.3,0,0,0-5-17.47" />
    </svg>
  ),
  vonage: (
    <div className="w-full h-full flex items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-500 font-bold">
      <Phone className="h-5 w-5" />
    </div>
  ),
  gemini: (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 24C12 17.373 6.627 12 0 12C6.627 12 12 6.627 12 0C12 6.627 17.373 12 24 12C17.373 12 12 17.373 12 24Z" fill="url(#gemini_grad_int)"/>
      <defs>
        <linearGradient id="gemini_grad_int" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1BA1E3"/>
          <stop offset="0.5" stopColor="#547BF4"/>
          <stop offset="1" stopColor="#9B72CB"/>
        </linearGradient>
      </defs>
    </svg>
  ),
  razorpay: (
    <svg viewBox="0 0 127 146" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M54.3828 47.1751L47.2567 73.1251L87.4627 47.0438L61.2088 145.65H87.8565L126.656 0L54.3828 47.1751Z" fill="#3395FF"/>
      <path d="M11.0641 104.175L0 145.65H54.6643L77.0364 61.2748L11.0641 104.175Z" fill="#0C2651" className="fill-[#0C2651] dark:fill-white"/>
    </svg>
  ),
  stripe: (
    <svg viewBox="0 0 32 32" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#635BFF"/>
      <path d="M14.6 13.4c0-.9.8-1.3 2-1.3 1.8 0 4.1.5 5.9 1.5v-5.2c-2-.8-3.9-1.1-5.9-1.1-4.9 0-8.1 2.5-8.1 6.8 0 6.6 9.1 5.5 9.1 8.4 0 1.1-1 1.5-2.3 1.5-2 0-4.5-.8-6.5-1.9v5.4c2.2 1 4.5 1.4 6.5 1.4 5 0 8.4-2.5 8.4-6.8 0-7.1-9.1-5.9-9.1-8.7z" fill="#fff"/>
    </svg>
  ),
  twilio: (
    <svg viewBox="-313 376 50 50" className="w-full h-full" fill="#f12e45" xmlns="http://www.w3.org/2000/svg">
      <path d="M-288 376c-13.8 0-25 11.2-25 25s11.2 25 25 25 25-11.2 25-25-11.2-25-25-25zm0 43.4c-10.2 0-18.4-8.2-18.4-18.4s8.2-18.4 18.4-18.4 18.4 8.2 18.4 18.4-8.2 18.4-18.4 18.4z" />
      <circle cx="-281.8" cy="394.8" r="5.2" />
      <circle cx="-281.8" cy="407.2" r="5.2" />
      <circle cx="-294.2" cy="407.2" r="5.2" />
      <circle cx="-294.2" cy="394.8" r="5.2" />
    </svg>
  ),
};

const CATEGORIES = [
 "All",
 "Communication",
 "Scheduling",
 "Payments",
 "Telephony",
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
 id: "gemini",
 name: "Google Gemini Models",
 category: "AI",
 status: "live",
 logo: LOGOS.gemini,
 desc: "Production multimodal and conversational reasoning intelligence powering Operator's agents and context matching.",
 features: ["Domain adaptation", "Function calling", "Zero-shot classification", "Structured JSON output"],
 difficulty: "Setup Required",
 popularity: "Core",
 capabilities: "Evaluates raw conversational dialogue and translates customer intents into structured API payloads."
 },
 
];


// ─── SCOPED FUTURE INTEGRATIONS (ROADMAP) ───────────────────────────
const FUTURE_INTEGRATIONS = [
  {
    id: "meta-future",
    name: "Meta Messenger & Instagram Direct",
    category: "Communication",
    status: "scoped",
    quarter: "Q3 2026",
    logo: LOGOS.meta,
    desc: "Answer prospective patient questions and book consultation slots natively within Instagram DMs and Facebook Messenger.",
    scope: "Omnichannel social intake with unified voice context."
  },
  {
    id: "hubspot-future",
    name: "HubSpot CRM",
    category: "CRM & Marketing",
    status: "scoped",
    quarter: "Q3 2026",
    logo: (
      <div className="w-full h-full flex items-center justify-center font-bold text-[#FF7A59]">
        <span className="text-body-sm font-mono font-medium">HS</span>
      </div>
    ),
    desc: "Bi-directional contact record updates, deal stage progression, and automated customer lifecycle tagging.",
    scope: "Instant contact enrichment from phone triage notes."
  },
  {
    id: "ehr-future",
    name: "Dentrix & Epic Systems EHR",
    category: "Healthcare",
    status: "scoped",
    quarter: "Q4 2026",
    logo: (
      <div className="w-full h-full flex items-center justify-center font-bold text-emerald-500">
        <span className="text-body-sm font-mono font-medium">EHR</span>
      </div>
    ),
    desc: "Direct integration into dental practice management and clinical hospital EHR schedules with HIPAA verification.",
    scope: "Chair availability locks and clinical record creation."
  },
  {
    id: "salesforce-future",
    name: "Salesforce Service Cloud",
    category: "Enterprise CRM",
    status: "scoped",
    quarter: "Q4 2026",
    logo: (
      <div className="w-full h-full flex items-center justify-center font-bold text-[#00A1E0]">
        <span className="text-body-sm font-mono font-medium">SF</span>
      </div>
    ),
    desc: "Enterprise incident ticketing, high-volume case routing, and automated Omni-Channel skill matching.",
    scope: "Enterprise tier bi-directional case routing."
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
 }, 250);
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
   const PIPELINE_NODES = [
    {
      id: "google-calendar",
      name: "Google Calendar",
      category: "Scheduling",
      logo: LOGOS.googleCalendar,
      protocol: "REST v3 / Webhook",
      latency: "42ms",
      throughput: "99.98% Synced",
      payload: `{
  "action": "calendar.slot_reserve",
  "provider": "google_calendar",
  "data": {
    "calendarId": "primary",
    "slot": "2026-07-28T14:30:00Z",
    "duration": 45,
    "summary": "Emergency Dental Checkup - John Doe",
    "collisionCheck": "passed"
  }
}`
    },
    {
      id: "outlook",
      name: "Microsoft Outlook",
      category: "Scheduling",
      logo: LOGOS.outlook,
      protocol: "Microsoft Graph API",
      latency: "58ms",
      throughput: "100% Conflict-Free",
      payload: `{
  "action": "m365.event_sync",
  "provider": "outlook_calendar",
  "data": {
    "mailbox": "appointments@clinic.com",
    "start": "2026-07-28T15:00:00Z",
    "chair": "Operator_Chair_2",
    "autoLock": true
  }
}`
    },
    {
      id: "calendly",
      name: "Calendly",
      category: "Scheduling",
      logo: LOGOS.calendly,
      protocol: "Webhooks v2",
      latency: "35ms",
      throughput: "Instant Push",
      payload: `{
  "event": "invitee.created",
  "source": "calendly",
  "data": {
    "event_type": "30min_consultation",
    "email": "caller@example.com",
    "status": "confirmed"
  }
}`
    },
    {
      id: "whatsapp",
      name: "WhatsApp Business",
      category: "Communication",
      logo: LOGOS.whatsapp,
      protocol: "Meta Cloud API v20",
      latency: "65ms",
      throughput: "Zero Delay Dispatch",
      payload: `{
  "action": "message.dispatch",
  "provider": "whatsapp_cloud",
  "data": {
    "recipient": "+15550192834",
    "template": "appointment_reminder_v2",
    "params": ["Dr. Mitchell", "Tomorrow at 10:00 AM"]
  }
}`
    },
    {
      id: "stripe",
      name: "Stripe Payments",
      category: "Payments",
      logo: LOGOS.stripe,
      protocol: "Stripe Connect v1",
      latency: "74ms",
      throughput: "PCI-DSS Level 1",
      payload: `{
  "action": "checkout.session_create",
  "provider": "stripe",
  "data": {
    "amount": 5000,
    "currency": "usd",
    "description": "Retainer Fee for Consultation",
    "status": "authorized"
  }
}`
    },
    {
      id: "razorpay",
      name: "Razorpay",
      category: "Payments",
      logo: LOGOS.razorpay,
      protocol: "UPI Gateway Direct",
      latency: "82ms",
      throughput: "Instant Settlement",
      payload: `{
  "action": "payment_link.generate",
  "provider": "razorpay",
  "data": {
    "amount": 150000,
    "currency": "INR",
    "customer": "+919876543210",
    "method": "upi"
  }
}`
    },
    {
      id: "twilio",
      name: "Twilio Telephony",
      category: "Telephony",
      logo: LOGOS.twilio,
      protocol: "SIP Duplex RFC 3261",
      latency: "18ms",
      throughput: "< 800ms Voice Bridge",
      payload: `{
  "event": "voice.stream_established",
  "provider": "twilio_sip",
  "data": {
    "callSid": "CA928371928374",
    "codec": "Opus 48kHz",
    "duplex": true,
    "jitter": "< 4ms"
  }
}`
    },
    {
      id: "gemini",
      name: "Google Gemini Models",
      category: "AI",
      logo: LOGOS.gemini,
      protocol: "Multimodal Reasoning API",
      latency: "94ms",
      throughput: "Real-Time Context Match",
      payload: `{
  "model": "gemini-2.0-flash",
  "intent": "emergency_intake_triage",
  "confidence": 0.994,
  "structuredOutput": {
    "urgency": "high",
    "insuranceVerified": true
  }
}`
    }
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
 <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border-primary/20 bg-primary/5 mb-space-6">
 <Sparkles className="h-3.5 w-3.5 text-primary" />
 <span className="text-caption uppercase tracking-widest font-medium text-primary">Unified Ecosystem</span>
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
        SECTION 2: ENTERPRISE BI-DIRECTIONAL SYNC ARCHITECTURE
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="relative max-w-5xl mx-auto px-space-6 pb-space-24 z-10">
          <GsapScrollSection animation="scale-up">
            <div className="rounded-3xl border border-[hsl(var(--foreground)/0.08)] bg-card/40 backdrop-blur-md p-space-6 md:p-space-8 overflow-hidden relative shadow-lg">
              <div className="absolute inset-0 dot-grid opacity-15 pointer-events-none" />

              {/* Architecture Telemetry Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-4 border-b border-[hsl(var(--foreground)/0.06)] pb-space-5 mb-space-8 relative z-10">
                <div className="flex items-center gap-space-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-caption font-mono uppercase tracking-widest text-emerald-500 font-medium">
                    Live Enterprise Sync Hub
                  </span>
                  <span className="text-muted-foreground/40 hidden sm:inline">•</span>
                  <span className="text-caption font-mono text-muted-foreground hidden sm:inline">
                    Zero-Collision Lock Protocol
                  </span>
                </div>
                <div className="flex items-center gap-space-4 font-mono text-caption text-muted-foreground">
                  <span>Network Latency: <strong className="text-primary font-medium">&lt; 95ms</strong></span>
                  <span>Uptime: <strong className="text-emerald-500 font-medium">99.99%</strong></span>
                </div>
              </div>

              {/* 3-Tier Enterprise Architecture Flow */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-6 items-stretch relative z-10 mb-space-8">
                {/* Tier 1: Inbound Gateways (3 cols) */}
                <div className="lg:col-span-3 flex flex-col justify-between gap-space-3">
                  <span className="text-caption font-mono uppercase tracking-wider text-muted-foreground font-medium">
                    1. Inbound Ingestion
                  </span>
                  {[
                    { label: "Twilio SIP Voice", sub: "Duplex Audio (<800ms)", icon: <Phone className="h-4 w-4 text-primary" /> },
                    { label: "WhatsApp Cloud API", sub: "Verified Webhooks", icon: <MessageSquare className="h-4 w-4 text-emerald-500" /> },
                    { label: "REST / Webhook Bridge", sub: "JSON Payload Intake", icon: <FileJson className="h-4 w-4 text-indigo-400" /> },
                  ].map((gw, idx) => (
                    <div
                      key={idx}
                      className="p-space-3.5 rounded-xl border border-[hsl(var(--foreground)/0.06)] bg-card/60 flex items-center gap-space-3 shadow-xs"
                    >
                      <div className="h-8 w-8 rounded-lg bg-[hsl(var(--foreground)/0.04)] flex items-center justify-center shrink-0">
                        {gw.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-caption font-medium text-foreground truncate">{gw.label}</p>
                        <p className="text-[11px] text-muted-foreground font-mono truncate">{gw.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tier 2: Operator AI Brain & Dispatch Engine (4 cols) */}
                <div className="lg:col-span-4 rounded-2xl border border-primary/30 bg-primary/[0.03] p-space-5 flex flex-col justify-between relative overflow-hidden shadow-sm">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between mb-space-3">
                      <span className="text-caption font-mono uppercase tracking-wider text-primary font-medium">
                        2. Operator Core
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-mono font-medium">
                        ACTIVE ENGINE
                      </span>
                    </div>

                    <div className="flex items-center gap-space-3 mb-space-4">
                      <div className="w-10 h-10 rounded-xl bg-card border border-primary/40 p-1 flex items-center justify-center shadow-md">
                        <Image src="/logo.png" alt="Operator Core" width={32} height={32} unoptimized className="object-contain" />
                      </div>
                      <div>
                        <h4 className="text-body-sm font-bold text-foreground">Autonomous Router</h4>
                        <p className="text-[11px] text-muted-foreground font-mono">Bi-Directional State Machine</p>
                      </div>
                    </div>

                    <div className="space-y-space-2 text-caption font-mono">
                      <div className="p-2 rounded-lg bg-card/70 border border-[hsl(var(--foreground)/0.05)] flex items-center justify-between">
                        <span className="text-muted-foreground">Intent Extraction:</span>
                        <span className="text-emerald-500 font-medium">99.4% Match</span>
                      </div>
                      <div className="p-2 rounded-lg bg-card/70 border border-[hsl(var(--foreground)/0.05)] flex items-center justify-between">
                        <span className="text-muted-foreground">Double-Booking Guard:</span>
                        <span className="text-emerald-500 font-medium">Active Lock</span>
                      </div>
                      <div className="p-2 rounded-lg bg-card/70 border border-[hsl(var(--foreground)/0.05)] flex items-center justify-between">
                        <span className="text-muted-foreground">Secure Payment Gate:</span>
                        <span className="text-primary font-medium">PCI-DSS Synced</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground font-mono mt-space-3 text-center border-t border-[hsl(var(--foreground)/0.06)] pt-space-2.5">
                    Sync Event Engine: <span className="text-foreground">2,840 calls triaged today</span>
                  </p>
                </div>

                {/* Tier 3: Connected Adapters Grid (5 cols) */}
                <div className="lg:col-span-5 flex flex-col justify-between gap-space-2">
                  <div className="flex items-center justify-between">
                    <span className="text-caption font-mono uppercase tracking-wider text-muted-foreground font-medium">
                      3. Production Adapters (Click to inspect)
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {PIPELINE_NODES.length} Active
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-space-2">
                    {PIPELINE_NODES.map((node) => {
                      const isSelected = activeVisualId === node.id;
                      const isConnected = connectedIds.includes(node.id);

                      return (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => setActiveVisualId(node.id)}
                          className={cn(
                            "p-space-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-space-2.5 select-none",
                            isSelected
                              ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                              : "border-[hsl(var(--foreground)/0.06)] bg-card/60 hover:border-primary/30 hover:bg-card"
                          )}
                        >
                          <div className="w-7 h-7 rounded-lg bg-white p-1 border border-border/40 flex items-center justify-center shrink-0 shadow-xs">
                            {node.logo}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-caption font-medium text-foreground truncate leading-tight">
                              {node.name}
                            </p>
                            <span className="text-[10px] font-mono text-emerald-500 flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                              {isConnected ? "Linked" : "Standby"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Dynamic Selected Adapter Inspector Bar */}
              {(() => {
                const selected = PIPELINE_NODES.find((n) => n.id === activeVisualId) || PIPELINE_NODES[0];
                const activeIntegration = INTEGRATIONS.find((i) => i.id === selected.id) || INTEGRATIONS[0];
                const isConnected = connectedIds.includes(selected.id);
                const isLoading = connectingId === selected.id;

                return (
                  <div className="rounded-2xl border border-[hsl(var(--foreground)/0.08)] bg-card/80 p-space-5 shadow-xs relative z-10 animate-in fade-in duration-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-4 border-b border-[hsl(var(--foreground)/0.06)] pb-space-4 mb-space-4">
                      <div className="flex items-center gap-space-3">
                        <div className="w-10 h-10 rounded-xl bg-white p-2 border border-border/40 flex items-center justify-center shadow-xs shrink-0">
                          {selected.logo}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-body-md font-bold text-foreground">{selected.name}</h4>
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                              {selected.category}
                            </span>
                          </div>
                          <p className="text-caption text-muted-foreground font-mono mt-0.5">
                            Protocol: <span className="text-foreground">{selected.protocol}</span> • Latency: <span className="text-emerald-500">{selected.latency}</span> • {selected.throughput}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-space-3">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selected.payload);
                            setIsCopied(true);
                            setTimeout(() => setIsCopied(false), 2000);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--foreground)/0.02)] hover:bg-[hsl(var(--foreground)/0.05)] text-caption font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none"
                        >
                          {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{isCopied ? "Copied" : "Copy Payload"}</span>
                        </button>
                        <Button
                          onClick={() => handleConnect(selected.id)}
                          variant={isConnected ? "outline" : "default"}
                          size="sm"
                          disabled={isLoading}
                          className="font-medium text-caption h-8"
                        >
                          {isLoading ? "Syncing..." : isConnected ? "Disconnect Adapter" : "Connect Adapter"}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-space-4 items-center">
                      <div className="md:col-span-5 text-caption text-muted-foreground leading-relaxed">
                        <p className="text-foreground font-medium mb-1">{activeIntegration.desc}</p>
                        <p className="text-caption font-mono bg-[hsl(var(--foreground)/0.02)] p-2 rounded-lg border border-[hsl(var(--foreground)/0.04)]">
                          Active AI Function: {activeIntegration.capabilities}
                        </p>
                      </div>
                      <div className="md:col-span-7 bg-[#07090E] rounded-xl p-space-3.5 border border-border/30 overflow-x-auto text-[11px] font-mono text-slate-300">
                        <pre className="whitespace-pre"><code>{selected.payload}</code></pre>
                      </div>
                    </div>
                  </div>
                );
              })()}
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
 <div className="inline-flex items-center gap-space-2 px-space-3 py-space-1 rounded-full border-primary/20 bg-primary/5 mb-space-4">
 <span className="text-caption uppercase font-mono tracking-widest font-medium text-primary">Core Mappings</span>
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
 <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border-primary/20 bg-primary/5 mb-space-6">
 <Workflow className="h-3.5 w-3.5 text-primary" />
 <span className="text-caption uppercase tracking-widest font-medium text-primary">Intelligent Routing</span>
 </div>
 <h2 className="text-heading-xl tracking-tight-md font-bold text-foreground">
 Automation Showcases.
 <br />
 <span className="text-primary">Ecosystem Workflow In Action</span>
 </h2>
 </div>

 <div className="relative rounded-3xl border-[hsl(var(--foreground)/0.08)] bg-card/25 backdrop-blur-xs p-space-6 md:p-space-10 overflow-hidden shadow-sm">
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
 <span className="text-caption font-mono uppercase tracking-widest text-muted-foreground font-medium">
 {isPaused ? "Simulation Paused • Click any step" : "Live Automation Simulation"}
 </span>
 </div>
 {isPaused && (
            <Button
              onClick={() => setIsPaused(false)}
              className="bg-primary text-white hover:bg-primary-hover font-semibold text-caption px-4 py-1.5 h-auto rounded-full shadow-xs cursor-pointer select-none"
            >
              Resume Loop
            </Button>
          )}
 </div>

 {/* Steps Track */}
 <div className="relative z-10 flex flex-col lg:flex-row items-stretch justify-between gap-space-4 mb-space-8">
 {WORKFLOW_STEPS.map((step, idx) => {
 const isActive = activeStep === idx;
 return (
 <button
              type="button"
              key={step.id}
              onClick={() => {
                setActiveStep(idx);
                setIsPaused(true);
              }}
              className={cn(
                "flex-1 p-space-4 rounded-xl border transition-all duration-300 cursor-pointer select-none text-left bg-card/40",
                isActive
                  ? "border-primary bg-primary/10 shadow-xs"
                  : "border-[hsl(var(--foreground)/0.06)] hover:border-primary/40 hover:bg-card/70"
              )}
            >
 <div className="flex items-center gap-space-3 mb-space-2">
 <span className={cn(
 "w-6 h-6 rounded flex items-center justify-center font-mono text-caption font-bold shrink-0",
 isActive ? "bg-primary text-primary-foreground" : "bg-[hsl(var(--foreground)/0.05)] text-muted-foreground"
 )}>
 0{idx + 1}
 </span>
 <h4 className="text-body-sm font-semibold text-foreground truncate">{step.title}</h4>
 </div>
 <p className="text-caption text-muted-foreground leading-snug line-clamp-2">
 {step.desc}
                </p>
              </button>
 );
 })}
 </div>

 {/* Payload Inspector Terminal */}
 <div className="relative z-10 border-[hsl(var(--foreground)/0.08)] bg-black/95 rounded-2xl overflow-hidden shadow-md">
 <div className="flex items-center justify-between px-space-4 py-space-2.5 border-b border-white/5 bg-white/5">
 <div className="flex items-center gap-space-2">
 <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
 <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
 <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
 <span className="text-caption text-zinc-400 font-mono ml-space-2 uppercase tracking-wider">
 payload_inspector.json
 </span>
 </div>
 <div className="flex items-center gap-space-3 font-mono text-caption">
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
 <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border-primary/20 bg-primary/5 mb-space-6">
 <Layers className="h-3.5 w-3.5 text-primary" />
 <span className="text-caption uppercase tracking-widest font-medium text-primary">Directory Index</span>
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
 <div className="relative rounded-xl border-[hsl(var(--foreground)/0.08)] bg-card/60 p-space-2 flex items-center gap-space-2 shadow-xs">
 <Search className="h-4 w-4 text-muted-foreground/60 ml-space-2 shrink-0" />
 <Input
 ref={searchInputRef}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full bg-transparent text-body-sm outline-none border-none py-space-1 text-foreground placeholder:text-muted-foreground/50"
 placeholder="Search tools, telephony, calendars, CRMs..."
 />
 <div className="hidden sm:flex items-center gap-1 bg-[hsl(var(--foreground)/0.04)] border-[hsl(var(--foreground)/0.08)] px-space-2 py-0.5 rounded text-caption text-muted-foreground font-mono shrink-0 mr-space-1">
 <span>⌘</span>
 <span>K</span>
 </div>
 </div>
 </div>

 {/* View Mode Toggle: Grid vs Compact List */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl border border-border/50 bg-card/60 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-caption font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                  viewMode === "grid"
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden md:inline text-caption">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-caption font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                  viewMode === "list"
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
                title="Compact List View"
              >
                <ListFilter className="h-4 w-4" />
                <span className="hidden md:inline text-caption">Dense List</span>
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
 type="button"
 key={cat}
 onClick={() => setActiveCategory(cat)}
 className={cn(
 "h-8 px-space-3.5 text-caption rounded-full font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap flex items-center gap-1.5 border",
 isActive
 ? "bg-primary text-white border-primary shadow-xs"
 : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground hover:bg-card/80 hover:border-border"
 )}
 >
 <span>{cat}</span>
 <span
 className={cn(
 "px-1.5 py-0.2 rounded-full text-caption font-mono",
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
 <div className="text-center py-space-16 text-muted-foreground rounded-2xl border-[hsl(var(--foreground)/0.06)] bg-card/20">
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
 <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border-primary/20 bg-primary/5 mb-space-6">
 <Terminal className="h-3.5 w-3.5 text-primary" />
 <span className="text-caption uppercase tracking-widest font-medium text-primary">Custom SDKs</span>
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
            ].map((tab) => {
              const isActive = activeCodeTab === tab.id;
              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveCodeTab(tab.id as any)}
                  className={cn(
                    "w-full text-left p-space-4 rounded-xl border transition-all duration-200 flex items-start gap-space-3.5 cursor-pointer select-none",
                    isActive
                      ? "border-primary/50 bg-card shadow-sm ring-1 ring-primary/20"
                      : "border-border/40 bg-card/40 hover:bg-card/80 hover:border-border/80"
                  )}
                >
                  <div
                    className={cn(
                      "p-space-2 rounded-lg shrink-0 transition-colors",
                      isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {tab.icon}
                  </div>
                  <div className="min-w-0">
                    <span className={cn(
                      "text-body-sm font-semibold block transition-colors",
                      isActive ? "text-primary font-bold" : "text-foreground"
                    )}>
                      {tab.title}
                    </span>
                    <span className="text-caption text-muted-foreground block mt-0.5 leading-snug">
                      {tab.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right pane: code playground */}
          <div className="lg:col-span-2 relative rounded-2xl border border-border/40 bg-[#0A0E17] text-slate-200 overflow-hidden flex flex-col min-h-96 shadow-lg">
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
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 text-caption font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-md border border-slate-700/60 transition-colors cursor-pointer select-none"
              >
                {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
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
 <div className="inline-flex items-center gap-space-2 px-space-3.5 py-space-1.5 rounded-full border-primary/20 bg-primary/5 mb-space-6">
 <ShieldCheck className="h-3.5 w-3.5 text-primary" />
 <span className="text-caption uppercase tracking-widest font-medium text-primary">SLA Custom Queue</span>
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
 <div className="p-space-5 rounded-2xl border-[hsl(var(--foreground)/0.06)] bg-card/60 backdrop-blur-xs flex gap-space-3.5 shadow-xs">
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
 <div className="p-space-5 rounded-2xl border-[hsl(var(--foreground)/0.06)] bg-card/60 backdrop-blur-xs flex gap-space-3.5 shadow-xs">
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