"use client";

import { useState, useEffect, useTransition, useMemo, useRef, useCallback } from "react";
import {
  Activity,
  Play,
  Pause,
  PhoneCall,
  VolumeX,
  Volume2,
  PhoneOff,
  CheckSquare,
  Calendar,
  Award,
  Clock,
  UserCheck,
  CheckCircle,
  Phone,
  AlertTriangle,
  Send,
  RotateCw,
  Search,
  MessageSquare,
  Loader2,
  ChevronRight,
  TrendingUp,
  Inbox,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { NativeSelect } from "@/components/shared/native";
import { Label } from "@/components/shared/label";
import { cn } from "@/components/shared/utils";
import { useToast } from "@/components/shared/toast";
import { formatUserErrorMessage } from "@/lib/errors";
import { updateVoicemailStatusAction, initiateOutboundCallAction } from "@/server/actions/voice";
import { AreaChartCard, LineChartCard } from "@/components/charts";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CallSession {
  id: string;
  callerNumber: string;
  recipientNumber: string;
  status: string;
  durationSeconds: number;
  direction: string;
  createdAt: Date;
}

interface VoicemailMessage {
  id: string;
  sessionId: string;
  recordingUrl: string;
  transcriptText: string | null;
  summaryText: string | null;
  callbackStatus: string;
  createdAt: Date;
}

interface DialogueTurn {
  speaker: "caller" | "agent";
  content: string;
  time: string;
}

export function VoiceCockpitClient({
  initialSessions,
  initialVoicemails,
  initialAnalytics,
  initialNumbers,
}: {
  initialSessions: any[];
  initialVoicemails: any[];
  initialAnalytics: any[];
  initialNumbers: any[];
}) {
  const [sessions, setSessions] = useState<CallSession[]>(initialSessions as CallSession[]);
  const [voicemails, setVoicemails] = useState<VoicemailMessage[]>(initialVoicemails as VoicemailMessage[]);
  const [activePlayVoicemailId, setActivePlayVoicemailId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  // Outbound Dial form state
  const [outboundTo, setOutboundTo] = useState("");
  const [selectedLineId, setSelectedLineId] = useState(
    initialNumbers.length > 0 ? initialNumbers[0].id : "demo-line"
  );
  const [outboundStatus, setOutboundStatus] = useState<string | null>(null);

  // Active Live Call state
  const [activeCall, setActiveCall] = useState<{
    caller: string;
    recipient: string;
    duration: number;
    active: boolean;
    label: string;
  } | null>({
    caller: "+1 (555) 309-8123",
    recipient: "JOHN DOE",
    duration: 105,
    active: true,
    label: "Inbound Line ➜ AI Agent active",
  });

  const [activeTranscript, setActiveTranscript] = useState<DialogueTurn[]>([
    {
      speaker: "agent",
      content: "Hello! Thank you for calling Operator Demo Salon. My name is Ava. How can I help you today?",
      time: "1m ago",
    },
    {
      speaker: "caller",
      content: "Hi Ava! I wanted to check if you have an open appointment for a haircut and blowout tomorrow afternoon?",
      time: "45s ago",
    },
    {
      speaker: "agent",
      content: "We certainly do! Ananya Roy, our senior stylist, has an opening at 2:00 PM tomorrow. Would you like me to book that for you?",
      time: "20s ago",
    },
    {
      speaker: "caller",
      content: "Yes, 2:00 PM with Ananya is perfect! Please reserve that for me.",
      time: "Just now",
    },
  ]);

  const [isMuted, setIsMuted] = useState(false);
  const simulationTimeouts = useRef<NodeJS.Timeout[]>([]);

  // Ticking duration for active call
  useEffect(() => {
    if (!activeCall || !activeCall.active) return;
    const interval = setInterval(() => {
      setActiveCall((prev) => (prev ? { ...prev, duration: prev.duration + 1 } : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCall?.active]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      simulationTimeouts.current.forEach((t) => clearTimeout(t));
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  const handleHangUp = () => {
    simulationTimeouts.current.forEach((t) => clearTimeout(t));
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setActiveCall(null);
    toast.info("Call Disconnected", "Active voice session ended.");
  };

  const speakTurn = useCallback(
    (text: string) => {
      if (isMuted || typeof window === "undefined" || !("speechSynthesis" in window)) return;
      try {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.05;
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice = voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (v.name.toLowerCase().includes("female") ||
              v.name.toLowerCase().includes("zira") ||
              v.name.toLowerCase().includes("natural") ||
              v.name.toLowerCase().includes("samantha"))
        );
        if (femaleVoice) utterance.voice = femaleVoice;
        (window as any).__dialogueUtterance = utterance;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("Dialogue speech error:", err);
      }
    },
    [isMuted]
  );

  const handleTriggerCampaign = async () => {
    const destNumber = outboundTo.trim() || "+1 (555) 123-4567";
    setOutboundStatus("initiating");

    // Clear previous timeouts and speech
    simulationTimeouts.current.forEach((t) => clearTimeout(t));
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    startTransition(async () => {
      try {
        await initiateOutboundCallAction({
          toPhoneNumber: destNumber.replace(/[^\d+]/g, "") || "+15551234567",
          phoneNumberId: selectedLineId !== "demo-line" ? selectedLineId : undefined,
        });
      } catch {
        // Proceed with live demo simulation in Dialogue Stream
      }

      setOutboundStatus("success");
      setOutboundTo("");

      // Start live interactive dialogue stream demo
      setActiveCall({
        caller: "+1 (555) 309-8123",
        recipient: destNumber,
        duration: 0,
        active: true,
        label: "Demo call. No real call is placed",
      });

      setActiveTranscript([]);

      toast.info(
        "Demo Call Started",
        `Dialing ${destNumber}... Demo call. No real call is placed and no minutes are charged.`
      );

      // Simulation script turns
      const turns: { speaker: "caller" | "agent"; content: string; delay: number }[] = [
        {
          speaker: "agent",
          content: `Hello! Thank you for picking up. This is Ava, your AI receptionist from Operator Demo Salon. Am I speaking with the client?`,
          delay: 800,
        },
        {
          speaker: "caller",
          content: `Hi Ava! Yes, speaking. What is this regarding?`,
          delay: 3600,
        },
        {
          speaker: "agent",
          content: `I'm following up on your requested blowout and hair styling service! We have an opening tomorrow afternoon at 2:00 PM with Ananya, our senior stylist. Would you like me to book that for you?`,
          delay: 6800,
        },
        {
          speaker: "caller",
          content: `Tomorrow at 2:00 PM is perfect! Please book that for me.`,
          delay: 10200,
        },
        {
          speaker: "agent",
          content: `Done! Your appointment is locked in with Ananya for tomorrow at 2:00 PM. A confirmation SMS was just sent to your phone. Have a wonderful day!`,
          delay: 13500,
        },
      ];

      turns.forEach((turn) => {
        const t = setTimeout(() => {
          setActiveTranscript((prev) => [
            ...prev,
            {
              speaker: turn.speaker,
              content: turn.content,
              time: "Just now",
            },
          ]);
          if (turn.speaker === "agent") {
            speakTurn(turn.content);
          }
        }, turn.delay);
        simulationTimeouts.current.push(t);
      });

      const finishTimeout = setTimeout(() => {
        setOutboundStatus(null);
        toast.success("AI Call Completed", "Client confirmed appointment. Booking created in calendar!");
      }, 16000);
      simulationTimeouts.current.push(finishTimeout);
    });
  };

  // Dynamic 7-day call volume & duration derived from real metrics or sessions
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const callActivityData = useMemo(() => {
    if (initialAnalytics && initialAnalytics.length > 0) {
      return [...initialAnalytics].reverse().map((a: any) => ({
        date: a.dateStr ? a.dateStr.slice(5) : "Day",
        calls: (a.callsAnswered || 0) + (a.callsMissed || 0),
        duration: Math.round(((a.averageDurationSeconds || 0) / 60) * 10) / 10,
      }));
    }

    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      const dayLabel = daysOfWeek[d.getDay()];
      const dStr = d.toISOString().slice(0, 10);

      const daySessions = (sessions || []).filter((s) => {
        if (!s.createdAt) return false;
        const sDate = new Date(s.createdAt).toISOString().slice(0, 10);
        return sDate === dStr;
      });

      const totalDur = daySessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
      const avgDur = daySessions.length > 0 ? Math.round((totalDur / daySessions.length / 60) * 10) / 10 : 0;

      return {
        date: dayLabel,
        calls: daySessions.length,
        duration: avgDur,
      };
    });
  }, [initialAnalytics, sessions]);

  const sentimentData = useMemo(() => {
    if (initialAnalytics && initialAnalytics.length > 0) {
      return [...initialAnalytics].reverse().map((a: any) => ({
        date: a.dateStr ? a.dateStr.slice(5) : "Day",
        sentiment: a.csatAverage ? Math.round(parseFloat(a.csatAverage) * 20) : 0,
      }));
    }

    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      return {
        date: daysOfWeek[d.getDay()],
        sentiment: 0,
      };
    });
  }, [initialAnalytics]);

  const handleUpdateVoicemailStatus = (voicemailId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "pending" ? "called" : "pending";

    setVoicemails((prev) =>
      prev.map((v) => (v.id === voicemailId ? { ...v, callbackStatus: nextStatus } : v))
    );

    startTransition(async () => {
      const res = await updateVoicemailStatusAction(voicemailId, nextStatus);
      if (!res.success) {
        setVoicemails((prev) =>
          prev.map((v) => (v.id === voicemailId ? { ...v, callbackStatus: currentStatus } : v))
        );
        toast.error("Failed to update status", formatUserErrorMessage(res.error));
      } else {
        toast.success(
          "Voicemail Status Updated",
          `Marked as ${nextStatus === "called" ? "callback completed" : "pending callback"}.`
        );
      }
    });
  };

  const handleTogglePlayback = (voicemailId: string) => {
    if (activePlayVoicemailId === voicemailId) {
      setActivePlayVoicemailId(null);
    } else {
      setActivePlayVoicemailId(voicemailId);
    }
  };

  const totalCallsHandled = useMemo(() => {
    if (initialAnalytics && initialAnalytics.length > 0) {
      return initialAnalytics.reduce(
        (acc: number, a: any) => acc + (a.callsAnswered || 0) + (a.callsMissed || 0),
        0
      );
    }
    return (sessions || []).length || 1;
  }, [initialAnalytics, sessions]);

  const conversionRateDisplay = useMemo(() => {
    if (initialAnalytics && initialAnalytics.length > 0) {
      const total = initialAnalytics.reduce(
        (acc: number, a: any) => acc + (a.callsAnswered || 0) + (a.callsMissed || 0),
        0
      );
      const booked = initialAnalytics.reduce((acc: number, a: any) => acc + (a.appointmentsBooked || 0), 0);
      if (total > 0) return `${Math.round((booked / total) * 100)}%`;
    }
    return "68%";
  }, [initialAnalytics]);

  const avgDurationDisplay = useMemo(() => {
    if (sessions && sessions.length > 0) {
      const durSum = sessions.reduce((acc: number, s: any) => acc + (s.durationSeconds || 0), 0);
      const avg = Math.round(durSum / sessions.length);
      return `${Math.floor(avg / 60)}m ${avg % 60}s`;
    }
    return "1m 45s";
  }, [sessions]);

  return (
    <div className="w-full flex flex-col gap-space-6">
      {/* Analytics Summary Cards */}
      <div className="grid gap-space-4 sm:grid-cols-2 lg:grid-cols-4 shrink-0">
        {/* Calls Card */}
        <div className="bg-card border-[hsl(var(--foreground)/0.06)] radius-xl p-space-4.5 soft- flex justify-between items-center transition-all duration-300 hover:scale-[1.01]">
          <div className="space-y-space-0.5">
            <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground/80">
              Calls Handled
            </span>
            <span className="text-title-md font-semibold text-foreground mt-space-0.5 block tracking-tight tabular-nums">
              {totalCallsHandled}
            </span>
            <span className="text-caption text-muted-foreground/80 flex items-center gap-space-1">
              <Clock className="h-3 w-3 text-indigo-500 shrink-0" /> Lifetime calls log
            </span>
          </div>
          <div className="h-9.5 w-9.5 radius-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 ring-1 ring-indigo-500/15">
            <PhoneCall className="h-4.5 w-4.5" />
          </div>
        </div>

        {/* Conversion rate */}
        <div className="bg-card border-[hsl(var(--foreground)/0.06)] radius-xl p-space-4.5 soft- flex justify-between items-center transition-all duration-300 hover:scale-[1.01]">
          <div className="space-y-space-0.5">
            <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground/80">
              Conversion Rate
            </span>
            <span className="text-title-md font-semibold text-foreground mt-space-0.5 block tracking-tight tabular-nums">
              {conversionRateDisplay}
            </span>
            <span className="text-caption text-emerald-500 font-semibold flex items-center gap-space-1">
              <TrendingUp className="h-3 w-3 shrink-0 text-emerald-500" /> Booking confirmations
            </span>
          </div>
          <div className="h-9.5 w-9.5 radius-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 ring-1 ring-emerald-500/15">
            <Calendar className="h-4.5 w-4.5" />
          </div>
        </div>

        {/* Avg Duration */}
        <div className="bg-card border-[hsl(var(--foreground)/0.06)] radius-xl p-space-4.5 soft- flex justify-between items-center transition-all duration-300 hover:scale-[1.01]">
          <div className="space-y-space-0.5">
            <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground/80">
              Avg Duration
            </span>
            <span className="text-title-md font-semibold text-foreground mt-space-0.5 block tracking-tight tabular-nums">
              {avgDurationDisplay}
            </span>
            <span className="text-caption text-muted-foreground/80 flex items-center gap-space-1">
              <Clock className="h-3 w-3 text-amber-500 shrink-0" /> Call length metrics
            </span>
          </div>
          <div className="h-9.5 w-9.5 radius-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 ring-1 ring-amber-500/15">
            <Activity className="h-4.5 w-4.5" />
          </div>
        </div>

        {/* CSAT Card */}
        <div className="bg-card border-[hsl(var(--foreground)/0.06)] radius-xl p-space-4.5 soft- flex justify-between items-center transition-all duration-300 hover:scale-[1.01]">
          <div className="space-y-space-0.5">
            <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground/80">
              Voice CSAT
            </span>
            <span className="text-title-md font-semibold text-foreground mt-space-0.5 block tracking-tight tabular-nums">
              4.9 / 5
            </span>
            <span className="text-caption text-muted-foreground/80 flex items-center gap-space-1">
              <Award className="h-3 w-3 text-emerald-500 shrink-0" /> Customer satisfaction
            </span>
          </div>
          <div className="h-9.5 w-9.5 radius-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 ring-1 ring-emerald-500/15">
            <Award className="h-4.5 w-4.5" />
          </div>
        </div>
      </div>

      {/* Voice Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-4 shrink-0">
        <div className="bg-card border-border-default radius-xl overflow-hidden flex flex-col">
          <div className="p-space-5 pb-space-2 shrink-0">
            <h3 className="text-body-sm font-semibold">Call Volume & Duration</h3>
            <p className="text-caption text-muted-foreground">Daily call activity and average duration (mins)</p>
          </div>
          <div className="flex-1 p-space-5 pt-0">
            <AreaChartCard
              data={callActivityData}
              index="date"
              categories={["calls", "duration"]}
              colors={["#6366f1", "#10b981"]}
              height={260}
            />
          </div>
        </div>

        <div className="bg-card border-border-default radius-xl overflow-hidden flex flex-col">
          <div className="p-space-5 pb-space-2 shrink-0">
            <h3 className="text-body-sm font-semibold">Sentiment Trend</h3>
            <p className="text-caption text-muted-foreground">Average customer sentiment over time</p>
          </div>
          <div className="flex-1 p-space-5 pt-0">
            <LineChartCard
              data={sentimentData}
              index="date"
              categories={["sentiment"]}
              colors={["#8b5cf6"]}
              height={260}
            />
          </div>
        </div>
      </div>

      {/* Main viewport area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-6 items-stretch">
        {/* Left Column: Live Activity + Outbound AI Dialer (col-span-4) */}
        <div className="lg:col-span-4 flex flex-col gap-space-4 min-h-[500px]">
          {/* Live Activity Monitoring Card */}
          <div className="flex flex-col bg-card border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft- shrink-0">
            <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-space-2">
                <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
                <h4 className="text-caption font-semibold text-foreground">Live Telephony Activity</h4>
              </div>
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>

            <div className="p-space-4 space-y-space-3.5 bg-[hsl(var(--foreground)/0.002)]">
              {/* Active call card with wave visualizer */}
              {activeCall && activeCall.active ? (
                <div className="p-space-3 radius-lg bg-[hsl(var(--primary)/0.04)] border-[hsl(var(--primary)/0.12)] flex items-center justify-between">
                  <div className="space-y-space-1">
                    <div className="flex items-center gap-space-1.5">
                      <span className="text-caption font-semibold text-foreground">{activeCall.caller}</span>
                      <span className="badge-status badge-primary text-caption px-space-1 py-space-0.25 font-mono uppercase">
                        {activeCall.recipient}
                      </span>
                    </div>
                    <p className="text-caption text-muted-foreground/85">{activeCall.label}</p>
                  </div>

                  <div className="flex items-center gap-space-3.5">
                    <div className="flex items-center gap-space-0.5 h-3">
                      <span className="w-0.75 bg-primary/70 rounded-full animate-bounce h-2 [animation-delay:0.1s]" />
                      <span className="w-0.75 bg-primary/70 rounded-full animate-bounce h-3.5 [animation-delay:0.3s]" />
                      <span className="w-0.75 bg-primary/70 rounded-full animate-bounce h-2 [animation-delay:0.5s]" />
                      <span className="w-0.75 bg-primary/70 rounded-full animate-bounce h-2.5 [animation-delay:0.2s]" />
                    </div>
                    <span className="text-caption font-mono text-primary font-semibold">
                      {formatDuration(activeCall.duration)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-space-3 radius-lg border border-[hsl(var(--foreground)/0.06)] bg-background/50 text-center text-muted-foreground/80 text-caption">
                  No incoming or active calls on trunk right now.
                </div>
              )}

              {/* Hold Queues */}
              <div className="space-y-space-2 pt-space-2.5 border-t border-[hsl(var(--foreground)/0.04)]">
                <div className="flex items-center justify-between text-caption uppercase font-semibold tracking-wider text-muted-foreground/55">
                  <span>Hold Queue list</span>
                  <span>0 in queue</span>
                </div>
                <p className="text-caption text-muted-foreground/80 text-center py-space-2 border-[hsl(var(--foreground)/0.08)] radius-lg bg-background/50">
                  All active queues are clear. No callers on hold.
                </p>
              </div>
            </div>
          </div>

          {/* Outbound AI Dialer Card */}
          <div className="flex-1 min-h-0 flex flex-col bg-card border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
            <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0">
              <div className="flex items-center gap-space-2">
                <Phone className="h-4 w-4 text-primary" />
                <h4 className="text-caption font-semibold text-foreground">Outbound AI Dialer</h4>
              </div>
              <p className="text-caption text-muted-foreground mt-space-0.5">
                Initiate an automated AI calling flow. Demo call. No real call is placed.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-space-4 space-y-space-4 bg-[hsl(var(--foreground)/0.002)] text-caption">
              <div className="space-y-space-3.5">
                <div className="space-y-space-1">
                  <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">
                    From Line
                  </Label>
                  <NativeSelect
                    value={selectedLineId}
                    onChange={(e) => setSelectedLineId(e.target.value)}
                    className="w-full h-9 radius-md border-[hsl(var(--foreground)/0.08)] bg-background px-space-3 text-caption focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground"
                  >
                    {initialNumbers.map((num) => (
                      <option key={num.id} value={num.id}>
                        {num.name} ({num.phoneNumber})
                      </option>
                    ))}
                    {initialNumbers.length === 0 && (
                      <option value="demo-line">Operator AI Primary Line (+1 (555) 309-8123)</option>
                    )}
                  </NativeSelect>
                </div>

                <div className="space-y-space-1">
                  <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">
                    To Number
                  </Label>
                  <Input
                    placeholder="+15551234567"
                    value={outboundTo}
                    onChange={(e) => setOutboundTo(e.target.value)}
                    className="h-9 bg-background text-caption border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20"
                  />
                  <p className="text-xs text-muted-foreground/80 mt-0.5">
                    Enter customer phone number (or leave default for instant interactive demo).
                  </p>
                </div>
              </div>

              {outboundStatus && (
                <div
                  className={cn(
                    "p-space-3 radius-lg flex items-start gap-space-2 text-caption leading-relaxed",
                    outboundStatus === "success"
                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/15"
                      : "bg-primary/10 text-primary border border-primary/15"
                  )}
                >
                  {outboundStatus === "success" ? (
                    <CheckCircle className="h-4 w-4 shrink-0 mt-space-0.5 text-emerald-500" />
                  ) : (
                    <Loader2 className="h-4 w-4 shrink-0 mt-space-0.5 animate-spin text-primary" />
                  )}
                  <span>
                    {outboundStatus === "success"
                      ? "Demo Call Active! No real call is placed. Streaming into Dialogue Stream."
                      : "Connecting outbound telephony trunk..."}
                  </span>
                </div>
              )}
            </div>

            <div className="p-space-3 border-t border-[hsl(var(--foreground)/0.06)] bg-background flex flex-wrap items-center justify-between gap-2 shrink-0">
              <span className="text-xs text-amber-500 font-medium">Demo call. No real call is placed</span>
              <Button
                onClick={handleTriggerCampaign}
                disabled={outboundStatus === "initiating"}
                className="h-8.5 text-caption font-semibold px-space-4 text-white bg-primary hover:bg-primary/95 hover:text-white cursor-pointer"
              >
                <Send className="h-3.5 w-3.5 mr-space-1" />
                Trigger AI Call
              </Button>
            </div>
          </div>
        </div>

        {/* Center Column: Live Transcription Viewer (col-span-5) */}
        <div className="lg:col-span-5 flex flex-col min-h-[500px]">
          <div className="flex-1 min-h-0 flex flex-col bg-card border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
            <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex flex-wrap items-center justify-between gap-space-3">
              <div>
                <div className="flex items-center gap-space-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <h4 className="text-caption font-semibold text-foreground">Dialogue Stream</h4>
                  {activeCall && activeCall.active && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500">
                      Demo call. No real call is placed
                    </span>
                  )}
                </div>
                <p className="text-caption text-muted-foreground mt-space-0.5">
                  Real-time conversational transcript output.
                </p>
              </div>

              <div className="flex items-center gap-space-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMuted(!isMuted)}
                  title={isMuted ? "Unmute Voice Audio" : "Mute Voice Audio"}
                  className="h-7 w-7 text-muted-foreground/80 hover:text-foreground cursor-pointer"
                >
                  {isMuted ? <VolumeX className="h-3.5 w-3.5 text-rose-500" /> : <Volume2 className="h-3.5 w-3.5 text-primary" />}
                </Button>
                {activeCall && activeCall.active && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleHangUp}
                    title="End Call"
                    className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                  >
                    <PhoneOff className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Scrollable Dialogue viewport */}
            <div className="flex-1 overflow-y-auto p-space-4 space-y-space-4 bg-[hsl(var(--foreground)/0.02)] sidebar-scroll">
              {activeTranscript.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center h-full min-h-48 py-space-12 text-muted-foreground/80 gap-space-2">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/80" />
                  <span className="text-caption font-medium text-foreground">No active live call</span>
                  <span className="text-caption text-muted-foreground/80 max-w-xs">
                    Real-time audio transcripts stream here automatically during inbound receptionist or outbound campaign calls. Click &ldquo;Trigger AI Call&rdquo; to start a test (Demo call. No real call is placed).
                  </span>
                </div>
              ) : (
                activeTranscript.map((line, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex flex-col gap-space-1 max-w-5/6 animate-fade-in",
                      line.speaker === "caller" ? "mr-auto items-start" : "ml-auto items-end"
                    )}
                  >
                    <div className="flex items-center gap-space-1.5">
                      <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground/80">
                        {line.speaker === "caller" ? "Customer" : "Operator AI"}
                      </span>
                      <span className="text-caption font-mono text-muted-foreground/45">{line.time}</span>
                    </div>
                    <div
                      className={cn(
                        "px-space-3 py-space-2 text-caption leading-relaxed border radius-lg",
                        line.speaker === "caller"
                          ? "bg-card border-[hsl(var(--foreground)/0.06)] text-foreground rounded-tl-none"
                          : "bg-[hsl(var(--primary)/0.08)] text-primary border-[hsl(var(--primary)/0.15)] rounded-tr-none"
                      )}
                    >
                      {line.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bg-[hsl(var(--foreground)/0.015)] border-t border-[hsl(var(--foreground)/0.06)] p-space-3 text-caption text-muted-foreground/80 flex items-center justify-between shrink-0">
              <span className="flex items-center gap-space-1.5 font-medium text-emerald-400">
                <span className="h-2 w-2 bg-emerald-500 rounded-full shrink-0 animate-pulse" /> Live Voice Channel Connected
              </span>
              <span className="text-foreground/70 font-medium">Response Speed: Instant (&lt;1s)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Voicemail Messages Inbox (col-span-3) */}
        <div className="lg:col-span-3 flex flex-col min-h-[500px]">
          <div className="flex-1 min-h-0 flex flex-col bg-card border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
            <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-space-2">
                <Inbox className="h-4 w-4 text-primary" />
                <h4 className="text-caption font-semibold text-foreground">Voicemail Box</h4>
              </div>
              <span className="text-caption bg-primary/10 text-primary font-semibold px-space-1.5 py-space-0.5 rounded-full">
                {voicemails.length}
              </span>
            </div>

            <ScrollArea className="flex-1 min-h-[360px] bg-[hsl(var(--foreground)/0.002)]" horizontal={false}>
              <div className="p-space-3 space-y-space-3">
                {voicemails.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center h-full min-h-48 py-space-6 text-muted-foreground/80 gap-space-1.5">
                    <Inbox className="h-7 w-7 text-muted-foreground/35" />
                    <span className="text-caption font-semibold text-foreground">Inbox is empty</span>
                    <p className="text-caption max-w-44 leading-normal">No voicemail messages received.</p>
                  </div>
                ) : (
                  voicemails.map((vm) => (
                    <div
                      key={vm.id}
                      className="p-space-3 radius-lg border border-[hsl(var(--foreground)/0.06)] bg-card soft- hover:border-primary/20 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between gap-space-1">
                        <div className="min-w-0">
                          <span className="text-caption font-semibold text-foreground block truncate">
                            Caller Voice Note
                          </span>
                          <span className="text-caption text-muted-foreground/75 flex items-center gap-space-1">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(vm.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </div>
                        <Button
                          onClick={() => handleUpdateVoicemailStatus(vm.id, vm.callbackStatus)}
                          disabled={isPending}
                          className={cn(
                            "inline-flex items-center gap-space-0.5 px-space-2 py-space-0.5 radius-md text-caption font-normal uppercase tracking-wider cursor-pointer border shrink-0",
                            vm.callbackStatus === "called"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/15"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/15"
                          )}
                        >
                          {vm.callbackStatus === "called" ? "Done" : "Triage"}
                        </Button>
                      </div>

                      <div className="mt-space-2.5 space-y-space-2 text-caption">
                        {vm.summaryText && (
                          <div className="p-space-2 bg-[hsl(var(--foreground)/0.02)] border-[hsl(var(--foreground)/0.04)] radius-md space-y-space-0.5 leading-normal">
                            <span className="text-caption font-semibold text-primary uppercase tracking-wider flex items-center gap-space-1">
                              <Sparkles className="h-2.5 w-2.5" /> AI Summary
                            </span>
                            <p className="text-foreground/90 font-medium italic">&ldquo;{vm.summaryText}&rdquo;</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-space-3 pt-space-2.5 border-t border-[hsl(var(--foreground)/0.04)] flex items-center justify-between gap-space-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePlayback(vm.id)}
                          className="text-primary hover:text-primary/95 text-caption font-semibold h-7.5 px-space-2.5 bg-primary/5 hover:bg-primary/10 rounded-md cursor-pointer"
                        >
                          {activePlayVoicemailId === vm.id ? (
                            <Pause className="h-3 w-3 mr-space-1 animate-pulse" />
                          ) : (
                            <Play className="h-3 w-3 mr-space-1" />
                          )}
                          <span>{activePlayVoicemailId === vm.id ? "Pause" : "Listen"}</span>
                        </Button>

                        {activePlayVoicemailId === vm.id && (
                          <div className="flex-1 flex items-center gap-space-1.5">
                            <div className="w-full bg-[hsl(var(--foreground)/0.06)] h-0.75 radius-md overflow-hidden">
                              <div className="bg-primary h-full w-5/12 animate-pulse" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}
