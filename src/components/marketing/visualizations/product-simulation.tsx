"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare,
  Calendar as CalendarIcon,
  Bell,
  Shield,
  Sparkles,
  CheckCircle2,
  Lock,
  RotateCcw,
  Bot,
  User,
  Clock,
  ArrowUpRight,
  Activity,
  Check,
  Zap,
  Globe,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "customer" | "ai";
  text: string;
  timestamp: string;
  isTyping?: boolean;
}

interface SimulationPhase {
  phaseKey: "receiving" | "checking" | "options" | "selecting" | "booked" | "email" | "done";
  progress: number;
  label: string;
  step: string;
  calendarStatus: "available" | "checking" | "booked";
  calendarSlot: string;
  callCount: number;
  hasNotification: boolean;
}

const PHASE_MAP: Record<string, SimulationPhase> = {
  idle: {
    phaseKey: "receiving",
    progress: 10,
    label: "Standby / Awaiting Inquiry",
    step: "Listening on Web & Telephony channels",
    calendarStatus: "available",
    calendarSlot: "Friday 2:00 PM • Open",
    callCount: 46,
    hasNotification: false,
  },
  receiving: {
    phaseKey: "receiving",
    progress: 25,
    label: "Intent Recognition Active",
    step: "Parsing legal intake & time preference",
    calendarStatus: "available",
    calendarSlot: "Friday 2:00 PM • Open",
    callCount: 46,
    hasNotification: false,
  },
  checking: {
    phaseKey: "checking",
    progress: 45,
    label: "Real-time CalDAV Query",
    step: "Querying Google Workspace & Outlook sync",
    calendarStatus: "checking",
    calendarSlot: "Checking availability...",
    callCount: 46,
    hasNotification: false,
  },
  options: {
    phaseKey: "options",
    progress: 60,
    label: "Slot Selection Proposed",
    step: "Dispatched 2 available windows to caller",
    calendarStatus: "available",
    calendarSlot: "2 Slots Available: 2:00 PM, 4:30 PM",
    callCount: 46,
    hasNotification: false,
  },
  selecting: {
    phaseKey: "selecting",
    progress: 75,
    label: "Holding 2:00 PM Slot",
    step: "Applying temporary 10-minute hold lock",
    calendarStatus: "checking",
    calendarSlot: "Holding 2:00 PM slot...",
    callCount: 46,
    hasNotification: false,
  },
  booked: {
    phaseKey: "booked",
    progress: 90,
    label: "Event Created & Synced",
    step: "Google Calendar webhook confirmed",
    calendarStatus: "booked",
    calendarSlot: "Confirmed • Friday 2:00 PM",
    callCount: 47,
    hasNotification: true,
  },
  email: {
    phaseKey: "email",
    progress: 95,
    label: "CRM Contact Enrichment",
    step: "Generating lead card for intake attorney",
    calendarStatus: "booked",
    calendarSlot: "Confirmed • Friday 2:00 PM",
    callCount: 47,
    hasNotification: true,
  },
  done: {
    phaseKey: "done",
    progress: 100,
    label: "Workflow Completed (Sync Safe)",
    step: "Calendar invite, SMS & CRM intake locked",
    calendarStatus: "booked",
    calendarSlot: "Booked (Mark B. • 2:00 PM)",
    callCount: 47,
    hasNotification: true,
  },
};

const SIMULATION_SCRIPT = [
  {
    sender: "customer" as const,
    text: "Hi, I need to book a case evaluation consultation for tomorrow afternoon if possible.",
    delay: 1200,
    phase: "receiving",
    time: "2:01 PM",
  },
  {
    sender: "ai" as const,
    text: "Hello! Let me check our calendar availability for a consultation tomorrow afternoon...",
    delay: 1800,
    phase: "checking",
    time: "2:01 PM",
  },
  {
    sender: "ai" as const,
    text: "I have a consultation slot open tomorrow at 2:00 PM or 4:30 PM. Which one would you prefer?",
    delay: 1700,
    phase: "options",
    time: "2:02 PM",
  },
  {
    sender: "customer" as const,
    text: "2:00 PM works great. Can you sync this to my calendar?",
    delay: 1400,
    phase: "selecting",
    time: "2:02 PM",
  },
  {
    sender: "ai" as const,
    text: "Perfect! I've booked your consultation for tomorrow at 2:00 PM and synced it. Please provide your email for confirmation.",
    delay: 1800,
    phase: "booked",
    time: "2:03 PM",
  },
  {
    sender: "customer" as const,
    text: "Sure, it is mark.b@example.com.",
    delay: 1100,
    phase: "email",
    time: "2:03 PM",
  },
  {
    sender: "ai" as const,
    text: "Got it! Your confirmation email and calendar invite have been sent. I have also qualified your case details for the intake team.",
    delay: 1800,
    phase: "done",
    time: "2:04 PM",
  },
];

/* ─── Chrome Browser Window Header ─── */
function BrowserHeader({ onReset, isRunning }: { onReset: () => void; isRunning: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-card/90 dark:bg-zinc-900/90 border-b border-border/50 backdrop-blur-md">
      {/* macOS Traffic Lights */}
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-[#ff5f56] shadow-inner ring-1 ring-black/10" />
        <span className="h-3 w-3 rounded-full bg-[#ffbd2e] shadow-inner ring-1 ring-black/10" />
        <span className="h-3 w-3 rounded-full bg-[#27c93f] shadow-inner ring-1 ring-black/10" />
        
        {/* Mock Tab */}
        <div className="hidden sm:flex items-center gap-2 ml-4 px-3 py-1 rounded-lg bg-background/80 dark:bg-zinc-800/80 border border-border/40 text-xs text-foreground/80 font-medium">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Operator Live Demo</span>
        </div>
      </div>

      {/* Modern Address Bar */}
      <div className="flex-1 max-w-xs sm:max-w-md mx-3 sm:mx-6">
        <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-background/60 dark:bg-zinc-950/60 border border-border/50 shadow-inner text-xs font-mono text-muted-foreground">
          <Lock className="h-3 w-3 text-emerald-500" />
          <span className="text-foreground/90 font-medium">operator.ai</span>
          <span className="text-muted-foreground/60 hidden sm:inline">/live-demo/receptionist</span>
        </div>
      </div>

      {/* Reset & Status Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted transition-colors border border-border/40 cursor-pointer"
          title="Replay simulation"
        >
          <RotateCcw className="h-3 w-3" />
          <span className="hidden md:inline">Replay</span>
        </button>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="hidden sm:inline">Live Engine</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Left Pane: Conversational Chat Studio ─── */
function ChatPane({
  chatLog,
  chatContainerRef,
}: {
  chatLog: ChatMessage[];
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex flex-col justify-between h-[480px] bg-background/95 dark:bg-zinc-950/95 p-5 sm:p-6 relative">
      {/* Pane Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/25 ring-1 ring-white/20">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground tracking-tight">Operator AI Receptionist</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary uppercase tracking-wide">
                Autonomous
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Session #4819 • Lead Intake & Booking</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground font-mono bg-muted/40 px-2.5 py-1 rounded-md border border-border/40">
          <Activity className="h-3 w-3 text-emerald-500 animate-pulse" />
          <span>380ms Latency</span>
        </div>
      </div>

      {/* Conversation Thread with Gradient Fade Mask */}
      <div
        ref={chatContainerRef}
        role="log"
        aria-live="polite"
        className="flex-1 overflow-y-auto py-4 space-y-4 pr-1.5 [mask-image:linear-gradient(to_bottom,transparent_0%,black_24px,black_100%)] scroll-smooth"
      >
        {chatLog.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-6 space-y-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
              <MessageSquare className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">Connecting to customer line...</p>
            <p className="text-xs text-muted-foreground/70">Simulating incoming consultation inquiry</p>
          </div>
        ) : (
          chatLog.map((turn) => {
            const isAI = turn.sender === "ai";
            return (
              <div
                key={turn.id}
                className={`flex gap-3 items-end transition-all duration-300 ${
                  isAI ? "justify-end" : "justify-start"
                }`}
              >
                {!isAI && (
                  <div className="h-7 w-7 rounded-full bg-muted border border-border/60 flex items-center justify-center text-foreground font-semibold text-xs shrink-0 shadow-xs">
                    MB
                  </div>
                )}

                <div className={`flex flex-col max-w-[85%] sm:max-w-[78%] ${isAI ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {isAI ? "Operator Concierge" : "Mark B."}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50 font-mono">{turn.timestamp}</span>
                  </div>

                  {turn.isTyping ? (
                    <div className="rounded-2xl rounded-tr-xs px-4 py-3 bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-300 shadow-sm flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  ) : (
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm transition-all duration-200 ${
                        isAI
                          ? "bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 text-white rounded-tr-xs shadow-purple-500/15 ring-1 ring-white/20 font-normal"
                          : "bg-card dark:bg-zinc-900 border border-border/80 text-foreground rounded-tl-xs"
                      }`}
                    >
                      {turn.text}
                    </div>
                  )}
                </div>

                {isAI && (
                  <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs shrink-0 shadow-sm ring-1 ring-white/20">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pane Footer */}
      <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 h-3">
            <span className="w-0.5 h-3 bg-primary animate-[pulse_1s_ease-in-out_infinite]" />
            <span className="w-0.5 h-2 bg-primary/70 animate-[pulse_1.2s_ease-in-out_infinite]" />
            <span className="w-0.5 h-3.5 bg-primary animate-[pulse_0.8s_ease-in-out_infinite]" />
            <span className="w-0.5 h-1.5 bg-primary/60 animate-[pulse_1.1s_ease-in-out_infinite]" />
          </div>
          <span className="font-medium text-foreground/80">Voice AI + Chat Channel</span>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground/80">Zero Human Hand-off Required</span>
      </div>
    </div>
  );
}

/* ─── Right Pane: Live Calendar & CRM Engine ─── */
function MetricsPane({ phase }: { phase: SimulationPhase }) {
  return (
    <div className="flex flex-col justify-between h-[480px] bg-muted/30 dark:bg-zinc-900/40 p-5 sm:p-6 border-t lg:border-t-0 lg:border-l border-border/50 backdrop-blur-md">
      {/* Pane Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-xs">
            <CalendarIcon className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground tracking-tight">Real-time State & CRM</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                Sync Active
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Autonomous Calendar Engine</p>
          </div>
        </div>

        {/* Bell with Ping */}
        <div className="relative p-1.5 rounded-lg bg-background/80 dark:bg-zinc-800/80 border border-border/40 shadow-xs">
          <Bell
            className={`h-4 w-4 text-muted-foreground transition-transform ${
              phase.hasNotification ? "text-purple-500 animate-[bounce_1s_infinite]" : ""
            }`}
          />
          {phase.hasNotification && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
          )}
        </div>
      </div>

      {/* Cards Stack */}
      <div className="space-y-3.5 my-auto py-2">
        {/* Card 1: AI Workflow Processing Stage */}
        <div className="rounded-2xl border border-border/60 bg-background/90 dark:bg-zinc-950/80 p-4 shadow-sm space-y-2.5 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
                AI Workflow Execution
              </span>
            </div>
            <span className="text-xs font-mono font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {phase.progress}%
            </span>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground tracking-tight">{phase.label}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{phase.step}</p>
          </div>

          {/* Smooth Progress Bar */}
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${phase.progress}%` }}
            />
          </div>
        </div>

        {/* Card 2: Simulated Google Calendar & CalDAV Card */}
        <div className="rounded-2xl border border-border/60 bg-background/90 dark:bg-zinc-950/80 p-4 shadow-sm space-y-3 transition-all duration-300">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <CalendarIcon className="h-3 w-3" />
              </div>
              <span className="text-xs font-medium text-foreground">Google Calendar Sync</span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium transition-all duration-300 ${
                phase.calendarStatus === "booked"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold"
                  : phase.calendarStatus === "checking"
                  ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 animate-pulse"
                  : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
              }`}
            >
              {phase.calendarStatus === "booked" ? "✓ Confirmed & Locked" : phase.calendarStatus === "checking" ? "Checking Slot..." : "Live Slot Available"}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <p className="font-medium text-foreground text-sm">Consultation - Mark B.</p>
              <p className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Tomorrow, Friday • 2:00 PM – 2:45 PM
              </p>
            </div>
            <div className="text-right font-mono text-[11px] text-muted-foreground">
              <span>{phase.calendarSlot}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Metrics Counters */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border/60 bg-background/90 dark:bg-zinc-950/80 p-3.5 shadow-sm">
            <span className="text-[11px] uppercase tracking-wider font-mono font-medium text-muted-foreground">
              Calls Handled Today
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <p className="text-2xl font-bold font-mono text-foreground tracking-tight transition-all duration-300">
                {phase.callCount}
              </p>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                +14% today
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/90 dark:bg-zinc-950/80 p-3.5 shadow-sm">
            <span className="text-[11px] uppercase tracking-wider font-mono font-medium text-muted-foreground">
              Intake Precision
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <p className="text-2xl font-bold font-mono text-emerald-500 tracking-tight">
                99.8%
              </p>
              <span className="text-[11px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                Zero Misses
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pane Footer */}
      <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground font-mono">
        <span className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span>SOC2 Type II • HIPAA Safe</span>
        </span>
        <span className="text-muted-foreground/70">Sync: Real-time</span>
      </div>
    </div>
  );
}

export function ProductSimulation() {
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [currentPhase, setCurrentPhase] = useState<SimulationPhase>(PHASE_MAP.idle);
  const [simStep, setSimStep] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const resetSimulation = useCallback(() => {
    setChatLog([]);
    setCurrentPhase(PHASE_MAP.idle);
    setSimStep(0);
    setIsRunning(true);
  }, []);

  // Auto-scroll chat smoothly
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [chatLog]);

  // Simulation execution loop
  useEffect(() => {
    if (!isRunning) return;

    if (simStep >= SIMULATION_SCRIPT.length) {
      // Loop after completion with graceful delay
      const loopTimer = setTimeout(() => {
        resetSimulation();
      }, 9000);
      return () => clearTimeout(loopTimer);
    }

    const scriptItem = SIMULATION_SCRIPT[simStep];

    const timer = setTimeout(() => {
      if (scriptItem.sender === "ai") {
        const typingId = `typing-${Date.now()}`;
        setChatLog((prev) => [
          ...prev,
          {
            id: typingId,
            sender: "ai",
            text: "...",
            timestamp: scriptItem.time,
            isTyping: true,
          },
        ]);

        const aiResponseTimer = setTimeout(() => {
          setChatLog((prev) => {
            const list = [...prev];
            const lastIdx = list.length - 1;
            if (lastIdx >= 0) {
              list[lastIdx] = {
                id: `ai-${Date.now()}`,
                sender: "ai",
                text: scriptItem.text,
                timestamp: scriptItem.time,
              };
            }
            return list;
          });

          const newPhase = PHASE_MAP[scriptItem.phase] || PHASE_MAP.idle;
          setCurrentPhase(newPhase);
          setSimStep((prev) => prev + 1);
        }, 900);

        return () => clearTimeout(aiResponseTimer);
      } else {
        setChatLog((prev) => [
          ...prev,
          {
            id: `user-${Date.now()}`,
            sender: "customer",
            text: scriptItem.text,
            timestamp: scriptItem.time,
          },
        ]);

        const newPhase = PHASE_MAP[scriptItem.phase] || PHASE_MAP.idle;
        setCurrentPhase(newPhase);
        setSimStep((prev) => prev + 1);
      }
    }, scriptItem.delay);

    return () => clearTimeout(timer);
  }, [simStep, isRunning, resetSimulation]);

  return (
    <div className="relative mx-auto max-w-5xl w-full">
      {/* Radiant Background Aura / Glow */}
      <div className="absolute -inset-1 sm:-inset-2 rounded-[2.5rem] bg-gradient-to-r from-indigo-500/20 via-purple-500/15 to-pink-500/20 blur-2xl opacity-60 dark:opacity-40 pointer-events-none -z-10" />

      {/* ── Browser Window Shell Container ── */}
      <div className="relative rounded-3xl border border-border/70 dark:border-white/10 bg-card/90 dark:bg-zinc-900/90 shadow-[0_20px_70px_-15px_rgba(99,102,241,0.18),0_0_1px_1px_rgba(0,0,0,0.06)] dark:shadow-[0_25px_80px_-20px_rgba(99,102,241,0.3),0_0_0_1px_rgba(255,255,255,0.08)] overflow-hidden backdrop-blur-xl">
        <BrowserHeader onReset={resetSimulation} isRunning={isRunning} />

        {/* ── Two-pane grid layout inside browser window ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border/60">
          <ChatPane chatLog={chatLog} chatContainerRef={chatContainerRef} />
          <MetricsPane phase={currentPhase} />
        </div>
      </div>
    </div>
  );
}