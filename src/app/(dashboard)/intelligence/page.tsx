import React from "react";
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
import { flowsRepository } from "@/server/repositories/flows";
import { conversationsRepository } from "@/server/repositories/conversations";

import { SetupState } from "@/lib/setup-engine/types";
import { BusinessState } from "@/lib/health-engine/types";
import { calculateOverallHealth } from "@/lib/health-engine/overall";
import { detectCriticalIssues } from "@/lib/health-engine/critical-issues";
import { calculateGlobalAIReadiness } from "@/lib/ai-readiness-engine";
import { BIEngine } from "@/lib/business-intelligence";

import { db } from "@/server/db";
import { subscriptions } from "@/server/db/schema";
import { eq } from "drizzle-orm";

import { PageTitle } from "@/components/shared/page-title";
import { IntelligenceDashboardClient } from "@/components/intelligence";

export const metadata = {
  title: "AI Executive Command Center | Operator",
  description: "Executive AI Command Center: Real-time decision metrics, AI summary review, key action recommendations, and business health matrix.",
};

export default async function IntelligencePage() {
  const { org } = await checkUserOrganization();
  if (!org) return null;

  // 1. Fetch complete data for unified state calculation
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
    flows,
    conversations,
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
    flowsRepository.list(org.id),
    conversationsRepository.list(org.id),
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

  // 2. Aggregate into BusinessState & SetupState
  const state: BusinessState & SetupState = {
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
    taxRates,
    flows,
    servicesList: services,
  };

  // 3. Compute Metrics
  const overallHealth = calculateOverallHealth(state);
  const criticalIssues = detectCriticalIssues(state);
  const aiReadiness = calculateGlobalAIReadiness(state);

  // 4. Generate the BI Report
  const report = await BIEngine.getFullReport(org.id, state as any);

  return (
    <div className="space-y-space-6 animate-fade-in w-full pb-space-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-space-4">
        <PageTitle
          title="Executive AI Command Center"
          description="Real-time operations dashboard, receptionist summary, priority tasks, and business growth ideas."
        />
      </div>

      <IntelligenceDashboardClient
        orgName={org.name || "your business"}
        report={report}
        overallHealth={overallHealth}
        aiReadiness={{ overallScore: aiReadiness.overallScore }}
        conversationsCount={conversations.length}
        leadsCount={leads.length}
        criticalIssuesCount={criticalIssues.length}
      />
    </div>
  );
}
