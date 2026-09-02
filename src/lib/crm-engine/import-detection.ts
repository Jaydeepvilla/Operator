import { RecommendationAction, RecommendationState } from "../recommendation-engine/types";

export function getImportDetection(state: RecommendationState): RecommendationAction[] {
  const recommendations: RecommendationAction[] = [];
  const leads = state.leads || [];

  if (leads.length === 0) {
    recommendations.push({
      id: "crm_import_customers",
      title: "Import Existing Customers",
      description: "Your CRM has no customers. Importing your existing client list helps the AI personalize interactions immediately.",
      primaryCtaText: "Import CSV",
      primaryCtaHref: "/contacts",
      estimatedTimeMinutes: 5,
      impact: "High",
      impactReason: "Core requirement for outbound campaigns and personalized inbound routing.",
      confidence: 100,
      confidenceReason: "Customer count is exactly 0."
    });
  }

  return recommendations;
}
