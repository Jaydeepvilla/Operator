"use client";

import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { RevenueEngineResult, RevenueOpportunity } from "@/lib/business-intelligence/types";
import {
  DollarSign,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/components/shared/utils";

const typeLabel: Record<RevenueOpportunity["type"], string> = {
  pricing: "Pricing",
  upsell: "Upsell",
  follow_up: "Follow-Up",
  membership: "Membership",
  booking_flow: "Booking",
  automation: "Automation",
};

const typeColor: Record<RevenueOpportunity["type"], string> = {
  pricing: "bg-violet-500/10 text-violet-500",
  upsell: "bg-emerald-500/10 text-emerald-500",
  follow_up: "bg-blue-500/10 text-blue-500",
  membership: "bg-purple-500/10 text-purple-500",
  booking_flow: "bg-amber-500/10 text-amber-500",
  automation: "bg-primary/10 text-primary",
};

function OpportunityRow({ opp }: { opp: RevenueOpportunity }) {
  const SevIcon =
    opp.severity === "critical"
      ? AlertCircle
      : opp.severity === "warning"
      ? AlertTriangle
      : Lightbulb;
  const sevColor =
    opp.severity === "critical"
      ? "text-rose-500 bg-rose-500/10 border-rose-500/20"
      : opp.severity === "warning"
      ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
      : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  const cardBg =
    opp.severity === "critical"
      ? "bg-rose-500/[0.03] hover:bg-rose-500/[0.06] border-rose-500/10"
      : opp.severity === "warning"
      ? "bg-amber-500/[0.03] hover:bg-amber-500/[0.06] border-amber-500/10"
      : "bg-muted/20 hover:bg-muted/40 border-border/50";

  return (
    <div
      className={cn(
        "group rounded-xl border p-3.5 space-y-2 transition-colors duration-150",
        cardBg
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border", sevColor)}>
            <SevIcon className="h-3.5 w-3.5" />
          </div>
          <p className="text-[13px] font-semibold text-foreground leading-snug">{opp.title}</p>
        </div>
        <span className={cn("text-caption font-bold px-2 py-0.5 rounded-full shrink-0", typeColor[opp.type])}>
          {typeLabel[opp.type]}
        </span>
      </div>

      <p className="text-caption text-muted-foreground/70 leading-relaxed pl-9">
        {opp.description}
      </p>

      <div className="flex items-center justify-between pl-9">
        <p className="text-caption text-muted-foreground/50 italic flex items-center gap-1 truncate mr-2">
          <TrendingUp className="h-3 w-3 text-emerald-500 shrink-0" />
          {opp.businessImpact}
        </p>
        <Button asChild variant="ghost" size="xs" className="shrink-0">
          <Link href={opp.actionHref}>
            {opp.actionText} <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

interface RevenueOpportunitiesPanelProps {
  revenue: RevenueEngineResult;
}

export function RevenueOpportunitiesPanel({ revenue }: RevenueOpportunitiesPanelProps) {
  const score = revenue.revenueReadinessScore;
  const scoreColor =
    score >= 70 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-rose-500";
  const ring =
    score >= 70 ? "ring-emerald-500/20" : score >= 50 ? "ring-amber-500/20" : "ring-rose-500/20";

  return (
    <Card className="h-full flex flex-col overflow-hidden border border-[hsl(var(--foreground)/0.07)]">
      {/* Header */}
      <div className="flex items-start gap-4 p-5 pb-4 border-b border-border/50">
        <div className={cn("flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-muted/40 ring-2 shrink-0", ring)}>
          <span className={cn("text-2xl font-bold tabular-nums leading-none", scoreColor)}>{score}</span>
          <span className="text-caption text-muted-foreground/60 font-semibold uppercase tracking-wide mt-0.5">
            Ready
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <h2 className="text-[13px] font-bold text-foreground">Revenue Optimization</h2>
          </div>
          <p className="text-caption text-muted-foreground/65 leading-snug">
            Gaps that are limiting your earning potential
          </p>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto p-4 space-y-2.5">
        {revenue.opportunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <p className="font-semibold text-foreground text-sm">Revenue Channels Optimized</p>
            <p className="text-xs mt-1">No major revenue gaps detected.</p>
          </div>
        ) : (
          revenue.opportunities.map((opp) => <OpportunityRow key={opp.id} opp={opp} />)
        )}
      </div>
    </Card>
  );
}
