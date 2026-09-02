import { SetupState } from "../setup-engine/types";
import { BusinessState } from "../health-engine/types";
import { calculateOverallHealth } from "../health-engine/overall";
import { calculateGlobalAIReadiness } from "../ai-readiness-engine";
import { getNextBestAction } from "../recommendation-engine/engine";
import { ProgressEngine } from "../progress-engine";
import { getAutomationOpportunities } from "../automation-engine";
import { getKnowledgeEngineRecommendations } from "../knowledge-engine";
import { SmartNotification } from "./types";

export type RulesEngineState = SetupState & BusinessState;

export const NotificationRulesEngine = {
  /**
   * Evaluates the active setup and business configuration state,
   * triggering targeted smart notifications based on rules.
   */
  evaluateRules(orgId: string, state: RulesEngineState): Omit<SmartNotification, "id" | "isRead" | "isDismissed" | "createdAt" | "updatedAt">[] {
    const notifications: Omit<SmartNotification, "id" | "isRead" | "isDismissed" | "createdAt" | "updatedAt">[] = [];

    // Helper to generate key-based metadata and expiration (standard 14 days expiration)
    const baseFields = (ruleId: string, category: SmartNotification["category"], severity: SmartNotification["severity"], priority: SmartNotification["priority"]) => ({
      organizationId: orgId,
      category,
      severity,
      priority,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        ruleId,
        sourceEngine: "notification-rules",
      },
    });

    // ─── 1. ONBOARDING WELCOME (Single, clean prompt if workspace is new) ────
    try {
      const isCompleted = state.organization?.onboardingStatus === "completed";
      const hasActivity = (state.leads?.length || 0) > 0 || (state.appointments?.length || 0) > 0;

      if (!hasActivity) {
        notifications.push({
          ...baseFields("welcome-onboarding", "setup", "info", "high"),
          title: "Welcome to Operator",
          description: "Your 24/7 AI Receptionist is active. Review your business details and services anytime.",
          actionUrl: "/profile",
          metadata: {
            ruleId: "welcome-onboarding",
            sourceEngine: "onboarding",
            businessImpact: "Ensures accurate AI greetings and smooth customer bookings.",
            actionText: "Review Profile",
            reason: "Initial workspace welcome.",
            estimatedMinutes: 2,
          },
        });
      }
    } catch (err) {
      console.error("Rules: Failed welcome evaluation", err);
    }

    // ─── 2. SYSTEM INTEGRATION ALERTS (Only if explicitly broken) ──────────────
    try {
      const isStripeBroken = state.settings?.stripeStatus === "error";
      if (isStripeBroken) {
        notifications.push({
          ...baseFields("stripe-integration-broken", "alert", "critical", "urgent"),
          title: "Payment Gateway Needs Attention",
          description: "Your payment portal integration has errors. Customers may fail to complete deposit bookings.",
          actionUrl: "/billing",
          metadata: {
            ruleId: "stripe-integration-broken",
            sourceEngine: "billing",
            businessImpact: "Direct booking and payment transactions blocked.",
            actionText: "Reconnect Stripe",
            reason: "Broken payment gateway connector.",
          },
        });
      }
    } catch (err) {
      console.error("Rules: Failed critical warnings evaluation", err);
    }

    return notifications;
  }
};

// Helper mapper for categories to paths
function getSetupHref(category: string): string {
  const map: Record<string, string> = {
    business_profile: "/profile",
    website_import: "/settings",
    knowledge_base: "/kb",
    services: "/services",
    business_hours: "/settings",
  };
  return map[category] || "/settings";
}
