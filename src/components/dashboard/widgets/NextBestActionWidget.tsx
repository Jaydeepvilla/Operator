import { m } from "framer-motion";
import { hoverScale } from "@/components/motion/hover";
import { Button } from "@/components/shared/button";
import { RecommendationAction } from "@/lib/recommendation-engine/types";
import { ArrowRight, Zap, Clock, CheckCircle2, TrendingUp, Target } from "lucide-react";
import Link from "next/link";
import { APP_ROUTES } from "@/lib/constants/routes";

interface NextBestActionWidgetProps {
 action: RecommendationAction | null;
}

export function NextBestActionWidget({ action }: NextBestActionWidgetProps) {
 if (!action) {
 return (
 <div className="os-card radius-lg p-space-8 flex flex-col items-center justify-center text-center gap-space-4 h-full min-h-48">
 <div className="w-space-12 h-space-12 radius-lg bg-success-50 flex items-center justify-center">
 <CheckCircle2 className="w-space-6 h-space-6 text-success-500" />
 </div>
 <div>
 <p className="text-title-md text-foreground">You&apos;re all caught up</p>
 <p className="text-body-sm text-neutral-500 mt-space-1">No pending actions right now.</p>
 </div>
 </div>
 );
 }

 const isHigh = action.impact === "High";
 // Simulated rich metrics based on impact
 const expectedUplift = isHigh ? "+12%" : "+5%";
 const confidence = isHigh ? "94%" : "82%";

 return (
 <div className="os-card radius-lg overflow-hidden h-full flex flex-col group">
 <div className="section-divider opacity-50" />

 <div className="flex flex-col flex-1 p-space-6 gap-space-5">
 {/* Label row */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-space-2">
 <div className="w-space-7 h-space-7 radius-lg bg-info-50 flex items-center justify-center relative overflow-hidden">
 <div className="absolute inset-0 bg-info-100 animate-pulse-soft opacity-50" />
 <Zap className="w-space-3.5 h-space-3.5 text-info-600 relative z-10" />
 </div>
 <span className="text-caption font-semibold text-info-600 uppercase tracking-widest">
 Priority Action
 </span>
 </div>
 <span
 className={`text-caption font-semibold px-space-2.5 py-space-1 radius-full ${
 isHigh
 ? "bg-error-50 text-error-600"
 : "bg-warning-50 text-warning-600"
 }`}
 >
 {action.impact} Impact
 </span>
 </div>

 {/* Content */}
 <div className="flex-1 space-y-space-2">
 <h3 className="text-title-lg text-foreground group-hover:text-primary transition-colors duration-300">{action.title}</h3>
 <p className="text-body-sm text-neutral-500 leading-relaxed">{action.description}</p>
 </div>

 {/* Rich Metrics Grid */}
 <div className="grid grid-cols-2 gap-space-3 py-space-4 border-y border-border-subtle">
 <div className="space-y-space-1">
 <div className="flex items-center gap-space-1.5 text-neutral-500">
 <TrendingUp className="w-space-3.5 h-space-3.5 text-success-500" />
 <span className="text-caption font-semibold uppercase tracking-wider">Proj. Uplift</span>
 </div>
 <p className="text-heading-sm font-semibold text-foreground">{expectedUplift}</p>
 </div>
 
 <div className="space-y-space-1 pl-space-3 border-l border-border-subtle">
 <div className="flex items-center gap-space-1.5 text-neutral-500">
 <Target className="w-space-3.5 h-space-3.5 text-primary-500" />
 <span className="text-caption font-semibold uppercase tracking-wider">Confidence</span>
 </div>
 <p className="text-heading-sm font-semibold text-foreground">{confidence}</p>
 </div>
 </div>

 {/* Reason + time */}
 <div className="space-y-space-2.5">
 {action.impactReason && (
 <p className="text-neutral-500 text-caption leading-relaxed italic border-l border-primary/30 pl-space-3">
 &quot;{action.impactReason}&quot;
 </p>
 )}
 <div className="flex items-center gap-space-2 text-caption text-neutral-500 font-medium">
 <Clock className="w-space-3.5 h-space-3.5" />
 <span>~{action.estimatedTimeMinutes} min to complete</span>
 </div>
 </div>

 {/* CTAs */}
 <div className="flex flex-col gap-space-2 pt-space-2 mt-auto">
 <Button
 asChild
 className="interactive-button w-full h-space-10 text-body-sm font-semibold radius-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
 >
 <Link href={action.primaryCtaHref || APP_ROUTES.dashboard}>
 {action.primaryCtaText}
 <ArrowRight className="ml-space-2 w-space-4 h-space-4 transition-transform group-hover:translate-x-1" />
 </Link>
 </Button>
 <Button
 variant="ghost"
 className="interactive-button w-full h-space-9 text-caption text-neutral-500 hover:text-foreground radius-xl hover:bg-bg-layer-2"
          >
            Remind me later
          </Button>
        </div>
      </div>
    </div>
  );
}
