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

    // ─── 1. WHAT'S NEXT? (Consume Recommendation Engine) ───────────────────────
    try {
      const nextAction = getNextBestAction(state as any);
      if (nextAction) {
        notifications.push({
          ...baseFields(`whats-next-${nextAction.id}`, "setup", "info", "high"),
          title: `Next Up: ${nextAction.title}`,
          description: nextAction.description,
          actionUrl: nextAction.primaryCtaHref,
          metadata: {
            ruleId: `whats-next-${nextAction.id}`,
            sourceEngine: "recommendation",
            businessImpact: nextAction.impactReason,
            actionText: nextAction.primaryCtaText,
            reason: nextAction.description,
            estimatedMinutes: nextAction.estimatedTimeMinutes,
          },
        });
      }
    } catch (err) {
      console.error("Rules: Failed next-action evaluation", err);
    }

    // ─── 2. DON'T FORGET (Setup Remaining Tasks) ───────────────────────────────
    try {
      const remainingTasks = ProgressEngine.getRemainingTasks(state as any);
      for (const t of remainingTasks) {
        notifications.push({
          ...baseFields(`setup-remaining-${t.task.toLowerCase().replace(/\s+/g, "-")}`, "setup", "warning", "medium"),
          title: `Don't Forget: ${t.task}`,
          description: `Complete the ${t.category.replace("_", " ")} configuration to unlock full AI potential.`,
          actionUrl: getSetupHref(t.category),
          metadata: {
            ruleId: `setup-remaining-${t.task.toLowerCase().replace(/\s+/g, "-")}`,
            sourceEngine: "progress",
            businessImpact: "Improves your setup completion score and AI answer accuracy.",
            actionText: "Configure Now",
            reason: "Required setup steps are incomplete.",
            estimatedMinutes: t.estimatedMinutes || 5,
          },
        });
      }
    } catch (err) {
      console.error("Rules: Failed setup reminders evaluation", err);
    }

    // ─── 3. BUSINESS NEEDS ATTENTION (Critical issues) ────────────────────────
    try {
      const health = calculateOverallHealth(state as any);
      const readiness = calculateGlobalAIReadiness(state as any);

      // A. Missing Business Hours
      const hasHours = Object.keys(state.settings?.businessHours || {}).length > 0;
      if (!hasHours) {
        notifications.push({
          ...baseFields("business-hours-missing", "alert", "critical", "urgent"),
          title: "Missing Business Hours",
          description: "No business hours are configured. The AI Receptionist cannot inform clients of opening times or schedule bookings properly.",
          actionUrl: "/settings",
          metadata: {
            ruleId: "business-hours-missing",
            sourceEngine: "health",
            businessImpact: "Prevents no-shows, calendar conflicts, and booking drops.",
            actionText: "Configure Hours",
            reason: "Business hours are required for calendar setup.",
          },
        });
      }

      // B. Missing Policies
      const docs = state.documents || [];
      const hasCancellation = docs.some((d: any) => /cancel/i.test(d.title || d.name || ""));
      if (!hasCancellation) {
        notifications.push({
          ...baseFields("policy-cancellation-missing", "alert", "warning", "high"),
          title: "Cancellation Policy Missing",
          description: "Document a cancellation policy to handle booking withdrawals smoothly and establish rules for clients.",
          actionUrl: "/kb",
          metadata: {
            ruleId: "policy-cancellation-missing",
            sourceEngine: "health",
            businessImpact: "Establishes clear boundaries and mitigates booking loss.",
            actionText: "Add Cancellation Policy",
            reason: "Standard business document missing in knowledge base.",
          },
        });
      }

      // C. Broken Integrations (e.g. settings integrations status)
      // Check if stripe status is failed/disconnected based on settings if present
      const isStripeBroken = state.settings?.stripeConfigured === false || state.settings?.stripeStatus === "error";
      if (isStripeBroken) {
        notifications.push({
          ...baseFields("stripe-integration-broken", "alert", "critical", "urgent"),
          title: "Stripe Connection Error",
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

      // D. Low AI Readiness
      if (readiness.overallScore < 50) {
        notifications.push({
          ...baseFields("ai-readiness-low", "alert", "warning", "high"),
          title: "Low AI Readiness",
          description: `Your AI Readiness score is only ${readiness.overallScore}%. The AI requires more business details to operate effectively.`,
          actionUrl: "/kb",
          metadata: {
            ruleId: "ai-readiness-low",
            sourceEngine: "readiness",
            businessImpact: "Improves customer booking success rate and resolution quality.",
            actionText: "Train AI",
            reason: "Knowledge base or FAQs are empty.",
          },
        });
      }

      // E. Health Score Drop
      if (health.overallScore < 70) {
        notifications.push({
          ...baseFields("health-score-low", "alert", "warning", "high"),
          title: "Setup Health Needs Improvement",
          description: `Your health score is currently ${health.overallScore}/100. Resolve configuration warnings below.`,
          actionUrl: "/health",
          metadata: {
            ruleId: "health-score-low",
            sourceEngine: "health",
            businessImpact: "Restores maximum receptionist capabilities and channels.",
            actionText: "Review Health Status",
            reason: "Critical configuration items are missing.",
          },
        });
      }

      // F. Booking Issues
      const hasBookingPreferences = !!state.settings?.bookingPreferences;
      if (!hasBookingPreferences) {
        notifications.push({
          ...baseFields("booking-preferences-missing", "alert", "critical", "urgent"),
          title: "Booking Preferences Required",
          description: "Set up scheduling time increments, buffer times, and calendars before accepting live requests.",
          actionUrl: "/settings",
          metadata: {
            ruleId: "booking-preferences-missing",
            sourceEngine: "health",
            businessImpact: "Safeguards staff schedules from accidental double-bookings.",
            actionText: "Set Preferences",
            reason: "Incomplete calendar automation config.",
          },
        });
      }
    } catch (err) {
      console.error("Rules: Failed critical warnings evaluation", err);
    }

    // ─── 4. AI IMPROVEMENT AVAILABLE ──────────────────────────────────────────
    try {
      const ops = getAutomationOpportunities(state as any);
      for (const op of ops) {
        notifications.push({
          ...baseFields(`ai-improvement-${op.id}`, "ai_improvement", "info", "medium"),
          title: `Improvement: ${op.title}`,
          description: op.description,
          actionUrl: op.primaryCtaHref,
          metadata: {
            ruleId: `ai-improvement-${op.id}`,
            sourceEngine: "automation",
            businessImpact: op.impactReason,
            actionText: op.primaryCtaText,
            reason: "AI detected an upgrade opportunity.",
            estimatedMinutes: op.estimatedTimeMinutes,
          },
        });
      }
    } catch (err) {
      console.error("Rules: Failed AI improvements evaluation", err);
    }

    // ─── 5. WEBSITE CHANGED ────────────────────────────────────────────────────
    try {
      const websiteUrl = state.organization?.website || state.settings?.websiteImportUrl;
      const isImported = state.settings?.websiteImportStatus === "completed";

      // If imported, but last scraped/imported is over 7 days ago
      if (websiteUrl && isImported) {
        const lastSync = state.settings?.websiteLastImportedAt
          ? new Date(state.settings.websiteLastImportedAt)
          : new Date();
        const diffDays = Math.ceil((Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays >= 7) {
          notifications.push({
            ...baseFields("website-sync-outdated", "website_change", "info", "low"),
            title: "Sync Website Context",
            description: "Your website content was last imported over a week ago. Sync again to reflect any pricing or page updates.",
            actionUrl: "/settings",
            metadata: {
              ruleId: "website-sync-outdated",
              sourceEngine: "website",
              businessImpact: "Ensures the AI doesn't quote outdated pricing or services.",
              actionText: "Sync Now",
              reason: "Scraped website data is stale.",
            },
          });
        }
      }
    } catch (err) {
      console.error("Rules: Failed website-change evaluation", err);
    }

    // ─── 6. KNOWLEDGE OUTDATED ─────────────────────────────────────────────────
    try {
      const kbRecs = getKnowledgeEngineRecommendations(state as any);
      for (const rec of kbRecs) {
        notifications.push({
          ...baseFields(`knowledge-outdated-${rec.id}`, "knowledge", "info", "medium"),
          title: rec.title,
          description: rec.description,
          actionUrl: rec.primaryCtaHref,
          metadata: {
            ruleId: `knowledge-outdated-${rec.id}`,
            sourceEngine: "knowledge",
            businessImpact: rec.impactReason,
            actionText: rec.primaryCtaText,
            reason: "Weak, duplicate, or mismatched knowledge content found.",
            estimatedMinutes: rec.estimatedTimeMinutes,
          },
        });
      }
    } catch (err) {
      console.error("Rules: Failed knowledge outdated evaluation", err);
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
