export type HealthStatus = "Excellent" | "Good" | "Needs Attention" | "Critical" | "Calibrating";
export type ReadyStatus = "Ready" | "Partially Ready" | "Not Ready";
export type PriorityLevel = "Low" | "Medium" | "High" | "Critical";

export interface HealthScoreResult {
  score: number; // 0 to 100
  status: HealthStatus | ReadyStatus;
  reason: string;
  confidence: number; // 0 to 100
  missingRequirements: string[];
  recommendations: string[];
  lastUpdated: string;
  maxScore?: number;
  formula?: string;
  whyLow?: string;
  exactActions?: string[];
}

export interface CriticalIssue {
  id: string;
  category: string;
  priority: PriorityLevel;
  reason: string;
  impact: string;
  estimatedFixTimeMinutes: number;
  ctaText: string;
  href: string;
}

// BusinessState represents the complete aggregated data needed for scoring.
// We make all fields optional so we can partially calculate scores if some data is missing,
// but a full calculation requires all of them.
export interface BusinessState {
  organization?: any;
  profile?: any;
  services?: any[];
  staff?: any[];
  faqs?: any[];
  documents?: any[];
  flows?: any[];
  settings?: any;
  leads?: any[];
  rules?: any[];
  appointments?: any[];
  imports?: any[];
  
  // New Staff & Appointment Engine Requirements
  calendarConnections?: any[];
  serviceAssignments?: any[];
  staffSchedules?: any[];
  staffAvailability?: any[];
  appointmentReminders?: any[];
  channels?: any[];

  // New Billing Engine Requirements
  billingAccounts?: any[];
  paymentMethods?: any[];
  taxProfiles?: any[];
  taxRates?: any[];
}
