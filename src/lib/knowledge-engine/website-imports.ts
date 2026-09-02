import { RecommendationAction, RecommendationState } from "../recommendation-engine/types";

export function getWebsiteImportSuggestions(state: RecommendationState): RecommendationAction[] {
  const recommendations: RecommendationAction[] = [];
  
  if (state.settings?.websiteImportStatus === "failed") {
    recommendations.push({
      id: "knowledge_website_failed",
      title: "Retry Website Import",
      description: "The previous attempt to import your website failed. The AI is missing critical context.",
      primaryCtaText: "Retry Import",
      primaryCtaHref: "/kb",
      estimatedTimeMinutes: 2,
      impact: "High",
      impactReason: "Core knowledge source missing.",
      confidence: 100,
      confidenceReason: "Status is explicitly failed."
    });
  }

  return recommendations;
}
