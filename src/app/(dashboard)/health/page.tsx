import React from "react";
import { calculateAppointmentQualityScore } from "@/lib/quality-engine/appointment-quality";
import { calculateStaffQualityScore } from "@/lib/quality-engine/staff-quality";
import { calculateBillingQualityScore } from "@/lib/quality-engine/billing-quality";
import { checkUserOrganization } from "@/server/actions/onboarding";
import { organizationRepository } from "@/server/repositories/organization";
import { profileRepository } from "@/server/repositories/profile";
import { servicesRepository } from "@/server/repositories/services";
import { staffRepository } from "@/server/repositories/staff";
import { settingsRepository } from "@/server/repositories/settings";
import { leadsRepository } from "@/server/repositories/leads";
import { faqRepository } from "@/server/repositories/faq";
import { documentsRepository } from "@/server/repositories/documents";
import { omnichannelRepository } from "@/server/repositories/omnichannel";
import { rulesRepository } from "@/server/repositories/rules";
import { importsRepository } from "@/server/repositories/imports";

import { BusinessState } from "@/lib/health-engine/types";
import { calculateOverallHealth } from "@/lib/health-engine/overall";
import { detectCriticalIssues } from "@/lib/health-engine/critical-issues";
import { calculateGlobalAIReadiness } from "@/lib/ai-readiness-engine";
import { runGapAnalysis } from "@/lib/gap-analysis-engine";
import { runIndustryBenchmark } from "@/lib/industry-benchmark-engine";
import { getAutomationOpportunities } from "@/lib/automation-engine";
import { RecommendationState } from "@/lib/recommendation-engine/types";
import { getNextBestAction } from "@/lib/recommendation-engine/engine";
import { calculateKnowledgeQuality } from "@/lib/quality-engine/knowledge-quality";
import { calculateChannelQuality } from "@/lib/quality-engine/channel-quality";
import { calculateCrmQuality } from "@/lib/quality-engine/crm-quality";

import { db } from "@/server/db";
import { subscriptions } from "@/server/db/schema";
import { eq } from "drizzle-orm";

import { PageTitle } from "@/components/shared/page-title";
import { HealthDashboardClient } from "@/components/health/health-dashboard-client";

export const metadata = {
  title: "AI Command Center | Operator",
  description: "Real-time analysis of Operator AI's capabilities, active blocker issues, and operational health.",
};

export default async function HealthDashboardPage() {
  const { org } = await checkUserOrganization();
  if (!org) return null;

  // 1. Fetch ALL data required for the health modules
  const [
    organization,
    profile,
    services,
    staff, 
    settings, 
    leads, 
    faqs, 
    documents, 
    channels, 
    rules, 
    imports,
    calendarConnections,
    serviceAssignments,
    staffSchedules,
    staffAvailability,
    appointmentReminders,
    billingAccount,
    taxRates,
    subscription
  ] = await Promise.all([
    organizationRepository.getById(org.id),
    profileRepository.getByOrg(org.id),
    servicesRepository.list(org.id),
    staffRepository.list(org.id),
    settingsRepository.getByOrg(org.id),
    leadsRepository.listProfiles(org.id),
    faqRepository.list(org.id),
    documentsRepository.list(org.id),
    omnichannelRepository.listChannels(org.id),
    rulesRepository.getByOrganization(org.id),
    importsRepository.list(org.id),
    import("@/server/repositories/calendar").then(m => m.calendarRepository.listConnections(org.id)),
    staffRepository.listAllAssignments(org.id),
    staffRepository.listAllSchedules(org.id),
    staffRepository.listAllAvailabilityExceptions(org.id),
    import("@/server/repositories/reminders").then(m => m.remindersRepository.listByOrganization(org.id)),
    import("@/server/repositories/billing").then(m => m.billingRepository.getBillingAccount(org.id)),
    import("@/server/repositories/tax").then(m => m.taxRepository.getTaxRates()),
    db.query.subscriptions.findFirst({ where: eq(subscriptions.organizationId, org.id) })
  ]);

  // Fetch payment methods and tax profiles if billing account exists
  let paymentMethods: any[] = [];
  let taxProfiles: any[] = [];
  if (billingAccount) {
    const [pm, tp] = await Promise.all([
      import("@/server/repositories/billing").then(m => m.billingRepository.getPaymentMethods(billingAccount.id)),
      import("@/server/repositories/tax").then(m => m.taxRepository.getTaxProfile(billingAccount.id))
    ]);
    paymentMethods = pm;
    if (tp) taxProfiles = [tp];
  }

  // 2. Aggregate into BusinessState
  const state: BusinessState = {
    organization,
    profile,
    services,
    staff,
    settings,
    leads,
    faqs,
    documents,
    channels,
    rules: rules ? [rules] : [],
    imports,
    calendarConnections,
    serviceAssignments,
    staffSchedules,
    staffAvailability,
    appointmentReminders,
    billingAccounts: billingAccount ? [billingAccount] : [],
    paymentMethods,
    taxProfiles,
    taxRates
  };

  // 3. Calculate Scores & Critical Issues
  const overallHealth = calculateOverallHealth(state);
  const criticalIssues = detectCriticalIssues(state);
  const aiReadiness = calculateGlobalAIReadiness(state);
  const gapAnalysis = runGapAnalysis(state);
  const industryBenchmark = runIndustryBenchmark(state);
  const automationOpportunities = getAutomationOpportunities(state as any);

  // 4. Recommendation Engine
  const prefs = settings?.recommendationPreferences as { dismissed?: string[], snoozed?: Record<string, string> } || {};
  const recommendationState: RecommendationState = {
    ...state,
    recommendationHistory: {
      dismissed: prefs.dismissed || [],
      snoozed: prefs.snoozed || {}
    }
  };
  const nextBestAction = getNextBestAction(recommendationState);

  // 5. Quality Scores
  const knowledgeQuality = calculateKnowledgeQuality(state);
  const channelsQuality = calculateChannelQuality(state);
  const crmQuality = calculateCrmQuality(state);
  const appointmentQuality = calculateAppointmentQualityScore(state);
  const staffQuality = calculateStaffQualityScore(state);
  const billingQuality = calculateBillingQualityScore(state);

  // 6. Plan Label Resolution
  const planLabel = subscription?.planId === "pro" 
    ? "Professional Plan" 
    : subscription?.planId === "enterprise" 
    ? "Enterprise Plan" 
    : subscription?.planId === "free"
    ? "Free Plan"
    : "No Active Plan";

  return (
    <div className="space-y-space-6 animate-fade-in w-full pb-space-10">
      <PageTitle 
        title="AI Command Center" 
        description="Monitor capabilities, connected channels, and prioritized improvement vectors for Operator AI."
      />

      <HealthDashboardClient 
        orgName={org.name || "your business"}
        orgIndustry={org.industry ?? null}
        overallHealth={overallHealth}
        criticalIssues={criticalIssues}
        aiReadiness={aiReadiness}
        gapAnalysis={gapAnalysis}
        industryBenchmark={industryBenchmark}
        automationOpportunities={automationOpportunities}
        nextBestAction={nextBestAction}
        qualityScores={{
          knowledge: knowledgeQuality,
          channels: channelsQuality,
          crm: crmQuality,
          appointment: appointmentQuality,
          staff: staffQuality,
          billing: billingQuality
        }}
        stats={{
          faqCount: faqs.length,
          docCount: documents.length,
          staffCount: staff.length,
          servicesCount: services.length,
          channelCount: channels.length,
          hasBilling: !!billingAccount,
          planName: planLabel
        }}
      />
    </div>
  );
}
