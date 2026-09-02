import { RecommendationAction, RecommendationState } from "../recommendation-engine/types";

export function getVipRecommendations(state: RecommendationState): RecommendationAction[] {
  const recommendations: RecommendationAction[] = [];
  const leads = state.leads || [];
  
  if (leads.length === 0) return recommendations;

  // Assume leadScore > 80 is a high value or VIP customer
  const potentialVips = leads.filter((l: any) => (l.leadScore || 0) >= 80);

  if (potentialVips.length > 0) {
    recommendations.push({
      id: "crm_tag_vips",
      title: `Tag ${potentialVips.length} VIP Customers`,
      description: "We identified high-value customers based on engagement score. Tagging them allows the AI to provide white-glove routing.",
      primaryCtaText: "Tag as VIP",
      primaryCtaHref: "/contacts?filter=high_score",
      primaryCtaAction: "auto_tag_vips",
      estimatedTimeMinutes: 1,
      impact: "High",
      impactReason: "Increases retention of top revenue drivers.",
      confidence: 80,
      confidenceReason: "Algorithmically detected based on lead score."
    });
  }

  return recommendations;
}
