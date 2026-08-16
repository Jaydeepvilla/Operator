import { BusinessState } from "../health-engine/types";
import { QualityScoreResult } from "./knowledge-quality";

export function calculateChannelQuality(state: BusinessState): QualityScoreResult {
  let score = 0;
  const strongAreas: string[] = [];
  const weakAreas: string[] = [];
  const missingRequirements: string[] = [];
  const exactActions: string[] = [];

  const channels = state.channels || [];
  
  const hasWidget = channels.some(c => c.type === "widget" && c.status === "active") || !!state.settings?.widgetInstalled;
  const hasSms = channels.some(c => c.type === "sms" && c.status === "active");
  const hasWhatsapp = channels.some(c => c.type === "whatsapp" && c.status === "active");

  if (hasWidget) {
    score += 40;
    strongAreas.push("Web Widget connected and active");
  } else {
    missingRequirements.push("Web Widget Installation");
    weakAreas.push("Web Widget inactive");
    exactActions.push("Configure and install the Web Widget on your website");
  }

  if (hasSms) {
    score += 30;
    strongAreas.push("SMS Phone Channel connected and active");
  } else {
    missingRequirements.push("Active SMS Phone");
    weakAreas.push("SMS Channel inactive");
    exactActions.push("Purchase an SMS phone number under Channels settings");
  }

  if (hasWhatsapp) {
    score += 30;
    strongAreas.push("WhatsApp Channel connected and active");
  } else {
    missingRequirements.push("WhatsApp Integration");
    weakAreas.push("WhatsApp Channel inactive");
    exactActions.push("Connect your WhatsApp Business API under Channels settings");
  }

  const formula = "Score = 40% (Web Widget Active) + 30% (SMS Active) + 30% (WhatsApp Active)";
  let whyLow = "Operator AI is not connected to enough communication channels to receive customer queries.";
  if (score === 100) {
    whyLow = "Excellent! Operator AI is connected to all active channels.";
  } else if (score >= 70) {
    whyLow = "Operator AI is active on primary channels, but adding more options increases customer outreach.";
  }

  return {
    score,
    coverage: score,
    strongAreas,
    weakAreas,
    trend: score >= 70 ? "up" : "flat",
    maxScore: 100,
    formula,
    whyLow,
    missingRequirements,
    exactActions,
  };
}
