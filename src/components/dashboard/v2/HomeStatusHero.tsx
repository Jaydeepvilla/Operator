"use client";

import * as React from "react";
import { COPY } from "@/lib/copy/labels";
import { Button } from "@/components/shared/button";
import { TimeRange } from "@/lib/dashboard-engine/daily-brief";
import { cn } from "@/components/shared/utils";
import { RefreshCw, Play, Pause, Sparkles } from "lucide-react";
import { toggleAssistantPauseAction } from "@/server/actions/settings";
import { useToast } from "@/components/shared/toast";

interface HomeStatusHeroProps {
  businessName: string;
  messagesAnsweredToday: number;
  isPaused: boolean;
  onPauseToggle: (nextState: boolean) => void;
  range: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdatedText: string;
}

export function HomeStatusHero({
  businessName,
  messagesAnsweredToday,
  isPaused,
  onPauseToggle,
  range,
  onRangeChange,
  onRefresh,
  isRefreshing,
  lastUpdatedText,
}: HomeStatusHeroProps) {
  const toast = useToast();
  const [isUpdating, setIsUpdating] = React.useState(false);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const handleToggle = async () => {
    setIsUpdating(true);
    const nextPaused = !isPaused;
    try {
      const res = await toggleAssistantPauseAction(nextPaused);
      if (res.success) {
        onPauseToggle(nextPaused);
        toast.success(
          nextPaused ? "Assistant Paused" : "Assistant Resumed",
          nextPaused
            ? "Your assistant is now paused. Messages will wait for your team."
            : "Your assistant is ON and actively answering customer inquiries."
        );
      } else {
        toast.error("Status Update Failed", res.error || "Could not change status.");
      }
    } catch (err: any) {
      toast.error("Error", err.message || "Failed to update assistant status.");
    } finally {
      setIsUpdating(false);
    }
  };

  const ranges: { id: TimeRange; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "7d", label: "7 Days" },
    { id: "30d", label: "30 Days" },
    { id: "all", label: "All Time" },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-space-6 shadow-sm">
      <div className="flex flex-col gap-space-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Greeting, Business Name, Plain Status sentence */}
        <div className="space-y-1.5">
          <p className="text-caption font-bold text-primary uppercase tracking-widest">
            {greeting}, {businessName}
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Status Pill with plain wording */}
            <div
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border transition-colors",
                !isPaused
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-amber-500/15 border-amber-500/30 text-amber-400"
              )}
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  !isPaused ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                )}
              />
              <span>{isPaused ? "ASSISTANT PAUSED" : "ASSISTANT ON"}</span>
            </div>

            {/* One Plain Sentence (Step 3.1) */}
            <p className="text-body-sm font-medium text-foreground/90">
              {isPaused
                ? COPY.status.pausedMessage
                : COPY.status.answeringToday(messagesAnsweredToday)}
            </p>
          </div>
        </div>

        {/* Right: Controls (Pause Switch + Time Switcher + Refresh) */}
        <div className="flex flex-wrap items-center gap-space-2.5">
          {/* Pause / Resume Switch */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggle}
            disabled={isUpdating}
            className={cn(
              "gap-1.5 font-semibold text-xs border transition-colors",
              isPaused
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20"
                : "bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
            )}
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Turn Assistant ON</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause Assistant</span>
              </>
            )}
          </Button>

          {/* Time Range Pills */}
          <div className="inline-flex items-center p-1 rounded-xl bg-muted/60 border border-border/50 text-caption font-medium">
            {ranges.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onRangeChange(r.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all text-xs font-semibold select-none cursor-pointer",
                  range === r.id
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Sync / Refresh */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-background/80 hover:bg-muted/60 text-muted-foreground hover:text-foreground text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            title={`Last updated ${lastUpdatedText}. Click to refresh.`}
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5 text-primary", isRefreshing && "animate-spin")}
            />
            <span className="hidden sm:inline">
              {isRefreshing ? "Syncing..." : lastUpdatedText}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

