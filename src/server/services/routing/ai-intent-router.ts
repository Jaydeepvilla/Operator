/**
 * AI Intent Router & Safety Architecture
 * 
 * Safely parses natural language user intent and maps it to controlled,
 * registered internal application destinations.
 * 
 * Safety invariants:
 * 1. AI output is strictly validated via Zod schema.
 * 2. Intents are restricted to a locked enumeration.
 * 3. AI NEVER outputs arbitrary or external URLs.
 * 4. Intent destinations are subjected to permission verification.
 * 5. Low-confidence intents (< 0.70) are discarded safely without redirect.
 */

import { z } from "zod";
import { APP_ROUTES, AppRoute } from "@/lib/constants/routes";

export const AI_INTENT_REGISTRY = {
  CONNECT_CALENDAR: APP_ROUTES.settingsBooking,
  SETUP_AI: APP_ROUTES.settingsAi,
  MANAGE_BILLING: APP_ROUTES.billing,
  VIEW_KNOWLEDGE: APP_ROUTES.kb,
  VIEW_APPOINTMENTS: APP_ROUTES.appointments,
  VIEW_CONTACTS: APP_ROUTES.contacts,
  VIEW_INBOX: APP_ROUTES.inbox,
  VIEW_SETTINGS: APP_ROUTES.settings,
  VIEW_ANALYTICS: APP_ROUTES.analytics,
  VIEW_VOICE: APP_ROUTES.voice,
  VIEW_DASHBOARD: APP_ROUTES.dashboard,
  VIEW_CHANNELS: APP_ROUTES.channels,
  VIEW_ESCALATIONS: APP_ROUTES.escalations,
  VIEW_STAFF: APP_ROUTES.staff,
  VIEW_SERVICES: APP_ROUTES.services,
} as const;

export type ControlledIntent = keyof typeof AI_INTENT_REGISTRY;

export const AiIntentSchema = z.object({
  intent: z.enum([
    "CONNECT_CALENDAR",
    "SETUP_AI",
    "MANAGE_BILLING",
    "VIEW_KNOWLEDGE",
    "VIEW_APPOINTMENTS",
    "VIEW_CONTACTS",
    "VIEW_INBOX",
    "VIEW_SETTINGS",
    "VIEW_ANALYTICS",
    "VIEW_VOICE",
    "VIEW_DASHBOARD",
    "VIEW_CHANNELS",
    "VIEW_ESCALATIONS",
    "VIEW_STAFF",
    "VIEW_SERVICES",
    "UNKNOWN",
  ]),
  confidence: z.number().min(0).max(1),
  entities: z.record(z.string(), z.any()).optional(),
});

export type AiIntentResult = z.infer<typeof AiIntentSchema>;

export interface ResolveIntentOptions {
  userRole?: string;
  userPermissions?: string[];
  minimumConfidence?: number;
}

export interface IntentResolution {
  shouldRedirect: boolean;
  destination: string | null;
  intent: string;
  confidence: number;
  reason: "INTENT_RESOLVED" | "LOW_CONFIDENCE" | "UNKNOWN_INTENT" | "PERMISSION_DENIED" | "INVALID_SCHEMA";
}

export class AiIntentRouter {
  private static readonly DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

  /**
   * Resolves raw AI output or intent payload into a validated destination.
   */
  static resolveIntent(
    rawOutput: unknown,
    options: ResolveIntentOptions = {}
  ): IntentResolution {
    const minConfidence = options.minimumConfidence ?? this.DEFAULT_CONFIDENCE_THRESHOLD;

    // 1. Zod Schema Validation
    const parsed = AiIntentSchema.safeParse(rawOutput);
    if (!parsed.success) {
      return {
        shouldRedirect: false,
        destination: null,
        intent: "INVALID",
        confidence: 0,
        reason: "INVALID_SCHEMA",
      };
    }

    const { intent, confidence } = parsed.data;

    // 2. Reject UNKNOWN intents
    if (intent === "UNKNOWN" || !(intent in AI_INTENT_REGISTRY)) {
      return {
        shouldRedirect: false,
        destination: null,
        intent,
        confidence,
        reason: "UNKNOWN_INTENT",
      };
    }

    // 3. Enforce Confidence Threshold
    if (confidence < minConfidence) {
      return {
        shouldRedirect: false,
        destination: null,
        intent,
        confidence,
        reason: "LOW_CONFIDENCE",
      };
    }

    // 4. Enforce Permission Check
    const destination = AI_INTENT_REGISTRY[intent as ControlledIntent];
    const userRole = options.userRole || "staff";

    // Manage billing requires manager/admin/owner
    if (intent === "MANAGE_BILLING" && userRole === "staff") {
      return {
        shouldRedirect: false,
        destination: null,
        intent,
        confidence,
        reason: "PERMISSION_DENIED",
      };
    }

    return {
      shouldRedirect: true,
      destination,
      intent,
      confidence,
      reason: "INTENT_RESOLVED",
    };
  }

  /**
   * Deterministic Natural Language Fallback Pattern Matcher (when LLM is offline)
   */
  static matchNaturalLanguage(query: string): AiIntentResult {
    const lower = query.toLowerCase().trim();

    if (/connect.*(calendar|google.*calendar|outlook)|sync.*calendar|schedule.*integration/i.test(lower)) {
      return { intent: "CONNECT_CALENDAR", confidence: 0.95 };
    }
    if (/setup.*(ai|receptionist|bot|prompt)|configure.*agent/i.test(lower)) {
      return { intent: "SETUP_AI", confidence: 0.92 };
    }
    if (/manage.*(billing|subscription|plan|card|payment)|upgrade.*account/i.test(lower)) {
      return { intent: "MANAGE_BILLING", confidence: 0.94 };
    }
    if (/view.*(knowledge|docs|documents|kb|faqs)|website.*import/i.test(lower)) {
      return { intent: "VIEW_KNOWLEDGE", confidence: 0.91 };
    }
    if (/view.*(appointments|bookings|calendar)|my.*schedule/i.test(lower)) {
      return { intent: "VIEW_APPOINTMENTS", confidence: 0.93 };
    }
    if (/view.*(contacts|customers|leads|crm)/i.test(lower)) {
      return { intent: "VIEW_CONTACTS", confidence: 0.9 };
    }
    if (/view.*(inbox|messages|chats|conversations)/i.test(lower)) {
      return { intent: "VIEW_INBOX", confidence: 0.9 };
    }
    if (/view.*(analytics|metrics|reports|stats)/i.test(lower)) {
      return { intent: "VIEW_ANALYTICS", confidence: 0.92 };
    }
    if (/view.*(voice|phone|calls|calling)/i.test(lower)) {
      return { intent: "VIEW_VOICE", confidence: 0.92 };
    }
    if (/view.*(channels|whatsapp|sms|email)/i.test(lower)) {
      return { intent: "VIEW_CHANNELS", confidence: 0.91 };
    }
    if (/view.*(settings|profile|preferences)/i.test(lower)) {
      return { intent: "VIEW_SETTINGS", confidence: 0.88 };
    }
    if (/view.*(dashboard|home|overview)/i.test(lower)) {
      return { intent: "VIEW_DASHBOARD", confidence: 0.95 };
    }

    return { intent: "UNKNOWN", confidence: 0.2 };
  }
}
