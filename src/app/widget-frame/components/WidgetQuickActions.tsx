"use client";

import React from "react";
import { Sparkles, Calendar, Clock, MapPin, UserCheck, DollarSign } from "lucide-react";

interface ActionItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  accent?: boolean;
}

interface WidgetQuickActionsProps {
  context?: "general" | "services" | "booking" | "completed";
  onAction: (actionType: string) => void;
}

export function WidgetQuickActions({ context = "general", onAction }: WidgetQuickActionsProps) {
  const getActions = (): ActionItem[] => {
    switch (context) {
      case "services":
        return [
          {
            id: "book",
            label: "Book a Service",
            icon: <Calendar className="h-3 w-3" />,
            action: () => onAction("book"),
            accent: true,
          },
          {
            id: "pricing",
            label: "Pricing Details",
            icon: <DollarSign className="h-3 w-3" />,
            action: () => onAction("pricing"),
          },
          {
            id: "hours",
            label: "Opening Hours",
            icon: <Clock className="h-3 w-3" />,
            action: () => onAction("hours"),
          },
        ];
      case "completed":
        return [
          {
            id: "services",
            label: "Explore More Services",
            icon: <Sparkles className="h-3 w-3" />,
            action: () => onAction("services"),
            accent: true,
          },
          {
            id: "location",
            label: "Directions / Location",
            icon: <MapPin className="h-3 w-3" />,
            action: () => onAction("location"),
          },
          {
            id: "human",
            label: "Contact Staff",
            icon: <UserCheck className="h-3 w-3" />,
            action: () => onAction("human"),
          },
        ];
      default:
        return [
          {
            id: "book",
            label: "Book Appointment",
            icon: <Calendar className="h-3 w-3 text-primary" />,
            action: () => onAction("book"),
            accent: true,
          },
          {
            id: "services",
            label: "View Services",
            icon: <Sparkles className="h-3 w-3" />,
            action: () => onAction("services"),
          },
          {
            id: "hours",
            label: "Hours",
            icon: <Clock className="h-3 w-3" />,
            action: () => onAction("hours"),
          },
          {
            id: "location",
            label: "Location",
            icon: <MapPin className="h-3 w-3" />,
            action: () => onAction("location"),
          },
          {
            id: "human",
            label: "Speak to Staff",
            icon: <UserCheck className="h-3 w-3" />,
            action: () => onAction("human"),
          },
        ];
    }
  };

  const actions = getActions();

  return (
    <div className="flex items-center gap-1.5 px-3 py-2 border-t border-border/20 bg-background/40 backdrop-blur-xs overflow-x-auto no-scrollbar select-none shrink-0">
      {actions.map((act) => (
        <button
          key={act.id}
          type="button"
          onClick={act.action}
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-all cursor-pointer shadow-2xs ${
            act.accent
              ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50"
              : "bg-card/70 border-border/50 text-foreground/85 hover:bg-accent/40 hover:text-foreground"
          }`}
        >
          {act.icon}
          <span>{act.label}</span>
        </button>
      ))}
    </div>
  );
}
