"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { Clock, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

export interface NextStepItem {
  id: string;
  title: string;
  reason: string;
  timeNeeded: string;
  actionText: string;
  actionHref: string;
  exampleText?: string;
}

interface NextStepCardProps {
  step: NextStepItem | null;
}

export function NextStepCard({ step }: NextStepCardProps) {
  const [showExample, setShowExample] = React.useState(false);

  if (!step) {
    return (
      <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 via-card to-background p-space-5 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-body-md font-bold text-foreground">Your assistant is fully set up!</h3>
            <p className="text-body-sm text-muted-foreground">
              All essential steps are completed. You are ready to receive customer messages and bookings.
            </p>
          </div>
        </div>
        <Button asChild size="sm" variant="outline" className="shrink-0 font-semibold">
          <Link href="/widget">Test Assistant</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-card to-background p-space-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-4">
        <div className="space-y-1.5 max-w-2xl">
          {/* Header pill */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-primary uppercase tracking-wider bg-primary/15 border border-primary/25 px-2.5 py-0.5 rounded-full">
              Your Next Step
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <Clock className="w-3 h-3 text-primary" />
              <span>{step.timeNeeded}</span>
            </span>
          </div>

          {/* Title & Why it matters */}
          <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
            {step.title}
          </h2>
          <p className="text-body-sm text-muted-foreground leading-relaxed">
            {step.reason}
          </p>

          {/* Example preview accordion */}
          {step.exampleText && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowExample((prev) => !prev)}
                className="text-xs font-semibold text-primary-light hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{showExample ? "Hide example" : "See an example"}</span>
              </button>
              {showExample && (
                <div className="mt-2 p-3 rounded-lg bg-background/80 border border-border/60 text-xs text-foreground/80 leading-relaxed animate-fade-in font-mono">
                  {step.exampleText}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <div className="shrink-0 pt-2 md:pt-0">
          <Button
            asChild
            size="lg"
            shape="pill"
            className="gap-2 font-bold shadow-md shadow-primary/25 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-light hover:to-indigo-500"
          >
            <Link href={step.actionHref}>
              <span>{step.actionText}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

