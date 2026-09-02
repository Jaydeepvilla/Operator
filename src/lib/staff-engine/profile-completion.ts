import { RecommendationAction, RecommendationState } from "../recommendation-engine/types";

export function checkProfileCompletion(state: RecommendationState): RecommendationAction[] {
  const recommendations: RecommendationAction[] = [];
  const staff = state.staff || [];

  if (staff.length === 0) return [];

  let missingAvatars = 0;
  let missingContact = 0;

  for (const s of staff) {
    if (!s.avatarUrl) missingAvatars++;
    if (!s.phone && !s.email) missingContact++;
  }

  if (missingAvatars > 0) {
    recommendations.push({
      id: "staff-missing-avatars",
      title: "Missing Staff Photos",
      description: `${missingAvatars} team member(s) are missing profile photos. Photos help build trust with your customers.`,
      primaryCtaText: "Upload Photos",
      primaryCtaHref: "/staff",
      estimatedTimeMinutes: 2,
      impact: "Low",
      impactReason: "Visual profiles increase booking conversion.",
      confidence: 100,
      confidenceReason: "Null avatarUrl fields found.",
    });
  }

  if (missingContact > 0) {
    recommendations.push({
      id: "staff-missing-contact",
      title: "Missing Staff Contact Info",
      description: `${missingContact} team member(s) have no phone or email listed. The AI needs this to notify them of bookings.`,
      primaryCtaText: "Add Contact Info",
      primaryCtaHref: "/staff",
      estimatedTimeMinutes: 2,
      impact: "High",
      impactReason: "Staff won't receive notifications about their appointments.",
      confidence: 100,
      confidenceReason: "Both phone and email are null.",
    });
  }

  return recommendations;
}
