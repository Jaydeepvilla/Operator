import { db } from "../../db";
import { eq, and } from "drizzle-orm";
import { 
  subscriptions, 
  subscriptionPlans, 
  usageCounters, 
  usageRecords, 
  featureEntitlements, 
} from "../../db/schema";
import { entitlementService, FeatureKey, MetricKey } from "./entitlement-service";

export { entitlementService };

export const billingService = {
  /**
   * Checks if an organization is entitled to a specific feature (e.g. 'white_label', 'voice_calls')
   */
  async checkEntitlement(organizationId: string, featureName: string): Promise<{
    isEnabled: boolean;
    maxLimit: number | null;
  }> {
    // 1. Resolve organization subscription plan
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, organizationId),
    });

    if (!sub) {
      // Free default tier fallback
      return { isEnabled: featureName !== "white_label", maxLimit: 100 };
    }

    // 2. Fetch specific entitlement gate rule
    const entitlement = await db.query.featureEntitlements.findFirst({
      where: and(
        eq(featureEntitlements.planId, sub.planId),
        eq(featureEntitlements.featureName, featureName)
      ),
    });

    if (entitlement) {
      return {
        isEnabled: entitlement.isEnabled,
        maxLimit: entitlement.maxLimit,
      };
    }

    // Fallback based on planId if specific rule is missing
    const isFree = sub.planId === "free";
    const isStarter = sub.planId === "starter";
    
    if (featureName === "white_label") {
      return { isEnabled: !isFree && !isStarter, maxLimit: null };
    }

    return { isEnabled: true, maxLimit: null };
  },

  /**
   * Increments resource usage and checks against limits. Returns actions if limits exceeded.
   */
  async recordUsage(
    organizationId: string, 
    metricName: string, 
    amount = 1
  ): Promise<{
    allowed: boolean;
    currentValue: number;
    limitValue: number;
    action: "allow" | "warn" | "block" | "overage";
  }> {
    // 1. Get current counter
    let counter = await db.query.usageCounters.findFirst({
      where: and(
        eq(usageCounters.organizationId, organizationId),
        eq(usageCounters.metricName, metricName)
      ),
    });

    // Resolve subscription parameters
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, organizationId),
    });

    const planId = sub?.planId || "free";
    
    // Resolve limit value dynamically from DB entitlements
    const entitlement = await db.query.featureEntitlements.findFirst({
      where: and(
        eq(featureEntitlements.planId, planId),
        eq(featureEntitlements.featureName, metricName)
      ),
    });

    let limitValue = entitlement?.maxLimit ?? 100;

    if (entitlement?.maxLimit === null || entitlement?.maxLimit === undefined) {
      if (planId === "starter") limitValue = 500;
      else if (planId === "pro") limitValue = 2000;
      else if (planId === "business") limitValue = 10000;
      else if (planId === "enterprise") limitValue = 999999;
      else limitValue = 100; // free default fallback
    }

    const resetDate = sub?.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (!counter) {
      // Create a new counter in database
      const [newCounter] = await db
        .insert(usageCounters)
        .values({
          organizationId,
          metricName,
          currentValue: amount,
          limitValue,
          resetDate,
        })
        .returning();
      counter = newCounter;
    } else {
      // Check reset date
      const now = new Date();
      let nextValue = counter.currentValue + amount;
      if (now > counter.resetDate) {
        nextValue = amount;
        await db
          .update(usageCounters)
          .set({
            currentValue: nextValue,
            resetDate,
            updatedAt: new Date(),
          })
          .where(eq(usageCounters.id, counter.id));
      } else {
        await db
          .update(usageCounters)
          .set({
            currentValue: nextValue,
            updatedAt: new Date(),
          })
          .where(eq(usageCounters.id, counter.id));
      }
      counter.currentValue = nextValue;
    }

    // 2. Insert absolute usage log
    await db.insert(usageRecords).values({
      organizationId,
      metricName,
      amount,
    });

    // 3. Evaluate limits and overage logic
    let action: "allow" | "warn" | "block" | "overage" = "allow";
    let allowed = true;

    if (counter.currentValue >= counter.limitValue) {
      if (planId === "free") {
        action = "block";
        allowed = false;
      } else if (planId === "enterprise") {
        action = "overage"; // Enterprise auto-bills overage
      } else {
        // Warning threshold (between 100% and 110%)
        if (counter.currentValue < counter.limitValue * 1.1) {
          action = "warn";
        } else {
          action = "block";
          allowed = false;
        }
      }
    }

    return {
      allowed,
      currentValue: counter.currentValue,
      limitValue: counter.limitValue,
      action,
    };
  },
};
