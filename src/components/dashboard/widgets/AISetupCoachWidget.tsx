"use client";

import { m } from "framer-motion";
import { hoverScale } from "@/components/motion/hover";
import { Button } from "@/components/shared/button";
import { SetupState } from "@/lib/setup-engine/types";
import { RecommendationAction } from "@/lib/recommendation-engine/types";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { APP_ROUTES } from "@/lib/constants/routes";

interface AISetupCoachWidgetProps {
  action: RecommendationAction | null;
  setupState: SetupState;
}

export function AISetupCoachWidget({ action }: AISetupCoachWidgetProps) {
  if (!action) {
    return (
      <div className="os-card radius-lg p-space-5 flex flex-col items-center justify-center text-center gap-space-3 h-full min-h-48">
        <div className="w-space-8 h-space-8 radius-full bg-state-success-bg flex items-center justify-center">
          <CheckCircle2 className="w-space-4 h-space-4 text-state-success-text" />
        </div>
        <div>
          <p className="text-body-sm font-semibold text-foreground">Fully Trained</p>
          <p className="text-caption text-neutral-500 mt-space-0.5">
            Monitor for updates as your business grows.
          </p>
        </div>
      </div>
    );
  }

  const difficultyLabel =
    action.estimatedTimeMinutes > 15 ? "Complex" :
    action.estimatedTimeMinutes > 5 ? "Moderate" : "Quick win";

  return (
    <div className="os-card radius-lg h-full flex flex-col overflow-hidden interactive-card bg-gradient-to-br from-bg-surface to-bg-layer-1">
      <div className="flex flex-col flex-1 p-space-5 gap-space-4">
        {/* Header — Icon + Title + Action indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-2">
            <div className="relative">
              <Sparkles className="w-space-4 h-space-4 text-primary-500" />
              <span className="absolute -top-space-0.5 -right-space-0.5 w-1.5 h-1.5 bg-success-500 radius-full" />
            </div>
            <p className="text-caption font-semibold text-neutral-500 uppercase tracking-widest">
              Operator AI
            </p>
          </div>
          <span className="text-caption font-semibold text-primary-600 bg-primary-50 px-space-2 py-space-0.5 radius-md">
            Suggestion
          </span>
        </div>

        {/* Suggestion & Description */}
        <div className="space-y-space-1.5 flex-1">
          <h3 className="text-body-sm font-semibold text-foreground line-clamp-1 leading-snug">
            {action.title}
          </h3>
          <p className="text-caption text-neutral-500 leading-relaxed line-clamp-3">
            {action.description}
          </p>
          
          <div className="flex flex-wrap items-center gap-space-1.5 pt-space-2">
            <span className="text-caption font-semibold px-space-2 py-space-0.5 radius-md bg-bg-layer-1 border border-border-subtle text-neutral-500">
              {difficultyLabel} ({action.estimatedTimeMinutes}m)
            </span>
            <span className="text-caption font-semibold px-space-2 py-space-0.5 radius-md bg-primary-50/50 text-primary-700/80">
              {action.impact} Impact
            </span>
          </div>
        </div>

        {/* Bottom CTA Button */}
        <div className="mt-auto pt-space-2 flex gap-space-2">
          <Button
            asChild
            className="flex-1 h-space-9 text-caption font-semibold bg-primary text-primary-foreground radius-full hover:bg-primary-light transition-all flex items-center justify-center gap-space-1.5 cursor-pointer"
          >
            <Link href={action.primaryCtaHref || APP_ROUTES.setup}>
              <span>{action.primaryCtaText}</span>
              <ArrowRight className="w-space-3 h-space-3 shrink-0" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
