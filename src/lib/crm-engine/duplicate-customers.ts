import { RecommendationAction, RecommendationState } from "../recommendation-engine/types";
import { detectDuplicates } from "../duplicate-detector";

export function getDuplicateCustomers(state: RecommendationState): RecommendationAction[] {
  const recommendations: RecommendationAction[] = [];
  const leads = state.leads || [];
  
  if (leads.length === 0) return recommendations;

  // We detect duplicates based on combined string of Name + Phone + Email
  const duplicates = detectDuplicates(leads, (l: any) => `${l.name} ${l.phone} ${l.email}`.toLowerCase(), 90);

  if (duplicates.length > 0) {
    recommendations.push({
      id: "crm_duplicate_customers",
      title: `Merge ${duplicates.length} Duplicate Customers`,
      description: "We found records that appear to be the same person. Merging them gives the AI a complete history of the customer.",
      primaryCtaText: "Review Duplicates",
      primaryCtaHref: "/contacts",
      estimatedTimeMinutes: 3,
      impact: "Medium",
      impactReason: "Prevents fragmented conversation histories.",
      confidence: 90,
      confidenceReason: "High string similarity on core PII fields."
    });
  }

  return recommendations;
}
