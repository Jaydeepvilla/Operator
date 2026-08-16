import { BusinessState } from "../../health-engine/types";
import { RevenueEngineResult, RevenueOpportunity } from "../types";

// ─── Revenue opportunity detectors ───────────────────────────────────────────

function detectPricingGaps(state: BusinessState): RevenueOpportunity[] {
  const opportunities: RevenueOpportunity[] = [];
  const services = state.services || [];

  // Services with no price set
  const unpricedServices = services.filter(
    (s: any) => !s.price && s.price !== 0
  );
  if (unpricedServices.length > 0) {
    opportunities.push({
      id: "rev-no-pricing",
      title: "Add Pricing to Your Services",
      description: `${unpricedServices.length} service${unpricedServices.length > 1 ? "s are" : " is"} missing pricing information. Customers who see prices are significantly more likely to complete a booking.`,
      type: "pricing",
      severity: "warning",
      businessImpact: "Transparent pricing reduces friction and increases booking conversion rate",
      estimatedEffort: "quick",
      actionText: "Set Service Prices",
      actionHref: "/services",
      confidence: 88,
    });
  }

  // No services at all
  if (services.length === 0) {
    opportunities.push({
      id: "rev-no-services",
      title: "Add Services to Enable Revenue",
      description: "No services are listed. Customers cannot inquire about or book anything, blocking all potential revenue.",
      type: "pricing",
      severity: "critical",
      businessImpact: "Without services, no revenue can flow through Operator AI",
      estimatedEffort: "quick",
      actionText: "Add Services",
      actionHref: "/services",
      confidence: 98,
    });
  }

  return opportunities;
}

function detectFollowUpGaps(state: BusinessState): RevenueOpportunity[] {
  const opportunities: RevenueOpportunity[] = [];

  const hasPostBookingFlow = (state.flows || []).some((f: any) =>
    /follow.?up|after|post|thank|review|feedback/i.test(f.name || f.description || "")
  );

  if (!hasPostBookingFlow) {
    opportunities.push({
      id: "rev-no-followup",
      title: "Add Post-Visit Follow-Up Automation",
      description: "No post-visit follow-up flow exists. Automated follow-ups drive repeat bookings and collect reviews — two of the highest-ROI actions for a service business.",
      type: "follow_up",
      severity: "warning",
      businessImpact: "Repeat customers cost far less to acquire than new ones and have a higher average lifetime value",
      estimatedEffort: "medium",
      actionText: "Create Follow-Up Flow",
      actionHref: "/flows",
      confidence: 82,
    });
  }

  return opportunities;
}

function detectMembershipGaps(state: BusinessState): RevenueOpportunity[] {
  const hasMembership = (state.services || []).some((s: any) =>
    /member|package|plan|subscri|bundle/i.test(s.name || s.description || "")
  );

  if (hasMembership) return [];

  return [
    {
      id: "rev-membership",
      title: "Introduce Recurring Service Packages",
      description: "No membership or package services exist. Recurring packages lock in revenue, improve cash flow predictability, and increase customer loyalty.",
      type: "membership",
      severity: "opportunity",
      businessImpact: "Recurring revenue is more stable and valuable than one-time transactions",
      estimatedEffort: "medium",
      actionText: "Create a Package",
      actionHref: "/services",
      confidence: 75,
    },
  ];
}

function detectBookingFlowGaps(state: BusinessState): RevenueOpportunity[] {
  const opportunities: RevenueOpportunity[] = [];

  // No booking preferences configured
  const hasBookingConfig = !!state.settings?.bookingPreferences;
  if (!hasBookingConfig) {
    opportunities.push({
      id: "rev-booking-config",
      title: "Configure Booking Preferences",
      description: "Booking preferences are not configured. Without this, the AI cannot collect payment details or enforce booking policies, leading to revenue leakage.",
      type: "booking_flow",
      severity: "warning",
      businessImpact: "Unconfigured booking flows allow no-shows and missed payments",
      estimatedEffort: "quick",
      actionText: "Configure Booking",
      actionHref: "/settings",
      confidence: 85,
    });
  }

  return opportunities;
}

function detectAutomationRevenueGaps(state: BusinessState): RevenueOpportunity[] {
  const opportunities: RevenueOpportunity[] = [];

  // No reminder automations → high no-show rate risk
  const hasReminders = !!(
    state.appointmentReminders && state.appointmentReminders.length > 0
  );
  if (!hasReminders) {
    opportunities.push({
      id: "rev-no-reminders",
      title: "Reduce No-Shows with Automated Reminders",
      description: "No appointment reminders are configured. No-shows are a direct revenue loss. Automated reminders consistently reduce them.",
      type: "automation",
      severity: "warning",
      businessImpact: "Every prevented no-show is direct recovered revenue",
      estimatedEffort: "quick",
      actionText: "Set Up Reminders",
      actionHref: "/settings",
      confidence: 90,
    });
  }

  return opportunities;
}

// ─── Revenue readiness score ──────────────────────────────────────────────────

function calculateRevenueScore(state: BusinessState): number {
  let score = 100;
  const services = state.services || [];

  if (services.length === 0) score -= 40;
  else {
    const unpricedCount = services.filter((s: any) => !s.price && s.price !== 0).length;
    score -= Math.min(20, unpricedCount * 5);
  }

  if (!state.settings?.bookingPreferences) score -= 15;
  if (!(state.appointmentReminders?.length ?? 0)) score -= 15;
  if (!(state.flows?.length ?? 0)) score -= 10;

  return Math.max(0, score);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function runRevenueEngine(state: BusinessState): RevenueEngineResult {
  const opportunities: RevenueOpportunity[] = [
    ...detectPricingGaps(state),
    ...detectFollowUpGaps(state),
    ...detectMembershipGaps(state),
    ...detectBookingFlowGaps(state),
    ...detectAutomationRevenueGaps(state),
  ];

  // Sort: critical → warning → opportunity
  opportunities.sort((a, b) => {
    const order = { critical: 0, warning: 1, opportunity: 2, info: 3 };
    return order[a.severity] - order[b.severity];
  });

  return {
    opportunities,
    revenueReadinessScore: calculateRevenueScore(state),
  };
}
