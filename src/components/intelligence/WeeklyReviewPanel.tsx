"use client";

import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { WeeklyReview, BIRecommendation } from "@/lib/business-intelligence/types";
import {
  CalendarCheck,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  ArrowRight,
  Minus,
  AlertCircle,
  AlertTriangle,
  Info,
  Flame,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/components/shared/utils";

// ─── Score Delta Stat ─────────────────────────────────────────────────────────

function StatPill({
  value,
  label,
  positive,
}: {
  value: React.ReactNode;
  label: string;
  positive?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-4 py-3 flex-1">
      <div
        className={cn(
          "flex items-center gap-1 text-2xl font-bold tabular-nums",
          positive === true
            ? "text-emerald-500"
            : positive === false
            ? "text-rose-500"
            : "text-foreground"
        )}
      >
        {value}
      </div>
      <span className="text-caption font-semibold uppercase tracking-widest text-muted-foreground/60">
        {label}
      </span>
    </div>
  );
}

// ─── Priority Row ─────────────────────────────────────────────────────────────

const severityIconMap = {
  critical: AlertCircle,
  warning: AlertTriangle,
  opportunity: Flame,
  info: Info,
};
const severityColor = {
  critical: "text-rose-500 bg-rose-500/10",
  warning: "text-amber-500 bg-amber-500/10",
  opportunity: "text-violet-500 bg-violet-500/10",
  info: "text-blue-500 bg-blue-500/10",
};

function PriorityRow({ action, idx }: { action: BIRecommendation; idx: number }) {
  const Icon = severityIconMap[action.severity] ?? Info;
  const colorClass = severityColor[action.severity] ?? "text-blue-500 bg-blue-500/10";

  return (
    <div className="group flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
      <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", colorClass)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground leading-snug">{action.title}</p>
        <p className="text-caption text-muted-foreground/65 line-clamp-1 mt-0.5 leading-snug">
          {action.description}
        </p>
      </div>
      <Button asChild variant="ghost" size="xs" className="shrink-0 h-6 mt-0.5">
        <Link href={action.primaryCtaHref}>
          Fix <ArrowRight className="h-3 w-3" />
        </Link>
      </Button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface WeeklyReviewPanelProps {
  weeklyReview: WeeklyReview;
}

export function WeeklyReviewPanel({ weeklyReview: review }: WeeklyReviewPanelProps) {
  const formattedWeek = new Date(review.weekOf).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const healthPositive =
    review.healthScoreDelta > 0 ? true : review.healthScoreDelta < 0 ? false : undefined;

  return (
    <Card className="relative overflow-hidden border border-[hsl(var(--foreground)/0.07)]">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_0%_0%,hsl(262_80%_60%/0.08),transparent)]" />

      <div className="relative p-5 flex flex-col gap-5">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/15">
              <CalendarCheck className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-[13px] font-bold text-foreground">Weekly Review</h2>
              <p className="text-caption text-muted-foreground/60">
                Week of {formattedWeek}
              </p>
            </div>
          </div>
          <span className="text-caption font-medium text-muted-foreground/60 italic leading-snug max-w-[50%] text-right">
            {review.headline}
          </span>
        </div>

        {/* ── Stats Strip ── */}
        <div className="rounded-xl border border-border/60 bg-muted/30 divide-x divide-border/50 flex overflow-hidden">
          <StatPill
            value={review.completedImprovements}
            label="Improvements"
          />
          <StatPill
            value={
              <span className="flex items-center gap-1">
                {healthPositive === true ? (
                  <TrendingUp className="h-5 w-5" />
                ) : healthPositive === false ? (
                  <TrendingDown className="h-5 w-5" />
                ) : (
                  <Minus className="h-5 w-5 text-muted-foreground" />
                )}
                {review.healthScoreDelta > 0 ? "+" : ""}
                {review.healthScoreDelta}
              </span>
            }
            label="Health Δ"
            positive={healthPositive}
          />
          <StatPill
            value={review.unresolvedIssues}
            label="Open Issues"
            positive={review.unresolvedIssues === 0 ? true : undefined}
          />
        </div>

        {/* ── Summary ── */}
        <p className="text-[12px] text-muted-foreground/80 leading-relaxed">{review.summary}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* ── Business Wins ── */}
          {review.businessWins.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="h-5 w-5 rounded-md bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                </div>
                <span className="text-caption font-bold uppercase tracking-widest text-emerald-500">
                  This Week's Wins
                </span>
              </div>
              <ul className="space-y-2">
                {review.businessWins.map((win, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[12px]">
                    <span className="h-4 w-4 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5 text-caption font-medium">
                      ✓
                    </span>
                    <span className="text-foreground leading-snug">{win}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Next Priorities ── */}
          {review.nextPriorities.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="h-5 w-5 rounded-md bg-amber-500/10 flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                </div>
                <span className="text-caption font-bold uppercase tracking-widest text-amber-500">
                  Next Priorities
                </span>
              </div>
              <div>
                {review.nextPriorities.map((p, i) => (
                  <PriorityRow key={p.id} action={p} idx={i} />
                ))}
              </div>
            </div>
          )}
        </div>

        {review.businessWins.length === 0 && review.nextPriorities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <CalendarCheck className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No activity recorded this week yet.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
