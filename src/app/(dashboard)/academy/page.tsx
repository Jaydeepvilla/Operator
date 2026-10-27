"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { PageTitle } from "@/components/shared/page-title";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/shared/button";
import { Badge } from "@/components/shared/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/shared/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/shared/card";
import {
 GraduationCap,
 CheckCircle2,
 Circle,
 PlayCircle,
 RotateCcw,
 BookOpen,
 ArrowRight,
 Sparkles,
 ExternalLink,
 ShieldAlert,
 HelpCircle,
 Check,
 ChevronDown,
 ChevronUp,
 Cpu,
 Layers,
 Calendar,
 CreditCard,
 Radio,
 Sliders,
 AlertTriangle,
 Loader2,
} from "lucide-react";
import Link from "next/link";
import {
 getFounderProgressAction,
 completeLessonAction,
 passExerciseAction,
 resetProgressAction,
 runSimulatorScenarioAction,
 type SimulatorScenarioOutcome,
} from "@/server/actions/academy";

interface LearningModule {
 id: string;
 number: number;
 title: string;
 tagline: string;
 learningObjective: string;
 beginnerExplanation: string;
 businessValue: string;
 deepLink: string;
 deepLinkLabel: string;
 demoPitch: string;
 walkthroughSteps: string[];
 exercise: {
 id: string;
 prompt: string;
 expectedOutcome: string;
 };
 checklist: string[];
}

const ACADEMY_MODULES: LearningModule[] = [
 {
 id: "module-1",
 number: 1,
 title: "Understand Operator",
 tagline: "The foundation of autonomous operations & the AI receptionist role",
 learningObjective:
 "Understand what Operator does, who it serves, what an autonomous receptionist can and cannot do, and why verified business actions are distinct from conversational guesses.",
 beginnerExplanation:
 "Think of Operator as your business's top front-desk receptionist who never sleeps, never takes sick leave, and speaks fluent conversational English. However, unlike a human who might guess, Operator is hardwired to only confirm bookings or take payments when your actual calendar and bank account authorize it.",
 businessValue:
 "Most small businesses miss 35-50% of incoming inquiries after 6 PM or while staff is busy. Operator captures those high-intent leads instantly without hiring extra staff.",
 deepLink: "/dashboard",
 deepLinkLabel: "View Main Dashboard",
 demoPitch:
 "'Imagine never missing another after-hours client call or booking inquiry. Operator greets your customers, answers questions using your approved policies, checks your real staff calendar, and safely collects upfront deposits.'",
 walkthroughSteps: [
 "Navigate through the high-level dashboard metrics.",
 "Understand the difference between AI knowledge generation and authoritative database mutations.",
 "Recognize that the website widget is completely optional—Operator runs via SMS, phone, WhatsApp, and hosted booking pages.",
 ],
 exercise: {
 id: "ex-1-foundations",
 prompt: "Identify the 3 core responsibilities of an autonomous AI receptionist.",
 expectedOutcome: "1. 24/7 client engagement, 2. Deterministic schedule booking, 3. Upfront deposit collection.",
 },
 checklist: [
 "I understand that Operator uses Google Gemini solely for conversational intelligence.",
 "I know that booking confirmations require real database locks, never AI hallucinations.",
 "I understand the difference between platform subscription and customer payments.",
 ],
 },
 {
 id: "module-2",
 number: 2,
 title: "Understand the Dashboard",
 tagline: "Navigating metrics, conversion funnels, and operational exceptions",
 learningObjective:
 "Inspect every major dashboard section, verify where numbers originate, and know exactly which action to take when exceptions arise.",
 beginnerExplanation:
 "Your dashboard is mission control. It displays real-time appointments, customer inquiries, deposit revenue, and active tasks. There are zero fabricated numbers—every metric connects directly to an active database row.",
 businessValue:
 "Gives business owners total visibility into their operations at a single glance, eliminating manual reconciliation spreadsheets.",
 deepLink: "/dashboard",
 deepLinkLabel: "Inspect Live Metrics",
 demoPitch:
 "'Here is the owner's cockpit. Every booking, conversation, and collected deposit flows here automatically in real time.'",
 walkthroughSteps: [
 "Review the total appointments and confirmed booking counters.",
 "Check the deposit revenue breakdown (collected vs pending holds).",
 "Inspect the Tasks & Exceptions alert banner for any items requiring human review.",
 ],
 exercise: {
 id: "ex-2-dashboard",
 prompt: "Explain what happens when an operational exception is flagged on the dashboard.",
 expectedOutcome: "The owner sees a severity badge and can open Tasks & Exceptions Center to retry or override safely.",
 },
 checklist: [
 "I know where appointment counts originate in the database.",
 "I understand the difference between confirmed and pending-payment bookings.",
 "I know where to find operational exceptions.",
 ],
 },
 {
 id: "module-3",
 number: 3,
 title: "Create a Demo Business",
 tagline: "Services, operating hours, staff schedules, and booking policies",
 learningObjective:
 "Set up an industry-specific business profile, configure services with prices and durations, define operating schedules, and set deposit rules.",
 beginnerExplanation:
 "Before Operator can greet clients, it must know what your business offers. In this module, you define your services (e.g., Haircut, Teeth Cleaning), how much they cost, which staff members perform them, and when the business is open.",
 businessValue:
 "Ensures the AI never books services you don't offer or schedules staff on their days off.",
 deepLink: "/services",
 deepLinkLabel: "Configure Services & Pricing",
 demoPitch:
 "'In under five minutes, you can configure your exact services, staff working hours, and deposit requirements. Operator immediately honors your business rules.'",
 walkthroughSteps: [
 "Add a primary service with a specific duration (e.g., 45 minutes) and price.",
 "Set operating hours (e.g., Monday through Friday 9 AM to 5 PM).",
 "Assign working staff members with individual weekly availability.",
 "Define booking policies such as cancellation cutoff and required deposits.",
 ],
 exercise: {
 id: "ex-3-services",
 prompt: "Configure at least one service with a duration and deposit requirement.",
 expectedOutcome: "Service persisted in database with valid durationMinutes and integer deposit price.",
 },
 checklist: [
 "Operating hours match business timezone accurately.",
 "Services have explicit durations to prevent overlapping bookings.",
 "Staff availability is correctly attached to active services.",
 ],
 },
 {
 id: "module-4",
 number: 4,
 title: "Train & Validate the AI Receptionist",
 tagline: "Knowledge base ingestion, grounded answers, and human handoff",
 learningObjective:
 "Learn how Operator retrieves business policies, produces grounded citations, detects booking intent, and escalates gracefully when confidence is low.",
 beginnerExplanation:
 "Operator does not guess answers. It indexes your documents, FAQs, and pricing policies into a vector knowledge base. When a client asks a question, Operator retrieves the exact sentence from your policy and answers with grounded citations.",
 businessValue:
 "Prevents dangerous legal, medical, or pricing hallucinations. Protects business reputation.",
 deepLink: "/kb",
 deepLinkLabel: "Open Knowledge Base",
 demoPitch:
 "'Unlike generic chatbots that make things up, Operator is strictly grounded in your uploaded documents. If a client asks an unusual question outside its knowledge, it gracefully routes to your team.'",
 walkthroughSteps: [
 "Upload a business policy document or add an FAQ.",
 "Test a common customer question in the knowledge preview.",
 "Verify that citations link directly to your approved source text.",
 "Verify that low-confidence inquiries trigger human handoff in Tasks & Exceptions.",
 ],
 exercise: {
 id: "ex-4-kb",
 prompt: "Test asking a policy question and verify citation grounding.",
 expectedOutcome: "Response contains approved text and citation without confabulation.",
 },
 checklist: [
 "Knowledge chunks are indexed in vector storage.",
 "Grounded responses include source citations.",
 "Unknown inquiries route to the human escalation queue.",
 ],
 },
 {
 id: "module-5",
 number: 5,
 title: "Run the Complete Booking Journey",
 tagline: "Availability discovery, concurrency locking, and status transitions",
 learningObjective:
 "Execute the entire public booking flow: discovering open slots, reserving a time, preventing double bookings, and handling cancellations/rescheduling.",
 beginnerExplanation:
 "Clients can book anytime via your business's dedicated public link (e.g. /book/your-business). Operator checks real-time calendar availability, uses database transaction locks so two clients can never book the exact same slot, and issues instant confirmations.",
 businessValue:
 "Completely eliminates double bookings and calendar phone tag, providing a seamless mobile-first booking experience.",
 deepLink: "/appointments",
 deepLinkLabel: "View Bookings & Calendar",
 demoPitch:
 "'Your clients get a frictionless booking link that works on any phone. No app download, no account creation required. They pick a slot, enter their details, and they are booked.'",
 walkthroughSteps: [
 "Open your business's public booking URL in an incognito window.",
 "Select a service and view available time slots.",
 "Submit an appointment reservation.",
 "Observe the appointment appear immediately on your dashboard calendar.",
 ],
 exercise: {
 id: "ex-5-booking",
 prompt: "Simulate two simultaneous bookings for the same slot to test concurrency locking.",
 expectedOutcome: "First request succeeds; second receives a graceful 409 Conflict with alternate slot options.",
 },
 checklist: [
 "Public booking page loads without requiring user login.",
 "Timezone conversions match business-local time.",
 "Advisory transaction locks prevent double bookings under concurrency.",
 ],
 },
 {
 id: "module-6",
 number: 6,
 title: "Configure Customer Communications",
 tagline: "Connecting channels, delivery tracking, and retries",
 learningObjective:
 "Understand inbound and outbound communications across WhatsApp, SMS, Email, and Voice, recognize delivery statuses, and configure external provider keys.",
 beginnerExplanation:
 "Operator can communicate across multiple channels. Each channel has an adapter that verifies webhook signatures, normalizes messages, and routes them to the shared business actions engine. If a message fails delivery, Operator retries safely.",
 businessValue:
 "Meet your customers wherever they are: WhatsApp, text message, phone call, or website.",
 deepLink: "/channels",
 deepLinkLabel: "View Channels & Integrations",
 demoPitch:
 "'Whether a client texts your business number, messages you on WhatsApp, or clicks your booking link, Operator greets them with the same intelligent service.'",
 walkthroughSteps: [
 "Inspect the Channels overview page.",
 "Review provider requirements (Twilio for SMS/Voice, Meta Graph API for WhatsApp).",
 "Check connection health statuses (Connected, Sandbox Verified, Action Required).",
 ],
 exercise: {
 id: "ex-6-comms",
 prompt: "Check the delivery status of an outbound notification in the activity log.",
 expectedOutcome: "Status reflects 'delivered' or logs an exception with recovery guidance.",
 },
 checklist: [
 "Webhook endpoints authenticate provider signatures.",
 "Delivery failures create actionable exceptions in the Tasks Center.",
 "Channels operate independently without requiring the chat widget.",
 ],
 },
 {
 id: "module-7",
 number: 7,
 title: "Understand Payments",
 tagline: "Deposits, payment links, webhook verification, and reconciliation",
 learningObjective:
 "Master the difference between Operator subscription billing and customer deposit payments, verify webhook signatures, and understand reconciliation.",
 beginnerExplanation:
 "Never trust a browser redirect as proof of payment! Operator waits for an authoritative, cryptographically signed webhook from Stripe or Razorpay before marking a booking confirmed. If payment fails or is abandoned, the held slot is released automatically.",
 businessValue:
 "Secures revenue upfront and virtually eliminates no-shows through deposits.",
 deepLink: "/settings/booking/deposits",
 deepLinkLabel: "View Deposit Settings",
 demoPitch:
 "'Require a $25 deposit for premium appointments. Operator creates a secure payment link, verifies the charge via banking webhooks, and only confirms the booking once funds are secured.'",
 walkthroughSteps: [
 "Review customer payment session creation.",
 "Understand the 15-minute slot hold timer.",
 "Examine webhook verification for checkout.session.completed.",
 "Inspect the automated reconciliation cron that rescues delayed payments.",
 ],
 exercise: {
 id: "ex-7-payments",
 prompt: "Trace a payment state transition from pending -> succeeded.",
 expectedOutcome: "customerPayments row transitions to succeeded and triggers appointment confirmation.",
 },
 checklist: [
 "Operator SaaS subscription billing is strictly separated from customer payments.",
 "Payment amounts stored in exact integer minor units (e.g. cents).",
 "Zero confirmations granted from unverified browser redirects.",
 ],
 },
 {
 id: "module-8",
 number: 8,
 title: "Operate the Business",
 tagline: "Omnichannel inbox, customer CRM, escalations, and audit trails",
 learningObjective:
 "Manage daily operations: responding to omnichannel conversations, tracking customer profiles, handling staff schedules, and resolving escalations.",
 beginnerExplanation:
 "The Omnichannel Inbox consolidates all customer conversations across SMS, WhatsApp, and Web into a single stream. Staff can view customer history, claim escalations, and see complete audit trails for every automated action.",
 businessValue:
 "Saves staff hours every week by putting all client history, past appointments, and messages in one searchable place.",
 deepLink: "/inbox",
 deepLinkLabel: "Open Omnichannel Inbox",
 demoPitch:
 "'Here is your unified inbox. Your team can see what the AI said, take over the conversation with one click, or review past appointment notes.'",
 walkthroughSteps: [
 "View customer interaction threads in the Inbox.",
 "Inspect customer contact details and appointment history.",
 "Check staff assignment and scheduling adjustments.",
 "Examine the immutable audit log for compliance.",
 ],
 exercise: {
 id: "ex-8-crm",
 prompt: "Open an inbox conversation and inspect the attached customer profile.",
 expectedOutcome: "Customer profile shows full appointment history and contact metadata.",
 },
 checklist: [
 "Customer records automatically deduplicated by phone and email.",
 "Conversations can be handed off to staff with 1 click.",
 "Audit logs record all automated AI decisions and actions.",
 ],
 },
 {
 id: "module-9",
 number: 9,
 title: "Go Live Safely",
 tagline: "Production readiness checklist, security, and founder launch review",
 learningObjective:
 "Conduct a comprehensive pre-launch review of your business profile, service offerings, calendar sync, payment accounts, and security settings before accepting real clients.",
 beginnerExplanation:
 "Going live means switching from testing to accepting real clients and real money. This final module provides an automated readiness checklist to ensure everything is configured properly before you announce your new AI receptionist.",
 businessValue:
 "Guarantees a flawless first impression with real clients, preventing configuration oversights.",
 deepLink: "/settings",
 deepLinkLabel: "Review Business Settings",
 demoPitch:
 "'Before opening the doors, our automated readiness checklist verifies your hours, services, calendar sync, and payment credentials. You launch with 100% confidence.'",
 walkthroughSteps: [
 "Verify business address, contact phone, and timezone.",
 "Check that at least one service has an active schedule and assigned staff.",
 "Run a test booking on the live booking page.",
 "Verify payment provider webhook endpoints.",
 ],
 exercise: {
 id: "ex-9-golive",
 prompt: "Run the final readiness checklist and verify all required items pass.",
 expectedOutcome: "Readiness score is 100% or explicitly flags missing credentials.",
 },
 checklist: [
 "All services have active staff schedules assigned.",
 "Business hours reflect actual open days.",
 "Payment provider credentials configured and tested.",
 "Security and tenant isolation verified.",
 ],
 },
];

const SIMULATOR_SCENARIOS = [
 { id: "business-hours-query", name: "Customer asks for business hours", category: "knowledge" },
 { id: "kb-grounded-answer", name: "Customer asks question answered by Knowledge Base", category: "knowledge" },
 { id: "booking-request-standard", name: "Customer requests an available booking", category: "booking" },
 { id: "slot-unavailable", name: "Requested time is unavailable (Outside hours)", category: "booking" },
 { id: "double-booking-contention", name: "Two customers compete for exact same slot (Concurrency Lock)", category: "booking" },
 { id: "reschedule-request", name: "Customer requests a reschedule (>24 hrs notice)", category: "booking" },
 { id: "cancellation-request", name: "Customer cancels an appointment", category: "booking" },
 { id: "deposit-required", name: "Deposit required before booking confirmation", category: "payment" },
 { id: "payment-succeeds", name: "Payment succeeds via authenticated webhook", category: "payment" },
 { id: "payment-fails", name: "Payment fails (declined card retry link)", category: "payment" },
 { id: "delayed-confirmation-reconciliation", name: "Payment succeeds but confirmation delayed (Reconciliation Cron)", category: "exception" },
 { id: "delivery-failure", name: "Outbound SMS message delivery failure", category: "communication" },
 { id: "channel-disconnect", name: "Channel disconnects (OAuth expired alert)", category: "exception" },
 { id: "ai-confidence-gap", name: "AI confidence low (Grounded boundary / Human handoff)", category: "knowledge" },
 { id: "human-intervention-required", name: "Human intervention required (VIP quote / custom case)", category: "exception" },
];

export default function FounderAcademyPage() {
 const [activeTab, setActiveTab] = useState<"modules" | "simulator">("modules");
 const [selectedModule, setSelectedModule] = useState<LearningModule>(ACADEMY_MODULES[0]);
 const [expandedPitch, setExpandedPitch] = useState<boolean>(false);
 const [loading, setLoading] = useState<boolean>(true);
 const [actionLoading, setActionLoading] = useState<boolean>(false);
 const [progress, setProgress] = useState<any>(null);
 const [exerciseFeedback, setExerciseFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

 // Simulator state
 const [selectedScenarioId, setSelectedScenarioId] = useState<string>(SIMULATOR_SCENARIOS[0].id);
 const [scenarioFilter, setScenarioFilter] = useState<string>("all");
 const [scenarioOutcome, setScenarioOutcome] = useState<SimulatorScenarioOutcome | null>(null);
 const [simulatorLoading, setSimulatorLoading] = useState<boolean>(false);

 useEffect(() => {
 loadProgress();
 }, []);

 async function loadProgress() {
 setLoading(true);
 try {
 const res = await getFounderProgressAction();
 if (res.success && res.data) {
 setProgress(res.data);
 }
 } finally {
 setLoading(false);
 }
 }

 async function handleCompleteLesson(lessonId: string) {
 setActionLoading(true);
 try {
 const nextNum = selectedModule.number + 1;
 const nextId = nextNum <= 9 ? `module-${nextNum}` : undefined;
 const res = await completeLessonAction(lessonId, nextId);
 if (res.success && res.data) {
 setProgress(res.data);
 if (nextNum <= 9) {
 setSelectedModule(ACADEMY_MODULES[nextNum - 1]);
 setExerciseFeedback(null);
 }
 }
 } finally {
 setActionLoading(false);
 }
 }

 async function handlePassExercise(exerciseId: string) {
 setActionLoading(true);
 setExerciseFeedback(null);
 try {
 const res = await passExerciseAction(exerciseId);
 if (res.success && res.data) {
 setProgress(res.data);
 setExerciseFeedback({
 type: "success",
 message: "Verification passed! Real business requirements confirmed in database.",
 });
 } else {
 setExerciseFeedback({
 type: "error",
 message: res.error || "Verification failed: Requirements not met in database. Check guidelines and try again.",
 });
 }
 } finally {
 setActionLoading(false);
 }
 }

 async function handleResetProgress() {
 if (!confirm("Are you sure you want to reset your learning progress? This will reset all module completions.")) return;
 setActionLoading(true);
 try {
 const res = await resetProgressAction();
 if (res.success && res.data) {
 setProgress(res.data);
 setSelectedModule(ACADEMY_MODULES[0]);
 }
 } finally {
 setActionLoading(false);
 }
 }

 async function handleRunScenario(id: string) {
 setSimulatorLoading(true);
 setScenarioOutcome(null);
 try {
 const res = await runSimulatorScenarioAction(id);
 if (res.success && res.data) {
 setScenarioOutcome(res.data);
 await loadProgress();
 }
 } finally {
 setSimulatorLoading(false);
 }
 }

 const completedCount = progress?.lessonsCompleted?.length || 0;
 const exercisesCount = progress?.exercisesPassed?.length || 0;
 const simulatorCount = Object.keys(progress?.simulatorResults || {}).length;
 const overallPercentage = Math.round(((completedCount + exercisesCount) / (9 + 9)) * 100);

 const filteredScenarios = SIMULATOR_SCENARIOS.filter(
 (s) => scenarioFilter === "all" || s.category === scenarioFilter
 );

 return (
 <div className="space-y-space-6 max-w-7xl mx-auto pb-space-12">
 {/* Page Title */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-4">
 <PageTitle
 title="Founder Academy & Interactive Simulator"
 description="Master Operator from zero technical foundation. Practice real autonomous workflows, inspect system state, and prepare flawless customer demonstrations."
 />
 <div className="flex items-center gap-space-2">
 <Button
 variant="outline"
 size="sm"
 onClick={handleResetProgress}
 disabled={actionLoading}
 className="text-body-sm"
 >
 <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
 Reset Progress
 </Button>
 <Link href="/demo-center">
 <Button size="sm" className="text-body-sm bg-primary text-primary-foreground">
 <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
 Demo Control Center
 </Button>
 </Link>
 </div>
 </div>

 {/* Progress Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-4">
 <StatCard
 label="Learning Progress"
 value={`${overallPercentage}%`}
 subtitle="Real calculated mastery"
 icon={GraduationCap}
 />
 <StatCard
 label="Modules Completed"
 value={`${completedCount} / 9`}
 subtitle="Core business curricula"
 icon={BookOpen}
 />
 <StatCard
 label="Exercises Passed"
 value={`${exercisesCount} / 9`}
 subtitle="Interactive practical tasks"
 icon={CheckCircle2}
 />
 <StatCard
 label="Workflows Practiced"
 value={`${simulatorCount} / 15`}
 subtitle="Simulator scenarios tested"
 icon={Layers}
 />
 </div>

 {/* Main Tabs */}
 <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
 <TabsList className="grid w-full grid-cols-2 max-w-md">
 <TabsTrigger value="modules" className="flex items-center gap-2">
 <BookOpen className="h-4 w-4" />
 9 Learning Modules
 </TabsTrigger>
 <TabsTrigger value="simulator" className="flex items-center gap-2">
 <Cpu className="h-4 w-4" />
 Workflow Simulator (15 Scenarios)
 </TabsTrigger>
 </TabsList>

 {/* ─── TAB 1: 9 LEARNING MODULES ─── */}
 <TabsContent value="modules" className="space-y-space-6 pt-space-4">
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-6">
 {/* Sidebar Module List */}
 <div className="lg:col-span-4 space-y-space-2">
 <div className="text-caption font-semibold text-muted-foreground uppercase tracking-wider px-space-2">
 Core Curriculum
 </div>
 <div className="space-y-1.5">
 {ACADEMY_MODULES.map((mod) => {
 const isCompleted = progress?.lessonsCompleted?.includes(mod.id);
 const isSelected = selectedModule.id === mod.id;

 return (
 <Button
 key={mod.id}
 onClick={() => {
 setSelectedModule(mod);
 setExpandedPitch(false);
 }}
 className={`w-full text-left p-space-3 rounded-lg border transition-all flex items-start gap-3 ${
 isSelected
 ? "bg-accent border-primary/40 shadow-sm"
 : "bg-card hover:bg-muted/50 border-border"
 }`}
 >
 <div className="mt-0.5">
 {isCompleted ? (
 <CheckCircle2 className="h-5 w-5 text-emerald-500" />
 ) : (
 <div
 className={`h-5 w-5 rounded-full border flex items-center justify-center text-caption font-medium ${
 isSelected
 ? "border-primary text-primary"
 : "border-muted-foreground/40 text-muted-foreground"
 }`}
 >
 {mod.number}
 </div>
 )}
 </div>
 <div className="min-w-0 flex-1">
 <div className="flex items-center justify-between">
 <span
 className={`text-body-sm font-semibold truncate ${
 isSelected ? "text-foreground" : "text-foreground/80"
 }`}
 >
 {mod.title}
 </span>
 {isCompleted && (
 <Badge variant="success" className="text-caption py-0 px-1.5 ml-2">
 Passed
 </Badge>
 )}
 </div>
 <p className="text-[12px] text-muted-foreground truncate mt-0.5">
 {mod.tagline}
 </p>
 </div>
 </Button>
 );
 })}
 </div>
 </div>

 {/* Active Module Details */}
 <div className="lg:col-span-8 space-y-space-5">
 <Card>
 <CardHeader>
 <div className="flex items-center justify-between flex-wrap gap-2">
 <Badge variant="outline" className="text-caption font-mono">
 Module {selectedModule.number} of 9
 </Badge>
 {progress?.lessonsCompleted?.includes(selectedModule.id) ? (
 <Badge variant="success" className="flex items-center gap-1">
 <Check className="h-3 w-3" /> Completed
 </Badge>
 ) : (
 <Badge variant="warning">In Progress</Badge>
 )}
 </div>
 <CardTitle className="text-heading-md mt-2">{selectedModule.title}</CardTitle>
 <CardDescription className="text-body-sm text-muted-foreground">
 {selectedModule.tagline}
 </CardDescription>
 </CardHeader>

 <CardContent className="space-y-space-5">
 {/* Learning Objective */}
 <div className="p-space-3.5 rounded-lg bg-muted/40 border-border">
 <div className="text-caption font-semibold text-foreground flex items-center gap-1.5 mb-1">
 <Sparkles className="h-4 w-4 text-primary" />
 Learning Objective
 </div>
 <p className="text-body-sm text-foreground/90 leading-relaxed">
 {selectedModule.learningObjective}
 </p>
 </div>

 {/* Beginner-friendly explanation */}
 <div>
 <h4 className="text-body-md font-semibold text-foreground mb-1">
 Plain English Explanation
 </h4>
 <p className="text-body-sm text-muted-foreground leading-relaxed">
 {selectedModule.beginnerExplanation}
 </p>
 </div>

 {/* Why it matters to a business */}
 <div className="border-l border-primary/60 pl-space-3 py-1">
 <h5 className="text-caption font-semibold text-foreground uppercase tracking-wide">
 Why This Matters to a Real Business
 </h5>
 <p className="text-body-sm text-muted-foreground mt-0.5">
 {selectedModule.businessValue}
 </p>
 </div>

 {/* Step-by-step walkthrough */}
 <div>
 <h4 className="text-body-md font-semibold text-foreground mb-2">
 Interactive Walkthrough
 </h4>
 <ol className="space-y-2 list-decimal list-inside text-body-sm text-foreground/80">
 {selectedModule.walkthroughSteps.map((step, idx) => (
 <li key={idx} className="pl-1">
 <span className="text-foreground">{step}</span>
 </li>
 ))}
 </ol>
 </div>

 {/* Practical Exercise Box */}
 <div className="p-space-4 rounded-lg bg-card border-primary/30 shadow-sm space-y-3">
 <div className="flex items-center justify-between">
 <div className="text-body-sm font-semibold text-foreground flex items-center gap-1.5">
 <Cpu className="h-4 w-4 text-primary" />
 Practical Exercise
 </div>
 {progress?.exercisesPassed?.includes(selectedModule.exercise.id) ? (
 <Badge variant="success" className="text-caption">
 Passed
 </Badge>
 ) : (
 <Button
 size="sm"
 variant="outline"
 onClick={() => handlePassExercise(selectedModule.exercise.id)}
 disabled={actionLoading}
 className="h-7 text-[12px]"
 >
 Verify Exercise
 </Button>
 )}
 </div>
 <p className="text-body-sm text-foreground/90 font-medium">
 {selectedModule.exercise.prompt}
 </p>
 <div className="text-[12px] text-muted-foreground bg-muted/30 p-2 rounded border-border">
 <span className="font-semibold text-foreground/70">Expected Result: </span>
 {selectedModule.exercise.expectedOutcome}
 </div>

 {exerciseFeedback && (
 <div
 className={`p-2.5 rounded text-body-sm flex items-start gap-2 border ${
 exerciseFeedback.type === "success"
 ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
 : "bg-destructive/10 text-destructive border-destructive/30"
 }`}
 >
 {exerciseFeedback.type === "success" ? (
 <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
 ) : (
 <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
 )}
 <span>{exerciseFeedback.message}</span>
 </div>
 )}
 </div>

 {/* Verification Checklist */}
 <div>
 <h4 className="text-body-md font-semibold text-foreground mb-2">
 Verification Checklist
 </h4>
 <div className="space-y-2">
 {selectedModule.checklist.map((item, idx) => (
 <div key={idx} className="flex items-start gap-2.5 text-body-sm">
 <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
 <span className="text-foreground/80">{item}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Show me how to demonstrate this (Customer pitch) */}
 <div className="border-border rounded-lg overflow-hidden">
 <Button
 onClick={() => setExpandedPitch(!expandedPitch)}
 className="w-full p-space-3 bg-muted/30 hover:bg-muted/50 flex items-center justify-between text-left text-body-sm font-medium text-foreground transition-colors"
 >
 <span className="flex items-center gap-2">
 <Sparkles className="h-4 w-4 text-amber-500" />
 Show me how to demonstrate this to a customer
 </span>
 {expandedPitch ? (
 <ChevronUp className="h-4 w-4 text-muted-foreground" />
 ) : (
 <ChevronDown className="h-4 w-4 text-muted-foreground" />
 )}
 </Button>
 {expandedPitch && (
 <div className="p-space-4 bg-card text-body-sm text-foreground/90 leading-relaxed border-t border-border">
 <p className="italic">{selectedModule.demoPitch}</p>
 </div>
 )}
 </div>
 </CardContent>

 <CardFooter className="flex items-center justify-between flex-wrap gap-3 pt-space-2 border-t border-border">
 <Link href={selectedModule.deepLink}>
 <Button variant="outline" size="sm" className="text-body-sm">
 <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
 Practice it now: {selectedModule.deepLinkLabel}
 </Button>
 </Link>

 <Button
 size="sm"
 onClick={() => handleCompleteLesson(selectedModule.id)}
 disabled={
 actionLoading || progress?.lessonsCompleted?.includes(selectedModule.id)
 }
 className="text-body-sm"
 >
 {progress?.lessonsCompleted?.includes(selectedModule.id) ? (
 <>
 <Check className="h-3.5 w-3.5 mr-1.5" /> Lesson Completed
 </>
 ) : (
 <>
 Mark Lesson Completed
 <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
 </>
 )}
 </Button>
 </CardFooter>
 </Card>
 </div>
 </div>
 </TabsContent>

 {/* ─── TAB 2: INTERACTIVE WORKFLOW SIMULATOR (15 SCENARIOS) ─── */}
 <TabsContent value="simulator" className="space-y-space-6 pt-space-4">
 <div className="p-space-4 rounded-lg bg-muted/30 border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <h3 className="text-heading-sm font-semibold text-foreground">
 Autonomous Operational Simulator
 </h3>
 <p className="text-body-sm text-muted-foreground mt-0.5">
 Execute 15 realistic business conditions. Inspect the real database outcomes, concurrency guards, exception logs, and recovery paths.
 </p>
 </div>
 {/* Category Filter */}
 <div className="flex items-center gap-1.5 flex-wrap">
 {["all", "knowledge", "booking", "payment", "communication", "exception"].map((cat) => (
 <Button
 key={cat}
 variant={scenarioFilter === cat ? "default" : "outline"}
 size="sm"
 onClick={() => setScenarioFilter(cat)}
 className="capitalize text-caption h-7 px-2.5"
 >
 {cat}
 </Button>
 ))}
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-6">
 {/* Scenario List */}
 <div className="lg:col-span-5 space-y-1.5 max-h-[750px] overflow-y-auto pr-1">
 {filteredScenarios.map((sc) => {
 const isSelected = selectedScenarioId === sc.id;
 const hasResult = progress?.simulatorResults?.[sc.id];

 return (
 <Button
 key={sc.id}
 onClick={() => {
 setSelectedScenarioId(sc.id);
 if (hasResult?.details) {
 setScenarioOutcome(hasResult.details);
 } else {
 setScenarioOutcome(null);
 }
 }}
 className={`w-full text-left p-space-3 rounded-lg border transition-all flex items-start justify-between gap-3 ${
 isSelected
 ? "bg-accent border-primary/50 shadow-sm"
 : "bg-card hover:bg-muted/40 border-border"
 }`}
 >
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-2">
 <span
 className={`text-body-sm font-medium ${
 isSelected ? "text-foreground" : "text-foreground/80"
 }`}
 >
 {sc.name}
 </span>
 </div>
 <div className="flex items-center gap-2 mt-1">
 <Badge variant="outline" className="text-caption py-0 px-1.5 capitalize">
 {sc.category}
 </Badge>
 {hasResult && (
 <span className="text-caption text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
 <Check className="h-3 w-3" /> Tested
 </span>
 )}
 </div>
 </div>
 </Button>
 );
 })}
 </div>

 {/* Scenario Execution & Results Output */}
 <div className="lg:col-span-7 space-y-space-4">
 <Card>
 <CardHeader>
 <div className="flex items-center justify-between flex-wrap gap-2">
 <CardTitle className="text-heading-sm">
 {SIMULATOR_SCENARIOS.find((s) => s.id === selectedScenarioId)?.name}
 </CardTitle>
 <Button
 size="sm"
 onClick={() => handleRunScenario(selectedScenarioId)}
 disabled={simulatorLoading}
 className="bg-primary text-primary-foreground"
 >
 {simulatorLoading ? (
 <>
 <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
 Executing Workflow...
 </>
 ) : (
 <>
 <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
 Run Scenario Now
 </>
 )}
 </Button>
 </div>
 <CardDescription className="text-body-sm">
 Executes real business action logic with safe sandboxed data.
 </CardDescription>
 </CardHeader>

 <CardContent className="space-y-space-4">
 {scenarioOutcome ? (
 <div className="space-y-space-3">
 {/* Top Status Banner */}
 <div className="p-space-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
 <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-body-sm">
 <CheckCircle2 className="h-4 w-4" />
 Execution Verified
 </div>
 <span className="text-caption text-muted-foreground font-mono">
 {new Date(scenarioOutcome.timestamp).toLocaleTimeString()}
 </span>
 </div>

 {/* 9 Structured Analysis Points */}
 <div className="space-y-2.5 text-body-sm">
 <div className="p-2.5 rounded bg-muted/30 border-border">
 <span className="font-semibold text-foreground block text-caption uppercase text-muted-foreground">
 1. Initial Conditions
 </span>
 <span className="text-foreground/90">{scenarioOutcome.initialConditions}</span>
 </div>

 <div className="p-2.5 rounded bg-muted/30 border-border">
 <span className="font-semibold text-foreground block text-caption uppercase text-muted-foreground">
 2. Triggering Event
 </span>
 <span className="text-foreground/90 font-mono text-[13px]">
 {scenarioOutcome.triggerEvent}
 </span>
 </div>

 <div className="p-2.5 rounded bg-muted/30 border-border">
 <span className="font-semibold text-foreground block text-caption uppercase text-muted-foreground">
 3. Expected System Behavior
 </span>
 <span className="text-foreground/90">{scenarioOutcome.expectedBehavior}</span>
 </div>

 <div className="p-2.5 rounded bg-muted/30 border-border">
 <span className="font-semibold text-foreground block text-caption uppercase text-muted-foreground">
 4. Actual Result
 </span>
 <span className="text-foreground/90 font-medium">
 {scenarioOutcome.actualResult}
 </span>
 </div>

 <div className="p-2.5 rounded bg-muted/30 border-border">
 <span className="font-semibold text-foreground block text-caption uppercase text-muted-foreground">
 5. Resulting Database / Business State
 </span>
 <span className="text-foreground/90 font-mono text-[12px]">
 {scenarioOutcome.resultingDbState}
 </span>
 </div>

 <div className="p-2.5 rounded bg-muted/30 border-border">
 <span className="font-semibold text-foreground block text-caption uppercase text-muted-foreground">
 6. Notification / Background Job
 </span>
 <span className="text-foreground/90">{scenarioOutcome.notificationOrJob}</span>
 </div>

 <div className="p-2.5 rounded bg-muted/30 border-border">
 <span className="font-semibold text-foreground block text-caption uppercase text-muted-foreground">
 7. Audit Event / Exception Logged
 </span>
 <span className="text-foreground/90 font-mono text-[12px]">
 {scenarioOutcome.auditEventOrException}
 </span>
 </div>

 <div className="p-2.5 rounded bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/40">
 <span className="font-semibold text-emerald-800 dark:text-emerald-400 block text-caption uppercase">
 8. Why The Result Is Correct
 </span>
 <span className="text-foreground/90">{scenarioOutcome.whyCorrect}</span>
 </div>

 <div className="p-2.5 rounded bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/40">
 <span className="font-semibold text-amber-800 dark:text-amber-400 block text-caption uppercase">
 9. How To Recover
 </span>
 <span className="text-foreground/90">{scenarioOutcome.howToRecover}</span>
 </div>
 </div>
 </div>
 ) : (
 <div className="py-space-12 text-center space-y-3">
 <Cpu className="h-10 w-10 text-muted-foreground/40 mx-auto" />
 <div className="text-body-md font-medium text-foreground">
 Ready to Execute Scenario
 </div>
 <p className="text-body-sm text-muted-foreground max-w-sm mx-auto">
 Click "Run Scenario Now" above to trigger this operational workflow and inspect the authoritative outcome.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
