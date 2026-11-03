import { BusinessContext } from "../business-context";
import { WhatsAppReplyPayload } from "./types";

export interface CustomerPersonalizationContext {
  customerName?: string;
  isReturning: boolean;
  activeAppointment?: {
    id: string;
    serviceName: string;
    startTime: Date;
    formattedDate: string;
    formattedTime: string;
  } | null;
  language?: "en" | "hi" | "gu" | "hinglish";
}

/**
 * Detect language from text (English, Hindi, Gujarati, Hinglish)
 */
export function detectLanguage(text: string): "en" | "hi" | "gu" | "hinglish" {
  if (!text) return "en";

  // Gujarati Unicode range \u0A80-\u0AFF
  if (/[\u0A80-\u0AFF]/.test(text) || /\b(kem cho|majama|tamne|aabhar|shu chhe|booking karvu|bhav shu)\b/i.test(text)) {
    return "gu";
  }

  // Devanagari Unicode range \u0900-\u097F
  if (/[\u0900-\u097F]/.test(text)) {
    return "hi";
  }

  // Hinglish heuristics
  if (/\b(kya|kaise|chahiye|karni|batao|karo|kitna|paise|kharcha|shukriya|namaste|dhanyawad)\b/i.test(text)) {
    return "hinglish";
  }

  return "en";
}

export const dynamicExperienceEngine = {
  /**
   * Generates a context-aware greeting strictly tailored to business capabilities and customer status
   */
  generateGreeting(
    business: BusinessContext,
    customer: CustomerPersonalizationContext
  ): WhatsAppReplyPayload {
    const caps = business.capabilities;
    const bizName = business.name || "Reception Desk";
    const name = customer.customerName ? customer.customerName : "";
    const lang = customer.language || "en";

    // 1. Returning customer with an upcoming appointment
    if (customer.activeAppointment) {
      const apt = customer.activeAppointment;
      let body = "";

      if (lang === "gu") {
        body = `${name ? `નમસ્તે ${name}! ` : "નમસ્તે! "}તમારી ${bizName} માં *${apt.serviceName}* ની એપોઇન્ટમેન્ટ *${apt.formattedDate}* ના રોજ *${apt.formattedTime}* વાગ્યે નિર્ધારિત છે.\n\nઆજે અમે તમને કેવી રીતે મદદ કરી શકીએ?`;
      } else if (lang === "hi") {
        body = `${name ? `नमस्ते ${name}! ` : "नमस्ते! "}आपकी ${bizName} में *${apt.serviceName}* की अपॉइंटमेंट *${apt.formattedDate}* को *${apt.formattedTime}* बजे शेड्यूल्ड है।\n\nहम आपकी क्या मदद कर सकते हैं?`;
      } else if (lang === "hinglish") {
        body = `Welcome back${name ? `, ${name}` : ""}! 😊 Aapki ${bizName} mein *${apt.serviceName}* ki booking *${apt.formattedDate}* ko *${apt.formattedTime}* baje confirm hai.\n\nAap kya karna chahenge?`;
      } else {
        body = `Welcome back${name ? `, ${name}` : ""}! 👋 You have an upcoming appointment for *${apt.serviceName}* on *${apt.formattedDate}* at *${apt.formattedTime}* at ${bizName}.\n\nHow can we help you today?`;
      }

      return {
        type: "interactive_buttons",
        header: bizName.slice(0, 60),
        body,
        footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
        buttons: [
          { id: `act_view_apt:${apt.id}`, title: "📅 View Details" },
          { id: `act_reschedule_start:${apt.id}`, title: "🔄 Reschedule" },
          { id: "act_main_menu", title: "📌 Other Options" },
        ],
      };
    }

    // 2. Returning or New customer without active appointment
    let greetingText = "";
    if (lang === "gu") {
      greetingText = customer.isReturning
        ? `${name ? `સ્વાગત છે, ${name}! ` : "સ્વાગત છે! "}${bizName} માં ફરીથી આપનું સ્વાગત છે. આજે અમે તમારી શું મદદ કરી શકીએ?`
        : `${name ? `નમસ્તે ${name}! ` : "નમસ્તે! "}${bizName} માં આપનું હાર્દિક સ્વાગત છે. અમે તમને કેવી રીતે મદદ કરી શકીએ?`;
    } else if (lang === "hi") {
      greetingText = customer.isReturning
        ? `${name ? `स्वागत है, ${name}! ` : "स्वागत है! "}${bizName} में दोबारा आपका स्वागत है। आज हम आपकी क्या मदद कर सकते हैं?`
        : `${name ? `नमस्ते ${name}! ` : "नमस्ते! "}${bizName} में आपका स्वागत है। हम आपकी क्या मदद कर सकते हैं?`;
    } else if (lang === "hinglish") {
      greetingText = customer.isReturning
        ? `Welcome back${name ? `, ${name}` : ""}! 😊 ${bizName} mein dobara aapka swagat hai. Aaj hum aapki kya help karein?`
        : `Hi${name ? ` ${name}` : ""}! 👋 ${bizName} mein aapka swagat hai. Main aapki kya sahayata kar sakta hoon?`;
    } else {
      greetingText = customer.isReturning
        ? `Welcome back${name ? `, ${name}` : ""}! 😊 It's great to hear from you again at ${bizName}. What can we assist you with today?`
        : `Hello${name ? ` ${name}` : ""}! 👋 Welcome to *${bizName}*. How can we assist you today?`;
    }

    // Contextually assemble buttons based on REAL capabilities
    const buttons = [];
    if (caps.hasBooking) {
      buttons.push({ id: "act_book_start", title: "📅 Book Appointment" });
    }
    if (caps.hasServices || caps.hasPricing) {
      buttons.push({ id: "act_services_list", title: "📋 Services & Rates" });
    }
    buttons.push({ id: "act_main_menu", title: "📌 Main Menu" });

    // Fallback if no services/booking configured
    if (buttons.length === 1 && caps.hasPhone) {
      buttons.unshift({ id: "act_human", title: "👤 Talk to Team" });
    }

    return {
      type: "interactive_buttons",
      header: bizName.slice(0, 60),
      body: greetingText,
      footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
      buttons: buttons.slice(0, 3),
    };
  },

  /**
   * Generates a fully dynamic, capability-filtered Main Menu (WhatsApp Interactive List)
   */
  generateMainMenu(
    business: BusinessContext,
    customer: CustomerPersonalizationContext
  ): WhatsAppReplyPayload {
    const caps = business.capabilities;
    const bizName = business.name || "Reception Desk";
    const rows: Array<{ id: string; title: string; description?: string }> = [];

    // Only add actions that the business actually supports
    if (caps.hasBooking) {
      rows.push({
        id: "act_book_start",
        title: "📅 Book Appointment",
        description: "Select service, date & instant confirmation",
      });
      rows.push({
        id: "act_my_booking",
        title: "🔍 My Bookings",
        description: "View upcoming appointments or reschedule",
      });
    }

    if (caps.hasServices) {
      rows.push({
        id: "act_services_list",
        title: "💼 Explore Services",
        description: "Browse treatments, consultations & packages",
      });
    }

    if (caps.hasPricing) {
      rows.push({
        id: "act_prices",
        title: "💰 Pricing & Rates",
        description: "View transparent pricing and durations",
      });
    }

    if (caps.hasBusinessHours) {
      rows.push({
        id: "act_hours",
        title: "🕒 Opening Hours",
        description: "View operating schedule and today's timings",
      });
    }

    if (caps.hasLocation) {
      rows.push({
        id: "act_location",
        title: "📍 Address & Directions",
        description: "Clinic/Store location and map link",
      });
    }

    // Always offer human front-desk contact as a safety net
    rows.push({
      id: "act_human",
      title: "👤 Talk to Receptionist",
      description: "Connect directly with our front desk team",
    });

    return {
      type: "list",
      header: `${bizName} Menu`.slice(0, 60),
      body: "Please choose an option below to proceed:",
      footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
      listButton: "Choose an option",
      listSections: [
        {
          title: "Available Options",
          rows: rows.slice(0, 10),
        },
      ],
    };
  },
};
