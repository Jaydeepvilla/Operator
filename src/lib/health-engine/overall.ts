import { BusinessState, HealthScoreResult, HealthStatus } from "./types";
import { calculateAppointmentQualityScore } from "../quality-engine/appointment-quality";
import { calculateKnowledgeQuality } from "../quality-engine/knowledge-quality";
import { calculateChannelQuality } from "../quality-engine/channel-quality";
import { calculateStaffQualityScore } from "../quality-engine/staff-quality";
import { calculateBillingQualityScore } from "../quality-engine/billing-quality";
import { SETUP_TASKS } from "../setup-engine/tasks";
import { SetupState } from "../setup-engine/types";

export interface OverallHealthResult {
  overallScore: number;
  overallStatus: HealthStatus;
  completionPercentage: number;
  modules: {
    booking: HealthScoreResult;
    knowledge: HealthScoreResult;
    channels: HealthScoreResult;
    staff: HealthScoreResult;
    billing: HealthScoreResult;
  };
}

export function calculateOverallHealth(state: BusinessState): OverallHealthResult {
  const booking = calculateAppointmentQualityScore(state);
  const knowledge = calculateKnowledgeQuality(state) as unknown as HealthScoreResult;
  const channels = calculateChannelQuality(state) as unknown as HealthScoreResult;
  const staff = calculateStaffQualityScore(state);
  const billing = calculateBillingQualityScore(state);

  // Weighted Health Score Formula:
  // Knowledge (25%) + Channels (20%) + Booking (25%) + Staff (20%) + Billing (10%)
  const overallScore = Math.round(
    knowledge.score * 0.25 +
    channels.score * 0.20 +
    booking.score * 0.25 +
    staff.score * 0.20 +
    billing.score * 0.10
  );

  // Calculate Setup Journey Completion dynamically from SETUP_TASKS
  const setupState: SetupState = {
    organization: state.organization,
    profile: state.profile,
    settings: state.settings,
    faqs: state.faqs,
    services: state.services,
    servicesList: state.services,
    flows: state.flows,
    staff: state.staff,
    channels: state.channels,
    leads: state.leads,
    appointments: state.appointments,
    documents: state.documents,
  };

  let completedTasks = 0;
  SETUP_TASKS.forEach(task => {
    if (task.isCompleted(setupState)) {
      completedTasks++;
    }
  });

  const completionPercentage = Math.round((completedTasks / SETUP_TASKS.length) * 100);

  let overallStatus: HealthStatus;
  if (overallScore >= 90) overallStatus = "Excellent";
  else if (overallScore >= 70) overallStatus = "Good";
  else if (overallScore >= 50) overallStatus = "Needs Attention";
  else if (completedTasks < 8) overallStatus = "Calibrating";
  else overallStatus = "Critical";

  return {
    overallScore,
    overallStatus,
    completionPercentage,
    modules: {
      booking,
      knowledge,
      channels,
      staff,
      billing
    }
  };
}
