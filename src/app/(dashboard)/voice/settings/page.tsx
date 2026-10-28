"use server";

import { redirect } from "next/navigation";
import { checkUserOrganization } from "@/server/actions/onboarding";
import { getVoiceSettingsAction, getRoutingRulesAction } from "@/server/actions/voice";
import { VoiceSettingsClient } from "@/components/forms/voice-settings-client";

export default async function VoiceSettingsPage() {
  const { hasOrg } = await checkUserOrganization();
  if (!hasOrg) {
    redirect("/onboarding");
  }

  const [settingsRes, rulesRes] = await Promise.all([
    getVoiceSettingsAction(),
    getRoutingRulesAction(),
  ]);

  const initialSettings = settingsRes.success && settingsRes.settings ? settingsRes.settings : null;
  const initialRules = rulesRes.success && rulesRes.rules ? rulesRes.rules : [];

  return (
    <div className="space-y-space-6 animate-fade-in w-full pb-space-12">
      <div className="shrink-0">
        <h1 className="text-title-lg font-semibold tracking-tight-md text-foreground">
          Voice Settings & Routing
        </h1>
        <p className="text-body-sm text-muted-foreground mt-space-0.5">
          Customize speaking personalities, greetings, fallback numbers, and custom call routing logic.
        </p>
      </div>

      <VoiceSettingsClient initialSettings={initialSettings} initialRules={initialRules} />
    </div>
  );
}
