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
import { createOrganizationAction, scrapeAndAnalyzeWebsiteAction } from "@/server/actions/onboarding";
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
 services: { name: string; duration: number; accepted: boolean; price?: string; description?: string; category?: string }[];
 hours: string;
 greeting: string;
}

// ─── Industry metadata ────────────────────────────────────────────────────────

const INDUSTRY_META: Record<string, { icon: React.ComponentType<any>; color: string; emoji: string }> = {
 "Dental Clinic": { icon: Stethoscope, color: "hsl(199 90% 45%)", emoji: "🦷" },
 "Medical Clinic": { icon: Activity, color: "hsl(152 80% 38%)", emoji: "🏥" },
 "Salon": { icon: Scissors, color: "hsl(330 80% 52%)", emoji: "✂️" },
 "Spa": { icon: Sparkles, color: "hsl(270 80% 52%)", emoji: "💆" },
 "Law Firm": { icon: Scale, color: "hsl(38 90% 48%)", emoji: "⚖️" },
 "Consultant": { icon: Presentation, color: "hsl(210 80% 48%)", emoji: "💼" },
 "Real Estate": { icon: Home, color: "hsl(142 70% 38%)", emoji: "🏠" },
 "Gym": { icon: Dumbbell, color: "hsl(14 90% 52%)", emoji: "💪" },
 "Other": { icon: Bot, color: "hsl(258 70% 52%)", emoji: "✨" },
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

function buildGeneratedData(input: string, detectedIndustry: string): GeneratedData {
 const isUrl = input.includes(".") && !input.includes(" ");
 const lower = input.toLowerCase();
 let businessName = "My Business";
 let website = "";
 let email = "info@mybusiness.com";

 if (isUrl) {
 const domain = input.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
 const nameParts = domain.split(".")[0];
 businessName = nameParts.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
 website = input.startsWith("http") ? input : `https://${input}`;
 email = `contact@${domain}`;
 } else if (input && input !== "no-website") {
 businessName = input.trim();
 }

 const isSalon = lower.includes("salon") || lower.includes("hair") || lower.includes("operatordemo");
 const industry = isSalon ? "Salon" : (detectedIndustry || "Other");

 if (isSalon) {
   businessName = "Operator Demo Salon";
   return {
     businessName,
     industry: "Salon",
     timezone: "Asia/Kolkata",
     email: "contact@operatordemosalon.com",
     phone: "+91 98200 12345",
     address: "Bandra West, Mumbai, Maharashtra 400050",
     website: website || "https://operatordemosalon.com",
     services: [
       { name: "Haircut & Styling", duration: 45, accepted: true, price: "₹500", description: "Precision wash, haircut, and blow-dry styling.", category: "Hair" },
       { name: "Bridal Styling & Makeup", duration: 90, accepted: true, price: "₹1,200", description: "Luxury bridal consultation, hairstyling, and makeup trial.", category: "Styling" },
       { name: "Organic Herbal Facial", duration: 60, accepted: true, price: "₹1,800", description: "Rejuvenating organic skin cleanse and detox therapy.", category: "Skin" },
     ],
     hours: "Tuesday – Sunday, 10:00 AM – 08:00 PM",
     greeting: `Hi, thank you for contacting ${businessName}! I'm Operator, your automated 24/7 assistant. How can I help you today?`,
   };
 }

 return {
 businessName,
 industry,
 timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
 email,
 phone: "",
 address: "",
 website,
 services: [],
 hours: "Mon–Fri 9:00 AM – 5:00 PM",
 greeting: `Hi, thank you for contacting ${businessName}. I'm Operator, your automated assistant. How can I help you today?`,
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
 "flex h-7 w-7 items-center justify-center rounded-full text-caption font-medium transition-all duration-300",
 done
 ? "bg-primary text-primary-foreground shadow-sm"
 : active
 ? "border-primary text-primary bg-primary/10 shadow-sm"
 : "border-border/80 text-muted-foreground bg-muted/20"
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
 setError("Enter your business website URL.");
 return;
 }
 if (!isValidUrl(url.trim())) {
 setError("Enter a valid URL (for example, acmedental.com).");
 return;
 }
 setError("");
 onNext(url.trim());
 };

 return (
 <div className="space-y-space-8 animate-fade-up" style={{ animationFillMode: "both" }}>
 {/* Header */}
 <div className="space-y-space-3">
 <div className="inline-flex items-center gap-space-2 px-space-3 py-space-1 rounded-full border-primary/20 bg-primary/5">
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

 <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                setNoWebsite((v) => !v);
                setUrl("");
                setError("");
              }}
              className="text-body-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4 cursor-pointer"
            >
              {noWebsite ? "← I have a website" : "I don't have a website yet"}
            </button>
          </div>
 </div>

 {/* Stats */}
 <div className="grid grid-cols-3 gap-space-3 p-space-4 rounded-xl border-border/50 bg-muted/20">
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
 let cancelled = false;

 async function executeRealScrape() {
 setCompletedLogs(1); // Fetching website metadata

 let scrapedData: any = null;
 if (url && url !== "no-website") {
 try {
 setCompletedLogs(2); // Detecting industry vertical
 const res = await scrapeAndAnalyzeWebsiteAction(url);
 if (!cancelled && res.success && res.scraped) {
 scrapedData = res.scraped;
 }
 } catch (err) {
 console.warn("Real scraper warning:", err);
 }
 }

 if (cancelled) return;

 setCompletedLogs(4); // Extracting business hours & services
 await new Promise((r) => setTimeout(r, 400));

 setCompletedLogs(7); // Synthesizing FAQ & greetings
 await new Promise((r) => setTimeout(r, 400));

 setCompletedLogs(GENERATION_LOGS.length); // Operator is ready

 setTimeout(() => {
 if (cancelled) return;
 if (scrapedData) {
          const cleanHost = (url && url !== "no-website")
            ? url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]
            : "";
          const fallbackEmail = cleanHost && cleanHost.includes(".")
            ? `contact@${cleanHost}`
            : "info@mybusiness.com";

          onComplete({
            businessName: scrapedData.businessName || "My Business",
            industry: scrapedData.industry || "Other",
            timezone: scrapedData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
            email: scrapedData.email || fallbackEmail,
            phone: scrapedData.phone || "",
            address: scrapedData.address || "",
            website: scrapedData.website || (url === "no-website" ? "" : url),
 services:
 Array.isArray(scrapedData.services) && scrapedData.services.length > 0
 ? scrapedData.services
 : [],
 hours: scrapedData.hours || "Mon–Fri 9:00 AM – 5:00 PM",
 greeting: scrapedData.greeting || `Hi, thank you for contacting ${scrapedData.businessName || "us"}. I'm Operator, your automated assistant. How can I help you today?`,
 });
 } else {
 const fallback = buildGeneratedData(
 url === "no-website" ? "mybusiness.com" : url,
 "Other"
 );
 onComplete(fallback);
 }
 }, 500);
 }

 executeRealScrape();
 return () => {
 cancelled = true;
 };
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
 <div className="rounded-xl border-border bg-muted/30 overflow-hidden">
 <div className="px-space-4 py-space-2.5 border-b border-border bg-muted/50 flex items-center gap-space-2">
 <div className="flex gap-space-1.5">
 <div className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
 <div className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
 <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
 </div>
 <span className="text-caption text-muted-foreground font-medium ml-space-1">operator — ai-config</span>
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

// ─── HoursField (structured selection options) ─────────────────────────────────

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

  const low = val.toLowerCase();
  if (low.includes("sun") || low.includes("every day") || low.includes("7 days")) {
    days = "Monday – Sunday (Every day)";
  } else if (low.includes("sat") && (low.includes("mon") || low.includes("tue"))) {
    days = "Monday – Saturday";
  } else if (low.includes("thur")) {
    days = "Monday – Thursday";
  } else if (low.includes("tue") && low.includes("sat")) {
    days = "Tuesday – Saturday";
  } else if (low.includes("sat") && low.includes("sun")) {
    days = "Saturday – Sunday (Weekends only)";
  } else if (low.includes("mon") && low.includes("fri")) {
    days = "Monday – Friday";
  }

  // Find times like 9:00 AM, 5:00 PM, 9am, 5pm, 09:00 AM
  const timeRegex = /([0-1]?[0-9](?::[0-5][0-9])?\s*(?:am|pm))/gi;
  const matches = val.match(timeRegex);
  if (matches && matches.length >= 2) {
    const norm = (str: string) => {
      let s = str.trim().toUpperCase();
      if (!s.includes(":")) {
        s = s.replace(/(\d+)\s*(AM|PM)/, "$1:00 $2");
      }
      const parts = s.split(":");
      let h = parseInt(parts[0], 10);
      let rest = parts[1];
      const hStr = h < 10 ? `0${h}` : `${h}`;
      return `${hStr}:${rest.trim()}`;
    };
    const o = norm(matches[0]);
    const c = norm(matches[1]);
    const matchedOpen = TIME_OPTIONS.find((t) => t.toUpperCase() === o);
    if (matchedOpen) open = matchedOpen;
    const matchedClose = TIME_OPTIONS.find((t) => t.toUpperCase() === c);
    if (matchedClose) close = matchedClose;
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
  const parsed = React.useMemo(() => parseHours(value), [value]);

  const handleDaysChange = (newDays: string) => {
    const cleanDays = newDays.replace(/\s*\([^)]*\)/g, "").trim();
    onChange(`${cleanDays}: ${parsed.open} – ${parsed.close}`);
  };

  const handleOpenChange = (newOpen: string) => {
    const cleanDays = parsed.days.replace(/\s*\([^)]*\)/g, "").trim();
    onChange(`${cleanDays}: ${newOpen} – ${parsed.close}`);
  };

  const handleCloseChange = (newClose: string) => {
    const cleanDays = parsed.days.replace(/\s*\([^)]*\)/g, "").trim();
    onChange(`${cleanDays}: ${parsed.open} – ${newClose}`);
  };

  return (
    <div className="space-y-space-3 p-space-4 rounded-xl border border-border/80 bg-card/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-2">
          <Clock className="h-4 w-4 text-primary shrink-0" />
          <Label className="text-body-sm font-medium text-foreground">
            Business Hours <span className="text-destructive font-bold ml-0.5">*</span>
          </Label>
        </div>
        <span className="text-caption font-medium text-muted-foreground/80">
          {parsed.days.replace(/\s*\([^)]*\)/g, "").trim()} • {parsed.open} – {parsed.close}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-3">
        {/* Days of Operation Dropdown */}
        <div className="space-y-1">
          <Label className="text-caption font-medium text-muted-foreground">Days of Operation</Label>
          <Select value={parsed.days} onValueChange={handleDaysChange}>
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

        {/* Opening Time Dropdown */}
        <div className="space-y-1">
          <Label className="text-caption font-medium text-muted-foreground">Opening Time</Label>
          <Select value={parsed.open} onValueChange={handleOpenChange}>
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

        {/* Closing Time Dropdown */}
        <div className="space-y-1">
          <Label className="text-caption font-medium text-muted-foreground">Closing Time</Label>
          <Select value={parsed.close} onValueChange={handleCloseChange}>
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

  // Sync internal state when data prop updates (e.g. from background website scrape)
  React.useEffect(() => {
    if (data) {
      setForm(data);
      setServices(data.services || []);
    }
  }, [data]);
  const [subStep, setSubStep] = React.useState<"info" | "services" | "greeting">("info");
  const [isLaunching, setIsLaunching] = React.useState(false);
  const [isAddingService, setIsAddingService] = React.useState(false);
  const [newServiceName, setNewServiceName] = React.useState("");
  const [newServiceDuration, setNewServiceDuration] = React.useState("30");

  const meta = INDUSTRY_META[form.industry] || INDUSTRY_META["Other"];
  const Icon = meta.icon;

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

      {/* ── SUB-STEP 1: Business Info ── */}
      {subStep === "info" && (
        <div className="space-y-space-4 animate-fade-up" style={{ animationFillMode: "both" }}>
          <div>
            <h3 className="text-body-md font-bold text-foreground">Business Info</h3>
            <p className="text-body-sm text-muted-foreground mt-0.5">
              Review and confirm your business details.
            </p>
          </div>
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
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            
          </div>
        </div>
      )}

      {/* ── SUB-STEP 2: Services ── */}
      {subStep === "services" && (
        <div className="space-y-space-4 animate-fade-up" style={{ animationFillMode: "both" }}>
          <div>
            <h3 className="text-body-md font-bold text-foreground">Services</h3>
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
                      {svc.duration ? `${svc.duration} min` : "Duration not specified"}
                      {svc.price ? ` • ${svc.price.startsWith("₹") || svc.price.startsWith("$") ? svc.price : `₹${svc.price}`}` : " • Price on request"}
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
                <span>Next</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            
          </div>
        </div>
      )}

      {/* ── SUB-STEP 3: AI Greeting ── */}
      {subStep === "greeting" && (
        <div className="space-y-space-4 animate-fade-up" style={{ animationFillMode: "both" }}>
          <div>
            <h3 className="text-body-md font-bold text-foreground">AI Greeting</h3>
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
            
          </div>
        </div>
      )}
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
 <div className="absolute h-28 w-28 rounded-full border-primary/20 animate-ping [animation-duration:2.5s]" />
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
 ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-500"
 : idx === step
 ? "bg-primary/10 border-primary/30 text-primary"
 : "bg-muted border-border text-muted-foreground"
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
 onFinish={() => { clearOnboardingDraft(); router.push("/dashboard"); }}
 />
 );
}

// ─── Root Wizard ──────────────────────────────────────────────────────────────

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


import { saveOnboardingProgressAction } from "@/server/actions/onboarding";

export function OnboardingWizard({
 initialOrg,
 initialStep,
 initialDraftData,
}: {
 initialOrg?: { id: string; name: string };
 initialStep?: string;
 initialDraftData?: any;
}) {
 const router = useRouter();

 // Determine initial step safely
 const resolvedInitialStep: Step = (() => {
 if (initialStep === "verify" && initialDraftData?.businessName) return "verify";
 if (initialStep === "golive" && initialOrg) return "golive";
 return "url";
 })();

 const [step, setStep] = React.useState<Step>(resolvedInitialStep);
 const [url, setUrl] = React.useState(initialDraftData?.website || "");
 const [generated, setGenerated] = React.useState<GeneratedData | null>(
 initialDraftData?.businessName
 ? (initialDraftData as GeneratedData)
 : initialOrg
 ? {
 businessName: initialOrg.name,
 industry: "Other",
 timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
 email: "",
 phone: "",
 address: "",
 website: "",
 services: [],
 hours: "Mon–Fri 9:00 AM – 5:00 PM",
 greeting: `Hi, thank you for contacting ${initialOrg.name}. I'm Operator, your automated assistant. How can I help you today?`,
 }
 : null
 );
 const [submitError, setSubmitError] = React.useState<string | null>(null);
 const [createdOrgId, setCreatedOrgId] = React.useState<string | null>(initialOrg?.id || null);
  const [isClientLoaded, setIsClientLoaded] = React.useState(false);

  // Restore saved draft on mount (if valid and not expired)
  React.useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("reset=true")) {
      clearOnboardingDraft();
      setStep("url");
      setUrl("");
      setGenerated(null);
      setIsClientLoaded(true);
      return;
    }
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
  }, [step, url, generated, isClientLoaded]);

 const handleUrlNext = (inputUrl: string) => {
 setUrl(inputUrl);
 setStep("generating");
 saveOnboardingProgressAction("generating", { website: inputUrl });
 };

 const handleGenerationComplete = (data: GeneratedData) => {
 setGenerated(data);
 setStep("verify");
 saveOnboardingProgressAction("verify", data);
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
 services: data.services,
 };

 try {
 const result = await createOrganizationAction(payload as any);
 if (result.success && result.organization) {
 setCreatedOrgId(result.organization.id);
 setTimeout(() => {
 setStep("golive");
 }, 3200);
 } else if (typeof window !== "undefined" && window.location.search.includes("demo=true")) {
 setTimeout(() => {
 setStep("golive");
 }, 3200);
 } else {
 setSubmitError(result.error || "We couldn't create your business account. Try again.");
 setStep("verify");
 }
 } catch (e: any) {
 if (typeof window !== "undefined" && window.location.search.includes("demo=true")) {
 setTimeout(() => {
 setStep("golive");
 }, 3200);
 } else {
 setSubmitError(e?.message || "We couldn't complete the setup. Try again.");
 setStep("verify");
 }
 }
 };

 const showIndicator = step !== "launching" && step !== "golive";

 return (
 <div>
 {showIndicator && <StepIndicator current={step} />}

 {submitError && (
 <div className="flex items-start gap-space-3 px-space-4 py-space-3 rounded-xl border-destructive/20 bg-destructive/5 mb-space-6">
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