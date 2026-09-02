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
      const p = state.profile;
      const bp = (state.settings as any)?.bookingPreferences;
      if (bp?.confirmedTasks?.includes("profile")) return true;
      return !!p?.description && !!p?.name && p?.name !== "My Business" && p?.description !== "Standard business profile";
    },
    href: "/profile",
  },
  {
    id: "hours",
    category: "Business Info",
    label: "Business Hours",
    description: "Set your working hours so the AI knows when you're open.",
    whyItMatters: "If a caller asks 'Are you open?', the AI needs accurate hours to respond correctly rather than guessing.",
    estimatedTimeMinutes: 2,
    impact: "Medium",
    difficulty: "Easy",
    dependencies: [],
    isCompleted: (state: SetupState) => {
      const bp = (state.settings as any)?.bookingPreferences;
      return !!bp?.hoursConfigured || !!bp?.confirmedTasks?.includes("hours");
    },
    href: "/settings",
  },
  // Phase: Knowledge Base
  {
    id: "faqs",
    category: "Knowledge Base",
    label: "FAQs",
    description: "Add common questions so your AI can answer them instantly.",
    whyItMatters: "Most calls are repetitive questions. By adding FAQs, you train the AI to handle them without interrupting you.",
    estimatedTimeMinutes: 5,
    impact: "High",
    difficulty: "Medium",
    dependencies: ["profile"],
    isCompleted: (state: SetupState) => {
      const bp = (state.settings as any)?.bookingPreferences;
      if (bp?.confirmedTasks?.includes("faqs")) return true;
      if (!state.faqs || state.faqs.length === 0) return false;
      // Must have real custom FAQs, not auto-seeded clinic templates
      return state.faqs.some(
        (f: any) =>
          !f.isTemplate &&
          !f.question?.toLowerCase().includes("insurance do you take") &&
          !f.question?.toLowerCase().includes("parking available") &&
          !f.question?.toLowerCase().includes("cancellation policy") &&
          !f.question?.toLowerCase().includes("sample")
      );
    },
    href: "/faqs",
  },
  {
    id: "kb",
    category: "Knowledge Base",
    label: "Website Import",
    description: "Import your website content to train your AI.",
    whyItMatters: "Your website already contains gold. Instead of typing FAQs manually, let the AI read your site to learn everything.",
    estimatedTimeMinutes: 1,
    impact: "High",
    difficulty: "Easy",
    dependencies: ["profile"],
    isCompleted: (state: SetupState) => {
      const bp = (state.settings as any)?.bookingPreferences;
      return (
        !!bp?.confirmedTasks?.includes("kb") ||
        (!!state.settings?.websiteImportUrl && state.settings?.websiteImportStatus === "completed")
      );
    },
    href: "/kb",
  },
  // Phase: Appointments
  {
    id: "services",
    category: "Appointments",
    label: "Services",
    description: "Add the services you offer so customers can book them.",
    whyItMatters: "The AI cannot book appointments unless it knows exactly what services you offer and how long they take.",
    estimatedTimeMinutes: 3,
    impact: "High",
    difficulty: "Medium",
    dependencies: [],
    isCompleted: (state: SetupState) => {
      const bp = (state.settings as any)?.bookingPreferences;
      if (bp?.servicesConfigured || bp?.confirmedTasks?.includes("services")) return true;
      if (!state.servicesList || state.servicesList.length === 0) return false;
      // Must not be just unedited generic placeholders
      return state.servicesList.some(
        (s: any) =>
          !s.isTemplate &&
          s.name !== "General Consultation" &&
          s.name !== "Follow-up Appointment" &&
          s.name !== "Initial Assessment"
      );
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
      if (bp?.confirmedTasks?.includes("flows")) return true;
      if (!state.flows || state.flows.length === 0) return false;
      // Filter out auto-seeded generic symptoms template
      return state.flows.some(
        (f: any) =>
          !f.isTemplate &&
          !f.question?.toLowerCase().includes("symptoms are you experiencing") &&
          !f.question?.toLowerCase().includes("first visit to our clinic") &&
          !f.question?.toLowerCase().includes("urgency of your visit")
      );
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
      return !!bp?.confirmedTasks?.includes("ai_tone") || !!(state.settings as any)?.aiVoiceToneConfigured;
    },
    href: "/settings/ai",
  },
  // Phase: Channels
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
      return (
        !!bp?.confirmedTasks?.includes("test_call") ||
        (!!state.appointments && state.appointments.length > 0) ||
        (!!state.leads && state.leads.length > 0)
      );
    },
    href: "/inbox",
  },
];
