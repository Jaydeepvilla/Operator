export type ImpactScore = "Low" | "Medium" | "High";
export type DifficultyScore = "Easy" | "Medium" | "Advanced";
export type TaskStatus = "completed" | "locked" | "available";

export interface SetupTask {
  id: string;
  category: "Business Info" | "Knowledge Base" | "Appointments" | "AI Customization" | "Channels" | "Launch";
  label: string;
  description: string;
  whyItMatters: string;
  estimatedTimeMinutes: number;
  impact: ImpactScore;
  difficulty: DifficultyScore;
  dependencies: string[]; // array of task IDs that must be completed first
  href: string;
  isCompleted: (state: SetupState) => boolean;
}

export interface SetupState {
  organization?: any;
  profile?: any;
  services?: any[];
  servicesList?: any[];
  faqs?: any[];
  flows?: any[];
  settings?: any;
  staff?: any[];
  channels?: any[];
  leads?: any[];
  appointments?: any[];
  documents?: any[];
}

export interface RecommendationResult {
  task: SetupTask;
  priority: number;
  reason: string;
}

export interface ReadinessScoreResult {
  overallScore: number; // 0 to 100
  missingAreas: string[];
  strongestArea: string | null;
  weakestArea: string | null;
}
