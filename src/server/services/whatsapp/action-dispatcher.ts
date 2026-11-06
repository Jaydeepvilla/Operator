import { db } from "../../db";
import { appointments, services, leadProfiles } from "../../db/schema";
import { eq, and, desc, gte, or } from "drizzle-orm";
import { BusinessContext } from "../business-context";
import { availabilityService, TimeSlot } from "../availability";
import { sharedBusinessActions } from "../actions/shared-business-actions";
import { whatsAppStateMachine, WhatsAppConversationState } from "./state-machine";
import { dynamicExperienceEngine, CustomerPersonalizationContext, detectLanguage } from "./dynamic-experience";
import { WhatsAppReplyPayload } from "./types";

export interface ActionDispatcherInput {
  organizationId: string;
  conversationId: string;
  leadProfileId?: string;
  senderPhone: string;
  senderName?: string;
  rawText: string;
  interactiveId?: string;
  business: BusinessContext;
}

function formatTime12(time24: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || "0", 10);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function getNextDateStr(daysAhead: number): { dateStr: string; label: string } {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;

  if (daysAhead === 0) return { dateStr, label: "Today" };
  if (daysAhead === 1) return { dateStr, label: "Tomorrow" };
  const weekday = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return { dateStr, label: weekday };
}

export const whatsAppActionDispatcher = {
  /**
   * Evaluates and executes actions based on incoming interactive IDs or conversational state transitions
   */
  async dispatch(input: ActionDispatcherInput): Promise<WhatsAppReplyPayload | null> {
    const { organizationId, conversationId, leadProfileId, senderPhone, senderName, rawText, interactiveId, business } = input;
    const actionId = (interactiveId || "").trim();
    const textLower = (rawText || "").toLowerCase().trim();
    const cleanText = textLower.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").trim();
    const bizName = business.name || "Reception Desk";

    // Load active conversation state from PostgreSQL
    const state = await whatsAppStateMachine.getState(organizationId, conversationId);

    // ── Global Fast Navigation Handlers ─────────────────────────────────────
    if (
      actionId === "act_main_menu" ||
      actionId === "menu_main" ||
      actionId === "btn_menu" ||
      actionId === "menu" ||
      cleanText === "main menu" ||
      cleanText === "menu" ||
      cleanText === "options" ||
      cleanText.includes("main menu")
    ) {
      await whatsAppStateMachine.resetState(organizationId, conversationId);
      const customerCtx: CustomerPersonalizationContext = {
        customerName: senderName && senderName !== "WhatsApp User" ? senderName : undefined,
        isReturning: true,
        language: state.language || detectLanguage(rawText),
      };
      return dynamicExperienceEngine.generateMainMenu(business, customerCtx);
    }

    if (actionId === "act_back" || cleanText === "back" || cleanText === "piche jao") {
      return await this.handleBackNavigation(organizationId, conversationId, state, business, senderName);
    }

    // ── Direct Interactive Actions ──────────────────────────────────────────

    // 1. Book Appointment Start
    if (
      actionId === "act_book_start" ||
      actionId === "btn_book" ||
      actionId === "menu_book" ||
      actionId === "btn_book_usual" ||
      actionId === "btn_book_this" ||
      actionId === "btn_book_offer" ||
      actionId === "btn_book_doc" ||
      actionId === "btn_keep_booking" ||
      actionId === "btn_other_service" ||
      cleanText === "book appointment" ||
      cleanText === "book slot" ||
      cleanText === "booking karni hai" ||
      cleanText === "schedule a new booking" ||
      cleanText.includes("book appointment") ||
      cleanText.includes("schedule a new booking") ||
      cleanText.includes("book a slot") ||
      cleanText.includes("book slot")
    ) {
      return await this.handleBookStart(organizationId, conversationId, business);
    }

    // 2. Select Service
    if (actionId.startsWith("act_select_service:") || actionId.startsWith("srv_")) {
      const serviceId = actionId.startsWith("act_select_service:")
        ? actionId.replace("act_select_service:", "")
        : actionId.replace("srv_", "");
      return await this.handleSelectService(organizationId, conversationId, serviceId, business);
    }

    if (state.stage === "SELECTING_SERVICE" && cleanText) {
      const matched = (business.services || []).find(
        (s) => s.id === actionId || cleanText.toLowerCase().includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(cleanText.toLowerCase())
      );
      if (matched) {
        return await this.handleSelectService(organizationId, conversationId, matched.id, business);
      }
    }

    // 3. Select Date
    if (actionId.startsWith("act_select_date:") || actionId === "btn_today" || actionId === "btn_tomorrow" || actionId === "btn_day_after") {
      let targetDateStr = "";
      let targetLabel = "";

      if (actionId.startsWith("act_select_date:")) {
        targetDateStr = actionId.replace("act_select_date:", "");
        targetLabel = targetDateStr;
      } else if (actionId === "btn_today") {
        const { dateStr, label } = getNextDateStr(0);
        targetDateStr = dateStr;
        targetLabel = label;
      } else if (actionId === "btn_tomorrow") {
        const { dateStr, label } = getNextDateStr(1);
        targetDateStr = dateStr;
        targetLabel = label;
      } else if (actionId === "btn_day_after") {
        const { dateStr, label } = getNextDateStr(2);
        targetDateStr = dateStr;
        targetLabel = label;
      }

      return await this.handleSelectDate(organizationId, conversationId, targetDateStr, targetLabel, business);
    }

    // 4. Select Slot / Time
    if (actionId.startsWith("act_select_slot:") || actionId.startsWith("time_")) {
      const timeVal = actionId.startsWith("act_select_slot:")
        ? actionId.replace("act_select_slot:", "")
        : actionId.replace("time_", "");
      return await this.handleSelectSlot(organizationId, conversationId, timeVal, business, senderName, senderPhone);
    }

    // 5. Confirm Real Booking Execution
    if (
      actionId === "act_confirm_booking" ||
      actionId === "btn_confirm" ||
      cleanText === "yes, book it" ||
      cleanText === "confirm booking" ||
      cleanText === "yes, confirm" ||
      cleanText === "confirm"
    ) {
      return await this.handleExecuteBooking(organizationId, conversationId, business, leadProfileId, senderName, senderPhone);
    }

    // 6. View My Bookings
    if (
      actionId === "act_my_booking" ||
      actionId === "menu_my_booking" ||
      actionId === "btn_my_booking" ||
      cleanText === "my booking" ||
      cleanText === "my bookings" ||
      cleanText.includes("my booking") ||
      cleanText === "check appointment"
    ) {
      return await this.handleMyBookings(organizationId, conversationId, leadProfileId, senderPhone, business);
    }

    // 7. Cancel Confirmation / Execution
    if (
      actionId.startsWith("act_cancel_confirm:") ||
      (state.stage === "CONFIRMING_CANCEL" && /^(yes|confirm|ha|haan|yes,? cancel|sure)$/i.test(cleanText))
    ) {
      const aptId = actionId.startsWith("act_cancel_confirm:")
        ? actionId.replace("act_cancel_confirm:", "")
        : state.activeAppointmentId;
      if (aptId) {
        return await this.handleCancelConfirm(organizationId, conversationId, aptId, business);
      }
    }

    if (
      actionId.startsWith("act_cancel_start:") ||
      actionId === "menu_reschedule" ||
      cleanText === "cancel booking" ||
      cleanText === "cancel appointment" ||
      cleanText === "cancel"
    ) {
      const aptId = actionId.startsWith("act_cancel_start:") ? actionId.replace("act_cancel_start:", "") : state.activeAppointmentId;
      return await this.handleCancelStart(organizationId, conversationId, aptId || undefined, business);
    }

    // 8. Reschedule Appointment
    if (
      actionId.startsWith("act_reschedule_start:") ||
      actionId === "btn_reschedule" ||
      actionId === "btn_change_time" ||
      actionId === "btn_other_time" ||
      cleanText === "reschedule appointment" ||
      cleanText === "change time" ||
      cleanText.includes("reschedule")
    ) {
      const aptId = actionId.startsWith("act_reschedule_start:") ? actionId.replace("act_reschedule_start:", "") : state.activeAppointmentId;
      return await this.handleRescheduleStart(organizationId, conversationId, aptId || undefined, business);
    }

    // 9. Services & Pricing Exploration
    if (
      actionId === "act_services_list" ||
      actionId === "act_prices" ||
      actionId === "btn_services" ||
      actionId === "btn_prices" ||
      actionId === "btn_other" ||
      actionId === "menu_services" ||
      cleanText === "services" ||
      cleanText === "prices" ||
      cleanText.includes("services & rates") ||
      cleanText.includes("services & prices") ||
      cleanText.includes("rate card") ||
      cleanText.includes("pricing")
    ) {
      return await this.handleServicesAndPricing(business);
    }

    // 10. Human Assistance Request
    if (
      actionId === "act_human" ||
      actionId === "menu_human" ||
      actionId === "btn_human" ||
      actionId === "btn_call" ||
      actionId === "btn_consult" ||
      cleanText.includes("talk to person") ||
      cleanText.includes("talk to desk") ||
      cleanText.includes("talk to a person") ||
      cleanText.includes("human support") ||
      cleanText.includes("real person") ||
      cleanText.includes("call me")
    ) {
      return await this.handleHumanHandover(organizationId, conversationId, business);
    }

    // 11. Location & Timings
    if (
      actionId === "act_location" ||
      actionId === "menu_location" ||
      actionId === "btn_location" ||
      actionId === "btn_directions" ||
      actionId === "btn_parking" ||
      cleanText.includes("location") ||
      cleanText.includes("address") ||
      cleanText.includes("where are you located") ||
      cleanText.includes("kaha par hai") ||
      cleanText.includes("directions") ||
      cleanText.includes("map")
    ) {
      return await this.handleLocation(business);
    }

    if (
      actionId === "act_hours" ||
      actionId === "menu_hours" ||
      actionId === "btn_hours" ||
      cleanText.includes("opening hours") ||
      cleanText.includes("working hours") ||
      cleanText.includes("timings") ||
      cleanText.includes("timing") ||
      cleanText.includes("open today")
    ) {
      return await this.handleOpeningHours(business);
    }

    // 12. Special Offers & Discounts
    if (
      actionId === "menu_offers" ||
      actionId === "btn_offers" ||
      actionId === "act_offers" ||
      cleanText.includes("special offer") ||
      cleanText.includes("offers") ||
      cleanText.includes("discount") ||
      cleanText.includes("coupons") ||
      cleanText.includes("package")
    ) {
      return await this.handleOffers(business);
    }

    // ── Conversational Context State Transitions (Natural Language Shortcuts) ─

    // If currently in SELECTING_SERVICE and customer typed a service name
    if (state.stage === "SELECTING_SERVICE") {
      const matched = (business.services || []).find((s) => s.name.toLowerCase().includes(textLower) || textLower.includes(s.name.toLowerCase()));
      if (matched) {
        return await this.handleSelectService(organizationId, conversationId, matched.id, business);
      }
    }

    // If currently in SELECTING_DATE and customer typed "today", "tomorrow", or a day name
    if (state.stage === "SELECTING_DATE") {
      if (textLower.includes("today") || textLower.includes("aaj")) {
        const { dateStr, label } = getNextDateStr(0);
        return await this.handleSelectDate(organizationId, conversationId, dateStr, label, business);
      }
      if (textLower.includes("tomorrow") || textLower.includes("kal")) {
        const { dateStr, label } = getNextDateStr(1);
        return await this.handleSelectDate(organizationId, conversationId, dateStr, label, business);
      }
    }

    // If currently in SELECTING_TIME and customer typed a time
    if (state.stage === "SELECTING_TIME" && state.draftBooking?.suggestedSlots) {
      const match = textLower.match(/((1[0-2]|[1-9])(:[0-5][0-9])?\s*(am|pm)?)/i);
      if (match) {
        const slot = state.draftBooking.suggestedSlots.find((s) => {
          const l12 = formatTime12(s.startTime).toLowerCase();
          return l12.includes(match[0].toLowerCase()) || s.startTime.includes(match[0]);
        });
        if (slot) {
          return await this.handleSelectSlot(organizationId, conversationId, slot.startTime, business, senderName, senderPhone);
        }
      }
    }

    // If currently in CONFIRMING_BOOKING and customer typed "yes" or "confirm"
    if (state.stage === "CONFIRMING_BOOKING") {
      if (/^(yes|confirm|ha|haan|book|ok|done|sure)$/i.test(textLower)) {
        return await this.handleExecuteBooking(organizationId, conversationId, business, leadProfileId, senderName, senderPhone);
      }
    }

    return null; // Not an explicit action or state shortcut; let AI/RAG handle natural language
  },

  // ── Action Handlers ───────────────────────────────────────────────────────

  async handleBookStart(
    organizationId: string,
    conversationId: string,
    business: BusinessContext
  ): Promise<WhatsAppReplyPayload> {
    const bizName = business.name || "Reception Desk";
    const available = business.services || [];

    if (!business.capabilities.hasBooking || available.length === 0) {
      return {
        type: "interactive_buttons",
        header: bizName.slice(0, 60),
        body: `Appointments are not currently open for online booking at ${bizName}. Would you like to speak directly with our front desk team?`,
        footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
        buttons: [
          { id: "act_human", title: "👤 Talk to Team" },
          { id: "act_main_menu", title: "📌 Main Menu" },
        ],
      };
    }

    await whatsAppStateMachine.setState(organizationId, conversationId, {
      stage: "SELECTING_SERVICE",
      draftBooking: {},
    });

    // If 3 or fewer services, show rapid 1-click reply buttons
    if (available.length <= 3) {
      return {
        type: "interactive_buttons",
        header: bizName.slice(0, 60),
        body: `Please choose a service below to schedule your appointment at *${bizName}*:`,
        footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
        buttons: [
          ...available.slice(0, 2).map((s) => ({
            id: `act_select_service:${s.id}`,
            title: s.name.slice(0, 20),
          })),
          { id: "act_main_menu", title: "🔙 Main Menu" },
        ],
      };
    }

    // For > 3 services, present an organized WhatsApp Interactive List
    return {
      type: "list",
      header: `${bizName} Services`.slice(0, 60),
      body: `Please select the service you would like to book:`,
      footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
      listButton: "Select Service",
      listSections: [
        {
          title: "Bookable Services",
          rows: [
            ...available.slice(0, 9).map((s) => ({
              id: `act_select_service:${s.id}`,
              title: s.name.slice(0, 24),
              description: `₹${s.price || "0"} • ${s.duration || 30} mins`.slice(0, 72),
            })),
            { id: "act_main_menu", title: "🔙 Main Menu", description: "Return to main options" },
          ],
        },
      ],
    };
  },

  async handleSelectService(
    organizationId: string,
    conversationId: string,
    serviceId: string,
    business: BusinessContext
  ): Promise<WhatsAppReplyPayload> {
    const bizName = business.name || "Reception Desk";
    const service = (business.services || []).find((s) => s.id === serviceId);

    if (!service) {
      return await this.handleBookStart(organizationId, conversationId, business);
    }

    // Save selected service in PostgreSQL state
    await whatsAppStateMachine.setState(organizationId, conversationId, {
      stage: "SELECTING_DATE",
      draftBooking: {
        serviceId: service.id,
        serviceName: service.name,
        servicePrice: `₹${service.price || "0"}`,
        serviceDuration: service.duration || 30,
      },
    });

    const d0 = getNextDateStr(0);
    const d1 = getNextDateStr(1);
    const d2 = getNextDateStr(2);

    return {
      type: "interactive_buttons",
      header: bizName.slice(0, 60),
      body: `Great! You selected *${service.name}* (₹${service.price} • ${service.duration} mins).\n\nWhich day works best for you?`,
      footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
      buttons: [
        { id: `act_select_date:${d0.dateStr}`, title: `📅 ${d0.label}`.slice(0, 20) },
        { id: `act_select_date:${d1.dateStr}`, title: `📅 ${d1.label}`.slice(0, 20) },
        { id: `act_select_date:${d2.dateStr}`, title: `📅 ${d2.label}`.slice(0, 20) },
      ],
    };
  },

  async handleSelectDate(
    organizationId: string,
    conversationId: string,
    targetDateStr: string,
    targetLabel: string,
    business: BusinessContext
  ): Promise<WhatsAppReplyPayload> {
    const bizName = business.name || "Reception Desk";
    const state = await whatsAppStateMachine.getState(organizationId, conversationId);
    const serviceId = state.draftBooking?.serviceId;

    if (!serviceId) {
      return await this.handleBookStart(organizationId, conversationId, business);
    }

    // Query REAL live availability from DB
    const slots = await availabilityService.getAvailableSlots(organizationId, serviceId, targetDateStr);

    if (slots.length === 0) {
      return {
        type: "interactive_buttons",
        header: bizName.slice(0, 60),
        body: `All slots are currently booked for *${targetLabel}*. Would you like to check tomorrow or join our waitlist?`,
        footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
        buttons: [
          { id: "btn_tomorrow", title: "📅 Check Tomorrow" },
          { id: "btn_book", title: "🔄 Pick Other Date" },
          { id: "act_main_menu", title: "🔙 Main Menu" },
        ],
      };
    }

    // Save available slots in state
    await whatsAppStateMachine.setState(organizationId, conversationId, {
      stage: "SELECTING_TIME",
      draftBooking: {
        ...state.draftBooking,
        targetDate: targetDateStr,
        dateLabel: targetLabel,
        suggestedSlots: slots,
      },
    });

    // If 3 or fewer slots, use reply buttons
    if (slots.length <= 3) {
      return {
        type: "interactive_buttons",
        header: bizName.slice(0, 60),
        body: `Available openings for *${state.draftBooking?.serviceName}* on *${targetLabel}*:\n\nPlease select your preferred time:`,
        footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
        buttons: [
          ...slots.slice(0, 2).map((s) => ({
            id: `act_select_slot:${s.startTime}`,
            title: `🕒 ${formatTime12(s.startTime)}`.slice(0, 20),
          })),
          { id: "act_book_start", title: "🔙 Change Date" },
        ],
      };
    }

    // For > 3 slots, present an interactive list of actual openings
    return {
      type: "list",
      header: `Openings for ${targetLabel}`.slice(0, 60),
      body: `Select an available time for *${state.draftBooking?.serviceName}*:`,
      footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
      listButton: "Select Time Slot",
      listSections: [
        {
          title: "Available Openings",
          rows: [
            ...slots.slice(0, 9).map((s) => ({
              id: `act_select_slot:${s.startTime}`,
              title: `🕒 ${formatTime12(s.startTime)}`,
              description: s.staffName ? `with ${s.staffName}` : "Standard Appointment",
            })),
            { id: "act_book_start", title: "🔙 Change Date", description: "Pick a different day" },
          ],
        },
      ],
    };
  },

  async handleSelectSlot(
    organizationId: string,
    conversationId: string,
    slotTime: string,
    business: BusinessContext,
    senderName: string | undefined,
    senderPhone: string
  ): Promise<WhatsAppReplyPayload> {
    const bizName = business.name || "Reception Desk";
    const state = await whatsAppStateMachine.getState(organizationId, conversationId);
    const draft = state.draftBooking;

    if (!draft || !draft.serviceId || !draft.targetDate) {
      return await this.handleBookStart(organizationId, conversationId, business);
    }

    const slotLabel = formatTime12(slotTime);
    const matchedSlot = draft.suggestedSlots?.find((s) => s.startTime === slotTime);

    await whatsAppStateMachine.setState(organizationId, conversationId, {
      stage: "CONFIRMING_BOOKING",
      draftBooking: {
        ...draft,
        slotTime,
        slotLabel,
        staffId: matchedSlot?.staffId,
        staffName: matchedSlot?.staffName,
      },
    });

    const customerDisplay = senderName && senderName !== "WhatsApp User" ? senderName : "You";

    return {
      type: "interactive_buttons",
      header: `${bizName} Confirmation`.slice(0, 60),
      body: `📋 *Please confirm your appointment details:*\n\n` +
        `• Service: *${draft.serviceName}*\n` +
        `• Price: *${draft.servicePrice}* (${draft.serviceDuration} mins)\n` +
        `• Date: *${draft.dateLabel}*\n` +
        `• Time: *${slotLabel}*\n` +
        `• Guest: *${customerDisplay}* (${senderPhone})\n` +
        `• Location: *${business.address || "Main Office"}*\n\n` +
        `Tap *Confirm Booking* below to reserve your slot immediately.`,
      footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
      buttons: [
        { id: "act_confirm_booking", title: "✅ Confirm Booking" },
        { id: `act_select_date:${draft.targetDate}`, title: "🔄 Change Time" },
        { id: "act_main_menu", title: "❌ Cancel" },
      ],
    };
  },

  async handleExecuteBooking(
    organizationId: string,
    conversationId: string,
    business: BusinessContext,
    leadProfileId: string | undefined,
    senderName: string | undefined,
    senderPhone: string
  ): Promise<WhatsAppReplyPayload> {
    const bizName = business.name || "Reception Desk";
    const state = await whatsAppStateMachine.getState(organizationId, conversationId);
    const draft = state.draftBooking;

    if (!draft || !draft.serviceId || !draft.targetDate || !draft.slotTime) {
      return await this.handleBookStart(organizationId, conversationId, business);
    }

    try {
      // Build start Date instant in local business timezone (defaulting to +05:30 IST)
      const startDateTime = new Date(`${draft.targetDate}T${draft.slotTime}:00+05:30`);

      // Execute authoritative real booking in PostgreSQL
      const bookingResult = await sharedBusinessActions.createBooking({
        organizationId,
        serviceId: draft.serviceId,
        staffMemberId: draft.staffId || undefined,
        startTime: startDateTime,
        customerName: senderName && senderName !== "WhatsApp User" ? senderName : `Customer ${senderPhone.slice(-4)}`,
        customerPhone: senderPhone,
        leadProfileId,
        channel: "whatsapp",
        isPublic: false,
      });

      const appointment = bookingResult.appointment;
      const refId = appointment.id.slice(0, 8).toUpperCase();

      // Reset state back to IDLE
      await whatsAppStateMachine.resetState(organizationId, conversationId);

      return {
        type: "interactive_buttons",
        header: `Booking Confirmed! 🎉`.slice(0, 60),
        body: `🎉 *Your appointment has been confirmed!*\n\n` +
          `• Ref ID: *#${refId}*\n` +
          `• Service: *${draft.serviceName}*\n` +
          `• Date & Time: *${draft.dateLabel} at ${draft.slotLabel}*\n` +
          `• Location: *${business.address || "Main Office"}*\n\n` +
          `A reminder will be sent before your slot. You can view or manage your booking anytime below.`,
        footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
        buttons: [
          { id: "act_my_booking", title: "🔍 My Bookings" },
          { id: "act_location", title: "📍 Get Directions" },
          { id: "act_main_menu", title: "📌 Main Menu" },
        ],
      };
    } catch (err: any) {
      console.error("[Action Dispatcher] Booking execution failed:", err);
      return {
        type: "interactive_buttons",
        header: bizName.slice(0, 60),
        body: `⚠️ We were unable to lock that specific slot (it may have just been booked). Please pick another time:`,
        footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
        buttons: [
          { id: `act_select_date:${draft.targetDate}`, title: "🔄 Pick Another Time" },
          { id: "act_book_start", title: "📅 Change Service" },
          { id: "act_main_menu", title: "🔙 Main Menu" },
        ],
      };
    }
  },

  async handleMyBookings(
    organizationId: string,
    conversationId: string,
    leadProfileId: string | undefined,
    senderPhone: string,
    business: BusinessContext
  ): Promise<WhatsAppReplyPayload> {
    const bizName = business.name || "Reception Desk";

    const conditions = [
      eq(appointments.organizationId, organizationId),
      eq(appointments.status, "confirmed"),
      gte(appointments.startTime, new Date()),
    ];

    if (leadProfileId && senderPhone) {
      conditions.push(or(eq(appointments.leadProfileId, leadProfileId), eq(appointments.customerPhone, senderPhone))!);
    } else if (leadProfileId) {
      conditions.push(eq(appointments.leadProfileId, leadProfileId));
    } else if (senderPhone) {
      conditions.push(eq(appointments.customerPhone, senderPhone));
    } else {
      return {
        type: "interactive_buttons",
        header: bizName.slice(0, 60),
        body: `You do not have any upcoming appointments at *${bizName}*. Would you like to schedule one now?`,
        footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
        buttons: [
          { id: "act_book_start", title: "📅 Book Appointment" },
          { id: "act_main_menu", title: "📌 Main Menu" },
        ],
      };
    }

    // Query active upcoming appointments for this lead or phone number
    const active = await db.query.appointments.findMany({
      where: and(...conditions),
      orderBy: [desc(appointments.startTime)],
      with: { service: true },
      limit: 3,
    });

    if (active.length === 0) {
      return {
        type: "interactive_buttons",
        header: bizName.slice(0, 60),
        body: `You do not have any upcoming appointments at *${bizName}*. Would you like to schedule one now?`,
        footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
        buttons: [
          { id: "act_book_start", title: "📅 Book Appointment" },
          { id: "act_main_menu", title: "📌 Main Menu" },
        ],
      };
    }

    const latest = active[0];
    const refId = latest.id.slice(0, 8).toUpperCase();
    const dateFormatted = new Date(latest.startTime).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const timeFormatted = new Date(latest.startTime).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    await whatsAppStateMachine.setState(organizationId, conversationId, {
      activeAppointmentId: latest.id,
      stage: "MANAGING_BOOKING",
    });

    return {
      type: "interactive_buttons",
      header: `My Booking (#${refId})`.slice(0, 60),
      body: `📅 *Your Upcoming Appointment:*\n\n` +
        `• Ref: *#${refId}*\n` +
        `• Service: *${latest.service?.name || "Appointment"}*\n` +
        `• Date: *${dateFormatted}*\n` +
        `• Time: *${timeFormatted}*\n` +
        `• Status: *Confirmed*\n\n` +
        `What would you like to do?`,
      footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
      buttons: [
        { id: `act_reschedule_start:${latest.id}`, title: "🔄 Reschedule" },
        { id: `act_cancel_start:${latest.id}`, title: "❌ Cancel Booking" },
        { id: "act_main_menu", title: "📌 Main Menu" },
      ],
    };
  },

  async handleCancelStart(
    organizationId: string,
    conversationId: string,
    appointmentId: string | undefined,
    business: BusinessContext
  ): Promise<WhatsAppReplyPayload> {
    const bizName = business.name || "Reception Desk";
    const aptId = appointmentId;

    if (!aptId) {
      return {
        type: "interactive_buttons",
        header: bizName.slice(0, 60),
        body: `No active appointment found to cancel. Would you like to check your appointments or return to the menu?`,
        footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
        buttons: [
          { id: "act_my_booking", title: "🔍 My Bookings" },
          { id: "act_main_menu", title: "📌 Main Menu" },
        ],
      };
    }

    await whatsAppStateMachine.setState(organizationId, conversationId, {
      stage: "CONFIRMING_CANCEL",
      activeAppointmentId: aptId,
    });

    return {
      type: "interactive_buttons",
      header: `Cancel Appointment`.slice(0, 60),
      body: `Are you sure you want to cancel your appointment? This will release the slot to other customers.`,
      footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
      buttons: [
        { id: `act_cancel_confirm:${aptId}`, title: "⚠️ Yes, Cancel" },
        { id: "act_my_booking", title: "🔙 Keep Booking" },
      ],
    };
  },

  async handleCancelConfirm(
    organizationId: string,
    conversationId: string,
    appointmentId: string,
    business: BusinessContext
  ): Promise<WhatsAppReplyPayload> {
    const bizName = business.name || "Reception Desk";

    try {
      await sharedBusinessActions.cancelAppointment({
        organizationId,
        appointmentId,
        reason: "Customer requested cancellation via WhatsApp",
        cancelledBy: "user",
      });

      await whatsAppStateMachine.resetState(organizationId, conversationId);

      return {
        type: "interactive_buttons",
        header: `Cancelled`.slice(0, 60),
        body: `✅ Your appointment has been cancelled successfully. If you would like to book a new appointment at a later date, we're always here to assist.`,
        footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
        buttons: [
          { id: "act_book_start", title: "📅 Book New Slot" },
          { id: "act_main_menu", title: "📌 Main Menu" },
        ],
      };
    } catch (err: any) {
      console.error("[Action Dispatcher] Cancellation failed:", err);
      return {
        type: "interactive_buttons",
        header: bizName.slice(0, 60),
        body: `We were unable to process the cancellation automatically. Please contact our front desk team:`,
        footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
        buttons: [
          { id: "act_human", title: "👤 Talk to Team" },
          { id: "act_main_menu", title: "📌 Main Menu" },
        ],
      };
    }
  },

  async handleRescheduleStart(
    organizationId: string,
    conversationId: string,
    appointmentId: string | undefined,
    business: BusinessContext
  ): Promise<WhatsAppReplyPayload> {
    const bizName = business.name || "Reception Desk";
    if (!appointmentId) {
      return await this.handleBookStart(organizationId, conversationId, business);
    }

    const apt = await db.query.appointments.findFirst({
      where: and(eq(appointments.id, appointmentId), eq(appointments.organizationId, organizationId)),
      with: { service: true },
    });

    if (!apt || !apt.service) {
      return await this.handleBookStart(organizationId, conversationId, business);
    }

    await whatsAppStateMachine.setState(organizationId, conversationId, {
      stage: "SELECTING_DATE",
      activeAppointmentId: apt.id,
      draftBooking: {
        serviceId: apt.service.id,
        serviceName: apt.service.name,
        servicePrice: `₹${apt.service.price}`,
        serviceDuration: apt.service.duration,
      },
    });

    const d0 = getNextDateStr(0);
    const d1 = getNextDateStr(1);
    const d2 = getNextDateStr(2);

    return {
      type: "interactive_buttons",
      header: `Reschedule Appointment`.slice(0, 60),
      body: `Let's find a better time for your *${apt.service.name}* appointment. Which day would you prefer?`,
      footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
      buttons: [
        { id: `act_select_date:${d0.dateStr}`, title: `📅 ${d0.label}`.slice(0, 20) },
        { id: `act_select_date:${d1.dateStr}`, title: `📅 ${d1.label}`.slice(0, 20) },
        { id: `act_select_date:${d2.dateStr}`, title: `📅 ${d2.label}`.slice(0, 20) },
      ],
    };
  },

  async handleServicesAndPricing(business: BusinessContext): Promise<WhatsAppReplyPayload> {
    const bizName = business.name || "Reception Desk";
    const available = business.services || [];

    if (available.length === 0) {
      return {
        type: "interactive_buttons",
        header: `${bizName} Services`.slice(0, 60),
        body: `Please contact our desk for current services and customized packages.`,
        footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
        buttons: [
          { id: "act_human", title: "👤 Talk to Team" },
          { id: "act_main_menu", title: "📌 Main Menu" },
        ],
      };
    }

    const serviceRows = available.slice(0, 9).map((s) => ({
      id: `act_select_service:${s.id}`,
      title: s.name.slice(0, 24),
      description: `₹${s.price || "0"} • ${s.duration || 30} mins`.slice(0, 72),
    }));

    return {
      type: "list",
      header: `${bizName} Rate Card`.slice(0, 60),
      body: `Here are our active services and pricing. Tap any service below to view openings and book:`,
      footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
      listButton: "View Menu & Prices",
      listSections: [
        {
          title: "Services & Rates",
          rows: [
            ...serviceRows,
            { id: "act_main_menu", title: "🔙 Main Menu", description: "Return to main options" },
          ],
        },
      ],
    };
  },

  async handleOpeningHours(business: BusinessContext): Promise<WhatsAppReplyPayload> {
    const bizName = business.name || "Reception Desk";
    const hours = business.businessHoursFormatted || "Mon-Sat: 9:00 AM - 8:00 PM, Sun: Closed";

    return {
      type: "interactive_buttons",
      header: `${bizName} Hours`.slice(0, 60),
      body: `🕒 *Operating Hours for ${bizName}:*\n\n${hours}\n\nWould you like to schedule an appointment during our working hours?`,
      footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
      buttons: [
        { id: "act_book_start", title: "📅 Book Appointment" },
        { id: "act_location", title: "📍 Location" },
        { id: "act_main_menu", title: "📌 Main Menu" },
      ],
    };
  },

  async handleLocation(business: BusinessContext): Promise<WhatsAppReplyPayload> {
    const bizName = business.name || "Reception Desk";
    const address = business.address || "Main Office";
    const mapUrl = business.website || "https://operator.nexxtechnologies.com/";

    return {
      type: "interactive_buttons",
      header: `${bizName} Location`.slice(0, 60),
      body: `📍 *Address & Directions for ${bizName}:*\n\n${address}\n\n🌐 Map / Website: ${mapUrl}`,
      footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
      buttons: [
        { id: "act_book_start", title: "📅 Book Appointment" },
        { id: "act_hours", title: "🕒 Opening Hours" },
        { id: "act_main_menu", title: "📌 Main Menu" },
      ],
    };
  },

  async handleOffers(business: BusinessContext): Promise<WhatsAppReplyPayload> {
    const bizName = business.name || "Operator";

    return {
      type: "interactive_buttons",
      header: `${bizName} Offers`.slice(0, 60),
      body: `🎁 *Current Special Offers & Packages at ${bizName}:*\n\n• First-Time Client Special: 10% off your initial booking\n• Value Consultation Packages: Available across signature services\n\nWould you like to schedule an appointment or browse our services?`,
      footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
      buttons: [
        { id: "act_book_start", title: "📅 Book Now" },
        { id: "act_services_list", title: "📋 View Services" },
        { id: "act_main_menu", title: "📌 Main Menu" },
      ],
    };
  },

  async handleHumanHandover(
    organizationId: string,
    conversationId: string,
    business: BusinessContext
  ): Promise<WhatsAppReplyPayload> {
    const bizName = business.name || "Reception Desk";

    try {
      await sharedBusinessActions.escalateToHuman({
        organizationId,
        conversationId,
        reason: "user_request",
        notes: "Customer requested front desk human handover via WhatsApp",
      });
    } catch (err) {
      console.warn("[Action Dispatcher] Failed to record escalation event:", err);
    }

    return {
      type: "interactive_buttons",
      header: `Front Desk Connected`.slice(0, 60),
      body: `👤 I have alerted our team at *${bizName}*. A team member will join and message you directly here shortly.\n\nIf urgent, you can also call us directly at *${business.phone || "our front desk"}*.`,
      footer: `${bizName} • 24/7 Digital Desk`.slice(0, 60),
      buttons: [
        { id: "act_hours", title: "🕒 Operating Hours" },
        { id: "act_main_menu", title: "📌 Main Menu" },
      ],
    };
  },

  async handleBackNavigation(
    organizationId: string,
    conversationId: string,
    state: WhatsAppConversationState,
    business: BusinessContext,
    senderName: string | undefined
  ): Promise<WhatsAppReplyPayload> {
    switch (state.stage) {
      case "SELECTING_TIME":
        return await this.handleSelectService(organizationId, conversationId, state.draftBooking?.serviceId || "", business);
      case "SELECTING_DATE":
        return await this.handleBookStart(organizationId, conversationId, business);
      case "CONFIRMING_BOOKING":
        return await this.handleSelectDate(organizationId, conversationId, state.draftBooking?.targetDate || "", state.draftBooking?.dateLabel || "", business);
      default:
        await whatsAppStateMachine.resetState(organizationId, conversationId);
        return dynamicExperienceEngine.generateMainMenu(business, {
          customerName: senderName,
          isReturning: true,
          language: state.language || "en",
        });
    }
  },
};
