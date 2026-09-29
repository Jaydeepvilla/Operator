import { NextRequest, NextResponse } from "next/server";
import { requireOrganizationAccess } from "@/lib/auth/server";
import { learningEngine, proposalApplicator } from "@/server/services/learning-engine";
import { knowledgeGapEngine } from "@/server/services/learning/knowledge-gap-engine";
import { db } from "@/server/db";
import { aiImprovementProposals } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/dashboard/learning
 * Returns the learning engine dashboard summary for the authenticated org
 */
export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await requireOrganizationAccess();

    const summary = await learningEngine.getDashboardSummary(organizationId);

    return NextResponse.json({ success: true, ...summary });
  } catch (error: any) {
    if (error?.message?.includes("Unauthorized") || error?.message?.includes("auth")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Failed to fetch learning dashboard" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dashboard/learning
 * Manage proposals and learning actions: approve, reject, apply, rollback, run_cycle, resolve_gap, run_regression
 */
export async function POST(req: NextRequest) {
  try {
    const { organizationId, userId } = await requireOrganizationAccess();

    const body = await req.json();
    const { action, proposalId, gapId, notes } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    const reviewer = userId || "admin";

    // 1. Trigger Manual Learning Cycle
    if (action === "run_cycle") {
      const cycleResult = await learningEngine.runCycle(organizationId);
      const summary = await learningEngine.getDashboardSummary(organizationId);
      return NextResponse.json({ success: true, action: "run_cycle", cycleResult, ...summary });
    }

    // 2. Trigger Regression Test Suite
    if (action === "run_regression") {
      const regressionResult = await learningEngine.runRegressionCheck(organizationId);
      return NextResponse.json({ success: true, action: "run_regression", regressionResult });
    }

    // 3. Resolve Knowledge Gap
    if (action === "resolve_gap") {
      if (!gapId) {
        return NextResponse.json({ error: "Missing gapId" }, { status: 400 });
      }
      await knowledgeGapEngine.resolveGap(gapId, organizationId);
      return NextResponse.json({ success: true, action: "resolve_gap", gapId });
    }

    // Proposal-specific actions require proposalId
    if (!proposalId) {
      return NextResponse.json({ error: "Missing proposalId" }, { status: 400 });
    }

    // Verify proposal belongs to this org (Strict Tenant Isolation)
    const [proposal] = await db
      .select()
      .from(aiImprovementProposals)
      .where(
        and(
          eq(aiImprovementProposals.id, proposalId),
          eq(aiImprovementProposals.organizationId, organizationId)
        )
      );

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found or access denied" }, { status: 404 });
    }

    switch (action) {
      case "approve":
        await db
          .update(aiImprovementProposals)
          .set({
            status: "approved",
            reviewedBy: reviewer,
            reviewNotes: notes || "Approved via dashboard",
            updatedAt: new Date(),
          })
          .where(eq(aiImprovementProposals.id, proposalId));
        break;

      case "reject":
        await db
          .update(aiImprovementProposals)
          .set({
            status: "rejected",
            reviewedBy: reviewer,
            reviewNotes: notes || "Rejected via dashboard",
            updatedAt: new Date(),
          })
          .where(eq(aiImprovementProposals.id, proposalId));
        break;

      case "apply":
        const applyRes = await proposalApplicator.applyProposal(proposalId, organizationId, reviewer);
        if (!applyRes.success) {
          return NextResponse.json({ error: applyRes.error || "Failed to apply proposal" }, { status: 500 });
        }
        break;

      case "rollback":
        const rollbackRes = await proposalApplicator.rollbackProposal(proposalId, organizationId, reviewer);
        if (!rollbackRes.success) {
          return NextResponse.json({ error: rollbackRes.error || "Failed to rollback proposal" }, { status: 500 });
        }
        break;

      default:
        return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, action, proposalId });
  } catch (error: any) {
    if (error?.message?.includes("Unauthorized") || error?.message?.includes("auth")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Failed to process proposal action" },
      { status: 500 }
    );
  }
}
