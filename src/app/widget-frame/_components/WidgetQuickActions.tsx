"use client";

import React from "react";
import { Sparkles, Calendar, Clock, MapPin, UserCheck, DollarSign } from "lucide-react";

export interface DynamicActionItem {
  id: string;
  label: string;
  type: "view" | "message" | "booking" | "escalate";
  payload?: any;
  accent?: boolean;
}

interface WidgetQuickActionsProps {
  dynamicActions?: DynamicActionItem[];
  onAction: (action: DynamicActionItem) => void;
  hasBooking?: boolean;
  hasServices?: boolean;
}

function getActionIcon(id: string) {
  if (id.includes("BOOK") || id.includes("AVAILABILITY")) {
    return <Calendar className="h-3 w-3 text-primary" />;
  }
  if (id.includes("SERVICES")) {
    return <Sparkles className="h-3 w-3" />;
  }
  if (id.includes("PRICING")) {
    return <DollarSign className="h-3 w-3" />;
  }
  if (id.includes("HOURS") || id.includes("RESCHEDULE") || id.includes("CANCEL")) {
    return <Clock className="h-3 w-3" />;
  }
  if (id.includes("LOCATION")) {
    return <MapPin className="h-3 w-3" />;
  }
  if (id.includes("HUMAN") || id.includes("CONTACT")) {
    return <UserCheck className="h-3 w-3" />;
  }
  return <Sparkles className="h-3 w-3" />;
}

export function WidgetQuickActions({
  dynamicActions = [],
  onAction,
  hasBooking = true,
  hasServices = true,
}: WidgetQuickActionsProps) {
  // If server provided dynamic actions, render ONLY those verified actions
  let actionsToRender: DynamicActionItem[] = [];

  if (dynamicActions && dynamicActions.length > 0) {
    actionsToRender = dynamicActions;
  } else {
    // Initial load fallback: only show actions backed by verified capabilities
    if (hasBooking) {
      actionsToRender.push({
        id: "BOOK_APPOINTMENT",
        label: "Book Appointment",
        type: "booking",
        accent: true,
      });
    }
    if (hasServices) {
      actionsToRender.push({
        id: "VIEW_SERVICES",
        label: "View Services",
        type: "view",
      });
    }
    actionsToRender.push({
      id: "SPEAK_WITH_HUMAN",
      label: "Speak with Staff",
      type: "escalate",
    });
  }

  // Never render more than 3 action chips
  actionsToRender = actionsToRender.slice(0, 3);

  if (actionsToRender.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-2 border-t border-border/20 bg-background/40 backdrop-blur-xs overflow-x-auto no-scrollbar select-none shrink-0">
      {actionsToRender.map((act) => (
        <button
          key={act.id + act.label}
          type="button"
          onClick={() => onAction(act)}
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-all cursor-pointer shadow-2xs ${
            act.accent
              ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50"
              : "bg-card/70 border-border/50 text-foreground/85 hover:bg-accent/40 hover:text-foreground"
          }`}
        >
          {getActionIcon(act.id)}
          <span>{act.label}</span>
        </button>
      ))}
    </div>
  );
}
