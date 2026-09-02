"use client";

import React, { useState } from "react";
import { SetupState } from "@/lib/setup-engine/types";
import { useSetupEngine } from "@/hooks/use-setup-engine";
import { SETUP_TASKS } from "@/lib/setup-engine/tasks";
import { isTaskLocked } from "@/lib/setup-engine/engines";
import { SetupTimeline } from "./setup-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { ArrowRight, Lock, Clock, Zap } from "lucide-react";
import Link from "next/link";
import { ProfessionalMilestones } from "./professional-milestones";

export function SetupWizard({ state }: { state: SetupState }) {
  const { timeline, recommendation, readiness } = useSetupEngine(state);
  
  // Group tasks by category intelligently
  const phases = ["Business Info", "Knowledge Base", "Appointments", "AI Customization", "Channels", "Launch"];
  
  const [activePhase, setActivePhase] = useState(phases[0]);

  const activeTasks = SETUP_TASKS.filter(t => t.category === activePhase);
  
  const completedInPhase = activeTasks.filter(t => t.isCompleted(state)).length;
  const phasePercentage = activeTasks.length > 0 ? Math.round((completedInPhase / activeTasks.length) * 100) : 100;
  
  const totalPhaseTime = activeTasks.reduce((acc, t) => acc + t.estimatedTimeMinutes, 0);

  // If readiness is 100%, show milestones
  if (readiness.overallScore === 100) {
    return <ProfessionalMilestones />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-space-8">
      {/* Left Sidebar: Timeline */}
      <div className="lg:col-span-1">
        <SetupTimeline 
          phases={phases} 
          activePhase={activePhase} 
          setActivePhase={setActivePhase}
          state={state}
        />
      </div>

      {/* Main Content: Phase Details */}
      <div className="lg:col-span-3 space-y-space-6">
        <Card className="border border-border-default radius-xl overflow-hidden">
          <CardHeader className="bg-muted/5 border-b border-border-default pb-space-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-title-md font-semibold text-foreground">{activePhase}</CardTitle>
                <div className="flex items-center gap-space-4 mt-space-2 text-caption text-muted-foreground">
                  <span className="flex items-center gap-space-1"><Clock className="h-3.5 w-3.5"/> ~{totalPhaseTime} min total</span>
                  <span className="font-medium text-primary">{phasePercentage}% Complete</span>
                </div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden mt-space-4">
              <div 
                className="h-full bg-primary transition-all duration-500 rounded-full" 
                style={{ width: `${phasePercentage}%` }} 
              />
            </div>
          </CardHeader>
          <CardContent className="p-space-0">
            <div className="divide-y divide-border-default/50">
              {activeTasks.map(task => {
                const isCompleted = task.isCompleted(state);
                const isLocked = isTaskLocked(task, state);
                const isRecommended = recommendation?.task.id === task.id;

                return (
                  <div key={task.id} className={`p-space-6 ${isCompleted ? 'bg-muted/5' : ''}`}>
                    <div className="flex flex-col sm:flex-row gap-space-4 sm:items-start justify-between">
                      <div className="flex-1 space-y-space-2">
                        <div className="flex items-center gap-space-2">
                          <h4 className={`text-body-md font-semibold ${isCompleted ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {task.label}
                          </h4>
                          {isRecommended && (
                            <span className="inline-flex items-center gap-space-1 px-space-2 py-space-0.5 rounded-full bg-amber-500/10 text-amber-600 text-caption uppercase font-bold tracking-wider">
                              <Zap className="h-3 w-3" /> Recommended
                            </span>
                          )}
                          {isCompleted && (
                            <span className="inline-flex items-center px-space-2 py-space-0.5 rounded-full bg-green-500/10 text-green-600 text-caption uppercase font-bold tracking-wider">
                              Completed
                            </span>
                          )}
                        </div>
                        <p className="text-body-sm text-muted-foreground">{task.description}</p>
                        
                        {/* AI Mentor Context */}
                        {!isCompleted && !isLocked && (
                          <div className="mt-space-3 p-space-3 radius-md bg-primary/5 border border-primary/10">
                            <p className="text-caption text-foreground/80">
                              <span className="font-semibold text-primary">Why it matters:</span> {task.whyItMatters}
                            </p>
                          </div>
                        )}
                        
                        {isLocked && (
                          <div className="flex items-center gap-space-2 mt-space-2 text-caption text-amber-600">
                            <Lock className="h-3.5 w-3.5" />
                            <span>Locked. Complete {task.dependencies.join(", ")} first.</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="shrink-0 flex flex-col items-end gap-space-2">
                        {!isCompleted && (
                          isLocked ? (
                            <Button disabled={true} variant="secondary">
                              Locked <Lock className="ml-space-2 h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Link href={task.href} passHref>
                              <Button variant={isRecommended ? "default" : "secondary"}>
                                Continue <ArrowRight className="ml-space-2 h-4 w-4" />
                              </Button>
                            </Link>
                          )
                        )}
                        {!isCompleted && !isLocked && (
                          <span className="text-caption text-muted-foreground flex items-center gap-space-1">
                            <Clock className="h-3 w-3" /> {task.estimatedTimeMinutes} min
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
