import { SetupTask, SetupState } from "./types";

export const SETUP_TASKS: SetupTask[] = [
  // Phase: Business Info
  {
    id: "profile",
    category: "Business Info",
    label: "Business Profile",
    description: "Tell us about your business so the AI knows what to say.",
    whyItMatters: "Your AI needs to sound like your business. It uses this name, description, and tone to represent you perfectly to callers.",
    estimatedTimeMinutes: 2,
    impact: "High",
    difficulty: "Easy",
    dependencies: [],
    isCompleted: (state: SetupState) => {
      const bp = (state.settings as any)?.bookingPreferences;
      if (bp?.uncompletedTasks?.includes("services")) return false;
      if (bp?.confirmedTasks?.includes("services")) return true;
      const serviceItems = state.services || (state as any).servicesList || [];
      return Array.isArray(serviceItems) && serviceItems.length > 0;
    },
    href: "/services",
  },
  {
    id: "flows",
    category: "Appointments",
    label: "Intake Questions",
    description: "Set up questions to ask before booking an appointment.",
    whyItMatters: "You might need to know a client's age or symptoms before booking. The AI will ask these automatically.",
    estimatedTimeMinutes: 4,
    impact: "Medium",
    difficulty: "Advanced",
    dependencies: ["services"],
    isCompleted: (state: SetupState) => {
      const bp = (state.settings as any)?.bookingPreferences;
      if (bp?.uncompletedTasks?.includes("flows")) return false;
      if (bp?.confirmedTasks?.includes("flows")) return true;
      return !!bp?.flowsConfigured;
    },
    href: "/flows",
  },
  // Phase: AI Customization
  {
    id: "ai_tone",
    category: "AI Customization",
    label: "AI Tone and Voice",
    description: "Adjust how formal or casual your AI sounds.",
    whyItMatters: "A spa needs a relaxing tone, while a law firm needs a professional tone. Match it to your brand.",
    estimatedTimeMinutes: 2,
    impact: "Medium",
    difficulty: "Easy",
    dependencies: ["profile"],
    isCompleted: (state: SetupState) => {
      const bp = (state.settings as any)?.bookingPreferences;
      if (bp?.uncompletedTasks?.includes("ai_tone")) return false;
      return !!bp?.confirmedTasks?.includes("ai_tone") || !!(state.settings as any)?.aiVoiceToneConfigured;
    },
    href: "/settings/ai",
  },
  // Phase: Channels
  {
    id: "widget",
    category: "Channels",
    label: "Website Widget",
    description: "Install your AI chat and booking widget on your website.",
    whyItMatters: "Allows website visitors to ask questions, check pricing, and book appointments directly on your site 24/7.",
    estimatedTimeMinutes: 2,
    impact: "High",
    difficulty: "Easy",
    dependencies: ["profile"],
    isCompleted: (state: SetupState) => {
      const bp = (state.settings as any)?.bookingPreferences;
      if (bp?.uncompletedTasks?.includes("widget")) return false;
      return (
        !!bp?.confirmedTasks?.includes("widget") ||
        !!(state as any)?.widgetConfig?.isActive
      );
    },
    href: "/widget",
  },
  {
    id: "phone",
    category: "Channels",
    label: "Phone Number",
    description: "Connect a phone number for your AI to answer.",
    whyItMatters: "This makes your AI live! When people call this number, the AI answers instantly.",
    estimatedTimeMinutes: 2,
    impact: "High",
    difficulty: "Medium",
    dependencies: ["profile", "faqs", "services"],
    isCompleted: (state: SetupState) => {
      const bp = (state.settings as any)?.bookingPreferences;
      if (bp?.uncompletedTasks?.includes("phone")) return false;
      return (
        !!bp?.confirmedTasks?.includes("phone") ||
        (!!state.channels && state.channels.filter((c: any) => c.status === "active").length > 0)
      );
    },
    href: "/channels",
  },
  // Phase: Launch
  {
    id: "test_call",
    category: "Launch",
    label: "Make a Test Call",
    description: "Call your AI to experience it firsthand.",
    whyItMatters: "Before you share your number with clients, you must verify the AI sounds exactly how you want.",
    estimatedTimeMinutes: 5,
    impact: "High",
    difficulty: "Easy",
    dependencies: ["phone"],
    isCompleted: (state: SetupState) => {
      const bp = (state.settings as any)?.bookingPreferences;
      if (bp?.uncompletedTasks?.includes("test_call")) return false;
      return (
        !!bp?.confirmedTasks?.includes("test_call") ||
        (!!state.appointments && state.appointments.length > 0) ||
        (!!state.leads && state.leads.length > 0)
      );
    },
    href: "/inbox",
  },
];
