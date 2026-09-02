/**
 * Canonical Application Routes
 * Single source of truth for all internal navigation, dashboard quick actions, and deep links.
 */
export const APP_ROUTES = {
  // ── Core Dashboard & Intelligence ──
  dashboard: "/dashboard",
  intelligence: "/intelligence",
  inbox: "/inbox",
  conversations: "/conversations",
  analytics: "/analytics",
  health: "/health",

  // ── Customers & Booking ──
  contacts: "/contacts",
  leads: "/leads",
  appointments: "/appointments",
  escalations: "/escalations",

  // ── Operator AI Knowledge & Tools ──
  channels: "/channels",
  voice: "/voice",
  voiceDashboard: "/voice/dashboard",
  voiceHistory: "/voice/history",
  voiceSettings: "/voice/settings",
  kb: "/kb",
  faqs: "/faqs",
  automations: "/automations",
  flows: "/flows",
  templates: "/templates",
  widget: "/widget",

  // ── Business Settings & Organization ──
  profile: "/profile",
  services: "/services",
  staff: "/staff",
  team: "/team",
  settings: "/settings",
  settingsAccount: "/settings/account",
  settingsAi: "/settings/ai",
  settingsBooking: "/settings/booking",
  settingsBookingDeposits: "/settings/booking/deposits",
  settingsLocalization: "/settings/localization",
  settingsRules: "/settings/rules",
  settingsAuditLogs: "/settings/audit-logs",
  billing: "/billing",
  setup: "/setup",
  adminUsers: "/admin/users",

  // ── Agency Reseller Portal ──
  agencyDashboard: "/agency/dashboard",
  agencyClients: "/agency/clients",
  agencyBranding: "/agency/branding",
  agencyDomains: "/agency/domains",
  agencyTeam: "/agency/team",
  agencyBilling: "/agency/billing",

  // ── Authentication & Security ──
  signIn: "/sign-in",
  signUp: "/sign-up",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  verifyEmail: "/verify-email",
  twoFactor: "/two-factor",
  accountLocked: "/account-locked",
  sessionExpired: "/session-expired",
  emailSent: "/email-sent",
  emailVerified: "/email-verified",

  // ── Public & Onboarding ──
  home: "/",
  onboarding: "/onboarding",
  pricing: "/pricing",
  integrations: "/integrations",
  features: "/features",
  docs: "/docs",
  demo: "/demo",
  contact: "/contact",
  changelog: "/changelog",
  about: "/about",
  privacy: "/privacy",
  terms: "/terms",
  security: "/security",
} as const;

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];

/**
 * Set of all valid registered internal route paths.
 */
export const VALID_INTERNAL_ROUTES = new Set<string>(Object.values(APP_ROUTES));

/**
 * Helper to validate whether a candidate pathname is a registered application route.
 * Handles query strings and trailing slashes gracefully.
 */
export function isValidAppRoute(candidateUrl?: string | null): boolean {
  if (!candidateUrl || typeof candidateUrl !== "string") return false;
  
  // Extract path without query parameters or hash
  const pathWithoutQuery = candidateUrl.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  
  return VALID_INTERNAL_ROUTES.has(pathWithoutQuery as any);
}
