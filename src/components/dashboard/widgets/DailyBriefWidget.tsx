import { useState } from "react";
import { DailyBriefData, TimeRange } from "@/lib/dashboard-engine/daily-brief";
import { RefreshCw, Play, Sparkles, Radio, Zap, Clock } from "lucide-react";
import { cn } from "@/components/shared/utils";

interface DailyBriefWidgetProps {
  brief: DailyBriefData;
  businessName: string;
  range?: TimeRange;
  onRangeChange?: (range: TimeRange) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastUpdatedText?: string;
  onSimulate?: (type: "conversation" | "booking") => void;
  isSimulating?: boolean;
}

function formatTimeSaved(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

export function DailyBriefWidget({
  brief,
  businessName,
  range = "today",
  onRangeChange,
  onRefresh,
  isRefreshing = false,
  lastUpdatedText = "Just now",
  onSimulate,
  isSimulating = false,
}: DailyBriefWidgetProps) {
  const [showSimulateMenu, setShowSimulateMenu] = useState(false);
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const periodLabel =
    range === "7d" ? "in the past 7 days" :
    range === "30d" ? "in the past 30 days" :
    range === "all" ? "across all time" : "today";

  // Build a natural language summary
  const summaryParts: string[] = [];
  if (brief.conversationsHandled > 0) {
    summaryParts.push(
      `handled ${brief.conversationsHandled} conversation${brief.conversationsHandled !== 1 ? "s" : ""}`
    );
  }
  if (brief.appointmentsBooked > 0) {
    summaryParts.push(
      `booked ${brief.appointmentsBooked} appointment${brief.appointmentsBooked !== 1 ? "s" : ""}`
    );
  }
  if (brief.escalations > 0) {
    summaryParts.push(
      `escalated ${brief.escalations} to your team`
    );
  }
  if (brief.estimatedTimeSavedMinutes > 0) {
    summaryParts.push(
      `saved ${formatTimeSaved(brief.estimatedTimeSavedMinutes)} of staff time`
    );
  }

  const summaryText =
    summaryParts.length > 0
      ? `Operator AI ${summaryParts.join(", ")} ${periodLabel}.`
      : `Operator AI front desk is active & listening 24/7. No customer inquiries recorded ${periodLabel}.`;

  const ranges: { id: TimeRange; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "7d", label: "7 Days" },
    { id: "30d", label: "30 Days" },
    { id: "all", label: "All Time" },
  ];

  return (
    <section className="rounded-2xl border border-[hsl(var(--foreground)/0.08)] bg-card overflow-hidden shadow-sm">
      {/* Header Banner */}
      <div className="relative gradient-hero p-space-5 lg:p-space-6 pt-space-6">
        <div
          className="mesh-glow absolute -top-space-24 -right-space-24 w-space-36 h-space-36 pointer-events-none opacity-40"
          aria-hidden
        />

        {/* Top Control Bar: Business Title + Live Badges & Horizon Switcher */}
        <div className="relative z-10 flex flex-col gap-space-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-space-2">
              <span className="text-[11px] font-bold text-primary uppercase tracking-widest">
                {greeting}
              </span>
              <span className="text-muted-foreground/40">•</span>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Receptionist 24/7</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-tight">
              {businessName}
            </h1>
          </div>

          {/* Controls: Time Horizon Switcher + Refresh + Test AI Simulator */}
          <div className="flex flex-wrap items-center gap-space-2">
            {/* Range Pills */}
            <div className="inline-flex items-center p-1 rounded-xl bg-muted/60 border border-border/50 text-caption font-medium">
              {ranges.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onRangeChange?.(r.id)}
                  className={cn(
                    "px-3 py-1 rounded-lg transition-all text-[12px] font-semibold",
                    range === r.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Refresh Button with Rotating Spinner */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-background/80 hover:bg-muted/60 text-muted-foreground hover:text-foreground text-[12px] font-semibold transition-all shadow-sm"
              title={`Last updated ${lastUpdatedText}. Click to refresh live metrics.`}
            >
              <RefreshCw
                className={cn(
                  "w-3.5 h-3.5 text-primary",
                  isRefreshing && "animate-spin"
                )}
              />
              <span className="hidden sm:inline">
                {isRefreshing ? "Syncing..." : lastUpdatedText}
              </span>
            </button>

            {/* Quick Test AI Button */}
            {onSimulate && (
              <div className="relative">
                <button
                  onClick={() => setShowSimulateMenu(!showSimulateMenu)}
                  disabled={isSimulating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-[12px] font-bold hover:bg-primary/90 transition-all shadow-sm shadow-primary/20"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isSimulating ? "Simulating..." : "Test AI Call/Chat"}</span>
                </button>

                {showSimulateMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-xl z-20 space-y-1 animate-fade-in">
                    <button
                      onClick={() => {
                        setShowSimulateMenu(false);
                        onSimulate("conversation");
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-[12px] font-medium text-foreground flex items-center justify-between"
                    >
                      <span>Simulate Customer Inquiry</span>
                      <Zap className="w-3.5 h-3.5 text-primary" />
                    </button>
                    <button
                      onClick={() => {
                        setShowSimulateMenu(false);
                        onSimulate("booking");
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-[12px] font-medium text-foreground flex items-center justify-between"
                    >
                      <span>Simulate Confirmed Booking</span>
                      <Play className="w-3.5 h-3.5 text-emerald-500" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Telemetry Strip */}
        <div className="relative z-10 mt-space-4 pt-space-4 border-t border-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-3">
          <p className="text-body-sm text-muted-foreground leading-relaxed flex-1 min-w-0">
            {summaryText}
          </p>

          {/* Channel Pulse Indicators */}
          <div className="flex items-center gap-space-3 shrink-0 text-[11px] font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Voice Hotline
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Web Widget
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground/60">
              <Clock className="w-3 h-3 text-primary" />
              Latency: ~820ms
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
