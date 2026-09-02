import { RecommendationAction, RecommendationState } from "../types";

export function getKnowledgeRecommendations(state: RecommendationState): RecommendationAction[] {
  const recommendations: RecommendationAction[] = [];

  const faqs = state.faqs || [];
  const documents = state.documents || [];
  const activeDocs = documents.filter((d: any) => !d.isArchived);

  // Rule 1: No Website Imported
  if (!state.settings?.websiteImportUrl && (!state.imports || state.imports.length === 0)) {
    recommendations.push({
      id: "knowledge_missing_website",
      title: "Import Your Website",
      description: "Website knowledge has not been imported, reducing AI answer quality. The AI needs to scrape your site to learn your business.",
      primaryCtaText: "Import Website",
      primaryCtaHref: "/kb",
      estimatedTimeMinutes: 3,
      impact: "High",
      impactReason: "Easiest way to provide massive context to the AI instantly.",
      confidence: 100,
      confidenceReason: "No website URL found in settings.",
    });
  }

  // Rule 2: Low FAQ Count
  if (faqs.length < 3) {
    recommendations.push({
      id: "knowledge_low_faq",
      title: "Generate FAQs",
      description: "Your FAQ list is too small. The AI relies on FAQs to answer highly specific customer policies correctly.",
      primaryCtaText: "Generate FAQs with AI",
      primaryCtaHref: "/faqs",
      primaryCtaAction: "generate_faqs",
      estimatedTimeMinutes: 5,
      impact: "Medium",
      impactReason: "Improves AI accuracy for edge cases.",
      confidence: 90,
      confidenceReason: `Only ${faqs.length} FAQs detected.`,
    });
  }

  // Rule 3: Missing Documents
  if (activeDocs.length === 0) {
    recommendations.push({
      id: "knowledge_missing_docs",
      title: "Upload Business Documents",
      description: "Upload PDFs, menus, or pricing sheets so the AI can reference actual files during chats.",
      primaryCtaText: "Upload Documents",
      primaryCtaHref: "/kb",
      estimatedTimeMinutes: 4,
      impact: "Low",
      impactReason: "Helpful for deep context, but FAQs and Website cover most basics.",
      confidence: 100,
      confidenceReason: "No active documents found.",
    });
  }

  return recommendations;
}
