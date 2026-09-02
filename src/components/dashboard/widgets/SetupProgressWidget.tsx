"use client";

import { m } from "framer-motion";
import { hoverScale } from "@/components/motion/hover";
import { SetupProgressItem } from "@/lib/dashboard-engine/index";
import { Card } from "@/components/shared/card";
import { ScoreRing } from "../shared/score-ring";
import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  Trophy,
  Rocket,
  Zap,
  Circle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/components/shared/utils";
import { toggleSetupTaskAction } from "@/server/actions/onboarding";

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
  const router = useRouter();
  const [isMinimized, setIsMinimized] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const { completed, total, percentage, remainingMinutes, items } = progress;
  const tier = getProgressTier(percentage);
  const TierIcon = tier.icon;

  const incomplete = items.filter((i) => !i.completed);
  const done       = items.filter((i) => i.completed);

  const handleToggleTask = async (e: React.MouseEvent, taskId: string, nextState: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setUpdatingTaskId(taskId);
    try {
      await toggleSetupTaskAction(taskId, nextState);
      router.refresh();
    } catch (err) {
      console.warn("Toggle task failure:", err);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  return (
    <m.div whileHover={hoverScale} className="h-full flex flex-col">
      <Card className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-space-5 pt-space-5 pb-space-3 shrink-0">
          <div className="flex items-center gap-space-2">
            <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", tier.bg)}>
              <TierIcon className={cn("w-3.5 h-3.5", tier.colorClass)} />
            </div>
            <p className="text-caption font-bold text-muted-foreground uppercase tracking-wider">
              Setup Journey
            </p>
          </div>
          <div className="flex items-center gap-space-2">
            {remainingMinutes > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border/60">
                <Clock className="w-3 h-3 text-primary" />
                <span>Est. {remainingMinutes}m left</span>
              </span>
            )}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/50 transition-colors"
              title={isMinimized ? "Expand setup checklist" : "Minimize setup checklist"}
            >
              <span>{isMinimized ? "Expand" : "Collapse"}</span>
              {isMinimized ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="h-px bg-border mx-space-5 mb-space-3 shrink-0" />

        {/* Minimized compact row */}
        {isMinimized ? (
          <div className="px-space-5 pb-space-5 flex items-center justify-between gap-space-4">
            <div className="flex items-center gap-space-3 flex-1 min-w-0">
              <span className="text-body-sm font-bold text-foreground shrink-0">
                {completed}/{total} Completed ({percentage}%)
              </span>
              <div className="flex-1 max-w-xs h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
            {incomplete.length > 0 && (
              <Link
                href={incomplete[0].href}
                className="text-[12px] font-semibold text-primary hover:underline flex items-center gap-1 shrink-0"
              >
                <span>Next: {incomplete[0].label}</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Hero progress block */}
            <div className="mx-space-4 mb-space-3 rounded-xl border border-border/60 bg-muted/40 p-space-4 flex items-center gap-space-4 shrink-0">
              <ScoreRing score={percentage} size={64} color="var(--primary-500)" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-space-1.5 mb-space-0.5">
                  <span className={cn("text-caption font-bold uppercase tracking-wide", tier.colorClass)}>
                    {tier.label}
                  </span>
                </div>
                <p className="text-body-sm font-bold text-foreground">
                  {completed}/{total} steps completed
                </p>
                <p className="text-caption text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
                  {getImpactMessage(percentage)}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Steps list — Incomplete steps as a grid card, completed in one row */}
        {!isMinimized && (
          <div className="flex-1 px-space-4 pb-space-4 overflow-auto">
            {incomplete.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-3">
                {incomplete.map((item) => {
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="group relative flex flex-col items-start gap-space-1.5 p-space-4 rounded-xl border border-border/80 bg-card hover:border-primary/50 hover:bg-primary/[0.02] hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer h-full"
                    >
                      {/* Subtle shimmer on hover */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none rounded-xl" />

                      {/* Title Row with Radio icon and Arrow */}
                      <div className="flex items-center justify-between w-full min-w-0">
                        <div className="flex items-center gap-space-2 min-w-0">
                          <button
                            type="button"
                            title="Click to mark as done"
                            onClick={(e) => handleToggleTask(e, item.id, true)}
                            disabled={updatingTaskId === item.id}
                            className="p-1 -m-1 rounded-full hover:bg-primary/10 transition-colors z-10 shrink-0"
                          >
                            {updatingTaskId === item.id ? (
                              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                            ) : (
                              <Circle className="w-4 h-4 text-muted-foreground/60 hover:text-primary transition-colors duration-150" />
                            )}
                          </button>
                          <span className="text-body-sm font-bold text-foreground truncate leading-snug group-hover:text-primary transition-colors duration-150">
                            {item.label}
                          </span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
                      </div>

                      {/* Description Text */}
                      <div className="min-w-0 w-full mt-space-0.5">
                        <p className="text-caption font-normal text-muted-foreground leading-relaxed line-clamp-2">
                          {item.description}
                        </p>
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
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Completed
                  </span>
                  <div className="flex-1 h-px bg-border/40" />
                </div>
                <div className="flex flex-wrap gap-space-2">
                  {done.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-center gap-space-1.5 px-space-3 py-space-1 rounded-lg border border-border/40 bg-muted/30 text-caption font-medium text-muted-foreground hover:border-border transition-colors"
                    >
                      <button
                        type="button"
                        title="Click to unmark"
                        onClick={(e) => handleToggleTask(e, item.id, false)}
                        disabled={updatingTaskId === item.id}
                        className="hover:scale-110 transition-transform shrink-0"
                      >
                        {updatingTaskId === item.id ? (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 hover:text-amber-500 transition-colors" />
                        )}
                      </button>
                      <Link href={item.href} className="line-through hover:text-foreground transition-colors">
                        {item.label}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </m.div>
  );
}
