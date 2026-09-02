import { RecommendationAction, RecommendationState } from "../recommendation-engine/types";
import { detectDuplicates } from "../duplicate-detector";

export function getDuplicateRecommendations(state: RecommendationState): RecommendationAction[] {
  const recommendations: RecommendationAction[] = [];
  const faqs = state.faqs || [];
  
  const duplicateFaqs = detectDuplicates(faqs, (f: any) => f.question + " " + f.answer, 85);
  
  if (duplicateFaqs.length > 0) {
    recommendations.push({
      id: "knowledge_duplicate_faqs",
      title: "Merge Duplicate FAQs",
      description: `We detected ${duplicateFaqs.length} potential duplicate FAQs. The AI performs better with clear, distinct answers.`,
      primaryCtaText: "Review Duplicates",
      primaryCtaHref: "/faqs",
      estimatedTimeMinutes: 2,
      impact: "Medium",
      impactReason: "Prevents AI confusion and conflicting answers.",
      confidence: 95,
      confidenceReason: "High string similarity detected between multiple records."
    });
  }

  const docs = state.documents || [];
  const duplicateDocs = detectDuplicates(docs, (d: any) => (d.title || d.name || "") + " " + d.content, 90);
  
  if (duplicateDocs.length > 0) {
    recommendations.push({
      id: "knowledge_duplicate_docs",
      title: "Clean Up Duplicate Documents",
      description: `We detected ${duplicateDocs.length} documents with highly similar content.`,
      primaryCtaText: "Review Documents",
      primaryCtaHref: "/kb",
      estimatedTimeMinutes: 5,
      impact: "Medium",
      impactReason: "Prevents AI confusion.",
      confidence: 95,
      confidenceReason: "High string similarity detected between multiple records."
    });
  }

  return recommendations;
}
