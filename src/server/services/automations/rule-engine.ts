import { db } from "../../db";
import { 
  automationRules, 
  automationRuleExecutions, 
  smartNotifications,
  leadProfiles,
  inboxThreads
} from "../../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { notificationService } from "../notification";
import { omnichannelRouter } from "../omnichannel/router";
import { templateEngine } from "../omnichannel/template-engine";

export interface RuleCondition {
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "in" | "starts_with" | "exists";
  value: any;
}

export interface RuleAction {
  type: 
    | "send_sms" 
    | "send_email" 
    | "send_whatsapp" 
    | "update_lead_status" 
    | "create_notification" 
    | "assign_staff" 
    | "webhook_post";
  config: Record<string, any>;
}

export interface RuleExecutionResult {
  ruleId: string;
  ruleName: string;
  status: "success" | "failed" | "skipped";
  actionsExecuted: string[];
  errorMessage?: string;
}

export const ruleEngine = {
  /**
   * Evaluates if an event payload matches the specified conditions of an automation rule.
   */
  evaluateConditions(conditions: RuleCondition[], payload: Record<string, any>): boolean {
    if (!conditions || conditions.length === 0) return true;

    for (const cond of conditions) {
      const actualValue = payload[cond.field];

      switch (cond.operator) {
        case "eq":
          if (actualValue !== cond.value) return false;
          break;
        case "neq":
          if (actualValue === cond.value) return false;
          break;
        case "gt":
          if (Number(actualValue) <= Number(cond.value)) return false;
          break;
        case "gte":
          if (Number(actualValue) < Number(cond.value)) return false;
          break;
        case "lt":
          if (Number(actualValue) >= Number(cond.value)) return false;
          break;
        case "lte":
          if (Number(actualValue) > Number(cond.value)) return false;
          break;
        case "contains":
          if (!String(actualValue || "").toLowerCase().includes(String(cond.value || "").toLowerCase())) {
            return false;
          }
          break;
        case "starts_with":
          if (!String(actualValue || "").toLowerCase().startsWith(String(cond.value || "").toLowerCase())) {
            return false;
          }
          break;
        case "in":
          if (Array.isArray(cond.value) && !cond.value.includes(actualValue)) {
            return false;
          }
          break;
        case "exists":
          if (actualValue === undefined || actualValue === null || actualValue === "") {
            return false;
          }
          break;
        default:
          break;
      }
    }

    return true;
  },

  /**
   * Executes an array of configured actions for a matched rule.
   */
  async executeActions(
    organizationId: string,
    actions: RuleAction[],
    payload: Record<string, any>
  ): Promise<string[]> {
    const executed: string[] = [];

    for (const act of actions) {
      try {
        switch (act.type) {
          case "send_sms": {
            const recipient = act.config.phone || payload.customerPhone || payload.phone;
            const bodyTemplate = act.config.message || "Hello {{customerName}}, thank you for reaching out!";
            const rendered = templateEngine.render(bodyTemplate, payload);
            if (recipient && rendered) {
              await notificationService.sendSMS(recipient, rendered);
              executed.push(`send_sms: to ${recipient}`);
            }
            break;
          }

          case "send_email": {
            const recipient = act.config.email || payload.customerEmail || payload.email;
            const subject = templateEngine.render(act.config.subject || "Important update regarding your appointment", payload);
            const bodyTemplate = act.config.body || "<p>Hello {{customerName}}, your booking details are updated.</p>";
            const rendered = templateEngine.render(bodyTemplate, payload);
            if (recipient && subject && rendered) {
              await notificationService.sendEmail(recipient, subject, rendered);
              executed.push(`send_email: to ${recipient}`);
            }
            break;
          }

          case "send_whatsapp": {
            const recipient = act.config.phone || payload.customerPhone || payload.phone;
            const bodyTemplate = act.config.message || "Hello {{customerName}}, confirmation from our team.";
            const rendered = templateEngine.render(bodyTemplate, payload);
            if (recipient && rendered) {
              // Dispatch via SMS or omnichannel outgoing message
              await notificationService.sendSMS(recipient, rendered);
              executed.push(`send_whatsapp: to ${recipient}`);
            }
            break;
          }

          case "update_lead_status": {
            const leadId = payload.leadProfileId || payload.leadId || payload.id;
            const newStatus = act.config.status;
            if (leadId && newStatus) {
              await db
                .update(leadProfiles)
                .set({ status: newStatus, updatedAt: new Date() })
                .where(and(eq(leadProfiles.organizationId, organizationId), eq(leadProfiles.id, leadId)));
              executed.push(`update_lead_status: ${newStatus}`);
            }
            break;
          }

          case "create_notification": {
            const title = templateEngine.render(act.config.title || "Automation Alert", payload);
            const description = templateEngine.render(act.config.description || "Triggered automation event", payload);
            await db.insert(smartNotifications).values({
              organizationId,
              title,
              description,
              priority: act.config.priority || "medium",
              severity: act.config.severity || "info",
              category: "alert",
              actionUrl: act.config.actionUrl || "/dashboard",
              metadata: payload,
            });
            executed.push(`create_notification: ${title}`);
            break;
          }

          case "webhook_post": {
            const webhookUrl = act.config.url;
            if (webhookUrl && webhookUrl.startsWith("http")) {
              await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  event: payload.triggerType || "custom_automation",
                  organizationId,
                  payload,
                  timestamp: new Date().toISOString(),
                }),
              });
              executed.push(`webhook_post: ${webhookUrl}`);
            }
            break;
          }

          case "assign_staff": {
            const threadId = payload.threadId;
            const staffId = act.config.staffId;
            if (threadId && staffId) {
              await db
                .update(inboxThreads)
                .set({ assignedStaffId: staffId, updatedAt: new Date() })
                .where(and(eq(inboxThreads.organizationId, organizationId), eq(inboxThreads.id, threadId)));
              executed.push(`assign_staff: ${staffId}`);
            }
            break;
          }

          default:
            break;
        }
      } catch (err: any) {
        console.error(`[RuleEngine] Action failed (${act.type}):`, err);
        executed.push(`failed_${act.type}: ${err.message}`);
      }
    }

    return executed;
  },

  /**
   * Core event dispatcher: emits an event, evaluates rules, executes actions, and records logs.
   */
  async emitEvent(
    organizationId: string,
    triggerType: string,
    payload: Record<string, any>
  ): Promise<RuleExecutionResult[]> {
    try {
      // 1. Fetch active rules for this organization and trigger type
      const activeRules = await db
        .select()
        .from(automationRules)
        .where(
          and(
            eq(automationRules.organizationId, organizationId),
            eq(automationRules.triggerType, triggerType),
            eq(automationRules.isActive, true)
          )
        );

      if (activeRules.length === 0) return [];

      const results: RuleExecutionResult[] = [];

      for (const rule of activeRules) {
        const conditions = (rule.conditions || []) as RuleCondition[];
        const actions = (rule.actions || []) as RuleAction[];

        const isMatch = this.evaluateConditions(conditions, payload);

        if (!isMatch) {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            status: "skipped",
            actionsExecuted: [],
          });
          continue;
        }

        // Execute matched actions
        try {
          const executed = await this.executeActions(organizationId, actions, payload);

          // Update rule execution metadata
          await db
            .update(automationRules)
            .set({
              executionCount: (rule.executionCount || 0) + 1,
              lastExecutedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(automationRules.id, rule.id));

          // Record execution log
          await db.insert(automationRuleExecutions).values({
            organizationId,
            ruleId: rule.id,
            triggerEvent: triggerType,
            eventPayload: payload,
            status: "success",
            actionsExecuted: executed,
          });

          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            status: "success",
            actionsExecuted: executed,
          });
        } catch (execErr: any) {
          await db.insert(automationRuleExecutions).values({
            organizationId,
            ruleId: rule.id,
            triggerEvent: triggerType,
            eventPayload: payload,
            status: "failed",
            errorMessage: execErr.message || "Action execution error",
          });

          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            status: "failed",
            actionsExecuted: [],
            errorMessage: execErr.message,
          });
        }
      }

      return results;
    } catch (err: any) {
      console.error(`[RuleEngine] emitEvent error (${triggerType}):`, err);
      return [];
    }
  },
};
