"use client";

import { m } from "framer-motion";
import { hoverScale } from "@/components/motion/hover";
import { SetupTimelineStep } from "@/lib/types/progress";
import { CheckCircle2, Circle, Clock, Zap, ArrowRight, Check } from "lucide-react";
import { cn } from "@/components/shared/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProgressTimelineWidgetProps {
 timeline: SetupTimelineStep[];
 progress: number;
 remainingTasks: Array<{ task: string; estimatedMinutes?: number }>;
}

const statusWeight = { completed: 1, current: 2, upcoming: 3 } as const;

export function ProgressTimelineWidget({ timeline, progress, remainingTasks }: ProgressTimelineWidgetProps) {
 const completedCount = timeline.filter(s => s.status === "completed").length;
 const totalStages = timeline.length;
 
 // Sort stages so completed stages group on the left, moving left -> right continuously
 const sortedTimeline = [...timeline].sort((a, b) => statusWeight[a.status] - statusWeight[b.status]);
 const currentIdx = sortedTimeline.findIndex(s => s.status === "current");
 const currentStep = currentIdx >= 0 ? sortedTimeline[currentIdx] : null;

 const estimatedMinutesLeft = remainingTasks.reduce((acc, t) => acc + (t.estimatedMinutes || 5), 0);
 const doneStages = timeline.filter(s => s.status === "completed");

 return (
 <div className="os-card radius-lg overflow-hidden">
 <div className="p-space-5 flex flex-col gap-space-5">
 {/* Top Section: Progress Title & Stats */}
 <div className="flex items-center justify-between">
 <div>
 <p className="text-caption font-semibold text-neutral-500 uppercase tracking-widest">
 Setup Journey
 </p>
 {currentStep && (
 <p className="text-body-sm font-semibold text-foreground mt-space-1">
 {currentStep.title}
 </p>
 )}
 </div>
 <div className="text-right shrink-0">
 <p className="text-heading-md tabular-nums text-foreground leading-none">
 {progress}<span className="text-body-sm text-neutral-500">%</span>
 </p>
 <p className="text-caption text-neutral-500 mt-space-0.5">
 {completedCount}/{totalStages} stages complete
 </p>
 </div>
 </div>

 {/* Continuous Progress Bar */}
 <div className="h-space-1 w-full bg-border-subtle radius-full overflow-hidden">
 <div
 className="h-full bg-gradient-to-r from-primary to-primary-light radius-full transition-[width] duration-500 ease-in-out"
 style={{ width: `${progress}%` }}
 role="progressbar"
 aria-valuenow={progress}
 aria-valuemin={0}
 aria-valuemax={100}
 aria-label="Setup progress"
 />
 </div>

 {/* Roadmap Nodes */}
 <ScrollArea className="flex items-start gap-0" vertical={false}>
 {sortedTimeline.map((step, idx) => {
 const isCompleted = step.status === "completed";
 const isCurrent = step.status === "current";
 const isLast = idx === sortedTimeline.length - 1;

 return (
 <div key={step.category} className="flex items-start flex-1 min-w-0">
 {/* Node + Label */}
 <div className="flex flex-col items-center text-center shrink-0 min-w-space-14 max-w-space-24 w-full">
 <div className="relative">
 {isCompleted ? (
 <div className="w-space-7 h-space-7 radius-full bg-success-500 flex items-center justify-center">
 <CheckCircle2 className="w-space-4 h-space-4 text-white" />
 </div>
 ) : isCurrent ? (
 <div className="w-space-7 h-space-7 radius-full border-primary bg-primary-50 flex items-center justify-center signal-pulse">
 <div className="w-space-2 h-space-2 radius-full bg-primary" />
 </div>
 ) : (
 <div className="w-space-7 h-space-7 radius-full border-border-subtle bg-bg-layer-1 flex items-center justify-center">
 <span className="text-caption font-semibold text-neutral-400 tabular-nums">{idx + 1}</span>
 </div>
 )}
 </div>

 <span className={cn(
 "text-caption mt-space-2 leading-tight line-clamp-2 max-w-full px-space-1",
 isCurrent ? "font-semibold text-primary" :
 isCompleted ? "text-neutral-500" :
 "text-neutral-400"
 )}>
 {step.title}
 </span>
 </div>

 {/* Connector Line */}
 {!isLast && (
 <div className="flex-1 mt-space-3.5 mx-space-1">
 <div className="h-space-0.5 w-full radius-full bg-border-subtle overflow-hidden">
 <div
 className={cn(
 "h-full radius-full transition-[width] duration-500 ease-in-out",
 isCompleted ? "w-full bg-success-500" :
 isCurrent ? "w-1/2 bg-primary" :
 "w-0"
 )}
 />
 </div>
 </div>
 )}
 </div>
 );
 })}
 </ScrollArea>

 {/* Redesigned Inlined Modules Checklist */}
 {remainingTasks.length > 0 && (
 <div className="border-t border-border-subtle pt-space-5 mt-space-1 space-y-space-3">
 <div className="flex items-center justify-between">
 <p className="text-caption font-semibold text-neutral-500 uppercase tracking-widest">
 Up Next (Pending Modules)
 </p>
 {estimatedMinutesLeft > 0 && (
 <div className="flex items-center gap-space-1 text-caption font-medium text-neutral-500 bg-bg-layer-1 px-space-2 py-space-1 radius-full border-border-subtle">
 <Clock className="w-space-3 h-space-3" />
 <span>~{estimatedMinutesLeft}m left</span>
 </div>
 )}
 </div>

 <div className="flex flex-col gap-space-2">
 {remainingTasks.slice(0, 3).map((task, i) => (
 <div
 key={task.task || String(i)}
 className="group flex items-center justify-between p-space-3 radius-lg bg-bg-layer-1 border-border-subtle hover:border-primary/30 hover:bg-bg-layer-2/30 transition-all duration-200 cursor-pointer"
 >
 <div className="flex items-center gap-space-3 min-w-0">
 <Circle className="w-space-4 h-space-4 text-neutral-400 shrink-0 group-hover:text-primary transition-colors" />
 <span className="text-body-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
 {task.task}
 </span>
 </div>
 <div className="flex items-center gap-space-2 shrink-0">
 <span className="h-space-6 px-space-2 radius-md text-caption font-semibold text-primary-500 bg-primary-50 flex items-center gap-space-1 opacity-90 group-hover:opacity-100 transition-all">
 <Zap className="w-space-3 h-space-3" />
 Auto
 </span>
 <ArrowRight className="w-space-3.5 h-space-3.5 text-neutral-400 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Completed Modules / Completed Stages summary */}
 {doneStages.length > 0 && (
 <div className="border-t border-border-subtle pt-space-4 mt-space-1">
 <div className="flex flex-wrap gap-space-2">
 {doneStages.slice(-3).map(stage => (
 <div key={stage.category} className="flex items-center gap-space-1.5 px-space-2.5 py-space-1.5 radius-lg bg-success-50 text-success-700 border-success-200/50">
 <Check className="w-space-3 h-space-3 shrink-0" />
 <span className="text-caption font-medium truncate max-w-space-28">{stage.title}</span>
 </div>
 ))}
 {doneStages.length > 3 && (
 <div className="flex items-center px-space-2.5 py-space-1.5 radius-lg bg-bg-layer-1 border-border-subtle text-neutral-500 text-caption font-medium">
                  +{doneStages.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
