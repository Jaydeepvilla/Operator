import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Clock, Activity, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { Badge } from "@/components/shared/badge";
import { RecommendationResult } from "@/lib/setup-engine/types";

export function AiSetupCoach({ recommendation }: { recommendation: RecommendationResult | null }) {
  if (!recommendation) {
    return (
      <Card className="border-border-default bg-card radius-xl overflow-hidden relative">
        <CardContent className="p-space-6 flex items-center gap-space-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-body-md font-semibold text-foreground">You're all set!</h3>
            <p className="text-body-sm text-muted-foreground">Operator is fully configured and ready to handle customer inquiries.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { task, reason } = recommendation;

  return (
    <Card className="border-primary/20 bg-primary/5 radius-xl overflow-hidden relative">
      <div className="absolute top-space-0 left-space-0 w-1 h-full bg-primary" />
      <CardHeader className="p-space-6 pb-space-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-2">
            <Sparkles className="h-4.5 w-4.5 text-primary" />
            <CardTitle className="text-body-sm font-semibold text-primary">AI Setup Coach</CardTitle>
          </div>
          <div className="flex items-center gap-space-2">
            <Badge variant="secondary" className="bg-[hsl(var(--foreground)/0.06)] text-caption uppercase tracking-wider">
              <Clock className="h-3 w-3 mr-space-1" />
              {task.estimatedTimeMinutes} Min
            </Badge>
            <Badge variant="secondary" className="bg-[hsl(var(--foreground)/0.06)] text-caption uppercase tracking-wider">
              <Activity className="h-3 w-3 mr-space-1" />
              Impact: {task.impact}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-space-6 pt-space-0 space-y-space-4">
        <div>
          <h3 className="text-heading-sm font-semibold text-foreground tracking-tight">{task.label}</h3>
          <p className="text-body-sm text-foreground/80 mt-space-1 leading-relaxed">{task.description}</p>
        </div>

        <div className="p-space-3 radius-md bg-card border border-border-default/50">
          <div className="flex gap-space-2 items-start">
            <Zap className="h-4 w-4 text-amber-500 mt-space-0.5 shrink-0" />
            <p className="text-caption text-muted-foreground">
              <span className="font-medium text-foreground">Why this matters: </span>
              {reason}
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-space-2">
          <Link href={task.href} passHref>
            <Button size="sm" className="gap-space-2">
              Action Required
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
