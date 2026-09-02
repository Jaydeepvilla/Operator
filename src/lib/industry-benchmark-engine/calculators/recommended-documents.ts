import { BusinessState } from "../../health-engine/types";
import { IndustryTemplate, IndustryFeature } from "../../industry-template-engine/types";
import { BenchmarkAnalysisResult } from "../types";
import { RecommendationAction } from "../../recommendation-engine/types";

export const compareDocumentsAndPolicies = (state: BusinessState, template: IndustryTemplate): BenchmarkAnalysisResult => {
  const completedFeatures: IndustryFeature[] = [];
  const missingFeatures: IndustryFeature[] = [];
  const recommendations: RecommendationAction[] = [];
  
  const faqs = state.faqs || [];
  const combinedText = faqs.map(f => `${f.question} ${f.answer}`).join(" ").toLowerCase();

  const reqDocs = [...template.requiredDocuments, ...template.requiredPolicies];

  reqDocs.forEach(doc => {
    // Basic keyword checking (e.g., "Cancellation Policy" -> "cancel")
    const keywords = doc.name.toLowerCase().replace("policy", "").replace("guide", "").trim().split(" ");
    const isPresent = keywords.some(kw => kw.length > 3 && combinedText.includes(kw));

    if (isPresent) {
      completedFeatures.push(doc);
    } else {
      missingFeatures.push(doc);
      
      recommendations.push({
        id: `bench-doc-${doc.name.replace(/\s+/g, '-').toLowerCase()}`,
        title: `Add ${doc.name}`,
        description: doc.description,
        impactReason: doc.reason,
        impact: doc.impact,
        estimatedTimeMinutes: doc.estimatedTimeMinutes,
        confidence: 85,
      confidenceReason: "Data check",
        primaryCtaText: "Generate with AI",
        primaryCtaHref: `/kb?action=generate&topic=${encodeURIComponent(doc.name)}`
      });
    }
  });

  const readinessScore = reqDocs.length > 0 
    ? Math.round((completedFeatures.length / reqDocs.length) * 100) 
    : 100;

  return {
    industry: template.name,
    readinessScore,
    completedFeatures,
    missingFeatures,
    recommendations
  };
};
