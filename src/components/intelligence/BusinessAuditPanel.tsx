"use client";

import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { AuditFinding, BusinessAuditResult, BISeverity } from "@/lib/business-intelligence/types";
import {
 AlertTriangle,
 AlertCircle,
 Info,
 CheckCircle2,
 ShieldCheck,
 ArrowRight,
 Lightbulb,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/components/shared/utils";

// ─── Severity config ──────────────────────────────────────────────────────────

const severityConfig: Record<
 BISeverity,
 {
 label: string;
 icon: React.ComponentType<any>;
 badge: string;
 leftBorder: string;
 bg: string;
 dot: string;
 }
> = {
 critical: {
 label: "Critical",
 icon: AlertCircle,
 badge: "bg-rose-500/10 text-rose-500 border-rose-500/20",
 leftBorder: "border-l-rose-500",
 bg: "bg-rose-500/[0.04] hover:bg-rose-500/[0.07]",
 dot: "bg-rose-500",
 },
 warning: {
 label: "Warning",
 icon: AlertTriangle,
 badge: "bg-amber-500/10 text-amber-500 border-amber-500/20",
 leftBorder: "border-l-amber-500",
 bg: "bg-amber-500/[0.04] hover:bg-amber-500/[0.07]",
 dot: "bg-amber-500",
 },
 opportunity: {
 label: "Opportunity",
 icon: Lightbulb,
 badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
 leftBorder: "border-l-emerald-500",
 bg: "bg-emerald-500/[0.04] hover:bg-emerald-500/[0.07]",
 dot: "bg-emerald-500",
 },
 info: {
 label: "Info",
 icon: Info,
 badge: "bg-blue-500/10 text-blue-500 border-blue-500/20",
 leftBorder: "border-l-blue-500",
 bg: "bg-blue-500/[0.04] hover:bg-blue-500/[0.07]",
 dot: "bg-blue-500",
 },
};

function FindingRow({ finding }: { finding: AuditFinding }) {
 const cfg = severityConfig[finding.severity];
 const Icon = cfg.icon;

 return (
 <div
 className={cn(
 "group rounded-xl border-l pl-4 pr-3 py-3.5 transition-colors duration-150",
 cfg.leftBorder,
 cfg.bg,
 "border-l-[2px] border-border/40"
 )}
 >
 <div className="flex items-start justify-between gap-2 mb-1.5">
 <div className="flex items-center gap-2 flex-wrap">
 <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", cfg.badge)}>
 <Icon className="h-3 w-3" />
 {cfg.label}
 </span>
 <span className="text-[10px] font-semibold text-muted-foreground/60 bg-muted/80 px-2 py-0.5 rounded-full">
 {finding.area}
 </span>
 </div>
 <Button asChild variant="ghost" size="xs" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
 <Link href={finding.actionHref}>
 {finding.actionText} <ArrowRight className="h-3 w-3" />
 </Link>
 </Button>
 </div>

 <p className="text-[13px] font-semibold text-foreground leading-snug mb-1">
 {finding.title}
 </p>
 <p className="text-[11px] text-muted-foreground/70 leading-relaxed mb-1.5">
 {finding.description}
 </p>
 <p className="text-[11px] text-muted-foreground/55 italic flex items-center gap-1">
 <Lightbulb className="h-3 w-3 text-amber-400 shrink-0" />
 {finding.recommendation}
 </p>
 </div>
 );
}

// ─── Score Arc ────────────────────────────────────────────────────────────────

function ScoreArc({ score }: { score: number }) {
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
 <span className="text-[9px] text-muted-foreground/60 font-semibold uppercase tracking-wide mt-0.5">
 Score
 </span>
 </div>
 );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface BusinessAuditPanelProps {
 audit: BusinessAuditResult;
}

export function BusinessAuditPanel({ audit }: BusinessAuditPanelProps) {
 const totalFindings =
 audit.findingsCount.critical + audit.findingsCount.warning + audit.findingsCount.info;

 return (
 <Card className="h-full flex flex-col overflow-hidden border-[hsl(var(--foreground)/0.07)]">
 {/* Header */}
 <div className="flex items-start gap-4 p-5 pb-4 border-b border-border/50">
 <ScoreArc score={audit.overallScore} />
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1">
 <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
 <ShieldCheck className="h-3.5 w-3.5 text-primary" />
 </div>
 <h2 className="text-[13px] font-bold text-foreground">AI Business Audit</h2>
 </div>
 <p className="text-[11px] text-muted-foreground/70 leading-snug line-clamp-2 mb-2">
 {audit.summary}
 </p>
 <div className="flex flex-wrap gap-2">
 {audit.findingsCount.critical > 0 && (
 <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border-rose-500/20">
 <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
 {audit.findingsCount.critical} Critical
 </span>
 )}
 {audit.findingsCount.warning > 0 && (
 <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border-amber-500/20">
 <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
 {audit.findingsCount.warning} Warning
 </span>
 )}
 {audit.findingsCount.info > 0 && (
 <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border-blue-500/20">
 <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
 {audit.findingsCount.info} Info
 </span>
 )}
 {totalFindings === 0 && (
 <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
 <CheckCircle2 className="h-3 w-3" /> All Clear
 </span>
 )}
 </div>
 </div>
 </div>

 {/* Findings */}
 <div className="flex-1 overflow-auto p-4 space-y-2.5">
 {audit.findings.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
 <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
 <CheckCircle2 className="h-7 w-7 text-emerald-500" />
 </div>
 <p className="font-semibold text-foreground text-sm">All Clear</p>
 <p className="text-xs mt-1">Your business configuration has no critical issues.</p>
          </div>
        ) : (
          audit.findings.map((f) => <FindingRow key={f.id} finding={f} />)
        )}
      </div>
    </Card>
  );
}
