import { BusinessCapabilities, BusinessContext } from "./business-context";

export type ActionId =
  | "BOOK_APPOINTMENT"
  | "BOOK_SERVICE"
  | "CHECK_AVAILABILITY"
  | "VIEW_SERVICES"
  | "VIEW_PRICING"
  | "VIEW_BUSINESS_HOURS"
  | "VIEW_LOCATION"
  | "CONTACT_BUSINESS"
  | "SPEAK_WITH_HUMAN"
  | "RESCHEDULE_APPOINTMENT"
  | "CANCEL_APPOINTMENT";

export interface DynamicAction {
  id: ActionId;
  label: string;
  type: "view" | "message" | "booking" | "escalate";
  payload?: any;
  accent?: boolean;
}

export interface ActionContext {
  intent: string;
  activeEntity?: {
    type: "service" | "date" | "time" | "appointment";
    id?: string;
    name?: string;
    price?: string;
  } | null;
  hasActiveAppointment?: boolean;
  isEscalated?: boolean;
  turnCount?: number;
  lastUserMessage?: string;
}

export const actionRegistry: Record<
  ActionId,
  {
    label: string;
    type: "view" | "message" | "booking" | "escalate";
    isEligible: (capabilities: BusinessCapabilities, ctx: ActionContext) => boolean;
  }
> = {
  BOOK_APPOINTMENT: {
    label: "Book Appointment",
    type: "booking",
    isEligible: (caps) => caps.hasBooking,
  },
  BOOK_SERVICE: {
    label: "Book this service",
    type: "booking",
    isEligible: (caps, ctx) => caps.hasBooking && Boolean(ctx.activeEntity?.name),
  },
  CHECK_AVAILABILITY: {
    label: "Check Availability",
    type: "message",
    isEligible: (caps) => caps.hasBooking,
  },
  VIEW_SERVICES: {
    label: "Explore Services",
    type: "view",
    isEligible: (caps) => caps.hasServices,
  },
  VIEW_PRICING: {
    label: "View Pricing",
    type: "message",
    isEligible: (caps) => caps.hasPricing,
  },
  VIEW_BUSINESS_HOURS: {
    label: "Opening Hours",
    type: "message",
    isEligible: (caps) => caps.hasBusinessHours,
  },
  VIEW_LOCATION: {
    label: "Location & Directions",
    type: "message",
    isEligible: (caps) => caps.hasLocation,
  },
  CONTACT_BUSINESS: {
    label: "Call or Contact Us",
    type: "message",
    isEligible: (caps) => caps.hasPhone,
  },
  SPEAK_WITH_HUMAN: {
    label: "Speak with Staff",
    type: "escalate",
    isEligible: () => true, // Escalation is always available as safety net
  },
  RESCHEDULE_APPOINTMENT: {
    label: "Reschedule Appointment",
    type: "message",
    isEligible: (caps, ctx) => caps.hasBooking && Boolean(ctx.hasActiveAppointment),
  },
  CANCEL_APPOINTMENT: {
    label: "Cancel Appointment",
    type: "message",
    isEligible: (_caps, ctx) => Boolean(ctx.hasActiveAppointment),
  },
};

export const actionEngine = {
  /**
   * Evaluates the current conversation turn and business capabilities
   * to determine the top 2-3 most relevant, actionable, non-broken next best actions.
   */
  determineNextBestActions(
    business: BusinessContext,
    ctx: ActionContext
  ): DynamicAction[] {
    const caps = business.capabilities;
    const actions: DynamicAction[] = [];
    const lowerMsg = (ctx.lastUserMessage || "").toLowerCase();

    // 1. If conversation is escalated or customer is in emergency, offer direct human actions only
    if (ctx.isEscalated || ctx.intent === "emergency" || ctx.intent === "human_request") {
      if (caps.hasPhone) {
        actions.push({
          id: "CONTACT_BUSINESS",
          label: `Call ${business.phone || "Office"}`,
          type: "message",
          payload: { text: "What is your phone number?" },
          accent: true,
        });
      }
      return actions;
    }

    // 2. If user said goodbye, thanks, or ended conversation, do not push booking actions
    if (/^(bye|goodbye|thank\s*you|thanks|have\s*a\s*great\s*day|see\s*you)\b/i.test(lowerMsg)) {
      if (caps.hasLocation) {
        actions.push({
          id: "VIEW_LOCATION",
          label: "View Location",
          type: "message",
          payload: { text: "Where are you located?" },
        });
      }
      return actions.slice(0, 2);
    }

    // 3. User is discussing an existing appointment (reschedule, cancel)
    if (ctx.intent === "reschedule" || ctx.intent === "cancel") {
      if (ctx.hasActiveAppointment) {
        actions.push({
          id: "RESCHEDULE_APPOINTMENT",
          label: "Choose Another Time",
          type: "message",
          payload: { text: "What other days are available?" },
          accent: true,
        });
        actions.push({
          id: "CANCEL_APPOINTMENT",
          label: "Cancel Appointment",
          type: "message",
          payload: { text: "Cancel my appointment" },
        });
        return actions;
      }
    }

    // 4. User is asking about a specific service or service details
    if ((ctx.intent === "service_details" || ctx.intent === "services") && ctx.activeEntity?.name) {
      if (caps.hasBooking) {
        actions.push({
          id: "BOOK_SERVICE",
          label: `Book ${ctx.activeEntity.name}`,
          type: "booking",
          payload: { serviceId: ctx.activeEntity.id, serviceName: ctx.activeEntity.name },
          accent: true,
        });
      }
      if (caps.hasPricing) {
        actions.push({
          id: "VIEW_PRICING",
          label: `Pricing for ${ctx.activeEntity.name}`,
          type: "message",
          payload: { text: `How much is ${ctx.activeEntity.name}?` },
        });
      }
      if (actions.length < 3 && caps.hasServices) {
        actions.push({
          id: "VIEW_SERVICES",
          label: "All Services",
          type: "view",
        });
      }
      return actions.slice(0, 3);
    }

    // 5. User asked about pricing
    if (ctx.intent === "pricing") {
      if (caps.hasBooking) {
        actions.push({
          id: "BOOK_APPOINTMENT",
          label: "Book Appointment",
          type: "booking",
          accent: true,
        });
      }
      if (caps.hasServices) {
        actions.push({
          id: "VIEW_SERVICES",
          label: "Explore Services",
          type: "view",
        });
      }
      if (caps.hasBusinessHours) {
        actions.push({
          id: "VIEW_BUSINESS_HOURS",
          label: "Opening Hours",
          type: "message",
          payload: { text: "What are your business hours?" },
        });
      }
      return actions.slice(0, 3);
    }

    // 6. User asked about business hours
    if (ctx.intent === "hours") {
      if (caps.hasBooking) {
        actions.push({
          id: "BOOK_APPOINTMENT",
          label: "Book an Appointment",
          type: "booking",
          accent: true,
        });
      }
      if (caps.hasLocation) {
        actions.push({
          id: "VIEW_LOCATION",
          label: "Get Directions",
          type: "message",
          payload: { text: "Where are you located?" },
        });
      }
      return actions.slice(0, 3);
    }

    // 7. User asked about location
    if (ctx.intent === "location") {
      if (caps.hasBusinessHours) {
        actions.push({
          id: "VIEW_BUSINESS_HOURS",
          label: "Business Hours",
          type: "message",
          payload: { text: "What are your business hours?" },
        });
      }
      if (caps.hasBooking) {
        actions.push({
          id: "BOOK_APPOINTMENT",
          label: "Book a Visit",
          type: "booking",
          accent: true,
        });
      }
      return actions.slice(0, 3);
    }

    // 8. General inquiry / Business Info / Greeting:
    // Only present actions that are guaranteed to have real data backing them!
    if (caps.hasServices) {
      actions.push({
        id: "VIEW_SERVICES",
        label: "Explore Services",
        type: "view",
        accent: true,
      });
    }
    if (caps.hasPricing) {
      actions.push({
        id: "VIEW_PRICING",
        label: "View Pricing",
        type: "message",
        payload: { text: "What are your prices?" },
      });
    }
    if (caps.hasBooking && actions.length < 3) {
      actions.push({
        id: "BOOK_APPOINTMENT",
        label: "Book Appointment",
        type: "booking",
      });
    } else if (caps.hasBusinessHours && actions.length < 3) {
      actions.push({
        id: "VIEW_BUSINESS_HOURS",
        label: "Operating Hours",
        type: "message",
        payload: { text: "What are your operating hours?" },
      });
    }

    // Final safety clamp: never return more than 3 actions
    return actions.slice(0, 3);
  },
};
