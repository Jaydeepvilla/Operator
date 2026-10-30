"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Clock, ArrowRight, ExternalLink } from "lucide-react";
import { cn } from "@/components/shared/utils";
import { Button } from "@/components/shared/button";

export interface ChecklistStep {
  id: string;
  title: string;
  whyItMatters: string;
  timeNeeded: string;
  isComplete: boolean;
  href: string;
  actionText: string;
  exampleText?: string;
}

interface SetupChecklistCardProps {
  steps: ChecklistStep[];
}

export function SetupChecklistCard({ steps }: SetupChecklistCardProps) {
  const [activeExampleId, setActiveExampleId] = React.useState<string | null>(null);

  const completedCount = steps.filter((s) => s.isComplete).length;
  const totalCount = steps.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-space-6 shadow-sm space-y-space-4">
      {/* Header & Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-body-md font-bold text-foreground">Setup Checklist</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary-light">
              {completedCount} of {totalCount} completed
            </span>
          </div>
          <span className="text-body-sm font-bold text-foreground tabular-nums">
            {percentage}%
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-muted/60 border border-border/60 rounded-full h-2 overflow-hidden p-0.5">
          <div
            className="bg-gradient-to-r from-primary to-indigo-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* 5-Step List */}
      <div className="divide-y divide-border/40">
        {steps.map((step, idx) => {
          const isExampleOpen = activeExampleId === step.id;

          return (
            <div
              key={step.id}
              className={cn(
                "py-3.5 first:pt-2 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors",
                step.isComplete ? "opacity-75" : "opacity-100"
              )}
            >
              {/* Left: Indicator + Title + Reason + Time */}
              <div className="flex items-start gap-3 min-w-0">
                <div className="pt-0.5 shrink-0">
                  {step.isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground/40" />
                  )}
                </div>

                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "text-body-sm font-semibold",
                        step.isComplete ? "text-foreground/80 line-through" : "text-foreground"
                      )}
                    >
                      {step.title}
                    </span>
                    <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground/60" />
                      <span>{step.timeNeeded}</span>
                    </span>
                  </div>

                  <p className="text-caption text-muted-foreground leading-relaxed">
                    {step.whyItMatters}
                  </p>

                  {/* Optional Example Toggle */}
                  {step.exampleText && (
                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveExampleId(isExampleOpen ? null : step.id)
                        }
                        className="text-[11px] font-semibold text-primary-light hover:underline cursor-pointer"
                      >
                        {isExampleOpen ? "Hide example" : "See an example"}
                      </button>
                      {isExampleOpen && (
                        <div className="mt-1.5 p-2.5 rounded-lg bg-background/80 border border-border/60 text-xs text-foreground/80 font-mono leading-relaxed">
                          {step.exampleText}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Action Button */}
              <div className="shrink-0 sm:self-center pl-8 sm:pl-0">
                {step.isComplete ? (
                  <span className="text-xs font-semibold text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    Done
                  </span>
                ) : (
                  <Button asChild size="sm" variant="outline" className="gap-1 font-semibold text-xs">
                    <Link href={step.href}>
                      <span>{step.actionText}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

