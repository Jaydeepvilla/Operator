"use client";

import React, { useState, useEffect, useRef } from "react";
import { Stethoscope, Scissors, Scale, Home, Dumbbell, Sparkles, Bot, User, Zap, AlertTriangle, TrendingUp } from "lucide-react";
import { Badge } from "@/components/shared/badge";
import { NativeButton } from "@/components/shared/native";
import { ScrollArea } from "@/components/ui/scroll-area";

type IndustryKey = "dental" | "medical" | "salon" | "law" | "realestate" | "gym";

interface IndustryData {
  name: string;
  icon: React.ReactNode;
  challenge: string;
  solution: string;
  metrics: string;
  metricLabel: string;
  metricSub: string;
  dialogue: Array<{ speaker: "customer" | "ai"; text: string }>;
  channel: string;
}

const INDUSTRIES_DATA: Record<IndustryKey, IndustryData> = {
  dental: {
    name: "Dental Clinics",
    icon: <Stethoscope className="h-4 w-4" />,
    challenge: "High volume of emergency appointments and checkup inquiries outside working hours, leading to patient leak to other local providers.",
    solution: "AI integrates with Google Calendar or Dentrix to triage emergency cases, verify dental insurance coverage limits, and book cleanings instantly.",
    metrics: "+40%",
    metricLabel: "increase in checkups booked",
    metricSub: "vs. traditional phone-only intake",
    dialogue: [
      { speaker: "customer", text: "Hi, I have a chipped tooth and need to book an emergency slot tomorrow." },
      { speaker: "ai", text: "I can help with that. Is this causing severe pain or bleeding? I have an emergency cleaning slot open tomorrow at 10:00 AM with Dr. Mitchell. Shall I book it?" },
      { speaker: "customer", text: "Yes please, 10:00 AM works. Do you accept Delta Dental?" },
      { speaker: "ai", text: "Yes, we accept Delta Dental PPO. I have secured your slot. A confirmation text is on its way!" }
    ],
    channel: "Phone Call"
  },
  medical: {
    name: "Medical Clinics",
    icon: <Stethoscope className="h-4 w-4" />,
    challenge: "Long hold times on phone calls triage patients slowly and tie up receptionist staff, causing administrative bottlenecks.",
    solution: "The AI triages incoming patient symptom severity, answers generic practice FAQs (parking, copays), and schedules telehealth/in-person visits.",
    metrics: "-60%",
    metricLabel: "reduction in phone load",
    metricSub: "freeing 4+ hours of staff time daily",
    dialogue: [
      { speaker: "customer", text: "Hello, I need to schedule a follow-up consultation for my prescription renewal." },
      { speaker: "ai", text: "Hello! I can guide you through that. Our next available slot for a telehealth consultation is Wednesday at 2:00 PM. Would that suit you?" },
      { speaker: "customer", text: "Yes, that works. What copay applies?" },
      { speaker: "ai", text: "Prescription follow-ups generally incur a standard $25 copay, depending on your copay structure. I have booked that for Wednesday at 2:00 PM." }
    ],
    channel: "Web Chat"
  },
  salon: {
    name: "Salons & Spas",
    icon: <Scissors className="h-4 w-4" />,
    challenge: "Stylists missing calls mid-treatment or appointments getting canceled last minute without quick rescheduling.",
    solution: "AI schedules treatments 24/7, handles rescheduling flow directly via WhatsApp, and collects deposits to avoid no-shows.",
    metrics: "94%",
    metricLabel: "salon calendar utilization",
    metricSub: "up from 68% industry average",
    dialogue: [
      { speaker: "customer", text: "Hi! Can I book a balayage and haircut for this Saturday afternoon?" },
      { speaker: "ai", text: "Hi! I have openings on Saturday at 1:30 PM with senior stylist Priya. The balayage session takes about 3 hours." },
      { speaker: "customer", text: "Perfect. Book that for me." },
      { speaker: "ai", text: "Great! I have reserved Saturday at 1:30 PM. To confirm, I am sending a secure link to collect the standard $50 booking deposit." }
    ],
    channel: "WhatsApp"
  },
  law: {
    name: "Law Firms",
    icon: <Scale className="h-4 w-4" />,
    challenge: "Unqualified case leads calling in and taking up consultation hours of valuable billable attorney time.",
    solution: "AI qualifications intakes, questions lead intent, ranks legal case urgency, maps eligibility, and schedules paid consultations.",
    metrics: "3.5×",
    metricLabel: "more qualified client intakes",
    metricSub: "with zero additional headcount",
    dialogue: [
      { speaker: "customer", text: "Hi, I need a consultation regarding a landlord contract dispute." },
      { speaker: "ai", text: "I can assist. Is this dispute in California? Also, have you already received a written eviction notice?" },
      { speaker: "customer", text: "Yes, in San Francisco, and yes, received it yesterday." },
      { speaker: "ai", text: "Understood, this is urgent. I have routed your case details to our tenancy expert, and I can book an intake call for tomorrow at 11:00 AM." }
    ],
    channel: "Phone Call"
  },
  realestate: {
    name: "Real Estate",
    icon: <Home className="h-4 w-4" />,
    challenge: "Buyers inquiring about listings at night and moving on to other listings if agent doesn't reply instantly.",
    solution: "AI answers property spec sheets, schedules viewing appointments, and collects buyer criteria (budget, pre-approval status).",
    metrics: "+45%",
    metricLabel: "lead-to-viewing conversion",
    metricSub: "capturing after-hours interest",
    dialogue: [
      { speaker: "customer", text: "Hi, is 142 Pine Street still available for a tour this week?" },
      { speaker: "ai", text: "Yes! 142 Pine St is active. I can schedule a tour on Thursday at 4:00 PM or Saturday at 11:00 AM. Which do you prefer?" },
      { speaker: "customer", text: "Thursday at 4:00 PM is perfect. Is there parking?" },
      { speaker: "ai", text: "Yes, the property includes a 2-car attached garage. I have confirmed your tour with agent Sarah for Thursday at 4:00 PM." }
    ],
    channel: "SMS"
  },
  gym: {
    name: "Gyms & Fitness",
    icon: <Dumbbell className="h-4 w-4" />,
    challenge: "Missing membership registrations and class booking inquiries from busy prospects outside gym hours.",
    solution: "AI books demo classes, answers pricing structure inquiries, and captures membership leads automatically.",
    metrics: "+28%",
    metricLabel: "increase in new trial sign-ups",
    metricSub: "with zero manual follow-up",
    dialogue: [
      { speaker: "customer", text: "Hello, how much is your monthly membership and can I try a class?" },
      { speaker: "ai", text: "Hello! Our individual membership is $65/month. I can sign you up for a free guest pass to our HIIT class tomorrow at 6:00 PM. Sound good?" },
      { speaker: "customer", text: "Awesome, let's do the HIIT class tomorrow at 6:00 PM." },
      { speaker: "ai", text: "Done! I have created your guest pass for tomorrow at 6:00 PM. Just show the SMS code at the front desk when you arrive!" }
    ],
    channel: "Instagram DM"
  }
};

const INDUSTRY_KEYS = Object.keys(INDUSTRIES_DATA) as IndustryKey[];

export function InteractiveIndustryExplorer() {
  const [activeTab, setActiveTab] = useState<IndustryKey>("dental");
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const dialogueContainerRef = useRef<HTMLDivElement>(null);

  const data = INDUSTRIES_DATA[activeTab];

  // Typewriter-style message reveal
  useEffect(() => {
    setVisibleMessages(0);
    setIsTyping(true);

    const timers: NodeJS.Timeout[] = [];
    data.dialogue.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          setVisibleMessages(i + 1);
          if (i === data.dialogue.length - 1) setIsTyping(false);
        }, (i + 1) * 700)
      );
    });

    return () => timers.forEach(clearTimeout);
  }, [activeTab, data.dialogue]);

  // Auto-scroll dialogue
  useEffect(() => {
    if (dialogueContainerRef.current) {
      dialogueContainerRef.current.scrollTo({
        top: dialogueContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [visibleMessages]);

  return (
    <div className="relative mx-auto max-w-5xl w-full">
      {/* Scoped keyframes */}
      <style>{`
        @keyframes ie-fade-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ie-typing-dot{0%,80%,100%{opacity:.3;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}
        @keyframes ie-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        .ie-msg-enter{animation:ie-fade-up .45s cubic-bezier(.22,1,.36,1) both}
        .ie-typing-dot{animation:ie-typing-dot 1.4s ease-in-out infinite}
      `}</style>

      {/* Outer glow */}
      <div className="absolute -inset-px radius-2xl bg-gradient-to-b from-primary/12 via-[hsl(280_75%_55%/0.06)] to-transparent pointer-events-none" />

      <div className="relative radius-2xl border border-[hsl(var(--foreground)/0.06)] bg-card overflow-hidden">

        {/* ━━━ Industry Tab Bar ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.015)]">
          <div className="grid grid-cols-3 sm:grid-cols-6">
            {INDUSTRY_KEYS.map((key) => {
              const ind = INDUSTRIES_DATA[key];
              const isActive = activeTab === key;
              return (
                <NativeButton
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={[
                    "relative flex flex-col items-center gap-space-1.5 py-space-4 px-space-2 text-caption transition-colors duration-200 cursor-pointer select-none",
                    "border-r border-[hsl(var(--foreground)/0.04)] last:border-r-0",
                    isActive
                      ? "text-primary bg-primary/[0.04]"
                      : "text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--foreground)/0.025)]"
                  ].join(" ")}
                >
                  {/* Bottom active bar */}
                  <span
                    className="absolute bottom-space-0 left-space-3 right-space-3 h-0.5 radius-full bg-primary transition-opacity duration-200"
                    style={{ opacity: isActive ? 1 : 0 }}
                  />

                  {/* Icon container */}
                  <span className={[
                    "flex items-center justify-center h-7 w-7 radius-lg transition-colors duration-200",
                    isActive ? "bg-primary/10" : ""
                  ].join(" ")}>
                    {ind.icon}
                  </span>

                  <span className={[
                    "truncate w-full text-center text-caption transition-all duration-200",
                    isActive ? "font-semibold" : "font-medium"
                  ].join(" ")}>
                    {ind.name}
                  </span>
                </NativeButton>
              );
            })}
          </div>
        </div>

        {/* ━━━ Content Panel ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="p-space-6 md:p-space-8 lg:p-space-10 grid grid-cols-1 lg:grid-cols-2 gap-space-8 lg:gap-space-10 items-start">

          {/* ── Left: Info Cards ──────────────────────────────── */}
          <div className="space-y-space-4" key={activeTab}>

            {/* Header */}
            <div className="space-y-space-1">
              <Badge variant="soft" className="text-caption uppercase tracking-widest font-semibold mb-space-1">
                {data.name}
              </Badge>
              <h3 className="text-title-lg text-foreground font-semibold tracking-tight leading-snug">
                {data.name} AI Agent
              </h3>
            </div>

            {/* Challenge Card */}
            <div className="relative radius-xl border border-red-500/8 bg-red-500/[0.02] p-space-5 overflow-hidden">
              <div className="absolute top-space-0 left-space-0 w-1 h-full bg-gradient-to-b from-red-500/50 via-red-500/20 to-transparent" />
              <div className="flex items-center gap-space-2 mb-space-2 pl-space-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500/60 shrink-0" />
                <span className="text-caption uppercase tracking-widest text-red-500/70 font-semibold">Core Challenge</span>
              </div>
              <p className="text-body-sm text-muted-foreground leading-relaxed pl-space-2">
                {data.challenge}
              </p>
            </div>

            {/* Solution Card */}
            <div className="relative radius-xl border border-primary/8 bg-primary/[0.02] p-space-5 overflow-hidden">
              <div className="absolute top-space-0 left-space-0 w-1 h-full bg-gradient-to-b from-primary/50 via-primary/20 to-transparent" />
              <div className="flex items-center gap-space-2 mb-space-2 pl-space-2">
                <Zap className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                <span className="text-caption uppercase tracking-widest text-primary/70 font-semibold">AI Capabilities</span>
              </div>
              <p className="text-body-sm text-muted-foreground leading-relaxed pl-space-2">
                {data.solution}
              </p>
            </div>

            {/* Metric Card */}
            <div className="relative radius-xl border border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)] p-space-5 overflow-hidden">
              <div className="absolute inset-space-0 pointer-events-none overflow-hidden">
                <div
                  className="absolute inset-space-0 bg-gradient-to-r from-transparent via-primary/[0.04] to-transparent animate-pulse"
                />
              </div>

              <div className="relative flex items-center gap-space-4">
                {/* Metric Number */}
                <div className="flex items-center justify-center h-14 min-w-18 radius-xl bg-primary/[0.06] border border-primary/10 shrink-0 px-space-3">
                  <span className="text-2xl font-mono text-primary leading-none font-bold tracking-tight">{data.metrics}</span>
                </div>
                {/* Metric Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-space-1.5 mb-space-0.5">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <p className="text-body-sm font-semibold text-foreground leading-snug">{data.metricLabel}</p>
                  </div>
                  <p className="text-caption text-muted-foreground/60 leading-snug">{data.metricSub}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Live Chat Simulator ────────────────── */}
          <div className="relative radius-2xl border border-[hsl(var(--foreground)/0.08)] overflow-hidden bg-[hsl(var(--foreground)/0.01)]">

            {/* Top ambient glow */}
            <div className="absolute top-space-0 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.05),transparent_70%)] pointer-events-none" />

            {/* Browser Chrome */}
            <div className="flex items-center justify-between px-space-4 py-space-2.5 bg-[hsl(var(--foreground)/0.02)] border-b border-[hsl(var(--foreground)/0.06)] relative z-10">
              <div className="flex items-center gap-space-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
              </div>
              <div className="flex-1 max-w-40 mx-auto">
                <div className="w-full text-center py-space-0.5 text-caption font-mono tracking-tight text-muted-foreground/50 bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.04)] radius-md select-none">
                  chat.operator.ai
                </div>
              </div>
              <div className="w-10 hidden sm:block" />
            </div>

            {/* Chat Header */}
            <div className="flex items-center justify-between px-space-4 py-space-2.5 border-b border-[hsl(var(--foreground)/0.05)] relative z-10">
              <div className="flex items-center gap-space-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-caption uppercase font-mono font-semibold tracking-widest text-muted-foreground">
                  Live Conversation
                </span>
              </div>
              <Badge variant="soft" className="text-caption uppercase tracking-widest font-semibold">
                {data.channel}
              </Badge>
            </div>

            {/* Messages */}
            <ScrollArea
                                    ref={dialogueContainerRef}
                                    className="px-space-4 py-space-4 space-y-space-3 h-72 ie- relative z-10"
                                   horizontal={false}>
                                    {data.dialogue.map((turn, i) => {
                                      if (i >= visibleMessages) return null;
                                      const isAI = turn.speaker === "ai";
                                      return (
                                        <div
                                          key={`${activeTab}-${i}`}
                                          className={`flex gap-space-2.5 ie-msg-enter ${isAI ? "flex-row-reverse" : ""}`}
                                          style={{ animationDelay: `${i * 0.06}s` }}
                                        >
                                          {/* Avatar */}
                                          <div className={[
                                            "flex items-center justify-center h-7 w-7 radius-lg shrink-0 mt-space-0.5",
                                            isAI
                                              ? "bg-gradient-to-br from-primary to-[hsl(280_75%_55%)] text-white"
                                              : "bg-[hsl(var(--foreground)/0.06)] text-muted-foreground"
                                          ].join(" ")}>
                                            {isAI ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                                          </div>

                                          {/* Bubble */}
                                          <div className={[
                                            "max-w-4/5 radius-xl px-space-4 py-space-2.5 text-body-sm leading-relaxed",
                                            isAI
                                              ? "bg-gradient-to-br from-primary to-[hsl(280_75%_55%)] text-white radius-tr-sm"
                                              : "bg-[hsl(var(--foreground)/0.04)] border border-[hsl(var(--foreground)/0.06)] text-foreground radius-tl-sm"
                                          ].join(" ")}>
                                            {turn.text}
                                          </div>
                                        </div>
                                      );
                                    })}

                                    {/* Typing Indicator */}
                                    {isTyping && visibleMessages < data.dialogue.length && (() => {
                                      const nextIsAI = data.dialogue[visibleMessages]?.speaker === "ai";
                                      return (
                                        <div className={`flex gap-space-2.5 ie-msg-enter ${nextIsAI ? "flex-row-reverse" : ""}`}>
                                          <div className={[
                                            "flex items-center justify-center h-7 w-7 radius-lg shrink-0",
                                            nextIsAI
                                              ? "bg-gradient-to-br from-primary to-[hsl(280_75%_55%)] text-white"
                                              : "bg-[hsl(var(--foreground)/0.06)] text-muted-foreground"
                                          ].join(" ")}>
                                            {nextIsAI ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                                          </div>
                                          <div className="flex items-center gap-space-1.5 px-space-4 py-space-3 radius-xl bg-[hsl(var(--foreground)/0.04)] border border-[hsl(var(--foreground)/0.06)]">
                                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 ie-typing-dot" />
                                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 ie-typing-dot delay-200" />
                                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 ie-typing-dot delay-[400ms]" />
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </ScrollArea>

            {/* Footer */}
            <div className="border-t border-[hsl(var(--foreground)/0.05)] px-space-4 py-space-2.5 flex items-center justify-between relative z-10">
              <span className="text-caption font-mono text-muted-foreground/40 tracking-wider uppercase">
                Powered by Operator AI
              </span>
              <span className="flex items-center gap-space-1.5 text-caption font-mono text-primary/60 font-semibold tracking-wider uppercase">
                <Sparkles className="h-3 w-3" />
                System Active
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
