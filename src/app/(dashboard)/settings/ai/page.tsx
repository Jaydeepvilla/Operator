import { redirect } from "next/navigation";
import Link from "next/link";
import { checkUserOrganization } from "@/server/actions/onboarding";
import { getAIPersonaSettingsAction } from "@/server/actions/voice";
import { PageTitle } from "@/components/shared/page-title";
import { PromptSettingsClient } from "./prompt-settings-client";
import { promptService } from "@/server/services/prompt";

export const metadata = {
  title: "AI Persona & Prompts | Settings",
  description: "Customize your AI receptionist name, tone of voice, business description, and custom behavioral rules.",
};

export default async function AIPromptSettingsPage() {
  const { hasOrg, org } = await checkUserOrganization();
  if (!hasOrg || !org) {
    redirect("/onboarding");
  }

  // Load active persona, prompt, and business details
  const personaRes = await getAIPersonaSettingsAction();
  const personaData = personaRes.success && personaRes.data ? personaRes.data : {
    assistantName: "Ava",
    tone: "professional",
    businessDescription: "",
    customInstructions: "",
  };

  // Compile a live preview of the system prompt
  const previewPrompt = await promptService.buildSystemPrompt({
    organizationId: org.id,
    ragContext: "[[ RAG Knowledge Base reference matching is injected here at runtime ]]",
    nextQuestionText: "Would you like to book an appointment?",
  });

  return (
    <div className="space-y-space-6 animate-fade-in w-full pb-space-12">
      <PageTitle
        title="AI Persona & Prompts"
        description="Fine-tune your AI receptionist's identity, tone of voice, core business description, and custom guardrails."
      />

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-space-2 border-b border-border-default pb-space-3">
        <Link
          href="/settings"
          className="px-space-3.5 py-space-1.5 radius-md text-body-sm font-medium text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--foreground)/0.04)] transition-colors"
        >
          Hours & Booking
        </Link>
        <Link
          href="/settings/ai"
          className="px-space-3.5 py-space-1.5 radius-md text-body-sm font-semibold bg-primary text-primary-foreground shadow-sm"
        >
          AI Persona & Prompts
        </Link>
        <Link
          href="/voice/settings"
          className="px-space-3.5 py-space-1.5 radius-md text-body-sm font-medium text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--foreground)/0.04)] transition-colors"
        >
          Voice Audio & Routing
        </Link>
      </div>

      <PromptSettingsClient 
        initialAssistantName={personaData.assistantName}
        initialTone={personaData.tone}
        initialBusinessDescription={personaData.businessDescription}
        initialPromptText={personaData.customInstructions}
        previewPrompt={previewPrompt}
        orgName={org.name}
      />
    </div>
  );
}
