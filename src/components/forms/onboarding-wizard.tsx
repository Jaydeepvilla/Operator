"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  ArrowRight,
  Sparkles,
  Check,
  Loader2,
  Rocket,
  AlertCircle,
  Building2,
  Clock,
  Phone,
  Mail,
  MapPin,
  Bot,
  ChevronRight,
  Zap,
  Star,
  Scale,
  Scissors,
  Activity,
  Presentation,
  Home,
  Dumbbell,
  Stethoscope,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/components/shared/utils";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { Label } from "@/components/shared/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/select";
import { INDUSTRIES, TIMEZONES } from "@/lib/constants";
import { createOrganizationAction } from "@/server/actions/onboarding";
import { LogoIcon } from "@/components/shared/logo";
import { ConfidenceBridge } from "@/components/confidence-bridge/confidence-bridge";


// ─── Types ───────────────────────────────────────────────────────────────────

type Step = "url" | "generating" | "verify" | "launching" | "golive";

interface GeneratedData {
  businessName: string;
  industry: string;
  timezone: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  services: { name: string; duration: number; accepted: boolean }[];
  hours: string;
  greeting: string;
}

// ─── Industry metadata ────────────────────────────────────────────────────────

const INDUSTRY_META: Record<string, { icon: React.ComponentType<any>; color: string; emoji: string }> = {
  "Dental Clinic":  { icon: Stethoscope,  color: "hsl(199 90% 45%)",  emoji: "🦷" },
  "Medical Clinic": { icon: Activity,     color: "hsl(152 80% 38%)",  emoji: "🏥" },
  "Salon":          { icon: Scissors,     color: "hsl(330 80% 52%)",  emoji: "✂️" },
  "Spa":            { icon: Sparkles,     color: "hsl(270 80% 52%)",  emoji: "💆" },
  "Law Firm":       { icon: Scale,        color: "hsl(38 90% 48%)",   emoji: "⚖️" },
  "Consultant":     { icon: Presentation, color: "hsl(210 80% 48%)",  emoji: "💼" },
  "Real Estate":    { icon: Home,         color: "hsl(142 70% 38%)",  emoji: "🏠" },
  "Gym":            { icon: Dumbbell,     color: "hsl(14 90% 52%)",   emoji: "💪" },
  "Other":          { icon: Bot,          color: "hsl(258 70% 52%)",  emoji: "✨" },
};

// ─── Generation log lines ─────────────────────────────────────────────────────

const GENERATION_LOGS = [
  "Fetching website metadata…",
  "Detecting industry vertical…",
  "Extracting business hours…",
  "Indexing service offerings…",
  "Synthesizing FAQ database…",
  "Generating AI greeting voice…",
  "Configuring conversation flows…",
  "Building knowledge base…",
  "Operator is ready ✔",
];

// ─── Default generated data for demo ─────────────────────────────────────────

function buildGeneratedData(url: string, detectedIndustry: string): GeneratedData {
  const domain = url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  const nameParts = domain.split(".")[0];
  const businessName = nameParts.charAt(0).toUpperCase() + nameParts.slice(1);

  return {
    businessName,
    industry: detectedIndustry,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    email: `info@${domain}`,
    phone: "",
    address: "",
    website: url.startsWith("http") ? url : `https://${url}`,
    services: [
      { name: "General Consultation", duration: 30, accepted: true },
      { name: "Follow-up Appointment", duration: 15, accepted: true },
      { name: "Initial Assessment", duration: 60, accepted: true },
    ],
    hours: "Mon–Fri  9:00 AM – 5:00 PM",
    greeting: `Hi, thank you for contacting ${businessName}. I'm Operator, your automated assistant, and I can help you book appointments, check availability, or answer questions. How can I help you today?`,
  };
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS: { id: Step; label: string }[] = [
  { id: "url", label: "Website" },
  { id: "generating", label: "Building" },
  { id: "verify", label: "Review" },
  { id: "golive", label: "Go Live" },
];

function StepIndicator({ current }: { current: Step }) {
  const order: Step[] = ["url", "generating", "verify", "golive"];
  const currentIdx = order.indexOf(current === "launching" ? "golive" : current);

  return (
    <div className="flex items-center gap-space-2 mb-space-8">
      {STEPS.map((s, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <React.Fragment key={s.id}>
            <div className="flex items-center gap-space-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-caption font-semibold transition-all duration-300",
                  done
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : active
                    ? "border-2 border-primary text-primary bg-primary/10 shadow-sm"
                    : "border border-border/80 text-muted-foreground bg-muted/20"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : idx + 1}
              </div>
              <span
                className={cn(
                  "text-caption font-medium hidden sm:block",
                  active ? "text-foreground font-semibold" : done ? "text-muted-foreground" : "text-muted-foreground/60"
                )}
              >
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-px transition-colors duration-300",
                  done ? "bg-primary/50" : "bg-border/60"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Screen A: URL Entry ──────────────────────────────────────────────────────

function ScreenUrl({
  onNext,
}: {
  onNext: (url: string) => void;
}) {
  const [url, setUrl] = React.useState("");
  const [noWebsite, setNoWebsite] = React.useState(false);
  const [error, setError] = React.useState("");

  const isValidUrl = (v: string) => {
    try {
      const full = v.startsWith("http") ? v : `https://${v}`;
      new URL(full);
      return full.includes(".");
    } catch {
      return false;
    }
  };

  const handleContinue = () => {
    if (noWebsite) {
      onNext("no-website");
      return;
    }
    if (!url.trim()) {
      setError("Please enter your website URL.");
      return;
    }
    if (!isValidUrl(url.trim())) {
      setError("Please enter a valid URL, e.g. acmedental.com");
      return;
    }
    setError("");
    onNext(url.trim());
  };

  return (
    <div className="space-y-space-8 animate-fade-up" style={{ animationFillMode: "both" }}>
      {/* Header */}
      <div className="space-y-space-3">
        <div className="inline-flex items-center gap-space-2 px-space-3 py-space-1 rounded-full border border-primary/20 bg-primary/5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-caption font-semibold text-primary tracking-wide">Live AI Setup</span>
        </div>
        <h1 className="text-heading-lg font-bold text-foreground tracking-tight leading-heading">
          Operator<br />
          <span className="text-primary">starts here.</span>
        </h1>
        <p className="text-body-sm text-muted-foreground leading-body max-w-md">
          Enter your website and we'll configure Operator automatically — greeting, services, hours, and knowledge base.
        </p>
      </div>

      {/* Input area */}
      <div className="space-y-space-4">
        {!noWebsite ? (
          <div className="space-y-space-2">
            <Label htmlFor="ob-url" className="text-body-sm font-medium text-foreground">
              Your website URL <span className="text-destructive font-bold ml-0.5">*</span>
            </Label>
            <div className="relative">
              <Globe
                className="absolute left-space-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                aria-hidden
              />
              <Input
                id="ob-url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                placeholder="acmedental.com"
                className="pl-space-10 pr-space-4 text-body-sm h-11 rounded-xl"
                autoFocus
                error={!!error}
              />
            </div>
            {error && (
              <p className="flex items-center gap-space-1.5 text-caption text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-space-2">
            <Label htmlFor="ob-nowebsite" className="text-body-sm font-medium text-foreground">
              What does your business do? <span className="text-destructive font-bold ml-0.5">*</span>
            </Label>
            <Input
              id="ob-nowebsite"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g. We run a dental clinic in New York…"
              className="text-body-sm h-11 rounded-xl"
              autoFocus
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setNoWebsite((v) => !v);
            setUrl("");
            setError("");
          }}
          className="text-caption text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
        >
          {noWebsite ? "I have a website" : "I don't have a website yet"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-space-3 p-space-4 rounded-xl border border-border/50 bg-muted/20">
        {[["< 3 min", "to go live"], ["100%", "automated"], ["24/7", "coverage"]].map(([v, l]) => (
          <div key={l} className="text-center sm:text-left">
            <div className="text-body-md font-bold text-foreground">{v}</div>
            <div className="text-caption text-muted-foreground uppercase tracking-wider mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      <Button size="lg" shape="pill" className="w-full" onClick={handleContinue}>
        Set Up Operator
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ─── Screen B: AI Generation Console ─────────────────────────────────────────

function ScreenGenerating({
  url,
  onComplete,
}: {
  url: string;
  onComplete: (data: GeneratedData) => void;
}) {
  const [completedLogs, setCompletedLogs] = React.useState<number>(0);

  React.useEffect(() => {
    let idx = 0;
    const tick = () => {
      if (idx < GENERATION_LOGS.length) {
        setCompletedLogs((v) => v + 1);
        idx++;
        setTimeout(tick, 320 + Math.random() * 260);
      } else {
        setTimeout(() => {
          const industry = "Medical Clinic";
          const generated = buildGeneratedData(url === "no-website" ? "mybusiness.com" : url, industry);
          onComplete(generated);
        }, 600);
      }
    };
    const t = setTimeout(tick, 200);
    return () => clearTimeout(t);
  }, [url, onComplete]);

  const displayUrl = url === "no-website" ? "your business" : url.replace(/^https?:\/\//, "");

  return (
    <div className="space-y-space-8 animate-fade-up" style={{ animationFillMode: "both" }}>
      {/* Header */}
      <div className="space-y-space-2">
        <div className="flex items-center gap-space-2">
          <div className="relative flex h-8 w-8 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping [animation-duration:2s]" />
            <LogoIcon className="h-4.5 w-4.5 text-primary relative" />
          </div>
          <h2 className="text-title-lg font-bold text-foreground">Setting up Operator…</h2>
        </div>
        <p className="text-body-sm text-muted-foreground">
          Analyzing <span className="font-medium text-foreground">{displayUrl}</span> and configuring everything automatically.
        </p>
      </div>

      {/* Progress console */}
      <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
        <div className="px-space-4 py-space-2.5 border-b border-border bg-muted/50 flex items-center gap-space-2">
          <div className="flex gap-space-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
          </div>
          <span className="text-[11px] text-muted-foreground font-medium ml-space-1">operator — ai-config</span>
        </div>
        <div className="p-space-4 space-y-space-2 min-h-[200px] font-mono">
          {GENERATION_LOGS.map((log, idx) => {
            const done = idx < completedLogs;
            const active = idx === completedLogs - 1 && completedLogs < GENERATION_LOGS.length;
            const last = idx === GENERATION_LOGS.length - 1 && done;
            if (idx >= completedLogs) return null;
            return (
              <div
                key={log}
                className={cn(
                  "flex items-center gap-space-2 text-[12px] transition-all duration-300",
                  last ? "text-emerald-500" : active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {last ? (
                  <Check className="h-3 w-3 shrink-0 text-emerald-500" strokeWidth={2.5} />
                ) : active ? (
                  <Loader2 className="h-3 w-3 shrink-0 animate-spin text-primary" />
                ) : (
                  <Check className="h-3 w-3 shrink-0 opacity-40" />
                )}
                {log}
              </div>
            );
          })}
          {completedLogs < GENERATION_LOGS.length && (
            <div className="flex items-center gap-space-2 text-[12px] text-muted-foreground/50">
              <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
              {GENERATION_LOGS[completedLogs]}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-space-2">
        <div className="flex items-center justify-between text-caption text-muted-foreground">
          <span>Setting up your workspace</span>
          <span className="font-medium text-foreground">
            {Math.round((completedLogs / GENERATION_LOGS.length) * 100)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(completedLogs / GENERATION_LOGS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── HoursField (inline editable) ────────────────────────────────────────────

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
        editing ? "border-primary/40 bg-primary/5" : "border-border bg-muted/20"
      )}
    >
      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-caption text-muted-foreground mb-0.5">Business hours</p>
        {editing ? (
          <input
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
          <button
            type="button"
            onClick={save}
            className="text-caption font-semibold text-primary hover:opacity-70 transition-opacity"
          >
            Save
          </button>
          <button
            type="button"
            onClick={cancel}
            className="text-caption text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="ml-auto text-caption text-primary hover:opacity-70 transition-opacity shrink-0"
        >
          Edit →
        </button>
      )}
    </div>
  );
}

// ─── Screen C: Verification Studio ───────────────────────────────────────────

function ScreenVerify({
  data,
  onLaunch,
}: {
  data: GeneratedData;
  onLaunch: (updated: GeneratedData) => void;
}) {
  const [form, setForm] = React.useState(data);
  const [services, setServices] = React.useState(data.services);
  const [activeTab, setActiveTab] = React.useState<"info" | "services" | "greeting">("info");
  const [isLaunching, setIsLaunching] = React.useState(false);
  const [isAddingService, setIsAddingService] = React.useState(false);
  const [newServiceName, setNewServiceName] = React.useState("");
  const [newServiceDuration, setNewServiceDuration] = React.useState("30");

  const meta = INDUSTRY_META[form.industry] || INDUSTRY_META["Other"];
  const Icon = meta.icon;

  const tabs = [
    { id: "info" as const, label: "Business Info", icon: Building2 },
    { id: "services" as const, label: "Services", icon: Star },
    { id: "greeting" as const, label: "AI Greeting", icon: Bot },
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
          <span className="text-[11px] font-medium text-emerald-600">AI Ready</span>
        </div>
      </div>

      {/* Info callout */}
      <div className="flex items-start gap-space-3 px-space-4 py-space-3 rounded-xl border border-primary/20 bg-primary/5">
        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-body-sm text-foreground/80 leading-body">
          We've auto-configured everything below. Review and adjust if needed, or{" "}
          <span className="font-semibold text-primary">launch immediately.</span>
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex p-1 rounded-xl bg-muted/40 border border-border/40">
        {tabs.map((t) => {
          const TIcon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-space-2 py-space-2 text-body-sm font-medium rounded-lg transition-all duration-fast",
                activeTab === t.id
                  ? "bg-card text-foreground shadow-sm font-semibold border border-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              )}
            >
              <TIcon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab: Business Info */}
      {activeTab === "info" && (
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
        </div>
      )}

      {/* Tab: Services */}
      {activeTab === "services" && (
        <div className="space-y-space-3 animate-fade-up" style={{ animationFillMode: "both" }}>
          <p className="text-body-sm text-muted-foreground">
            These services were detected from your website. Toggle off any you don't offer.
          </p>
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
                    "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200",
                    svc.accepted ? "bg-primary border-primary text-primary-foreground" : "border-border bg-transparent"
                  )}
                >
                  {svc.accepted && <Check className="h-3 w-3" strokeWidth={3} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium text-foreground">{svc.name}</p>
                  <p className="text-caption text-muted-foreground">{svc.duration} min</p>
                </div>
                <button
                  type="button"
                  onClick={() => setServices((prev) => prev.filter((_, i) => i !== idx))}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                  title="Remove service"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <Zap className="h-3.5 w-3.5 text-primary/40 shrink-0" />
              </div>
            ))}
          </div>

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
                  className="text-muted-foreground hover:text-foreground"
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
                  className="text-body-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
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
                  className="gap-space-1.5 font-bold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Service</span>
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingService(true)}
              className="flex items-center gap-space-2 text-body-sm text-primary hover:opacity-80 transition-opacity font-medium py-space-1"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-primary/40 text-caption font-semibold">+</span>
              <span>Add a service</span>
            </button>
          )}
        </div>
      )}

      {/* Tab: AI Greeting */}
      {activeTab === "greeting" && (
        <div className="space-y-space-4 animate-fade-up" style={{ animationFillMode: "both" }}>
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
              Edit greeting <span className="text-destructive font-bold ml-0.5">*</span>
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
        </div>
      )}

      {/* Launch button */}
      <div className="pt-space-4 border-t border-border/60">
        <Button
          size="lg"
          shape="pill"
          className="w-full font-semibold shadow-md"
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
              Launch Operator
            </>
          )}
        </Button>
        <p className="text-center text-caption text-muted-foreground mt-space-3">
          You can refine everything later in Settings & Knowledge Base.
        </p>
      </div>
    </div>
  );
}

// ─── Screen D: Launching ──────────────────────────────────────────────────────

const LAUNCH_STEPS = [
  "Creating your workspace…",
  "Seeding industry templates…",
  "Configuring AI knowledge base…",
  "Activating Operator…",
];

function ScreenLaunching() {
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    let i = 0;
    const tick = () => {
      if (i < LAUNCH_STEPS.length - 1) {
        i++;
        setStep(i);
        setTimeout(tick, 800 + Math.random() * 400);
      }
    };
    const t = setTimeout(tick, 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center text-center space-y-space-8 py-space-8 animate-fade-up" style={{ animationFillMode: "both" }}>
      <div className="relative flex items-center justify-center">
        <div className="absolute h-28 w-28 rounded-full border border-primary/20 animate-ping [animation-duration:2.5s]" />
        <div className="absolute h-20 w-20 rounded-full bg-primary/5 animate-pulse [animation-duration:2s]" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30">
          <LogoIcon className="h-8 w-8 text-white" />
        </div>
      </div>

      <div className="space-y-space-2">
        <h2 className="text-title-lg font-bold text-foreground">Launching Operator…</h2>
        <p className="text-body-sm text-muted-foreground max-w-xs">{LAUNCH_STEPS[step]}</p>
      </div>

      <div className="w-full max-w-xs space-y-space-2.5">
        {LAUNCH_STEPS.map((s, idx) => (
          <div key={s} className="flex items-center gap-space-3 text-left">
            <div
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                idx < step
                  ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-500"
                  : idx === step
                  ? "bg-primary/10 border border-primary/30 text-primary"
                  : "bg-muted border border-border text-muted-foreground"
              )}
            >
              {idx < step ? (
                <Check className="h-3 w-3 text-emerald-500" strokeWidth={3} />
              ) : idx === step ? (
                <Loader2 className="h-3 w-3 text-primary animate-spin" />
              ) : null}
            </div>
            <span
              className={cn(
                "text-caption leading-none",
                idx <= step ? "text-foreground font-medium" : "text-muted-foreground"
              )}
            >
              {s}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Screen E: Verify AI (Confidence Bridge) ──────────────────────────────────

function ScreenGoLive({ businessName, orgId }: { businessName: string; orgId: string }) {
  const router = useRouter();

  return (
    <ConfidenceBridge
      businessName={businessName}
      orgId={orgId}
      onFinish={() => router.push("/dashboard")}
    />
  );
}

// ─── Root Wizard ──────────────────────────────────────────────────────────────

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("url");
  const [url, setUrl] = React.useState("");
  const [generated, setGenerated] = React.useState<GeneratedData | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [createdOrgId, setCreatedOrgId] = React.useState<string | null>(null);

  const handleUrlNext = (inputUrl: string) => {
    setUrl(inputUrl);
    setStep("generating");
  };

  const handleGenerationComplete = (data: GeneratedData) => {
    setGenerated(data);
    setStep("verify");
  };

  const handleLaunch = async (data: GeneratedData) => {
    setStep("launching");

    // Map generated data to the onboarding schema
    const payload = {
      industry: (INDUSTRIES as readonly string[]).includes(data.industry)
        ? (data.industry as typeof INDUSTRIES[number])
        : "Other",
      name: data.businessName || "My Business",
      website: data.website,
      email: data.email || "info@mybusiness.com",
      phone: data.phone || "+1 555-0000",
      address: data.address || "123 Main St",
      timezone: (TIMEZONES as readonly { value: string; label: string }[]).find(
        (t) => t.value === data.timezone
      )
        ? data.timezone
        : "UTC",
    };

    try {
      const result = await createOrganizationAction(payload as any);
      if (result.success && result.organization) {
        setCreatedOrgId(result.organization.id);
        setTimeout(() => {
          setStep("golive");
        }, 3200);
      } else {
        setSubmitError(result.error || "Failed to create workspace. Please try again.");
        setStep("verify");
      }
    } catch (e: any) {
      setSubmitError(e?.message || "An unexpected error occurred.");
      setStep("verify");
    }
  };

  const showIndicator = step !== "launching" && step !== "golive";

  return (
    <div>
      {showIndicator && <StepIndicator current={step} />}

      {submitError && (
        <div className="flex items-start gap-space-3 px-space-4 py-space-3 rounded-xl border border-destructive/20 bg-destructive/5 mb-space-6">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-body-sm text-destructive">{submitError}</p>
        </div>
      )}

      {step === "url" && <ScreenUrl onNext={handleUrlNext} />}
      {step === "generating" && (
        <ScreenGenerating url={url} onComplete={handleGenerationComplete} />
      )}
      {step === "verify" && generated && (
        <ScreenVerify data={generated} onLaunch={handleLaunch} />
      )}
      {step === "launching" && <ScreenLaunching />}
      {step === "golive" && generated && (
        <ScreenGoLive businessName={generated.businessName} orgId={createdOrgId || "your-org-id"} />
      )}
    </div>
  );
}