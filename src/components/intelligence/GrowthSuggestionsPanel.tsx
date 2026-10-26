"use client";

import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { GrowthEngineResult, GrowthIdea } from "@/lib/business-intelligence/types";
import { Sprout, Zap, Target, RefreshCw, TrendingUp, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/components/shared/utils";

const typeConfig: Record<
  GrowthIdea["type"],
  { icon: React.ComponentType<any>; label: string; iconBg: string; textColor: string }
> = {
  new_service: { icon: Zap,       label: "New Service", iconBg: "bg-blue-500/10",    textColor: "text-blue-500" },
  membership:  { icon: RefreshCw, label: "Membership",  iconBg: "bg-violet-500/10",  textColor: "text-violet-500" },
  promotion:   { icon: TrendingUp,label: "Promotion",   iconBg: "bg-orange-500/10",  textColor: "text-orange-500" },
  referral:    { icon: Target,    label: "Referral",    iconBg: "bg-pink-500/10",    textColor: "text-pink-500" },
  upsell:      { icon: TrendingUp,label: "Upsell",      iconBg: "bg-emerald-500/10", textColor: "text-emerald-500" },
  retention:   { icon: RefreshCw, label: "Retention",   iconBg: "bg-amber-500/10",   textColor: "text-amber-500" },
};

const effortConfig = {
  quick:   { label: "Quick Win", badge: "bg-[hsl(var(--state-success-bg))] text-[hsl(var(--state-success-text))] border-[hsl(var(--state-success-border))]" },
  medium:  { label: "Medium",    badge: "bg-[hsl(var(--state-warning-bg))] text-[hsl(var(--state-warning-text))] border-[hsl(var(--state-warning-border))]" },
  project: { label: "Project",   badge: "bg-[hsl(var(--state-info-bg))] text-[hsl(var(--state-info-text))] border-[hsl(var(--state-info-border))]" },
} as const;

function GrowthIdeaCard({ idea }: { idea: GrowthIdea }) {
  const cfg = typeConfig[idea.type];
  const effort = effortConfig[idea.estimatedEffort];
  const Icon = cfg.icon;

  return (
    <div className="group rounded-xl border border-border/50 bg-card p-4 flex flex-col gap-3 hover:border-[hsl(var(--foreground)/0.14)] hover:shadow-md transition-all duration-200">
      {/* Top row: icon + badges */}
      <div className="flex items-start justify-between gap-2">
        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", cfg.iconBg)}>
          <Icon className={cn("h-4 w-4", cfg.textColor)} />
        </div>
        <div className="flex gap-1.5 flex-wrap justify-end">
          <span className={cn("text-caption font-bold px-2 py-0.5 rounded-full border", effort.badge)}>
            {effort.label}
          </span>
          <span className={cn("text-caption font-bold px-2 py-0.5 rounded-full", cfg.iconBg, cfg.textColor)}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-1 flex-1">
        <p className="text-[13px] font-semibold text-foreground leading-snug">{idea.title}</p>
        <p className="text-caption text-muted-foreground/70 leading-relaxed">{idea.description}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border/40">
        <p className="text-caption text-muted-foreground/55 italic truncate mr-2 flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-emerald-500 shrink-0" />
          {idea.businessImpact}
        </p>
        <Button asChild variant="soft" size="xs" className="shrink-0">
          <Link href={idea.actionHref}>
            {idea.actionText} <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

interface GrowthSuggestionsPanelProps {
  growth: GrowthEngineResult;
}

export function GrowthSuggestionsPanel({ growth }: GrowthSuggestionsPanelProps) {
  return (
    <Card className="h-full flex flex-col overflow-hidden border border-[hsl(var(--foreground)/0.07)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 p-5 pb-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Sprout className="h-4.5 w-4.5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-[13px] font-bold text-foreground">AI Growth Suggestions</h2>
            <p className="text-caption text-muted-foreground/60">
              {growth.industryName} industry
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold tabular-nums text-emerald-500">
            {growth.ideas.length}
          </div>
          <div className="text-caption font-semibold uppercase tracking-widest text-muted-foreground/60">
            Ideas
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-4">
        {growth.ideas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <p className="font-semibold text-foreground text-sm">Strong Growth Foundation</p>
            <p className="text-xs mt-1">No major growth gaps detected.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {growth.ideas.map((idea) => (
              <GrowthIdeaCard key={idea.id} idea={idea} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
