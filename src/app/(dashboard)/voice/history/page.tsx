"use server";

import { redirect } from "next/navigation";
import { checkUserOrganization } from "@/server/actions/onboarding";
import { getCallSessionsAction } from "@/server/actions/voice";
import { VoiceHistoryClient } from "@/components/forms/voice-history-client";

export default async function VoiceHistoryPage() {
  const { hasOrg } = await checkUserOrganization();
  if (!hasOrg) {
    redirect("/onboarding");
  }

  const response = await getCallSessionsAction(50, 0); // Load last 50 call logs
  const initialSessions = response.success && response.sessions ? response.sessions : [];

  return (
    <div className="space-y-space-6 animate-fade-in w-full pb-space-12">
      <div className="shrink-0">
        <h1 className="text-title-lg font-semibold tracking-tight-md text-foreground">
          Call Logs History
        </h1>
        <p className="text-body-sm text-muted-foreground mt-space-0.5">
          Review, filter, and audit detailed transcripts and summaries for all historical inbound and outbound calls.
        </p>
      </div>

      <VoiceHistoryClient initialSessions={initialSessions} />
    </div>
  );
}
