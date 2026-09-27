import { APP_ROUTES } from "@/lib/constants/routes";
import { SearchResultItem } from "./types";

export interface NavigationSearchEntry {
  id: string;
  title: string;
  description: string;
  href: string;
  badge: string;
  keywords: string[];
}

export const NAVIGATION_REGISTRY: NavigationSearchEntry[] = [
  {
    id: "nav_dashboard",
    title: "Dashboard Overview",
    description: "Real-time reception metrics, live call widgets, and activity stream",
    href: APP_ROUTES.dashboard,
    badge: "Core",
    keywords: ["home", "main", "overview", "metrics", "stats", "telemetry"],
  },
  {
    id: "nav_inbox",
    title: "Unified Inbox",
    description: "Omnichannel customer messaging, WhatsApp, SMS, and web chat",
    href: APP_ROUTES.inbox,
    badge: "Live Chat",
    keywords: ["chat", "messages", "inbox", "conversations", "sms", "whatsapp", "threads"],
  },
  {
    id: "nav_contacts",
    title: "Contacts & Leads CRM",
    description: "Customer database, qualification scores, notes, and contact history",
    href: APP_ROUTES.contacts,
    badge: "CRM",
    keywords: ["contacts", "customers", "leads", "clients", "directory", "people", "crm"],
  },
  {
    id: "nav_appointments",
    title: "Appointments & Bookings",
    description: "Calendar scheduling, pending appointments, and customer bookings",
    href: APP_ROUTES.appointments,
    badge: "Calendar",
    keywords: ["calendar", "appointments", "bookings", "schedule", "reservations", "slots"],
  },
  {
    id: "nav_kb",
    title: "Knowledge Base",
    description: "Business documents, manuals, website imports, and AI embeddings",
    href: APP_ROUTES.kb,
    badge: "AI Knowledge",
    keywords: ["kb", "knowledge", "docs", "documents", "training", "manuals", "pdf", "embeddings"],
  },
  {
    id: "nav_faqs",
    title: "FAQs Builder",
    description: "Curated questions and answers for instant AI receptionist responses",
    href: APP_ROUTES.faqs,
    badge: "FAQs",
    keywords: ["faq", "questions", "answers", "q&a", "help", "rules"],
  },
  {
    id: "nav_services",
    title: "Services & Pricing Catalog",
    description: "Service offerings, booking durations, fees, and appointment types",
    href: APP_ROUTES.services,
    badge: "Catalog",
    keywords: ["services", "pricing", "catalog", "offerings", "rates", "fees", "products"],
  },
  {
    id: "nav_voice",
    title: "Voice AI Receptionist",
    description: "Configure phone numbers, voice models, telephony, and live test calls",
    href: APP_ROUTES.voice,
    badge: "Voice AI",
    keywords: ["voice", "phone", "calls", "telephony", "agent", "receptionist", "sip", "audio"],
  },
  {
    id: "nav_voice_history",
    title: "Voice Call Logs",
    description: "Full call recordings, AI transcripts, sentiment analysis, and summaries",
    href: APP_ROUTES.voiceHistory,
    badge: "Call Logs",
    keywords: ["call logs", "history", "recordings", "transcripts", "call sessions", "recordings"],
  },
  {
    id: "nav_channels",
    title: "Communication Channels",
    description: "Connect WhatsApp Business, Twilio SMS, Instagram, and Web Chat",
    href: APP_ROUTES.channels,
    badge: "Integrations",
    keywords: ["channels", "whatsapp", "twilio", "sms", "instagram", "web chat"],
  },
  {
    id: "nav_widget",
    title: "Website Chat Widget",
    description: "Customize bubble styling, embed snippet, and test live chat & call widget",
    href: APP_ROUTES.widget,
    badge: "Widget",
    keywords: ["widget", "embed", "chat widget", "website widget", "script", "bubble", "webchat", "snippet"],
  },
  {
    id: "nav_analytics",
    title: "Analytics & Reports",
    description: "Reception conversion rates, call handling speed, and volume trends",
    href: APP_ROUTES.analytics,
    badge: "Reports",
    keywords: ["analytics", "reports", "insights", "trends", "charts", "kpi", "conversion"],
  },
  {
    id: "nav_billing",
    title: "Billing & Subscriptions",
    description: "Manage subscription plans, payment methods, quotas, and invoices",
    href: APP_ROUTES.billing,
    badge: "Finance",
    keywords: ["billing", "subscription", "plan", "pricing", "invoices", "payment", "credits", "upgrade"],
  },
  {
    id: "nav_settings",
    title: "Organization Settings",
    description: "Business profile, timezone, contact info, and company settings",
    href: APP_ROUTES.settings,
    badge: "Settings",
    keywords: ["settings", "general", "organization", "company", "timezone", "preferences"],
  },
  {
    id: "nav_settings_ai",
    title: "AI Receptionist Settings",
    description: "Receptionist personality, response autonomy, and escalation guardrails",
    href: APP_ROUTES.settingsAi,
    badge: "AI Config",
    keywords: ["ai settings", "prompt", "persona", "autonomy", "escalation", "guardrails"],
  },
  {
    id: "nav_settings_booking",
    title: "Booking Rules & Policies",
    description: "Buffer times, scheduling limits, deposits, and cancellation policies",
    href: APP_ROUTES.settingsBooking,
    badge: "Booking Rules",
    keywords: ["booking rules", "buffer", "deposits", "cancellation", "scheduling policies"],
  },
  {
    id: "nav_team",
    title: "Staff & Team Management",
    description: "Invite team members, assign booking calendars, and set roles",
    href: APP_ROUTES.team,
    badge: "Team",
    keywords: ["team", "staff", "members", "users", "roles", "calendar assignment"],
  },
  {
    id: "nav_automations",
    title: "Workflow Automations",
    description: "Automated follow-ups, reminder sequences, and webhook triggers",
    href: APP_ROUTES.automations,
    badge: "Automations",
    keywords: ["automations", "workflows", "triggers", "webhooks", "follow-up", "rules"],
  },
];

export function searchNavigation(query: string, limit = 5): SearchResultItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const matched: { entry: NavigationSearchEntry; score: number }[] = [];

  for (const entry of NAVIGATION_REGISTRY) {
    let score = 0;
    const titleLower = entry.title.toLowerCase();
    const descLower = entry.description.toLowerCase();

    if (titleLower === q) {
      score += 100;
    } else if (titleLower.startsWith(q)) {
      score += 50;
    } else if (titleLower.includes(q)) {
      score += 30;
    }

    if (entry.keywords.some((k) => k === q)) {
      score += 40;
    } else if (entry.keywords.some((k) => k.startsWith(q) || k.includes(q))) {
      score += 20;
    }

    if (descLower.includes(q)) {
      score += 10;
    }

    if (score > 0) {
      matched.push({ entry, score });
    }
  }

  matched.sort((a, b) => b.score - a.score);

  return matched.slice(0, limit).map(({ entry, score }) => ({
    id: entry.id,
    type: "navigation",
    title: entry.title,
    description: entry.description,
    badge: entry.badge,
    metadata: "Quick Navigation",
    href: entry.href,
    relevanceScore: score,
  }));
}
