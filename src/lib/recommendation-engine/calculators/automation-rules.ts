import { RecommendationAction, RecommendationState } from "../types";

export function getAutomationRecommendations(state: RecommendationState): RecommendationAction[] {
  const recommendations: RecommendationAction[] = [];

  const channels = state.channels || [];
  const activeChannels = channels.filter((c: any) => c.status === "active" || c.isActive);

  // Rule 1: No Channels
  if (activeChannels.length === 0) {
    recommendations.push({
      id: "automation_missing_channels",
      title: "Connect a Channel",
      description: "The AI cannot talk to anyone because no communication channels (SMS, Web Widget, WhatsApp) are connected.",
      primaryCtaText: "Connect Channels",
      primaryCtaHref: "/channels",
      estimatedTimeMinutes: 3,
      impact: "High",
      impactReason: "Core requirement. AI needs a medium to operate.",
      confidence: 100,
      confidenceReason: "No active channels found.",
    });
  }

  // Rule 2: Missing Notifications
  if (!state.settings?.notifications?.email && !state.settings?.notifications?.sms) {
    recommendations.push({
      id: "automation_missing_notifications",
      title: "Enable Team Notifications",
      description: "Set up internal notifications so your staff receives an alert when the AI escalates a conversation.",
      primaryCtaText: "Configure Alerts",
      primaryCtaHref: "/settings/rules",
      estimatedTimeMinutes: 2,
      impact: "Medium",
      impactReason: "Ensures no customer inquiries slip through the cracks during an escalation.",
      confidence: 100,
      confidenceReason: "Notification settings are disabled.",
    });
  }

  return recommendations;
}
