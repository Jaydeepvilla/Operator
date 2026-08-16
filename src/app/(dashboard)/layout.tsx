import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { checkUserOrganization } from "@/server/actions/onboarding";
import { db } from "@/server/db";
import { subscriptions, memberships } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { TrialBanner } from "@/components/shared/trial-banner";
import { DashboardHeaderActions } from "@/components/shared/dashboard-header-actions";
import { SidebarProvider } from "@/components/shared/sidebar-context";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { NotificationEngine } from "@/lib/notification-engine";

// ─── Layout ───────────────────────────────────────────────────────────────────

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const { hasOrg, org } = await checkUserOrganization();

  if (!hasOrg || !org) {
    redirect("/onboarding");
  }
  let subscription: any = null;
  let membership: any = null;
  let notifications: any = [];

  try {
    const results = await Promise.allSettled([
      db.query.subscriptions.findFirst({ where: eq(subscriptions.organizationId, org.id) }),
      userId
        ? db.query.memberships.findFirst({
            where: and(
              eq(memberships.organizationId, org.id),
              eq(memberships.userId, userId)
            ),
          })
        : Promise.resolve(null),
      NotificationEngine.getSmartNotifications(org.id),
    ]);

    if (results[0].status === "fulfilled") subscription = results[0].value;
    if (results[1].status === "fulfilled") membership = results[1].value;
    if (results[2].status === "fulfilled") notifications = results[2].value || [];
  } catch (dbErr) {
    console.warn("Dashboard layout query fallback:", dbErr);
  }

  const isAgency =
    subscription?.planId === "agency" ||
    subscription?.planId === "enterprise";

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
            trialEndsAt={subscription?.trialEnd ?? null}
            planId={subscription?.planId ?? "free"}
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
