import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { checkUserOrganization } from "@/server/actions/onboarding";
import { evaluateRouteGuard } from "@/server/services/routing/route-guard";
import { db } from "@/server/db";
import { memberships } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { TrialBanner } from "@/components/shared/trial-banner";
import { DashboardHeaderActions } from "@/components/shared/dashboard-header-actions";
import { SidebarProvider } from "@/components/shared/sidebar-context";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { NotificationEngine } from "@/lib/notification-engine";
import { subscriptionEngine } from "@/server/services/billing/subscription-engine";
import { trialReminderEngine } from "@/server/services/billing/trial-reminder-engine";

export const dynamic = "force-dynamic";

// ─── Layout ───────────────────────────────────────────────────────────────────

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  const headerStore = await headers();
  const requestedPath = headerStore.get("x-pathname") || "/dashboard";

  // Authoritative Smart Route Guard resolution
  const decision = await evaluateRouteGuard({
    requestedPath,
    autoRedirect: false,
  });

  if (decision.replace && decision.destination !== requestedPath) {
    redirect(decision.destination);
  }

  const { org } = await checkUserOrganization();
  if (!org) {
    redirect("/onboarding");
  }

  let dynamicSub: any = null;
  let membership: any = null;
  let notifications: any = [];

  try {
    const results = await Promise.allSettled([
      subscriptionEngine.getSubscriptionStatus(org.id),
      userId
        ? db.query.memberships.findFirst({
            where: and(
              eq(memberships.organizationId, org.id),
              eq(memberships.userId, userId)
            ),
          })
        : Promise.resolve(null),
      NotificationEngine.getSmartNotifications(org.id),
      trialReminderEngine.evaluateOrganizationReminders(org.id),
    ]);

    if (results[0].status === "fulfilled") dynamicSub = results[0].value;
    if (results[1].status === "fulfilled") membership = results[1].value;
    if (results[2].status === "fulfilled") notifications = results[2].value || [];
  } catch (dbErr) {
    console.warn("Dashboard layout query fallback:", dbErr);
  }

  const isAgency =
    dynamicSub?.planId === "agency" ||
    dynamicSub?.planId === "enterprise";

  const memberRole = membership?.role ?? "staff";
  const roleLabel =
    memberRole === "owner"
      ? "Owner"
      : memberRole === "admin"
      ? "Admin"
      : memberRole === "manager"
      ? "Manager"
      : "Staff";

  return (
    <SidebarProvider>
      <DashboardShell
        orgName={org.name}
        orgIndustry={org.industry ?? null}
        roleLabel={roleLabel}
        isAgency={isAgency}
        trialBanner={
          <TrialBanner
            status={dynamicSub?.state ?? "TRIALING"}
            planId={dynamicSub?.planId ?? "starter"}
            planName={dynamicSub?.plan?.name ?? "Starter"}
            trialDaysRemaining={dynamicSub?.trialDaysRemaining}
            trialEndsAt={dynamicSub?.trialEndsAt}
            currentPeriodEnd={dynamicSub?.currentPeriodEnd}
            gracePeriodDaysRemaining={dynamicSub?.gracePeriodDaysRemaining}
            convUsage={dynamicSub?.usage?.conversations?.current ?? 0}
            convLimit={dynamicSub?.usage?.conversations?.limit ?? 500}
            voiceUsage={dynamicSub?.usage?.voiceMinutes?.current ?? 0}
            voiceLimit={dynamicSub?.usage?.voiceMinutes?.limit ?? 100}
          />
        }
        headerActions={
          <DashboardHeaderActions 
            roleLabel={roleLabel}
            orgName={org.name}
            orgIndustry={org.industry ?? null}
            initialNotifications={notifications} 
          />
        }
      >
        {children}
      </DashboardShell>
    </SidebarProvider>
  );
}
