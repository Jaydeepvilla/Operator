import { RecommendationAction, RecommendationState } from "../recommendation-engine/types";
import { DollarSign } from "lucide-react";

export function checkPricing(state: RecommendationState): RecommendationAction[] {
  const recommendations: RecommendationAction[] = [];
  const services = state.services || [];

  if (services.length === 0) return recommendations;

  const servicesWithoutPricing = services.filter(
    (s) => !s.price || parseFloat(s.price) === 0
  );

  if (servicesWithoutPricing.length > 0) {
    recommendations.push({
      id: "billing-missing-pricing",
      title: "Add Pricing to Services",
      description: `You have ${servicesWithoutPricing.length} service(s) without a price. Setting up pricing allows clients to pay or deposit online.`,
      primaryCtaText: "Configure Pricing",
      primaryCtaHref: "/services",
      estimatedTimeMinutes: 5,
      impact: "High",
      impactReason: "Required to collect payments and deposits.",
      confidence: 95,
      confidenceReason: "Identified services with 0 or missing prices.",
    });
  }

  return recommendations;
}
