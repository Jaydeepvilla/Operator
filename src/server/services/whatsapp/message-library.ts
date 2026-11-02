/**
 * WhatsApp Message Library for Operator
 * Authoritative Implementation of 31 Oct 2026 specification by @Jaydeep
 * Covers:
 *  - Section 2: Basics (Free replies inside 24h)
 *  - Section 3: Business Information
 *  - Section 4: Booking
 *  - Section 5: Care and Special Cases
 *  - Section 6: Meta-Approved Outbound Templates (Utility & Marketing)
 *  - Section 7: Industry Add-ons (Salon, Clinic, Spa, Gym, Vet, Auto, Tutor, Photo)
 *  - Section 9: Hindi & Hinglish Top 12 Variants
 *  - Section 10: 24-Hour Rule, Formatting Constraints & Dynamic Fact Substitution
 */

import {
  WhatsAppLanguage,
  WhatsAppIndustry,
  WhatsAppFreeReply,
  WhatsAppMetaTemplate,
  WhatsAppVariableContext,
  WhatsAppReplyButton,
  WhatsAppReplyPayload,
} from "./types";

/**
 * 24-Hour Window Rule Engine
 * Outside 24 hours from the customer's last inbound message, only Meta-approved templates may be sent.
 */
export function isInside24HourWindow(lastCustomerMessageAt?: Date | number | string | null): boolean {
  if (!lastCustomerMessageAt) return false;
  const lastTime = new Date(lastCustomerMessageAt).getTime();
  if (isNaN(lastTime)) return false;
  const now = Date.now();
  const diffMs = now - lastTime;
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  return diffMs >= 0 && diffMs <= twentyFourHoursMs;
}

/**
 * Safe fallbacks for non-critical cosmetic variables so raw {{...}} brackets never reach users
 */
const SAFE_VARIABLE_FALLBACKS: Record<string, string> = {
  customer_name: "",
  last_service: "appointment",
  last_staff: "our specialist",
  service: "service",
  services: "our services",
  duration: "45 min",
  address: "our office",
  parking_info: "Parking is available nearby.",
  payment_methods: "UPI, Cards, and Cash",
  cancel_policy: "Free cancellation up to 24 hours before your slot",
  cancel_policy_short: "Free up to 24h before",
  holiday_name: "the upcoming holiday",
  walkin_policy: "Walk-ins are welcome based on availability.",
  deposit_policy: "A deposit may be required to confirm your booking.",
  late_policy: "We hold your slot for up to 15 minutes.",
  noshow_policy: "Please inform us if you cannot make it.",
  refund_policy: "Refunds are processed within 24-48 business hours.",
  hold_minutes: "15",
  response_time: "shortly",
  minutes_left: "15",
  booking_ref: "your booking",
  phone: "our office",
  website: "https://nexxtechnologies.com",
  maps_link: "https://maps.google.com",
  hours_today: "9:00 AM to 8:00 PM",
  hours_week: "Monday to Saturday: 9:00 AM - 8:00 PM",
  staff: "our team",
  doctor: "our specialist",
  price: "standard pricing",
  deposit: "deposit amount",
  day: "today",
  time: "your scheduled time",
  date: "your appointment date",
};

/**
 * Clean Variable Substitution Engine
 * Replaces {{variable}} with verified context values.
 * Identifies missing variables to prevent guessing/hallucination,
 * and eliminates any raw {{...}} placeholders before dispatch.
 */
export function substituteVariables(
  content: string,
  context: WhatsAppVariableContext
): { text: string; missingVariables: string[] } {
  if (!content) return { text: "", missingVariables: [] };

  const missingVariables: string[] = [];
  let result = content;

  // Find all {{variable}} matches
  const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  result = result.replace(regex, (match, varName) => {
    const key = varName.toLowerCase() as keyof WhatsAppVariableContext;
    const value = context[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
    missingVariables.push(varName);

    // Apply safe fallback if defined, else strip cleanly so raw braces never show
    if (SAFE_VARIABLE_FALLBACKS[varName.toLowerCase()] !== undefined) {
      return SAFE_VARIABLE_FALLBACKS[varName.toLowerCase()];
    }
    return "";
  });

  // Polish formatting and clean any awkward spacing/commas
  result = result
    .replace(/Welcome back,\s*!/g, "Welcome back!")
    .replace(/Hi\s*,/g, "Hi,")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .trim();

  return { text: result, missingVariables };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 2: BASICS (FREE REPLIES INSIDE 24 HOURS)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const BASICS_REPLIES: Record<string, WhatsAppFreeReply> = {
  // 2.1 Greeting, new customer
  "greeting_new": {
    id: "greeting_new",
    section: "2.1",
    name: "Greeting New Customer",
    category: "service",
    body: "Hi! 👋 Welcome to {{business_name}}. I can help you book an appointment, check prices or answer questions. What would you like to do?",
    buttons: [
      { id: "btn_book", title: "Book appointment" },
      { id: "btn_prices", title: "Services & prices" },
      { id: "btn_human", title: "Talk to a person" },
    ],
    hinglish: {
      body: "Hi! 👋 {{business_name}} mein aapka swagat hai. Main aapki kaise madad kar sakti hu?",
      buttons: [
        { id: "btn_book", title: "Book appointment" },
        { id: "btn_prices", title: "Services & prices" },
        { id: "btn_human", title: "Talk to a person" },
      ],
    },
    hindi: {
      body: "नमस्ते! 👋 {{business_name}} में आपका स्वागत है। मैं आपकी क्या मदद कर सकती हूँ?",
      buttons: [
        { id: "btn_book", title: "बुक अपॉइंटमेंट" },
        { id: "btn_prices", title: "सेवाएं व मूल्य" },
        { id: "btn_human", title: "व्यक्ति से बात करें" },
      ],
    },
  },

  // 2.2 Greeting, returning customer
  "greeting_returning": {
    id: "greeting_returning",
    section: "2.2",
    name: "Greeting Returning Customer",
    category: "service",
    body: "Welcome back, {{customer_name}}! 😊 Would you like to book your usual {{last_service}} again?",
    buttons: [
      { id: "btn_book_usual", title: "Yes, book it" },
      { id: "btn_other_service", title: "Something else" },
      { id: "btn_human", title: "Talk to a person" },
    ],
    hinglish: {
      body: "Welcome back, {{customer_name}}! 😊 Kya aap apna usual {{last_service}} fir se book karna chahenge?",
      buttons: [
        { id: "btn_book_usual", title: "Haan, book karo" },
        { id: "btn_other_service", title: "Kuch aur" },
        { id: "btn_human", title: "Talk to person" },
      ],
    },
    hindi: {
      body: "वापसी पर स्वागत है {{customer_name}}! 😊 क्या आप अपना पसंदीदा {{last_service}} दोबारा बुक करना चाहते हैं?",
      buttons: [
        { id: "btn_book_usual", title: "हाँ, बुक करें" },
        { id: "btn_other_service", title: "कुछ और" },
        { id: "btn_human", title: "व्यक्ति से बात करें" },
      ],
    },
  },

  // 2.3 Main menu
  "main_menu": {
    id: "main_menu",
    section: "2.3",
    name: "Main Menu",
    category: "service",
    body: "Here's what I can help with. Tap Choose an option.",
    listButton: "Choose an option",
    listTitle: "Main Menu",
    listSections: [
      {
        title: "Actions",
        rows: [
          { id: "menu_book", title: "Book appointment", description: "Schedule a new booking" },
          { id: "menu_reschedule", title: "Reschedule or cancel", description: "Change or cancel booking" },
          { id: "menu_services", title: "Services & prices", description: "Browse menu & rate card" },
          { id: "menu_hours", title: "Opening hours", description: "Check working timings" },
          { id: "menu_location", title: "Location & parking", description: "Address, map and parking" },
          { id: "menu_offers", title: "Offers", description: "Current packages & discounts" },
          { id: "menu_my_booking", title: "My booking", description: "View your upcoming booking" },
          { id: "menu_human", title: "Talk to a person", description: "Connect with front desk team" },
        ],
      },
    ],
  },

  // 2.4 Language choice
  "language_choice": {
    id: "language_choice",
    section: "2.4",
    name: "Language Choice",
    category: "service",
    body: "Which language do you prefer?",
    buttons: [
      { id: "lang_en", title: "English" },
      { id: "lang_hi", title: "हिंदी" },
      { id: "lang_hinglish", title: "Hinglish" },
    ],
  },

  // 2.5 Thanks or OK
  "thanks_ok": {
    id: "thanks_ok",
    section: "2.5",
    name: "Thanks or OK",
    category: "service",
    body: "You're welcome! 😊 Is there anything else I can help with?",
    buttons: [
      { id: "btn_book", title: "Book appointment" },
      { id: "btn_done", title: "That's all" },
    ],
    hinglish: {
      body: "Shukriya! 😊 Kya main kisi aur cheez mein madad kar sakti hu?",
      buttons: [
        { id: "btn_book", title: "Book appointment" },
        { id: "btn_done", title: "Bas itna hi" },
      ],
    },
    hindi: {
      body: "आपका स्वागत है! 😊 क्या मैं किसी अन्य चीज़ में आपकी मदद कर सकती हूँ?",
      buttons: [
        { id: "btn_book", title: "बुक अपॉइंटमेंट" },
        { id: "btn_done", title: "बस इतना ही" },
      ],
    },
  },

  // 2.6 Goodbye
  "goodbye": {
    id: "goodbye",
    section: "2.6",
    name: "Goodbye",
    category: "service",
    body: "Thanks for chatting with {{business_name}}. See you soon! 👋",
    hinglish: {
      body: "{{business_name}} se baat karne ke liye shukriya. Jaldi milte hain! 👋",
    },
    hindi: {
      body: "{{business_name}} से संपर्क करने के लिए धन्यवाद। जल्द मिलते हैं! 👋",
    },
  },

  // 2.7 Didn't understand, first time
  "not_understood_1": {
    id: "not_understood_1",
    section: "2.7",
    name: "Not Understood Once",
    category: "service",
    body: "Sorry, I didn't quite get that. Could you say it in a different way? Or pick one below.",
    buttons: [
      { id: "btn_book", title: "Book appointment" },
      { id: "btn_prices", title: "Services & prices" },
      { id: "btn_human", title: "Talk to a person" },
    ],
  },

  // 2.8 Didn't understand, second time in a row (hand over to human)
  "not_understood_2": {
    id: "not_understood_2",
    section: "2.8",
    name: "Not Understood Twice Handover",
    category: "care",
    body: "I'm still not sure I understood, so I'll ask a team member to help. They'll reply during opening hours. In the meantime, you can tell me what you need.",
    handoverToHuman: true,
  },

  // 2.9 Hand over to a person, during opening hours
  "handover_open": {
    id: "handover_open",
    section: "2.9",
    name: "Handover During Opening Hours",
    category: "care",
    body: "Of course. I've asked {{business_name}}'s team to join this chat, and someone will reply shortly. To help them, please tell me what you need.",
    handoverToHuman: true,
    hinglish: {
      body: "Bilkul. Maine {{owner_name}} ko aapka message bhej diya hai. Wo jaldi hi yahin reply karenge. Tab tak koi aur sawaal ho to boliye.",
    },
    hindi: {
      body: "ज़रूर। मैंने {{owner_name}} को आपका संदेश भेज दिया है। हमारी टीम जल्द ही यहाँ जवाब देगी।",
    },
  },

  // 2.10 Hand over to a person, outside opening hours
  "handover_closed": {
    id: "handover_closed",
    section: "2.10",
    name: "Handover Outside Opening Hours",
    category: "care",
    body: "Our team is away right now. We open {{next_open}}. I've saved your message and someone will reply then. I can still help you book or answer questions now.",
    buttons: [
      { id: "btn_book", title: "Book appointment" },
      { id: "btn_ask", title: "Ask a question" },
    ],
    handoverToHuman: true,
  },

  // 2.11 While a person is replying (assistant paused)
  "assistant_paused": {
    id: "assistant_paused",
    section: "2.11",
    name: "Assistant Paused",
    category: "care",
    body: "Thanks for your message. A team member will reply soon.",
  },

  // 2.12 Back from a person to the assistant
  "handback_to_bot": {
    id: "handback_to_bot",
    section: "2.12",
    name: "Handback to Assistant",
    category: "service",
    body: "Thanks for chatting with {{staff}}. I'm here if you need anything else.",
  },

  // 2.13 Closed now
  "closed_now": {
    id: "closed_now",
    section: "2.13",
    name: "Business Closed Now",
    category: "service",
    body: "Hi! {{business_name}} is closed right now. We open {{next_open}}. I can still help you book, check prices or answer questions.",
    buttons: [
      { id: "btn_book", title: "Book appointment" },
      { id: "btn_prices", title: "Services & prices" },
    ],
    hinglish: {
      body: "Hi! {{business_name}} abhi band hai. Hum {{next_open}} ko khulenge. Par aap abhi booking kar sakte hain ya prices check kar sakte hain.",
      buttons: [
        { id: "btn_book", title: "Book appointment" },
        { id: "btn_prices", title: "Services & prices" },
      ],
    },
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 3: BUSINESS INFORMATION (FACTS FROM SAVED SETTINGS)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const BUSINESS_INFO_REPLIES: Record<string, WhatsAppFreeReply> = {
  // 3.1 Opening hours
  "opening_hours": {
    id: "opening_hours",
    section: "3.1",
    name: "Opening Hours",
    category: "service",
    body: "We're open {{hours_week}}. Today: {{hours_today}}. Would you like to book a time?",
    buttons: [
      { id: "btn_book", title: "Book appointment" },
      { id: "btn_location", title: "Location & parking" },
    ],
    hinglish: {
      body: "Hum aaj {{hours_today}} tak khule hain. Poore hafte ka time: {{hours_week}}. Kya aap appointment book karna chahenge?",
      buttons: [
        { id: "btn_book", title: "Book appointment" },
        { id: "btn_location", title: "Location" },
      ],
    },
  },

  // 3.2 Holiday closure
  "holiday_closure": {
    id: "holiday_closure",
    section: "3.2",
    name: "Holiday Closure",
    category: "service",
    body: "{{business_name}} is closed on {{holiday_name}}. We reopen {{next_open}}. Would you like to book a slot for after that?",
    buttons: [
      { id: "btn_book", title: "Book slot" },
      { id: "btn_hours", title: "Opening hours" },
    ],
  },

  // 3.3 Location & directions
  "location": {
    id: "location",
    section: "3.3",
    name: "Location",
    category: "service",
    body: "We're at {{address}}. Map: {{maps_link}}",
    buttons: [
      { id: "btn_book", title: "Book appointment" },
      { id: "btn_call", title: "Call us" },
    ],
    hinglish: {
      body: "Hamara address: {{address}}. Map: {{maps_link}}. Landmark ke liye {{phone}} par call kar sakte hain.",
      buttons: [
        { id: "btn_book", title: "Book appointment" },
        { id: "btn_call", title: "Call karein" },
      ],
    },
  },

  // 3.4 Parking and transport
  "parking_info": {
    id: "parking_info",
    section: "3.4",
    name: "Parking and Transport",
    category: "service",
    body: "{{parking_info}}",
    buttons: [
      { id: "btn_location", title: "Location & map" },
      { id: "btn_book", title: "Book appointment" },
    ],
  },

  // 3.5 Phone and contact
  "contact_info": {
    id: "contact_info",
    section: "3.5",
    name: "Phone and Contact",
    category: "service",
    body: "You can call us on {{phone}} during {{hours_today}}, or keep chatting here. Email: {{email}}.",
  },

  // 3.6 Services list
  "services_list": {
    id: "services_list",
    section: "3.6",
    name: "Services List",
    category: "service",
    body: "Here's what we offer at {{business_name}}. Tap Choose a category.",
    listButton: "Choose category",
    listTitle: "Service Categories",
  },

  // 3.7 Price of one service
  "service_price": {
    id: "service_price",
    section: "3.7",
    name: "Price of One Service",
    category: "service",
    body: "{{service}}: {{price}}, about {{duration}}. {{service_note}} Would you like to book it?",
    buttons: [
      { id: "btn_book_this", title: "Book this" },
      { id: "btn_other_services", title: "Other services" },
      { id: "btn_human", title: "Talk to a person" },
    ],
    hinglish: {
      body: "{{service}} ka rate {{price}} hai aur isme lagbhag {{duration}} lagte hain. Kya main booking kar du?",
      buttons: [
        { id: "btn_book_this", title: "Haan book karo" },
        { id: "btn_other_services", title: "Dusri service" },
        { id: "btn_human", title: "Talk to person" },
      ],
    },
  },

  // 3.8 Cheapest or budget
  "cheapest_budget": {
    id: "cheapest_budget",
    section: "3.8",
    name: "Starting / Budget Price",
    category: "service",
    body: "Our services start from {{lowest_price}}. Tell me what you're looking for and I'll share the exact price.",
  },

  // 3.9 Service details
  "service_details": {
    id: "service_details",
    section: "3.9",
    name: "Service Details",
    category: "service",
    body: "{{service_description}}",
    buttons: [
      { id: "btn_book_this", title: "Book this" },
      { id: "btn_human", title: "Talk to a person" },
    ],
  },

  // 3.10 Staff
  "staff_info": {
    id: "staff_info",
    section: "3.10",
    name: "Staff Information",
    category: "service",
    body: "{{staff}} does {{staff_services}}. Want me to check their next free times?",
    buttons: [
      { id: "btn_check_times", title: "Check times" },
      { id: "btn_any_staff", title: "Any available staff" },
    ],
  },

  // 3.11 Policies
  "policy_cancellation": {
    id: "policy_cancellation",
    section: "3.11",
    name: "Cancellation Policy",
    category: "service",
    body: "Cancellation policy: {{cancel_policy}}",
    buttons: [
      { id: "btn_book", title: "Book appointment" },
      { id: "btn_human", title: "Talk to a person" },
    ],
  },
  "policy_deposit": {
    id: "policy_deposit",
    section: "3.11",
    name: "Deposit Policy",
    category: "service",
    body: "A deposit of {{deposit}} holds your booking for {{service}}. {{deposit_policy}}",
    buttons: [
      { id: "btn_book", title: "Book now" },
      { id: "btn_human", title: "Talk to a person" },
    ],
  },
  "policy_late": {
    id: "policy_late",
    section: "3.11",
    name: "Late Arrival Policy",
    category: "service",
    body: "Late arrival: {{late_policy}}",
  },
  "policy_noshow": {
    id: "policy_noshow",
    section: "3.11",
    name: "No-Show Policy",
    category: "service",
    body: "No-show policy: {{noshow_policy}}",
  },
  "policy_refund": {
    id: "policy_refund",
    section: "3.11",
    name: "Refund Policy",
    category: "care",
    body: "Refund policy: {{refund_policy}}",
    buttons: [{ id: "btn_human", title: "Talk to a person" }],
    handoverToHuman: true,
  },
  "policy_walkin": {
    id: "policy_walkin",
    section: "3.11",
    name: "Walk-in Policy",
    category: "service",
    body: "{{walkin_policy}} Booking guarantees your slot.",
    buttons: [{ id: "btn_book", title: "Book guaranteed slot" }],
  },

  // 3.12 Payment methods
  "payment_methods": {
    id: "payment_methods",
    section: "3.12",
    name: "Payment Methods",
    category: "service",
    body: "We accept {{payment_methods}}. {{deposit_note}}",
  },

  // 3.13 Offers and packages
  "offers_packages": {
    id: "offers_packages",
    section: "3.13",
    name: "Offers and Packages",
    category: "service",
    body: "Current offers at {{business_name}}: {{offers_list}} Would you like to use one for a booking?",
    buttons: [
      { id: "btn_book_offer", title: "Book with offer" },
      { id: "btn_human", title: "Talk to a person" },
    ],
  },

  // 3.14 Discount inquiry
  "discount_request": {
    id: "discount_request",
    section: "3.14",
    name: "Discount Request",
    category: "care",
    body: "I can't change prices myself, but I'll ask the team. Meanwhile, here are our current offers: {{offers_list}}",
    handoverToHuman: true,
  },

  // 3.15 Service not offered
  "service_not_offered": {
    id: "service_not_offered",
    section: "3.15",
    name: "Service Not Offered",
    category: "service",
    body: "We don't offer {{requested_service}} at the moment. Here's what we do offer:",
  },

  // 3.16 Website & social
  "website_social": {
    id: "website_social",
    section: "3.16",
    name: "Website and Social Media",
    category: "service",
    body: "You can find us here: {{website}} and Instagram {{instagram}}.",
  },

  // 3.17 Knowledge gap / unknown fact
  "knowledge_gap": {
    id: "knowledge_gap",
    section: "3.17",
    name: "Knowledge Gap Fallback",
    category: "care",
    body: "I don't want to guess and give you wrong information. Let me ask the team and get back to you.",
    handoverToHuman: true,
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 4: BOOKING (FREE REPLIES INSIDE 24 HOURS)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const BOOKING_REPLIES: Record<string, WhatsAppFreeReply> = {
  // 4.1 Start booking
  "booking_start": {
    id: "booking_start",
    section: "4.1",
    name: "Start a Booking",
    category: "service",
    body: "Sure! Which service would you like?",
    hinglish: {
      body: "Zaroor! Aap kaunsi service book karna chahte hain?",
    },
    hindi: {
      body: "ज़रूर! आप कौन सी सर्विस बुक करना चाहते हैं?",
    },
  },

  // 4.2 Ask day
  "booking_ask_day": {
    id: "booking_ask_day",
    section: "4.2",
    name: "Ask for Day",
    category: "service",
    body: "Great choice. Which day works for you?",
    buttons: [
      { id: "day_today", title: "Today" },
      { id: "day_tomorrow", title: "Tomorrow" },
      { id: "day_pick", title: "Pick a date" },
    ],
    hinglish: {
      body: "Aapko kaunsa din theek rahega?",
      buttons: [
        { id: "day_today", title: "Aaj" },
        { id: "day_tomorrow", title: "Kal" },
        { id: "day_pick", title: "Doosra din" },
      ],
    },
    hindi: {
      body: "आपके लिए कौन सा दिन सुविधाजनक रहेगा?",
      buttons: [
        { id: "day_today", title: "आज" },
        { id: "day_tomorrow", title: "कल" },
        { id: "day_pick", title: "तारीख चुनें" },
      ],
    },
  },

  // 4.3 Offer times
  "booking_offer_times": {
    id: "booking_offer_times",
    section: "4.3",
    name: "Offer Free Times",
    category: "service",
    body: "Here are the free times on {{date}}. Tap Choose a time.",
    listButton: "Choose a time",
    listTitle: "Available Times",
  },

  // 4.4 Fully booked / alternate times
  "booking_fully_booked": {
    id: "booking_fully_booked",
    section: "4.4",
    name: "No Free Time - Offer Alternatives",
    category: "service",
    body: "Sorry, we're fully booked on {{date}}. The nearest free times are {{alt_1}}, {{alt_2}} and {{alt_3}}. Would you like one of these?",
    buttons: [
      { id: "btn_nearby_times", title: "Show nearby times" },
      { id: "btn_join_waitlist", title: "Join waitlist" },
      { id: "btn_other_date", title: "Other date" },
    ],
    hinglish: {
      body: "Maaf kijiye, {{date}} ko koi slot khali nahi hai. Sabse paas ke time hain: {{alt_1}}, {{alt_2}}, {{alt_3}}. Kya inme se koi chalega?",
      buttons: [
        { id: "btn_nearby_times", title: "Paas ke times" },
        { id: "btn_join_waitlist", title: "Waitlist join karo" },
        { id: "btn_other_date", title: "Dusra din" },
      ],
    },
  },

  // 4.5 Name and phone verification
  "booking_ask_name": {
    id: "booking_ask_name",
    section: "4.5",
    name: "Ask for Name and Phone",
    category: "service",
    body: "Almost done! May I have your full name?",
  },

  // 4.6 Summary before confirming
  "booking_summary": {
    id: "booking_summary",
    section: "4.6",
    name: "Summary Before Confirming",
    category: "service",
    body: "Please check your booking:\n• Service: {{service}}\n• With: {{staff}}\n• When: {{date}} at {{time}}\n• Price: {{price}}\n\nShall I confirm it?",
    buttons: [
      { id: "btn_confirm", title: "Confirm" },
      { id: "btn_change_time", title: "Change time" },
      { id: "btn_cancel", title: "Cancel" },
    ],
    hinglish: {
      body: "Aapki booking details:\n• Service: {{service}}\n• Stylist/Staff: {{staff}}\n• Time: {{date}} ko {{time}} baje\n• Price: {{price}}\n\nKya main confirm kar du?",
      buttons: [
        { id: "btn_confirm", title: "Haan confirm" },
        { id: "btn_change_time", title: "Time badlo" },
        { id: "btn_cancel", title: "Cancel" },
      ],
    },
  },

  // 4.7 Confirmed (no deposit)
  "booking_confirmed_free": {
    id: "booking_confirmed_free",
    section: "4.7",
    name: "Booking Confirmed No Deposit",
    category: "service",
    body: "You're booked! ✅ {{service}} with {{staff}} on {{date}} at {{time}}. Address: {{address}}. Booking ref: {{booking_ref}}. To change or cancel, just reply here.",
    buttons: [
      { id: "btn_directions", title: "Directions" },
      { id: "btn_reschedule", title: "Reschedule" },
      { id: "btn_cancel", title: "Cancel" },
    ],
    hinglish: {
      body: "Aapki booking confirm ho gayi hai! ✅ {{service}}, {{staff}} ke saath, {{date}} ko {{time}} baje. Address: {{address}}. Booking ref: {{booking_ref}}. Badalna ya cancel karna ho to yahin reply kijiye.",
      buttons: [
        { id: "btn_directions", title: "Directions" },
        { id: "btn_reschedule", title: "Reschedule" },
        { id: "btn_cancel", title: "Cancel" },
      ],
    },
  },

  // 4.8 Deposit needed
  "booking_deposit_needed": {
    id: "booking_deposit_needed",
    section: "4.8",
    name: "Deposit Needed",
    category: "service",
    body: "To hold your slot we need a deposit of {{deposit}}. Please pay within {{hold_minutes}} minutes and your time stays reserved: {{payment_link}}",
    buttons: [{ id: "btn_pay", title: "Pay now" }],
  },

  // 4.9 Payment received
  "booking_payment_received": {
    id: "booking_payment_received",
    section: "4.9",
    name: "Payment Received",
    category: "service",
    body: "Payment received, thank you! ✅ Your booking is confirmed: {{service}} on {{date}} at {{time}}. Ref {{booking_ref}}.",
  },

  // 4.10 Payment hold expiring
  "booking_hold_expiring": {
    id: "booking_hold_expiring",
    section: "4.10",
    name: "Payment Hold Expiring",
    category: "service",
    body: "Your slot for {{service}} is held for {{minutes_left}} more minutes. Pay here to keep it: {{payment_link}}",
    buttons: [{ id: "btn_pay", title: "Pay now" }],
  },

  // 4.11 Payment failed / hold expired
  "booking_payment_failed": {
    id: "booking_payment_failed",
    section: "4.11",
    name: "Payment Failed or Hold Expired",
    category: "care",
    body: "We couldn't complete the payment, so the slot on {{date}} at {{time}} was released. Would you like to try again?",
    buttons: [
      { id: "btn_try_again", title: "Try again" },
      { id: "btn_pick_time", title: "Pick another time" },
      { id: "btn_human", title: "Talk to a person" },
    ],
  },

  // 4.12 Slot taken
  "booking_slot_taken": {
    id: "booking_slot_taken",
    section: "4.12",
    name: "Slot Taken While Choosing",
    category: "service",
    body: "Sorry, someone just booked that time. Here are the nearest free times on {{date}}:",
  },

  // 4.13 My booking
  "booking_my_appointment": {
    id: "booking_my_appointment",
    section: "4.13",
    name: "Check My Booking",
    category: "service",
    body: "Your next booking is {{service}} with {{staff}} on {{date}} at {{time}}. Ref {{booking_ref}}.",
    buttons: [
      { id: "btn_reschedule", title: "Reschedule" },
      { id: "btn_cancel", title: "Cancel" },
      { id: "btn_directions", title: "Directions" },
    ],
  },

  // 4.14 Reschedule
  "booking_reschedule": {
    id: "booking_reschedule",
    section: "4.14",
    name: "Reschedule Booking",
    category: "service",
    body: "Sure. Your booking is {{service}} on {{date}} at {{time}}. Which day would you prefer?",
    buttons: [
      { id: "day_today", title: "Today" },
      { id: "day_tomorrow", title: "Tomorrow" },
      { id: "day_pick", title: "Pick a date" },
    ],
    hinglish: {
      body: "Theek hai. Aapki booking {{date}} ko {{time}} baje hai. Aap kis din aana chahenge?",
      buttons: [
        { id: "day_today", title: "Aaj" },
        { id: "day_tomorrow", title: "Kal" },
        { id: "day_pick", title: "Doosra din" },
      ],
    },
  },

  // 4.15 Cancel
  "booking_cancel": {
    id: "booking_cancel",
    section: "4.15",
    name: "Cancel Booking",
    category: "care",
    body: "I'm sorry you can't make it. Do you want to cancel {{service}} on {{date}} at {{time}}? {{cancel_policy_short}}",
    buttons: [
      { id: "btn_confirm_cancel", title: "Yes, cancel" },
      { id: "btn_reschedule", title: "Reschedule instead" },
      { id: "btn_keep_booking", title: "Keep booking" },
    ],
    hinglish: {
      body: "Koi baat nahi. Kya aap {{date}} ko {{time}} baje wali {{service}} booking cancel karna chahte hain?",
      buttons: [
        { id: "btn_confirm_cancel", title: "Haan, cancel karo" },
        { id: "btn_reschedule", title: "Reschedule karo" },
        { id: "btn_keep_booking", title: "Rehne do" },
      ],
    },
  },

  // 4.16 Waitlist
  "booking_waitlist": {
    id: "booking_waitlist",
    section: "4.16",
    name: "Waitlist Join",
    category: "service",
    body: "You're on the waitlist for {{date}}. I'll message you as soon as a slot opens.",
  },

  // 4.17 Running late & arrival
  "booking_running_late": {
    id: "booking_running_late",
    section: "4.17",
    name: "Running Late",
    category: "service",
    body: "Thanks for letting us know. We'll hold your slot until {{grace_until}}. {{late_policy}}",
    buttons: [
      { id: "btn_on_way", title: "I'm on my way" },
      { id: "btn_reschedule", title: "Reschedule" },
    ],
  },
  "booking_arrived": {
    id: "booking_arrived",
    section: "4.17",
    name: "Customer Arrived",
    category: "service",
    body: "Welcome! 😊 Please take a seat. {{staff}} will be with you shortly.",
  },

  // 4.18 Same as last time
  "booking_same_as_last": {
    id: "booking_same_as_last",
    section: "4.18",
    name: "Same as Last Time",
    category: "service",
    body: "Last time you had {{last_service}} with {{last_staff}}. Shall I book the same again? Which day suits you?",
    buttons: [
      { id: "btn_same", title: "Yes, same" },
      { id: "btn_change_service", title: "Change service" },
    ],
  },

  // 4.19 Booking for multiple people
  "booking_multiple_people": {
    id: "booking_multiple_people",
    section: "4.19",
    name: "Booking for Someone Else",
    category: "service",
    body: "Happy to help. How many people, and what service for each?",
  },

  // 4.20 Group / bridal / event
  "booking_group_event": {
    id: "booking_group_event",
    section: "4.20",
    name: "Group or Bridal Event Booking",
    category: "care",
    body: "Congratulations! 🎉 Group and event bookings need a quick chat with our team so we can plan properly. I've passed your request on. Could you share the date, number of people, and services you're thinking of?",
    handoverToHuman: true,
  },

  // 4.21 Urgent or same-day
  "booking_urgent_today": {
    id: "booking_urgent_today",
    section: "4.21",
    name: "Urgent or Same-Day",
    category: "service",
    body: "Let me check what's free today.",
  },

  // 4.22 Specific time free
  "booking_specific_time": {
    id: "booking_specific_time",
    section: "4.22",
    name: "Specific Time Slot Match",
    category: "service",
    body: "Yes, {{time}} on {{date}} is free. Shall I book it?",
    buttons: [
      { id: "btn_confirm", title: "Yes, book it" },
      { id: "btn_other_time", title: "Other time" },
    ],
  },

  // 4.23 Booking rules
  "booking_rule_too_soon": {
    id: "booking_rule_too_soon",
    section: "4.23",
    name: "Too Soon Notice",
    category: "service",
    body: "We need at least {{min_notice}} notice. The earliest I can offer is {{earliest}}.",
  },
  "booking_rule_too_far": {
    id: "booking_rule_too_far",
    section: "4.23",
    name: "Too Far Ahead Notice",
    category: "service",
    body: "We take bookings up to {{max_advance_days}} days ahead. Would you like to pick an earlier date?",
  },

  // 4.25 Booking system problem
  "booking_system_problem": {
    id: "booking_system_problem",
    section: "4.25",
    name: "Booking System Error",
    category: "care",
    body: "Sorry, I couldn't complete that booking just now. I've asked the team to confirm it with you. You can also call {{phone}}.",
    handoverToHuman: true,
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 5: CARE AND SPECIAL CASES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const CARE_REPLIES: Record<string, WhatsAppFreeReply> = {
  // 5.1 Complaint or unhappy customer
  "complaint": {
    id: "complaint",
    section: "5.1",
    name: "Customer Complaint",
    category: "care",
    body: "I'm really sorry about this. That's not the experience we want you to have. I've passed your message to {{owner_name}} so a real person can look into it and get back to you personally. Could you tell me briefly what happened?",
    handoverToHuman: true,
    priorityHumanHandover: true,
  },

  // 5.2 Refund or money-back request
  "refund_request": {
    id: "refund_request",
    section: "5.2",
    name: "Refund Request",
    category: "care",
    body: "I understand. I've shared your request with the team, and they will check and reply to you within {{response_time}}. Please share your booking ref or payment date so they can find it quickly.",
    handoverToHuman: true,
    priorityHumanHandover: true,
  },

  // 5.3 Compliment or thanks
  "compliment": {
    id: "compliment",
    section: "5.3",
    name: "Customer Compliment",
    category: "service",
    body: "That's so kind of you, thank you! 😊 We'll pass it on to the team.",
  },

  // 5.4 Emergency or safety (Highest Priority)
  "emergency": {
    id: "emergency",
    section: "5.4",
    name: "Emergency / Safety Alert",
    category: "care",
    body: "I'm sorry to hear that. I can't give medical advice. If you feel unwell or in danger, please call your local emergency number or see a doctor now. I've alerted our team and someone will contact you as soon as possible.",
    handoverToHuman: true,
    priorityHumanHandover: true,
  },

  // 5.5 Marketing opt-in request
  "marketing_opt_in": {
    id: "marketing_opt_in",
    section: "5.5",
    name: "Marketing Opt-in Prompt",
    category: "care",
    body: "Would you like to get occasional offers and reminders from {{business_name}} on WhatsApp? You can stop any time by replying STOP.",
    buttons: [
      { id: "optin_yes", title: "Yes, send offers" },
      { id: "optin_no", title: "No thanks" },
    ],
  },

  // 5.6 Stop and unsubscribe
  "opt_out_stop": {
    id: "opt_out_stop",
    section: "5.6",
    name: "Opt-Out STOP Confirmation",
    category: "care",
    body: "Done. You won't get offers from {{business_name}} anymore. We'll still send messages about your bookings. Reply START any time to join again.",
  },

  // 5.7 Start again
  "opt_in_start": {
    id: "opt_in_start",
    section: "5.7",
    name: "Opt-In START Confirmation",
    category: "care",
    body: "Welcome back! You'll get offers from {{business_name}} again. Reply STOP any time to opt out.",
  },

  // 5.8 Delete my data
  "privacy_delete_data": {
    id: "privacy_delete_data",
    section: "5.8",
    name: "Data Deletion Request",
    category: "care",
    body: "We take your privacy seriously. I've passed your request to the team, and they'll confirm within {{response_time}}. You can read how we use your details here: {{privacy_link}}",
    handoverToHuman: true,
  },

  // 5.9 Wrong number
  "wrong_number": {
    id: "wrong_number",
    section: "5.9",
    name: "Wrong Number Notice",
    category: "care",
    body: "Sorry for the mix-up! This is the booking assistant for {{business_name}}. We'll remove this number from our list. Have a lovely day.",
  },

  // 5.10 Are you a bot
  "bot_identity": {
    id: "bot_identity",
    section: "5.10",
    name: "Bot Identity Transparency",
    category: "service",
    body: "I'm the virtual assistant for {{business_name}}. I can help with bookings, prices and questions, and I can connect you to a team member any time.",
    buttons: [
      { id: "btn_human", title: "Talk to a person" },
      { id: "btn_continue", title: "Continue here" },
    ],
  },

  // 5.12 Voice note handling
  "voice_note_received": {
    id: "voice_note_received",
    section: "5.12",
    name: "Voice Note Received",
    category: "service",
    body: "Thanks for your voice message. I can't listen to audio yet. Could you type your question? You can also call us on {{phone}}.",
  },

  // 5.13 Photo, video or doc
  "media_received": {
    id: "media_received",
    section: "5.13",
    name: "Media File Received",
    category: "service",
    body: "Thanks for sharing! I've saved it for the team. Is there something specific you'd like help with?",
  },

  // 5.16 Out-of-scope question
  "out_of_scope": {
    id: "out_of_scope",
    section: "5.16",
    name: "Out of Scope Question",
    category: "service",
    body: "I can only help with {{business_name}}: bookings, services, prices and opening hours. Is there something I can help you with there?",
  },

  // 5.17 Abuse or rude language
  "abusive_language": {
    id: "abusive_language",
    section: "5.17",
    name: "Abusive Language Boundary",
    category: "care",
    body: "I'm happy to help, but I can't continue if the language stays like this. Would you like me to connect you with a team member?",
    buttons: [{ id: "btn_human", title: "Connect to team" }],
    handoverToHuman: true,
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 6: OUTBOUND APPROVED META TEMPLATES (OUTSIDE 24 HOURS)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const META_APPROVED_TEMPLATES: Record<string, WhatsAppMetaTemplate> = {
  // 6.1 op_booking_confirmed_v1
  "op_booking_confirmed_v1": {
    name: "op_booking_confirmed_v1",
    category: "UTILITY",
    body: "Hi {{1}}, your booking at {{2}} is confirmed: {{3}} on {{4}} at {{5}}. Ref {{6}}. To change or cancel, reply here.",
    variableNames: ["customer_name", "business_name", "service", "date", "time", "booking_ref"],
    samples: {
      "1": "Priya",
      "2": "Glow Salon",
      "3": "Haircut",
      "4": "Sat 8 Nov",
      "5": "4:30 PM",
      "6": "OP-4821",
    },
    quickReplies: ["Reschedule", "Cancel"],
  },

  // 6.2 op_reminder_24h_v1
  "op_reminder_24h_v1": {
    name: "op_reminder_24h_v1",
    category: "UTILITY",
    body: "Hi {{1}}, a reminder of your {{2}} tomorrow at {{3}} at {{4}}. Reply YES to confirm or tell us if you need to change it.",
    variableNames: ["customer_name", "service", "time", "business_name"],
    samples: {
      "1": "Priya",
      "2": "Haircut",
      "3": "4:30 PM",
      "4": "Glow Salon",
    },
    quickReplies: ["Confirm", "Reschedule", "Cancel"],
  },

  // 6.3 op_reminder_2h_v1
  "op_reminder_2h_v1": {
    name: "op_reminder_2h_v1",
    category: "UTILITY",
    body: "Hi {{1}}, see you in about 2 hours for your {{2}} at {{3}}. Address: {{4}}.",
    variableNames: ["customer_name", "service", "time", "address"],
    samples: {
      "1": "Priya",
      "2": "Haircut",
      "3": "4:30 PM",
      "4": "12 MG Road, Pune",
    },
    urlButton: {
      label: "Directions",
      url: "{{maps_link}}",
    },
  },

  // 6.4 op_booking_rescheduled_v1
  "op_booking_rescheduled_v1": {
    name: "op_booking_rescheduled_v1",
    category: "UTILITY",
    body: "Hi {{1}}, your booking is moved to {{2}} at {{3}} for {{4}}. Ref {{5}}.",
    variableNames: ["customer_name", "date", "time", "service", "booking_ref"],
    samples: {
      "1": "Priya",
      "2": "Sun 9 Nov",
      "3": "11:00 AM",
      "4": "Haircut",
      "5": "OP-4821",
    },
  },

  // 6.5 op_booking_cancelled_v1
  "op_booking_cancelled_v1": {
    name: "op_booking_cancelled_v1",
    category: "UTILITY",
    body: "Hi {{1}}, your booking for {{2}} on {{3}} at {{4}} is cancelled. We hope to see you again soon. To book a new time, just reply here.",
    variableNames: ["customer_name", "service", "date", "time"],
    samples: {
      "1": "Priya",
      "2": "Haircut",
      "3": "Sat 8 Nov",
      "4": "4:30 PM",
    },
    quickReplies: ["Book again"],
  },

  // 6.6 op_booking_changed_by_business_v1
  "op_booking_changed_by_business_v1": {
    name: "op_booking_changed_by_business_v1",
    category: "UTILITY",
    body: "Hi {{1}}, sorry, we need to change your {{2}} appointment on {{3}} at {{4}}. Please reply to pick a new time that suits you. Our apologies for the trouble.",
    variableNames: ["customer_name", "service", "date", "time"],
    samples: {
      "1": "Priya",
      "2": "Haircut",
      "3": "Sat 8 Nov",
      "4": "4:30 PM",
    },
    quickReplies: ["Pick a new time", "Talk to a person"],
  },

  // 6.7 op_deposit_request_v1
  "op_deposit_request_v1": {
    name: "op_deposit_request_v1",
    category: "UTILITY",
    body: "Hi {{1}}, to confirm your {{2}} on {{3}} at {{4}}, please pay the deposit of {{5}} within {{6}} minutes. Your slot is held until then.",
    variableNames: ["customer_name", "service", "date", "time", "deposit", "hold_minutes"],
    samples: {
      "1": "Priya",
      "2": "Haircut & Color",
      "3": "Sat 8 Nov",
      "4": "4:30 PM",
      "5": "₹500",
      "6": "30",
    },
    urlButton: {
      label: "Pay now",
      url: "{{payment_link}}",
    },
  },

  // 6.8 op_payment_receipt_v1
  "op_payment_receipt_v1": {
    name: "op_payment_receipt_v1",
    category: "UTILITY",
    body: "Hi {{1}}, we received your payment of {{2}} for {{3}}. Thank you! Ref {{4}}.",
    variableNames: ["customer_name", "price", "service", "booking_ref"],
    samples: {
      "1": "Priya",
      "2": "₹500",
      "3": "Haircut Deposit",
      "4": "OP-4821",
    },
  },

  // 6.9 op_review_request_v1
  "op_review_request_v1": {
    name: "op_review_request_v1",
    category: "UTILITY",
    body: "Hi {{1}}, thank you for visiting {{2}}! If you enjoyed it, we'd love a quick review. It takes 30 seconds.",
    variableNames: ["customer_name", "business_name"],
    samples: {
      "1": "Priya",
      "2": "Glow Salon",
    },
    urlButton: {
      label: "Leave a review",
      url: "{{review_link}}",
    },
  },

  // 6.10 op_waitlist_slot_open_v1
  "op_waitlist_slot_open_v1": {
    name: "op_waitlist_slot_open_v1",
    category: "UTILITY",
    body: "Hi {{1}}, good news! A slot opened for {{2}} on {{3}} at {{4}}. It's held for {{5}} minutes. Do you want it?",
    variableNames: ["customer_name", "service", "date", "time", "hold_minutes"],
    samples: {
      "1": "Priya",
      "2": "Haircut",
      "3": "Sat 8 Nov",
      "4": "4:30 PM",
      "5": "15",
    },
    quickReplies: ["Book it", "No thanks"],
  },

  // 6.11 op_missed_you_v1
  "op_missed_you_v1": {
    name: "op_missed_you_v1",
    category: "UTILITY",
    body: "Hi {{1}}, we missed you at {{2}} today. Would you like to book another time? Just reply here.",
    variableNames: ["customer_name", "business_name"],
    samples: {
      "1": "Priya",
      "2": "Glow Salon",
    },
    quickReplies: ["Book again", "Not now"],
  },

  // 6.12 op_rebook_nudge_v1
  "op_rebook_nudge_v1": {
    name: "op_rebook_nudge_v1",
    category: "MARKETING",
    body: "Hi {{1}}, it's been a while since your {{2}} at {{3}}. Ready for your next one? Reply to book a time. Reply STOP to opt out.",
    variableNames: ["customer_name", "service", "business_name"],
    samples: {
      "1": "Priya",
      "2": "Haircut",
      "3": "Glow Salon",
    },
    quickReplies: ["Book now", "Not now"],
  },

  // 6.13 op_birthday_offer_v1
  "op_birthday_offer_v1": {
    name: "op_birthday_offer_v1",
    category: "MARKETING",
    body: "Happy birthday {{1}}! 🎂 {{2}} has a small gift for you: {{3}}. Valid until {{4}}. Reply to book. Reply STOP to opt out.",
    variableNames: ["customer_name", "business_name", "offer_text", "valid_until"],
    samples: {
      "1": "Priya",
      "2": "Glow Salon",
      "3": "20% off any facial service",
      "4": "30 Nov",
    },
  },

  // 6.14 op_offer_v1
  "op_offer_v1": {
    name: "op_offer_v1",
    category: "MARKETING",
    body: "Hi {{1}}, {{2}} has an offer: {{3}}. Valid until {{4}}. Reply BOOK to grab a slot. Reply STOP to opt out.",
    variableNames: ["customer_name", "business_name", "offer_text", "valid_until"],
    samples: {
      "1": "Priya",
      "2": "Glow Salon",
      "3": "Festive Glow Package for ₹1,499",
      "4": "Diwali Weekend",
    },
  },

  // 6.15 op_holiday_closed_v1
  "op_holiday_closed_v1": {
    name: "op_holiday_closed_v1",
    category: "UTILITY",
    body: "Hi {{1}}, {{2}} will be closed on {{3}} for {{4}}. We reopen on {{5}}. If you have a booking on that day, we'll contact you to move it.",
    variableNames: ["customer_name", "business_name", "date", "holiday_name", "next_open"],
    samples: {
      "1": "Priya",
      "2": "Glow Salon",
      "3": "Friday 1 Nov",
      "4": "Diwali",
      "5": "Saturday 2 Nov",
    },
  },

  // 6.16 op_followup_aftercare_v1
  "op_followup_aftercare_v1": {
    name: "op_followup_aftercare_v1",
    category: "UTILITY",
    body: "Hi {{1}}, thank you for visiting {{2}}. Here are your aftercare tips for {{3}}: {{4}}. Reply here if you have any questions.",
    variableNames: ["customer_name", "business_name", "service", "aftercare_text"],
    samples: {
      "1": "Priya",
      "2": "Glow Salon",
      "3": "Keratin Treatment",
      "4": "Avoid washing hair for 48 hours and use sulfate-free shampoo.",
    },
  },

  // 6.17 op_handover_followup_v1
  "op_handover_followup_v1": {
    name: "op_handover_followup_v1",
    category: "UTILITY",
    body: "Hi {{1}}, {{2}} has replied to your earlier message. Reply here to continue the chat.",
    variableNames: ["customer_name", "owner_name"],
    samples: {
      "1": "Priya",
      "2": "Front Desk Team",
    },
  },

  // 6.18 op_membership_expiry_v1
  "op_membership_expiry_v1": {
    name: "op_membership_expiry_v1",
    category: "UTILITY",
    body: "Hi {{1}}, your {{2}} at {{3}} expires on {{4}}. Reply here to renew or ask a question.",
    variableNames: ["customer_name", "plan_name", "business_name", "expiry_date"],
    samples: {
      "1": "Priya",
      "2": "Gold Membership",
      "3": "Glow Salon",
      "4": "15 Dec 2026",
    },
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 7: INDUSTRY ADD-ONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const INDUSTRY_ADDONS: Record<WhatsAppIndustry, Record<string, WhatsAppFreeReply>> = {
  // 7.1 Salon, barber and beauty
  salon: {
    "hair_skin_concern": {
      id: "salon_hair_skin_concern",
      section: "7.1.1",
      name: "Hair or Skin Concern",
      category: "service",
      body: "Our stylists can suggest the right treatment after a quick look. Would you like to book a consultation? {{consult_price_note}}",
      buttons: [
        { id: "btn_consult", title: "Book consultation" },
        { id: "btn_services", title: "See services" },
      ],
    },
    "patch_test": {
      id: "salon_patch_test",
      section: "7.1.2",
      name: "Patch Test or Allergy",
      category: "service",
      body: "Thanks for telling us. For colour and chemical services we recommend a patch test at least {{patch_hours}} hours before. Please tell us about any allergies when you book so the team can prepare.",
    },
    "reference_photo": {
      id: "salon_reference_photo",
      section: "7.1.3",
      name: "Bring Reference Photo",
      category: "service",
      body: "Lovely! Please send the photo here and our stylist will check it before your visit. Results can vary with hair type and length.",
    },
  },

  // 7.2 Clinic, dental and wellness
  clinic: {
    "new_patient": {
      id: "clinic_new_patient",
      section: "7.2.1",
      name: "New Patient Registration",
      category: "service",
      body: "Welcome! For your first visit please arrive {{arrive_early}} minutes early and bring {{bring_list}}. Shall I find you a time?",
      buttons: [{ id: "btn_book", title: "Find appointment" }],
    },
    "medical_disclaimer": {
      id: "clinic_medical_disclaimer",
      section: "7.2.3",
      name: "Symptoms or Medical Advice Guard",
      category: "care",
      body: "I'm not able to give medical advice. I can book you with {{doctor}}, who can look at this properly. If it feels urgent, please call {{phone}} or visit an emergency service now.",
      buttons: [
        { id: "btn_book_doc", title: "Book appointment" },
        { id: "btn_human", title: "Talk to receptionist" },
      ],
      handoverToHuman: true,
      priorityHumanHandover: true,
    },
  },

  // 7.3 Spa and massage
  spa: {
    "therapy_choice": {
      id: "spa_therapy_choice",
      section: "7.3.1",
      name: "Therapy Choice",
      category: "service",
      body: "Our most popular choices are {{popular_services}}. Our therapist can suggest the best one for you. Would you like to book?",
      buttons: [{ id: "btn_book", title: "Book therapy" }],
    },
    "health_conditions": {
      id: "spa_health_conditions",
      section: "7.3.4",
      name: "Health Conditions & Safety",
      category: "care",
      body: "Thank you for telling us. Some treatments are not suitable in these cases. Our team will confirm the safest option before your visit. Do you want me to book it with a note for the therapist?",
      buttons: [
        { id: "btn_book_note", title: "Book with note" },
        { id: "btn_human", title: "Talk to team" },
      ],
    },
  },

  // 7.4 Gym, yoga and fitness
  gym: {
    "trial_class": {
      id: "gym_trial_class",
      section: "7.4.1",
      name: "Trial / Demo Class",
      category: "service",
      body: "You're welcome to try a class! {{trial_offer}} Which day would you like to come?",
      buttons: [
        { id: "day_today", title: "Today" },
        { id: "day_tomorrow", title: "Tomorrow" },
      ],
    },
    "timetable": {
      id: "gym_timetable",
      section: "7.4.2",
      name: "Class Timetable",
      category: "service",
      body: "Here is this week's timetable: {{timetable}}. Which class would you like to join?",
    },
  },

  // 7.5 Vet and pet grooming
  vet: {
    "pet_details": {
      id: "vet_pet_details",
      section: "7.5.1",
      name: "Pet Details Intake",
      category: "service",
      body: "What is your pet's name, type and breed? Any health or behaviour notes we should know about?",
    },
    "pet_emergency": {
      id: "vet_pet_emergency",
      section: "7.5.3",
      name: "Pet Emergency Alert",
      category: "care",
      body: "I'm so sorry. This sounds urgent. Please call {{phone}} or go to the nearest emergency vet right away. I've alerted the team now.",
      handoverToHuman: true,
      priorityHumanHandover: true,
    },
  },

  // 7.6 Auto service and car wash
  auto: {
    "vehicle_details": {
      id: "auto_vehicle_details",
      section: "7.6.1",
      name: "Vehicle Details Intake",
      category: "service",
      body: "Please share your vehicle make, model and registration number so we can prepare the quote.",
    },
    "service_status": {
      id: "auto_service_status",
      section: "7.6.2",
      name: "Vehicle Ready Status",
      category: "service",
      body: "{{status_note}} I'll tell the team you asked, and they'll update you shortly.",
      handoverToHuman: true,
    },
  },

  // 7.7 Tutors and coaching
  tutor: {
    "trial_lesson": {
      id: "tutor_trial_lesson",
      section: "7.7.1",
      name: "Trial Lesson",
      category: "service",
      body: "We offer a trial lesson. {{trial_offer}} Which subject and level are you looking for?",
    },
  },

  // 7.8 Photographers and studios
  photo: {
    "shoot_enquiry": {
      id: "photo_shoot_enquiry",
      section: "7.8.1",
      name: "Photo Shoot Enquiry",
      category: "care",
      body: "Congratulations! Please tell me the type of shoot, date, place and number of people. {{owner_name}} will reply with a quote.",
      handoverToHuman: true,
    },
  },

  general: {},
};

export const FREE_REPLIES: Record<string, WhatsAppFreeReply> = {
  ...BASICS_REPLIES,
  ...BUSINESS_INFO_REPLIES,
  ...BOOKING_REPLIES,
  ...CARE_REPLIES,
};

export const APPROVED_META_TEMPLATES: WhatsAppMetaTemplate[] = Object.values(META_APPROVED_TEMPLATES);

// Section 9: Top 12 Hindi & Hinglish Variants
export const HINDI_HINGLISH_VARIANTS: Record<
  string,
  { hindi: NonNullable<WhatsAppFreeReply["hindi"]>; hinglish: NonNullable<WhatsAppFreeReply["hinglish"]> }
> = {
  greeting_new: {
    hindi: BASICS_REPLIES.greeting_new.hindi!,
    hinglish: BASICS_REPLIES.greeting_new.hinglish!,
  },
  greeting_returning: {
    hindi: BASICS_REPLIES.greeting_returning.hindi!,
    hinglish: BASICS_REPLIES.greeting_returning.hinglish!,
  },
  opening_hours: {
    hindi: {
      body: "हम {{hours_week}} खुले हैं। आज: {{hours_today}}। क्या आप अपॉइंटमेंट बुक करना चाहेंगे?",
      buttons: [
        { id: "btn_book", title: "बुक अपॉइंटमेंट" },
        { id: "btn_location", title: "स्थान व पार्किंग" },
      ],
    },
    hinglish: {
      body: "Hum {{hours_week}} open rehte hain. Aaj ka timing: {{hours_today}}. Kya aap slot book karna chahenge?",
      buttons: [
        { id: "btn_book", title: "Book appointment" },
        { id: "btn_location", title: "Location & parking" },
      ],
    },
  },
  location: {
    hindi: {
      body: "{{business_name}} का पता: {{address}}। मैप लिंक: {{maps_link}}",
      buttons: [
        { id: "btn_book", title: "बुक अपॉइंटमेंट" },
        { id: "btn_parking", title: "पार्किंग की जानकारी" },
      ],
    },
    hinglish: {
      body: "{{business_name}} ka address hai: {{address}}. Directions ke liye: {{maps_link}}",
      buttons: [
        { id: "btn_book", title: "Book appointment" },
        { id: "btn_parking", title: "Parking info" },
      ],
    },
  },
  services_list: {
    hindi: {
      body: "ये हमारी मुख्य सेवाएं हैं। अधिक जानकारी या बुकिंग के लिए विकल्प चुनें।",
      buttons: [
        { id: "btn_book", title: "बुक करें" },
        { id: "btn_prices", title: "मूल्य सूची" },
      ],
    },
    hinglish: {
      body: "Yeh hamari main services hain. Pricing dekhne ya book karne ke liye tap karein.",
      buttons: [
        { id: "btn_book", title: "Book appointment" },
        { id: "btn_prices", title: "Price list" },
      ],
    },
  },
  service_price: {
    hindi: {
      body: "{{service}} का शुल्क {{price}} है (अवधि: {{duration}})। क्या आप स्लॉट बुक करना चाहेंगे?",
      buttons: [
        { id: "btn_book", title: "हाँ, बुक करें" },
        { id: "btn_other", title: "अन्य सेवाएं" },
      ],
    },
    hinglish: {
      body: "{{service}} ka charge {{price}} hai (approx {{duration}}). Kya aap book karna chahte hain?",
      buttons: [
        { id: "btn_book", title: "Haan, book karo" },
        { id: "btn_other", title: "Dusri service" },
      ],
    },
  },
  booking_start: {
    hindi: {
      body: "बिल्कुल! आप किस सेवा के लिए और किस दिन अपॉइंटमेंट लेना चाहेंगे?",
      buttons: [
        { id: "btn_today", title: "आज ही" },
        { id: "btn_tomorrow", title: "कल" },
        { id: "btn_other_day", title: "अन्य तारीख" },
      ],
    },
    hinglish: {
      body: "Zaroor! Aapko kaunsi service ke liye aur kis din appointment chahiye?",
      buttons: [
        { id: "btn_today", title: "Aaj ka slot" },
        { id: "btn_tomorrow", title: "Kal ka slot" },
        { id: "btn_other_day", title: "Dusra din" },
      ],
    },
  },
  booking_running_late: {
    hindi: {
      body: "बताने के लिए धन्यवाद। हम आपका स्लॉट 15 मिनट तक सुरक्षित रखेंगे। कृपया आराम से आएं।",
      buttons: [{ id: "btn_human", title: "टीम से बात करें" }],
    },
    hinglish: {
      body: "Batane ke liye shukriya! Hum aapka slot 15 mins tak hold karenge. Aaram se aaiye.",
      buttons: [{ id: "btn_human", title: "Talk to team" }],
    },
  },
  booking_arrived: {
    hindi: {
      body: "स्वागत है! कृपया रिसेप्शन पर बताएं, हम आपको तुरंत अटेंड कर रहे हैं।",
    },
    hinglish: {
      body: "Welcome! Reception par batayein, hamari team aapko attend kar rahi hai.",
    },
  },
  booking_cancel: {
    hindi: {
      body: "क्या आप वाकई अपॉइंटमेंट (Ref: {{booking_ref}}) रद्द करना चाहते हैं?",
      buttons: [
        { id: "btn_confirm_cancel", title: "हाँ, रद्द करें" },
        { id: "btn_reschedule", title: "समय बदलें" },
      ],
    },
    hinglish: {
      body: "Kya aap apna appointment (Ref: {{booking_ref}}) cancel karna chahte hain?",
      buttons: [
        { id: "btn_confirm_cancel", title: "Haan, cancel karo" },
        { id: "btn_reschedule", title: "Reschedule karo" },
      ],
    },
  },
  booking_reschedule: {
    hindi: {
      body: "कोई बात नहीं! आप किस नए दिन या समय पर आना चाहेंगे?",
      buttons: [
        { id: "btn_today", title: "आज बाद में" },
        { id: "btn_tomorrow", title: "कल" },
        { id: "btn_pick_date", title: "तारीख चुनें" },
      ],
    },
    hinglish: {
      body: "Koi baat nahi! Aap kis naye din ya time par aana chahenge?",
      buttons: [
        { id: "btn_today", title: "Aaj baad me" },
        { id: "btn_tomorrow", title: "Kal" },
        { id: "btn_pick_date", title: "Pick new date" },
      ],
    },
  },
  handover_open: {
    hindi: {
      body: "मैंने अपनी टीम को सूचित कर दिया है। एक सदस्य आपसे शीघ्र संपर्क करेगा।",
    },
    hinglish: {
      body: "Maine team ko alert kar diya hai. Jaldi hi koi aapko reply ya call karega.",
    },
  },
};

/**
 * Universal Lookup & Render Helper
 */
export function getWhatsAppReply(
  id: string,
  context: WhatsAppVariableContext,
  language: WhatsAppLanguage = "en",
  industry: WhatsAppIndustry = "general"
): WhatsAppReplyPayload & { handoverToHuman?: boolean; priorityHumanHandover?: boolean } {
  // Rule Section 2.2: Greeting Returning Customer is ONLY used when customer's history is saved
  if (id === "greeting_returning" && (!context.last_service || context.last_service.trim() === "")) {
    return getWhatsAppReply("greeting_new", context, language, industry);
  }

  // Check in basics, business_info, booking, care, and industry add-ons
  const template =
    BASICS_REPLIES[id] ||
    BUSINESS_INFO_REPLIES[id] ||
    BOOKING_REPLIES[id] ||
    CARE_REPLIES[id] ||
    (industry !== "general" ? INDUSTRY_ADDONS[industry]?.[id] : undefined) ||
    BASICS_REPLIES["not_understood_1"];

  let rawBody = template.body;
  let buttons = template.buttons;
  let listButton = template.listButton;
  let listRows = template.listRows || (template.listSections ? template.listSections.flatMap((s) => s.rows) : undefined);

  if (language === "hinglish" && template.hinglish) {
    rawBody = template.hinglish.body;
    if (template.hinglish.buttons) buttons = template.hinglish.buttons;
    if (template.hinglish.listButton) listButton = template.hinglish.listButton;
  } else if (language === "hi" && template.hindi) {
    rawBody = template.hindi.body;
    if (template.hindi.buttons) buttons = template.hindi.buttons;
    if (template.hindi.listButton) listButton = template.hindi.listButton;
  }

  // Personalize greeting_new if customer_name is available
  if (id === "greeting_new" && context.customer_name && context.customer_name.trim() !== "") {
    rawBody = rawBody.replace(/Hi! 👋/g, `Hi ${context.customer_name}! 👋`);
  }

  const substituted = substituteVariables(rawBody, context);

  // If critical business variables are unresolved, trigger Section 3.17 Knowledge Gap fallback
  if (substituted.missingVariables.length > 0) {
    const criticalVars = ["price", "hours_today", "address", "phone", "hours_week"];
    const hasCriticalMiss = substituted.missingVariables.some((v) => criticalVars.includes(v));
    if (hasCriticalMiss) {
      return {
        type: "text",
        body: "I don't want to guess and give you wrong information. Let me ask the team and get back to you.",
        handoverToHuman: true,
      };
    }
  }

  const replyType = listRows && listRows.length > 0
    ? "list"
    : buttons && buttons.length > 0
    ? "interactive_buttons"
    : "text";

  return {
    type: replyType,
    body: substituted.text,
    buttons,
    listButton,
    listRows,
    handoverToHuman: template.handoverToHuman,
    priorityHumanHandover: template.priorityHumanHandover,
  };
}
