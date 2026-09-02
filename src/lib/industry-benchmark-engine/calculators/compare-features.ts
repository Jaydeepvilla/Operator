import { BusinessState } from "../../health-engine/types";
import { IndustryTemplate, IndustryFeature } from "../../industry-template-engine/types";
import { BenchmarkAnalysisResult } from "../types";
import { RecommendationAction } from "../../recommendation-engine/types";

export const compareServicesFeatures = (state: BusinessState, template: IndustryTemplate): BenchmarkAnalysisResult => {
  const completedFeatures: IndustryFeature[] = [];
  const missingFeatures: IndustryFeature[] = [];
  const recommendations: RecommendationAction[] = [];
  
  const stateServices = state.services || [];
  const serviceNames = stateServices.map(s => s.name.toLowerCase());

  template.requiredServices.forEach(reqSvc => {
    // Basic fuzzy match
    const isPresent = serviceNames.some(name => name.includes(reqSvc.name.toLowerCase()) || reqSvc.name.toLowerCase().includes(name));
    
    if (isPresent) {
      completedFeatures.push(reqSvc);
    } else {
      missingFeatures.push(reqSvc);
      
      recommendations.push({
        id: `bench-svc-${reqSvc.name.replace(/\s+/g, '-').toLowerCase()}`,
        title: `Add ${reqSvc.name}`,
        description: reqSvc.description,
        impactReason: reqSvc.reason,
        impact: reqSvc.impact,
        estimatedTimeMinutes: reqSvc.estimatedTimeMinutes,
        confidence: 90,
      confidenceReason: "Data check",
        primaryCtaText: "Add Service",
        primaryCtaHref: "/services"
      });
    }
  });

  const readinessScore = template.requiredServices.length > 0 
    ? Math.round((completedFeatures.length / template.requiredServices.length) * 100) 
    : 100;

  return {
    industry: template.name,
    readinessScore,
    completedFeatures,
    missingFeatures,
    recommendations
  };
};
