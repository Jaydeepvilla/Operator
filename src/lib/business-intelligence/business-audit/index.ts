import { BusinessState } from "../../health-engine/types";
import { calculateOverallHealth } from "../../health-engine/overall";
import { runGapAnalysis } from "../../gap-analysis-engine";
import { calculateGlobalAIReadiness } from "../../ai-readiness-engine";
import { AuditFinding, BusinessAuditResult, BISeverity } from "../types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function severityFromScore(score: number): BISeverity {
  if (score < 40) return "critical";
  if (score < 65) return "warning";
  if (score < 85) return "info";
  return "opportunity";
}

function makeId(prefix: string, suffix: string): string {
  return `bi-audit-${prefix}-${suffix}`.toLowerCase().replace(/\s+/g, "-");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function runBusinessAudit(state: BusinessState): BusinessAuditResult {
  const health = calculateOverallHealth(state);
  const gaps = runGapAnalysis(state);
  const aiReadiness = calculateGlobalAIReadiness(state);

  const findings: AuditFinding[] = [];

  // ── Health Module Findings ────────────────────────────────────────────────
  const moduleEntries = Object.entries(health.modules) as [string, any][];
  for (const [moduleName, result] of moduleEntries) {
    if (result.score < 85) {
      findings.push({
        id: makeId("health", moduleName),
        title: `${capitalize(moduleName)} Readiness Is Low`,
        description: result.reason,
        severity: severityFromScore(result.score),
        area: capitalize(moduleName),
        impact: result.missingRequirements?.join(", ") || "Configuration incomplete",
        recommendation: result.recommendations?.[0] || `Improve your ${moduleName} configuration.`,
        actionHref: getModuleHref(moduleName),
        actionText: `Fix ${capitalize(moduleName)}`,
        confidence: result.confidence ?? 80,
      });
    }
  }

  // ── Gap Analysis Findings ─────────────────────────────────────────────────
  const gapAreas = Object.entries(gaps.breakdown) as [string, any][];
  for (const [areaName, result] of gapAreas) {
    for (const missing of result.missingItems.slice(0, 2)) {
      findings.push({
        id: makeId("gap", `${areaName}-${missing}`),
        title: `Missing: ${missing}`,
        description: `Your ${formatAreaName(areaName)} is incomplete. "${missing}" has not been configured.`,
        severity: result.score < 50 ? "critical" : "warning",
        area: formatAreaName(areaName),
        impact: "Reduces AI confidence and customer experience quality",
        recommendation: `Add "${missing}" to strengthen your ${formatAreaName(areaName)}.`,
        actionHref: getAreaHref(areaName),
        actionText: `Add ${missing}`,
        confidence: 90,
      });
    }
  }

  // ── AI Readiness Findings ─────────────────────────────────────────────────
  for (const missing of aiReadiness.criticalMissingInformation.slice(0, 3)) {
    findings.push({
      id: makeId("readiness", missing),
      title: `AI Cannot Answer: "${missing}"`,
      description: `Operator AI has no information about "${missing}". Customers asking this will get a generic response.`,
      severity: "warning",
      area: "AI Knowledge",
      impact: "Reduces AI answer quality and customer trust",
      recommendation: `Add information about "${missing}" to your knowledge base or settings.`,
      actionHref: "/kb",
      actionText: "Add to Knowledge Base",
      confidence: aiReadiness.overallConfidence,
    });
  }

  // ── Sort: critical first ──────────────────────────────────────────────────
  findings.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2, opportunity: 3 };
    return order[a.severity] - order[b.severity];
  });

  const countBySeverity = (sev: BISeverity) => findings.filter(f => f.severity === sev).length;

  const summaryScore = health.overallScore;
  const summary = summaryScore >= 80
    ? "Your business configuration is strong. A few refinements will push you to excellence."
    : summaryScore >= 60
    ? "Your setup has a solid foundation, but several important areas need attention."
    : "Operator AI has critical gaps that are reducing its effectiveness. Prioritize the findings below.";

  return {
    overallScore: health.overallScore,
    findingsCount: {
      critical: countBySeverity("critical"),
      warning: countBySeverity("warning"),
      info: countBySeverity("info"),
    },
    findings,
    summary,
    auditedAt: new Date().toISOString(),
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatAreaName(area: string): string {
  const map: Record<string, string> = {
    businessInfo: "Business Information",
    services: "Services",
    staff: "Staff",
    documents: "Documents",
    integrations: "Integrations",
  };
  return map[area] || capitalize(area);
}

function getModuleHref(module: string): string {
  const map: Record<string, string> = {
    booking: "/settings/booking",
    knowledge: "/kb",
    crm: "/contacts",
    ai: "/settings",
    automation: "/automations",
    website: "/settings",
    billing: "/billing",
    staff: "/staff",
    channels: "/channels",
  };
  return map[module] || "/settings";
}


function getAreaHref(area: string): string {
  const map: Record<string, string> = {
    businessInfo: "/profile",
    services: "/services",
    staff: "/staff",
    documents: "/kb",
    integrations: "/settings",
  };
  return map[area] || "/settings";
}
