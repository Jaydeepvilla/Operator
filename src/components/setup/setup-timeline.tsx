import React from "react";
import { SetupState } from "@/lib/setup-engine/types";
import { SETUP_TASKS } from "@/lib/setup-engine/tasks";
import { Check, Circle } from "lucide-react";

export function SetupTimeline({ 
 phases, 
 activePhase, 
 setActivePhase, 
 state 
}: { 
 phases: string[], 
 activePhase: string,
 setActivePhase: (p: string) => void,
 state: SetupState
}) {
 return (
 <div className="sticky top-space-6">
 <h3 className="text-body-sm font-semibold tracking-wide uppercase text-muted-foreground mb-space-6">
 Setup Timeline
 </h3>
 <div className="relative border-l border-border-default/50 ml-space-3 space-y-space-6">
 {phases.map((phase, index) => {
 const phaseTasks = SETUP_TASKS.filter(t => t.category === phase);
 const completedCount = phaseTasks.filter(t => t.isCompleted(state)).length;
 const isCompleted = phaseTasks.length > 0 && completedCount === phaseTasks.length;
 const isActive = activePhase === phase;
 
 return (
 <div 
 key={phase} 
 className="relative pl-space-6 cursor-pointer group"
 role="button"
 tabIndex={0}
 onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePhase(phase); } }}
 onClick={() => setActivePhase(phase)}
 >
 {/* Node indicator */}
 <div className={`absolute -left-[9px] top-space-0.5 h-4 w-4 rounded-full border bg-background flex items-center justify-center transition-colors
 ${isCompleted ? 'border-green-500 bg-green-50' : isActive ? 'border-primary' : 'border-muted-foreground/30'}
 group-hover:border-primary/50
 `}>
 {isCompleted && <Check className="h-2.5 w-2.5 text-green-500" />}
 {!isCompleted && isActive && <Circle className="h-1.5 w-1.5 fill-primary text-primary" />}
 </div>
 
 <div>
 <h4 className={`text-body-sm font-medium transition-colors ${isActive ? 'text-primary' : isCompleted ? 'text-muted-foreground' : 'text-foreground group-hover:text-primary/70'}`}>
 {phase}
 </h4>
 <p className="text-caption text-muted-foreground mt-space-0.5">
                  {completedCount} of {phaseTasks.length} tasks
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
