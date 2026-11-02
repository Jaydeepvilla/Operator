/**
 * WhatsApp Trigger & Intent Recognition Engine
 * Implements Section 8 Priority Intent Resolution for Operator AI
 *
 * Priority Tiers:
 * Tier 1: Emergency, Opt-Out, Privacy (Highest Priority — Safety & Compliance)
 * Tier 2: Complaints, Refunds, Human Handover, Bot Check
 * Tier 3: Booking Lifecycle (Cancel, Reschedule, Running Late, Arrived, Status)
 * Tier 4: Booking Intent (Book Now, Urgent/Today, Specific Time, Same as Last, Group)
 * Tier 5: Business Information (Price, Services, Hours, Address, Parking, Contact, Policies, Offers, Staff)
 * Tier 6: Conversational Polish (Greetings, Thanks, Goodbye, Main Menu)
 * Tier 7: Media & Attachments (Audio, Images, Documents, Location Pins)
 * Tier 8: Knowledge Gap & Out of Scope (Fallback)
 */

import {
  WhatsAppFreeReply,
  WhatsAppMetaTemplate,
  WhatsAppReplyPayload,
  WhatsAppTriggerMatch,
  WhatsAppVariableContext,
  WhatsAppIntentKey,
} from "./types";
import {
  FREE_REPLIES,
  APPROVED_META_TEMPLATES,
  HINDI_HINGLISH_VARIANTS,
  isInside24HourWindow,
  substituteVariables,
  getWhatsAppReply,
} from "./message-library";

interface IntentRule {
  intent: WhatsAppIntentKey;
  priority: number; // 1 to 8 (1 is highest)
  patterns: RegExp[];
  requiresHumanHandover?: boolean;
}

export const INTENT_RULES: IntentRule[] = [
  // ── Tier 1: Emergency, Opt-Out, Privacy ──────────────────────────────
  {
    intent: "emergency",
    priority: 1,
    patterns: [
      /\b(emergency|ambulance|bleeding|severe pain|accident|heart attack|poison|police|fire)\b/i,
      /\b(urgent help|life threatening|hospital|icu)\b/i,
      /\b(emergency hai|bahut dard|khoon|police bulao|aspataal)\b/i,
    ],
    requiresHumanHandover: true,
  },
  {
    intent: "opt_out_stop",
    priority: 1,
    patterns: [
      /\b(stop|unsubscribe|optout|opt out|cancel messages|block|stop sending)\b/i,
      /\b(stop messages|band karo|messages mat bhejo|rok do)\b/i,
    ],
  },
  {
    intent: "privacy_delete_data",
    priority: 1,
    patterns: [
      /\b(delete my data|erase my details|gdpr|privacy request|remove my number)\b/i,
      /\b(mera data delete karo|number hatao)\b/i,
    ],
    requiresHumanHandover: true,
  },

  // ── Tier 2: Complaints, Refunds, Handover, Bot Check ──────────────────
  {
    intent: "complaint",
    priority: 2,
    patterns: [
      /\b(complaint|terrible|horrible|worst service|angry|unacceptable|fraud|cheated|ruined|bad experience)\b/i,
      /\b(shikayat|bahut bura|kharab service|paise duba diye)\b/i,
    ],
    requiresHumanHandover: true,
  },
  {
    intent: "refund_request",
    priority: 2,
    patterns: [
      /\b(refund|money back|charge back|return money|dispute charge)\b/i,
      /\b(paise wapas|paise lautao|refund chahiye)\b/i,
    ],
    requiresHumanHandover: true,
  },
  {
    intent: "handover_open",
    priority: 2,
    patterns: [
      /\b(talk to (a )?person|speak to human|real person|agent|executive|manager|call me|human support|talk to desk|front desk|alert reception|👤 talk)\b/i,
      /\b(kisi se baat karao|insan se baat|call karo mujhe|manager bulao)\b/i,
    ],
    requiresHumanHandover: true,
  },
  {
    intent: "main_menu",
    priority: 2,
    patterns: [
      /^(menu|options|help|what can you do|\?|1|0|back|home|start|main menu)$/i,
      /\b(main menu|back to menu|go back|options dikhao|madad|wapas|piche|🔙 main menu|📌 main menu)\b/i,
      /\b(menu dikhao|menu chahiye|start menu)\b/i,
    ],
  },
  {
    intent: "bot_identity",
    priority: 2,
    patterns: [
      /\b(are you (a )?bot|are you ai|are you real|are you human|robot)\b/i,
      /\b(kya aap robot ho|kya aap bot ho|ai ho kya)\b/i,
    ],
  },

  // ── Tier 3: Booking Lifecycle ─────────────────────────────────────────
  {
    intent: "booking_cancel",
    priority: 3,
    patterns: [
      /\b(cancel( my)? booking|cancel appointment|cannot make it|can't come|won't be able to come)\b/i,
      /\b(booking cancel|appointment radd|nahi aa paunga|cancel kardo)\b/i,
    ],
  },
  {
    intent: "booking_reschedule",
    priority: 3,
    patterns: [
      /\b(reschedule|change (my )?(date|time|appointment|slot)|postpone|prepone|move appointment)\b/i,
      /\b(date badalna|time change|slot change|dusre din)\b/i,
    ],
  },
  {
    intent: "booking_running_late",
    priority: 3,
    patterns: [
      /\b(running late|delayed|traffic|stuck|10 mins late|15 mins late|a few minutes late)\b/i,
      /\b(late ho jaunga|traffic me fasa|der ho jayegi|thoda late)\b/i,
    ],
  },
  {
    intent: "booking_arrived",
    priority: 3,
    patterns: [
      /\b(reached|i am outside|outside|at the door|at reception|i'm here|here now)\b/i,
      /\b(pahunch gaya|bahar khada hu|reception pe hu|aa gaya)\b/i,
    ],
  },
  {
    intent: "booking_my_appointment",
    priority: 3,
    patterns: [
      /\b(my booking|my appointment|check appointment|when is my slot|confirm my time)\b/i,
      /\b(meri booking|mera appointment|kab hai mera slot|appointment status)\b/i,
    ],
  },

  // ── Tier 4: Booking Intent ───────────────────────────────────────────
  {
    intent: "booking_urgent_today",
    priority: 4,
    patterns: [
      /\b(available today|urgent appointment|today slot|walk in today|slot right now)\b/i,
      /\b(aaj ka slot|aaj mil sakta hai|urgent hai aaj|aaj time hai)\b/i,
    ],
  },
  {
    intent: "booking_specific_time",
    priority: 4,
    patterns: [
      /\b(tomorrow (morning|evening|afternoon)|at (1[0-2]|[1-9])(am|pm)?|weekend slot|sunday slot)\b/i,
      /\b(kal subah|kal sham|shaam ko|baje mil sakta)\b/i,
    ],
  },
  {
    intent: "booking_same_as_last",
    priority: 4,
    patterns: [
      /\b(same as last time|usual service|regular cut|same haircut|same doctor)\b/i,
      /\b(jo pichli baar kiya tha|wahi service|pehle jaisa)\b/i,
    ],
  },
  {
    intent: "booking_group_event",
    priority: 4,
    patterns: [
      /\b(bridal|group booking|party booking|for 2 people|for 3 people|for my family|multiple people)\b/i,
      /\b(shaadi ka package|group ke liye|2 log|3 log|parivar ke sath)\b/i,
    ],
  },
  {
    intent: "booking_waitlist",
    priority: 4,
    patterns: [
      /\b(waitlist|waiting list|if someone cancels|notify me|cancellation list)\b/i,
      /\b(agar koi cancel kare to batana|waitlist me daalo)\b/i,
    ],
  },
  {
    intent: "booking_start",
    priority: 4,
    patterns: [
      /\b(book( an)? appointment|book a slot|schedule|reserve|booking karni|appointment chahiye|book this|book slot|📅 book|book new slot|book guaranteed slot)\b/i,
      /\b(book|booking|appointment|slot chahiye)\b/i,
    ],
  },

  // ── Tier 5: Business Information ─────────────────────────────────────
  {
    intent: "service_price",
    priority: 5,
    patterns: [
      /\b(price|prices|pricing|cost|costs|rate|rates|fee|fees|charges|charge|how much (for|is)?)\b/i,
      /\b(kitna kharcha|kitne paise|kitna charge|rates kya hai)\b/i,
    ],
  },
  {
    intent: "services_list",
    priority: 5,
    patterns: [
      /\b(services|treatments|service menu|treatment menu|rate card|catalog|what services|what do you do|what do you offer|services & rates|all services|other services|view services|📋 services|💼 services)\b/i,
      /\b(kya kya services|service list|list bhejo)\b/i,
    ],
  },
  {
    intent: "opening_hours",
    priority: 5,
    patterns: [
      /\b(opening hours|working hours|business hours|timings|timing|hours|open today|closing time|what time do you open|are you open|🕒 working hours)\b/i,
      /\b(kab (tak )?khula|timing|kitne baje khulta|aaj open|aaj khula)\b/i,
    ],
  },
  {
    intent: "location",
    priority: 5,
    patterns: [
      /\b(address|location|where are you( located)?|where is your (office|shop|clinic|salon|desk|branch)|directions|google map|how to reach|view map|📍 location|📍 view map|📍 directions)\b/i,
      /\b(kaha par hai|address batao|location send karo|rasta batao)\b/i,
    ],
  },
  {
    intent: "parking_info",
    priority: 5,
    patterns: [
      /\b(parking|where to park|car park|valet parking|park car)\b/i,
      /\b(parking hai kya|gadi khadi karne ki jagah)\b/i,
    ],
  },
  {
    intent: "contact_info",
    priority: 5,
    patterns: [
      /\b(phone number|contact number|call you|telephone|email address)\b/i,
      /\b(phone no|contact number kya hai|call karne ka number)\b/i,
    ],
  },
  {
    intent: "payment_methods",
    priority: 5,
    patterns: [
      /\b(payment methods|how can i pay|upi accepted|accept card|gpay|paytm|cash)\b/i,
      /\b(kaise pay kare|gpay chalega|online payment|cash lete ho)\b/i,
    ],
  },
  {
    intent: "policy_cancellation",
    priority: 5,
    patterns: [
      /\b(cancellation policy|cancel policy|cancellation charge|cancellation fee)\b/i,
      /\b(cancel karne ke paise|cancellation rules)\b/i,
    ],
  },
  {
    intent: "offers_packages",
    priority: 5,
    patterns: [
      /\b(offers|discount|coupons|promo code|package deals|any deal|special offer|offers & plans|🎁 offers|🎁 special offers)\b/i,
      /\b(koi offer hai|discount milega|koi coupon)\b/i,
    ],
  },
  {
    intent: "staff_info",
    priority: 5,
    patterns: [
      /\b(doctor|staff|stylist|specialist|therapist|who will attend|dr|barber)\b/i,
      /\b(kaun doctor hai|doctor saab|stylist kaun hai)\b/i,
    ],
  },

  // ── Tier 6: Conversational Polish ─────────────────────────────────────
  {
    intent: "greeting_new",
    priority: 6,
    patterns: [
      /^(hi|hello|hey|hola|namaste|good (morning|afternoon|evening)|hlo|helo)$/i,
      /\b(namaskar|pranam|hello ji)\b/i,
    ],
  },
  {
    intent: "thanks_ok",
    priority: 6,
    patterns: [
      /^(thanks|thank you|thx|ok|okay|got it|cool|great|perfect|sure)$/i,
      /\b(dhanyawad|shukriya|theek hai|sahi hai|bohot achha)\b/i,
    ],
  },
  {
    intent: "goodbye",
    priority: 6,
    patterns: [
      /^(bye|goodbye|see you|good night|cya|take care)$/i,
      /\b(alvida|phir milenge|bye bye)\b/i,
    ],
  },
];

/**
 * Recognizes intents from an incoming WhatsApp message payload and matches them against priority tiers.
 */
export function matchWhatsAppIntent(
  messageText: string,
  mediaType?: "audio" | "image" | "document" | "location",
  isReturningCustomer?: boolean
): WhatsAppTriggerMatch {
  const clean = (messageText || "").trim();

  // Tier 7 Media attachment matching
  if (mediaType === "audio") {
    return {
      intent: "voice_note_received",
      confidence: 1.0,
      priority: 7,
      isCompound: false,
    };
  }

  if (mediaType === "image" || mediaType === "document") {
    return {
      intent: "media_received",
      confidence: 1.0,
      priority: 7,
      isCompound: false,
    };
  }

  // Scan rules in priority order (1 to 6)
  const matches: Array<{ rule: IntentRule; matchText: string }> = [];

  for (const rule of INTENT_RULES) {
    for (const pat of rule.patterns) {
      if (pat.test(clean)) {
        matches.push({ rule, matchText: clean });
        break;
      }
    }
  }

  if (matches.length > 0) {
    // Sort by priority ascending (1 is highest priority)
    matches.sort((a, b) => a.rule.priority - b.rule.priority);
    const topMatch = matches[0];

    // Check for returning greeting override
    if (topMatch.rule.intent === "greeting_new" && isReturningCustomer) {
      return {
        intent: "greeting_returning",
        confidence: 0.95,
        priority: 6,
        isCompound: matches.length > 1,
        compoundIntents: matches.slice(1).map((m) => m.rule.intent),
      };
    }

    return {
      intent: topMatch.rule.intent,
      confidence: 0.95,
      priority: topMatch.rule.priority,
      isCompound: matches.length > 1,
      compoundIntents: matches.slice(1).map((m) => m.rule.intent),
    };
  }

  // Tier 8: Knowledge gap / Fallback
  return {
    intent: "knowledge_gap",
    confidence: 0.5,
    priority: 8,
    isCompound: false,
  };
}

/**
 * Resolves the final WhatsApp reply by checking 24h Meta compliance and injecting context facts.
 */
export function resolveWhatsAppResponse(
  messageText: string,
  context: WhatsAppVariableContext,
  lastCustomerMessageAt?: Date | string | null,
  mediaType?: "audio" | "image" | "document" | "location"
): {
  reply: WhatsAppReplyPayload;
  matchedIntent: WhatsAppIntentKey;
  is24HourCompliant: boolean;
  requiresHandover: boolean;
} {
  const isInside = isInside24HourWindow(lastCustomerMessageAt);
  const hasSavedHistory = Boolean(context.last_service && context.last_service.trim() !== "");
  const match = matchWhatsAppIntent(
    messageText,
    mediaType,
    hasSavedHistory
  );

  const rule = INTENT_RULES.find((r) => r.intent === match.intent);
  const requiresHandover = rule?.requiresHumanHandover ?? false;

  // If outside 24h window, fallback to Meta approved utility template
  if (!isInside) {
    const template = APPROVED_META_TEMPLATES.find((t) => t.category === "UTILITY") || APPROVED_META_TEMPLATES[0];
    const populated = substituteVariables(template.body, context);

    return {
      reply: {
        type: "template",
        body: populated.text,
        buttons: (template.quickReplies || []).map((label: string) => ({
          id: label.toLowerCase().replace(/\s+/g, "_"),
          title: label.slice(0, 20),
        })),
      },
      matchedIntent: match.intent,
      is24HourCompliant: false,
      requiresHandover,
    };
  }

  // Inside 24 hours: Free interactive reply with factual substitution
  const reply = getWhatsAppReply(match.intent, context);

  return {
    reply,
    matchedIntent: match.intent,
    is24HourCompliant: true,
    requiresHandover,
  };
}
