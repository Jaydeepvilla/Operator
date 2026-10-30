const fs = require('fs');

let file = fs.readFileSync('src/components/forms/onboarding-wizard.tsx', 'utf8');

// 1. Replace HoursField with modern structured dropdowns
const hoursStart = file.indexOf('// ─── HoursField (inline editable) ────────────────────────────────────────────');
const hoursEnd = file.indexOf('// ─── Screen C: Verification Studio ───────────────────────────────────────────');

if (hoursStart !== -1 && hoursEnd !== -1) {
  const newHoursComponent = `// ─── HoursField (structured selection option) ─────────────────────────────────

const DAYS_OPTIONS = [
  "Monday – Friday",
  "Monday – Saturday",
  "Monday – Sunday (Every day)",
  "Monday – Thursday",
  "Tuesday – Saturday",
  "Saturday – Sunday (Weekends only)",
];

const TIME_OPTIONS = [
  "06:00 AM", "06:30 AM", "07:00 AM", "07:30 AM", "08:00 AM", "08:30 AM",
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
  "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
  "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM",
  "09:00 PM", "10:00 PM", "11:00 PM",
];

function parseHours(val: string) {
  let days = "Monday – Friday";
  let open = "09:00 AM";
  let close = "05:00 PM";

  if (!val) return { days, open, close };

  const parts = val.split(/:\s*/);
  if (parts.length >= 2) {
    const rawDays = parts[0].trim();
    const matchedDay = DAYS_OPTIONS.find((d) =>
      d.toLowerCase().replace(/[\\s–-]/g, "") === rawDays.toLowerCase().replace(/[\\s–-]/g, "")
    );
    if (matchedDay) days = matchedDay;
    else if (rawDays.toLowerCase().includes("sun") || rawDays.toLowerCase().includes("every")) days = "Monday – Sunday (Every day)";
    else if (rawDays.toLowerCase().includes("sat")) days = "Monday – Saturday";

    const times = parts[1].split(/\\s*[–-]\\s*/);
    if (times.length >= 2) {
      const matchOpen = TIME_OPTIONS.find((t) => t.replace(/^0/, "").toLowerCase() === times[0].trim().replace(/^0/, "").toLowerCase());
      if (matchOpen) open = matchOpen;
      const matchClose = TIME_OPTIONS.find((t) => t.replace(/^0/, "").toLowerCase() === times[1].trim().replace(/^0/, "").toLowerCase());
      if (matchClose) close = matchClose;
    }
  }
  return { days, open, close };
}

function HoursField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const parsed = React.useMemo(() => parseHours(value), [value]);
  const [selectedDays, setSelectedDays] = React.useState(parsed.days);
  const [selectedOpen, setSelectedOpen] = React.useState(parsed.open);
  const [selectedClose, setSelectedClose] = React.useState(parsed.close);

  React.useEffect(() => {
    if (editing) {
      const p = parseHours(value);
      setSelectedDays(p.days);
      setSelectedOpen(p.open);
      setSelectedClose(p.close);
    }
  }, [editing, value]);

  const save = () => {
    const cleanDays = selectedDays.replace(/\\s*\\([^)]*\\)/g, "").trim();
    onChange(\`\${cleanDays}: \${selectedOpen} – \${selectedClose}\`);
    setEditing(false);
  };

  const cancel = () => {
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="p-space-4 rounded-xl border border-primary/30 bg-primary/5 space-y-space-3 animate-fade-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-2 text-body-sm font-semibold text-foreground">
            <Clock className="h-4 w-4 text-primary" />
            <span>Select Business Hours</span>
          </div>
          <button
            type="button"
            onClick={cancel}
            className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-space-3">
          <div className="space-y-1">
            <Label className="text-caption font-medium text-muted-foreground">Days of Operation</Label>
            <Select value={selectedDays} onValueChange={setSelectedDays}>
              <SelectTrigger className="h-10 rounded-xl bg-background text-body-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-3">
            <div className="space-y-1">
              <Label className="text-caption font-medium text-muted-foreground">Opening Time</Label>
              <Select value={selectedOpen} onValueChange={setSelectedOpen}>
                <SelectTrigger className="h-10 rounded-xl bg-background text-body-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-caption font-medium text-muted-foreground">Closing Time</Label>
              <Select value={selectedClose} onValueChange={setSelectedClose}>
                <SelectTrigger className="h-10 rounded-xl bg-background text-body-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-space-2 pt-space-2 border-t border-border/40">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={cancel}
            className="text-caption font-medium h-8 px-3"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={save}
            className="text-caption font-medium h-8 px-4"
          >
            Save Hours
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-space-3 px-space-4 py-space-3 rounded-xl border border-border/70 bg-card/50 hover:border-border transition-colors duration-200">
      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-caption text-muted-foreground mb-0.5">Business hours</p>
        <p className="text-body-sm font-medium text-foreground truncate">{value}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setEditing(true)}
        className="ml-auto text-caption font-medium h-8 border-border/80 hover:bg-muted/50 shrink-0 cursor-pointer"
      >
        Edit Hours
      </Button>
    </div>
  );
}\n\n`;

  file = file.slice(0, hoursStart) + newHoursComponent + file.slice(hoursEnd);
  console.log('HoursField updated with structured selection dropdowns');
}

// 2. Add local storage persistence helpers and update OnboardingWizard
const storageHelpers = `
// ─── Onboarding Draft Session Storage (24-Hour Expiry Window) ─────────────────

const ONBOARDING_DRAFT_KEY = "operator_onboarding_draft_v1";
const ONBOARDING_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours retention

function loadOnboardingDraft(): { url: string; step: Step; data: GeneratedData | null } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.timestamp || Date.now() - parsed.timestamp > ONBOARDING_DRAFT_MAX_AGE_MS) {
      localStorage.removeItem(ONBOARDING_DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveOnboardingDraft(step: Step, url: string, data: GeneratedData | null) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      ONBOARDING_DRAFT_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        step,
        url,
        data,
      })
    );
  } catch {}
}

function clearOnboardingDraft() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ONBOARDING_DRAFT_KEY);
  } catch {}
}
`;

// Insert storage helpers before OnboardingWizard
const rootWizardMarker = '// ─── Root Wizard ──────────────────────────────────────────────────────────────';
if (file.includes(rootWizardMarker) && !file.includes('operator_onboarding_draft_v1')) {
  file = file.replace(rootWizardMarker, rootWizardMarker + '\n' + storageHelpers);
  console.log('Storage helpers inserted');
}

// Update OnboardingWizard body to restore from draft and save progress
const oldWizardBodyStart = `  const [step, setStep] = React.useState<Step>(resolvedInitialStep);
  const [url, setUrl] = React.useState(initialDraftData?.website || "");
  const [generated, setGenerated] = React.useState<GeneratedData | null>(`;

const newWizardBodyStart = `  // Restore from client-side session draft if available
  const [draftLoaded, setDraftLoaded] = React.useState(false);
  const [step, setStep] = React.useState<Step>(resolvedInitialStep);
  const [url, setUrl] = React.useState(initialDraftData?.website || "");
  const [generated, setGenerated] = React.useState<GeneratedData | null>(`;

if (file.includes(oldWizardBodyStart)) {
  file = file.replace(oldWizardBodyStart, newWizardBodyStart);

  // Add useEffect to restore and save draft
  const submitErrorMarker = `  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [createdOrgId, setCreatedOrgId] = React.useState<string | null>(initialOrg?.id || null);`;

  const newDraftEffects = `  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [createdOrgId, setCreatedOrgId] = React.useState<string | null>(initialOrg?.id || null);

  // Restore draft from localStorage on mount if not provided from server
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
    setDraftLoaded(true);
  }, [initialDraftData, initialOrg]);

  // Persist draft to localStorage whenever step, url, or generated data updates
  React.useEffect(() => {
    if (draftLoaded && step !== "launching" && step !== "golive") {
      saveOnboardingDraft(step, url, generated);
    }
  }, [step, url, generated, draftLoaded]);`;

  file = file.replace(submitErrorMarker, newDraftEffects);
  console.log('Added draft restoration and auto-save effects');
}

// In handleLaunch, clear draft upon successful completion
const oldSuccessBlock = `setCreatedOrgId(result.organization.id);
        setTimeout(() => {
          setStep("golive");
        }, 3200);`;

const newSuccessBlock = `setCreatedOrgId(result.organization.id);
        clearOnboardingDraft();
        setTimeout(() => {
          setStep("golive");
        }, 3200);`;

if (file.includes(oldSuccessBlock)) {
  file = file.replace(oldSuccessBlock, newSuccessBlock);
  console.log('Added clearOnboardingDraft on successful completion');
}

fs.writeFileSync('src/components/forms/onboarding-wizard.tsx', file, 'utf8');
console.log('onboarding-wizard.tsx updated with Hours dropdowns and draft persistence!');
