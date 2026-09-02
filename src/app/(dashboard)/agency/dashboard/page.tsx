"use server";

import { redirect } from "next/navigation";
import { checkUserOrganization } from "@/server/actions/onboarding";
import { getAgencyContextAction as getContext, getAgencyAuditLogsAction as getLogs } from "@/server/actions/agency";
import { getRevenueMetricsAction as getRevenue } from "@/server/actions/billing";
import { AgencyDashboardClient } from "@/components/forms/agency-dashboard-client";

export default async function AgencyDashboardPage() {
 const { hasOrg } = await checkUserOrganization();
 if (!hasOrg) {
 redirect("/onboarding");
 }

 const [agencyRes, logsRes, revenueRes] = await Promise.all([
 getContext(),
 getLogs(),
 getRevenue(),
 ]);

 if (!agencyRes.success || !agencyRes.agency) {
 return (
 <div className="flex h-96 flex-col items-center justify-center text-center p-space-8 border radius-lg border-border">
 <h3 className="text-title-lg text-foreground">Failed to initialize Agency profile</h3>
 <p className="text-body-sm text-muted-foreground mt-space-2">
 An error occurred: {agencyRes.error}
 </p>
 </div>
 );
 }

 const initialAgency = agencyRes.agency;
 const initialLogs = logsRes.success && logsRes.logs ? logsRes.logs : [];
 const initialMetrics = revenueRes.success && revenueRes.metrics ? revenueRes.metrics : null;

 return (
 <div className="space-y-space-8 animate-fade-in">
 <div>
 <h1 className="text-heading-lg tracking-tight text-foreground sm:text-heading-lg">
 Agency Command Overview
 </h1>
 <p className="text-body-sm text-muted-foreground mt-space-1">
          Monitor your white-label platform usage, track recurring revenues (MRR/ARR), and audit reseller activities.
        </p>
      </div>

      <AgencyDashboardClient agency={initialAgency} logs={initialLogs} metrics={initialMetrics} />
    </div>
  );
}
