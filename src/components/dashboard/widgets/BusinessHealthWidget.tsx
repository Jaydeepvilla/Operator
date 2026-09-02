"use client";

import { m } from "framer-motion";
import { hoverScale } from "@/components/motion/hover";
import { useState } from "react";
import { OverallHealthResult } from "@/lib/health-engine/overall";
import { HealthScoreResult } from "@/lib/health-engine/types";
import { ScoreRing } from "../shared/score-ring";
import { MetricBar } from "../shared/metric-bar";
import { Card } from "@/components/shared/card";
import { NativeButton } from "@/components/shared/native";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/components/shared/utils";
import { APP_ROUTES } from "@/lib/constants/routes";

interface BusinessHealthWidgetProps {
  health: OverallHealthResult;
}

const MODULE_META: Record<string, { label: string; href: string }> = {
  booking:   { label: "Booking",   href: APP_ROUTES.services },
  knowledge: { label: "Knowledge", href: APP_ROUTES.kb },
  channels:  { label: "Channels",  href: APP_ROUTES.channels },
  staff:     { label: "Staff",     href: APP_ROUTES.staff },
  billing:   { label: "Billing",   href: APP_ROUTES.billing },
};

function ModuleRow({ name, result }: { name: string; result: HealthScoreResult }) {
  const meta = MODULE_META[name] ?? { label: name, href: APP_ROUTES.settings };
  const missing = result.missingRequirements?.length ?? 0;

  return (
    <Link
      href={meta.href}
      className="flex items-center justify-between py-space-2 px-space-3 rounded-lg hover:bg-[hsl(var(--foreground)/0.04)] transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-space-2">
          <span className="text-body-sm font-medium text-foreground">{meta.label}</span>
          {missing > 0 && (
            <span className="text-[10px] font-bold text-[hsl(var(--state-warning-text))] bg-[hsl(var(--state-warning-bg))] border border-[hsl(var(--state-warning-border))] px-1.5 py-0.5 rounded-full">
              {missing} missing
            </span>
          )}
        </div>
        {result.whyLow && (
          <p className="text-[11px] text-muted-foreground/55 mt-0.5 truncate">{result.whyLow}</p>
        )}
      </div>
      <div className="flex items-center gap-space-2 shrink-0">
        <span className={cn("text-body-sm font-bold tabular-nums", ScoreRing.textClass(result.score))}>
          {result.score}%
        </span>
        <ArrowUpRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors" />
      </div>
    </Link>
  );
}

export function BusinessHealthWidget({ health }: BusinessHealthWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const { overallScore, overallStatus, modules } = health;

  const totalMissing = Object.values(modules).reduce(
    (sum, m) => sum + (m.missingRequirements?.length ?? 0),
    0
  );

  const formulaText = "Knowledge (25%) + Booking (25%) + Channels (20%) + Staff (20%) + Billing (10%)";

  return (
    <m.div whileHover={hoverScale}>
      <Card className="h-full flex flex-col overflow-hidden border border-[hsl(var(--foreground)/0.07)]">
        <div className="relative p-space-5 flex flex-col gap-space-4 flex-1 z-10">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-2">
              <div className={cn(
                "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                overallStatus === "Calibrating" ? "bg-primary/10" :
                overallScore >= 90 ? "bg-emerald-500/10" :
                overallScore >= 70 ? "bg-amber-500/10" : "bg-rose-500/10"
              )}>
                <Activity className={cn(
                  "w-3.5 h-3.5",
                  overallStatus === "Calibrating" ? "text-primary" : ScoreRing.textClass(overallScore)
                )} />
              </div>
              <p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                Business Health
              </p>
            </div>
            <Link
              href={APP_ROUTES.health}
              className="flex items-center justify-center h-6 w-6 rounded-lg hover:bg-[hsl(var(--foreground)/0.06)] transition-colors"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-foreground transition-colors" />
            </Link>
          </div>

          {/* Score + Status */}
          <div className="flex items-center gap-space-4">
            <div className="shrink-0">
              <ScoreRing
                score={overallScore}
                size={72}
                color={overallStatus === "Calibrating" ? "var(--primary-500)" : undefined}
              />
            </div>
            <div className="flex-1 min-w-0 space-y-space-1.5">
              <span className={cn(
                "text-body-sm font-bold block leading-snug",
                overallStatus === "Calibrating" ? "text-primary" : ScoreRing.textClass(overallScore)
              )}>
                {overallStatus}
              </span>
              <p className="text-[10px] text-muted-foreground/50 leading-relaxed">{formulaText}</p>
              {totalMissing > 0 && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[hsl(var(--state-warning-border))] bg-[hsl(var(--state-warning-bg))] text-[10px] font-bold text-[hsl(var(--state-warning-text))]">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  {totalMissing} missing requirement{totalMissing !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>

          {/* Module sub-metrics with progress bars */}
          <div className="space-y-space-3 pt-space-1 border-t border-[hsl(var(--foreground)/0.05)]">
            {Object.entries(modules)
              .sort(([, a], [, b]) => a.score - b.score)
              .slice(0, expanded ? undefined : 3)
              .map(([name, result]) => (
                <MetricBar
                  key={name}
                  label={MODULE_META[name]?.label ?? name}
                  value={result.score}
                  showDot
                />
              ))}
          </div>

          {/* Expand/Collapse */}
          {Object.keys(modules).length > 3 && (
            <NativeButton
              onClick={() => setExpanded(!expanded)}
              className="flex items-center justify-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors pt-space-1"
            >
              {expanded ? (
                <>Show less <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>Show all modules <ChevronDown className="w-3 h-3" /></>
              )}
            </NativeButton>
          )}
        </div>

        {/* Expanded module detail rows */}
        {expanded && (
          <div className="border-t border-[hsl(var(--foreground)/0.06)] px-space-3 py-space-2 space-y-space-0.5 bg-[hsl(var(--foreground)/0.02)]">
            {Object.entries(modules)
              .sort(([, a], [, b]) => a.score - b.score)
              .map(([name, result]) => (
                <ModuleRow key={name} name={name} result={result} />
              ))}
          </div>
        )}
      </Card>
    </m.div>
  );
}
