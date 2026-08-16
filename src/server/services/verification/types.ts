export type VerificationScenarioType =
  | "pricing_hours"
  | "booking_availability"
  | "safety_boundary"
  | "voice_persona";

export type VerificationStatus =
  | "unverified"
  | "verifying"
  | "verified"
  | "needs_review";

export type ScenarioRunStatus =
  | "pending"
  | "running"
  | "passed"
  | "failed"
  | "stale";

export interface ScenarioInvariant {
  targetEntity: "services" | "settings" | "staff" | "policies";
  expectedMatch: string;
  comparisonType: "exact_price" | "available_slot" | "safe_refusal" | "voice_preview";
}

export interface VerificationScenario {
  id: string;
  type: VerificationScenarioType;
  title: string;
  description: string;
  simulatedUserInput: string;
  required: boolean;
  invariant: ScenarioInvariant;
  entityId?: string; // e.g. serviceId
  entityMetadata?: Record<string, any>;
  lastResult?: ScenarioEvaluationResult | null;
}

export interface ScenarioEvaluationResult {
  scenarioId: string;
  scenarioType: VerificationScenarioType;
  status: ScenarioRunStatus;
  actualOutput: string;
  matchedInvariant: string;
  humanEvidence: string;
  evaluatedAt: string;
  latencyMs: number;
  errorMessage?: string;
}

export interface OrganizationVerificationMetadata {
  status: VerificationStatus;
  verifiedAt?: string | null;
  configVersion: number;
  scenarios: Record<string, ScenarioEvaluationResult>;
  lastUpdatedBy?: string | null;
}
