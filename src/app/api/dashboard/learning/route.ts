import { NextRequest, NextResponse } from "next/server";
import { requireOrganizationAccess } from "@/lib/auth/server";
import { learningEngine } from "@/server/services/learning-engine";
import { db } from "@/server/db";
import { aiImprovementProposals, faqItems } from "@/server/db/schema";
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
 * Manage proposals: approve, reject, apply
 * Body: { action: "approve" | "reject" | "apply", proposalId: string, notes?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { organizationId, userId } = await requireOrganizationAccess();

    const body = await req.json();
    const { action, proposalId, notes } = body;

    if (!action || !proposalId) {
      return NextResponse.json({ error: "Missing action or proposalId" }, { status: 400 });
    }

    // Verify proposal belongs to this org
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
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const reviewer = userId || "admin";

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
        const changes = proposal.proposedChanges as any;

        if (changes?.type === "faq_addition" && changes.question && changes.suggestedAnswer) {
          // Actually add the FAQ to the knowledge base
          await db.insert(faqItems).values({
            organizationId,
            question: changes.question,
            answer: changes.suggestedAnswer,
            category: changes.category || "AI-Generated",
            isActive: true,
          });
        }

        await db
          .update(aiImprovementProposals)
          .set({
            status: "applied",
            appliedAt: new Date(),
            appliedBy: reviewer,
            reviewedBy: reviewer,
            reviewNotes: notes || "Applied via dashboard",
            rollbackData: changes,
            updatedAt: new Date(),
          })
          .where(eq(aiImprovementProposals.id, proposalId));
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
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
