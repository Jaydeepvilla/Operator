import { RecommendationAction, RecommendationState } from "../recommendation-engine/types";

export function getSegmentationRecommendations(state: RecommendationState): RecommendationAction[] {
  const recommendations: RecommendationAction[] = [];
  const leads = state.leads || [];
  
  if (leads.length < 10) return recommendations;

  // We recommend segmentation if they have enough leads but no explicit segments setup yet.
  // We can assume if they don't have tags/status diversity, they need segmentation.
  const uniqueStatuses = new Set(leads.map((l: any) => l.status).filter(Boolean));

  if (uniqueStatuses.size <= 2) {
    recommendations.push({
      id: "crm_create_segments",
      title: "Segment Your Audience",
      description: "You have unsegmented customers. Segmenting by 'New', 'Active', or 'Churned' allows the AI to run targeted win-back campaigns.",
      primaryCtaText: "Auto-Segment",
      primaryCtaHref: "/contacts",
      primaryCtaAction: "auto_create_segments",
      estimatedTimeMinutes: 2,
      impact: "Medium",
      impactReason: "Required for targeted outbound campaigns.",
      confidence: 85,
      confidenceReason: "Low diversity in customer statuses detected."
    });
  }

  return recommendations;
}
