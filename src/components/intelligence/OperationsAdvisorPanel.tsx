"use client";

import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { OperationsAdvisorResult, OperationsBottleneck } from "@/lib/business-intelligence/types";
import {
  Workflow,
  AlertTriangle,
  AlertCircle,
  Info,
  Zap,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/components/shared/utils";

function BottleneckRow({ b }: { b: OperationsBottleneck }) {
  const Icon =
    b.severity === "critical" ? AlertCircle : b.severity === "warning" ? AlertTriangle : Info;
  const colorClass =
    b.severity === "critical"
      ? "text-rose-500 bg-rose-500/10 border-rose-500/20"
      : b.severity === "warning"
      ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
      : "text-blue-500 bg-blue-500/10 border-blue-500/20";
  const cardBg =
    b.severity === "critical"
      ? "bg-rose-500/[0.04] border-rose-500/15 hover:bg-rose-500/[0.07]"
      : b.severity === "warning"
      ? "bg-amber-500/[0.04] border-amber-500/15 hover:bg-amber-500/[0.07]"
      : "bg-blue-500/[0.04] border-blue-500/15 hover:bg-blue-500/[0.07]";

  return (
    <div className={cn("group rounded-xl border p-3.5 space-y-2 transition-colors", cardBg)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border", colorClass)}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-foreground leading-snug">{b.area}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {b.automationAvailable && (
            <span className="inline-flex items-center gap-1 text-caption font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
              <Zap className="h-2.5 w-2.5" />
              Automatable
            </span>
          )}
        </div>
      </div>
      <p className="text-caption text-muted-foreground/70 leading-relaxed">{b.description}</p>
      <div className="flex items-center justify-between">
        <p className="text-caption text-muted-foreground/50 italic">→ {b.suggestedFix}</p>
        <Button asChild variant="ghost" size="xs" className="shrink-0">
          <Link href={b.actionHref}>
            Resolve <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function ScoreArc({ score, label }: { score: number; label: string }) {
  const color =
    score >= 70 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-rose-500";
  const ring =
    score >= 70
      ? "ring-emerald-500/20"
      : score >= 50
      ? "ring-amber-500/20"
      : "ring-rose-500/20";
  return (
    <div className={cn("flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-muted/40 ring-2 shrink-0", ring)}>
      <span className={cn("text-2xl font-bold tabular-nums leading-none", color)}>{score}</span>
      <span className="text-caption text-muted-foreground/60 font-semibold uppercase tracking-wide mt-0.5">
        {label}
      </span>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  label,
  color = "text-primary bg-primary/10",
}: {
  icon: React.ComponentType<any>;
  label: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2 pb-1">
      <div className={cn("h-5 w-5 rounded-md flex items-center justify-center", color)}>
        <Icon className="h-3 w-3" />
      </div>
      <span className="text-caption font-bold uppercase tracking-widest text-muted-foreground/60">
        {label}
      </span>
    </div>
  );
}

interface OperationsAdvisorPanelProps {
  operations: OperationsAdvisorResult;
}

export function OperationsAdvisorPanel({ operations }: OperationsAdvisorPanelProps) {
  const topAutomations = operations.automationOpportunities.slice(0, 3);
  const topBenchmark = operations.benchmarkGaps.slice(0, 3);

  return (
    <Card className="h-full flex flex-col overflow-hidden border border-[hsl(var(--foreground)/0.07)]">
      {/* Header */}
      <div className="flex items-start gap-4 p-5 pb-4 border-b border-border/50">
        <ScoreArc score={operations.workflowScore} label="Workflow" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <Workflow className="h-3.5 w-3.5 text-primary" />
            </div>
            <h2 className="text-[13px] font-bold text-foreground">Operations Advisor</h2>
          </div>
          <p className="text-caption text-muted-foreground/65 leading-snug">
            Workflow bottlenecks, automation gaps, and industry benchmarks
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Bottlenecks */}
        {operations.bottlenecks.length > 0 && (
          <section className="space-y-2">
            <SectionHeading icon={AlertTriangle} label="Bottlenecks" color="text-amber-500 bg-amber-500/10" />
            {operations.bottlenecks.map((b) => (
              <BottleneckRow key={b.id} b={b} />
            ))}
          </section>
        )}

        {/* Automations */}
        {topAutomations.length > 0 && (
          <section className="space-y-2">
            <SectionHeading icon={Zap} label="Quick Automations" color="text-primary bg-primary/10" />
            {topAutomations.map((a) => (
              <div
                key={a.id}
                className="group rounded-xl border border-border/50 bg-muted/20 p-3.5 flex items-start justify-between gap-3 hover:bg-muted/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground leading-snug">{a.title}</p>
                  <p className="text-caption text-muted-foreground/65 mt-0.5 leading-snug line-clamp-2">
                    {a.description}
                  </p>
                </div>
                <Button asChild variant="soft" size="xs" className="shrink-0">
                  <Link href={a.primaryCtaHref}>
                    {a.primaryCtaText} <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            ))}
          </section>
        )}

        {/* Benchmark Gaps */}
        {topBenchmark.length > 0 && (
          <section className="space-y-2">
            <SectionHeading icon={TrendingUp} label="Industry Benchmark Gaps" color="text-violet-500 bg-violet-500/10" />
            {topBenchmark.map((g) => (
              <div
                key={g.id}
                className="group rounded-xl border border-border/50 bg-muted/20 p-3.5 flex items-start justify-between gap-3 hover:bg-muted/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground leading-snug">{g.title}</p>
                  <p className="text-caption text-muted-foreground/65 mt-0.5 leading-snug line-clamp-2">
                    {g.description}
                  </p>
                </div>
                <Button asChild variant="ghost" size="xs" className="shrink-0">
                  <Link href={g.primaryCtaHref}>
                    {g.primaryCtaText} <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            ))}
          </section>
        )}

        {operations.bottlenecks.length === 0 && topAutomations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <p className="font-semibold text-foreground text-sm">Operations Running Smoothly</p>
            <p className="text-xs mt-1">No critical bottlenecks detected.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
