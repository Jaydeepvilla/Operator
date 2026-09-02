export const INDUSTRIES = [
  "Dental Clinic",
  "Medical Clinic",
  "Salon",
  "Spa",
  "Law Firm",
  "Consultant",
  "Real Estate",
  "Gym",
  "Other"
] as const;

export const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "EST (US Eastern Time)" },
  { value: "America/Chicago", label: "CST (US Central Time)" },
  { value: "America/Denver", label: "MST (US Mountain Time)" },
  { value: "America/Los_Angeles", label: "PST (US Pacific Time)" },
  { value: "Europe/London", label: "GMT (London/Dublin)" },
  { value: "Europe/Paris", label: "CET (Paris/Berlin/Rome)" },
  { value: "Asia/Kolkata", label: "IST (India Standard Time)" },
  { value: "Asia/Singapore", label: "SGT (Singapore Time)" },
  { value: "Asia/Tokyo", label: "JST (Japan Standard Time)" },
  { value: "Australia/Sydney", label: "AEST (Sydney/Melbourne)" },
] as const;

export const ROLES = ["owner", "admin", "manager", "staff"] as const;

export * from "./routes";
export * from "./brand";
export * from "./widget-events";

