import { RecommendationAction, RecommendationState } from "../recommendation-engine/types";

export function checkCancellationPolicy(state: RecommendationState): RecommendationAction[] {
  const recommendations: RecommendationAction[] = [];
  const rules = state.rules?.[0]; // Assuming there is one global booking rule row

  if (!rules) {
    recommendations.push({
      id: "appointment-missing-booking-rules",
      title: "Missing Booking & Cancellation Rules",
      description: "You have no booking rules configured. Operator AI needs rules to manage appointments.",
      primaryCtaText: "Configure Rules",
      primaryCtaHref: "/settings/appointments",
      estimatedTimeMinutes: 5,
      impact: "High",
      impactReason: "Without rules, customers can book anytime or cancel last minute.",
      confidence: 100,
      confidenceReason: "Booking rules are completely missing.",
    });
    return recommendations;
  }

  if (rules.allowCancellation === false) {
    // Maybe not a strict recommendation if they intentionally don't allow cancellations, but could be a warning.
    return recommendations;
  }

  // Check if they allow cancellation but have a very short lead time
  if (rules.allowCancellation && rules.cancellationLeadTime < 12) {
    recommendations.push({
      id: "appointment-short-cancellation-window",
      title: "Short Cancellation Window",
      description: `Your cancellation window is only ${rules.cancellationLeadTime} hours. This might not give you enough time to fill the empty slot.`,
      primaryCtaText: "Update Policy",
      primaryCtaHref: "/settings/appointments",
      estimatedTimeMinutes: 2,
      impact: "Medium",
      impactReason: "Short cancellation windows increase the financial impact of no-shows and last-minute cancellations.",
      confidence: 85,
      confidenceReason: "Industry standard is usually 24-48 hours.",
    });
  }

  // Check if we have no-show policies in the settings. This would typically be in businessSettings or bookingRules.
  // We'll check businessSettings.bookingPreferences
  const bookingPrefs = state.settings?.bookingPreferences || {};
  if (!bookingPrefs.noShowPolicy) {
    recommendations.push({
      id: "appointment-missing-no-show-policy",
      title: "Missing No-Show Policy",
      description: "You haven't defined a no-show policy or penalty. Operator AI needs to know how to handle customers who don't show up.",
      primaryCtaText: "Configure Policy",
      primaryCtaHref: "/settings/appointments",
      estimatedTimeMinutes: 5,
      impact: "High",
      impactReason: "A clear no-show policy prevents revenue loss and sets customer expectations.",
      confidence: 90,
      confidenceReason: "No-show configuration is completely empty.",
      primaryCtaAction: "generateNoShowPolicy",
    });
  }

  return recommendations;
}
