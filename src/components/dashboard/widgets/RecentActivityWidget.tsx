"use client";

import { m } from "framer-motion";
import { hoverScale } from "@/components/motion/hover";
import { Card } from "@/components/shared/card";
import {
  Calendar,
  BookOpen,
  Sparkles,
  MessageSquare,
  UserCheck,
  AlertTriangle,
  Activity,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  createdAt: Date | string;
}

interface RecentActivityWidgetProps {
  activity: ActivityItem[];
}

const ACTIVITY_META: Record<
  string,
  { icon: React.ElementType; iconBg: string; dot: string; label: string }
> = {
  appointment: {
    icon: Calendar,
    iconBg: "bg-[hsl(var(--state-success-bg))] text-[hsl(var(--state-success-text))]",
    dot: "bg-[hsl(var(--state-success-text))]",
    label: "Booking",
  },
  knowledge: {
    icon: BookOpen,
    iconBg: "bg-primary/10 text-primary",
    dot: "bg-primary",
    label: "Knowledge",
  },
  ai_optimization: {
    icon: Sparkles,
    iconBg: "bg-primary/10 text-primary",
    dot: "bg-primary",
    label: "AI",
  },
  message: {
    icon: MessageSquare,
    iconBg: "bg-[hsl(var(--foreground)/0.06)] text-muted-foreground",
    dot: "bg-muted-foreground",
    label: "Chat",
  },
  escalation: {
    icon: AlertTriangle,
    iconBg: "bg-[hsl(var(--state-error-bg))] text-[hsl(var(--state-error-text))]",
    dot: "bg-[hsl(var(--state-error-text))]",
    label: "Alert",
  },
};

export function RecentActivityWidget({ activity }: RecentActivityWidgetProps) {
  if (activity.length === 0) {
    return (
      <m.div whileHover={hoverScale}>
        <Card className="h-full p-space-6 flex flex-col items-center justify-center text-center gap-space-3 border border-[hsl(var(--foreground)/0.07)]">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-body-sm font-bold text-foreground">Live Telemetry Active</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1 max-w-md leading-relaxed">
              Operator AI is standing by 24/7. Inbound calls, customer chats, and appointment bookings will stream here in real time.
            </p>
          </div>
        </Card>
      </m.div>
    );
  }

  return (
    <m.div whileHover={hoverScale}>
      <Card className="h-full flex flex-col overflow-hidden border border-[hsl(var(--foreground)/0.07)]">
        {/* Header */}
        <div className="flex items-center justify-between px-space-5 pt-space-5 pb-space-3">
          <div className="flex items-center gap-space-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest">
              Recent Activity
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[hsl(var(--state-success-text))] bg-[hsl(var(--state-success-bg))] px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--state-success-text))] animate-pulse" />
            Live Stream
          </span>
        </div>

        {/* Divider */}
        <div className="h-px bg-border mx-space-5 mb-space-1" />

        {/* Feed */}
        <div className="flex-1 px-space-4 py-space-2 space-y-space-1 overflow-auto max-h-[360px]">
          {activity.map((item, idx) => {
            const meta = ACTIVITY_META[item.type] ?? {
              icon: UserCheck,
              iconBg: "bg-neutral-500/10 text-neutral-500",
              dot: "bg-neutral-400",
              label: "Event",
            };
            const IconComp = meta.icon;

            let formattedTime = "";
            try {
              formattedTime = formatDistanceToNow(new Date(item.createdAt), {
                addSuffix: true,
              });
            } catch {
              formattedTime = String(item.createdAt);
            }

            const isLast = idx === activity.length - 1;

            return (
              <div key={item.id} className="flex gap-space-3 group relative py-1">
                {/* Timeline connector */}
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${meta.iconBg} transition-transform duration-150 group-hover:scale-110`}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                  </div>
                  {!isLast && (
                    <div className="w-px flex-1 min-h-[12px] bg-border/60 my-1" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-space-2 pt-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-medium text-foreground leading-snug">
                      {item.description}
                    </p>
                    <span
                      className={`shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${meta.iconBg}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/55 mt-0.5">
                    {formattedTime}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </m.div>
  );
}
