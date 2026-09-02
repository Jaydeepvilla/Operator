"use client";

import React, { useState } from "react";
import { Mic, FileText, Brain, Database, CalendarDays, MessageSquareText } from "lucide-react";

interface PipelineStep {
  title: string;
  subtitle: string;
  metric: string;
  metricLabel: string;
  desc: string;
  icon: React.ReactNode;
  glowColor: string;
}

const PIPELINE: PipelineStep[] = [
  {
    title: "1. Audio Ingestion",
    subtitle: "Low-latency SIP stream",
    metric: "< 80ms",
    metricLabel: "audio stream latency",
    desc: "A client dials your number. Twilio connects the call directly to Operator's low-latency audio stream, maintaining a crystal clear bidirectional voice bridge.",
    icon: <Mic className="h-4 w-4" />,
    glowColor: "rgba(6, 182, 212, 0.4)" // Cyan
  },
  {
    title: "2. Transcription",
    subtitle: "Real-time speech-to-text",
    metric: "< 120ms",
    metricLabel: "transcription speed",
    desc: "Our real-time speech engine converts spoken client sentences into structured text, auto-detecting languages and filtering out background noise.",
    icon: <FileText className="h-4 w-4" />,
    glowColor: "rgba(59, 130, 246, 0.4)" // Blue
  },
  {
    title: "3. Semantic Brain",
    subtitle: "Intent & Context analysis",
    metric: "< 250ms",
    metricLabel: "LLM semantic reasoning",
    desc: "A custom LLM parses the text to identify user intent (booking, reschedule, price check) and evaluate sentiment guidelines.",
    icon: <Brain className="h-4 w-4" />,
    glowColor: "rgba(217, 70, 239, 0.4)" // Fuchsia
  },
  {
    title: "4. Knowledge lookup",
    subtitle: "Vector database search",
    metric: "< 45ms",
    metricLabel: "knowledge retrieval",
    desc: "The AI references your practice FAQ sheet, PDF uploads, and price lists. It extracts the exact facts needed to address the client's query.",
    icon: <Database className="h-4 w-4" />,
    glowColor: "rgba(245, 158, 11, 0.4)" // Amber
  },
  {
    title: "5. Calendar Booking",
    subtitle: "Google/Outlook slot lock",
    metric: "< 350ms",
    metricLabel: "calendar sync completion",
    desc: "The booking engine queries your live calendar, checks buffer configurations, locks the selected appointment slot, and updates availability.",
    icon: <CalendarDays className="h-4 w-4" />,
    glowColor: "rgba(16, 185, 129, 0.4)" // Emerald
  },
  {
    title: "6. Text Confirmation",
    subtitle: "Automated SMS notification",
    metric: "Instant",
    metricLabel: "SMS dispatcher delay",
    desc: "Stripe pre-payments are processed if applicable, and an automated SMS confirmation with coordinate links is dispatched immediately to the caller.",
    icon: <MessageSquareText className="h-4 w-4" />,
    glowColor: "rgba(99, 102, 241, 0.4)" // Indigo
  }
];

export function VoiceAiFlow() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const activeStep = hoveredIdx !== null ? PIPELINE[hoveredIdx] : null;

  return (
    <div className="w-full flex flex-col gap-space-4">
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.15; }
          50% { transform: scale(1.08); opacity: 0.4; }
          100% { transform: scale(0.95); opacity: 0.15; }
        }
        .glow-pulse-ring {
          animation: pulse-ring 2.5s ease-in-out infinite;
        }
      `}</style>

      {/* Grid of Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-3">
        {PIPELINE.map((step, idx) => {
          const isActive = hoveredIdx === idx;
          return (
            <div
              key={idx}
              className={`rounded-xl border p-space-4 cursor-pointer select-none transition-all duration-300 flex items-center gap-space-3.5 hover:-translate-y-0.5 relative overflow-hidden ${
                isActive
                  ? "bg-[hsl(var(--background)/0.7)] border-emerald-500/30 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.15)]"
                  : "bg-[hsl(var(--foreground)/0.02)] border-[hsl(var(--foreground)/0.1)]"
              }`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Subtle top indicator bar representing step highlight */}
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-emerald-500/70" />
              )}

              {/* Icon badge */}
              <div
                className={`h-9 w-9 rounded-lg border flex items-center justify-center shrink-0 transition-all duration-300 relative`}
                style={{
                  borderColor: isActive ? "rgba(16, 185, 129, 0.3)" : "var(--color-border-subtle)",
                  background: isActive ? "rgba(16, 185, 129, 0.08)" : "var(--color-bg-layer-1)",
                  color: isActive ? "#10b981" : "hsl(var(--foreground) / 0.4)"
                }}
              >
                {isActive && (
                  <span className="absolute -inset-0.5 rounded-lg border border-emerald-500/30 animate-ping opacity-35" />
                )}
                {step.icon}
              </div>

              {/* Step Title Content */}
              <div className="flex-1 min-w-0 text-left">
                <h4 className={`text-body-sm font-semibold transition-colors duration-300 ${isActive ? "text-[hsl(var(--foreground))] font-bold" : "text-[hsl(var(--foreground)/0.65)]"}`}>
                  {step.title}
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate leading-relaxed">
                  {step.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Details Box Strip (Borderless Layout) */}
      <div
        className={`w-full p-space-4 flex flex-col md:flex-row items-center justify-between gap-space-4 relative overflow-hidden transition-all duration-500 min-h-[76px] border-t ${
          activeStep !== null 
            ? "border-emerald-500/30 bg-[hsl(var(--foreground)/0.03)]" 
            : "border-[hsl(var(--foreground)/0.1)] bg-[hsl(var(--foreground)/0.02)]"
        }`}
      >
        {/* Dynamic backdrop glow blob representing active stage */}
        <div
          className="absolute -right-12 -bottom-12 w-28 h-28 rounded-full blur-[36px] pointer-events-none transition-all duration-500 opacity-20"
          style={{
            backgroundColor: activeStep ? "#10b981" : "rgba(122, 90, 248, 0.4)"
          }}
        />

        {/* Content Details Area */}
        <div className="flex-1 flex flex-col justify-center text-left space-y-space-0.5 z-10 relative">
          <span
            className="text-[8px] uppercase tracking-widest font-mono font-bold transition-colors duration-300"
            style={{
              color: activeStep ? "#10b981" : "hsl(var(--primary))"
            }}
          >
            {activeStep ? `Stage 0${hoveredIdx! + 1} • Diagnostics` : "Voice AI processing pipeline"}
          </span>
          <p className="text-[11px] text-[hsl(var(--foreground)/0.6)] leading-normal max-w-2xl transition-all duration-300 font-medium">
            {activeStep
              ? activeStep.desc
              : "Hover over any stage above to trace how real-time calls are ingested, transcribed, and structured by Operator Voice AI in milliseconds."}
          </p>
        </div>

        {/* Metric Area */}
        <div className="flex md:flex-col items-center md:items-end justify-center shrink-0 md:pl-space-4 md:border-l border-[hsl(var(--foreground)/0.1)] min-w-[144px] z-10 relative text-center md:text-right">
          <span className="text-[8px] uppercase tracking-wider font-mono text-slate-500 font-semibold">
            {activeStep ? "processing latency" : "total pipeline delay"}
          </span>
          <span
            className="text-heading-md font-mono leading-none font-extrabold tracking-tight transition-all duration-300 my-0.5"
            style={{
              color: activeStep ? "#10b981" : "hsl(var(--primary))",
              textShadow: activeStep 
                ? "0 0 10px rgba(16, 185, 129, 0.15)" 
                : "0 0 10px rgba(122, 90, 248, 0.1)"
            }}
          >
            {activeStep ? activeStep.metric : "< 900ms"}
          </span>
          <span className="text-[9px] text-slate-500 font-medium transition-colors duration-300">
            {activeStep ? activeStep.metricLabel : "end-to-end response time"}
          </span>
        </div>
      </div>
    </div>
  );
}
