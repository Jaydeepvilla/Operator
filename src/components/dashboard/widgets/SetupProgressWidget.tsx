"use client";

import { m } from "framer-motion";
import { hoverScale } from "@/components/motion/hover";
import { SetupProgressItem } from "@/lib/dashboard-engine/index";
import { Card } from "@/components/shared/card";
import { ScoreRing } from "../shared/score-ring";
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  Trophy,
  Rocket,
  Zap,
  Circle
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/components/shared/utils";

interface SetupProgressWidgetProps {
  progress: {
    completed: number;
    total: number;
    percentage: number;
    remainingMinutes: number;
    items: SetupProgressItem[];
  };
}

function getProgressTier(pct: number) {
  if (pct === 100) return { label: "Fully Operational", icon: Trophy, colorClass: "text-emerald-500", bg: "bg-emerald-500/10" };
  if (pct >= 70)   return { label: "Almost There",      icon: Rocket, colorClass: "text-amber-500",   bg: "bg-amber-500/10"  };
  return              { label: "Getting Started",       icon: Zap,    colorClass: "text-primary",      bg: "bg-primary/10"    };
}

const getImpactMessage = (pct: number) => {
  if (pct === 100) return "Operator AI is fully trained and ready to handle customer inquiries.";
  if (pct >= 70)   return "Nearly there! A few more steps unlock maximum booking automation.";
  if (pct >= 40)   return "Adding services & hours will unlock automatic booking features.";
  return "Complete setup to activate Operator AI and streamline front-desk operations.";
};

export function SetupProgressWidget({ progress }: SetupProgressWidgetProps) {
  const { completed, total, percentage, remainingMinutes, items } = progress;
  const tier = getProgressTier(percentage);
  const TierIcon = tier.icon;

  const incomplete = items.filter((i) => !i.completed);
  const done       = items.filter((i) => i.completed);

  return (
    <m.div whileHover={hoverScale} className="h-full flex flex-col">
      <Card className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-space-5 pt-space-5 pb-space-3 shrink-0">
          <div className="flex items-center gap-space-2">
            <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", tier.bg)}>
              <TierIcon className={cn("w-3.5 h-3.5", tier.colorClass)} />
            </div>
            <p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest">
              Setup Journey
            </p>
          </div>
          {remainingMinutes > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground/60 bg-muted/60 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" />
              ~{remainingMinutes}m left
            </span>
          )}
        </div>

        <div className="h-px bg-border mx-space-5 mb-space-3 shrink-0" />

        {/* Hero progress block */}
        <div className="mx-space-4 mb-space-3 rounded-xl border border-border/60 bg-muted/30 p-space-4 flex items-center gap-space-4 shrink-0">
          <ScoreRing score={percentage} size={64} color="var(--primary-500)" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-space-1.5 mb-space-0.5">
              <span className={cn("text-[11px] font-bold uppercase tracking-wide", tier.colorClass)}>
                {tier.label}
              </span>
            </div>
            <p className="text-[12px] font-semibold text-foreground">
              {completed}/{total} steps done
            </p>
            <p className="text-[11px] text-muted-foreground/60 leading-snug mt-0.5 line-clamp-2">
              {getImpactMessage(percentage)}
            </p>
          </div>
        </div>

        {/* Steps list — Incomplete steps as a grid card, completed in one row */}
        <div className="flex-1 px-space-4 pb-space-4 overflow-auto">
          {incomplete.length > 0 && (
            <div className="grid grid-cols-3 gap-space-3">
              {incomplete.map((item) => {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="group relative flex flex-col items-start gap-space-2 p-space-4 rounded-xl border border-[hsl(var(--foreground)/0.06)] bg-gradient-to-br from-background to-[hsl(var(--foreground)/0.005)] hover:border-[hsl(var(--foreground)/0.14)] hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer h-full"
                  >
                    {/* Subtle shimmer on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/4 to-transparent pointer-events-none rounded-xl" />

                    {/* Title Row with Radio icon and Arrow */}
                    <div className="flex items-center justify-between w-full min-w-0">
                      <div className="flex items-center gap-space-2 min-w-0">
                        <Circle className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0 group-hover:text-primary transition-colors duration-150" />
                        <span className="text-body-sm font-semibold text-foreground truncate leading-none group-hover:text-primary transition-colors duration-150">
                          {item.label}
                        </span>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
                    </div>

                    {/* Description Text */}
                    <div className="min-w-0 w-full mt-space-1">
                      <span className="text-[10px] text-muted-foreground/55 mt-space-0.5 block leading-snug truncate">
                        {item.description}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Completed items section */}
          {done.length > 0 && (
            <div className="mt-space-5">
              <div className="flex items-center gap-2 py-space-1.5 mb-space-2.5">
                <div className="flex-1 h-px bg-border/40" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/45">
                  Completed
                </span>
                <div className="flex-1 h-px bg-border/40" />
              </div>
              <div className="flex flex-wrap gap-space-2">
                {done.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-space-1.5 px-space-2.5 py-space-1 rounded-lg border border-border/30 bg-muted/20 text-[11px] font-medium text-muted-foreground/50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="line-through">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </m.div>
  );
}
