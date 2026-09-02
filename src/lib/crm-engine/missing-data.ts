import { RecommendationAction, RecommendationState } from "../recommendation-engine/types";

export function getMissingDataRecommendations(state: RecommendationState): RecommendationAction[] {
  const recommendations: RecommendationAction[] = [];
  const leads = state.leads || [];
  
  if (leads.length === 0) return recommendations;

  let missingPhone = 0;
  let missingEmail = 0;
  let missingNotes = 0;

  leads.forEach((lead: any) => {
    if (!lead.phone) missingPhone++;
    if (!lead.email) missingEmail++;
    if (!lead.summary) missingNotes++;
  });

  if (missingPhone > leads.length * 0.3) {
    recommendations.push({
      id: "crm_missing_phones",
      title: "Add Missing Phone Numbers",
      description: `${missingPhone} customers are missing phone numbers. SMS is our highest converting AI channel.`,
      primaryCtaText: "Request via Email",
      primaryCtaHref: "/contacts",
      estimatedTimeMinutes: 2,
      impact: "High",
      impactReason: "Unlocks SMS automation.",
      confidence: 100,
      confidenceReason: "Counted exactly from database."
    });
  }

  if (missingEmail > leads.length * 0.5) {
    recommendations.push({
      id: "crm_missing_emails",
      title: "Add Missing Emails",
      description: `${missingEmail} customers are missing emails, preventing marketing campaigns.`,
      primaryCtaText: "Update Records",
      primaryCtaHref: "/contacts",
      estimatedTimeMinutes: 10,
      impact: "Medium",
      impactReason: "Required for newsletters and basic follow-ups.",
      confidence: 100,
      confidenceReason: "Counted exactly from database."
    });
  }

  if (missingNotes > leads.length * 0.8) {
    recommendations.push({
      id: "crm_missing_notes",
      title: "Add Customer Notes",
      description: `Over 80% of your customers lack personalized notes. Adding notes helps the AI remember preferences.`,
      primaryCtaText: "Generate with AI",
      primaryCtaHref: "/contacts",
      primaryCtaAction: "generate_customer_summaries",
      estimatedTimeMinutes: 1,
      impact: "Medium",
      impactReason: "Significantly improves AI personalization.",
      confidence: 100,
      confidenceReason: "Counted exactly from database."
    });
  }

  return recommendations;
}
