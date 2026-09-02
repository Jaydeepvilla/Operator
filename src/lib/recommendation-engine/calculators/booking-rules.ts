import { RecommendationAction, RecommendationState } from "../types";

export function getBookingRecommendations(state: RecommendationState): RecommendationAction[] {
  const recommendations: RecommendationAction[] = [];

  // Rule 1: Missing Business Hours (Highest Priority)
  if (!state.settings?.businessHours || Object.keys(state.settings.businessHours).length === 0) {
    recommendations.push({
      id: "booking_missing_hours",
      title: "Set Business Hours",
      description: "Customers cannot book appointments because business hours are missing. The AI needs to know when you are open.",
      primaryCtaText: "Set Hours",
      primaryCtaHref: "/settings",
      estimatedTimeMinutes: 2,
      impact: "High",
      impactReason: "Directly blocks all booking conversion.",
      confidence: 100,
      confidenceReason: "Settings repository confirms no hours exist.",
    });
  }

  // Rule 2: Missing Services
  if (!state.services || state.services.length === 0) {
    recommendations.push({
      id: "booking_missing_services",
      title: "Add a Service",
      description: "The AI cannot answer pricing questions or schedule appointments because services have not been added.",
      primaryCtaText: "Generate Services with AI",
      primaryCtaHref: "/services",
      primaryCtaAction: "generate_services",
      estimatedTimeMinutes: 5,
      impact: "High",
      impactReason: "Core requirement for the AI to understand what you sell.",
      confidence: 100,
      confidenceReason: "Services list is currently empty.",
    });
  }

  // Rule 3: Missing Cancellation Policy
  if (!state.settings?.cancellationPolicy) {
    recommendations.push({
      id: "booking_missing_cancellation",
      title: "Add Cancellation Policy",
      description: "Without a cancellation policy, customers may cancel last minute without penalty.",
      primaryCtaText: "Generate Policy",
      primaryCtaHref: "/settings/booking",
      primaryCtaAction: "generate_cancellation_policy",
      estimatedTimeMinutes: 2,
      impact: "Medium",
      impactReason: "Protects revenue and reduces no-shows.",
      confidence: 90,
      confidenceReason: "No policy found in booking preferences.",
    });
  }

  return recommendations;
}
