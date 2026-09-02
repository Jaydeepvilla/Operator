import { RecommendationAction, RecommendationState } from "../recommendation-engine/types";

export function getMissingFaqs(state: RecommendationState): RecommendationAction[] {
  const recommendations: RecommendationAction[] = [];
  const faqs = state.faqs || [];
  
  // Only suggest adding FAQs if the business has zero FAQs configured
  if (faqs.length === 0) {
    recommendations.push({
      id: "faq_general_setup",
      title: "Add Business FAQs",
      description: "Document common customer inquiries like pricing, hours, or appointment policies so your AI can answer accurately.",
      primaryCtaText: "Manage FAQs",
      primaryCtaHref: "/faqs",
      primaryCtaAction: "setup_faqs",
      estimatedTimeMinutes: 5,
      impact: "Medium",
      impactReason: "Expands automated inquiry resolution across voice, chat, and web channels.",
      confidence: 90,
      confidenceReason: "No FAQ items currently recorded in knowledge base."
    });
  }

  return recommendations;
}

