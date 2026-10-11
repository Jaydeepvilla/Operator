"use client";

import React from "react";
import { RotateCcw, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/shared/button";
import { OperatorAvatarOrb } from "./WidgetIcons3D";
import { OPERATOR_WIDGET_EVENTS } from "@/lib/constants/widget-events";

interface WidgetHeaderProps {
  companyName: string;
  tagline?: string;
  logoUrl?: string | null;
  aiState?: "idle" | "thinking" | "responding";
  onResetConversation: () => void;
  onClose: () => void;
}

export function WidgetHeader({
  companyName,
  tagline = "AI Receptionist",
  logoUrl,
  aiState = "idle",
  onResetConversation,
  onClose,
}: WidgetHeaderProps) {
  return (
    <header className="relative z-30 flex items-center justify-between px-4 py-3 border-b border-border/40 bg-background/80 backdrop-blur-md select-none shrink-0 transition-colors">
      {/* Identity & Presence */}
      <div className="flex items-center gap-3 min-w-0">
        {logoUrl ? (
          <div className="relative shrink-0 w-[38px] h-[38px] rounded-full overflow-hidden border border-border/60 bg-muted/30 shadow-inner flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt={companyName || "Brand Logo"}
              className="w-full h-full object-cover"
              onError={(e) => {
                // If the image fails to load, hide image and show fallback
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${
                aiState === "thinking"
                  ? "bg-amber-400 animate-ping"
                  : aiState === "responding"
                  ? "bg-primary animate-pulse"
                  : "bg-emerald-500"
              }`}
            />
          </div>
        ) : (
          <OperatorAvatarOrb state={aiState} size={38} />
        )}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-semibold tracking-tight text-foreground truncate max-w-[170px]">
              {companyName || "Operator AI"}
            </h2>
            <span
              title="Verified 24/7 AI Receptionist"
              className="inline-flex items-center text-primary"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">{tagline || "Online · 24/7 Receptionist"}</span>
          </div>
        </div>
      </div>

      {/* Header Controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onResetConversation}
          title="Restart conversation"
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          aria-label="Restart conversation"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onClose}
          title="Close chat"
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          aria-label="Close widget"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
