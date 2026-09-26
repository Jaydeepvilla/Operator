import { db } from "../../db";
import { eq, and } from "drizzle-orm";
import { 
  subscriptions, 
  usageCounters, 
  usageRecords, 
} from "../../db/schema";
import { entitlementService, FeatureKey, MetricKey } from "./entitlement-service";
import { subscriptionEngine } from "./subscription-engine";

export { entitlementService };

export const billingService = {
  /**
   * Checks if an organization is entitled to a specific feature.
   * Delegates directly to entitlementService.can.
   */
  async checkEntitlement(organizationId: string, featureName: string): Promise<{
    isEnabled: boolean;
    maxLimit: number | null;
  }> {
    const isEnabled = await entitlementService.can(organizationId, featureName as FeatureKey);
    const status = await subscriptionEngine.getSubscriptionStatus(organizationId);

    let maxLimit: number | null = null;
    if (featureName === "calendars") {
      maxLimit = status.plan.limits.calendars;
    } else if (featureName === "conversations") {
      maxLimit = status.plan.limits.conversations;
    } else if (featureName === "voice_minutes") {
      maxLimit = status.plan.limits.voiceMinutes;
    }

    return {
      isEnabled,
      maxLimit,
    };
  },

  /**
   * Increments resource usage and checks against plan limits dynamically.
   */
  async recordUsage(
    organizationId: string, 
    metricName: "conversations" | "voice_minutes", 
    amount = 1
  ) {
    const result = await entitlementService.recordUsage(organizationId, metricName, amount);
    return {
      allowed: result.allowed,
      currentValue: result.current,
      limitValue: result.limit,
      action: result.action,
    };
  },
};
