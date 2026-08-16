import { BusinessState } from "../../health-engine/types";
import { getAutomationOpportunities } from "../../automation-engine";
import { runIndustryBenchmark } from "../../industry-benchmark-engine";
import {
  BIRecommendation,
  OperationsAdvisorResult,
  OperationsBottleneck,
} from "../types";

// ─── Bottleneck detection rules ───────────────────────────────────────────────

function detectBottlenecks(state: BusinessState): OperationsBottleneck[] {
  const bottlenecks: OperationsBottleneck[] = [];

  // No automated reminders → manual follow-up bottleneck
  const hasReminders = !!(state.appointmentReminders && state.appointmentReminders.length > 0);
  if (!hasReminders) {
    bottlenecks.push({
      id: "ops-no-reminders",
      area: "Appointment Reminders",
      description: "No automated appointment reminders are configured. Staff likely remind customers manually, increasing no-show rates.",
      severity: "warning",
      suggestedFix: "Enable automated SMS/email reminders 24h and 1h before appointments.",
      automationAvailable: true,
      actionHref: "/settings",
    });
  }

  // No active channels → all inquiries handled manually
  const activeChannels = (state.channels || []).filter((c: any) => c.status === "active");
  if (activeChannels.length === 0) {
    bottlenecks.push({
      id: "ops-no-channels",
      area: "Communication Channels",
      description: "No active communication channels are configured. Operator AI cannot receive or respond to customer inquiries.",
      severity: "critical",
      suggestedFix: "Connect at least one channel (website widget, WhatsApp, or phone).",
      automationAvailable: false,
      actionHref: "/channels",
    });
  }

  // No flows → no automated escalation or lead capture
  const hasFlows = !!(state.flows && state.flows.length > 0);
  if (!hasFlows) {
    bottlenecks.push({
      id: "ops-no-flows",
      area: "Conversation Flows",
      description: "No conversation flows are defined. The AI cannot automatically capture leads or escalate complex queries.",
      severity: "warning",
      suggestedFix: "Create at least one flow for lead capture or escalation.",
      automationAvailable: false,
      actionHref: "/flows",
    });
  }

  // No lead assignment rules → leads not routed
  const hasRules = !!(state.rules && state.rules.length > 0);
  if (!hasRules) {
    bottlenecks.push({
      id: "ops-no-lead-rules",
      area: "Lead Assignment",
      description: "No lead assignment rules are configured. All new leads land in a single inbox with no routing.",
      severity: "info",
      suggestedFix: "Add lead assignment rules to route inquiries to the right staff member automatically.",
      automationAvailable: false,
      actionHref: "/leads",
    });
  }

  // Few FAQs → AI falls back to generic answers frequently
  const faqCount = state.faqs?.length ?? 0;
  if (faqCount < 5) {
    bottlenecks.push({
      id: "ops-sparse-faq",
      area: "AI Knowledge",
      description: `Only ${faqCount} FAQ${faqCount === 1 ? "" : "s"} are configured. The AI frequently gives generic responses for common questions.`,
      severity: faqCount === 0 ? "critical" : "warning",
      suggestedFix: "Add at least 10 FAQs covering your most common customer questions.",
      automationAvailable: true,
      actionHref: "/faqs",
    });
  }

  return bottlenecks;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function runOperationsAdvisor(state: BusinessState): OperationsAdvisorResult {
  const bottlenecks = detectBottlenecks(state);

  // Reuse AutomationEngine — these are one-click AI actions
  const rawAutomations = getAutomationOpportunities(state as any);
  const automationOpportunities: BIRecommendation[] = rawAutomations.map(a => ({
    ...a,
    category: "operations",
    severity: a.impact === "High" ? "warning" : "info",
    businessImpact: a.impactReason,
    estimatedEffort: a.estimatedTimeMinutes <= 5 ? "quick" : "medium",
    relatedModule: "automation-engine",
  }));

  // Reuse IndustryBenchmarkEngine — gaps vs industry best practices
  const benchmark = runIndustryBenchmark(state);
  const benchmarkGaps: BIRecommendation[] = benchmark.recommendations.map(r => ({
    ...r,
    category: "competitor_inspired",
    severity: r.impact === "High" ? "warning" : "info",
    businessImpact: r.impactReason,
    estimatedEffort: r.estimatedTimeMinutes <= 10 ? "quick" : r.estimatedTimeMinutes <= 30 ? "medium" : "project",
    relatedModule: "industry-benchmark-engine",
  }));

  // Workflow score: penalise for each critical/warning bottleneck
  const criticalCount = bottlenecks.filter(b => b.severity === "critical").length;
  const warningCount = bottlenecks.filter(b => b.severity === "warning").length;
  const workflowScore = Math.max(0, 100 - criticalCount * 25 - warningCount * 10);

  return {
    bottlenecks,
    automationOpportunities,
    benchmarkGaps,
    workflowScore,
  };
}
