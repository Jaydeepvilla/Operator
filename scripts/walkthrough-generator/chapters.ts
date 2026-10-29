export interface ChapterDefinition {
  chapterNumber: number;
  title: string;
  subtitle: string;
  route: string;
  narration: string;
  durationPaddingSec?: number;
  setupActions?: (page: any) => Promise<void>;
}

export const WALKTHROUGH_CHAPTERS: ChapterDefinition[] = [
  {
    chapterNumber: 1,
    title: "Platform Overview & Architecture",
    subtitle: "Autonomous AI Receptionist & Operations Operating System",
    route: "/",
    narration:
      "Welcome to Operator, the autonomous AI receptionist and business operations platform. Built on modern serverless architecture with PostgreSQL and real-time streaming, Operator unifies multi-channel intake, dynamic retrieval augmented generation, and calendar intelligence to run business operations without human drop-off.",
    setupActions: async (page) => {
      await page.waitForTimeout(2000);
      await page.evaluate(() => window.scrollTo({ top: 300, behavior: "smooth" }));
      await page.waitForTimeout(1500);
    },
  },
  {
    chapterNumber: 2,
    title: "Account Creation & Sign-In",
    subtitle: "Enterprise Authentication & Tenant Isolation",
    route: "/sign-in",
    narration:
      "Operator features secure enterprise authentication powered by Argon2 hashing, hardened sessions, and strict tenant isolation. Each organization's data, from customer records to AI settings, is strictly isolated in isolated relational schemas.",
    setupActions: async (page) => {
      await page.waitForTimeout(1500);
      const emailField = page.locator("#signin-email");
      if (await emailField.isVisible()) {
        await emailField.fill("concierge@operatordemosalon.test");
      }
      await page.waitForTimeout(1000);
    },
  },
  {
    chapterNumber: 3,
    title: "Guided Business Onboarding",
    subtitle: "Multi-Step Business Setup & Profile Intelligence",
    route: "/onboarding",
    narration:
      "The business onboarding journey configures business identity, timezone, operating hours, and active services in minutes. For Operator Demo Salon in Mumbai, services such as Haircut, Hair Styling, and Organic Facials are pre-configured with explicit durations and pricing in Indian Rupees.",
    setupActions: async (page) => {
      await page.waitForTimeout(2000);
    },
  },
  {
    chapterNumber: 4,
    title: "AI Receptionist Configuration & Guardrails",
    subtitle: "Voice Persona, Prompt Engineering & Behavioral Safety",
    route: "/receptionist",
    narration:
      "The AI Receptionist Studio allows operators to customize voice models, speaking latency, qualification scripts, and prompt injection defenses. Built-in guardrails prevent jailbreaks, enforce factual fidelity, and guarantee that the AI only recommends verified services.",
    setupActions: async (page) => {
      await page.waitForTimeout(2000);
      await page.evaluate(() => window.scrollTo({ top: 250, behavior: "smooth" }));
      await page.waitForTimeout(1500);
    },
  },
  {
    chapterNumber: 5,
    title: "Supported Integrations Setup",
    subtitle: "Google Calendar, Twilio Voice, WhatsApp & Webhooks",
    route: "/integrations",
    narration:
      "Integrations connect Operator directly into operational workflows. Real-time bi-directional synchronization with Google Calendar prevents scheduling conflicts, while telephony connectors power low-latency voice pipelines with WebSockets.",
    setupActions: async (page) => {
      await page.waitForTimeout(2000);
    },
  },
  {
    chapterNumber: 6,
    title: "Knowledge Base & Policy Ingestion",
    subtitle: "Ground-Truth RAG Ingestion & Vector Search",
    route: "/knowledge",
    narration:
      "Operator indexes business handbooks, FAQs, and service guidelines through its hybrid semantic and lexical retrieval engine. Seeded salon policies, including the mandatory two-hour cancellation window, are parsed into chunks and grounded directly into model context.",
    setupActions: async (page) => {
      await page.waitForTimeout(2000);
    },
  },
  {
    chapterNumber: 7,
    title: "Customer Conversation & RAG Verification",
    subtitle: "Live Interactive Concierge & Verified Information",
    route: "/widget-studio",
    narration:
      "When customers interact via the web concierge or mobile channels, Operator answers questions with verified citations from the knowledge base. Inquiries about haircut pricing, herbal facial treatments, and appointment policies receive grounded, instantaneous answers.",
    setupActions: async (page) => {
      await page.waitForTimeout(2000);
      const bubble = page.locator('button:has-text("Chat View")');
      if (await bubble.isVisible()) {
        await bubble.click();
      }
      await page.waitForTimeout(1500);
    },
  },
  {
    chapterNumber: 8,
    title: "Real-Time Availability & Autonomous Booking",
    subtitle: "Atomic Transactional Locks & Verified State",
    route: "/appointments",
    narration:
      "When a customer books a slot, Operator checks true availability against business hours and active staff schedules. PostgreSQL transactional advisory locks guarantee zero double-bookings under concurrent traffic, persisting confirmed appointments directly into the calendar.",
    setupActions: async (page) => {
      await page.waitForTimeout(2000);
    },
  },
  {
    chapterNumber: 9,
    title: "Edge Cases, Cancellations & Recovery",
    subtitle: "Rescheduling Protocols & Safe State Transitions",
    route: "/appointments",
    narration:
      "Operator gracefully manages edge cases, from cancellations and reschedule requests to duplicate inquiries. When an appointment is cancelled, the slot is immediately released back to open inventory, maintaining calendar integrity across all channels.",
    setupActions: async (page) => {
      await page.waitForTimeout(2000);
      await page.evaluate(() => window.scrollTo({ top: 350, behavior: "smooth" }));
      await page.waitForTimeout(1500);
    },
  },
  {
    chapterNumber: 10,
    title: "Multi-Channel Inbox & Human Handoff",
    subtitle: "Omnichannel Communications & Live Intervention",
    route: "/inbox",
    narration:
      "The Omnichannel Inbox consolidates WhatsApp, SMS, web chat, and voice dialogue streams into a unified thread view. Human staff can monitor live AI conversations in real-time, view sentiment scores, and take over instantly whenever requested.",
    setupActions: async (page) => {
      await page.waitForTimeout(2000);
    },
  },
  {
    chapterNumber: 11,
    title: "Real-Time Business Dashboard & Analytics",
    subtitle: "Operational Telemetry, Revenue & Booking CSAT",
    route: "/dashboard",
    narration:
      "The Operator Executive Dashboard gives business leaders 360-degree visibility over operations. Real-time telemetry visualizes appointment volume, intake precision, conversion rates, and revenue snapshots with zero lag.",
    setupActions: async (page) => {
      await page.waitForTimeout(2000);
      await page.evaluate(() => window.scrollTo({ top: 200, behavior: "smooth" }));
      await page.waitForTimeout(1500);
    },
  },
  {
    chapterNumber: 12,
    title: "Production Readiness & Architecture Summary",
    subtitle: "Repeatable Seed Data, End-to-End Test Suite & SOC2 Controls",
    route: "/settings",
    narration:
      "Operator Demo Salon demonstrates complete operational readiness. With automated end-to-end test verification, idempotent database seeding, and strict isolation, Operator delivers an enterprise-grade AI operations platform ready for scale.",
    setupActions: async (page) => {
      await page.waitForTimeout(2000);
    },
  },
];

