import { BusinessState } from "../../health-engine/types";
import { SetupState } from "../../setup-engine/types";
import { HistoryEngine } from "../../history-engine";
import { ProgressEngine } from "../../progress-engine";
import { calculateOverallHealth } from "../../health-engine/overall";
import { calculateGlobalAIReadiness } from "../../ai-readiness-engine";
import { runBusinessAudit } from "../business-audit";
import { BIRecommendation, WeeklyReview } from "../types";

// ─── Main (async — reads DB) ──────────────────────────────────────────────────

export async function runWeeklyReview(
  orgId: string,
  state: BusinessState & SetupState
): Promise<WeeklyReview> {
  // 1. Get real activity from the last 7 days
  const recentActivities = await HistoryEngine.getActivitiesSince(orgId, 7);
  const completedImprovements = recentActivities.length;

  // 2. Progress snapshot
  const progressPct = ProgressEngine.calculateOverallProgress(state as SetupState);

  // 3. Current health + readiness
  const health = calculateOverallHealth(state as BusinessState);
  const readiness = calculateGlobalAIReadiness(state as BusinessState);

  // 4. Business wins — derive from what was actually completed
  const businessWins: string[] = [];
  if (completedImprovements > 0) {
    businessWins.push(`${completedImprovements} setup improvement${completedImprovements > 1 ? "s" : ""} completed this week`);
  }
  if (health.overallScore >= 70) {
    businessWins.push(`Business health score is ${health.overallScore}/100 — ${health.overallStatus}`);
  }
  if (readiness.overallScore >= 60) {
    businessWins.push(`AI Readiness at ${readiness.overallScore}% — handling most common questions`);
  }
  if ((state.faqs?.length ?? 0) >= 10) {
    businessWins.push(`Strong knowledge base with ${state.faqs!.length} FAQs`);
  }
  if ((state.services?.length ?? (state.servicesList?.length ?? 0)) >= 3) {
    const count = state.services?.length ?? state.servicesList?.length ?? 0;
    businessWins.push(`${count} services configured and discoverable by customers`);
  }

  // 5. Unresolved issues from audit
  const audit = runBusinessAudit(state as BusinessState);
  const unresolvedIssues = audit.findingsCount.critical + audit.findingsCount.warning;

  // 6. Next priorities — top 3 BIRecommendations from audit
  const nextPriorities: BIRecommendation[] = audit.findings.slice(0, 3).map(f => ({
    id: f.id,
    title: f.title,
    description: f.description,
    primaryCtaText: f.actionText,
    primaryCtaHref: f.actionHref,
    estimatedTimeMinutes: 10,
    impact: f.severity === "critical" ? "High" : f.severity === "warning" ? "Medium" : "Low",
    impactReason: f.impact,
    confidence: f.confidence,
    confidenceReason: "Derived from real business configuration analysis",
    category: "audit",
    severity: f.severity,
    businessImpact: f.impact,
    estimatedEffort: "quick",
    relatedModule: "business-audit",
  }));

  // 7. Health and readiness delta
  let healthScoreDelta = 0;
  let readinessDelta = 0;
  
  try {
    const { SnapshotEngine } = await import("../../history-engine/snapshot");
    const lastSnapshot = await SnapshotEngine.getLatestSnapshot(orgId);
    if (lastSnapshot) {
      healthScoreDelta = health.overallScore - lastSnapshot.healthScore;
      readinessDelta = readiness.overallScore - lastSnapshot.readinessScore;
    } else {
      healthScoreDelta = completedImprovements > 0 ? Math.min(completedImprovements * 3, 15) : 0;
      readinessDelta = completedImprovements > 0 ? Math.min(completedImprovements * 2, 10) : 0;
    }
  } catch (err) {
    // Fallback if snapshot fails
    healthScoreDelta = completedImprovements > 0 ? Math.min(completedImprovements * 3, 15) : 0;
    readinessDelta = completedImprovements > 0 ? Math.min(completedImprovements * 2, 10) : 0;
  }

  // 8. Generate headline
  const headline = generateHeadline(completedImprovements, health.overallScore, unresolvedIssues);

  // 9. Summary
  const summary = generateSummary(completedImprovements, health, readiness, unresolvedIssues, progressPct);

  return {
    weekOf: new Date().toISOString().split("T")[0],
    completedImprovements,
    healthScoreDelta,
    readinessDelta,
    newRecommendations: audit.findings.length,
    unresolvedIssues,
    businessWins,
    nextPriorities,
    headline,
    summary,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateHeadline(completed: number, healthScore: number, issues: number): string {
  if (healthScore >= 80 && issues === 0) return "Excellent Week — Operator AI Is Operating at Peak Performance";
  if (completed > 3) return `Strong Progress — ${completed} Improvements Made This Week`;
  if (issues >= 5) return "Action Required — Several Critical Issues Need Attention";
  if (completed > 0) return `Good Progress — ${completed} Improvement${completed > 1 ? "s" : ""} Completed This Week`;
  return "Weekly Review — Review Operator AI's Current Status";
}

function generateSummary(
  completed: number,
  health: { overallScore: number; overallStatus: string },
  readiness: { overallScore: number },
  issues: number,
  progress: number
): string {
  const parts: string[] = [];

  parts.push(
    `Operator AI setup is ${progress}% complete with an overall health score of ${health.overallScore}/100 (${health.overallStatus}).`
  );

  if (completed > 0) {
    parts.push(`This week, ${completed} improvement${completed > 1 ? "s were" : " was"} completed.`);
  } else {
    parts.push("No new improvements were recorded this week.");
  }

  if (issues > 0) {
    parts.push(`There ${issues === 1 ? "is" : "are"} ${issues} unresolved issue${issues > 1 ? "s" : ""} requiring attention.`);
  } else {
    parts.push("All known issues have been resolved.");
  }

  parts.push(`AI Readiness is at ${readiness.overallScore}%.`);

  return parts.join(" ");
}
