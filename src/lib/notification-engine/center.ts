import { NotificationHistory } from "./history";
import { NotificationRulesEngine, RulesEngineState } from "./rules";
import { SmartNotification } from "./types";

export const NotificationCenter = {
  /**
   * Syncs proposed rule-based notifications with the database.
   * Auto-inserts new notifications and auto-dismisses resolved ones.
   */
  async syncNotifications(orgId: string, state: RulesEngineState): Promise<SmartNotification[]> {
    // 1. Generate current rules-based recommendations
    const proposed = NotificationRulesEngine.evaluateRules(orgId, state);

    if (!orgId || orgId === "00000000-0000-0000-0000-000000000000" || orgId === "org_default_active") {
      return proposed as SmartNotification[];
    }

    // 2. Fetch current active notifications from DB
    const activeDbNotifs = await NotificationHistory.getActiveNotifications(orgId);

    // 3. Find proposed items that don't exist in DB yet (check by ruleId in metadata)
    const activeRuleIds = new Set(activeDbNotifs.map((n) => n.metadata?.ruleId).filter(Boolean));
    const newProposed = proposed.filter((p) => !activeRuleIds.has(p.metadata.ruleId));

    // Create new proposed notifications in parallel
    await Promise.all(
      newProposed.map((p) => NotificationHistory.createNotification({
        ...p,
        organizationId: orgId,
      }))
    );

    // 4. Auto-dismiss existing database notifications whose rule is no longer active (meaning resolved!)
    const proposedRuleIds = new Set(proposed.map((p) => p.metadata.ruleId).filter(Boolean));
    const resolvedDbNotifs = activeDbNotifs.filter(
      (n) => n.metadata?.ruleId && !proposedRuleIds.has(n.metadata.ruleId)
    );

    await Promise.all(
      resolvedDbNotifs.map((n) => NotificationHistory.dismiss(n.id))
    );

    // 5. Re-fetch current active notifications from DB after syncing
    return NotificationHistory.getActiveNotifications(orgId);
  },
};
