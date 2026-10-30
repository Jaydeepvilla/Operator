/**
 * Central plain-language copy dictionary for Operator.
 * Reading level: 12-year-old. Short sentences, verbs on buttons, zero jargon.
 * All customer-facing labels, empty states, and helper tooltips are maintained here.
 */

export const COPY = {
  // Navigation & Shell
  nav: {
    home: "Home",
    messages: "Messages",
    appointments: "Appointments",
    customers: "Customers",
    needsAttention: "Needs Your Attention",
    trainAssistant: "Train Your Assistant",
    connect: "Connect",
    reports: "Reports",
    settings: "Settings",
    help: "Help",
    advanced: "Advanced",
  },

  // Assistant status
  status: {
    on: "ON",
    paused: "PAUSED",
    needsSetup: "NEEDS SETUP",
    pauseSwitch: "Pause Assistant",
    resumeSwitch: "Turn Assistant ON",
    answeringToday: (count: number) =>
      count === 1
        ? "Your assistant is ON. It has answered 1 message today."
        : `Your assistant is ON. It has answered ${count} messages today.`,
    pausedMessage: "Your assistant is PAUSED. Messages will wait for your team.",
    needsSetupMessage: "Your assistant needs basic setup before answering customers.",
  },

  // Home Screen
  home: {
    nextStepTitle: "Your Next Step",
    checklistTitle: "Setup Checklist",
    numbersTitle: "Activity",
    tryItTitle: "Try It Yourself",
    testMessageButton: "Send a test message",
    testCallButton: "Make a test call",
    availableOnPro: "Available on Pro",
    emptyMetrics: "No activity yet. Send a test message to see it here.",
    metrics: {
      messagesAnswered: "Messages answered",
      appointmentsBooked: "Appointments booked",
      needsHuman: "Needs a human",
      callsAnswered: "Calls answered",
    },
    attentionEmpty: "All clear! No customers or bookings currently need your attention.",
  },

  // Tone of voice before/after samples
  tones: {
    friendly: {
      id: "warm",
      name: "Friendly & Warm",
      description: "Welcoming and conversational. Makes every caller feel personally cared for.",
      sampleQuestion: "Do you have any appointments available tomorrow afternoon?",
      sampleReply: "Hi! Yes, we do! I'd love to help you book that. We have openings at 2:00 PM and 4:30 PM with Priya. Would either of those work nicely for you?",
    },
    professional: {
      id: "professional",
      name: "Professional & Polished",
      description: "Courteous, calm, and formal. Ideal for medical practices and legal offices.",
      sampleQuestion: "Do you have any appointments available tomorrow afternoon?",
      sampleReply: "Good day. Yes, we have availability tomorrow afternoon. We can schedule you at 2:00 PM or 4:30 PM. Please let me know which time is most convenient.",
    },
    direct: {
      id: "concise",
      name: "Short & Direct",
      description: "Quick, concise answers. Best for busy shops where callers want fast info.",
      sampleQuestion: "Do you have any appointments available tomorrow afternoon?",
      sampleReply: "Yes. Tomorrow we have slots at 2:00 PM and 4:30 PM. Which one would you like to reserve?",
    },
  },

  // Empty states across key pages
  emptyStates: {
    messages: {
      title: "No messages yet",
      description: "When customers message your website or WhatsApp, they will appear here.",
      example: "E.g. A client asks: 'What time do you close tonight?' and your assistant answers instantly.",
      actionText: "Send a test message",
    },
    appointments: {
      title: "No appointments scheduled",
      description: "Upcoming customer bookings scheduled by your assistant or staff will appear here.",
      example: "E.g. Sarah Connor — Haircut & Styling, Tomorrow at 2:00 PM.",
      actionText: "Add an appointment",
    },
    customers: {
      title: "No customers saved yet",
      description: "Your assistant automatically saves contact details when customers chat or book.",
      example: "E.g. John Doe — +1 (555) 234-5678, 2 bookings.",
      actionText: "Add a customer",
    },
    needsAttention: {
      title: "All caught up!",
      description: "When a customer asks for a manager, has a booking conflict, or needs a human touch, it will appear here.",
      example: "E.g. A customer asks for a custom refund or requests a staff member not on the schedule.",
      actionText: "View recent activity",
    },
    services: {
      title: "No services yet",
      description: "Add what customers can book, including duration and price.",
      example: "E.g. 'Haircut, 30 minutes, ₹500' or 'Consultation, 45 minutes, $90'.",
      actionText: "Add a service",
      fillExampleText: "Fill sample services",
    },
    documents: {
      title: "No documents uploaded",
      description: "Upload price lists, service menus, or clinic policies so your assistant gives accurate answers.",
      example: "E.g. Upload a PDF of your menu, or paste your cancellation policy.",
      actionText: "Upload a document",
    },
    faqs: {
      title: "No questions added yet",
      description: "Add answers to common questions your customers ask every day.",
      example: "E.g. 'Where can I park?' -> 'Free street parking is available behind our building.'",
      actionText: "Add a question",
      fillExampleText: "Fill common questions",
    },
  },

  // Field helpers with realistic examples
  helpers: {
    cancellationPolicy: "Example: 'Free cancellation up to 24 hours in advance. After that, a 50% fee applies.'",
    operatingHours: "Your assistant uses your hours so it never books appointments when you are closed.",
    serviceName: "Example: 'Dental Cleaning', 'Women\'s Haircut', '30-Min Legal Consultation'",
    servicePrice: "What the customer pays. Set to 0 if free consultation.",
    serviceDuration: "How long the slot takes in minutes (e.g. 30, 45, 60).",
    businessDescription: "Example: 'Modern family dental practice offering cleanings, crowns, and emergency dental care in downtown Austin.'",
    greetingMessage: "The first sentence your assistant says when answering the phone or web chat.",
  },

  // Plan gating labels
  plans: {
    phoneLockedBadge: "Available on Pro",
    phoneLockedExplanation: "Upgrade to Pro to let Operator answer your phone calls 24/7.",
    upgradeToPro: "Upgrade to Pro",
    minutesUsed: (used: number, total: number) => `${used} of ${total} phone minutes used this month`,
  },
} as const;

