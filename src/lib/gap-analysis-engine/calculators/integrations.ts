import { BusinessState } from "../../health-engine/types";
import { GapCalculator, GapAnalysisResult } from "../types";
import { RecommendationAction } from "../../recommendation-engine/types";

export const calculateIntegrationGaps: GapCalculator = (state: BusinessState) => {
  const missingItems: string[] = [];
  const recommendations: RecommendationAction[] = [];
  let score = 100;
  
  const settings = state.settings || {};
  
  // Use actual connection arrays from BusinessState
  const hasStripe = (state.billingAccounts && state.billingAccounts.length > 0) || !!settings.stripeAccountId;
  const hasCalendar = (state.calendarConnections && state.calendarConnections.length > 0) || !!settings.googleCalendarId || !!settings.outlookCalendarId;
  
  if (!hasCalendar) {
    missingItems.push("Calendar Integration");
    score -= 20;
    recommendations.push({
      id: "missing-integrations-calendar",
      title: "Connect Your Calendar",
      description: "You have not connected Google Calendar or Outlook.",
      impactReason: "The AI cannot read your availability or schedule appointments without a calendar.",
      impact: "High",
      estimatedTimeMinutes: 5,
      confidence: 100,
      confidenceReason: "Data check",
      primaryCtaText: "Connect Calendar",
      primaryCtaHref: "/settings"
    });
  }

  if (!hasStripe) {
    missingItems.push("Payment Integration");
    score -= 10;
    recommendations.push({
      id: "missing-integrations-stripe",
      title: "Connect Stripe",
      description: "You have not connected a payment processor.",
      impactReason: "The AI cannot collect deposits or process payments for bookings.",
      impact: "High",
      estimatedTimeMinutes: 15,
      confidence: 90,
      confidenceReason: "Data check",
      primaryCtaText: "Connect Stripe",
      primaryCtaHref: "/billing"
    });
  }

  return {
    score: Math.max(0, score),
    completeness: Math.max(0, score),
    missingItems,
    recommendations
  };
};
