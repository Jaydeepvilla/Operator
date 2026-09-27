"use client";

import React, { useMemo } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import { Calendar3DIcon, Services3DIcon, Pricing3DIcon, Clock3DIcon } from "./WidgetIcons3D";

interface WidgetWelcomeProps {
  companyName: string;
  welcomeMessage?: string;
  starterQuestions?: string[];
  onSelectIntent: (intent: "book" | "services" | "pricing" | "hours" | "question", text?: string) => void;
}

export function WidgetWelcome({
  companyName,
  welcomeMessage,
  starterQuestions = [],
  onSelectIntent,
}: WidgetWelcomeProps) {
  // Dynamic time-of-day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning 👋";
    if (hour < 17) return "Good afternoon ☀️";
    return "Good evening 🌙";
  }, []);

  const defaultQuestions = [
    "What services do you offer?",
    "How do I schedule an appointment?",
    "What are your business hours?",
  ];

  const questionsToShow = starterQuestions && starterQuestions.length > 0 ? starterQuestions : defaultQuestions;

  return (
    <div className="flex flex-col gap-4 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Welcome Banner */}
      <div className="relative rounded-2xl p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-1">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          <span>AI Reception Desk</span>
        </div>
        <h3 className="text-base font-semibold tracking-tight text-foreground">
          {greeting}
        </h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {welcomeMessage || `Welcome to ${companyName || "our business"}. How can I assist you today?`}
        </p>
      </div>

      {/* 3D Action Cards */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground px-1">
          Instant Actions
        </span>

        {/* Action 1: Book Appointment */}
        <button
          type="button"
          onClick={() => onSelectIntent("book")}
          className="group flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card hover:bg-accent/40 hover:border-primary/40 shadow-xs hover:shadow-sm transition-all duration-200 text-left cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 group-hover:scale-105 transition-transform">
              <Calendar3DIcon size={22} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                Book an Appointment
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                Real-time openings with instant booking
              </div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>

        {/* Action 2: View Services & Rates */}
        <button
          type="button"
          onClick={() => onSelectIntent("services")}
          className="group flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card hover:bg-accent/40 hover:border-primary/40 shadow-xs hover:shadow-sm transition-all duration-200 text-left cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 group-hover:scale-105 transition-transform">
              <Services3DIcon size={22} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                Explore Services & Pricing
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                Browse our treatments, durations & fees
              </div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>

        {/* Action 3: Business Hours & Info */}
        <button
          type="button"
          onClick={() => onSelectIntent("hours")}
          className="group flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card hover:bg-accent/40 hover:border-primary/40 shadow-xs hover:shadow-sm transition-all duration-200 text-left cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 group-hover:scale-105 transition-transform">
              <Clock3DIcon size={22} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                Business Hours & Details
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                Opening schedule, location & policies
              </div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>
      </div>

      {/* Suggested Starter Questions */}
      {questionsToShow.length > 0 && (
        <div className="flex flex-col gap-2 pt-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground px-1">
            Common Inquiries
          </span>
          <div className="flex flex-wrap gap-1.5">
            {questionsToShow.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectIntent("question", q)}
                className="text-xs text-left px-3 py-1.5 rounded-full border border-border/60 bg-muted/40 hover:bg-primary/10 hover:border-primary/40 text-foreground/80 hover:text-foreground transition-all cursor-pointer select-none"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
