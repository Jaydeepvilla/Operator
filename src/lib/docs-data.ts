import { Settings, MessageSquare, Inbox, Brain, Calendar, Phone, CreditCard, Code2 } from "lucide-react";

export const SIDEBAR = [
  {
    section: "Getting Started",
    icon: Settings,
    items: [
      { id: "quickstart", label: "Quickstart Guide" },
      { id: "account-setup", label: "Account Setup" },
      { id: "business-profile", label: "Business Profile" }
    ]
  },
  {
    section: "Voice & Channels",
    icon: Phone,
    items: [
      { id: "voice-ai", label: "Voice AI & Telephony" },
      { id: "connect-whatsapp", label: "Meta WhatsApp" },
      { id: "connect-sms", label: "Twilio SMS" },
      { id: "connect-email", label: "Email Setup" },
      { id: "connect-instagram", label: "Instagram Direct" }
    ]
  },
  {
    section: "Inbox & CRM",
    icon: Inbox,
    items: [
      { id: "view-messages", label: "Viewing Messages" },
      { id: "manage-leads", label: "Managing Leads" }
    ]
  },
  {
    section: "Knowledge Base",
    icon: Brain,
    items: [
      { id: "add-documents", label: "Uploading Documents" }
    ]
  },
  {
    section: "Appointments & Services",
    icon: Calendar,
    items: [
      { id: "view-appointments", label: "Viewing Appointments" },
      { id: "services-menu", label: "Services Menu" }
    ]
  },
  {
    section: "Payments & Invoicing",
    icon: CreditCard,
    items: [
      { id: "razorpay-payments", label: "Razorpay Payments" }
    ]
  },
  {
    section: "Developer & API",
    icon: Code2,
    items: [
      { id: "api-webhooks", label: "API & Webhooks" }
    ]
  }
];

export const DOC_CONTENT: Record<
  string,
  {
    title: string;
    description: string;
    content: string;
    code?: string;
    toc?: { id: string; title: string; level: number }[];
  }
> = {
  quickstart: {
    title: "Quickstart Guide",
    description: "Deploy your AI receptionist in under 5 minutes across voice, WhatsApp, and web chat.",
    toc: [
      { id: "overview", title: "Overview", level: 2 },
      { id: "three-step-setup", title: "3-Step Setup", level: 2 },
      { id: "step-1-profile", title: "Step 1: Configure Business Profile", level: 3 },
      { id: "step-2-knowledge", title: "Step 2: Upload Knowledge Base", level: 3 },
      { id: "step-3-channels", title: "Step 3: Connect Live Channels", level: 3 },
      { id: "testing-your-agent", title: "Testing Your Agent", level: 2 },
      { id: "next-steps", title: "Next Steps", level: 2 }
    ],
    content: `## Overview

Welcome to Operator AI. This guide walks you through setting up an autonomous AI receptionist that can answer phone calls, qualify inbound leads, schedule calendar bookings, and collect upfront Razorpay deposits.

<Callout type="info" title="Zero Coding Required">
All core features can be configured directly from the graphical dashboard. Developer SDKs and webhooks are optional.
</Callout>

## 3-Step Setup

### Step 1: Configure Business Profile
Head to **Profile** in your left navigation to configure your company identity, address, operating hours, and standard timezone. This informs the AI when your staff is available.

### Step 2: Upload Knowledge Base
Go to **Knowledge** and upload your service FAQs, policy guidelines, price sheets (PDF, CSV, DOCX), or paste custom text notes. Operator AI parses this content in seconds to provide accurate domain answers.

### Step 3: Connect Live Channels
Navigate to **Channels** to activate your communication pipelines:
- **Voice AI:** Connect your Twilio SIP or Vonage trunk to answer inbound telephone calls.
- **WhatsApp:** Link your official Meta WhatsApp Business API.
- **Web Widget:** Embed the single-line script on your website.

## Testing Your Agent

Once your channels are linked, open the **Live Demo Simulator** at \`/demo\` or dial your assigned virtual test number. 

| Feature | Expected Response Time | Capabilities |
| :--- | :--- | :--- |
| Voice Inbound | < 120ms audio latency | Real-time speech-to-text, context reasoning, voice synthesis |
| WhatsApp Chat | < 1.2s response | Dynamic slot buttons, media attachments, instant quote cards |
| Razorpay Payments | Instant Link generation | UPI QR codes, debit/credit cards, automatic SMS dispatch |

## Next Steps

Explore the detailed guides below to customize conversation tones, connect Google/Outlook calendars, and configure automatic Razorpay order triggers.`
  },
  "account-setup": {
    title: "Account Setup",
    description: "Configure your basic account details, authentication credentials, and workspace preferences.",
    toc: [
      { id: "overview", title: "Overview", level: 2 },
      { id: "initial-configuration", title: "Initial Configuration", level: 2 },
      { id: "workspace-settings", title: "Workspace Settings", level: 2 },
      { id: "security-two-factor", title: "Security & Two-Factor Auth", level: 2 }
    ],
    content: `## Overview

Account setup is where you configure Operator AI with your company details and secure your administrative login.

## Initial Configuration

- **Step 1:** Select your primary industry (Healthcare, Legal, Salon & Spa, Automotive, Real Estate, or Professional Services).
- **Step 2:** Enter your business contact email and phone number.
- **Step 3:** Choose your primary business timezone to guarantee accurate calendar scheduling.

## Workspace Settings

You can invite team members and set access levels from the **Team & Staff** tab:
- **Owner / Admin:** Full configuration access, billing management, and integration controls.
- **Staff / Agent:** View conversation inboxes, triage bookings, and append private internal customer notes.

## Security & Two-Factor Auth

Enable Two-Factor Authentication (2FA) via Authenticator App (TOTP) from the **Security** tab to enforce strict access controls on all customer transcripts and payment records.`
  },
  "business-profile": {
    title: "Business Profile",
    description: "Manage your company bio, operating hours, physical locations, and public contact coordinates.",
    toc: [
      { id: "overview", title: "Overview", level: 2 },
      { id: "core-attributes", title: "Core Attributes", level: 2 },
      { id: "operating-hours", title: "Operating Hours & Availability", level: 2 },
      { id: "social-coordinates", title: "Social & Review Links", level: 2 }
    ],
    content: `## Overview

Your business profile contains the baseline factual data that Operator AI references whenever callers ask questions like *"Where are you located?"*, *"What are your opening hours on Saturday?"*, or *"Can you send me your Google Maps link?"*.

## Core Attributes

- **Business Name & Bio:** Clear summary of your business mission and specialties.
- **Support Email & Inbound Phone:** Dedicated channels for escalations.
- **Physical Address:** Street, City, State, and Postal Code used for localized driving directions.

## Operating Hours & Availability

Set your weekly schedule per day (e.g., Monday–Friday 09:00 AM – 06:00 PM). Operator AI automatically detects after-hours inquiries and adjusts its dialogue to schedule bookings for the next available open slot.

## Social & Review Links

Paste your Google Maps Review Link, Instagram handle, and Facebook Page. When customers complete a successful appointment, the AI can automatically dispatch a thank-you text containing your review link.`
  },
  "voice-ai": {
    title: "Voice AI & Telephony",
    description: "Configure conversational speech synthesis, SIP streaming, and telephone call answering.",
    toc: [
      { id: "telephony-overview", title: "Telephony Overview", level: 2 },
      { id: "connecting-sip-trunk", title: "Connecting a SIP Trunk", level: 2 },
      { id: "voice-selection", title: "Voice Models & Latency Tuning", level: 2 },
      { id: "interruption-handling", title: "Interruption & Barge-in Controls", level: 2 }
    ],
    code: `// Sample SIP Inbound Webhook Configuration
POST /api/webhooks/voice/inbound
Host: app.operator.ai
Content-Type: application/json

{
  "CallSid": "CA1234567890abcdef",
  "From": "+14155552671",
  "To": "+18005550199",
  "Direction": "inbound",
  "ForwardedFrom": "+18005550100"
}`,
    content: `## Telephony Overview

Operator AI features an ultra-low latency voice engine (< 120ms processing latency) capable of understanding natural speech, handling interruptions gracefully, and resolving bookings natively over the telephone.

<Callout type="tip" title="Crystal Clear Audio">
Operator AI utilizes neural acoustic echo cancellation and bi-directional websocket audio streams to ensure high-fidelity voice transmission.
</Callout>

## Connecting a SIP Trunk

1. Navigate to **Voice > Settings** in the dashboard.
2. Select your provider (**Twilio SIP**, **Vonage**, or **Custom PBX**).
3. Paste your SIP URI and Authentication Credentials.
4. Set the Inbound Webhook URL to \`https://app.operator.ai/api/webhooks/voice/inbound\`.

## Voice Models & Latency Tuning

Choose from studio-grade neural voices tailored for conversational warmth and clarity:
- **Maya:** Natural, warm, and professional (recommended for Dental & Medical).
- **Alexander:** Confident, articulate, and calm (recommended for Legal & Financial).
- **Chloe:** Energetic and friendly (recommended for Salons, Spas & Fitness).

## Interruption & Barge-in Controls

Operator AI supports full duplex barge-in. When a human speaker begins talking while the AI is responding, the AI automatically silences audio playback and switches to active listening immediately.`
  },
  "connect-whatsapp": {
    title: "Meta WhatsApp Business",
    description: "Connect the official Meta Cloud API to automate inbound customer messages, interactive buttons, and media.",
    toc: [
      { id: "overview", title: "Overview", level: 2 },
      { id: "credentials-setup", title: "Credentials Setup", level: 2 },
      { id: "ai-autopilot-modes", title: "AI Autopilot Modes", level: 2 }
    ],
    content: `## Overview

Connect your official WhatsApp Business number to engage customers on WhatsApp with automated qualification, interactive time-slot pickers, and payment links.

## Credentials Setup

1. Go to **Channels > Meta WhatsApp Business**.
2. Click **Connect API**.
3. Input your **Phone Number ID**, **WhatsApp Business Account ID (WABA)**, and **Permanent System User Access Token**.
4. Configure your Webhook URL in the Meta Developer Console with the verification token provided.

## AI Autopilot Modes

- **Full Autopilot:** Operator AI replies immediately to all inquiries, qualifies leads, and schedules appointments.
- **Assisted Mode:** Operator AI drafts replies in the Inbox for team approval before sending.
- **After-Hours Only:** Operator AI activates only outside regular operating hours.`
  },
  "connect-sms": {
    title: "Twilio SMS",
    description: "Send automated text reminders, deposit payment links, and two-way SMS conversations.",
    toc: [
      { id: "overview", title: "Overview", level: 2 },
      { id: "step-by-step", title: "Step-by-Step Connection", level: 2 },
      { id: "features", title: "SMS Capabilities", level: 2 }
    ],
    content: `## Overview

Twilio SMS integration allows Operator AI to dispatch instant booking confirmations, transactional receipts, appointment reminders, and answer inbound SMS text inquiries.

## Step-by-Step Connection

1. Open **Channels** and click **Connect Twilio** on the Twilio SMS card.
2. Enter your **Account SID**, **Auth Token**, and registered **Twilio Phone Number**.
3. Save the pipeline to verify carrier routing.

## SMS Capabilities

- **Appointment Reminders:** Dispatches SMS alerts 24 hours and 2 hours prior to scheduled bookings.
- **Payment Link Dispatches:** Sends instant Razorpay UPI links to confirm reservation deposits.
- **Two-Way Text Chat:** Converts standard SMS dialogues into structured CRM appointments.`
  },
  "connect-email": {
    title: "Email Setup",
    description: "Process inbound customer emails and draft intelligent context-aware replies.",
    toc: [
      { id: "overview", title: "Overview", level: 2 },
      { id: "smtp-configuration", title: "SMTP & IMAP Setup", level: 2 }
    ],
    content: `## Overview

Connect your support email (Google Workspace, Microsoft 365, or Custom SMTP) so Operator AI can parse long-form inquiries, quote service pricing, and schedule meetings.

## SMTP & IMAP Setup

1. Navigate to **Channels > Email Integration**.
2. Provide your incoming IMAP and outgoing SMTP host details.
3. Define your AI signature footer and escalation rules.`
  },
  "connect-instagram": {
    title: "Instagram Direct",
    description: "Convert Instagram DM conversations into qualified leads and confirmed bookings.",
    toc: [
      { id: "overview", title: "Overview", level: 2 },
      { id: "meta-page-linking", title: "Linking Instagram Account", level: 2 }
    ],
    content: `## Overview

Link your Instagram Professional Account via Meta Business Suite to allow Operator AI to answer follower inquiries, share booking links, and capture contact information from direct messages.

## Linking Instagram Account

1. Open **Channels > Instagram Direct**.
2. Connect using your Meta Page admin token.
3. Test by sending a direct message from any external Instagram profile.`
  },
  "view-messages": {
    title: "Viewing Messages & Inbox",
    description: "Manage unified conversations across all channels in real time.",
    toc: [
      { id: "inbox-overview", title: "Inbox Overview", level: 2 },
      { id: "channel-filters", title: "Channel Filtering & Search", level: 2 },
      { id: "human-takeover", title: "Human Takeover & Internal Notes", level: 2 }
    ],
    content: `## Inbox Overview

The Unified Inbox aggregates live chats, voice call transcripts, SMS threads, and WhatsApp messages into a single responsive interface.

## Channel Filtering & Search

- Filter by channel (**WhatsApp**, **Voice**, **SMS**, **Instagram**, **Email**).
- Search conversations by lead name, phone number, or intent category.

## Human Takeover & Internal Notes

- **Pause AI:** Toggle the Autopilot switch off to type direct human responses.
- **Private Team Notes:** Click **Internal Note** to leave remarks visible only to your staff.`
  },
  "manage-leads": {
    title: "Managing Leads & CRM",
    description: "Track lead scoring, qualification criteria, custom fields, and pipeline status.",
    toc: [
      { id: "lead-scoring", title: "Lead Scoring Matrix", level: 2 },
      { id: "custom-fields", title: "Custom Contact Attributes", level: 2 },
      { id: "exporting-crm", title: "CRM Sync & Export", level: 2 }
    ],
    content: `## Lead Scoring Matrix

Operator AI automatically assesses every conversation and assigns a Lead Score from 0 to 100 based on:
- Budget availability
- Urgency / timeline
- Problem-solution fit
- Decision-maker qualification

## Custom Contact Attributes

Store patient IDs, vehicle models, dispute types, or hair lengths directly in the contact profile card.

## CRM Sync & Export

Export leads to CSV or synchronize automatically with HubSpot, Salesforce, Dentrix, or custom webhooks.`
  },
  "add-documents": {
    title: "Uploading Documents & Knowledge Base",
    description: "Train Operator AI on your business policies, price lists, FAQs, and service menus.",
    toc: [
      { id: "overview", title: "Overview", level: 2 },
      { id: "supported-file-types", title: "Supported File Types", level: 2 },
      { id: "best-practices", title: "Document Best Practices", level: 2 }
    ],
    content: `## Overview

The Knowledge Base is the brain of your AI receptionist. By uploading company documents, Operator AI learns your specific cancellation policies, pricing packages, insurance coverage, and team biographies.

## Supported File Types

- **PDF (.pdf):** Policy manuals, service catalogues, warranty guidelines.
- **Word (.docx):** Staff bios, intake questionnaires.
- **Spreadsheets (.csv):** Structured price lists and part numbers.
- **Plain Text (.txt / .md):** FAQs and quick answer snippets.

## Best Practices

- Use clear question-and-answer pairs for complex pricing policies.
- Keep documents updated whenever seasonal rates or staff rosters change.`
  },
  "view-appointments": {
    title: "Viewing Appointments & Calendar",
    description: "Monitor scheduled appointments, sync Google/Outlook calendars, and handle reschedules.",
    toc: [
      { id: "calendar-sync", title: "Calendar Synchronization", level: 2 },
      { id: "managing-bookings", title: "Managing Bookings", level: 2 },
      { id: "cancellations-no-shows", title: "Cancellations & No-Shows", level: 2 }
    ],
    content: `## Calendar Synchronization

Operator AI connects in real-time with **Google Calendar** and **Microsoft Outlook Calendar** to check availability down to the minute, avoiding double-bookings.

## Managing Bookings

- **Confirm / Reschedule:** Change booking dates with automated notifications sent to the customer.
- **Buffer Times:** Automatically enforce 15-minute padding between appointments.

## Cancellations & No-Shows

Mark appointments as *Completed*, *Cancelled*, or *No-Show* to update the customer's CRM profile reliability rating.`
  },
  "services-menu": {
    title: "Services Menu & Pricing",
    description: "Define service catalog, durations, deposit requirements, and staff assignments.",
    toc: [
      { id: "overview", title: "Overview", level: 2 },
      { id: "creating-services", title: "Creating Services", level: 2 },
      { id: "deposit-settings", title: "Deposit Settings", level: 2 }
    ],
    content: `## Overview

Configure the full list of bookable services that Operator AI can offer to callers and chat visitors.

## Creating Services

For each service, define:
- **Service Name & Category** (e.g., Dental Cleaning, Initial Legal Consultation)
- **Duration** (e.g., 30 mins, 60 mins)
- **Price & Deposit** (e.g., $150 total, $50 required upfront hold)
- **Assigned Staff / Practitioner**

## Deposit Settings

Require deposit authorization via Razorpay before a calendar slot is finalized to reduce no-shows to near zero.`
  },
  "razorpay-payments": {
    title: "Razorpay Payments & Invoicing",
    description: "Accept UPI, credit/debit cards, Net Banking, and automatic payment links.",
    toc: [
      { id: "razorpay-overview", title: "Overview", level: 2 },
      { id: "api-keys-setup", title: "API Keys Configuration", level: 2 },
      { id: "automated-payment-links", title: "Automated Payment Links", level: 2 },
      { id: "webhook-verification", title: "Webhook Verification", level: 2 }
    ],
    code: `// Sample Razorpay Payment Order Verification Payload
POST /api/webhooks/billing/razorpay
Host: app.operator.ai
Content-Type: application/json

{
  "event": "payment_link.paid",
  "payload": {
    "payment_link": {
      "id": "plink_K8m92bXyZ10",
      "amount": 250000,
      "currency": "INR",
      "status": "paid",
      "order_id": "order_K8m91aBcd"
    },
    "payment": {
      "id": "pay_9k2m31a9",
      "method": "upi",
      "vpa": "customer@okhdfcbank"
    }
  }
}`,
    content: `## Overview

Operator AI natively integrates with **Razorpay** to process secure payments, collect booking token deposits, and send dynamic payment links across WhatsApp, SMS, and Voice interactions.

<Callout type="success" title="Supported Payment Methods">
Supports UPI (Google Pay, PhonePe, Paytm, BHIM), Credit/Debit Cards (Visa, Mastercard, RuPay), NetBanking (50+ banks), and EMI.
</Callout>

## API Keys Configuration

1. Log in to your **Razorpay Dashboard**.
2. Navigate to **Settings > API Keys** and generate a **Key ID** and **Key Secret**.
3. In Operator AI, go to **Settings > Billing & Payments**.
4. Paste your **Razorpay Key ID** and **Key Secret**.
5. Click **Verify & Connect Gateway**.

## Automated Payment Links

When a customer books a premium service or consultation that requires an advance deposit:
1. Operator AI creates a Razorpay Order ID.
2. The AI generates a customized, time-limited Razorpay Payment Link.
3. The link is dispatched instantly over WhatsApp or SMS.
4. Once paid, the appointment is automatically locked in the calendar.

## Webhook Verification

Configure Razorpay Webhooks pointing to \`https://app.operator.ai/api/webhooks/billing/razorpay\` with the secret token to enable instant sub-second payment settlement confirmations.`
  },
  "api-webhooks": {
    title: "Developer APIs & Webhooks",
    description: "Programmatically trigger AI calls, dispatch messages, and subscribe to real-time events.",
    toc: [
      { id: "api-overview", title: "API Overview", level: 2 },
      { id: "authentication", title: "Authentication", level: 2 },
      { id: "dispatch-call-endpoint", title: "Trigger Outbound AI Call", level: 2 },
      { id: "webhook-events", title: "Webhook Events", level: 2 }
    ],
    code: `// Initialize Operator SDK in Node.js / TypeScript
import { Operator } from "@operator/sdk";

const operator = new Operator({
  apiKey: process.env.OPERATOR_API_KEY
});

// Trigger an Outbound Qualification Call
const call = await operator.calls.create({
  phoneNumber: "+15550199",
  voiceId: "maya_neural",
  prompt: "Follow up regarding requested dental consultation",
  context: {
    customerName: "Sarah Jenkins",
    service: "Teeth Whitening"
  }
});

console.log(\`Call initiated. Session ID: \${call.sessionId}\`);`,
    content: `## API Overview

Operator AI provides RESTful APIs and real-time Webhook subscriptions for seamless integration with custom internal dashboards, mobile apps, and ERP systems.

## Authentication

All API requests require a Bearer token passed in the \`Authorization\` header:

\`\`\`bash
curl -X GET https://app.operator.ai/api/v1/conversations \\
  -H "Authorization: Bearer op_live_your_api_key"
\`\`\`

## Trigger Outbound AI Call

You can programmatically initiate outbound calls to warm web leads within seconds of form submissions:

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| \`phoneNumber\` | string | Yes | E.164 formatted telephone number |
| \`voiceId\` | string | Yes | Voice personality ID (e.g., \`maya_neural\`) |
| \`prompt\` | string | Yes | Initial conversation objective and guidelines |
| \`context\` | object | No | Custom JSON payload with CRM lead metadata |

## Webhook Events

Subscribe to real-time webhook events:
- \`appointment.created\`: Fired when a new booking is confirmed.
- \`lead.qualified\`: Fired when an incoming lead meets qualification score criteria.
- \`payment.completed\`: Fired upon successful Razorpay deposit verification.
- \`call.recording.ready\`: Fired when voice call MP3 audio and transcripts are processed.`
  }
};
