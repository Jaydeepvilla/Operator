import React from "react";
import { checkUserOrganization } from "@/server/actions/onboarding";
import { profileRepository } from "@/server/repositories/profile";
import { servicesRepository } from "@/server/repositories/services";
import { faqRepository } from "@/server/repositories/faq";
import { flowsRepository } from "@/server/repositories/flows";
import { settingsRepository } from "@/server/repositories/settings";
import { SetupWizard } from "@/components/setup/setup-wizard";
import { SetupState } from "@/lib/setup-engine/types";
import { PageTitle } from "@/components/shared/page-title";

export default async function SetupPage() {
  const { org } = await checkUserOrganization();
  if (!org) return null;

  const [profile, servicesList, faqs, flows, settings] = await Promise.all([
    profileRepository.getByOrg(org.id),
    servicesRepository.list(org.id),
    faqRepository.list(org.id),
    flowsRepository.list(org.id),
    settingsRepository.getByOrg(org.id),
  ]);

  const setupState: SetupState = {
    profile,
    servicesList,
    faqs,
    flows,
    settings,
    staff: []
  };

  return (
    <div className="space-y-space-6 animate-fade-in w-full max-w-4xl mx-auto">
      <PageTitle 
        title="Operator AI Setup" 
        description="Follow this intelligent wizard to fully train and deploy Operator AI for your business."
      />
      <SetupWizard state={setupState} />
    </div>
  );
}
