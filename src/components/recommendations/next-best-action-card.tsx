"use client";

import React, { useState, useTransition } from "react";
import { RecommendationAction } from "@/lib/recommendation-engine/types";
import { Card, CardContent } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { ArrowRight, Clock, Zap, ShieldAlert, CheckCircle2, MoreVertical, X, CalendarClock } from "lucide-react";
import { skipRecommendation, snoozeRecommendation } from "@/server/actions/recommendations";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/shared/dropdown-menu";
import Link from "next/link";
import { useToast } from "@/components/shared/toast";

interface Props {
 action: RecommendationAction | null;
}

export function NextBestActionCard({ action }: Props) {
 const [isPending, startTransition] = useTransition();
 const { success, error } = useToast();

 if (!action) {
 return (
 <Card className="border-green-500/20 bg-green-500/5 radius-xl overflow-hidden">
 <CardContent className="p-space-6 flex items-center gap-space-4">
 <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
 <div>
 <h3 className="text-heading-md font-semibold text-[hsl(var(--state-success-text))]">You're All Caught Up!</h3>
 <p className="text-body-sm text-[hsl(var(--state-success-text))]/70 mt-space-1">
 Operator is fully configured and optimized. We have no further recommendations at this time.
 </p>
 </div>
 </CardContent>
 </Card>
 );
 }

 const handleSkip = () => {
 startTransition(async () => {
 try {
 await skipRecommendation(action.id);
 success("Recommendation dismissed.");
 } catch (err) {
 error("Failed to dismiss recommendation.");
 }
 });
 };

 const handleSnooze = (days: number) => {
 startTransition(async () => {
 try {
 await snoozeRecommendation(action.id, days);
 success(`Recommendation snoozed for ${days} days.`);
 } catch (err) {
 error("Failed to snooze recommendation.");
 }
 });
 };

 return (
 <Card className="border-primary/20 shadow-lg shadow-primary/5 radius-2xl overflow-hidden relative group transition-all hover:border-primary/40">
 <div className="absolute top-space-0 left-space-0 w-1 h-full bg-primary" />
 <CardContent className="p-space-6 flex flex-col md:flex-row gap-space-6 items-start md:items-center">
 
 <div className="flex-1 space-y-space-3">
 <div className="flex items-center gap-space-2">
 <span className="text-caption font-bold uppercase tracking-widest bg-primary/10 text-primary px-space-2 py-space-1 radius-full flex items-center gap-space-1">
 <Zap className="h-3 w-3" /> Next Best Action
 </span>
 {action.impact === "High" && (
 <span className="text-caption font-bold uppercase tracking-widest bg-[hsl(var(--state-error-bg))] text-[hsl(var(--state-error-text))] px-space-2 py-space-1 radius-full flex items-center gap-space-1">
 <ShieldAlert className="h-3 w-3" /> High Impact
 </span>
 )}
 </div>
 
 <div>
 <h3 className="text-heading-lg font-bold">{action.title}</h3>
 <p className="text-body-md text-muted-foreground mt-space-1">
 {action.description}
 </p>
 </div>
 
 <div className="flex flex-wrap items-center gap-space-4 text-caption text-muted-foreground pt-space-2">
 <div className="flex items-center gap-space-1">
 <Clock className="h-4 w-4" />
 <span>~{action.estimatedTimeMinutes} min setup</span>
 </div>
 <div className="flex items-center gap-space-1" title={action.confidenceReason}>
 <div className="h-2 w-2 rounded-full bg-green-500" />
 <span>{action.confidence}% AI Confidence</span>
 </div>
 </div>
 </div>

 <div className="flex flex-row md:flex-col items-center gap-space-3 shrink-0 w-full md:w-auto">
 {action.primaryCtaAction ? (
 <form action={`/api/ai-generation/${action.primaryCtaAction}`} method="POST" className="w-full">
 <Button className="w-full gap-space-2 h-11" disabled={isPending}>
 <Zap className="h-4 w-4 fill-current" />
 {action.primaryCtaText}
 </Button>
 </form>
 ) : (
 <Link href={action.primaryCtaHref} passHref className="w-full">
 <Button className="w-full gap-space-2 h-11" disabled={isPending}>
 {action.primaryCtaText} <ArrowRight className="h-4 w-4" />
 </Button>
 </Link>
 )}

 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="outline" className="h-11 px-space-3 md:w-full">
 <MoreVertical className="h-4 w-4 md:hidden" />
 <span className="hidden md:inline">Not right now</span>
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-48">
 <DropdownMenuItem onClick={() => handleSnooze(1)} disabled={isPending}>
 <CalendarClock className="mr-space-2 h-4 w-4" />
 <span>Remind me tomorrow</span>
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => handleSnooze(7)} disabled={isPending}>
 <CalendarClock className="mr-space-2 h-4 w-4" />
 <span>Remind me next week</span>
 </DropdownMenuItem>
 <DropdownMenuItem onClick={handleSkip} disabled={isPending} className="text-[hsl(var(--state-error-text))]">
 <X className="mr-space-2 h-4 w-4" />
                <span>Skip entirely</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </CardContent>
    </Card>
  );
}
