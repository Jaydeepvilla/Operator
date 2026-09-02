"use client";

import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { CustomerExperienceResult, CXFrictionPoint } from "@/lib/business-intelligence/types";
import {
 HeartHandshake,
 ArrowRight,
 AlertCircle,
 AlertTriangle,
 Lightbulb,
 CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/components/shared/utils";

const areaLabel: Record<CXFrictionPoint["area"], string> = {
 booking: "Booking",
 communication: "Communication",
 reminders: "Reminders",
 follow_up: "Follow-Up",
 faq: "Knowledge Base",
 policies: "Policies",
 ai_quality: "AI Quality",
};

const areaColor: Record<CXFrictionPoint["area"], string> = {
 booking: "bg-violet-500/10 text-violet-500",
 communication: "bg-blue-500/10 text-blue-500",
 reminders: "bg-amber-500/10 text-amber-500",
 follow_up: "bg-emerald-500/10 text-emerald-500",
 faq: "bg-orange-500/10 text-orange-500",
 policies: "bg-slate-500/10 text-slate-500",
 ai_quality: "bg-primary/10 text-primary",
};

function FrictionRow({ point }: { point: CXFrictionPoint }) {
 const SevIcon =
 point.severity === "critical"
 ? AlertCircle
 : point.severity === "warning"
 ? AlertTriangle
 : Lightbulb;

 const sevColor =
 point.severity === "critical"
 ? "text-rose-500 bg-rose-500/10 border-rose-500/20"
 : point.severity === "warning"
 ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
 : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";

 const leftBorder =
 point.severity === "critical"
 ? "border-l-rose-500"
 : point.severity === "warning"
 ? "border-l-amber-500"
 : "border-l-emerald-500";

 const cardBg =
 point.severity === "critical"
 ? "bg-rose-500/[0.03] hover:bg-rose-500/[0.06]"
 : point.severity === "warning"
 ? "bg-amber-500/[0.03] hover:bg-amber-500/[0.06]"
 : "bg-muted/20 hover:bg-muted/40";

 return (
 <div
 className={cn(
 "group rounded-xl border-l pl-4 pr-3.5 py-3.5 space-y-2 border-border/40 transition-colors",
 leftBorder,
 cardBg
 )}
 >
 <div className="flex items-start justify-between gap-2">
 <div className="flex items-center gap-2">
 <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center shrink-0 border", sevColor)}>
 <SevIcon className="h-3 w-3" />
 </div>
 <p className="text-[13px] font-semibold text-foreground leading-snug">{point.title}</p>
 </div>
 <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", areaColor[point.area])}>
 {areaLabel[point.area]}
 </span>
 </div>

 <p className="text-[11px] text-muted-foreground/70 leading-relaxed pl-8">
 {point.description}
 </p>

 <div className="flex items-center justify-between pl-8">
 <p className="text-[11px] text-muted-foreground/50 italic flex items-center gap-1 truncate mr-2">
 <Lightbulb className="h-3 w-3 text-amber-400 shrink-0" />
 {point.suggestedFix}
 </p>
 <Button asChild variant="ghost" size="xs" className="shrink-0">
 <Link href={point.actionHref}>
 {point.actionText} <ArrowRight className="h-3 w-3" />
 </Link>
 </Button>
 </div>
 </div>
 );
}

interface CustomerExperiencePanelProps {
 customerExperience: CustomerExperienceResult;
}

export function CustomerExperiencePanel({ customerExperience: cx }: CustomerExperiencePanelProps) {
 const score = cx.cxScore;
 const scoreColor =
 score >= 70 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-rose-500";
 const ring =
 score >= 70 ? "ring-emerald-500/20" : score >= 50 ? "ring-amber-500/20" : "ring-rose-500/20";

 return (
 <Card className="h-full flex flex-col overflow-hidden border-[hsl(var(--foreground)/0.07)]">
 {/* Header */}
 <div className="flex items-start gap-4 p-5 pb-4 border-b border-border/50">
 <div className={cn("flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-muted/40 ring-2 shrink-0", ring)}>
 <span className={cn("text-2xl font-bold tabular-nums leading-none", scoreColor)}>{score}</span>
 <span className="text-[9px] text-muted-foreground/60 font-semibold uppercase tracking-wide mt-0.5">
 CX
 </span>
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1">
 <div className="h-6 w-6 rounded-lg bg-rose-500/10 flex items-center justify-center">
 <HeartHandshake className="h-3.5 w-3.5 text-rose-500" />
 </div>
 <h2 className="text-[13px] font-bold text-foreground">Customer Experience</h2>
 </div>
 <p className="text-[11px] text-muted-foreground/65 leading-snug">
 Friction points degrading the customer journey
 {cx.frictionPoints.length > 0 && cx.weakestArea && (
 <>
 {" · "}Weakest:{" "}
 <span className="text-foreground font-semibold">{cx.weakestArea}</span>
 </>
 )}
 </p>
 </div>
 </div>

 {/* List */}
 <div className="flex-1 overflow-auto p-4 space-y-2.5">
 {cx.frictionPoints.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
 <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
 <CheckCircle2 className="h-7 w-7 text-emerald-500" />
 </div>
 <p className="font-semibold text-foreground text-sm">Excellent Customer Experience</p>
 <p className="text-xs mt-1">No friction points detected across your customer journey.</p>
          </div>
        ) : (
          cx.frictionPoints.map((p) => <FrictionRow key={p.id} point={p} />)
        )}
      </div>
    </Card>
  );
}
