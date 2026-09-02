import { RecommendationAction, RecommendationState } from "../recommendation-engine/types";

export function checkWorkingHours(state: RecommendationState): RecommendationAction[] {
  const recommendations: RecommendationAction[] = [];
  const staff = state.staff || [];
  const schedules = state.staffSchedules || [];

  if (staff.length === 0) return []; // Handled by coverage.ts

  const staffWithSchedules = new Set(schedules.map(s => s.staffMemberId));
  const staffWithoutSchedules = staff.filter(s => !staffWithSchedules.has(s.id));

  if (staffWithoutSchedules.length > 0) {
    recommendations.push({
      id: "staff-missing-schedules",
      title: "Missing Working Hours",
      description: `You have ${staffWithoutSchedules.length} staff member(s) without configured working hours.`,
      primaryCtaText: "Set Working Hours",
      primaryCtaHref: "/staff",
      estimatedTimeMinutes: 5,
      impact: "High",
      impactReason: "Staff cannot be booked if the AI doesn't know when they are working.",
      confidence: 100,
      confidenceReason: "Found staff missing entirely from the schedules table.",
    });
  }

  // Check for breaks (shifts configuration)
  // E.g., if any day has only one long shift > 6 hours without a break
  let longShiftCount = 0;
  for (const schedule of schedules) {
    if (schedule.shifts && schedule.shifts.length === 1) {
      const shift = schedule.shifts[0];
      // Assume "HH:MM" format
      const startH = parseInt(shift.start.split(":")[0]);
      const endH = parseInt(shift.end.split(":")[0]);
      if ((endH - startH) > 6) {
        longShiftCount++;
      }
    }
  }

  if (longShiftCount > 0) {
    recommendations.push({
      id: "staff-missing-breaks",
      title: "Missing Break Times",
      description: `We detected ${longShiftCount} working days configured as a single long block (6+ hours). Consider adding lunch or rest breaks.`,
      primaryCtaText: "Configure Breaks",
      primaryCtaHref: "/staff",
      estimatedTimeMinutes: 3,
      impact: "Medium",
      impactReason: "Prevents staff from being overbooked without time to eat or rest.",
      confidence: 80,
      confidenceReason: "Long continuous shifts often indicate missing breaks.",
    });
  }

  return recommendations;
}
