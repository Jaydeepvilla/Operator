import {
  Rocket,
  Compass,
  Bot,
  Brain,
  Calendar,
  PhoneCall,
  Layers,
  CreditCard,
  ShieldCheck,
  Code2,
} from "lucide-react";

export interface DocTocItem {
  id: string;
  title: string;
  level: number;
}

export interface DocItem {
  id: string;
  label: string;
  badge?: string;
}

export interface DocSection {
  section: string;
  icon: any;
  items: DocItem[];
}

export interface DocArticle {
  title: string;
  description: string;
  toc: DocTocItem[];
  content: string;
  code?: string;
}

export const SIDEBAR: DocSection[] = [
  {
    section: "Getting Started",
    icon: Rocket,
    items: [
      { id: "introduction", label: "Introduction to Operator" },
      { id: "quickstart", label: "5-Minute Quickstart" },
      { id: "onboarding-wizard", label: "Workspace Onboarding" },
      { id: "business-profile", label: "Business Profile & Hours" },
      { id: "testing-receptionist", label: "Testing Your Receptionist" },
    ],
  },
  {
    section: "Core Concepts",
    icon: Compass,
    items: [
      { id: "architecture-overview", label: "Platform Architecture" },
      { id: "conversations-and-sessions", label: "Conversations & Sessions" },
      { id: "lead-qualification-and-scoring", label: "Lead Qualification & CRM" },
      { id: "human-takeover-escalation", label: "Escalation & Takeover" },
    ],
  },
  {
    section: "AI Receptionist",
    icon: Bot,
    items: [
      { id: "ai-engine-orchestrator", label: "AI Orchestration & Intent" },
      { id: "ai-prompt-guidelines", label: "Custom Instructions & Prompts" },
      { id: "ai-limitations-safety", label: "Safety & Guardrails" },
    ],
  },
  {
    section: "Knowledge Base",
    icon: Brain,
    items: [
      { id: "knowledge-documents", label: "Documents & Formats" },
      { id: "website-crawler", label: "Website Crawler & Ingestion" },
      { id: "knowledge-categories", label: "Categories & AI Weighting" },
      { id: "faqs-knowledge", label: "FAQs Management" },
    ],
  },
  {
    section: "Appointments & Scheduling",
    icon: Calendar,
    items: [
      { id: "services-catalog", label: "Services & Durations" },
      { id: "staff-and-schedules", label: "Staff Rostering & Availability" },
      { id: "booking-rules", label: "Booking Rules & Buffers" },
      { id: "calendar-integrations", label: "Calendar Sync (Native & Calendly)" },
      { id: "appointment-management", label: "Rescheduling & Cancellations" },
    ],
  },
  {
    section: "Omnichannel Communications",
    icon: PhoneCall,
    items: [
      { id: "website-widget", label: "Website Chat Widget" },
      { id: "voice-ai-telephony", label: "Voice AI & Phone Lines" },
      { id: "meta-whatsapp", label: "WhatsApp Business API" },
      { id: "twilio-sms", label: "Two-Way SMS" },
      { id: "email-channel", label: "Email Integration" },
      { id: "instagram-facebook", label: "Instagram & Facebook" },
      { id: "unified-inbox", label: "Unified Inbox & Templates" },
    ],
  },
  {
    section: "Agency & White Label",
    icon: Layers,
    items: [
      { id: "agency-overview", label: "Agency Sub-Accounts" },
      { id: "white-label-branding", label: "Custom Branding & Domains" },
    ],
  },
  {
    section: "Billing & Plans",
    icon: CreditCard,
    items: [
      { id: "plans-and-pricing", label: "Subscription Plans & Limits" },
      { id: "payment-gateways", label: "Stripe & Razorpay Setup" },
      { id: "usage-tracking", label: "Usage Counters & Overage" },
    ],
  },
  {
    section: "Account & Team",
    icon: ShieldCheck,
    items: [
      { id: "user-authentication", label: "Authentication & Sessions" },
      { id: "roles-and-permissions", label: "Roles & Team Invites" },
    ],
  },
  {
    section: "Developer & Webhooks",
    icon: Code2,
    items: [
      { id: "webhook-endpoints", label: "Webhook Endpoints & Security" },
      { id: "widget-api-reference", label: "Widget API & Embed Code" },
      { id: "troubleshooting-guide", label: "Troubleshooting & Error Codes" },
    ],
  },
];

export const DOC_CONTENT: Record<string, DocArticle> = {
  // ─────────────────────────────────────────────────────────
  // 1. GETTING STARTED
  // ─────────────────────────────────────────────────────────
  introduction: {
    title: "Introduction to Operator",
    description: "Learn what Operator is, how it operates across customer communication channels, and how it automates appointments and inquiries.",
    toc: [
      { id: "what-is-operator", title: "What is Operator?", level: 2 },
      { id: "core-capabilities", title: "Core Capabilities", level: 2 },
      { id: "how-operator-works", title: "How Operator Works", level: 2 },
      { id: "supported-business-types", title: "Supported Business Types", level: 2 },
    ],
    content: `## What is Operator?

Operator is an autonomous AI receptionist and omnichannel scheduling platform built for appointment-driven service businesses. It handles incoming customer inquiries, qualifies leads, checks staff availability, and books appointments 24/7 across telephone calls, website chat, WhatsApp, SMS, email, and social direct messages.

Unlike simple rule-based chatbots, Operator understands natural conversational context, retrieves factual business knowledge using Retrieval-Augmented Generation (RAG), and executes deterministic actions against your real appointment calendar.

<Callout type="info" title="Codebase Truth">
Operator is a full-stack Next.js application backed by PostgreSQL and Drizzle ORM. All actions described in this documentation correspond directly to server actions in \`src/server/actions\` and backend services in \`src/server/services\`.
</Callout>

## Core Capabilities

- **Autonomous Voice Answering:** Answers incoming phone calls in natural speech with low audio latency, parses caller intent, and books calendar slots.
- **Embedded Website Widget:** Single-line JavaScript tag providing a branded conversational chat and appointment booking interface for web visitors.
- **Omnichannel Messaging:** Unified customer routing across Meta WhatsApp Business, Twilio SMS, Resend/SMTP Email, Instagram Direct, and Facebook Messenger.
- **Domain-Specific Knowledge Base:** Ingests PDFs, Word documents, text notes, spreadsheets, and live website crawls into vector embeddings for accurate answers.
- **Real-Time Calendar Availability:** Computes open booking slots by cross-referencing operating hours, staff working schedules, and buffer times.
- **Lead Qualification & CRM:** Automatically asks pre-configured qualification questions, calculates lead scores (0–100), and records customer profiles.
- **Seamless Human Escalation:** Allows staff to pause AI autonomy on any active thread and take over manually with internal staff notes.

## How Operator Works

1. **Inbound Request:** A customer initiates contact via phone call, website chat, WhatsApp, or SMS.
2. **Context Resolution:** The system resolves or creates a customer profile in the CRM, linking their channel identity to an existing conversation thread.
3. **Intent & Knowledge Retrieval:** The AI categorizes the customer's intent (e.g., booking, pricing, hours, cancellation) and retrieves relevant chunks from your Knowledge Base.
4. **Action Execution:** If the customer wants an appointment, Operator queries staff availability for the requested service and offers valid time slots.
5. **Confirmation & Notifications:** Once confirmed, the appointment is written to the database and automated confirmations are dispatched.

## Supported Business Types

Operator ships with tailored configuration templates for 8 primary industries:
- Dental Clinics (routine checkups, emergency tooth pain, whitening)
- Medical Clinics (general consults, follow-ups, assessments)
- Salons (haircuts, balayage, keratin treatments)
- Spas & Wellness (deep tissue massage, facials, manicure/pedicure)
- Law Firms (case evaluations, contract reviews)
- Consultants & Accountants (strategy calls, financial audits)
- Real Estate Agencies (property valuations, private walkthroughs)
- Gyms & Fitness Centers (facility tours, personal training sessions)`,
  },

  quickstart: {
    title: "5-Minute Quickstart Guide",
    description: "Get your AI receptionist configured and live in under 5 minutes.",
    toc: [
      { id: "step-1-create-workspace", title: "Step 1: Create Your Workspace", level: 2 },
      { id: "step-2-verify-services", title: "Step 2: Verify Services & Hours", level: 2 },
      { id: "step-3-upload-knowledge", title: "Step 3: Upload Initial Knowledge", level: 2 },
      { id: "step-4-embed-widget", title: "Step 4: Embed the Website Widget", level: 2 },
      { id: "step-5-test-booking", title: "Step 5: Run Your First Test Booking", level: 2 },
    ],
    content: `## Step 1: Create Your Workspace

After signing up at \`/sign-up\`, you will enter the Setup Wizard at \`/setup\`.

1. Enter your business name and primary website URL.
2. Select your industry template (e.g., *Dental Clinic*, *Salon*, or *Law Firm*).
3. Confirm your operational timezone (e.g., \`America/New_York\` or \`Europe/London\`).
4. Click **Complete Setup**. Operator will automatically seed your services, FAQs, qualification flow, and default business hours.

## Step 2: Verify Services & Hours

Navigate to **Services** (\`/services\`) and **Profile** (\`/profile\`) in the dashboard:
- Ensure your bookable services have accurate durations (e.g., 45 minutes) and prices.
- Verify your staff operating hours in **Profile > Hours** (default is Monday–Friday, 9:00 AM – 5:00 PM).

## Step 3: Upload Initial Knowledge

Go to **Knowledge Base** (\`/kb\`) to give your AI accurate context:
- Click **Upload Document** to upload your price sheet or policy manual (PDF, DOCX, CSV, TXT, MD up to 10 MB).
- Or enter your website URL in the **Website Import** tab to crawl your public pages automatically.

## Step 4: Embed the Website Widget

Navigate to **Website Widget** (\`/widget\`):
- Copy your unique 1-line script tag:

\`\`\`html
<script src="https://app.operator.ai/widget.js" data-org-id="YOUR_ORGANIZATION_ID"></script>
\`\`\`

- Paste it immediately before the closing \`</body>\` tag of your website HTML or CMS footer.

## Step 5: Run Your First Test Booking

Open the **Live Demo Simulator** at \`/demo\` or click the floating chat bubble on your website. Send a message like:

> *"Hi, I'd like to book an appointment for tomorrow morning."*

The AI will check your services, identify open time slots based on your schedule, collect your contact details, and create an appointment in your **Appointments** dashboard (\`/appointments\`).`,
  },

  "onboarding-wizard": {
    title: "Workspace Onboarding",
    description: "Understand the onboarding pipeline, automated website scraping, and industry template seeding.",
    toc: [
      { id: "onboarding-flow", title: "Onboarding Flow", level: 2 },
      { id: "automatic-website-extraction", title: "Website Content Extraction", level: 2 },
      { id: "template-seeding", title: "Template Seeding", level: 2 },
      { id: "organization-creation", title: "Organization Creation & Membership", level: 2 },
    ],
    content: `## Onboarding Flow

The onboarding wizard runs through the server action \`createOrganizationAction\` in \`src/server/actions/onboarding.ts\`. It is designed to get a new business fully operational in a single pass.

The setup screens follow four sequential steps:
1. **URL Discovery:** Enter your business website URL to run a live SSRF-safe crawl that extracts business identity and descriptions.
2. **Business Profile:** Confirm business name, contact phone, contact email, street address, and timezone.
3. **Industry Configuration:** Select one of 8 industry presets or enter custom parameters.
4. **Review & Activation:** Generates your organization record, seeds database tables, and initializes a 14-day free trial on the Starter plan.

## Website Content Extraction

When you enter a website URL during onboarding:
- The system checks URL validity using \`validateSafeUrl()\` to prevent Server-Side Request Forgery (SSRF). Private subnet IPs (10.x, 172.16.x, 192.168.x, 127.x) and cloud metadata services are strictly rejected.
- The crawler fetches the homepage HTML and extracts the page title, meta description, and primary text blocks.
- The extracted text is automatically segmented into knowledge chunks and stored in \`knowledgeChunks\` under a source labeled \`"Website Crawls"\`.

## Template Seeding

Based on the selected industry, the server automatically populates:
- **Services (\`services\`):** Default bookable offerings with standard durations (e.g., Teeth Cleaning: 45 min, Root Canal: 90 min).
- **FAQ Items (\`faq_items\`):** Pre-populated answers for insurance acceptance, cancellation policies, and intake requirements.
- **Qualification Flow (\`qualification_flows\`):** Questions to qualify leads (e.g., *"Are you a new or returning patient?"*).
- **Business Hours (\`business_settings\`):** Monday through Friday from 09:00 to 17:00, with Saturday and Sunday marked closed.

## Organization Creation & Membership

When onboarding finishes:
- An \`organizations\` record is created with a URL-safe unique slug (e.g., \`acme-dental-4821\`).
- The authenticated user is granted an \`owner\` role in \`memberships\`.
- An active 14-day trial is registered in the \`subscriptions\` table, unlocking website widget, voice telephony, and SMS features.`,
  },

  "business-profile": {
    title: "Business Profile & Operating Hours",
    description: "Manage business identity, physical address, operational timezone, and weekly operating hours.",
    toc: [
      { id: "profile-attributes", title: "Core Profile Attributes", level: 2 },
      { id: "operating-hours-configuration", title: "Operating Hours Configuration", level: 2 },
      { id: "timezone-criticality", title: "Timezone Alignment", level: 2 },
      { id: "how-ai-uses-profile", title: "How the AI Receptionist Uses Your Profile", level: 2 },
    ],
    content: `## Core Profile Attributes

Manage your company identity under **Profile** (\`/profile\`). These values are stored in the \`business_profiles\` and \`organizations\` tables:

- **Business Name:** The legal or public name spoken by the AI receptionist during phone greetings and shown in the chat widget header.
- **Industry:** The active operational vertical (e.g., *Dental Clinic*, *Legal Services*).
- **Website URL:** Public website used for links and knowledge syncing.
- **Support Email & Inbound Phone:** Default contact points where escalation alerts and summaries are directed.
- **Physical Address:** Street, suite, city, state, postal code, and country.

## Operating Hours Configuration

Operating hours are defined for each day of the week (Monday through Sunday) under **Profile > Operating Hours**:

\`\`\`json
{
  "monday": { "open": "09:00", "close": "17:00", "closed": false },
  "tuesday": { "open": "09:00", "close": "17:00", "closed": false },
  "wednesday": { "open": "09:00", "close": "17:00", "closed": false },
  "thursday": { "open": "09:00", "close": "17:00", "closed": false },
  "friday": { "open": "09:00", "close": "17:00", "closed": false },
  "saturday": { "open": "10:00", "close": "14:00", "closed": false },
  "sunday": { "open": "00:00", "close": "00:00", "closed": true }
}
\`\`\`

- Times must be entered in 24-hour format (\`HH:mm\`).
- If \`closed: true\`, the AI will not offer appointment slots for that day and will inform callers that the business is closed.

## Timezone Alignment

<Callout type="warning" title="Scheduling Integrity">
Always configure your exact local timezone (e.g., \`America/Chicago\` or \`Europe/Paris\`) rather than relying on UTC. The availability engine uses this timezone to translate customer natural language requests ("tomorrow at 2pm") into absolute UTC timestamps.
</Callout>

## How the AI Receptionist Uses Your Profile

The AI dynamically receives your profile in its system prompt via \`businessContextService\`:
- When asked *"Where are you located?"*, it states your exact address.
- When asked *"Are you open right now?"*, it computes whether the current time in your timezone falls within that day's open/close window.
- When asked for contact details, it provides your registered phone number and email.`,
  },

  "testing-receptionist": {
    title: "Testing Your Receptionist",
    description: "Verify your AI receptionist using the built-in simulator, web widget, and test calls.",
    toc: [
      { id: "demo-simulator", title: "Live Product Simulator", level: 2 },
      { id: "widget-test", title: "Website Widget Testing", level: 2 },
      { id: "inbound-call-test", title: "Testing Inbound Voice Calls", level: 2 },
      { id: "verifying-records", title: "Verifying Created Records", level: 2 },
    ],
    content: `## Live Product Simulator

Operator includes an interactive simulator located at \`/demo\` that allows you to experience all channels without configuring live carrier credentials:
- **Voice AI Tab:** Simulates an active telephone call dialogue.
- **Chat Widget Tab:** Tests the conversational chatbot and booking flow.
- **Booking Engine Tab:** Displays live availability generation and slot selection.
- **Dashboard Tab:** Shows real-time conversation metrics, lead funnel counts, and scheduled appointments.

## Website Widget Testing

1. Open **Website Widget** (\`/widget\`).
2. Verify that **Enable Widget** is toggled on.
3. Use the **Live Interactive Preview** panel on the right side of the page to chat with your receptionist directly in your browser.
4. Test asking questions from your uploaded knowledge documents to verify RAG citations.

## Testing Inbound Voice Calls

1. Navigate to **Voice AI** (\`/voice\`).
2. Check your assigned virtual phone number.
3. Call the number from any phone.
4. Speak naturally to test speech recognition, latency, and appointment slot booking.
5. Review the audio recording and transcription under **Voice > Call History** (\`/voice/history\`).

## Verifying Created Records

After completing a test conversation:
- Check **Inbox** (\`/inbox\`) to see the unified thread and message exchange.
- Check **Leads** (\`/leads\`) to verify the lead score and captured contact information.
- Check **Appointments** (\`/appointments\`) to confirm the appointment was reserved on your calendar.`,
  },

  // ─────────────────────────────────────────────────────────
  // 2. CORE CONCEPTS
  // ─────────────────────────────────────────────────────────
  "architecture-overview": {
    title: "Platform Architecture",
    description: "Deep dive into Operator's full-stack architecture, database models, and service boundaries.",
    toc: [
      { id: "tech-stack", title: "Technology Stack", level: 2 },
      { id: "service-layers", title: "Service Layers", level: 2 },
      { id: "data-flow", title: "Data Flow Diagram", level: 2 },
      { id: "security-isolation", title: "Multi-Tenant Data Isolation", level: 2 },
    ],
    content: `## Technology Stack

Operator is engineered for high-concurrency real-time conversational processing:
- **Framework:** Next.js 16 (App Router, React Server Components, Server Actions).
- **Database:** PostgreSQL with pgvector extension for vector similarity search.
- **ORM:** Drizzle ORM with strict type schemas defined in \`src/server/db/schema.ts\`.
- **Speech & Telephony:** Twilio Voice, SIP Webhooks, and bi-directional audio streaming.
- **AI & Reasoning:** Centralized LLM orchestration with automated provider fallback.
- **Styling & Tokens:** Pure CSS Design System tokens mapped to Tailwind CSS utilities.

## Service Layers

The codebase enforces clean separation of concerns:
- \`src/server/actions/*\`: Server actions handling client requests, authentication checks, IDOR assertions, and revalidation.
- \`src/server/services/*\`: Business domain services (e.g., \`orchestrator.ts\`, \`booking.ts\`, \`availability.ts\`, \`rag.ts\`, \`scoring.ts\`).
- \`src/server/repositories/*\`: Data access layer encapsulating Drizzle database queries.
- \`src/server/db/schema.ts\`: Complete PostgreSQL schema covering organizations, users, conversations, appointments, knowledge base, and billing.

## Data Flow Diagram

\`\`\`text
Customer (Voice / Web / WhatsApp)
               │
               ▼
 Webhook / API Route (/api/webhooks/*, /api/widget/*)
               │
               ▼
 Omnichannel Router (omnichannelRouter.processIncomingMessage)
               │
               ▼
 Orchestrator Service (orchestratorService.processMessage)
    ├── Identity Resolver (CRM profile lookup / creation)
    ├── Intent Classification (intentService.classifyIntent)
    ├── RAG Knowledge Retrieval (ragService.retrieveRelevantChunks)
    ├── Availability Engine (availabilityService.getAvailableSlots)
    └── Dynamic Action Engine (actionEngine.execute)
               │
               ▼
 Database Persistence (channelMessages, conversations, appointments)
               │
               ▼
 Outgoing Dispatcher (sendOutgoingMessage -> Twilio / Meta / Webhook)
\`\`\`

## Multi-Tenant Data Isolation

Every tenant belongs to an \`organization\`. All database tables containing customer or business data enforce an \`organizationId\` foreign key.
- Server actions call \`requireOrganizationAccess()\` to extract the authenticated user's active organization ID from encrypted session cookies.
- Server actions invoke \`assertResourceOwnership()\` on every mutation, preventing Insecure Direct Object References (IDOR).`,
  },

  "conversations-and-sessions": {
    title: "Conversations & Sessions",
    description: "Understand message lifecycle, thread persistence, and session context windows.",
    toc: [
      { id: "data-model", title: "Conversation Data Model", level: 2 },
      { id: "thread-lifecycle", title: "Thread Lifecycle", level: 2 },
      { id: "message-normalization", title: "Dual Message Storage", level: 2 },
      { id: "context-window-assembly", title: "Context Window Assembly", level: 2 },
    ],
    content: `## Conversation Data Model

Conversations are managed across four relational tables:
- \`conversations\`: The primary conversation record, linked to an \`organizationId\` and an optional \`leadProfileId\`.
- \`conversation_messages\`: Individual user and assistant turns with message roles (\`user\`, \`assistant\`, \`system\`), token usage, and latency.
- \`conversation_sessions\`: Active communication sessions tracking start time, end time, channel type, and status (\`active\`, \`ended\`, \`abandoned\`).
- \`conversation_events\`: Audit trail of events (e.g., \`intent_detected\`, \`slot_selected\`, \`booking_created\`, \`escalated\`).

## Thread Lifecycle

1. **Initiation:** When a message arrives from an external channel or the web widget, the router searches for an active conversation for that sender.
2. **Session Window:** If the last message was received within the active session timeout window, the message appends to the current thread. Otherwise, a new session is initialized.
3. **Completion:** When an appointment is finalized or the customer confirms resolution, the conversation state is updated to \`resolved\`.

## Dual Message Storage

To support both external channel fidelity and AI reasoning, messages are saved in two formats:
- \`channel_messages\`: Stores raw provider payloads (e.g., Twilio SIP metadata, WhatsApp message IDs, delivery statuses).
- \`conversation_messages\`: Stores sanitized, normalized text used by the LLM context window.

## Context Window Assembly

When assembling the prompt for the AI:
- Recent turns (up to the token limit) are fetched in chronological order.
- Injected system instructions include: business profile, business hours, services menu, and relevant knowledge chunks retrieved via RAG.
- Internal staff notes are excluded from customer-facing context.`,
  },

  "lead-qualification-and-scoring": {
    title: "Lead Qualification & CRM",
    description: "How Operator qualifies incoming leads, asks dynamic intake questions, and calculates lead scores.",
    toc: [
      { id: "qualification-flows", title: "Qualification Flows", level: 2 },
      { id: "question-types", title: "Supported Question Types", level: 2 },
      { id: "lead-scoring-algorithm", title: "Lead Scoring Algorithm (0–100)", level: 2 },
      { id: "crm-contact-profiles", title: "CRM Contact Profiles", level: 2 },
    ],
    content: `## Qualification Flows

Qualification flows (\`qualification_flows\`) allow businesses to define structured criteria that the AI must gather before confirming high-value bookings.

Configured under **Flows** (\`/flows\`), a qualification flow consists of questions evaluated sequentially during the conversation.

## Supported Question Types

The database schema supports four answer types (\`answerTypeEnum\`):
- \`text\`: Free-form responses (e.g., *"What symptoms are you experiencing?"*).
- \`single_select\`: Single choice from pre-defined options (e.g., *"New Patient"* vs *"Returning Patient"*).
- \`multi_select\`: Multiple choices (e.g., *"Select preferred days: Monday, Wednesday, Friday"*).
- \`number\`: Numeric inputs (e.g., *"What is your estimated property budget?"*).

Questions can be marked \`isRequired: true\`. The AI receptionist will politely insist on collecting required answers before confirming an appointment.

## Lead Scoring Algorithm (0–100)

The scoring service (\`src/server/services/scoring.ts\`) evaluates every completed turn and updates \`lead_scores\`:

| Dimension | Points Weight | Evaluation Criteria |
| :--- | :--- | :--- |
| **Contact Completeness** | 25 points | Full name, verified phone number, valid email address provided. |
| **Qualification Answers** | 35 points | Percentage of qualification flow questions successfully answered. |
| **Intent Clarity** | 20 points | Explicit request for a bookable service or quote vs vague inquiry. |
| **Urgency & Timeline** | 20 points | Immediate booking date requested (e.g., today/tomorrow vs no date). |

Leads with a score >= 70 are highlighted with a **High Priority** badge in the Leads CRM (\`/leads\`).

## CRM Contact Profiles

All customer data is aggregated in \`lead_profiles\`:
- Contact details (name, email, phone, company).
- Captured qualification answers in \`lead_answers\`.
- Booking history and attendance record (completed vs no-show).
- Total lifetime conversation summaries generated by the background summarization engine.`,
  },

  "human-takeover-escalation": {
    title: "Escalation & Human Takeover",
    description: "Manage automated escalation triggers, pause AI autonomy, and intervene with staff replies.",
    toc: [
      { id: "escalation-triggers", title: "Automated Escalation Triggers", level: 2 },
      { id: "pausing-ai-autonomy", title: "Pausing AI Autonomy", level: 2 },
      { id: "staff-interventions", title: "Sending Staff Replies", level: 2 },
      { id: "internal-notes", title: "Internal Team Notes", level: 2 },
    ],
    content: `## Automated Escalation Triggers

The escalation service (\`src/server/services/escalation.ts\`) continuously monitors conversation sentiment and intent. A thread is flagged for human review when:
1. **Explicit Customer Request:** The customer says *"I want to talk to a person"*, *"Transfer me to an agent"*, or similar phrases.
2. **Negative Sentiment & Frustration:** Sentiment analysis detects repeated anger, frustration, or dissatisfaction.
3. **Out-of-Scope Complex Inquiries:** The customer asks questions outside the Knowledge Base with low RAG confidence scores.
4. **Emergency Flags:** Phrases indicating medical or safety emergencies trigger immediate escalation notifications.

When triggered, an \`escalation_requests\` record is generated, and the conversation is marked with an **Escalated** badge in \`/escalations\` and \`/inbox\`.

## Pausing AI Autonomy

Every thread in the unified inbox features an **AI Autopilot** toggle backed by the server action \`toggleThreadAiAutonomyAction\`:
- **Active:** The AI answers all customer messages automatically.
- **Paused:** The AI remains silent, allowing human staff to handle the dialogue without AI interruptions.

## Sending Staff Replies

When staff sends a manual reply from \`/inbox\`:
1. The server action \`sendStaffReplyAction\` sends the message via the connected channel provider.
2. The thread's \`aiAutonomy\` is automatically set to \`"paused"\` to prevent race conditions where both human and AI respond.
3. The message is tagged with \`isAiGenerated: false\` and attributed to the staff member's ID.

## Internal Team Notes

Staff can append private internal notes to any conversation thread or appointment record. These notes:
- Are visible only to authenticated team members in the dashboard.
- Are strictly excluded from the customer-facing context window.`,
  },

  // ─────────────────────────────────────────────────────────
  // 3. AI RECEPTIONIST
  // ─────────────────────────────────────────────────────────
  "ai-engine-orchestrator": {
    title: "AI Orchestration & Intent Engine",
    description: "How Operator's central orchestrator classifies intents, parses dates, and coordinates RAG.",
    toc: [
      { id: "orchestrator-lifecycle", title: "Orchestrator Lifecycle", level: 2 },
      { id: "supported-intents", title: "Supported Intent Categories", level: 2 },
      { id: "natural-date-parsing", title: "Natural Date & Time Parsing", level: 2 },
      { id: "idempotency-guards", title: "Idempotency & Concurrent Clicks", level: 2 },
    ],
    content: `## Orchestrator Lifecycle

The core intelligence lives in \`src/server/services/orchestrator.ts\` under \`orchestratorService.processMessage()\`.

When a message is received:
1. **Idempotency Verification:** Checks \`idempotencyManager\` using a hash of \`{organizationId, conversationId, userMessage}\`. Repeated rapid clicks return the cached response.
2. **Identity Resolution:** Links the channel identity to a \`leadProfiles\` record.
3. **Intent Detection:** Passes the message to \`intentService.classifyIntent()\` to determine customer goal.
4. **Context Injection:** Injects business profile, operating hours, and active services via \`businessContextService\`.
5. **Knowledge Retrieval:** Queries \`ragService\` for document chunks matching the query.
6. **Availability Resolution:** If the intent is booking-related, calls \`availabilityService\` to determine candidate time slots.
7. **LLM Generation:** Synthesizes a natural, concise, friendly response.
8. **Action Execution:** Executes dynamic actions (e.g., booking an appointment or escalating).

## Supported Intent Categories

The intent classification engine detects:
- \`booking_inquiry\`: Customer wants to know available times or schedule.
- \`booking_confirm\`: Customer selects a specific proposed slot.
- \`service_inquiry\`: Questions about treatments, offerings, or durations.
- \`pricing_inquiry\`: Questions about costs, fees, or deposits.
- \`hours_inquiry\`: Questions about open/close times or weekend hours.
- \`location_inquiry\`: Questions about address, directions, or parking.
- \`cancellation\`: Requests to cancel an existing booking.
- \`reschedule\`: Requests to move a booking to another date.
- \`escalate_human\`: Requests to speak with human staff.
- \`faq_inquiry\`: General policy questions (e.g., insurance, return policy).
- \`greeting\` / \`chitchat\`: Polite conversational openers.

## Natural Date & Time Parsing

The system uses \`parseNaturalDateTime\` from \`src/lib/date.ts\` to interpret varied conversational time expressions against the business's timezone:
- *"Tomorrow at 2pm"* -> Next business day at 14:00 local time.
- *"Next Tuesday morning"* -> Nearest Tuesday between 09:00 and 11:30.
- *"Friday the 15th at 10:30"* -> Exact calendar date and time.

## Idempotency & Concurrent Clicks

Web widget users frequently double-click buttons or send identical messages during high latency. Operator enforces idempotency keys with a 60-second TTL to guarantee no duplicate bookings or duplicated AI responses.`,
  },

  "ai-prompt-guidelines": {
    title: "Custom Instructions & AI Prompts",
    description: "Customize the receptionist's voice, personality, tone, and organization-level instructions.",
    toc: [
      { id: "custom-prompt-configuration", title: "Custom Instructions Configuration", level: 2 },
      { id: "voice-settings-tone", title: "Voice Settings & Speaking Speed", level: 2 },
      { id: "category-ai-instructions", title: "Category-Level Instructions", level: 2 },
      { id: "best-practices", title: "Prompt Customization Best Practices", level: 2 },
    ],
    content: `## Custom Instructions Configuration

You can customize your AI receptionist's conversational tone and special business rules under **Settings > AI Guidelines** (\`/settings\`).

Stored in the \`voice_prompts\` table, these instructions are merged into the system prompt:
- Custom greetings (e.g., *"Always greet callers as 'Dr. Miller's Family Dental'"*).
- VIP caller handling rules.
- Specific phrasing to use when declining out-of-scope requests.

## Voice Settings & Speaking Speed

Under **Voice > Settings** (\`/voice/settings\`), configure:
- **Voice Selection:** Select from studio-quality conversational neural voices (e.g., *Rachel*, *Sarah*, *Adam*).
- **Speaking Speed:** Adjust playback rate from \`0.8x\` (slower, deliberate) to \`1.2x\` (faster, energetic). Default is \`1.0x\`.
- **Greeting Message:** Custom introductory greeting spoken immediately upon answering an inbound phone call.
- **Fallback Phone Number:** Destination telephone number to ring if the caller requires transfer to live human staff.

## Category-Level Instructions

In addition to organization-wide instructions, each Knowledge Base category can define its own \`aiInstructions\` (up to 2,000 characters).
For example:
- **Refund Policy Category:** *"Do not promise unconditional refunds. Direct customers to email accounting@business.com for review."*
- **Surgical Procedures Category:** *"Always clarify that surgical recovery times vary by individual and require pre-op consultation."*

## Prompt Customization Best Practices

- Keep custom instructions concise and direct.
- Avoid contradictory guidelines (e.g., telling the AI to never book without human approval while enabling automated booking).
- Use negative constraints carefully (prefer *"Direct inquiries about pricing to our menu"* over *"Never talk about money"*).`,
  },

  "ai-limitations-safety": {
    title: "AI Safety & Guardrails",
    description: "Understand Operator's safety boundaries, medical/legal disclaimers, and out-of-scope handling.",
    toc: [
      { id: "safety-guardrails", title: "Safety Guardrails", level: 2 },
      { id: "medical-legal-disclaimers", title: "Medical & Legal Disclaimers", level: 2 },
      { id: "hallucination-prevention", title: "Hallucination Prevention", level: 2 },
      { id: "unsupported-actions", title: "Unsupported Autonomous Actions", level: 2 },
    ],
    content: `## Safety Guardrails

Operator enforces strict runtime guardrails:
1. **Factual Grounding:** Answers to policy or procedural questions must cite chunks from your uploaded Knowledge Base or seeded FAQs.
2. **Prompt Injection Mitigation:** User input is isolated inside formatted conversation turns, preventing malicious attempts to override system instructions.
3. **SSRF Blocking:** The website crawler blocks loopback (\`127.0.0.1\`), local subnets (\`10.0.0.0/8\`, \`192.168.0.0/16\`), and cloud metadata APIs (\`169.254.169.254\`).

## Medical & Legal Disclaimers

For healthcare and legal practices:
- Operator will never diagnose illnesses, interpret laboratory results, or prescribe treatments.
- Operator will never offer legal counsel or interpret legal agreements.
- In medical emergencies, Operator instructs callers to hang up and dial emergency services (911 or local equivalent).

## Hallucination Prevention

When an inquiry cannot be answered from your Knowledge Base:
- The AI will politely state: *"I don't have that specific information in my records. Let me connect you with our team."*
- It will NOT guess unlisted pricing, fake discounts, or non-existent services.

## Unsupported Autonomous Actions

To maintain enterprise security, Operator will NEVER:
- Modify staff calendar events that were created outside Operator.
- Process bank transfers or unauthorized card charges without user checkout interaction.
- Delete past conversation logs or customer records autonomously.`,
  },

  // ─────────────────────────────────────────────────────────
  // 4. KNOWLEDGE BASE
  // ─────────────────────────────────────────────────────────
  "knowledge-documents": {
    title: "Documents & Supported Formats",
    description: "Upload business documents, manage file limits, and monitor document chunking.",
    toc: [
      { id: "supported-formats", title: "Supported Formats & Limits", level: 2 },
      { id: "upload-workflow", title: "Upload Workflow", level: 2 },
      { id: "processing-lifecycle", title: "Document Processing Lifecycle", level: 2 },
      { id: "editing-and-re-chunking", title: "Document Editing & Re-chunking", level: 2 },
    ],
    content: `## Supported Formats & Limits

Operator accepts business documentation under **Knowledge Base > Documents** (\`/kb\`):

| Format | Extension | Typical Use Case | Max File Size |
| :--- | :--- | :--- | :--- |
| **PDF** | \`.pdf\` | Policy manuals, treatment guides, price brochures | 10 MB |
| **Word** | \`.docx\` | Staff biographies, intake guidelines | 10 MB |
| **Markdown** | \`.md\` | Technical guidelines, structured documentation | 10 MB |
| **Plain Text** | \`.txt\` | Raw notes, operational memos, quick answers | 10 MB |
| **Spreadsheets** | \`.csv\` | Structured price lists, service matrices | 10 MB |

<Callout type="info" title="Character Limit">
Individual document content is capped at 500,000 characters per file to guarantee rapid real-time embedding and processing.
</Callout>

## Upload Workflow

1. Navigate to **Knowledge Base** (\`/kb\`) and click **Upload Document**.
2. Select a file from your computer or drag-and-drop it into the drop zone.
3. Select an optional Knowledge Category to organize the document.
4. Click **Submit Upload**. The server action \`uploadKnowledgeDocumentAction\` validates file type and size, creates a document record in \`knowledge_documents\`, and enqueues a processing job.

## Document Processing Lifecycle

Processing progresses through four distinct states tracked in \`document_processing_jobs\`:
- \`queued\`: Upload received and queued for parsing.
- \`processing\`: File text extracted and sanitized.
- \`chunking\`: Text segmented into ~500-token chunks with 50-token overlap via \`chunkingService\`.
- \`completed\`: Chunks saved in \`knowledge_chunks\` and ready for RAG similarity matching.

## Document Editing & Re-chunking

You can edit any document's text directly in the dashboard using \`updateKnowledgeDocumentContentAction\`:
- Incremental re-chunking deletes outdated chunks and generates fresh segments.
- Document revision version is automatically incremented in \`metadata.version\`.`,
  },

  "website-crawler": {
    title: "Website Crawler & Ingestion",
    description: "Crawl public websites, preview discovered pages, and ingest content automatically.",
    toc: [
      { id: "crawler-overview", title: "Crawler Overview", level: 2 },
      { id: "crawl-configuration", title: "Crawl Configuration Parameters", level: 2 },
      { id: "discovery-preview", title: "Page Discovery & Selection", level: 2 },
      { id: "ssrf-security", title: "SSRF Security Controls", level: 2 },
    ],
    content: `## Crawler Overview

Operator features an automated website crawler (\`src/server/services/crawler/crawler.ts\`) that reads public business websites and turns pages into searchable knowledge.

Accessed under **Knowledge Base > Website Import** (\`/kb\`), the crawler enables one-click synchronization of your website content.

## Crawl Configuration Parameters

When initiating a crawl via \`discoverWebsitePagesAction\`, you can configure:
- **Max Crawl Depth:** \`1\` (target URL only), \`2\` (target + directly linked pages), or \`3\` (deep recursive crawl).
- **Max Pages:** Limit on discovered pages (default: 20, max: 50).
- **Include Subdomains:** Toggle whether to follow links to subdomains (e.g., \`blog.yourclinic.com\`).
- **Follow External Links:** Defaults to \`false\` to stay strictly within your business domain.
- **Path Whitelist / Blacklist:** Include only specific paths (e.g., \`/services/*\`) or exclude sensitive paths (e.g., \`/cart\`, \`/wp-admin\`).

## Page Discovery & Selection

Crawling is a two-phase process:
1. **Discovery Phase:** The crawler visits pages and reports back: page title, URL path, word count, estimated chunk count, and suggested category.
2. **Selective Ingestion:** You review the list, uncheck unnecessary pages (e.g., privacy policy or login screens), and click **Ingest Selected Pages**. The background pipeline (\`WebsiteIngestionPipeline\`) converts each page into a document in \`knowledge_documents\`.

## SSRF Security Controls

To protect server infrastructure, all crawl requests pass through \`validateSafeUrl\` in \`src/server/services/crawler/ssrf.ts\`:
- Validates protocol (only \`http:\` and \`https:\` permitted).
- Resolves DNS and blocks loopback, link-local, private RFC 1918 subnets, and AWS/GCP metadata IP \`169.254.169.254\`.`,
  },

  "knowledge-categories": {
    title: "Categories & AI Weighting",
    description: "Organize knowledge into categories, set AI retrieval weights, and configure visibility.",
    toc: [
      { id: "category-hierarchy", title: "Category Hierarchy", level: 2 },
      { id: "ai-weighting", title: "AI Priority Weighting", level: 2 },
      { id: "visibility-controls", title: "Visibility Controls", level: 2 },
      { id: "managing-categories", title: "Managing Categories", level: 2 },
    ],
    content: `## Category Hierarchy

Categories (\`knowledge_categories\`) structure your documents and FAQs into logical domains such as *Pricing & Fees*, *Clinical Guidelines*, *Staff Bios*, or *Office Policies*.

Attributes:
- \`name\` & \`slug\`: Human-readable title and URL-safe identifier.
- \`description\`: Summary of what knowledge belongs here.
- \`icon\` & \`color\`: Visual tags for the dashboard UI.
- \`parentId\`: Supports nesting child categories under parent groups.

## AI Priority Weighting

Each category defines an \`aiWeight\` attribute that influences RAG retrieval ranking:
- **Low:** Supplementary background information. Retrieved only when no stronger matches exist.
- **Normal (Default):** Standard retrieval weighting for general documentation.
- **High:** Critical policy rules (e.g., cancellation penalties or medical intake prerequisites) prioritized during retrieval.

## Visibility Controls

The database supports three visibility settings (\`category_visibility\` enum):
- \`public\`: Accessible by customer-facing AI channels (voice calls, website widget, WhatsApp).
- \`internal\`: Accessible only in staff dashboard searches; excluded from public customer replies.
- \`ai_only\`: Injected into the AI prompt for reasoning but hidden from public search views.

## Managing Categories

Use server actions in \`src/server/actions/knowledge.ts\`:
- \`createKnowledgeCategoryAction\`: Add new categories with custom AI instructions.
- \`updateKnowledgeCategoryAction\`: Update name, weight, or visibility.
- \`deleteKnowledgeCategoryAction\`: Safely remove empty categories.
- \`archiveKnowledgeCategoryAction\`: Soft-archive categories without deleting underlying documents.`,
  },

  "faqs-knowledge": {
    title: "FAQs Management",
    description: "Manage frequently asked question pairs for rapid, deterministic AI retrieval.",
    toc: [
      { id: "faqs-overview", title: "FAQs Overview", level: 2 },
      { id: "creating-faqs", title: "Creating FAQ Items", level: 2 },
      { id: "search-and-retrieval", title: "FAQ Retrieval Mechanism", level: 2 },
    ],
    content: `## FAQs Overview

While document chunking is ideal for manuals and long-form guides, question-and-answer pairs managed in **FAQs** (\`/faqs\`) provide the fastest, most deterministic answers for common customer questions.

Stored in the \`faq_items\` table, FAQs are loaded directly into business context and indexed for full-text search.

## Creating FAQ Items

Under **FAQs** (\`/faqs\`), click **Add FAQ**:
- **Question:** The primary question asked by customers (e.g., *"Do you accept Medicare?"*).
- **Answer:** The exact response Operator should communicate.
- **Category:** Domain classification (e.g., *Insurance*, *Parking*, *Hours*).
- **Active Toggle:** Instantly enable or disable the FAQ without deleting it.

## FAQ Retrieval Mechanism

When a customer asks a question:
1. The AI performs keyword and vector similarity against \`faq_items\`.
2. Exact question matches take precedence over broad document chunks.
3. The answer is synthesized naturally into the conversation tone while preserving factual fidelity.`,
  },

  // ─────────────────────────────────────────────────────────
  // 5. APPOINTMENTS & SCHEDULING
  // ─────────────────────────────────────────────────────────
  "services-catalog": {
    title: "Services Menu & Durations",
    description: "Configure bookable services, appointment durations, pricing, and required deposits.",
    toc: [
      { id: "service-attributes", title: "Service Attributes", level: 2 },
      { id: "deposit-settings", title: "Deposit Settings", level: 2 },
      { id: "buffer-times", title: "Buffer Times", level: 2 },
      { id: "managing-services", title: "Managing Services", level: 2 },
    ],
    content: `## Service Attributes

Under **Services** (\`/services\`), configure the bookable menu that Operator offers to customers. Stored in the \`services\` table:

- **Name:** Title of the offering (e.g., *Teeth Whitening*, *Initial Consultation*).
- **Category:** Logical group (e.g., *Preventative*, *Cosmetic*, *Emergency*).
- **Duration:** Appointment length in minutes (e.g., 30, 45, 60, 90). The availability engine blocks out this duration on the schedule.
- **Price:** Standard fee in organization currency.
- **Assigned Staff:** Which practitioners or staff members can perform this service (\`service_assignments\`).

## Deposit Settings

To protect against no-shows, services support advance deposit requirements:
- \`depositRequired\`: Boolean flag requiring upfront token authorization before calendar confirmation.
- \`depositAmount\`: Numerical deposit amount (e.g., $50.00).

When a service requires a deposit, Operator generates a checkout order via Stripe or Razorpay and dispatches the link before locking the appointment.

## Buffer Times

Services support pre- and post-appointment buffer times:
- **Buffer Before:** Preparation or room cleanup time required prior to start.
- **Buffer After:** Sanitization, charting, or rest time required after completion.

The availability service (\`availability.ts\`) includes buffer periods when calculating open slots to prevent back-to-back staff burnout.

## Managing Services

Create, update, or archive services via \`src/server/actions/services.ts\`:
- \`createServiceAction\`: Adds a new service with duration and price.
- \`updateServiceAction\`: Modifies service parameters or staff assignments.
- \`archiveServiceAction\`: Hides the service from customer booking without breaking existing appointment records.`,
  },

  "staff-and-schedules": {
    title: "Staff Rostering & Availability",
    description: "Manage team practitioners, weekly working schedules, and availability overrides.",
    toc: [
      { id: "staff-members", title: "Staff Members", level: 2 },
      { id: "weekly-schedules", title: "Weekly Working Schedules", level: 2 },
      { id: "availability-overrides", title: "Availability Overrides & Blockouts", level: 2 },
      { id: "service-assignments", title: "Service-Staff Mapping", level: 2 },
    ],
    content: `## Staff Members

Manage practitioners and service providers under **Staff** (\`/staff\`). Records in \`staff_members\` track:
- Name, contact email, and phone number.
- Professional title or role (e.g., *Lead Dentist*, *Senior Stylist*).
- Active status toggle.

## Weekly Working Schedules

Each staff member has recurring schedule entries in \`staff_schedules\`:
- \`dayOfWeek\`: Integer 0 (Sunday) through 6 (Saturday).
- \`startTime\`: Working start time in 24-hour format (e.g., \`09:00\`).
- \`endTime\`: Working end time in 24-hour format (e.g., \`17:00\`).
- \`isWorkingDay\`: Boolean flag indicating whether the staff member takes bookings on that day.

## Availability Overrides & Blockouts

When staff take vacations, sick days, or holidays, create an override in \`staff_availability\`:
- \`startDate\` & \`endDate\`: ISO timestamp window.
- \`isAvailable: false\`: Completely blocks the staff member from receiving appointments during this window.

## Service-Staff Mapping

In \`service_assignments\`, map which staff members are certified to perform which services:
- If a customer requests a specific practitioner, Operator checks that practitioner's schedule.
- If no practitioner is requested, Operator checks all certified staff and offers the first available slot.`,
  },

  "booking-rules": {
    title: "Booking Rules & Buffers",
    description: "Control booking windows, minimum advance notice, and cancellation cut-offs.",
    toc: [
      { id: "rules-overview", title: "Booking Rules Overview", level: 2 },
      { id: "rule-parameters", title: "Rule Parameters", level: 2 },
      { id: "conflict-resolution", title: "Conflict Resolution", level: 2 },
    ],
    content: `## Booking Rules Overview

Booking rules (\`booking_rules\`) enforce business policies on when and how appointments can be booked, rescheduled, or cancelled.

Configured under **Settings > Booking Rules** (\`/settings\`), these rules prevent last-minute surprises and unreasonable forward bookings.

## Rule Parameters

- **Minimum Notice Hours (e.g., 2 hours):** Customers cannot book a slot starting in less than 2 hours from now.
- **Max Forward Booking Horizon (e.g., 30 or 60 days):** Customers cannot book slots months into the unfinalized future.
- **Slot Granularity (e.g., 15, 30, or 60 minutes):** Interval at which candidate appointment slots begin.
- **Cancellation Cut-Off Window (e.g., 24 hours):** Threshold before an appointment where self-service cancellation is disabled and requires direct staff contact.

## Conflict Resolution

The booking service (\`src/server/services/booking.ts\`) executes transactional checks prior to writing any appointment:
1. Verifies that the requested slot falls within the staff member's working schedule.
2. Checks that no existing \`confirmed\` or \`pending\` appointment overlaps the requested window.
3. Checks external calendar busy blocks (if connected via Calendly).
4. Verifies that buffer times are respected on both sides of the appointment.`,
  },

  "calendar-integrations": {
    title: "Calendar Sync (Native & Calendly)",
    description: "Understand Operator's native calendar engine and external Calendly availability sync.",
    toc: [
      { id: "native-calendar-provider", title: "Native Operator Calendar Provider", level: 2 },
      { id: "calendly-provider", title: "Calendly Integration", level: 2 },
      { id: "provider-registry", title: "Provider Registry Codebase Verification", level: 2 },
    ],
    content: `## Native Operator Calendar Provider

By default, Operator functions as a self-contained, enterprise appointment booking engine.

All bookings, schedules, and staff availability are tracked directly in your dedicated PostgreSQL database:
- Zero third-party calendar dependencies required.
- Full access to appointments inside the Operator dashboard (\`/appointments\`).
- Automatic synchronization between phone calls, web chat, and messaging channels.

## Calendly Integration

Operator supports reading external busy periods from **Calendly** via \`CalendlyProvider\` in \`src/server/services/calendar-provider.ts\`.

### How it works:
1. When generating available appointment slots, Operator queries the Calendly Scheduled Events API:
   \`GET https://api.calendly.com/scheduled_events?min_start_time=...&max_start_time=...\`
2. Busy time blocks on Calendly are treated as blackout windows in Operator's scheduling calculations.
3. This prevents double-booking if staff members maintain appointments on Calendly.

### Setup Instructions:
1. Generate a Personal Access Token in your **Calendly Account > Integrations**.
2. Go to **Settings > Calendar Connections** in Operator.
3. Select **Calendly**, paste your Access Token, and click **Connect**.

## Provider Registry Codebase Verification

<Callout type="info" title="Accurate Implementation">
The provider registry in \`src/server/services/calendar-provider.ts\` strictly registers two providers:
1. \`NativeCalendarProvider\`: Local database scheduling.
2. \`CalendlyProvider\`: Remote busy period query.

Google Calendar and Microsoft Outlook direct APIs are NOT currently supported in this release.
</Callout>`,
  },

  "appointment-management": {
    title: "Rescheduling & Cancellations",
    description: "Manage existing bookings, audit reschedules, process cancellations, and update statuses.",
    toc: [
      { id: "appointment-statuses", title: "Appointment Status Lifecycle", level: 2 },
      { id: "rescheduling-flow", title: "Rescheduling Flow", level: 2 },
      { id: "cancellations-flow", title: "Cancellations Flow", level: 2 },
      { id: "audit-history", title: "Audit Trail & Status History", level: 2 },
    ],
    content: `## Appointment Status Lifecycle

Appointments (\`appointments\`) transition through five defined statuses:
- \`pending\`: Slot tentatively reserved, awaiting staff review or deposit confirmation.
- \`confirmed\`: Appointment locked in the calendar; customer and staff notified.
- \`completed\`: Customer attended the appointment.
- \`cancelled\`: Appointment cancelled by customer or staff.
- \`no_show\`: Customer failed to arrive without prior cancellation.

## Rescheduling Flow

Rescheduling can be initiated by customers via AI dialogue or manually by staff in the dashboard via \`rescheduleAppointmentAction\`:
1. The system verifies that the new target time slot is open and available.
2. The appointment start time is updated.
3. A record is added to \`appointment_reschedules\` tracking \`oldStartTime\`, \`newStartTime\`, \`reason\`, and \`requestedBy\` (\`customer\` vs \`staff\`).
4. An automated confirmation SMS/email is dispatched with the new time.

## Cancellations Flow

Cancellations executed via \`cancelAppointmentAction\`:
1. The appointment status changes to \`cancelled\`.
2. A record is written to \`appointment_cancellations\` storing \`reason\` and \`cancelledBy\`.
3. The time slot immediately re-opens on the calendar for other customers to book.

## Audit Trail & Status History

Every status change is logged in \`appointment_status_history\`:
- Tracks timestamp, old status, new status, and the user or system actor responsible.
- Guarantees transparency if disputes arise regarding who cancelled or modified a booking.`,
  },

  // ─────────────────────────────────────────────────────────
  // 6. OMNICHANNEL COMMUNICATIONS
  // ─────────────────────────────────────────────────────────
  "website-widget": {
    title: "Website Chat Widget",
    description: "Customize and embed the Operator conversational chat and appointment widget on your website.",
    toc: [
      { id: "widget-overview", title: "Widget Overview", level: 2 },
      { id: "embed-script-tag", title: "Embed Script Tag", level: 2 },
      { id: "theme-and-branding", title: "Theme & Branding Customization", level: 2 },
      { id: "platform-guides", title: "Platform Installation Guides", level: 2 },
      { id: "domain-whitelisting", title: "Domain Whitelisting & DNS Verification", level: 2 },
    ],
    content: `## Widget Overview

The Operator Website Widget provides a responsive floating chat bubble and appointment booking interface for visitors. It runs as a lightweight client script loaded from \`/widget.js\`.

Features include:
- Streaming real-time AI responses.
- Interactive service selectors and appointment slot pickers.
- Starter prompt chips (e.g., *"What are your business hours?"*).
- Proactive engagement triggers based on time on page or scroll depth.

## Embed Script Tag

To embed the widget on any website, paste this single script tag right before the closing \`</body>\` tag:

\`\`\`html
<script src="https://app.operator.ai/widget.js" data-org-id="YOUR_ORGANIZATION_ID"></script>
\`\`\`

You can copy your organization-specific script tag directly from **Website Widget > Installation** (\`/widget\`).

## Theme & Branding Customization

Under **Website Widget > Appearance** (\`/widget\`), customize:
- **Theme Mode:** Light, Dark, or System Match.
- **Brand Colors:** Preset palette (*Modern Purple*, *Emerald Health*, *Ocean Blue*, *Sunset Rose*) or custom hex code.
- **Launcher Icon & Position:** Message bubble, robot, phone, or calendar; placed bottom-right or bottom-left with custom padding offsets.
- **Branding Elements:** Company name, tagline, welcome greeting, avatar image, and header logo.

## Platform Installation Guides

### Custom HTML / React / Next.js
Paste the script tag directly before the closing \`</body>\` tag in your \`index.html\` or root layout file.

### WordPress
1. In your WordPress admin, install and activate the free **WPCode** plugin (Insert Headers and Footers).
2. Go to **Code Snippets > Header & Footer**.
3. Paste the script tag into the **Footer** box and click **Save Changes**.

### Shopify
1. In Shopify Admin, navigate to **Online Store > Themes**.
2. Click **··· > Edit code** on your active theme.
3. Open \`layout/theme.liquid\`, scroll to the bottom, paste the script directly above \`</body>\`, and click **Save**.

### Wix
1. In Wix Dashboard, go to **Settings > Custom Code** (under Advanced).
2. Click **+ Add Custom Code**.
3. Paste the snippet, set name to *"Operator Receptionist"*, select **Body - end** and **All Pages**, then click **Apply**.

### Squarespace & Webflow
- **Squarespace:** Go to **Settings > Developer Tools > Code Injection > Footer**, paste snippet, and save.
- **Webflow:** Go to **Project Settings > Custom Code > Footer Code**, paste snippet, and publish.

## Domain Whitelisting & DNS Verification

Under **Website Widget > Domains**, add your production domain to prevent unauthorized websites from loading your widget.
- You can optionally verify ownership by adding a DNS TXT record:
  \`operator-verify=YOUR_TOKEN\`
- Once verified, only requests matching your whitelisted origin can initiate widget sessions.`,
  },

  "voice-ai-telephony": {
    title: "Voice AI & Telephony",
    description: "Configure phone numbers, Twilio voice routing, call recording, and voicemail triage.",
    toc: [
      { id: "telephony-overview", title: "Voice AI Overview", level: 2 },
      { id: "phone-numbers", title: "Allocating Phone Numbers", level: 2 },
      { id: "call-routing-rules", title: "Call Routing Rules", level: 2 },
      { id: "recording-and-transcripts", title: "Call Recording & Transcripts", level: 2 },
      { id: "voicemail-management", title: "Voicemail Management", level: 2 },
    ],
    content: `## Voice AI Overview

Operator answers live inbound telephone calls with natural spoken dialogue, understanding caller context, answering questions, and scheduling appointments directly to your calendar.

Telephony is routed through Twilio Voice Webhooks pointing to \`/api/webhooks/voice/inbound\`.

## Allocating Phone Numbers

Under **Voice AI > Phone Numbers** (\`/voice\`), businesses can allocate and manage virtual phone lines stored in the \`phone_numbers\` table:
- View assigned phone numbers (E.164 format).
- Toggle call recording on or off per phone line.
- Assign internal friendly names (e.g., *"Main Clinic Line"*).

## Call Routing Rules

Configure call routing under **Voice > Settings > Routing Rules** (\`/voice/settings\`):
- **Triggers:** \`business-hours\`, \`after-hours\`, \`busy\`, or \`no-answer\`.
- **Actions:**
  - \`ai-receptionist\`: Answer immediately with the conversational AI receptionist.
  - \`staff-dial\`: Forward the call to a live staff telephone number.
  - \`voicemail\`: Play greeting and record a caller voicemail.
  - \`queue\`: Hold caller in line for available staff.

## Call Recording & Transcripts

When call recording is enabled:
- Full duplex audio recordings are saved and accessible under **Voice > Call History** (\`/voice/history\`).
- Transcripts are saved to the conversation log with speaker turn labels.
- Audio durations and latency metrics are tracked in \`call_sessions\`.

## Voicemail Management

When callers leave a voicemail:
- A record is created in \`voicemail_messages\`.
- Staff can triage voicemails under **Voice > Voicemails** with statuses: \`pending\`, \`called\`, or \`no-action\`.`,
  },

  "meta-whatsapp": {
    title: "WhatsApp Business API",
    description: "Connect Meta WhatsApp Cloud API to automate inbound customer chats, buttons, and booking.",
    toc: [
      { id: "whatsapp-overview", title: "WhatsApp Integration Overview", level: 2 },
      { id: "credentials-setup", title: "Meta API Credentials Setup", level: 2 },
      { id: "webhook-configuration", title: "Webhook Verification URL", level: 2 },
      { id: "message-capabilities", title: "Interactive Message Capabilities", level: 2 },
    ],
    content: `## WhatsApp Integration Overview

Operator integrates natively with the official **Meta WhatsApp Business Cloud API** (\`src/server/services/omnichannel/whatsapp.ts\`) to handle incoming customer WhatsApp chats.

All incoming chats are routed through the Omnichannel Router into your Unified Inbox.

## Meta API Credentials Setup

Under **Channels > WhatsApp** (\`/channels\`):
1. Input your **Phone Number ID** from the Meta App Dashboard.
2. Input your **WhatsApp Business Account ID (WABA ID)**.
3. Input your **Permanent System User Access Token** generated in Meta Business Manager with \`whatsapp_business_messaging\` permissions.
4. Click **Connect Channel** to activate the connection in \`channel_connections\`.

## Webhook Configuration

In the Meta App Dashboard under WhatsApp > Configuration:
- **Callback URL:** \`https://YOUR_DOMAIN/api/webhooks/meta\`
- **Verify Token:** The secret token defined in your environment variable \`META_WEBHOOK_VERIFY_TOKEN\`.
- **Webhook Fields:** Subscribe to \`messages\`.

Operator's webhook endpoint (\`/api/webhooks/meta\`) automatically handles both GET challenge verification and POST event delivery.

## Interactive Message Capabilities

- **Natural Chat:** Answers customer questions using Knowledge Base RAG.
- **Slot Selection:** Presents available appointment slots as interactive button replies.
- **Confirmations:** Sends instant WhatsApp booking receipts with appointment dates and addresses.`,
  },

  "twilio-sms": {
    title: "Two-Way SMS Integration",
    description: "Send automated text reminders, deposit links, and converse with customers via SMS.",
    toc: [
      { id: "sms-overview", title: "SMS Overview", level: 2 },
      { id: "setup-instructions", title: "Twilio Connection Setup", level: 2 },
      { id: "automated-reminders", title: "Automated Appointment Reminders", level: 2 },
      { id: "two-way-messaging", title: "Two-Way Text Chat", level: 2 },
    ],
    content: `## SMS Overview

Operator utilizes Twilio Programmable Messaging to deliver transactional notifications, appointment reminders, and conversational SMS booking dialogues.

## Setup Instructions

1. Navigate to **Channels > SMS** (\`/channels\`).
2. Provide your Twilio credentials:
   - **Account SID**
   - **Auth Token**
   - **Twilio Phone Number** (in E.164 format, e.g., \`+14155550199\`).
3. Set your Twilio Messaging Webhook URL to:
   \`https://YOUR_DOMAIN/api/webhooks/voice/inbound\` or your configured SMS webhook route.

## Automated Appointment Reminders

The automated cron job (\`/api/cron/jobs\`) evaluates upcoming appointments and dispatches reminders via SMS:
- **24-Hour Notice:** Sent the day before scheduled bookings with date, time, and service details.
- **2-Hour Notice:** Final day-of confirmation.

## Two-Way Text Chat

When customers text your number:
- Messages are ingested into \`inbox_threads\` and matched with their CRM profile.
- Operator's AI receptionist replies autonomously via SMS unless autonomy has been paused by staff.`,
  },

  "email-channel": {
    title: "Email Integration",
    description: "Process inbound customer emails and generate context-aware AI draft replies.",
    toc: [
      { id: "email-overview", title: "Email Channel Overview", level: 2 },
      { id: "provider-setup", title: "Email Setup (Resend & SMTP)", level: 2 },
      { id: "draft-assistant", title: "AI Draft Reply Assistant", level: 2 },
    ],
    content: `## Email Channel Overview

Operator handles inbound email communications through \`src/server/services/omnichannel/email.ts\` and \`resend.ts\`.

Customer emails are parsed, converted into conversation threads in the Unified Inbox, and can be replied to automatically or drafted for staff review.

## Provider Setup

Configure email under **Channels > Email** (\`/channels\`):
- **Resend API:** Connect using your Resend API Key and verified sending domain for transactional email delivery.
- **Custom SMTP:** Configure custom SMTP host, port, username, and password for enterprise server routing.

## AI Draft Reply Assistant

For sensitive inquiries, you can configure email to run in **Assisted Mode**:
- When an email arrives, Operator analyzes the customer question and generates an AI draft reply with Knowledge Base citations.
- Staff review the draft in \`/inbox\`, edit if desired, and click **Send** with a single click.`,
  },

  "instagram-facebook": {
    title: "Instagram & Facebook Direct Messages",
    description: "Engage followers, qualify leads, and book appointments via Instagram DMs and Facebook Messenger.",
    toc: [
      { id: "social-overview", title: "Social Messaging Overview", level: 2 },
      { id: "meta-page-setup", title: "Linking Meta Pages & Instagram", level: 2 },
      { id: "routing-and-lead-capture", title: "Routing & Lead Capture", level: 2 },
    ],
    content: `## Social Messaging Overview

Convert social media interactions into appointments. Operator integrates with Meta's Graph API to receive and reply to:
- **Instagram Direct Messages** (\`src/server/services/omnichannel/instagram.ts\`)
- **Facebook Messenger** (\`src/server/services/omnichannel/facebook.ts\`)

## Linking Meta Pages & Instagram

Under **Channels > Social Messaging** (\`/channels\`):
1. Connect using your Meta Page Admin Access Token.
2. Select your connected Instagram Professional Account and Facebook Page.
3. Configure the webhook endpoint at \`https://YOUR_DOMAIN/api/webhooks/meta\` with your verification token.

## Routing & Lead Capture

- When an Instagram follower sends a DM asking for service details or prices, Operator replies instantly.
- If the customer wants to schedule, Operator collects their name, phone number, and email, creating a CRM lead profile and confirming their appointment slot.`,
  },

  "unified-inbox": {
    title: "Unified Inbox & Canned Templates",
    description: "Manage omnichannel threads, staff assignments, status filters, and canned templates.",
    toc: [
      { id: "inbox-interface", title: "Unified Inbox Interface", level: 2 },
      { id: "thread-filtering-status", title: "Thread Filtering & Statuses", level: 2 },
      { id: "staff-assignments", title: "Staff Assignments", level: 2 },
      { id: "canned-templates", title: "Canned Message Templates", level: 2 },
    ],
    content: `## Unified Inbox Interface

The **Unified Inbox** at \`/inbox\` consolidates conversations across Website Chat, Voice call transcripts, WhatsApp, SMS, Email, Instagram, and Facebook into a single interface.

Features:
- Live message feed with instant channel badges.
- Customer CRM summary panel on the right sidebar.
- One-click AI Autonomy toggle (*Active* vs *Paused*).
- Staff reply box with canned template insertion.

## Thread Filtering & Statuses

Threads (\`inbox_threads\`) can be managed with three statuses:
- \`open\`: Active conversations requiring attention or currently in progress.
- \`closed\`: Resolved customer conversations.
- \`snoozed\`: Deferred conversations that re-open when the customer sends a new message.

Filter threads by channel, unread status, or assigned team member.

## Staff Assignments

Using \`assignThreadAction\`, managers can assign specific conversation threads to individual staff members:
- Assigned staff receive notifications when their assigned thread receives new messages.
- Filters allow staff to view *"My Assigned Threads"* exclusively.

## Canned Message Templates

Under **Templates** (\`/templates\`), create re-usable canned responses stored in \`message_templates\`:
- Create templates with dynamic merge tags (e.g., \`{{customerName}}\`, \`{{businessName}}\`).
- Insert templates into the staff reply box to answer common questions in seconds.`,
  },

  // ─────────────────────────────────────────────────────────
  // 7. AGENCY & WHITE LABEL
  // ─────────────────────────────────────────────────────────
  "agency-overview": {
    title: "Agency Sub-Accounts",
    description: "Manage multiple client organizations, provision sub-accounts, and impersonate workspaces.",
    toc: [
      { id: "agency-architecture", title: "Agency Architecture", level: 2 },
      { id: "provisioning-sub-accounts", title: "Provisioning Sub-Accounts", level: 2 },
      { id: "impersonation-access", title: "Client Workspace Impersonation", level: 2 },
    ],
    content: `## Agency Architecture

For marketing agencies, MSPs, and resellers, Operator includes dedicated multi-tenant agency management under **Agency** (\`/agency\`):
- Manage dozens or hundreds of client organizations under a single agency umbrella.
- Set global or per-client usage limits.
- Centralized billing roll-up.

## Provisioning Sub-Accounts

Under **Agency > Sub-Accounts** (\`/agency/sub-accounts\`):
- Create new client workspaces with custom names, industries, and assigned owners.
- Automatically seed client workspaces with agency-standard templates.
- Track active numbers, appointment volumes, and usage per client.

## Client Workspace Impersonation

Using \`agencyImpersonation\` and the endpoint \`/api/agency/impersonate\`:
- Agency administrators can securely switch context into any client workspace with a single click.
- Allows agency staff to configure knowledge bases, inspect inbox escalations, and tune voice settings on behalf of their clients without asking for client passwords.`,
  },

  "white-label-branding": {
    title: "Custom Branding & Custom Domains",
    description: "Brand the Operator platform with custom logos, colors, favicons, and custom domain names.",
    toc: [
      { id: "custom-branding-settings", title: "Branding Configuration", level: 2 },
      { id: "custom-domain-mapping", title: "Custom Domain Mapping (CNAME)", level: 2 },
      { id: "email-white-labeling", title: "Email Sender White-Labeling", level: 2 },
    ],
    content: `## Branding Configuration

Under **Agency > Branding** (\`/agency/branding\`), agencies can re-skin the platform:
- **Platform Name:** Replaces all references to "Operator" with your agency's brand name.
- **Logo & Favicon:** Upload custom brand logos and browser favicons.
- **Color Scheme:** Define custom primary, secondary, and accent colors.
- **Custom CSS:** Inject agency CSS stylesheets to modify dashboard presentation.

## Custom Domain Mapping (CNAME)

Agencies can map custom domains (e.g., \`app.youragency.com\`) via \`addAgencyDomainAction\`:
1. In your DNS provider (Cloudflare, GoDaddy, Route53), create a **CNAME record**:
   - Host: \`app\` (or desired subdomain)
   - Value: \`cname.operator.ai\` (or your assigned deployment hostname)
2. In Operator under **Agency > Domains**, enter your custom domain and select domain type (\`portal\`, \`client\`, or \`widget\`).
3. Click **Verify Domain**. Once verified, client users will access the dashboard under your agency domain.

## Email Sender White-Labeling

Configure your custom email sender:
- **Sender Name:** (e.g., *"Apex Reception Desk"*).
- **Sender Domain:** Connect your custom domain via DKIM and SPF records so all notifications, password resets, and appointment receipts originate from your domain.`,
  },

  // ─────────────────────────────────────────────────────────
  // 8. BILLING & PLANS
  // ─────────────────────────────────────────────────────────
  "plans-and-pricing": {
    title: "Subscription Plans & Limits",
    description: "Review Operator's verified commercial plans, conversation limits, voice minutes, and features.",
    toc: [
      { id: "plan-catalog", title: "Verified Plan Catalog", level: 2 },
      { id: "feature-entitlements", title: "Feature Entitlements Matrix", level: 2 },
      { id: "free-trial-terms", title: "14-Day Free Trial Terms", level: 2 },
    ],
    content: `## Verified Plan Catalog

Operator offers three transparent commercial tiers defined in the single source of truth \`src/lib/billing/plans.ts\`:

| Parameter | Starter | Professional | Business |
| :--- | :--- | :--- | :--- |
| **Monthly Price** | **$49 / mo** | **$149 / mo** | **$349 / mo** |
| **Annual Price** | **$39 / mo** (billed annually) | **$119 / mo** (billed annually) | **$279 / mo** (billed annually) |
| **Trial Period** | 14 Days Free | 14 Days Free | 14 Days Free |
| **Conversations / mo** | 500 | 2,500 | 10,000 |
| **Voice Minutes / mo** | 100 | 500 | 2,000 |
| **Connected Calendars** | 1 | 3 | Unlimited |
| **Knowledge Articles** | 25 | 100 | 500 |
| **Team Members** | 1 | 5 | 20 |
| **Locations** | 1 | 1 | 5 |
| **Limit Behavior** | Upgrade Required | Upgrade Required | Overage Billing |

## Feature Entitlements Matrix

| Feature | Starter | Professional | Business |
| :--- | :---: | :---: | :---: |
| Website Chat Widget | Yes | Yes | Yes |
| Two-Way SMS | Yes | Yes | Yes |
| Email Receptionist | Yes | Yes | Yes |
| Voice AI Phone Lines | Yes | Yes | Yes |
| WhatsApp Business API | — | Yes | Yes |
| Instagram & Facebook DMs | — | Yes | Yes |
| Advanced Lead Qualification | — | Yes | Yes |
| Custom AI Training | — | Yes | Yes |
| Analytics Export | — | — | Yes |
| Dedicated Onboarding | — | — | Yes |
| SLA Guarantee | — | — | Yes |

## 14-Day Free Trial Terms

All new organizations automatically receive a **14-day free trial** of the Starter tier upon completing onboarding. No credit card is required to begin testing in development.`,
  },

  "payment-gateways": {
    title: "Stripe & Razorpay Setup",
    description: "Configure billing gateways, customer portals, webhook endpoints, and checkout verification.",
    toc: [
      { id: "gateway-architecture", title: "Billing Gateway Architecture", level: 2 },
      { id: "stripe-configuration", title: "Stripe Setup & Customer Portal", level: 2 },
      { id: "razorpay-configuration", title: "Razorpay Setup & Webhooks", level: 2 },
    ],
    content: `## Billing Gateway Architecture

Operator features a dual-gateway provider architecture implemented in \`src/server/services/billing/providers/\`:
- **Stripe:** Recommended for North America, Europe, and international credit/debit card processing.
- **Razorpay:** Recommended for India and Southeast Asia (supports UPI QR, NetBanking, and RuPay).

Both providers implement the \`PaymentProvider\` interface and process webhooks through the central \`webhookProcessor\`.

## Stripe Setup & Customer Portal

### Configuration
1. In your \`.env\`, configure:
   - \`STRIPE_SECRET_KEY\`
   - \`STRIPE_WEBHOOK_SECRET\`
   - \`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY\`
2. In the Stripe Dashboard, configure your Webhook Endpoint:
   - URL: \`https://YOUR_DOMAIN/api/webhooks/billing/stripe\`
   - Events: \`checkout.session.completed\`, \`customer.subscription.updated\`, \`customer.subscription.deleted\`, \`invoice.payment_succeeded\`, \`invoice.payment_failed\`.

### Self-Service Customer Portal
Customers can manage payment methods, upgrade tiers, download invoices, or cancel subscriptions through Stripe's hosted Customer Portal linked directly from **Billing** (\`/billing\`).

## Razorpay Setup & Webhooks

### Configuration
1. In your \`.env\`, configure:
   - \`RAZORPAY_KEY_ID\`
   - \`RAZORPAY_KEY_SECRET\`
   - \`RAZORPAY_WEBHOOK_SECRET\`
2. In Razorpay Dashboard under **Settings > Webhooks**:
   - URL: \`https://YOUR_DOMAIN/api/webhooks/billing/razorpay\`
   - Secret: Matches \`RAZORPAY_WEBHOOK_SECRET\`
   - Events: \`payment.captured\`, \`payment_link.paid\`, \`subscription.charged\`.`,
  },

  "usage-tracking": {
    title: "Usage Counters & Overage",
    description: "Monitor real-time consumption of conversations, voice minutes, and knowledge articles.",
    toc: [
      { id: "usage-counters", title: "Usage Counters Overview", level: 2 },
      { id: "limit-enforcement", title: "Limit Enforcement Modes", level: 2 },
      { id: "invoices-and-history", title: "Invoices & Payment Records", level: 2 },
    ],
    content: `## Usage Counters Overview

Under **Billing > Usage** (\`/billing\`), Operator displays real-time resource meters backed by \`usageCounters\` in the database:
- **Conversations:** Total customer dialogue threads initiated this billing cycle.
- **Voice Minutes:** Cumulative telephone audio duration in seconds, converted to minutes.
- **Knowledge Articles:** Total active documents and website crawl pages stored in the Knowledge Base.

## Limit Enforcement Modes

Controlled by \`usageLimitBehavior\` in \`src/lib/billing/plans.ts\`:
- **UPGRADE_REQUIRED (Starter & Professional):** When an organization reaches 100% of its conversation or voice minute quota, the system sends an email notification and prompts staff to upgrade. New incoming requests can be paused until upgraded.
- **OVERAGE (Business Tier):** Operations continue uninterrupted; excess usage is calculated at transparent per-minute and per-conversation overage rates appended to the next monthly invoice.

## Invoices & Payment Records

All transactional records are logged in \`invoices\` and \`payments\`:
- Review paid invoices, download PDF receipts, and audit transaction IDs.
- If a renewal payment fails, the subscription enters a 3-day grace period (\`gracePeriodDaysRemaining\`) before restricting advanced AI features.`,
  },

  // ─────────────────────────────────────────────────────────
  // 9. ACCOUNT & TEAM
  // ─────────────────────────────────────────────────────────
  "user-authentication": {
    title: "Authentication & Sessions",
    description: "Learn how Operator handles user authentication, Argon2 hashing, and session management.",
    toc: [
      { id: "auth-architecture", title: "Authentication Architecture", level: 2 },
      { id: "password-security", title: "Argon2 Password Hashing", level: 2 },
      { id: "session-management", title: "Session Cookies & Sliding Expiration", level: 2 },
      { id: "google-oauth", title: "Google OAuth Integration", level: 2 },
    ],
    content: `## Authentication Architecture

Operator features an independent, self-hosted authentication system implemented in \`src/server/actions/auth.ts\` and \`src/lib/auth/\`:
- Zero reliance on external paid auth vendors like Clerk or Supabase Auth.
- Full ownership of user records in the local \`users\` table.
- Cryptographically secure cookie-based session tokens stored in \`sessions\`.

## Argon2 Password Hashing

User passwords are encrypted using **Argon2id** via the native \`@node-rs/argon2\` library:
- State-of-the-art memory-hard password hashing algorithm resistant to GPU cracking.
- Salt is generated cryptographically per user.

## Session Cookies & Sliding Expiration

Upon successful authentication:
1. A cryptographically random session token is generated.
2. The session record is saved in \`sessions\` with user agent, IP address, and an expiration timestamp (30 days for *Remember Me*, 24 hours standard).
3. An \`httpOnly\`, \`secure\`, \`sameSite: "lax"\` cookie named \`session_token\` is set on the browser.
4. Active sessions benefit from sliding expiration: ongoing user activity refreshes the session lifespan.

## Google OAuth Integration

Users can also authenticate with Google:
- Initiation endpoint: \`POST /api/auth/login/google\` redirects to Google OAuth 2.0 consent.
- Callback endpoint: \`GET /api/auth/callback/google\` verifies authorization code, upserts the \`users\` record, and issues an active session.`,
  },

  "roles-and-permissions": {
    title: "Roles & Team Invites",
    description: "Manage team members, define access roles, and understand permission boundaries.",
    toc: [
      { id: "role-hierarchy", title: "Role Hierarchy", level: 2 },
      { id: "permissions-matrix", title: "Permissions Matrix", level: 2 },
      { id: "inviting-members", title: "Inviting Team Members", level: 2 },
    ],
    content: `## Role Hierarchy

Operator defines four permission levels in the \`roleEnum\` database schema:
1. **Owner:** The primary workspace creator. Full control over billing, agency settings, domain configuration, and organization deletion.
2. **Admin:** Full operational configuration access. Can add channels, configure Voice AI, upload knowledge documents, and invite team members.
3. **Manager:** Day-to-day operational access. Can manage appointments, service offerings, staff schedules, and triage inbox threads.
4. **Staff:** Read and triage access. Can view conversation transcripts, respond to assigned inbox threads, and append internal notes.

## Permissions Matrix

| Capability | Owner | Admin | Manager | Staff |
| :--- | :---: | :---: | :---: | :---: |
| View Unified Inbox & Transcripts | Yes | Yes | Yes | Yes |
| Reply to Customer Threads | Yes | Yes | Yes | Yes |
| Reschedule / Cancel Appointments | Yes | Yes | Yes | Assigned Only |
| Modify Services & Durations | Yes | Yes | Yes | — |
| Manage Staff Working Schedules | Yes | Yes | Yes | — |
| Upload & Edit Knowledge Base | Yes | Yes | — | — |
| Connect Channels (WhatsApp, Voice) | Yes | Yes | — | — |
| Manage Billing & Invoices | Yes | — | — | — |
| Delete Organization | Yes | — | — | — |

## Inviting Team Members

Under **Team & Staff** (\`/team\`):
1. Click **Invite Member**.
2. Enter the member's email address and assign their role (\`admin\`, \`manager\`, or \`staff\`).
3. An invitation token is stored in \`verification_tokens\` with a 7-day expiration.
4. The user accepts the invite link to set their password and join your workspace.`,
  },

  // ─────────────────────────────────────────────────────────
  // 10. DEVELOPER & WEBHOOKS
  // ─────────────────────────────────────────────────────────
  "webhook-endpoints": {
    title: "Webhook Endpoints & Security",
    description: "Technical reference for all production webhook endpoints and cryptographic signature verification.",
    toc: [
      { id: "webhook-directory", title: "Production Webhook Directory", level: 2 },
      { id: "voice-inbound-webhook", title: "Twilio Voice Inbound Webhook", level: 2 },
      { id: "meta-webhook", title: "Meta WhatsApp & Instagram Webhook", level: 2 },
      { id: "billing-webhooks", title: "Billing Webhooks (Stripe & Razorpay)", level: 2 },
    ],
    content: `## Production Webhook Directory

Operator provides dedicated, verified webhook endpoints for external services:

| Endpoint | Method | Provider | Description |
| :--- | :--- | :--- | :--- |
| \`/api/webhooks/voice/inbound\` | \`POST\` | Twilio Voice | Inbound telephone call routing and TwiML instructions |
| \`/api/webhooks/voice/stream\` | \`GET\` / \`POST\` | Media Stream | WebSocket audio streaming handshake |
| \`/api/webhooks/voice/recording\` | \`POST\` | Twilio Voice | Completed call recording URL and transcription |
| \`/api/webhooks/meta\` | \`GET\` | Meta Cloud API | Webhook challenge token verification |
| \`/api/webhooks/meta\` | \`POST\` | Meta Cloud API | Inbound WhatsApp & Instagram messages |
| \`/api/webhooks/billing/stripe\` | \`POST\` | Stripe | Subscription updates, invoices, and checkout events |
| \`/api/webhooks/billing/razorpay\` | \`POST\` | Razorpay | Order payments, payment links, and subscriptions |
| \`/api/webhooks/sinch\` | \`POST\` | Sinch SMS | Inbound SMS and delivery receipts |
| \`/api/webhooks/vonage\` | \`POST\` | Vonage | Inbound voice and SMS callbacks |

## Twilio Voice Inbound Webhook

- **Path:** \`POST /api/webhooks/voice/inbound\`
- **Signature Header:** \`x-twilio-signature\`
- **Verification:** Validated using \`verifyTwilioSignature()\` with \`TWILIO_AUTH_TOKEN\` to guarantee requests originate from Twilio.
- **Response Format:** Returns TwiML XML (\`<Response><Say>...</Say></Response>\`).

## Meta WhatsApp & Instagram Webhook

- **Path:** \`/api/webhooks/meta\`
- **GET Handler:** Checks \`hub.mode === "subscribe"\` and verifies \`hub.verify_token\` against \`META_WEBHOOK_VERIFY_TOKEN\`. Returns the \`hub.challenge\` string.
- **POST Handler:** Validates HMAC-SHA256 signature passed in \`x-hub-signature-256\` using \`META_APP_SECRET\`.

## Billing Webhooks (Stripe & Razorpay)

### Stripe (\`/api/webhooks/billing/stripe\`)
- Validates the raw request body against \`stripe-signature\` using \`stripe.webhooks.constructEvent()\`.

### Razorpay (\`/api/webhooks/billing/razorpay\`)
- Validates HMAC-SHA256 signature in \`x-razorpay-signature\` using \`RAZORPAY_WEBHOOK_SECRET\`.`,
  },

  "widget-api-reference": {
    title: "Widget API & Embed Code",
    description: "REST API endpoints and payload specifications powering the Operator website chat widget.",
    toc: [
      { id: "widget-script-tag", title: "Widget Embed Code", level: 2 },
      { id: "config-endpoint", title: "Widget Configuration API", level: 2 },
      { id: "session-endpoint", title: "Session Creation API", level: 2 },
      { id: "chat-endpoint", title: "Chat Exchange API", level: 2 },
    ],
    content: `## Widget Embed Code

Embed the Operator widget on any website using this standard script tag:

\`\`\`html
<script src="https://app.operator.ai/widget.js" data-org-id="YOUR_ORGANIZATION_ID"></script>
\`\`\`

When loaded, the script checks domain whitelisting, retrieves the organization's branding theme, and renders the floating launcher.

## Widget Configuration API

- **Endpoint:** \`GET /api/widget/config?orgId={organizationId}\`
- **Authentication:** Public with Origin verification.
- **Response:**

\`\`\`json
{
  "enabled": true,
  "theme": {
    "themeMode": "light",
    "primaryColor": "#7a5af8",
    "borderRadius": "0.75rem"
  },
  "branding": {
    "companyName": "Acme Family Dental",
    "tagline": "24/7 AI Receptionist",
    "welcomeMessage": "Hi! How can I help you book or answer questions today?"
  },
  "launcher": {
    "position": "bottom_right",
    "icon": "message-square",
    "size": "medium"
  },
  "customization": {
    "starterQuestions": [
      "What are your business hours?",
      "How do I book an appointment?",
      "What services do you offer?"
    ]
  }
}
\`\`\`

## Session Creation API

- **Endpoint:** \`POST /api/widget/session\`
- **Request Body:**
\`\`\`json
{
  "organizationId": "org_uuid_here",
  "clientMetadata": {
    "referrer": "https://google.com",
    "userAgent": "Mozilla/5.0..."
  }
}
\`\`\`
- **Response:**
\`\`\`json
{
  "sessionId": "ses_uuid_here",
  "conversationId": "conv_uuid_here",
  "welcomeMessage": "Hi! How can I help you book or answer questions today?"
}
\`\`\`

## Chat Exchange API

- **Endpoint:** \`POST /api/widget/chat\`
- **Request Body:**
\`\`\`json
{
  "organizationId": "org_uuid_here",
  "conversationId": "conv_uuid_here",
  "message": "Do you have any openings this Friday morning?"
}
\`\`\`
- **Response:** Returns assistant text, suggested time slots, and citation metadata.`,
  },

  "troubleshooting-guide": {
    title: "Troubleshooting & Error Codes",
    description: "Diagnose and resolve common operational errors based on real application states.",
    toc: [
      { id: "domain-verification-failures", title: "Domain Verification Failures", level: 2 },
      { id: "webhook-signature-errors", title: "Webhook Signature Verification Errors", level: 2 },
      { id: "crawler-ssrf-errors", title: "Website Crawler Blocks & Timeouts", level: 2 },
      { id: "scheduling-conflicts", title: "Scheduling Conflicts & No Slots", level: 2 },
      { id: "plan-limit-errors", title: "Plan Quota Exceeded Errors", level: 2 },
    ],
    content: `## Domain Verification Failures

**Problem:** Adding a custom domain under Agency or Website Widget fails with:
\`TXT verification record not found. Expected record: "operator-verify=..."\`

**Causes & Solutions:**
1. **DNS Propagation Delay:** DNS TXT records can take 5 to 60 minutes to propagate globally. Wait 15 minutes and click **Verify** again.
2. **Incorrect Host Record:** Ensure the TXT record is placed at the exact root or subdomain hostname configured in Operator.
3. **Record Value:** Verify the record string begins with \`operator-verify=\` followed by your exact token.

## Webhook Signature Verification Errors

**Problem:** Phone calls receive a hangup message or WhatsApp messages return HTTP 401 Unauthorized.

**Causes & Solutions:**
1. **Twilio Auth Token Mismatch:** Check that \`TWILIO_AUTH_TOKEN\` in your \`.env\` matches the exact token in your Twilio Console for that Account SID.
2. **Proxy Host Headers:** If deployed behind a reverse proxy or cloud load balancer, verify that \`x-forwarded-host\` and \`x-forwarded-proto\` are preserved.
3. **Meta Webhook Secret:** Ensure \`META_APP_SECRET\` matches your Meta App Secret in Developer Settings.

## Website Crawler Blocks & Timeouts

**Problem:** Website Import returns *"We couldn't crawl this webpage"* or blocks ingestion.

**Causes & Solutions:**
1. **SSRF Rejection:** Operator strictly blocks localhost (\`127.0.0.1\`), internal IPs (\`192.168.x\`), and non-public hostnames for security.
2. **Cloudflare / Bot Protection:** If your website has strict anti-bot shields (e.g., Cloudflare Under Attack mode), the crawler may be blocked. Temporarily allowlist the Operator server user agent or upload documents via PDF/DOCX instead.
3. **Deep SPA JavaScript:** Pages that require client-side execution to render text should be uploaded as PDF or Markdown text.

## Scheduling Conflicts & No Slots

**Problem:** AI tells callers *"There are no available slots"* even though you appear free.

**Causes & Solutions:**
1. **Operating Hours Closed:** Check **Profile > Operating Hours** to verify that day is not marked \`closed: true\`.
2. **Staff Schedule Missing:** Verify that at least one staff member certified for that service has an active schedule in **Staff > Rostering** (\`/staff\`).
3. **Buffer Times Overlap:** Check if pre- or post-service buffer times (e.g., 30 min buffer) overlap adjacent appointments.
4. **Notice Hours:** Verify the booking time does not violate the minimum advance notice rule (e.g., 2 hours).

## Plan Quota Exceeded Errors

**Problem:** Messages or calls are paused with status \`UPGRADE_REQUIRED\`.

**Solution:**
Navigate to **Billing** (\`/billing\`) and review your active usage counters. If you have reached your monthly conversation or voice minute quota, click **Upgrade Plan** to switch to Professional or Business tier.`,
  },
};
