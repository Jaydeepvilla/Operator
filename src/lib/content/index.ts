/**
 * Operator Canonical Content System & Terminology Layer
 * 
 * Quality Standards:
 * 1. PURPOSEFUL: Every string helps the user accomplish their business objective.
 * 2. CONCISE: No corporate filler, conversational padding, or unnecessary words.
 * 3. CONVERSATIONAL: Sounds like a calm, capable, professional human partner.
 * 4. CLEAR: Explicitly communicates what happened, why it matters, and next steps.
 * 
 * Single Source of Truth for UX writing and vocabulary consistency across Operator.
 */

// ── Controlled Vocabulary ──────────────────────────────────────────────────
export const OPERATOR_TERMS = {
  // Business entity (Always 'Business' in customer UI, never 'workspace', 'organization', 'company')
  business: "Business",
  businessName: "Business name",
  businessDetails: "Business details",
  businessSettings: "Business settings",
  businessProfile: "Business profile",

  // Core Product & AI Receptionist (Never 'bot', 'chatbot', or 'virtual assistant')
  productName: "Operator",
  productAiName: "Operator AI",
  receptionist: "AI Receptionist",
  aiVoiceReceptionist: "AI Voice Receptionist",
  knowledgeBase: "Knowledge Base",

  // Bookings & Telephony
  appointment: "Appointment",
  appointments: "Appointments",
  voiceMinutes: "Voice AI Minutes",
  conversations: "Conversations",
  lead: "Lead",
  leads: "Leads",

  // Account & Permissions
  owner: "Owner",
  admin: "Administrator",
  manager: "Manager",
  staff: "Team Member",

  // Subscriptions & Plans
  plan: "Plan",
  subscription: "Subscription",
  billing: "Billing",
  trial: "Trial",
} as const;

// ── Action Buttons & CTAs ──────────────────────────────────────────────────
export const ACTIONS = {
  // Generic / Setup
  saveChanges: "Save changes",
  saving: "Saving...",
  createBusiness: "Create business",
  continueSetup: "Continue setup",
  completeSetup: "Complete setup",
  cancel: "Cancel",
  close: "Close",
  gotIt: "Got it",
  retry: "Try again",
  refresh: "Refresh page",

  // Appointments
  bookAppointment: "Book appointment",
  rescheduleAppointment: "Reschedule appointment",
  cancelAppointment: "Cancel appointment",

  // Knowledge Base
  addDocument: "Add document",
  importWebsite: "Import from website",
  saveArticle: "Save article",

  // Billing
  upgradePlan: "Upgrade plan",
  switchPlan: (planName: string) => `Switch to ${planName}`,
  reactivateSubscription: "Reactivate subscription",
  cancelSubscription: "Cancel subscription",
  confirmCancellation: "Confirm cancellation",
  keepSubscription: "Keep subscription",
  updatePaymentMethod: "Update payment method",

  // Integrations
  connectCalendar: "Connect Google Calendar",
  disconnectCalendar: "Disconnect calendar",
  keepConnected: "Keep connected",
} as const;

// ── Standard System Errors ────────────────────────────────────────────────
export const ERRORS = {
  generic: "We couldn't complete this action. Try again.",
  network: "Network connection lost. Check your internet connection and try again.",
  sessionExpired: "Your session expired. Sign in again to continue.",
  forbidden: "You don't have permission to perform this action. Contact your business administrator.",
  notFound: "The requested item could not be found.",
  rateLimit: "Too many requests. Wait a moment before trying again.",
  databaseUnavailable: "Service is temporarily unavailable. Try again in a few moments.",
  
  // Auth errors
  invalidCredentials: "Incorrect email or password. Check your details and try again.",
  accountLocked: "Your account is temporarily locked due to multiple failed sign-in attempts.",
  emailExists: "An account with this email address already exists. Sign in instead.",
  passwordWeak: "Choose a password with at least 8 characters including letters and numbers.",
  passwordsMismatch: "Passwords do not match. Check both fields and try again.",
  
  // Billing errors
  paymentFailed: "We couldn't process your payment. Check your card details or use another payment method.",
  cardDeclined: "Your payment card was declined. Verify your card details or try a different card.",
  cardExpired: "Your card has expired. Update your payment method to continue.",
  insufficientFunds: "Payment failed due to insufficient funds. Try another payment method.",
  billingUnavailable: "Billing service is temporarily unavailable. Try again shortly.",
} as const;

// ── Empty States ──────────────────────────────────────────────────────────
export const EMPTY_STATES = {
  conversations: {
    title: "No conversations yet",
    description: "Your AI receptionist will log customer conversations here as soon as incoming calls or website chats begin.",
    action: "Test your AI receptionist",
  },
  appointments: {
    title: "No appointments scheduled",
    description: "Upcoming customer bookings scheduled by your AI receptionist will appear here.",
    action: "Connect your calendar",
  },
  knowledgeBase: {
    title: "Knowledge Base is empty",
    description: "Teach your AI receptionist about your business hours, services, and frequently asked questions.",
    action: "Add your first document",
  },
  invoices: {
    title: "No invoices yet",
    description: "Your invoices and receipts will appear here after your first billing cycle.",
  },
  contacts: {
    title: "No contacts found",
    description: "Customer contacts and qualified leads captured by your AI receptionist will appear here.",
  },
  channels: {
    title: "No active channels",
    description: "Connect your website widget, phone number, or social messaging to start handling customer inquiries.",
    action: "Add a channel",
  },
} as const;

// ── Loading States ────────────────────────────────────────────────────────
export const LOADING_STATES = {
  loading: "Loading...",
  loadingConversations: "Loading conversations...",
  loadingAppointments: "Loading appointments...",
  loadingKnowledge: "Loading knowledge documents...",
  savingBusiness: "Saving business details...",
  connectingCalendar: "Connecting your calendar...",
  importingWebsite: "Importing website content...",
  processingPayment: "Processing payment...",
  updatingPlan: "Updating your plan...",
} as const;

// ── Billing & Usage Messages ──────────────────────────────────────────────
export const BILLING_MESSAGES = {
  trialActive: (daysRemaining: number) => 
    `14-day free trial active (${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} remaining). Full features enabled.`,
  trialEnded: "Your free trial has ended. Choose a plan to keep your AI receptionist active.",
  cancelingActive: (periodEndDate: string) => 
    `Your plan remains active until ${periodEndDate}. Scheduled cancellation will take effect at that time.`,
  pastDueGrace: (daysRemaining: number) => 
    `Payment failed. You have ${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} remaining in your grace period before service suspension.`,
  suspended: "Your service is suspended due to unpaid invoices. Update your payment method to restore live call handling immediately.",
  
  // Usage threshold alerts
  usage80: (used: number, limit: number) => ({
    title: "Approaching monthly conversation limit",
    description: `You've used ${used.toLocaleString()} of your ${limit.toLocaleString()} monthly conversations (80%).`,
  }),
  usage90: (used: number, limit: number) => ({
    title: "90% of monthly conversation limit used",
    description: `You've used ${used.toLocaleString()} of your ${limit.toLocaleString()} conversations. Consider upgrading to avoid call handling interruptions.`,
  }),
  usage100: (limit: number) => ({
    title: "Monthly conversation limit reached",
    description: `You've used all ${limit.toLocaleString()} included conversations for this billing period. Upgrade your plan to resume AI call handling.`,
  }),
} as const;
