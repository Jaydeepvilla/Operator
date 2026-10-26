"use client";

import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { SeasonalEngineResult, SeasonalRecommendation } from "@/lib/business-intelligence/types";
import { CalendarDays, Clock, ArrowRight, TrendingUp, Flame } from "lucide-react";
import Link from "next/link";
import { cn } from "@/components/shared/utils";

const typeConfig: Record<
  string,
  { emoji: string; label: string; bg: string; text: string }
> = {
  holiday:        { emoji: "🎉", label: "Holiday",        bg: "bg-rose-500/10",   text: "text-rose-500" },
  industry_event: { emoji: "📅", label: "Industry Event", bg: "bg-blue-500/10",   text: "text-blue-500" },
  season_change:  { emoji: "🌱", label: "Season Change",  bg: "bg-emerald-500/10",text: "text-emerald-500" },
};

function SeasonalCard({ rec }: { rec: SeasonalRecommendation }) {
  const cfg = typeConfig[rec.event.type] ?? {
    emoji: "📅", label: "Event", bg: "bg-muted", text: "text-muted-foreground",
  };

  const isUrgent = rec.event.daysUntil <= 14;
  const isSoon = rec.event.daysUntil <= 30;

  const cardBg = isUrgent
    ? "border-rose-500/20 bg-rose-500/[0.04] hover:bg-rose-500/[0.07]"
    : isSoon
    ? "border-amber-500/20 bg-amber-500/[0.04] hover:bg-amber-500/[0.07]"
    : "border-border/50 bg-muted/20 hover:bg-muted/40";

  const daysLabel =
    rec.event.daysUntil === 0
      ? "Today"
      : rec.event.daysUntil === 1
      ? "Tomorrow"
      : `${rec.event.daysUntil}d away`;

  const dateStr = new Date(rec.event.date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className={cn("group rounded-xl border p-4 space-y-2.5 transition-colors duration-150", cardBg)}>
      {/* Event header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-lg", cfg.bg)}>
            {cfg.emoji}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-foreground leading-snug">{rec.event.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock className="h-3 w-3 text-muted-foreground/50" />
              <span className={cn("text-caption font-bold", isUrgent ? "text-rose-500" : isSoon ? "text-amber-500" : "text-muted-foreground/60")}>
                {daysLabel}
              </span>
              <span className="text-muted-foreground/40 text-caption">·</span>
              <span className="text-caption text-muted-foreground/60">{dateStr}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isUrgent && (
            <span className="inline-flex items-center gap-1 text-caption font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
              <Flame className="h-2.5 w-2.5" /> Act Now
            </span>
          )}
          <span className={cn("text-caption font-bold px-2 py-0.5 rounded-full", cfg.bg, cfg.text)}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Recommendation */}
      <div>
        <p className="text-[12px] font-semibold text-foreground leading-snug">{rec.title}</p>
        <p className="text-caption text-muted-foreground/70 leading-relaxed mt-1">{rec.description}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border/40">
        <p className="text-caption text-muted-foreground/50 italic flex items-center gap-1 truncate mr-2">
          <TrendingUp className="h-3 w-3 text-emerald-500 shrink-0" />
          {rec.businessImpact}
        </p>
        <Button asChild variant="ghost" size="xs" className="shrink-0">
          <Link href={rec.actionHref}>
            {rec.actionText} <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

interface SeasonalRecommendationsPanelProps {
  seasonal: SeasonalEngineResult;
}

export function SeasonalRecommendationsPanel({ seasonal }: SeasonalRecommendationsPanelProps) {
  return (
    <Card className="h-full flex flex-col overflow-hidden border border-[hsl(var(--foreground)/0.07)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 p-5 pb-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <CalendarDays className="h-4.5 w-4.5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-[13px] font-bold text-foreground">Seasonal Recommendations</h2>
            <p className="text-caption text-muted-foreground/60">
              Upcoming events in the next 90 days
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold tabular-nums text-amber-500">
            {seasonal.recommendations.length}
          </div>
          <div className="text-caption font-semibold uppercase tracking-widest text-muted-foreground/60">
            Events
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto p-4 space-y-2.5">
        {seasonal.recommendations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <CalendarDays className="h-7 w-7 opacity-30" />
            </div>
            <p className="font-semibold text-foreground text-sm">No Upcoming Events</p>
            <p className="text-xs mt-1">Check back later for seasonal opportunities.</p>
          </div>
        ) : (
          seasonal.recommendations.map((rec) => <SeasonalCard key={rec.id} rec={rec} />)
        )}
      </div>
    </Card>
  );
}
