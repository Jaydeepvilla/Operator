"use client";

import * as React from "react";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Play, 
  RotateCw, 
  Pencil, 
  Sparkles, 
  ShieldCheck, 
  Calendar, 
  DollarSign, 
  Loader2,
  Bot,
  User
} from "lucide-react";
import { VerificationScenario, ScenarioEvaluationResult } from "@/server/services/verification/types";
import { cn } from "@/components/shared/utils";

interface ScenarioCardProps {
  scenario: VerificationScenario;
  onRun: (scenarioId: string) => Promise<void>;
  isRunning: boolean;
  onEditService?: (serviceId: string, currentPrice: string, currentName: string) => void;
}

export function ScenarioCard({
  scenario,
  onRun,
  isRunning,
  onEditService,
}: ScenarioCardProps) {
  const result = scenario.lastResult;
  const status = result?.status || "pending";

  const getIcon = () => {
    switch (scenario.type) {
      case "pricing_hours":
        return <DollarSign className="h-4 w-4" />;
      case "booking_availability":
        return <Calendar className="h-4 w-4" />;
      case "safety_boundary":
        return <ShieldCheck className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const getStatusBadge = () => {
    if (isRunning) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary animate-pulse">
          <Loader2 className="h-3 w-3 animate-spin" />
          Running Simulation…
        </span>
      );
    }
    switch (status) {
      case "passed":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shadow-sm">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Verified (Passed)
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-[11px] font-bold text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            Needs Attention
          </span>
        );
      case "stale":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            <Clock className="h-3.5 w-3.5" />
            Stale · Re-test
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            Ready to Test
          </span>
        );
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-space-5 transition-all duration-300 shadow-sm space-y-space-4",
        status === "passed"
          ? "border-emerald-500/30 bg-gradient-to-b from-emerald-500/[0.04] to-card"
          : status === "failed"
          ? "border-destructive/30 bg-destructive/[0.03]"
          : "border-border/80 bg-card hover:border-primary/40 hover:shadow-md"
      )}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-space-2">
        <div className="flex items-center gap-space-3">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl transition-colors shadow-sm",
              status === "passed"
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20"
                : "bg-primary/10 text-primary ring-1 ring-primary/20"
            )}
          >
            {getIcon()}
          </div>
          <div>
            <h4 className="text-[14px] font-bold text-foreground tracking-tight">{scenario.title}</h4>
            <p className="text-[12px] text-muted-foreground">{scenario.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-space-2.5">
          {getStatusBadge()}
          <button
            onClick={() => onRun(scenario.id)}
            disabled={isRunning}
            className={cn(
              "flex items-center gap-space-1.5 rounded-xl px-space-3.5 py-space-1.5 text-[11px] font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50",
              status === "passed"
                ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
            )}
          >
            {isRunning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : status === "passed" ? (
              <>
                <RotateCw className="h-3.5 w-3.5" />
                <span>Re-test</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Run Test</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Simulated Interaction Dialogue */}
      <div className="space-y-space-2.5 rounded-xl border border-border/70 bg-muted/40 backdrop-blur-sm p-space-3.5 text-[12px]">
        {/* User Prompt */}
        <div className="flex items-start gap-space-2.5">
          <span className="flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary shrink-0 uppercase tracking-wider">
            <User className="h-2.5 w-2.5" />
            Customer
          </span>
          <p className="font-medium text-foreground italic leading-relaxed">"{scenario.simulatedUserInput}"</p>
        </div>

        {/* AI Output (if executed) */}
        {result?.actualOutput && (
          <div className="flex items-start gap-space-2.5 pt-space-2 border-t border-border/50">
            <span className="flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0 uppercase tracking-wider">
              <Bot className="h-2.5 w-2.5" />
              Operator
            </span>
            <p className="text-foreground leading-relaxed font-normal">{result.actualOutput}</p>
          </div>
        )}
      </div>

      {/* Evidence & Action Bar */}
      {result && (
        <div className="flex flex-wrap items-center justify-between gap-space-2 rounded-xl border border-border/80 bg-background/95 px-space-3.5 py-space-2 text-[11px] shadow-sm">
          <div className="flex items-center gap-space-2 text-muted-foreground">
            <span className="font-bold text-foreground">Verified Evidence:</span>
            <span className="text-foreground/80">{result.humanEvidence}</span>
            {result.latencyMs > 0 && (
              <span className="text-[10px] text-muted-foreground/60">({result.latencyMs}ms)</span>
            )}
          </div>

          {/* Quick-edit hook for pricing scenarios */}
          {scenario.type === "pricing_hours" && onEditService && scenario.entityId && (
            <button
              onClick={() =>
                onEditService(
                  scenario.entityId!,
                  scenario.entityMetadata?.price || "75.00",
                  scenario.entityMetadata?.serviceName || "Service"
                )
              }
              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline ml-auto"
            >
              <Pencil className="h-3 w-3" />
              <span>Edit Menu Price</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
