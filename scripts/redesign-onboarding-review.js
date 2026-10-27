const fs = require('fs');

let file = fs.readFileSync('src/components/forms/onboarding-wizard.tsx', 'utf8');

// Replace HoursField implementation
const hoursStart = file.indexOf('// ─── HoursField (inline editable) ────────────────────────────────────────────');
const hoursEnd = file.indexOf('// ─── Screen C: Verification Studio ───────────────────────────────────────────');

if (hoursStart !== -1 && hoursEnd !== -1) {
  const newHoursField = `// ─── HoursField (inline editable) ────────────────────────────────────────────

function HoursField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editing) {
      setDraft(value);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [editing, value]);

  const save = () => {
    onChange(draft.trim() || value);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-space-3 px-space-4 py-space-3 rounded-xl border transition-colors duration-200",
        editing ? "border-primary/40 bg-primary/5" : "border-border/70 bg-card/50 hover:border-border"
      )}
    >
      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-caption text-muted-foreground mb-0.5">Business hours</p>
        {editing ? (
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancel();
            }}
            className={cn(
              "w-full bg-transparent border-none outline-none",
              "text-body-sm font-medium text-foreground placeholder:text-muted-foreground"
            )}
            placeholder="e.g. Mon–Fri 9:00 AM – 5:00 PM"
          />
        ) : (
          <p className="text-body-sm font-medium text-foreground truncate">{value}</p>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-space-2 shrink-0">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={save}
            className="text-caption font-medium h-7 px-2.5"
          >
            Save
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={cancel}
            className="text-caption font-medium h-7 px-2.5 text-muted-foreground"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEditing(true)}
          className="ml-auto text-caption font-medium h-8 border-border/80 hover:bg-muted/50 shrink-0"
        >
          Edit Hours
        </Button>
      )}
    </div>
  );
}\n\n`;

  file = file.slice(0, hoursStart) + newHoursField + file.slice(hoursEnd);
  console.log('Updated HoursField with design system buttons');
}

// Replace ScreenVerify implementation
const verifyStart = file.indexOf('// ─── Screen C: Verification Studio ───────────────────────────────────────────');
const verifyEnd = file.indexOf('// ─── Screen D: Launching ──────────────────────────────────────────────────────');

if (verifyStart !== -1 && verifyEnd !== -1) {
  const newScreenVerify = `// ─── Screen C: Verification Studio ───────────────────────────────────────────

function ScreenVerify({
  data,
  onLaunch,
}: {
  data: GeneratedData;
  onLaunch: (updated: GeneratedData) => void;
}) {
  const [form, setForm] = React.useState(data);
  const [services, setServices] = React.useState(data.services);
  const [subStep, setSubStep] = React.useState<"info" | "services" | "greeting">("info");
  const [isLaunching, setIsLaunching] = React.useState(false);
  const [isAddingService, setIsAddingService] = React.useState(false);
  const [newServiceName, setNewServiceName] = React.useState("");
  const [newServiceDuration, setNewServiceDuration] = React.useState("30");

  const meta = INDUSTRY_META[form.industry] || INDUSTRY_META["Other"];
  const Icon = meta.icon;

  const stepsList = [
    { id: "info" as const, step: 1, label: "Business Info", icon: Building2 },
    { id: "services" as const, step: 2, label: "Services", icon: Star },
    { id: "greeting" as const, step: 3, label: "AI Greeting", icon: Bot },
  ];

  return (
    <div className="space-y-space-6 animate-fade-up" style={{ animationFillMode: "both" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-space-4">
        <div className="space-y-space-1">
          <div className="flex items-center gap-space-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white shrink-0"
              style={{ backgroundColor: meta.color }}
            >
              <Icon className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-title-lg font-bold text-foreground leading-none">{form.businessName}</h2>
              <p className="text-caption text-muted-foreground mt-0.5">{form.industry}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-space-1.5 px-space-2.5 py-space-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-caption font-medium text-emerald-600">AI Ready</span>
        </div>
      </div>

      {/* Info callout */}
      <div className="flex items-start gap-space-3 px-space-4 py-space-3 rounded-xl border border-primary/20 bg-primary/5">
        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-body-sm text-foreground/85 leading-body">
          We've auto-configured everything below. Review and adjust step by step, or{" "}
          <span className="font-medium text-primary">launch Operator live.</span>
        </p>
      </div>

      {/* Clean 3-Step Wizard Navigation (Replaced Tabs) */}
      <div className="flex items-center justify-between gap-space-2 p-1.5 rounded-xl bg-muted/30 border border-border/40">
        {stepsList.map((s) => {
          const isCurrent = subStep === s.id;
          const isPast =
            (s.id === "info" && (subStep === "services" || subStep === "greeting")) ||
            (s.id === "services" && subStep === "greeting");
          const SIcon = s.icon;

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                if (isPast) setSubStep(s.id);
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-caption font-medium transition-all select-none border",
                isCurrent
                  ? "bg-card text-foreground shadow-xs border-border/70 font-semibold"
                  : isPast
                  ? "border-transparent text-primary hover:text-foreground cursor-pointer"
                  : "border-transparent text-muted-foreground/60 cursor-default"
              )}
            >
              <span
                className={cn(
                  "flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-mono",
                  isCurrent
                    ? "bg-primary text-primary-foreground font-bold"
                    : isPast
                    ? "bg-primary/20 text-primary font-bold"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isPast ? "✓" : s.step}
              </span>
              <span className="truncate">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── SUB-STEP 1: Business Info ── */}
      {subStep === "info" && (
        <div className="space-y-space-4 animate-fade-up" style={{ animationFillMode: "both" }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-3">
            <div className="space-y-space-1.5">
              <Label htmlFor="vfy-name" className="text-body-sm font-medium text-foreground">
                Business Name <span className="text-destructive font-bold ml-0.5">*</span>
              </Label>
              <div className="relative">
                <Building2 className="absolute left-space-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="vfy-name"
                  value={form.businessName}
                  onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                  className="pl-space-10 h-10 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-space-1.5">
              <Label htmlFor="vfy-industry" className="text-body-sm font-medium text-foreground">
                Industry <span className="text-destructive font-bold ml-0.5">*</span>
              </Label>
              <Select
                value={form.industry}
                onValueChange={(v) => setForm((f) => ({ ...f, industry: v }))}
              >
                <SelectTrigger id="vfy-industry" className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-space-1.5">
            <Label htmlFor="vfy-email" className="text-body-sm font-medium text-foreground">
              Email <span className="text-destructive font-bold ml-0.5">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-space-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="vfy-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="info@yourbusiness.com"
                className="pl-space-10 h-10 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-3">
            <div className="space-y-space-1.5">
              <Label htmlFor="vfy-phone" className="text-body-sm font-medium text-foreground">Phone <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <div className="relative">
                <Phone className="absolute left-space-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="vfy-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+1 555-0199"
                  className="pl-space-10 h-10 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-space-1.5">
              <Label htmlFor="vfy-tz" className="text-body-sm font-medium text-foreground">
                Timezone <span className="text-destructive font-bold ml-0.5">*</span>
              </Label>
              <Select
                value={form.timezone}
                onValueChange={(v) => setForm((f) => ({ ...f, timezone: v }))}
              >
                <SelectTrigger id="vfy-tz" className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-space-1.5">
            <Label htmlFor="vfy-address" className="text-body-sm font-medium text-foreground">Address <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <div className="relative">
              <MapPin className="absolute left-space-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="vfy-address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="123 Main St, New York, NY"
                className="pl-space-10 h-10 rounded-xl"
              />
            </div>
          </div>

          {/* Hours display — inline editable */}
          <HoursField
            value={form.hours}
            onChange={(v) => setForm((f) => ({ ...f, hours: v }))}
          />

          {/* Step 1 Navigation Button */}
          <div className="pt-space-4 border-t border-border/60">
            <Button
              type="button"
              variant="default"
              size="lg"
              shape="pill"
              className="w-full font-medium shadow-md flex items-center justify-center gap-2"
              onClick={() => {
                if (!form.businessName.trim() || !form.email.trim()) return;
                setSubStep("services");
              }}
            >
              <span>Next: Services</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="text-center text-caption text-muted-foreground mt-space-2.5">
              Step 1 of 3 • Review basic company details
            </p>
          </div>
        </div>
      )}

      {/* ── SUB-STEP 2: Services ── */}
      {subStep === "services" && (
        <div className="space-y-space-4 animate-fade-up" style={{ animationFillMode: "both" }}>
          <div>
            <h3 className="text-body-md font-bold text-foreground">Services & Offerings</h3>
            <p className="text-body-sm text-muted-foreground mt-0.5">
              These services were detected from your website. Toggle off any you don't offer.
            </p>
          </div>

          {services.length === 0 ? (
            <div className="py-6 px-4 text-center border border-border/80 rounded-xl bg-muted/10 space-y-1.5">
              <p className="text-body-sm font-semibold text-foreground">No services detected from website</p>
              <p className="text-caption text-muted-foreground max-w-sm mx-auto">
                Add your services below to enable automated booking, or configure them later in Services settings.
              </p>
            </div>
          ) : (
            <div className="space-y-space-2">
              {services.map((svc, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center gap-space-3 px-space-4 py-space-3 rounded-xl border transition-all duration-200 group",
                    svc.accepted
                      ? "border-primary/25 bg-primary/5 shadow-xs"
                      : "border-border/60 bg-muted/20 opacity-50"
                  )}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setServices((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, accepted: !s.accepted } : s))
                      )
                    }
                    className={cn(
                      "h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-all cursor-pointer",
                      svc.accepted
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border bg-background hover:border-primary/50"
                    )}
                  >
                    {svc.accepted && <Check className="h-3 w-3" strokeWidth={3} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-medium text-foreground">{svc.name}</p>
                    <p className="text-caption text-muted-foreground">
                      {svc.duration ? \`\${svc.duration} min\` : "Duration not specified"}
                      {svc.price ? \` • $\${svc.price.replace(/^\\$/, "")}\` : " • Price on request"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setServices((prev) => prev.filter((_, i) => i !== idx))}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                    title="Remove service"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Zap className="h-3.5 w-3.5 text-primary/40 shrink-0" />
                </div>
              ))}
            </div>
          )}

          {isAddingService ? (
            <div className="p-space-4 rounded-xl border border-primary/30 bg-primary/5 space-y-space-3 animate-fade-up">
              <div className="flex items-center justify-between">
                <span className="text-body-sm font-bold text-foreground">Add New Service</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingService(false);
                    setNewServiceName("");
                  }}
                  className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-2">
                <div className="sm:col-span-2">
                  <Input
                    placeholder="Service name (e.g. Teeth Whitening)"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    autoFocus
                    className="text-body-sm bg-background h-10 rounded-xl"
                  />
                </div>
                <div>
                  <Select
                    value={newServiceDuration}
                    onValueChange={(v) => setNewServiceDuration(v)}
                  >
                    <SelectTrigger className="bg-background text-body-sm h-10 rounded-xl">
                      <SelectValue placeholder="Duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">60 min</SelectItem>
                      <SelectItem value="90">90 min</SelectItem>
                      <SelectItem value="120">120 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-space-2 pt-space-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAddingService(false);
                    setNewServiceName("");
                  }}
                  className="text-body-sm font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={!newServiceName.trim()}
                  onClick={() => {
                    if (!newServiceName.trim()) return;
                    setServices((prev) => [
                      ...prev,
                      {
                        name: newServiceName.trim(),
                        duration: Number(newServiceDuration) || 30,
                        accepted: true,
                      },
                    ]);
                    setNewServiceName("");
                    setIsAddingService(false);
                  }}
                  className="gap-space-1.5 font-medium"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Service</span>
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddingService(true)}
              className="flex items-center gap-space-2 text-body-sm font-medium py-space-1.5 border-dashed"
            >
              <Plus className="h-4 w-4" />
              <span>Add a service</span>
            </Button>
          )}

          {/* Step 2 Navigation Buttons */}
          <div className="pt-space-4 border-t border-border/60">
            <div className="flex items-center gap-space-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                shape="pill"
                onClick={() => setSubStep("info")}
                className="font-medium px-space-6"
              >
                ← Back
              </Button>
              <Button
                type="button"
                variant="default"
                size="lg"
                shape="pill"
                className="flex-1 font-medium shadow-md flex items-center justify-center gap-2"
                onClick={() => setSubStep("greeting")}
              >
                <span>Next: AI Greeting</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-center text-caption text-muted-foreground mt-space-2.5">
              Step 2 of 3 • {services.filter((s) => s.accepted).length} active services selected
            </p>
          </div>
        </div>
      )}

      {/* ── SUB-STEP 3: AI Greeting ── */}
      {subStep === "greeting" && (
        <div className="space-y-space-4 animate-fade-up" style={{ animationFillMode: "both" }}>
          <div>
            <h3 className="text-body-md font-bold text-foreground">AI Greeting & Voice Persona</h3>
            <p className="text-body-sm text-muted-foreground mt-0.5">
              This is what callers will hear when Operator answers your phone line.
            </p>
          </div>

          <div className="flex items-start gap-space-3 px-space-4 py-space-4 rounded-xl border border-border/80 bg-muted/20">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0 mt-0.5">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-caption text-muted-foreground mb-space-1">Operator says:</p>
              <p className="text-body-sm text-foreground leading-body italic">"{form.greeting}"</p>
            </div>
          </div>

          <div className="space-y-space-1.5">
            <Label htmlFor="vfy-greeting" className="text-body-sm font-medium text-foreground">
              Edit greeting script <span className="text-destructive font-bold ml-0.5">*</span>
            </Label>
            <textarea
              id="vfy-greeting"
              value={form.greeting}
              onChange={(e) => setForm((f) => ({ ...f, greeting: e.target.value }))}
              rows={4}
              className={cn(
                "w-full rounded-xl border border-border/80 bg-background px-space-4 py-space-3",
                "text-body-sm text-foreground placeholder:text-muted-foreground",
                "resize-none outline-none focus:border-primary focus:ring-2 focus:ring-primary/10",
                "transition-all duration-fast"
              )}
            />
          </div>

          <div className="flex items-center gap-space-2 text-caption text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Greeting is auto-customized for {form.industry} businesses.
          </div>

          {/* Step 3 Navigation Buttons (Launch Operator) */}
          <div className="pt-space-4 border-t border-border/60">
            <div className="flex items-center gap-space-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                shape="pill"
                onClick={() => setSubStep("services")}
                className="font-medium px-space-6"
              >
                ← Back
              </Button>
              <Button
                type="button"
                variant="default"
                size="lg"
                shape="pill"
                className="flex-1 font-medium shadow-md flex items-center justify-center gap-2"
                loading={isLaunching}
                onClick={async () => {
                  setIsLaunching(true);
                  setTimeout(() => {
                    onLaunch({ ...form, services: services.filter((s) => s.accepted) });
                  }, 200);
                }}
              >
                {!isLaunching && (
                  <>
                    <Rocket className="h-4 w-4 mr-1.5" />
                    <span>Launch Operator</span>
                  </>
                )}
              </Button>
            </div>
            <p className="text-center text-caption text-muted-foreground mt-space-2.5">
              Step 3 of 3 • You can refine everything later in Settings & Knowledge Base
            </p>
          </div>
        </div>
      )}
    </div>
  );
}\n\n`;

  file = file.slice(0, verifyStart) + newScreenVerify + file.slice(verifyEnd);
  console.log('Successfully redesigned ScreenVerify into multi-step wizard!');
}

fs.writeFileSync('src/components/forms/onboarding-wizard.tsx', file, 'utf8');
console.log('onboarding-wizard.tsx updated!');
