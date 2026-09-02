import { BusinessState } from "../../health-engine/types";
import { GapCalculator, GapAnalysisResult } from "../types";
import { RecommendationAction } from "../../recommendation-engine/types";

export const calculateStaffGaps: GapCalculator = (state: BusinessState) => {
  const missingItems: string[] = [];
  const recommendations: RecommendationAction[] = [];
  let score = 100;
  
  const staff = (state.staff && state.staff.length > 0)
    ? state.staff
    : state.organization
    ? [{ id: "owner", name: state.organization.name, role: "Owner / Primary Specialist" }]
    : [];
  
  if (staff.length === 0) {
    missingItems.push("No Staff Members");
    score -= 15;
    recommendations.push({
      id: "missing-staff-none",
      title: "Add Staff Members",
      description: "Add team members or practitioners to enable staff-specific appointment scheduling.",
      impactReason: "Allows assigning bookings to specific team members.",
      impact: "Medium",
      estimatedTimeMinutes: 5,
      confidence: 90,
      confidenceReason: "Data check",
      primaryCtaText: "Add Staff",
      primaryCtaHref: "/staff"
    });
    return { score, completeness: score, missingItems, recommendations };
  }

  // Check for staff missing profiles or availability
  let missingProfiles = 0;
  
  staff.forEach(member => {
    if (!member.bio || !member.avatar) {
      missingProfiles++;
    }
  });

  if (missingProfiles > 0) {
    missingItems.push(`${missingProfiles} Staff missing profile info`);
    score -= 10;
    recommendations.push({
      id: "missing-staff-profiles",
      title: "Complete Staff Profiles",
      description: `${missingProfiles} staff members are missing a bio or avatar.`,
      impactReason: "Completed profiles improve the booking experience for your clients.",
      impact: "Medium",
      estimatedTimeMinutes: missingProfiles * 5,
      confidence: 90,
      confidenceReason: "Data check",
      primaryCtaText: "Edit Staff",
      primaryCtaHref: "/staff"
    });
  }

  return {
    score: Math.max(0, score),
    completeness: Math.max(0, score),
    missingItems,
    recommendations
  };
};
