import { BusinessState } from "../../health-engine/types";
import { GapCalculator, GapAnalysisResult } from "../types";
import { RecommendationAction } from "../../recommendation-engine/types";

export const calculateServiceGaps: GapCalculator = (state: BusinessState) => {
  const missingItems: string[] = [];
  const recommendations: RecommendationAction[] = [];
  let score = 100;
  
  const services = state.services || (state as any).servicesList || [];
  
  if (services.length === 0) {
    missingItems.push("No Services Configured");
    score -= 40;
    recommendations.push({
      id: "missing-services-none",
      title: "Add Your Services",
      description: "You have not added any services to the platform.",
      impactReason: "Without services, the AI cannot answer pricing questions or book appointments.",
      impact: "High",
      estimatedTimeMinutes: 15,
      confidence: 100,
      confidenceReason: "Data check",
      primaryCtaText: "Add Service",
      primaryCtaHref: "/services"
    });
    return { score, completeness: score, missingItems, recommendations };
  }

  // Check for services missing details
  let missingDesc = 0;
  let missingPrice = 0;
  let missingDuration = 0;

  services.forEach((svc: any) => {
    if (!svc.description) missingDesc++;
    // If price is missing or '0.00' and it's not meant to be free
    if (!svc.price || svc.price === "0" || svc.price === "0.00") missingPrice++;
    if (!svc.duration || svc.duration === 0) missingDuration++;
  });

  if (missingDesc > 0) {
    missingItems.push(`${missingDesc} Services missing descriptions`);
    score -= 10;
    recommendations.push({
      id: "missing-services-description",
      title: "Add Service Descriptions",
      description: `${missingDesc} of your services are missing a description.`,
      impactReason: "The AI uses descriptions to explain your services to customers.",
      impact: "High",
      estimatedTimeMinutes: missingDesc * 2,
      confidence: 90,
      confidenceReason: "Data check",
      primaryCtaText: "Edit Services",
      primaryCtaHref: "/services"
    });
  }

  if (missingDuration > 0) {
    missingItems.push(`${missingDuration} Services missing durations`);
    score -= 10;
    recommendations.push({
      id: "missing-services-duration",
      title: "Set Service Durations",
      description: `${missingDuration} of your services have no duration set.`,
      impactReason: "Duration is required to correctly schedule appointments in the calendar.",
      impact: "High",
      estimatedTimeMinutes: missingDuration * 1,
      confidence: 100,
      confidenceReason: "Data check",
      primaryCtaText: "Edit Services",
      primaryCtaHref: "/services"
    });
  }

  if (missingPrice > 0) {
    missingItems.push(`${missingPrice} Services missing pricing`);
    score -= 5;
    recommendations.push({
      id: "missing-services-price",
      title: "Add Service Pricing",
      description: `${missingPrice} of your services are marked as free or have no price.`,
      impactReason: "If these are paid services, the AI will give incorrect pricing information to customers.",
      impact: "Medium",
      estimatedTimeMinutes: missingPrice * 1,
      confidence: 80,
      confidenceReason: "Data check",
      primaryCtaText: "Edit Services",
      primaryCtaHref: "/services"
    });
  }

  return {
    score: Math.max(0, score),
    completeness: Math.max(0, score),
    missingItems,
    recommendations
  };
};
