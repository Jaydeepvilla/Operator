import { db } from "../../db";
import { eq, and } from "drizzle-orm";
import {
  billingEvents,
  smartNotifications,
  organizations,
} from "../../db/schema";
import { subscriptionEngine } from "./subscription-engine";
import { entitlementService } from "./entitlement-service";

export type TrialReminderKey =
  | "TRIAL_STARTED"
  | "TRIAL_PROGRESS_DAY_3"
  | "TRIAL_MID_DAY_7"
  | "TRIAL_REMINDER_DAY_10"
  | "TRIAL_REMINDER_DAY_12"
  | "TRIAL_REMINDER_DAY_13_24H"
  | "TRIAL_REMINDER_DAY_14"
  | "TRIAL_EXPIRED_PAYMENT_REQUIRED"
  | "USAGE_WARNING_80"
  | "USAGE_WARNING_90";

export interface TrialReminderContext {
  reminderKey: TrialReminderKey;
  title: string;
  description: string;
  category: "setup" | "alert" | "ai_improvement";
  priority: "low" | "medium" | "high" | "urgent";
  severity: "info" | "warning" | "critical";
  actionUrl: string;
}

export class TrialReminderEngine {
  /**
   * Evaluates dynamic trial conditions and dispatches smart, non-duplicative notifications.
   */
  async evaluateOrganizationReminders(organizationId: string): Promise<TrialReminderContext[]> {
    const status = await subscriptionEngine.getSubscriptionStatus(organizationId);

    // Only process reminders for TRIALING or EXPIRED or PAST_DUE subscriptions
    if (status.state !== "TRIALING" && status.state !== "EXPIRED" && status.state !== "PAST_DUE") {
      return [];
    }

    const dispatched: TrialReminderContext[] = [];
    const readiness = await entitlementService.getBusinessReadinessScore(organizationId);
    const convUsage = status.usage.conversations.current;
    const convLimit = status.usage.conversations.limit || 500;
    const convPercentage = status.usage.conversations.percentage;

    const daysRemaining = status.trialDaysRemaining;
    const now = new Date();

    // Check usage warnings first (80% and 90%)
    if (convPercentage >= 90) {
      const dispatchedReminder = await this.sendReminderIfEligible(organizationId, "USAGE_WARNING_90", {
        title: "Approaching Conversation Limit",
        description: `You've used ${convPercentage}% of your monthly conversation allowance (${convUsage.toLocaleString()} / ${convLimit.toLocaleString()}). Consider upgrading before reaching your limit.`,
        category: "alert",
        priority: "urgent",
        severity: "warning",
        actionUrl: "/billing",
      });
      if (dispatchedReminder) dispatched.push(dispatchedReminder);
    } else if (convPercentage >= 80) {
      const dispatchedReminder = await this.sendReminderIfEligible(organizationId, "USAGE_WARNING_80", {
        title: "Monthly Usage Notice",
        description: `You're approaching your monthly conversation limit: ${convUsage.toLocaleString()} / ${convLimit.toLocaleString()} used (${convPercentage}%).`,
        category: "alert",
        priority: "high",
        severity: "info",
        actionUrl: "/billing",
      });
      if (dispatchedReminder) dispatched.push(dispatchedReminder);
    }

    // Trial Expiry Check
    if (status.state === "EXPIRED" || daysRemaining === 0) {
      const dispatchedReminder = await this.sendReminderIfEligible(organizationId, "TRIAL_EXPIRED_PAYMENT_REQUIRED", {
        title: "Trial Expired — Payment Required",
        description: "Your 14-day free trial has ended. Select a plan to keep your AI receptionist and booking automation live.",
        category: "alert",
        priority: "urgent",
        severity: "critical",
        actionUrl: "/billing",
      });
      if (dispatchedReminder) dispatched.push(dispatchedReminder);
      return dispatched;
    }

    // Trial Reminders Timeline
    if (daysRemaining <= 1) {
      // 24 hours remaining
      const dispatchedReminder = await this.sendReminderIfEligible(organizationId, "TRIAL_REMINDER_DAY_13_24H", {
        title: "24 Hours Remaining in Your Free Trial",
        description: `Your ${status.plan.name} trial ends in 24 hours. Activate your subscription to ensure zero disruption to incoming customer calls.`,
        category: "alert",
        priority: "urgent",
        severity: "warning",
        actionUrl: "/billing",
      });
      if (dispatchedReminder) dispatched.push(dispatchedReminder);
    } else if (daysRemaining <= 2) {
      // 2 days remaining
      const dispatchedReminder = await this.sendReminderIfEligible(organizationId, "TRIAL_REMINDER_DAY_12", {
        title: "2 Days Remaining in Your Trial",
        description: `You have 2 days left in your ${status.plan.name} free trial. Review your usage and confirm your subscription.`,
        category: "alert",
        priority: "high",
        severity: "warning",
        actionUrl: "/billing",
      });
      if (dispatchedReminder) dispatched.push(dispatchedReminder);
    } else if (daysRemaining <= 4) {
      // 4 days remaining (Day 10)
      const dispatchedReminder = await this.sendReminderIfEligible(organizationId, "TRIAL_REMINDER_DAY_10", {
        title: "4 Days Remaining in Your Trial",
        description: `Your trial will end in 4 days. ${convUsage > 0 ? `You've already processed ${convUsage} automated conversations!` : "Be sure to connect your phone number to test inbound calling."}`,
        category: "alert",
        priority: "high",
        severity: "info",
        actionUrl: "/billing",
      });
      if (dispatchedReminder) dispatched.push(dispatchedReminder);
    } else if (daysRemaining <= 7 && daysRemaining >= 6) {
      // Mid-trial reminder (Day 7)
      let desc = "You are halfway through your 14-day trial.";
      if (convUsage > 20) {
        desc = `You're getting value from Operator! ${convUsage} / ${convLimit} conversations used (${convPercentage}% of your allowance).`;
      } else if (readiness.missingItems.length > 0) {
        desc = `Trial ends in ${daysRemaining} days. Setup is ${readiness.score}% complete. Next step: configure ${readiness.missingItems[0]}.`;
      }

      const dispatchedReminder = await this.sendReminderIfEligible(organizationId, "TRIAL_MID_DAY_7", {
        title: "Mid-Trial Check-in",
        description: desc,
        category: "ai_improvement",
        priority: "medium",
        severity: "info",
        actionUrl: "/dashboard",
      });
      if (dispatchedReminder) dispatched.push(dispatchedReminder);
    } else if (daysRemaining <= 11 && daysRemaining >= 10) {
      // Day 3 Progress Reminder
      let desc = `Your Operator setup is ${readiness.score}% complete.`;
      if (readiness.completedItems.length > 0) {
        desc += ` Complete: ${readiness.completedItems.join(", ")}.`;
      }
      if (readiness.missingItems.length > 0) {
        desc += ` Still needed: ${readiness.missingItems.join(", ")}.`;
      }

      const dispatchedReminder = await this.sendReminderIfEligible(organizationId, "TRIAL_PROGRESS_DAY_3", {
        title: "Operator Setup Progress",
        description: desc,
        category: "setup",
        priority: "medium",
        severity: "info",
        actionUrl: "/settings",
      });
      if (dispatchedReminder) dispatched.push(dispatchedReminder);
    } else if (daysRemaining >= 13) {
      // Welcome reminder (Day 0-1)
      const dispatchedReminder = await this.sendReminderIfEligible(organizationId, "TRIAL_STARTED", {
        title: `Welcome to Operator ${status.plan.name} Trial`,
        description: `Your 14-day free trial includes ${convLimit.toLocaleString()} conversations, ${status.plan.limits.voiceMinutes} voice minutes, and full AI automation.`,
        category: "setup",
        priority: "low",
        severity: "info",
        actionUrl: "/dashboard",
      });
      if (dispatchedReminder) dispatched.push(dispatchedReminder);
    }

    return dispatched;
  }

  /**
   * Deduplicated notification sender. Checks billingEvents to ensure reminderKey was not sent previously.
   */
  private async sendReminderIfEligible(
    organizationId: string,
    reminderKey: TrialReminderKey,
    context: Omit<TrialReminderContext, "reminderKey">
  ): Promise<TrialReminderContext | null> {
    // 1. Check if already dispatched across all sent reminders
    const existingEvents = await db
      .select()
      .from(billingEvents)
      .where(
        and(
          eq(billingEvents.organizationId, organizationId),
          eq(billingEvents.eventType, "TRIAL_REMINDER_SENT")
        )
      );

    const alreadySent = existingEvents.some(
      (ev) => (ev.payload as any)?.reminderKey === reminderKey
    );

    if (alreadySent) {
      // Already sent! Do not spam user
      return null;
    }

    // 2. Insert smartNotification for in-app alert
    await db.insert(smartNotifications).values({
      organizationId,
      title: context.title,
      description: context.description,
      category: context.category,
      priority: context.priority,
      severity: context.severity,
      actionUrl: context.actionUrl,
      isRead: false,
      isDismissed: false,
    });

    // 3. Insert audit billing event to lock against duplicates
    await db.insert(billingEvents).values({
      organizationId,
      eventType: "TRIAL_REMINDER_SENT",
      payload: {
        reminderKey,
        title: context.title,
        dispatchedAt: new Date().toISOString(),
      },
    });

    return {
      reminderKey,
      ...context,
    };
  }
}

export const trialReminderEngine = new TrialReminderEngine();
