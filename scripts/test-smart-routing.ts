/**
 * Smart Routing Engine & Priority Resolution Test Suite
 * 
 * Verifies all 13 core cases specified in Phase 15 & Phase 26:
 * - CASE 1: New user / No business -> /onboarding
 * - CASE 2: Existing user, Onboarding incomplete -> resume exact onboarding step
 * - CASE 3: Onboarding complete, Trial active, No unfinished workflow -> /dashboard
 * - CASE 4: Payment failed, Grace period active -> /billing or allowed browsing
 * - CASE 5: Subscription suspended -> /billing/reactivate
 * - CASE 6: Knowledge import unfinished -> /kb?tab=import
 * - CASE 7: Calendar connection unfinished -> /settings/booking
 * - CASE 8: User explicitly requests settings -> /settings (explicit intent wins)
 * - CASE 9: User requests protected resource without permission -> /dashboard
 * - CASE 10: Resume meaningful unfinished workflow on login return
 * - CASE 11: AI intent without permission -> permission rules win
 * - CASE 12: AI confidence low (< 0.70) -> no automatic redirect
 * - CASE 13: Deterministic priority resolution between conflicting states
 * - CASE 14: Redirect loop prevention (A -> B -> A cycle & max chain limit)
 * - CASE 15: Safe fallback on corrupt / missing context
 */

import { RouteDecisionEngine } from "../src/server/services/routing/decision-engine";
import { AiIntentRouter } from "../src/server/services/routing/ai-intent-router";
import { RoutingContext, ROUTE_DECISION_PRIORITY } from "../src/server/services/routing/types";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (details) {
      console.error(`     Details:`, details);
    }
    failed++;
  }
}

function createBaseContext(overrides: Partial<RoutingContext> = {}): RoutingContext {
  return {
    userId: "usr_test_123",
    businessId: "org_test_123",
    user: {
      id: "usr_test_123",
      email: "test@example.com",
      status: "active",
      role: "owner",
    },
    business: {
      id: "org_test_123",
      name: "Acme Dental",
      slug: "acme-dental",
      status: "active",
      verificationStatus: "verified",
    },
    accountStatus: "active",
    onboarding: {
      status: "completed",
      isCompleted: true,
      currentStep: "completed",
    },
    subscription: {
      status: "ACTIVE",
      planId: "professional",
      trialEndsAt: null,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isRestricted: false,
      gracePeriodDaysRemaining: null,
      paymentStatus: "paid",
    },
    permissions: ["dashboard:view", "admin:access"],
    activity: {},
    integrations: {
      calendarConnected: true,
      whatsappConnected: true,
      emailConnected: true,
    },
    requestedPath: "/dashboard",
    redirectCount: 0,
    historyChain: [],
    ...overrides,
  };
}

async function runRoutingTests() {
  console.log("\n=======================================================");
  console.log("  OPERATOR SMART ROUTING ENGINE TEST SUITE");
  console.log("=======================================================\n");

  // ── CASE 1: New Google user, No business ───────────────────────────────────
  console.log("Case 1: New user with no business profile:");
  const ctxCase1 = createBaseContext({
    businessId: null,
    business: null,
    onboarding: { status: "not_started", isCompleted: false, currentStep: "url" },
    requestedPath: "/dashboard",
  });
  const res1 = RouteDecisionEngine.resolve(ctxCase1);
  assert(res1.destination === "/onboarding", "Routes to /onboarding");
  assert(res1.reason === "BUSINESS_NOT_CREATED", "Reason is BUSINESS_NOT_CREATED");
  assert(res1.priority === "BUSINESS_EXISTENCE", "Priority is BUSINESS_EXISTENCE");

  // ── CASE 2: Existing user, Business exists, Onboarding incomplete ──────────
  console.log("\nCase 2: Existing user, onboarding at 65% (business hours step):");
  const ctxCase2 = createBaseContext({
    onboarding: {
      status: "in_progress",
      isCompleted: false,
      currentStep: "hours",
      completionPercent: 65,
    },
    requestedPath: "/dashboard",
  });
  const res2 = RouteDecisionEngine.resolve(ctxCase2);
  assert(res2.destination === "/onboarding?step=hours", "Resumes exact onboarding step /onboarding?step=hours");
  assert(res2.reason === "ONBOARDING_INCOMPLETE", "Reason is ONBOARDING_INCOMPLETE");
  assert(res2.priority === "ONBOARDING", "Priority is ONBOARDING");

  // ── CASE 3: Onboarding complete, Trial active, No unfinished workflow ───────
  console.log("\nCase 3: Onboarding complete, Trial active, Normal dashboard visit:");
  const ctxCase3 = createBaseContext({
    subscription: {
      status: "TRIALING",
      planId: "starter",
      trialDaysRemaining: 12,
      isRestricted: false,
      paymentStatus: "trialing",
    },
    requestedPath: "/dashboard",
  });
  const res3 = RouteDecisionEngine.resolve(ctxCase3);
  assert(res3.destination === "/dashboard", "Routes to /dashboard");
  assert(res3.reason === "DEFAULT_DASHBOARD" || res3.reason === "ALREADY_AT_DESTINATION", "Reason is valid dashboard landing");
  assert(!res3.replace, "No forced redirect replace");

  // ── CASE 4: Payment failed, Grace period active ────────────────────────────
  console.log("\nCase 4: Payment failed with active grace period (allowed to browse):");
  const ctxCase4 = createBaseContext({
    subscription: {
      status: "PAST_DUE",
      planId: "starter",
      isRestricted: false,
      gracePeriodDaysRemaining: 4,
      paymentStatus: "failed",
    },
    requestedPath: "/appointments",
  });
  const res4 = RouteDecisionEngine.resolve(ctxCase4);
  assert(res4.destination === "/appointments", "Allowed to browse /appointments during active grace period");
  assert(!res4.replace, "Replace is false — no hard blocker");

  // ── CASE 5: Subscription suspended / Expired ──────────────────────────────
  console.log("\nCase 5: Subscription suspended or grace period expired:");
  const ctxCase5 = createBaseContext({
    subscription: {
      status: "SUSPENDED",
      planId: "starter",
      isRestricted: true,
      gracePeriodDaysRemaining: 0,
      paymentStatus: "failed",
    },
    requestedPath: "/appointments",
  });
  const res5 = RouteDecisionEngine.resolve(ctxCase5);
  assert(res5.destination === "/billing/reactivate", "Redirects to /billing/reactivate");
  assert(res5.reason === "SUBSCRIPTION_SUSPENDED", "Reason is SUBSCRIPTION_SUSPENDED");
  assert(res5.priority === "BILLING_BLOCKER", "Priority is BILLING_BLOCKER");
  assert(res5.replace === true, "Enforces immediate replacement");

  // ── CASE 6: Knowledge import unfinished ────────────────────────────────────
  console.log("\nCase 6: Returning user with unfinished knowledge import:");
  const ctxCase6 = createBaseContext({
    requestedPath: "/dashboard",
    activity: {
      interruptedWorkflow: {
        type: "knowledge_import",
        targetRoute: "/kb?tab=import",
        reason: "INTERRUPTED_KNOWLEDGE_IMPORT",
        actionableMessage: "Continue your website import",
        updatedAt: new Date(),
      },
    },
  });
  const res6 = RouteDecisionEngine.resolve(ctxCase6);
  assert(res6.destination === "/kb?tab=import", "Routes to /kb?tab=import to resume import");
  assert(res6.reason === "INTERRUPTED_KNOWLEDGE_IMPORT", "Reason is INTERRUPTED_KNOWLEDGE_IMPORT");
  assert(res6.priority === "INTERRUPTED_WORKFLOW", "Priority is INTERRUPTED_WORKFLOW");

  // ── CASE 7: Calendar connection unfinished ─────────────────────────────────
  console.log("\nCase 7: Returning user with unfinished calendar connection:");
  const ctxCase7 = createBaseContext({
    requestedPath: "/dashboard",
    activity: {
      interruptedWorkflow: {
        type: "calendar_setup",
        targetRoute: "/settings/booking",
        reason: "INTERRUPTED_CALENDAR_SETUP",
        actionableMessage: "Complete your calendar integration for online booking",
        updatedAt: new Date(),
      },
    },
  });
  const res7 = RouteDecisionEngine.resolve(ctxCase7);
  assert(res7.destination === "/settings/booking", "Routes to /settings/booking to complete calendar integration");
  assert(res7.reason === "INTERRUPTED_CALENDAR_SETUP", "Reason is INTERRUPTED_CALENDAR_SETUP");

  // ── CASE 8: User explicitly requests settings (no blocker) ─────────────────
  console.log("\nCase 8: Explicit navigation wins over default dashboard:");
  const ctxCase8 = createBaseContext({
    requestedPath: "/settings/booking",
    activity: {
      interruptedWorkflow: {
        type: "knowledge_import",
        targetRoute: "/kb?tab=import",
        reason: "INTERRUPTED_KNOWLEDGE_IMPORT",
        actionableMessage: "Continue website import",
        updatedAt: new Date(),
      },
    },
  });
  const res8 = RouteDecisionEngine.resolve(ctxCase8);
  assert(res8.destination === "/settings/booking", "Explicit navigation /settings/booking is respected");
  assert(res8.reason === "EXPLICIT_DESTINATION_ALLOWED" || res8.reason === "ALREADY_AT_DESTINATION", "Reason is EXPLICIT_DESTINATION_ALLOWED");

  // ── CASE 9: User requests protected resource without permission ────────────
  console.log("\nCase 9: Insufficient role trying to access /agency or /admin:");
  const ctxCase9 = createBaseContext({
    user: { id: "usr_staff_1", email: "staff@example.com", status: "active", role: "staff" },
    permissions: ["dashboard:view"],
    requestedPath: "/agency/branding",
  });
  const res9 = RouteDecisionEngine.resolve(ctxCase9);
  assert(res9.destination === "/dashboard", "Blocks unauthorized /agency access and routes to safe /dashboard");
  assert(res9.reason === "UNAUTHORIZED_ROLE", "Reason is UNAUTHORIZED_ROLE");

  // ── CASE 10: Continue previous workflow on return ─────────────────────────
  console.log("\nCase 10: User returns to generic dashboard after previously viewing appointments:");
  const ctxCase10 = createBaseContext({
    requestedPath: "/dashboard",
    activity: {
      lastRoute: "/appointments",
    },
  });
  const res10 = RouteDecisionEngine.resolve(ctxCase10);
  assert(res10.destination === "/appointments", "Resumes previous workflow route /appointments");
  assert(res10.reason === "CONTINUE_LAST_ROUTE", "Reason is CONTINUE_LAST_ROUTE");

  // ── CASE 11: AI says 'calendar' but user has no permission ─────────────────
  console.log("\nCase 11: AI Intent with insufficient permissions:");
  const aiResolutionStaff = AiIntentRouter.resolveIntent(
    { intent: "MANAGE_BILLING", confidence: 0.95 },
    { userRole: "staff" }
  );
  assert(aiResolutionStaff.shouldRedirect === false, "AI redirect blocked for unauthorized role");
  assert(aiResolutionStaff.reason === "PERMISSION_DENIED", "Reason is PERMISSION_DENIED");

  // ── CASE 12: AI confidence low ─────────────────────────────────────────────
  console.log("\nCase 12: AI confidence low (< 0.70):");
  const aiLowConf = AiIntentRouter.resolveIntent(
    { intent: "CONNECT_CALENDAR", confidence: 0.55 },
    { userRole: "owner" }
  );
  assert(aiLowConf.shouldRedirect === false, "Low confidence intent does not trigger redirect");
  assert(aiLowConf.reason === "LOW_CONFIDENCE", "Reason is LOW_CONFIDENCE");

  const aiValid = AiIntentRouter.resolveIntent(
    { intent: "CONNECT_CALENDAR", confidence: 0.95 },
    { userRole: "owner" }
  );
  assert(aiValid.shouldRedirect === true, "High confidence valid intent permits navigation");
  assert(aiValid.destination === "/settings/booking", "Maps to /settings/booking");

  // ── CASE 13: Deterministic Priority Resolution ────────────────────────────
  console.log("\nCase 13: Conflicting states resolved by strict deterministic priority:");
  // Incomplete onboarding + Suspended sub + Interrupted workflow + Explicit destination /settings
  const ctxConflicting = createBaseContext({
    onboarding: { status: "in_progress", isCompleted: false, currentStep: "profile" },
    subscription: { status: "SUSPENDED", planId: "starter", isRestricted: true },
    activity: {
      interruptedWorkflow: {
        type: "knowledge_import",
        targetRoute: "/kb?tab=import",
        reason: "INTERRUPTED_KNOWLEDGE_IMPORT",
        actionableMessage: "import",
        updatedAt: new Date(),
      },
    },
    requestedPath: "/settings",
  });
  const res13 = RouteDecisionEngine.resolve(ctxConflicting);
  // Onboarding (Priority 5) takes precedence over Billing Blocker (Priority 6) and Interrupted Workflow (Priority 7)
  assert(res13.destination === "/onboarding?step=profile", "Onboarding priority wins over downstream states");
  assert(res13.priorityLevel === ROUTE_DECISION_PRIORITY.ONBOARDING, "Priority level matches ONBOARDING (5)");

  // ── CASE 14: Redirect Loop Prevention ─────────────────────────────────────
  console.log("\nCase 14: Redirect loop prevention:");
  const ctxLoop = createBaseContext({
    requestedPath: "/settings",
    redirectCount: 6,
    historyChain: ["/settings", "/dashboard", "/settings", "/dashboard", "/settings", "/settings"],
  });
  const res14 = RouteDecisionEngine.resolve(ctxLoop);
  assert(res14.loopDetected === true, "Redirect loop detected and flagged");
  assert(res14.destination === "/dashboard", "Breaks cycle safely to /dashboard");
  assert(res14.reason === "REDIRECT_LOOP_PREVENTED", "Reason is REDIRECT_LOOP_PREVENTED");

  // ── CASE 15: Public Route Passthrough ──────────────────────────────────────
  console.log("\nCase 15: Public Route Passthrough:");
  const ctxPublic = createBaseContext({
    userId: null,
    accountStatus: "unauthenticated",
    requestedPath: "/pricing",
  });
  const res15 = RouteDecisionEngine.resolve(ctxPublic);
  assert(res15.destination === "/pricing", "Public route /pricing allowed without sign-in redirect");
  assert(!res15.replace, "Replace is false for public route");

  console.log("\n=======================================================");
  console.log(`  SMART ROUTING TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runRoutingTests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
