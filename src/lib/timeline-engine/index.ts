import { SetupState } from "../setup-engine/types";
import { SetupTimelineStep } from "../types/progress";

export const TimelineEngine = {
  /**
   * Generates the setup timeline based on the current state.
   */
  generateTimeline(state: SetupState): SetupTimelineStep[] {
    const steps: SetupTimelineStep[] = [];

    // 1. Business Profile
    steps.push({
      category: "business_profile",
      title: "Business Profile",
      description: "Basic information about your business.",
      status: state.profile?.name ? "completed" : "current",
      estimatedMinutes: 5,
    });

    const isProfileDone = state.profile?.name;

    // 2. Website Import
    const isWebsiteDone = !!state.settings?.websiteImportUrl;
    steps.push({
      category: "website_import",
      title: "Website Import",
      description: "Import data from your existing website.",
      status: isWebsiteDone ? "completed" : (isProfileDone ? "current" : "upcoming"),
      estimatedMinutes: 2,
    });

    const isBasicDone = isProfileDone && isWebsiteDone;

    // 3. Knowledge Base
    const isKBDone = state.faqs && state.faqs.length > 0;
    steps.push({
      category: "knowledge_base",
      title: "Knowledge Base",
      description: "Add FAQs and policies for the AI to learn from.",
      status: isKBDone ? "completed" : (isBasicDone ? "current" : "upcoming"),
      estimatedMinutes: 15,
    });

    // 4. Services
    const isServicesDone = state.servicesList && state.servicesList.length > 0;
    steps.push({
      category: "services",
      title: "Services & Pricing",
      description: "Define the services your business offers.",
      status: isServicesDone ? "completed" : (isKBDone ? "current" : "upcoming"),
      estimatedMinutes: 10,
    });

    // 5. Business Hours
    const isHoursDone = Object.keys(state.settings?.businessHours || {}).length > 0;
    steps.push({
      category: "business_hours",
      title: "Business Hours",
      description: "Set your operating schedule.",
      status: isHoursDone ? "completed" : (isServicesDone ? "current" : "upcoming"),
      estimatedMinutes: 3,
    });

    // 6. Channels
    const isChannelsDone = (state.channels && state.channels.length > 0) || !!state.settings?.phoneNumber || !!state.settings?.vapiConfigured || !!state.settings?.metaConfigured;
    steps.push({
      category: "channels",
      title: "Channels",
      description: "Connect phone numbers or web chat.",
      status: isChannelsDone ? "completed" : (isHoursDone ? "current" : "upcoming"),
      estimatedMinutes: 5,
    });

    return steps;
  }
};
