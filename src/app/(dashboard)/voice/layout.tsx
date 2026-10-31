import { redirect } from "next/navigation";
import { checkUserOrganization } from "@/server/actions/onboarding";
import { subscriptionEngine } from "@/server/services/billing/subscription-engine";
import { getPlan } from "@/lib/billing/plans";
import { VoiceLockedView } from "@/components/shared/voice-locked-view";

export default async function VoiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { hasOrg, org } = await checkUserOrganization();
  if (!hasOrg || !org) {
    redirect("/onboarding");
  }

  // Server-side plan gating: phone answering and voice calling start at Pro
  const subStatus = await subscriptionEngine.getSubscriptionStatus(org.id);
  const plan = getPlan(subStatus?.planId);
  const hasVoice = Boolean(plan?.features?.voiceAI);

  if (!hasVoice) {
    return <VoiceLockedView>{children}</VoiceLockedView>;
  }

  return <>{children}</>;
}

