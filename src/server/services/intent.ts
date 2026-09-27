import { llmRegistry } from "./llm";

export type IntentType =
  | "greeting"
  | "business_info"
  | "services"
  | "service_details"
  | "pricing"
  | "hours"
  | "location"
  | "contact"
  | "booking"
  | "reschedule"
  | "cancel"
  | "emergency"
  | "human_request"
  | "faq"
  | "follow_up"
  | "general"
  | "unknown";

export interface ExtractedEntity {
  type: "service" | "date" | "time" | "appointment";
  id?: string;
  name?: string;
  price?: string;
  rawText?: string;
}

export interface IntentResult {
  intent: IntentType;
  confidence: number;
  entity?: ExtractedEntity | null;
  resolvedContextQuery?: string;
}

export interface IntentDetectionContext {
  activeEntity?: ExtractedEntity | null;
  lastIntent?: string;
  availableServices?: Array<{ id: string; name: string; price?: string }>;
  turnCount?: number;
}

export const intentService = {
  detectWithRules(
    message: string,
    context?: IntentDetectionContext
  ): IntentResult | null {
    const raw = message.trim();
    const lowercase = raw.toLowerCase();

    // 0. Safety / Unauthorized Request Refusal (Check first)
    if (
      lowercase.includes("off-menu") ||
      lowercase.includes("prescription") ||
      lowercase.includes("illegal") ||
      lowercase.includes("unauthorized") ||
      lowercase.includes("override")
    ) {
      return { intent: "general", confidence: 0.99 };
    }

    // 1. Human requests (Check first)
    const humanKeywords = [
      "human",
      "speak to a person",
      "speak to a real person",
      "speak to a human",
      "talk to a real person",
      "talk to a real",
      "real person",
      "representative",
      "operator",
      "real agent",
      "talk to a person",
      "support team",
      "customer support",
      "speak with staff",
      "talk to staff",
      "front desk staff",
      "connect me to a person",
      "reach the front desk",
    ];
    if (humanKeywords.some((keyword) => lowercase.includes(keyword))) {
      return { intent: "human_request", confidence: 0.98 };
    }

    // 2. Check for specific Service Match in message
    let matchedService: ExtractedEntity | null = null;
    if (context?.availableServices && context.availableServices.length > 0) {
      for (const s of context.availableServices) {
        const sLower = s.name.toLowerCase();
        if (
          lowercase.includes(sLower) ||
          (sLower.includes("emergency") && lowercase.includes("emergency") && (lowercase.includes("consultation") || lowercase.includes("exam")))
        ) {
          matchedService = {
            type: "service",
            id: s.id,
            name: s.name,
            price: s.price,
            rawText: s.name,
          };
          break;
        }
      }
    }

    // 3. Service inquiries with named service (run before general emergency or booking checks!)
    if (matchedService) {
      // Pricing for matched service
      if (
        lowercase.includes("cost") ||
        lowercase.includes("price") ||
        lowercase.includes("rate") ||
        lowercase.includes("how much")
      ) {
        return {
          intent: "pricing",
          confidence: 0.98,
          entity: matchedService,
        };
      }

      // Details or explanation of matched service
      if (
        lowercase.includes("tell me about") ||
        lowercase.includes("what is") ||
        lowercase.includes("details") ||
        lowercase.includes("explain") ||
        lowercase.includes("like")
      ) {
        return {
          intent: "service_details",
          confidence: 0.97,
          entity: matchedService,
        };
      }
    }

    // 4. Emergency triggers (Check after specific service pricing inquiries)
    if (lowercase.includes("cost") || lowercase.includes("price") || lowercase.includes("how much")) {
      // If user asks how much an emergency visit costs, that is a pricing inquiry!
      const isEmergencyCost = lowercase.includes("emergency") && (lowercase.includes("cost") || lowercase.includes("price") || lowercase.includes("rate"));
      if (isEmergencyCost) {
        return { intent: "pricing", confidence: 0.96, entity: matchedService };
      }
    }

    const emergencyKeywords = [
      "emergency",
      "severe pain",
      "bleeding heavily",
      "broken bone",
      "broken tooth",
      "chest pain",
      "accident",
      "unconscious",
      "urgent care",
      "go to hospital",
      "medical emergency",
    ];
    if (emergencyKeywords.some((keyword) => lowercase.includes(keyword))) {
      return { intent: "emergency", confidence: 0.99 };
    }

    // 5. Reschedule triggers (Must run before booking)
    const rescheduleKeywords = [
      "reschedule",
      "change appointment",
      "change my appointment",
      "move appointment",
      "change my time",
      "change time",
      "change slot",
      "postpone",
      "different time",
      "different slot",
      "can i change it",
      "need to change it",
    ];
    if (rescheduleKeywords.some((keyword) => lowercase.includes(keyword))) {
      return { intent: "reschedule", confidence: 0.95 };
    }

    // 6. Cancel triggers (Must run before booking)
    const cancelKeywords = [
      "cancel my appointment",
      "cancel appointment",
      "cancel booking",
      "cancel it",
      "delete my appointment",
      "delete appointment",
      "delete booking",
      "cancellation",
      "don't need the appointment",
    ];
    if (cancelKeywords.some((keyword) => lowercase.includes(keyword))) {
      return { intent: "cancel", confidence: 0.95 };
    }

    // 7. Follow-up reference resolution (e.g. "how much?", "how much is it?", "can i book it?")
    if (
      context?.activeEntity &&
      /^(how\s+much(\s+is\s+(it|that|this))?|what\s+does\s+(it|that)\s+cost|price\??|cost\??)\b/i.test(
        lowercase
      )
    ) {
      return {
        intent: "pricing",
        confidence: 0.96,
        entity: context.activeEntity,
        resolvedContextQuery: `How much is ${context.activeEntity.name}?`,
      };
    }

    // 8. Business Information (P0: "I want to learn more about your business", "Tell me about your business")
    const businessInfoPatterns = [
      /about\s+(your\s+|the\s+)?business/i,
      /tell\s+me\s+about\s+(your|the)\s+business/i,
      /learn\s+more\s+about\s+(your\s+|the\s+)?business/i,
      /what\s+do\s+you\s+guys\s+do/i,
      /what\s+do\s+you\s+do/i,
      /who\s+are\s+you/i,
      /what\s+is\s+this\s+place/i,
      /what\s+company\s+is\s+this/i,
      /tell\s+me\s+about\s+yourself/i,
      /tell\s+me\s+more\s+about\s+what\s+you\s+do/i,
      /overview\s+of\s+your\s+business/i,
      /describe\s+(your\s+|the\s+)?business/i,
    ];
    if (businessInfoPatterns.some((pattern) => pattern.test(lowercase))) {
      return { intent: "business_info", confidence: 0.96 };
    }

    // 9. Contact queries (Check before location address queries)
    const contactKeywords = [
      "phone number",
      "call you",
      "call your office",
      "telephone",
      "email address",
      "email",
      "how can i contact",
      "how do i contact",
      "how to contact",
      "how to reach",
      "contact details",
    ];
    if (contactKeywords.some((keyword) => lowercase.includes(keyword))) {
      return { intent: "contact", confidence: 0.96 };
    }

    // 10. Location queries
    const locationKeywords = [
      "where are you located",
      "where are you",
      "where is your clinic",
      "where is the office",
      "where is",
      "location",
      "address",
      "directions",
      "how do i get there",
      "office address",
      "clinic address",
      "salon address",
      "street",
      "map",
      "in new york",
    ];
    if (locationKeywords.some((keyword) => lowercase.includes(keyword))) {
      return { intent: "location", confidence: 0.95 };
    }

    // 11. Operating Hours queries
    const hoursKeywords = [
      "hours",
      "open",
      "close",
      "closing time",
      "opening time",
      "open sunday",
      "open saturday",
      "weekend hours",
      "business hours",
      "are you open",
      "what time do you close",
      "when do you open",
    ];
    if (hoursKeywords.some((keyword) => lowercase.includes(keyword))) {
      return { intent: "hours", confidence: 0.95 };
    }

    // 12. Pricing queries
    const pricingKeywords = [
      "price",
      "pricing",
      "cost",
      "rate",
      "rates",
      "how much",
      "fee",
      "fees",
      "charge",
      "expensive",
      "cheap",
      "payment",
    ];
    if (pricingKeywords.some((keyword) => lowercase.includes(keyword))) {
      return {
        intent: "pricing",
        confidence: 0.93,
        entity: matchedService || context?.activeEntity || null,
      };
    }

    // 13. Services overview
    const servicesKeywords = [
      "services",
      "what services",
      "what do you offer",
      "what can you do",
      "what can i get",
      "what can i book",
      "offerings",
      "menu of services",
      "menu",
      "list of services",
      "treatments",
      "catalog",
    ];
    if (servicesKeywords.some((keyword) => lowercase.includes(keyword))) {
      return {
        intent: "services",
        confidence: 0.94,
        entity: matchedService,
      };
    }

    // 14. Booking queries
    const bookingKeywords = [
      "book",
      "appointment",
      "schedule",
      "reserve",
      "booking",
      "slot",
      "make an appointment",
      "book online",
      "book a call",
      "clean my teeth",
      "cleaning session",
      "haircut",
    ];
    if (bookingKeywords.some((keyword) => lowercase.includes(keyword))) {
      return {
        intent: "booking",
        confidence: 0.93,
        entity: matchedService || context?.activeEntity || null,
      };
    }

    // 15. Pure Greeting
    if (/^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening))\b/i.test(lowercase)) {
      return { intent: "greeting", confidence: 0.96 };
    }

    return null;
  },

  async detectIntent(
    message: string,
    context?: IntentDetectionContext
  ): Promise<IntentResult> {
    // 1. Fast deterministic rule-based matching
    const ruleMatch = this.detectWithRules(message, context);
    if (ruleMatch) {
      return ruleMatch;
    }

    // 2. LLM classifier fallback if available
    try {
      const provider = llmRegistry.getProvider();
      const prompt = `Classify the intent of the following user message into exactly one of:
"greeting", "business_info", "services", "service_details", "pricing", "hours", "location", "contact", "booking", "reschedule", "cancel", "emergency", "human_request", "faq", or "general".

Context:
- Currently active entity: ${context?.activeEntity ? context.activeEntity.name : "none"}
- Previous intent: ${context?.lastIntent || "none"}

User Message: "${message}"

Return a JSON object only in the format:
{ "intent": "...", "confidence": 0.xx, "entityName": null }`;

      const result = await provider.generateCompletion(
        [
          {
            role: "system",
            content: "You are an intent classification assistant. Respond only in valid JSON format.",
          },
          { role: "user", content: prompt },
        ],
        { temperature: 0.1, jsonMode: true }
      );

      const content = result.content.trim();
      if (content.startsWith("{") && content.endsWith("}")) {
        const parsed = JSON.parse(content);
        const validIntents: IntentType[] = [
          "greeting",
          "business_info",
          "services",
          "service_details",
          "pricing",
          "hours",
          "location",
          "contact",
          "booking",
          "reschedule",
          "cancel",
          "emergency",
          "human_request",
          "faq",
          "follow_up",
          "general",
          "unknown",
        ];

        if (parsed.intent && validIntents.includes(parsed.intent)) {
          let entity: ExtractedEntity | null = null;
          if (parsed.entityName) {
            entity = {
              type: "service",
              name: parsed.entityName,
            };
          }
          return {
            intent: parsed.intent as IntentType,
            confidence: parsed.confidence ?? 0.82,
            entity: entity || context?.activeEntity || null,
          };
        }
      }
    } catch {}

    // 3. Fallback
    return {
      intent: "general",
      confidence: 0.6,
      entity: context?.activeEntity || null,
    };
  },
};
