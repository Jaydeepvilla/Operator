import { RecommendationAction, RecommendationState } from "../recommendation-engine/types";

const STANDARD_FAQ_TOPICS = [
  { key: "Parking", id: "faq_parking" },
  { key: "Payment Methods", id: "faq_payment" },
  { key: "Location", id: "faq_location" },
  { key: "Children", id: "faq_children" },
  { key: "Pets", id: "faq_pets" }
];

export function getMissingFaqs(state: RecommendationState): RecommendationAction[] {
  const recommendations: RecommendationAction[] = [];
  const faqs = state.faqs || [];
  
  const allText = faqs.map((f: any) => f.question + " " + f.answer).join(" ").toLowerCase();

  STANDARD_FAQ_TOPICS.forEach(topic => {
    if (!allText.includes(topic.key.toLowerCase())) {
      recommendations.push({
        id: topic.id,
        title: `Add FAQ: ${topic.key}`,
        description: `Customers frequently ask about ${topic.key}. Adding an FAQ helps the AI answer instantly.`,
        primaryCtaText: "Generate with AI",
        primaryCtaHref: "/faqs",
        primaryCtaAction: `generate_${topic.id}`,
        estimatedTimeMinutes: 1,
        impact: "Low",
        impactReason: "Improves automated resolution rate for common questions.",
        confidence: 85,
        confidenceReason: `Could not detect mentions of ${topic.key} in existing FAQs.`
      });
    }
  });

  return recommendations;
}
