import { BusinessState } from "../../health-engine/types";
import { GapCalculator, GapAnalysisResult } from "../types";
import { RecommendationAction } from "../../recommendation-engine/types";

export const calculateBusinessInfoGaps: GapCalculator = (state: BusinessState) => {
  const missingItems: string[] = [];
  const recommendations: RecommendationAction[] = [];
  let score = 100;
  
  const org = state.organization;
  const profile = state.profile;

  const hasName = Boolean(org?.name || profile?.businessName || profile?.name);
  const hasDescription = Boolean(profile?.description || org?.description || org?.industry);
  const hasPhone = Boolean(org?.phone || profile?.phone);
  const hasWebsite = Boolean(org?.website || profile?.website);

  // Basic Details
  if (!hasName) {
    missingItems.push("Business Name");
    score -= 10;
    recommendations.push({
      id: "missing-business-name",
      title: "Add Business Name",
      description: "Your AI needs to know your business name to greet customers properly.",
      impactReason: "Without a name, the AI sounds generic.",
      impact: "High",
      estimatedTimeMinutes: 2,
      confidence: 100,
      confidenceReason: "Data is empty",
      primaryCtaText: "Add Name",
      primaryCtaHref: "/profile"
    });
  }

  if (!hasDescription) {
    missingItems.push("Business Description");
    score -= 10;
    recommendations.push({
      id: "missing-business-description",
      title: "Write a Business Description",
      description: "Provide a brief summary of what your business does.",
      impactReason: "Helps the AI understand context when answering general questions.",
      impact: "Medium",
      estimatedTimeMinutes: 5,
      confidence: 90,
      confidenceReason: "Data is empty",
      primaryCtaText: "Add Description",
      primaryCtaHref: "/profile"
    });
  }

  // Contact Info
  if (!hasPhone) {
    missingItems.push("Phone Number");
    score -= 5;
    recommendations.push({
      id: "missing-business-phone",
      title: "Add Support Phone Number",
      description: "Provide a number where customers can reach human staff.",
      impactReason: "Crucial for escalations if the AI cannot help.",
      impact: "High",
      estimatedTimeMinutes: 2,
      confidence: 100,
      confidenceReason: "Data is empty",
      primaryCtaText: "Add Phone",
      primaryCtaHref: "/profile"
    });
  }

  if (!hasWebsite) {
    missingItems.push("Website URL");
    score -= 5;
    recommendations.push({
      id: "missing-business-website",
      title: "Add Website URL",
      description: "Connect your official website.",
      impactReason: "Allows the AI to direct customers to your online resources.",
      impact: "Medium",
      estimatedTimeMinutes: 2,
      confidence: 90,
      confidenceReason: "Data is empty",
      primaryCtaText: "Add Website",
      primaryCtaHref: "/profile"
    });
  }

  if (!profile?.logo) {
    missingItems.push("Company Logo");
    score -= 5;
    recommendations.push({
      id: "missing-business-logo",
      title: "Upload Company Logo",
      description: "Upload your logo for the web widget and branding.",
      impactReason: "Increases trust and brand recognition.",
      impact: "Medium",
      estimatedTimeMinutes: 5,
      confidence: 100,
      confidenceReason: "Data is empty",
      primaryCtaText: "Upload Logo",
      primaryCtaHref: "/profile"
    });
  }

  return {
    score: Math.max(0, score),
    completeness: Math.max(0, score),
    missingItems,
    recommendations
  };
};
