import { redirect } from "next/navigation";
import { checkUserOrganization } from "@/server/actions/onboarding";
import { db } from "@/server/db";
import { subscriptions } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { isWhiteLabelEnabled } from "@/lib/config/feature-flags";

export default async function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Feature flag check: redirect to dashboard if White Label is disabled
  if (!isWhiteLabelEnabled()) {
    redirect("/dashboard");
  }

  const { hasOrg, org } = await checkUserOrganization();
  if (!hasOrg || !org) {
    redirect("/onboarding");
  }

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.organizationId, org.id),
  });

  const isAgency =
    subscription?.planId === "agency" ||
    subscription?.planId === "enterprise";

  if (!isAgency) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
