"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { checkUserOrganization } from "@/server/actions/onboarding";
import { getBillingPortalDataAction, getPaymentProvidersAction } from "@/server/actions/billing";
import { financialMetricsService } from "@/server/services/billing/financial-metrics";
import { BillingPortalClient } from "@/components/forms/billing-portal-client";
import { PageTitle } from "@/components/shared/page-title";
import { BarChartCard } from "@/components/charts";

export default async function BillingPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/api/auth/logout?redirect=/sign-in");
  }

  const { hasOrg, org, isCompleted } = await checkUserOrganization();
  if (!hasOrg || !org || !isCompleted) {
    redirect("/onboarding");
  }

  const [response, providersRes, metrics] = await Promise.all([
    getBillingPortalDataAction(),
    getPaymentProvidersAction(),
    financialMetricsService.calculateRealtimeMetrics(org.id),
  ]);

  if (!response.success) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-center p-space-8 border border-[hsl(var(--foreground)/0.06)] radius-lg bg-[hsl(var(--foreground)/0.02)]">
        <h3 className="text-body-md text-foreground">Couldn’t load billing</h3>
        <p className="text-body-sm text-muted-foreground mt-space-2">
          This is usually temporary. Try refreshing the page.
        </p>
      </div>
    );
  }

  const initialSubscription = response.subscription;
  const initialAccount = response.account;
  const initialInvoices = response.invoices || [];
  const initialPayments = response.payments || [];
  const initialUsageCounters = response.usageCounters || [];

  const providersData = providersRes.success
    ? {
        country: providersRes.country || "US",
        currency: providersRes.currency || "USD",
        language: providersRes.language || "en",
        recommended: providersRes.recommended || [],
        supported: providersRes.supported || [],
        connections: providersRes.connections || [],
      }
    : undefined;

  const chartData = metrics?.mrrHistory || [];

  return (
    <div className="space-y-space-8 animate-fade-in max-w-5xl">
      {/* Page Header */}
      <PageTitle
        title="Billing & Revenue"
        description="Your plan, usage, payment history, and revenue forecast."
      />

      {/* Revenue Forecast Chart */}
      <div className="grid grid-cols-1 gap-space-4 shrink-0">
        <div className="bg-card border border-border-default radius-xl overflow-hidden flex flex-col">
          <div className="p-space-5 pb-space-2 shrink-0">
            <h3 className="text-body-sm font-semibold">Revenue Trend</h3>
            <p className="text-caption text-muted-foreground">Live monthly revenue processed through Operator</p>
          </div>
          <div className="flex-1 p-space-5 pt-space-0">
            <BarChartCard
              data={chartData}
              index="month"
              categories={["revenue"]}
              colors={["#10b981"]}
              height={260}
            />
          </div>
        </div>
      </div>

      <BillingPortalClient
        initialSubscription={initialSubscription}
        initialAccount={initialAccount}
        initialInvoices={initialInvoices}
        initialPayments={initialPayments}
        initialUsageCounters={initialUsageCounters}
        paymentProvidersData={providersData}
      />
    </div>
  );
}
