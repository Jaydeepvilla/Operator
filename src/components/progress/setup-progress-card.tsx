"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shared/card";
import { Badge } from "@/components/shared/badge";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { SetupTimelineStep, WeeklyProgressSummary, RemainingTask } from "@/lib/types/progress";

interface SetupProgressCardProps {
  progressPercentage: number;
  timeline: SetupTimelineStep[];
  weeklySummary: WeeklyProgressSummary;
  remainingTasks: RemainingTask[];
}

export function SetupProgressCard({
  progressPercentage,
  timeline,

  weeklySummary,
  remainingTasks
}: SetupProgressCardProps) {
  return (
    <Card className="col-span-full xl:col-span-2 overflow-hidden border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
      <CardHeader className="border-b border-zinc-800/50 pb-space-4 bg-zinc-900/80">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400">
              Setup Progress
            </CardTitle>
            <CardDescription className="text-zinc-400 mt-space-1">
              Your journey to full Operator readiness
            </CardDescription>
          </div>
          <div className="flex items-center gap-space-3 text-right">
            <div className="text-3xl font-bold text-zinc-100">{progressPercentage}%</div>
          </div>
        </div>
        <div className="mt-space-4">
          <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progressPercentage}%` }} />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-space-0">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
          
          {/* Timeline Section */}
          <div className="p-space-6">
            <h3 className="text-sm font-medium text-zinc-400 mb-space-4 uppercase tracking-wider">Timeline</h3>
            <div className="space-y-space-6">
              {timeline.map((step, idx) => (
                <div key={idx} className="flex gap-space-4 relative">
                  {/* Connector Line */}
                  {idx !== timeline.length - 1 && (
                    <div className="absolute top-space-6 left-space-3 w-px h-[calc(100%-8px)] bg-zinc-800" />
                  )}
                  
                  <div className="shrink-0 mt-space-0.5 relative z-10 bg-zinc-900/50">
                    {step.status === "completed" ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500 fill-green-500/10" />
                    ) : step.status === "current" ? (
                      <Circle className="w-6 h-6 text-primary fill-primary/10" />
                    ) : (
                      <Circle className="w-6 h-6 text-zinc-700" />
                    )}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-space-2">
                      <h4 className={`text-sm font-medium ${step.status === "upcoming" ? "text-zinc-500" : "text-zinc-200"}`}>
                        {step.title}
                      </h4>
                      {step.status === "current" && (
                        <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/20 text-caption px-space-1.5 py-space-0">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className={`text-xs mt-space-1 ${step.status === "upcoming" ? "text-zinc-600" : "text-zinc-400"}`}>
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Items Section */}
          <div className="p-space-6 bg-zinc-900/20">
            <div className="flex items-center justify-between mb-space-4">
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Next Steps</h3>
              {weeklySummary.completedThisWeek > 0 && (
                <span className="text-xs text-green-400 flex items-center gap-space-1">
                  ↑ {weeklySummary.completedThisWeek} tasks this week
                </span>
              )}
            </div>
            
            {remainingTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-space-4">
                <CheckCircle2 className="w-12 h-12 text-green-500/50 mb-space-3" />
                <p className="text-sm text-zinc-300">You're all caught up!</p>
                <p className="text-xs text-zinc-500 mt-space-1">Your AI is fully configured.</p>
              </div>
            ) : (
              <div className="space-y-space-3">
                {remainingTasks.slice(0, 4).map((task, idx) => (
                  <div key={idx} className="group flex items-start justify-between p-space-3 rounded-lg border border-zinc-800/50 bg-zinc-800/20 hover:bg-zinc-800/40 transition-colors">
                    <div>
                      <h4 className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                        {task.task}
                      </h4>
                      <div className="flex items-center gap-space-3 mt-space-2">
                        <span className="flex items-center gap-space-1 text-xs text-zinc-500">
                          <Clock className="w-3 h-3" />
                          {task.estimatedMinutes}m
                        </span>
                        {task.canGenerateWithAi && (
                          <span className="text-caption uppercase font-bold text-primary bg-primary/10 px-space-1.5 py-space-0.5 rounded">
                            AI Ready
                          </span>
                        )}
                      </div>
                    </div>
                    {task.priority === "critical" && (
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-space-1.5" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>
      </CardContent>
    </Card>
  );
}
