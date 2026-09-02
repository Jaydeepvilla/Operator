import { m } from "framer-motion";
import { hoverScale } from "@/components/motion/hover";
import { Trophy, Star, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RecentAchievementsWidgetProps {
 achievements: Array<{
 id: string;
 title: string;
 description: string;
 impact: string;
 completedAt: Date;
 icon?: string;
 }>;
}

export function RecentAchievementsWidget({ achievements }: RecentAchievementsWidgetProps) {
 if (!achievements || achievements.length === 0) {
 return (
 <div className="os-card border radius-lg p-space-8 flex flex-col items-center justify-center text-center gap-space-3 min-h-40">
 <div className="w-space-10 h-space-10 radius-lg bg-warning-50 flex items-center justify-center">
 <Trophy className="w-space-5 h-space-5 text-warning-500/50" />
 </div>
 <div>
 <p className="text-body-sm font-medium text-neutral-500">No achievements yet</p>
 <p className="text-caption text-neutral-400 mt-space-0.5">
 Complete setup tasks to unlock milestones.
 </p>
 </div>
 </div>
 );
 }

 return (
 <div className="os-card radius-lg overflow-hidden">
 <div className="px-space-6 pt-space-6 pb-space-3">
 <div className="flex items-center justify-between">
 <p className="text-caption font-semibold text-neutral-500 uppercase tracking-widest">
 Achievements
 </p>
 <div className="w-space-6 h-space-6 radius-lg bg-warning-50 flex items-center justify-center">
 <Trophy className="w-space-3.5 h-space-3.5 text-warning-500" />
 </div>
 </div>
 </div>

 <div className="px-space-4 pb-space-4 space-y-space-1">
 {achievements.slice(0, 4).map((achievement) => (
 <div
 key={achievement.id}
 className="flex items-start gap-space-3 p-space-3 radius-lg hover:bg-bg-layer-2 interactive-card"
 >
 <div className="w-space-8 h-space-8 radius-lg bg-warning-50 border-warning-100 flex items-center justify-center shrink-0 mt-space-0.5">
 <Star className="w-space-3.5 h-space-3.5 text-warning-500" />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-start justify-between gap-space-2">
 <p className="text-body-sm font-semibold text-foreground leading-tight">
 {achievement.title}
 </p>
 <span className="text-caption text-neutral-400 whitespace-nowrap shrink-0 mt-space-0.5">
 {formatDistanceToNow(achievement.completedAt, { addSuffix: true })}
 </span>
 </div>
 <p className="text-caption text-neutral-500 mt-space-0.5 leading-relaxed line-clamp-2">
 {achievement.description}
 </p>
 <div className="inline-flex items-center gap-space-1 mt-space-1.5 text-caption font-semibold text-success-500">
 <TrendingUp className="w-space-3 h-space-3" />
                {achievement.impact}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
