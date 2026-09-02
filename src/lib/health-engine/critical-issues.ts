import { BusinessState, CriticalIssue, PriorityLevel } from "./types";

export function detectCriticalIssues(state: BusinessState): CriticalIssue[] {
  const issues: CriticalIssue[] = [];

  // Helper to push issues
  const addIssue = (id: string, category: string, priority: PriorityLevel, reason: string, impact: string, estimatedFixTimeMinutes: number, ctaText: string, href: string) => {
    issues.push({ id, category, priority, reason, impact, estimatedFixTimeMinutes, ctaText, href });
  };

  // 1. Business Hours
  if (!state.settings?.businessHours || Object.keys(state.settings.businessHours).length === 0) {
    addIssue(
      "missing-business-hours",
      "Booking",
      "High",
      "No business hours configured",
      "Customers cannot book appointments because the AI does not know when you are open.",
      2,
      "Set Business Hours",
      "/settings"
    );
  }

  // 2. Services
  if (!state.services || state.services.length === 0) {
    addIssue(
      "missing-services",
      "Booking",
      "Critical",
      "No services available",
      "The AI cannot schedule any appointments or answer pricing questions.",
      5,
      "Add a Service",
      "/services"
    );
  }

  // 3. AI System Prompt
  if (!state.settings?.aiSystemPrompt) {
    addIssue(
      "missing-ai-prompt",
      "AI Configuration",
      "Critical",
      "No AI System Prompt",
      "The AI has no instructions on how to behave, what tone to use, or what rules to follow.",
      5,
      "Configure AI Prompt",
      "/settings/ai"
    );
  }

  // 4. Greeting Message
  if (!state.settings?.greetingMessage) {
    addIssue(
      "missing-greeting",
      "AI Configuration",
      "Medium",
      "No AI Greeting Message",
      "The AI will use a generic fallback greeting instead of your brand voice.",
      1,
      "Set Greeting",
      "/settings/ai"
    );
  }

  // 5. Knowledge Base (FAQs + Documents)
  const faqCount = state.faqs?.length || 0;
  const docCount = state.documents?.length || 0;
  if (faqCount === 0 && docCount === 0 && !state.settings?.websiteImportUrl) {
    addIssue(
      "missing-knowledge",
      "Knowledge Base",
      "Critical",
      "No Business Knowledge",
      "The AI knows nothing about your business and will hallucinate answers.",
      10,
      "Add Knowledge",
      "/kb"
    );
  }

  // 6. Support Email / Escalation
  if (!state.settings?.supportEmail && (!state.rules || state.rules.length === 0)) {
    addIssue(
      "missing-escalation",
      "Automation",
      "High",
      "No Escalation Path",
      "If the AI cannot answer a question, it has no way to forward the issue to a human.",
      2,
      "Set Escalation Rules",
      "/settings/rules"
    );
  }

  // 7. Communication Channels
  const activeChannels = state.channels?.filter((c: any) => c.status === "active" || c.isActive) || [];
  if (activeChannels.length === 0) {
    addIssue(
      "missing-channels",
      "Automation",
      "Critical",
      "No Active Channels",
      "Operator AI is not connected to any communication channels (Web, SMS, WhatsApp).",
      3,
      "Connect Channels",
      "/channels"
    );
  }

  // 8. Cancellation Policy
  if (!state.settings?.cancellationPolicy) {
    addIssue(
      "missing-cancellation-policy",
      "Booking",
      "Low",
      "No Cancellation Policy",
      "Customers may cancel at any time without penalty, leading to revenue loss.",
      2,
      "Add Policy",
      "/settings/booking"
    );
  }

  return issues.sort((a, b) => {
    const priorityWeight = { "Critical": 4, "High": 3, "Medium": 2, "Low": 1 };
    return priorityWeight[b.priority] - priorityWeight[a.priority];
  });
}
