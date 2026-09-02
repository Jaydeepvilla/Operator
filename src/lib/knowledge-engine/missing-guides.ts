import { RecommendationAction, RecommendationState } from "../recommendation-engine/types";

export function getMissingGuides(state: RecommendationState): RecommendationAction[] {
  const recommendations: RecommendationAction[] = [];
  const services = state.services || [];
  const docs = state.documents || [];
  
  const allText = docs.map((d: any) => (d.title || d.name || "") + " " + d.content).join(" ").toLowerCase();

  services.forEach((service: any) => {
    // If it's a high value or complex service, check if we have a guide for it
    if (service.name && service.name.length > 3) {
      if (!allText.includes(service.name.toLowerCase())) {
        recommendations.push({
          id: `guide_missing_${service.id}`,
          title: `Add Guide for ${service.name}`,
          description: `The AI does not have detailed preparation or aftercare instructions for ${service.name}.`,
          primaryCtaText: "Generate Guide",
          primaryCtaHref: "/kb",
          primaryCtaAction: `generate_guide_${service.id}`,
          estimatedTimeMinutes: 3,
          impact: "Medium",
          impactReason: "Service-specific knowledge significantly improves conversion.",
          confidence: 90,
          confidenceReason: `Could not find mentions of ${service.name} in existing documents.`
        });
      }
    }
  });

  return recommendations;
}
