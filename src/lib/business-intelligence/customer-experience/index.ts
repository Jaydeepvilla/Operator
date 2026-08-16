import { BusinessState } from "../../health-engine/types";
import { CustomerExperienceResult, CXFrictionPoint } from "../types";

// ─── Friction point detectors ─────────────────────────────────────────────────

function detectBookingFriction(state: BusinessState): CXFrictionPoint[] {
  const points: CXFrictionPoint[] = [];

  if (!state.settings?.bookingPreferences) {
    points.push({
      id: "cx-booking-no-prefs",
      area: "booking",
      title: "No Booking Preferences Configured",
      description: "Customers cannot complete a booking through the AI — no preferences, confirmation logic, or payment steps are set up.",
      severity: "critical",
      suggestedFix: "Configure booking preferences so customers can book end-to-end through Operator AI.",
      actionText: "Configure Booking",
      actionHref: "/settings",
      confidence: 95,
    });
  }

  if (!(state.appointmentReminders?.length ?? 0)) {
    points.push({
      id: "cx-booking-no-reminders",
      area: "reminders",
      title: "No Appointment Reminders",
      description: "Customers receive no reminder before their appointment. This leads to higher no-show rates and a poor customer experience.",
      severity: "warning",
      suggestedFix: "Enable automated reminders at 24h and 1h before each appointment.",
      actionText: "Enable Reminders",
      actionHref: "/settings",
      confidence: 90,
    });
  }

  return points;
}

function detectCommunicationFriction(state: BusinessState): CXFrictionPoint[] {
  const points: CXFrictionPoint[] = [];

  const activeChannels = (state.channels || []).filter((c: any) => c.status === "active");
  if (activeChannels.length === 0) {
    points.push({
      id: "cx-comm-no-channels",
      area: "communication",
      title: "No Active Communication Channels",
      description: "Customers have no way to reach Operator AI. No channels are active.",
      severity: "critical",
      suggestedFix: "Activate at least one channel — website widget, WhatsApp, or phone number.",
      actionText: "Add Channel",
      actionHref: "/channels",
      confidence: 98,
    });
  }

  if (!state.settings?.greetingMessage) {
    points.push({
      id: "cx-comm-no-greeting",
      area: "communication",
      title: "No Greeting Message Set",
      description: "Your AI starts conversations without a greeting. This creates an impersonal first impression.",
      severity: "warning",
      suggestedFix: "Set a warm, professional greeting message that includes your business name and what you offer.",
      actionText: "Set Greeting",
      actionHref: "/settings",
      confidence: 88,
    });
  }

  return points;
}

function detectFAQFriction(state: BusinessState): CXFrictionPoint[] {
  const points: CXFrictionPoint[] = [];
  const faqCount = state.faqs?.length ?? 0;

  if (faqCount === 0) {
    points.push({
      id: "cx-faq-empty",
      area: "faq",
      title: "No FAQs in Knowledge Base",
      description: "Your AI has no FAQ content to draw from. Every customer question will get a generic response.",
      severity: "critical",
      suggestedFix: "Add at least 10 FAQs covering your most common customer questions.",
      actionText: "Add FAQs",
      actionHref: "/faqs",
      confidence: 97,
    });
  } else if (faqCount < 5) {
    points.push({
      id: "cx-faq-sparse",
      area: "faq",
      title: "Knowledge Base Is Too Sparse",
      description: `Only ${faqCount} FAQ${faqCount === 1 ? "" : "s"} found. Your AI will struggle to confidently answer common questions.`,
      severity: "warning",
      suggestedFix: "Expand to at least 10–15 FAQs. Use AI generation to create a draft quickly.",
      actionText: "Expand FAQs",
      actionHref: "/faqs",
      confidence: 85,
    });
  }

  return points;
}

function detectPolicyFriction(state: BusinessState): CXFrictionPoint[] {
  const points: CXFrictionPoint[] = [];
  const documents = state.documents || [];

  const hasCancellationPolicy = documents.some((d: any) =>
    /cancel|refund|reschedul/i.test(d.title || d.name || "")
  );
  if (!hasCancellationPolicy) {
    points.push({
      id: "cx-policy-cancellation",
      area: "policies",
      title: "No Cancellation Policy Documented",
      description: "Customers frequently ask about cancellations. Without a documented policy, your AI gives inconsistent answers.",
      severity: "warning",
      suggestedFix: "Add a cancellation and refund policy to your knowledge base. Use AI generation for a draft.",
      actionText: "Add Policy",
      actionHref: "/kb",
      confidence: 85,
    });
  }

  const hasPrivacyPolicy = documents.some((d: any) =>
    /privacy|data|gdpr|personal/i.test(d.title || d.name || "")
  );
  if (!hasPrivacyPolicy) {
    points.push({
      id: "cx-policy-privacy",
      area: "policies",
      title: "No Privacy Policy",
      description: "A privacy policy builds trust and is legally required in most regions when you collect customer data.",
      severity: "warning",
      suggestedFix: "Add a privacy policy document to your knowledge base.",
      actionText: "Add Privacy Policy",
      actionHref: "/kb",
      confidence: 80,
    });
  }

  return points;
}

function detectAIQualityFriction(state: BusinessState): CXFrictionPoint[] {
  const points: CXFrictionPoint[] = [];

  if (!state.settings?.aiSystemPrompt) {
    points.push({
      id: "cx-ai-no-prompt",
      area: "ai_quality",
      title: "AI Has No Custom Persona or Instructions",
      description: "No AI system prompt is configured. Your AI uses generic defaults and has no knowledge of your brand voice or business context.",
      severity: "warning",
      suggestedFix: "Configure an AI system prompt with your business name, tone, and key instructions.",
      actionText: "Configure AI",
      actionHref: "/settings",
      confidence: 90,
    });
  }

  const hasFollowUpFlow = (state.flows || []).some((f: any) =>
    /follow.?up|after|post|thank|review/i.test(f.name || f.description || "")
  );
  if (!hasFollowUpFlow) {
    points.push({
      id: "cx-ai-no-followup",
      area: "follow_up",
      title: "No Post-Interaction Follow-Up",
      description: "The AI does not follow up after conversations. A simple follow-up message dramatically improves customer satisfaction and generates reviews.",
      severity: "opportunity",
      suggestedFix: "Create a post-conversation flow that sends a thank-you and asks for a review.",
      actionText: "Create Follow-Up",
      actionHref: "/flows",
      confidence: 72,
    });
  }

  return points;
}

// ─── CX Score ─────────────────────────────────────────────────────────────────

function calculateCXScore(points: CXFrictionPoint[]): number {
  let score = 100;
  for (const p of points) {
    if (p.severity === "critical") score -= 20;
    else if (p.severity === "warning") score -= 10;
    else if (p.severity === "opportunity") score -= 3;
  }
  return Math.max(0, score);
}

function findWeakestArea(points: CXFrictionPoint[]): string {
  const counts: Record<string, number> = {};
  for (const p of points) {
    counts[p.area] = (counts[p.area] || 0) + (p.severity === "critical" ? 2 : 1);
  }
  const worst = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return worst ? formatArea(worst[0]) : "None";
}

function findStrongestArea(points: CXFrictionPoint[]): string {
  const all: CXFrictionPoint["area"][] = ["booking", "communication", "reminders", "follow_up", "faq", "policies", "ai_quality"];
  const affectedAreas = new Set(points.map(p => p.area));
  const clean = all.filter(a => !affectedAreas.has(a));
  return clean.length > 0 ? formatArea(clean[0]) : "None";
}

function formatArea(area: string): string {
  const map: Record<string, string> = {
    booking: "Booking",
    communication: "Communication",
    reminders: "Reminders",
    follow_up: "Follow-Up",
    faq: "Knowledge Base",
    policies: "Policies",
    ai_quality: "AI Quality",
  };
  return map[area] || area;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function runCustomerExperienceEngine(state: BusinessState): CustomerExperienceResult {
  const frictionPoints: CXFrictionPoint[] = [
    ...detectBookingFriction(state),
    ...detectCommunicationFriction(state),
    ...detectFAQFriction(state),
    ...detectPolicyFriction(state),
    ...detectAIQualityFriction(state),
  ];

  // Sort: critical → warning → opportunity
  frictionPoints.sort((a, b) => {
    const order = { critical: 0, warning: 1, opportunity: 2, info: 3 };
    return order[a.severity] - order[b.severity];
  });

  return {
    frictionPoints,
    cxScore: calculateCXScore(frictionPoints),
    strongestArea: findStrongestArea(frictionPoints),
    weakestArea: findWeakestArea(frictionPoints),
  };
}
