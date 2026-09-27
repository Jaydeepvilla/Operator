/**
 * Smart Routing Engine — Types & Contracts
 * 
 * Defines server-authoritative routing context, deterministic priority levels,
 * decision structures, and event taxonomy.
 */

export const ROUTE_DECISION_PRIORITY = {
  AUTHENTICATION: 1,
  BUSINESS_EXISTENCE: 2,
  SECURITY_AUTHORIZATION: 3,
  REQUIRED_ACCOUNT_ACTION: 4,
  ONBOARDING: 5,
  BILLING_BLOCKER: 6,
  INTERRUPTED_WORKFLOW: 7,
  EXPLICIT_DESTINATION: 8,
  CONTINUE_PREVIOUS_WORKFLOW: 9,
  ACTIVITY_RECOMMENDATION: 10,
  DEFAULT_DASHBOARD: 11,
} as const;

export type RouteDecisionPriorityName = keyof typeof ROUTE_DECISION_PRIORITY;
export type RouteDecisionPriorityLevel = typeof ROUTE_DECISION_PRIORITY[RouteDecisionPriorityName];

export type RouteDecisionReason =
  | "UNAUTHENTICATED"
  | "SESSION_EXPIRED"
  | "BUSINESS_NOT_CREATED"
  | "ACCOUNT_SUSPENDED"
  | "UNAUTHORIZED_ROLE"
  | "PERMISSION_DENIED"
  | "REQUIRED_VERIFICATION"
  | "ONBOARDING_INCOMPLETE"
  | "ONBOARDING_ALREADY_COMPLETED"
  | "SUBSCRIPTION_SUSPENDED"
  | "SUBSCRIPTION_EXPIRED"
  | "PAYMENT_FAILED_GRACE_EXPIRED"
  | "PAYMENT_FAILED_GRACE_ACTIVE"
  | "INTERRUPTED_KNOWLEDGE_IMPORT"
  | "INTERRUPTED_CALENDAR_SETUP"
  | "INTERRUPTED_AI_SETUP"
  | "INTERRUPTED_ONBOARDING_STEP"
  | "EXPLICIT_DESTINATION_ALLOWED"
  | "CONTINUE_LAST_ROUTE"
  | "ACTIVITY_RECOMMENDATION"
  | "DEFAULT_DASHBOARD"
  | "ALREADY_AT_DESTINATION"
  | "REDIRECT_LOOP_PREVENTED"
  | "FALLBACK_SAFE_ROUTE";

export type MeaningfulEventType =
  | "BUSINESS_CREATED"
  | "BUSINESS_PROFILE_COMPLETED"
  | "SERVICES_CREATED"
  | "BUSINESS_HOURS_COMPLETED"
  | "KNOWLEDGE_CREATED"
  | "WEBSITE_IMPORT_STARTED"
  | "WEBSITE_IMPORT_COMPLETED"
  | "AI_SETUP_STARTED"
  | "AI_SETUP_COMPLETED"
  | "CALENDAR_CONNECTED"
  | "CALENDAR_DISCONNECTED"
  | "FIRST_CONVERSATION"
  | "FIRST_BOOKING"
  | "INTEGRATION_CONNECTED"
  | "SUBSCRIPTION_STARTED"
  | "PAYMENT_FAILED"
  | "PAYMENT_RECOVERED"
  | "BILLING_VIEWED"
  | "SETTINGS_CHANGED"
  | "ONBOARDING_INTERRUPTED"
  | "ONBOARDING_RESUMED";

export interface InterruptedWorkflow {
  type: "knowledge_import" | "calendar_setup" | "ai_setup" | "onboarding";
  targetRoute: string;
  reason: RouteDecisionReason;
  actionableMessage: string;
  metadata?: Record<string, any>;
  updatedAt: Date;
}

export interface RoutingContext {
  userId: string | null;
  businessId: string | null;

  user?: {
    id: string;
    email: string;
    status: string;
    role?: string;
  } | null;

  business?: {
    id: string;
    name: string;
    slug: string;
    status?: string;
    verificationStatus?: string;
  } | null;

  accountStatus: "active" | "suspended" | "pending_verification" | "unauthenticated" | "unknown";

  onboarding: {
    status: "not_started" | "in_progress" | "completed" | "skipped";
    isCompleted: boolean;
    currentStep: string;
    requiredSteps?: string[];
    lastCompletedStep?: string;
    completionPercent?: number;
  };

  subscription: {
    status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "PAYMENT_FAILED" | "CANCELING" | "CANCELED" | "EXPIRED" | "SUSPENDED" | "NONE";
    planId: string;
    trialEndsAt?: Date | null;
    trialDaysRemaining?: number;
    currentPeriodEnd?: Date | null;
    isRestricted: boolean;
    gracePeriodDaysRemaining?: number | null;
    paymentStatus?: "paid" | "past_due" | "failed" | "trialing";
  };

  permissions: string[];

  activity: {
    lastRoute?: string | null;
    lastMeaningfulAction?: MeaningfulEventType | null;
    lastMeaningfulActionAt?: Date | null;
    interruptedWorkflow?: InterruptedWorkflow | null;
    pendingAction?: string | null;
  };

  integrations: {
    calendarConnected: boolean;
    whatsappConnected: boolean;
    emailConnected: boolean;
  };

  requestedPath: string;
  redirectCount?: number;
  historyChain?: string[];
}

export interface RouteDecision {
  destination: string;
  reason: RouteDecisionReason;
  priority: RouteDecisionPriorityName;
  priorityLevel: RouteDecisionPriorityLevel;
  replace: boolean;
  state?: Record<string, any>;
  loopDetected?: boolean;
}
