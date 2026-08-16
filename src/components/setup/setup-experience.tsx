"use client";

import React from "react";
import { SetupState } from "@/lib/setup-engine/types";
import { useSetupEngine } from "@/hooks/use-setup-engine";
import { AiSetupCoach } from "./ai-setup-coach";
import { ReadinessDashboard } from "./readiness-dashboard";
import { DailyGoalsCard } from "./daily-goals-card";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { ArrowRight } from "lucide-react";

export function SetupExperience({ state }: { state: SetupState }) {
  const { recommendation, readiness, confidence, dailyGoals, timeline } = useSetupEngine(state);

  // If readiness is 100%, we don't show the setup experience (or we show a celebration state)
  if (readiness.overallScore === 100) {
    return null; // Handled by the Completion Banner in dashboard/page.tsx
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-title-md font-semibold text-foreground tracking-tight">Operator Setup</h2>
        <Link href="/setup" passHref>
          <Button variant="outline" className="gap-space-2 text-primary border-primary/20 hover:bg-primary/5">
            Open Setup Wizard <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-6">
        <div className="lg:col-span-2 space-y-space-6">
          <AiSetupCoach recommendation={recommendation} />
          <ReadinessDashboard readiness={readiness} confidence={confidence} />
        </div>
        <div className="lg:col-span-1">
          <DailyGoalsCard goals={dailyGoals} state={state} />
        </div>
      </div>
    </>
  );
}
