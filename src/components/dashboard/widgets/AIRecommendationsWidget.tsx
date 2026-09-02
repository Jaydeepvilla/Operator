"use client";

import { m } from "framer-motion";
import { hoverScale } from "@/components/motion/hover";

import { RecommendationAction } from "@/lib/recommendation-engine/types";
import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { Sparkles, ArrowRight, Zap, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface AIRecommendationsWidgetProps {
 recommendations: RecommendationAction[];
}

export function AIRecommendationsWidget({ recommendations }: AIRecommendationsWidgetProps) {
 if (recommendations.length === 0) {
 return (
 <m.div whileHover={hoverScale}>
<Card className="h-full p-space-5 flex flex-col items-center justify-center text-center gap-space-3 border border-[hsl(var(--foreground)/0.07)]">
 <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
 <CheckCircle2 className="w-6 h-6 text-emerald-500" />
 </div>
 <div>
 <p className="text-body-sm font-bold text-foreground">All Caught Up!</p>
 <p className="text-[11px] text-muted-foreground/60 mt-1 leading-relaxed">
 Your AI has no active optimization recommendations.
 </p>
 </div>
 </Card>
</m.div>
 );
 }

 return (
 <m.div whileHover={hoverScale}>
<Card
 className="h-full flex flex-col overflow-hidden border border-primary/20 relative"
 style={{
 /* Light mesh: layered radial + conic gradient for that premium AI feel */
 background: [
 /* primary glow — top-left origin */
 "radial-gradient(ellipse 80% 60% at 0% 0%, hsl(262 80% 60% / 0.10) 0px, transparent 60%)",
 /* accent glow — bottom-right */
 "radial-gradient(ellipse 70% 50% at 100% 100%, hsl(220 80% 65% / 0.08) 0px, transparent 55%)",
 /* faint violet centre bloom */
 "radial-gradient(ellipse 50% 40% at 50% 50%, hsl(270 60% 70% / 0.04) 0px, transparent 70%)",
 ].join(", "),
 }}
 >
 {/* Mesh noise overlay — very faint to add texture without noise */}
 <div
 className="pointer-events-none absolute inset-0 opacity-[0.025] "
 style={{
 backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
 backgroundRepeat: "repeat",
 backgroundSize: "128px 128px",
 }}
 />

 <div className="relative p-space-5 flex flex-col gap-space-4 flex-1 z-10">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-space-2">
 <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 ring-1 ring-primary/20">
 <Sparkles className="w-3.5 h-3.5 text-primary" />
 </div>
 <p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest">
 AI Recommendations
 </p>
 </div>
 <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25">
 Proactive
 </span>
 </div>

 {/* List of recommendations */}
 <div className="space-y-space-3 flex-1">
 {recommendations.slice(0, 3).map((rec, idx) => {
 const isAuto =
 rec.id.includes("auto") ||
 rec.title.toLowerCase().includes("generate") ||
 rec.title.toLowerCase().includes("suggest");
 const impactColor =
 rec.impact === "High"
 ? "bg-[hsl(var(--state-success-bg))] text-[hsl(var(--state-success-text))] border-[hsl(var(--state-success-border))]"
 : rec.impact === "Medium"
 ? "bg-[hsl(var(--state-warning-bg))] text-[hsl(var(--state-warning-text))] border-[hsl(var(--state-warning-border))]"
 : "bg-muted text-muted-foreground border-border-subtle";
 return (
 <div
 key={rec.id}
 className="flex flex-col sm:flex-row sm:items-start gap-space-3 p-space-3 rounded-xl border border-[hsl(var(--foreground)/0.07)] bg-background/80 backdrop-blur-sm hover:border-primary/20 hover:bg-background/80 transition-all duration-200"
 >
 {/* Numbered badge */}
 <span className="hidden sm:flex h-5 w-5 shrink-0 rounded-full bg-primary/10 text-primary text-[10px] font-bold items-center justify-center mt-0.5 ring-1 ring-primary/15">
 {idx + 1}
 </span>

 <div className="flex-1 min-w-0 space-y-space-1.5">
 <div className="flex items-center gap-space-2 flex-wrap">
 <h4 className="text-body-sm font-semibold text-foreground leading-snug">
 {rec.title}
 </h4>
 {isAuto && (
 <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/20">
 <Zap className="w-2.5 h-2.5" /> AI
 </span>
 )}
 </div>
 <p className="text-[11px] text-muted-foreground/65 leading-relaxed line-clamp-2">
 {rec.description}
 </p>
 <div className="flex items-center gap-space-2 pt-space-0.5">
 <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
 <Clock className="w-3 h-3" />{rec.estimatedTimeMinutes} min
 </span>
 <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${impactColor}`}>
 {rec.impact} Impact
 </span>
 </div>
 </div>

 {/* ✅ Design-system Button: soft variant + pill shape + sm size */}
 <Button
 asChild
 variant="soft"
 size="sm"
 shape="default"
 className="shrink-0 self-start"
 >
 <Link href={rec.primaryCtaHref}>
 {rec.primaryCtaText}
 <ArrowRight className="w-3 h-3" />
 </Link>
 </Button>
 </div>
 );
 })}
 </div>
 </div>
 </Card>
</m.div>
 );
}
