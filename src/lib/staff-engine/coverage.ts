import { RecommendationAction, RecommendationState } from "../recommendation-engine/types";

export function checkCoverage(state: RecommendationState): RecommendationAction[] {
  const recommendations: RecommendationAction[] = [];
  const services = state.services || [];
  const staff = state.staff || [];
  const assignments = state.serviceAssignments || [];

  if (services.length > 0 && staff.length === 0) {
    recommendations.push({
      id: "staff-missing-team",
      title: "Add Team Members",
      description: "You have services defined but no staff members. Operator AI needs to know who provides these services.",
      primaryCtaText: "Add Staff",
      primaryCtaHref: "/settings/staff",
      estimatedTimeMinutes: 5,
      impact: "High",
      impactReason: "Without staff, appointments cannot be booked.",
      confidence: 100,
      confidenceReason: "Staff count is zero.",
    });
    return recommendations;
  }

  if (staff.length > 0) {
    // Check if any services have NO staff assigned
    const assignedServiceIds = new Set(assignments.map(a => a.serviceId));
    const unassignedServices = services.filter(s => !assignedServiceIds.has(s.id));

    if (unassignedServices.length > 0) {
      recommendations.push({
        id: "staff-unassigned-services",
        title: "Services Without Staff",
        description: `You have ${unassignedServices.length} service(s) that cannot be booked because no staff members are assigned to them.`,
        primaryCtaText: "Assign Staff",
        primaryCtaHref: "/settings/services",
        estimatedTimeMinutes: 2,
        impact: "High",
        impactReason: "Customers asking for these services will be told they are unavailable.",
        confidence: 100,
        confidenceReason: "Found services with no linked assignments.",
      });
    }

    // Check if any staff have NO services assigned
    const assignedStaffIds = new Set(assignments.map(a => a.staffMemberId));
    const unassignedStaff = staff.filter(s => !assignedStaffIds.has(s.id));

    if (unassignedStaff.length > 0) {
      recommendations.push({
        id: "staff-unassigned-staff",
        title: "Staff Without Services",
        description: `You have ${unassignedStaff.length} team member(s) who aren't assigned to any services. They cannot be booked.`,
        primaryCtaText: "Assign Services",
        primaryCtaHref: "/settings/staff",
        estimatedTimeMinutes: 2,
        impact: "Medium",
        impactReason: "These staff members are essentially invisible to the booking system.",
        confidence: 100,
        confidenceReason: "Found staff with no linked assignments.",
      });
    }
  }

  return recommendations;
}
