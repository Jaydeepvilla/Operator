import { redirect } from "next/navigation";
import { checkUserOrganization } from "@/server/actions/onboarding";
import { getVoicePromptAction } from "@/server/actions/voice";
import { PageTitle } from "@/components/shared/page-title";
import { PromptSettingsClient } from "./prompt-settings-client";
import { profileRepository } from "@/server/repositories/profile";
import { settingsRepository } from "@/server/repositories/settings";
import { promptService } from "@/server/services/prompt";

export const metadata = {
  title: "AI Prompt Configuration | Settings",
  description: "Customize prompt system instructions, constraints, and tone profiles for Operator AI.",
};

export default async function AIPromptSettingsPage() {
  const { hasOrg, org } = await checkUserOrganization();
  if (!hasOrg || !org) {
    redirect("/onboarding");
  }

  // Load active prompt and business details for preview
  const [promptRes, profile, settings] = await Promise.all([
    getVoicePromptAction(),
    profileRepository.getByOrg(org.id),
    settingsRepository.getByOrg(org.id),
  ]);

  const initialPromptText = promptRes.success && promptRes.prompt ? promptRes.prompt.promptText : "";

  // Compile a live preview of the system prompt
  const previewPrompt = await promptService.buildSystemPrompt({
    organizationId: org.id,
    ragContext: "[[ RAG Knowledge Base reference matching is injected here at runtime ]]",
    nextQuestionText: "Would you like to book an appointment?",
  });

  return (
    <div className="space-y-space-6 animate-fade-in w-full pb-space-12">
      <PageTitle
        title="AI Prompt Configuration"
        description="Fine-tune Operator AI's system instructions, general guidelines, and core answering persona."
      />

      <PromptSettingsClient 
        initialPromptText={initialPromptText}
        previewPrompt={previewPrompt}
        businessDescription={profile?.description || ""}
        orgName={org.name}
      />
    </div>
  );
}
