import { RecommendationAction, RecommendationState } from "../recommendation-engine/types";

export function checkRefundPolicy(state: RecommendationState): RecommendationAction[] {
  const recommendations: RecommendationAction[] = [];
  const documents = state.documents || [];
  const settings = state.settings || {};
  const preferences = settings.bookingPreferences || {};

  const hasRefundPolicy = documents.some(
    doc => (doc.name || doc.title || "").toLowerCase().includes("refund") || (doc.name || doc.title || "").toLowerCase().includes("cancellation")
  );

  // If deposits are enabled or payments are taken online, a refund policy is critical
  if (preferences.depositEnabled && !hasRefundPolicy) {
    recommendations.push({
      id: "billing-missing-refund-policy",
      title: "Add a Refund & Cancellation Policy",
      description: "Since you collect deposits, having a clear refund and cancellation policy reduces payment disputes and chargebacks.",
      primaryCtaText: "Generate With AI",
      primaryCtaHref: "/kb?action=generate&type=refund_policy",
      estimatedTimeMinutes: 5,
      impact: "High",
      impactReason: "Mitigates chargebacks and sets clear expectations.",
      confidence: 95,
      confidenceReason: "Deposits enabled but no policy found."
    });
  }

  return recommendations;
}
