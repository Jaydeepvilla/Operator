import { RecommendationAction, RecommendationState } from "../recommendation-engine/types";
import { analyzeContent } from "../content-analyzer";

export function getWeakContentRecommendations(state: RecommendationState): RecommendationAction[] {
  const recommendations: RecommendationAction[] = [];
  const docs = state.documents || [];
  
  docs.forEach((doc: any) => {
    const analysis = analyzeContent(doc.content || "", "document");
    
    if (analysis.isWeak) {
      recommendations.push({
        id: `knowledge_weak_${doc.id}`,
        title: `Improve Document: ${doc.title}`,
        description: `This document is flagged as low quality. ${analysis.issues[0]}`,
        primaryCtaText: "Enhance with AI",
        primaryCtaHref: "/kb",
        primaryCtaAction: `enhance_document_${doc.id}`,
        estimatedTimeMinutes: 2,
        impact: "Medium",
        impactReason: "Low quality documents lead to AI hallucinations or failure to answer.",
        confidence: 90,
        confidenceReason: "Content analyzer scored it below 70."
      });
    }
  });

  return recommendations;
}
