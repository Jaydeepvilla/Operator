"use server";

import { redirect } from "next/navigation";
import { checkUserOrganization } from "@/server/actions/onboarding";
import {
  getCallSessionsAction,
  getVoicemailMessagesAction,
  getVoiceAnalyticsAction,
  getPhoneNumbersAction
} from "@/server/actions/voice";
import { VoiceCockpitClient } from "@/components/forms/voice-cockpit-client";

export default async function VoiceDashboardPage() {
  const { hasOrg } = await checkUserOrganization();
  if (!hasOrg) {
    redirect("/onboarding");
  }

  const [sessionsRes, voicemailsRes, analyticsRes, numbersRes] = await Promise.all([
    getCallSessionsAction(10), // load last 10 call sessions
    getVoicemailMessagesAction(), // load voicemail messages
    getVoiceAnalyticsAction(), // load daily analytics counters
    getPhoneNumbersAction(), // load phone lines
  ]);

  const initialSessions = sessionsRes.success && sessionsRes.sessions ? sessionsRes.sessions : [];
  const initialVoicemails = voicemailsRes.success && voicemailsRes.voicemails ? voicemailsRes.voicemails : [];
  const initialAnalytics = analyticsRes.success && analyticsRes.analytics ? analyticsRes.analytics : [];
  const initialNumbers = numbersRes.success && numbersRes.numbers ? numbersRes.numbers : [];

  return (
    <div className="space-y-space-6 animate-fade-in w-full pb-space-12">
      <div className="shrink-0">
        <h1 className="text-title-lg font-semibold tracking-tight-md text-foreground">
          Voice
        </h1>
        <p className="text-body-sm text-muted-foreground mt-space-0.5">
          See who's calling, listen to recordings, and check voicemail.
        </p>
      </div>

      <VoiceCockpitClient
        initialSessions={initialSessions}
        initialVoicemails={initialVoicemails}
        initialAnalytics={initialAnalytics}
        initialNumbers={initialNumbers}
      />
    </div>
  );
}
