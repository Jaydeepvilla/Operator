import { RecommendationAction, RecommendationState } from "../recommendation-engine/types";

const STANDARD_POLICIES = [
  { key: "Cancellation Policy", id: "policy_cancellation" },
  { key: "Refund Policy", id: "policy_refund" },
  { key: "Reschedule Policy", id: "policy_reschedule" },
  { key: "Late Arrival Policy", id: "policy_late" },
  { key: "No Show Policy", id: "policy_noshow" },
];

export function getMissingPolicies(state: RecommendationState): RecommendationAction[] {
  const recommendations: RecommendationAction[] = [];
  const docs = state.documents || [];
  
  // Combine FAQs and Docs text to search for policies
  const allText = (
    docs.map((d: any) => (d.title || d.name || "") + " " + d.content).join(" ") +
    (state.faqs || []).map((f: any) => f.question + " " + f.answer).join(" ")
  ).toLowerCase();

  STANDARD_POLICIES.forEach(policy => {
    if (!allText.includes(policy.key.toLowerCase().replace(" policy", ""))) {
      recommendations.push({
        id: policy.id,
        title: `Add ${policy.key}`,
        description: `Your AI needs a ${policy.key} to accurately handle customer disputes and expectations.`,
        primaryCtaText: "Generate with AI",
        primaryCtaHref: "/kb",
        primaryCtaAction: `generate_${policy.id}`,
        estimatedTimeMinutes: 2,
        impact: "Medium",
        impactReason: "Protects business revenue and provides clear guidelines.",
        confidence: 90,
        confidenceReason: "Could not detect policy keywords in existing knowledge base."
      });
    }
  });

  return recommendations;
}
