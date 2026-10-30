const fs = require('fs');

let file = fs.readFileSync('src/components/forms/onboarding-wizard.tsx', 'utf8');

const targetRegex = /const \[createdOrgId, setCreatedOrgId\] = React\.useState<string \| null>\(initialOrg\?\.id \|\| null\);/;

const replacement = `const [createdOrgId, setCreatedOrgId] = React.useState<string | null>(initialOrg?.id || null);
  const [isClientLoaded, setIsClientLoaded] = React.useState(false);

  // Restore saved draft on mount (if valid and not expired)
  React.useEffect(() => {
    if (!initialDraftData?.businessName && !initialOrg) {
      const draft = loadOnboardingDraft();
      if (draft) {
        if (draft.url) setUrl(draft.url);
        if (draft.data) setGenerated(draft.data);
        if (draft.step && draft.step !== "launching" && draft.step !== "golive") {
          setStep(draft.step);
        }
      }
    }
    setIsClientLoaded(true);
  }, [initialDraftData, initialOrg]);

  // Persist draft to localStorage on any updates
  React.useEffect(() => {
    if (isClientLoaded && step !== "launching" && step !== "golive") {
      saveOnboardingDraft(step, url, generated);
    }
  }, [step, url, generated, isClientLoaded]);`;

if (targetRegex.test(file)) {
  file = file.replace(targetRegex, replacement);
  console.log('Successfully injected draft effects into OnboardingWizard!');
  fs.writeFileSync('src/components/forms/onboarding-wizard.tsx', file, 'utf8');
} else {
  console.error('Target regex not matched in file');
}
