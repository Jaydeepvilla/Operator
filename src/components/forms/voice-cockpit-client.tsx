"use client";

import { useState, useEffect, useTransition } from"react";
import {
 Activity,
 Play,
 Pause,
 PhoneCall,
 VolumeX,
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
import { Label } from "@/components/shared/label";
import { cn } from "@/components/shared/utils";
import { useToast } from "@/components/shared/toast";
import { formatUserErrorMessage } from "@/lib/errors";
import { updateVoicemailStatusAction } from "@/server/actions/voice";
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

export function VoiceCockpitClient({
 initialSessions,
 initialVoicemails,
 initialAnalytics,
 initialNumbers
}: {
 initialSessions: any[];
 initialVoicemails: any[];
 initialAnalytics: any[];
 initialNumbers: any[];
}) {
 const [sessions, setSessions] = useState<CallSession[]>(initialSessions as CallSession[]);
 const [voicemails, setVoicemails] = useState<VoicemailMessage[]>(initialVoicemails as VoicemailMessage[]);
 const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
 initialSessions.length > 0 ? initialSessions[0].id : null
 );

 const [activePlayVoicemailId, setActivePlayVoicemailId] = useState<string | null>(null);
 const [isPending, startTransition] = useTransition();
 const toast = useToast();

 // Outbound Dial form state
 const [outboundTo, setOutboundTo] = useState("");
 const [selectedLineId, setSelectedLineId] = useState(
 initialNumbers.length > 0 ? initialNumbers[0].id :""
 );
 const [outboundStatus, setOutboundStatus] = useState<string | null>(null);

 // Simulated live transcripts mapping
 const SIMULATED_TRANSCRIPTS: Record<string, { speaker:"caller"|"agent"; content: string; time: string }[]> = {
 live: [
 { speaker:"caller", content:"Hello, I wanted to inquire if you have any dental checkup slots open for this Wednesday.", time:"14:32:05"},
 { speaker:"agent", content:"Hello! Yes, we have standard dental checkup slots available this Wednesday. I can offer you 10:00 AM or 2:00 PM. Would either of those work for you?", time:"14:32:12"},
 { speaker:"caller", content:"Wednesday at 10 AM works perfectly for me.", time:"14:32:20"},
 { speaker:"agent", content:"Great! I have selected Wednesday at 10:00 AM. May I please have your full name and email address to confirm the booking?", time:"14:32:27"},
 { speaker:"caller", content:"Sure, my name is John Doe, and my email is john.doe@example.com.", time:"14:32:38"},
 { speaker:"agent", content:"Thank you, John. I have confirmed your appointment for Wednesday at 10:00 AM. A confirmation email has been sent to john.doe@example.com. Is there anything else I can help with?", time:"14:32:45"},
 ]
 };

 const activeTranscript = SIMULATED_TRANSCRIPTS.live;

 const handleUpdateVoicemailStatus = (voicemailId: string, currentStatus: string) => {
 const nextStatus = currentStatus ==="pending"?"called":"pending";

 // Optimistic Update
 setVoicemails(prev =>
 prev.map(v => v.id === voicemailId ? { ...v, callbackStatus: nextStatus } : v)
 );

 startTransition(async () => {
 const res = await updateVoicemailStatusAction(voicemailId, nextStatus);
 if (!res.success) {
 // Revert
 setVoicemails(prev =>
 prev.map(v => v.id === voicemailId ? { ...v, callbackStatus: currentStatus } : v)
 );
 toast.error("Failed to update status", formatUserErrorMessage(res.error));
 } else {
 toast.success("Voicemail Status Updated", `Marked as ${nextStatus === "called" ? "callback completed" : "pending callback"}.`);
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

 const handleTriggerCampaign = async () => {
 if (!outboundTo.trim()) {
 toast.error("Invalid Phone Number", "Please enter a destination phone number.");
 return;
 }
 setOutboundStatus("initiating");
 // Simulate campaign dial trigger
 setTimeout(() => {
 setOutboundStatus("success");
 setOutboundTo("");
 toast.success("Call Initiated", `Outbound test call triggered to ${outboundTo.trim()}.`);
 setTimeout(() => setOutboundStatus(null), 3000);
 }, 1500);
 };

 return (
 <div className="flex-1 min-h-0 flex flex-col gap-space-4">
 {/* Analytics Summary Cards */}
 <div className="grid gap-space-4 sm:grid-cols-2 lg:grid-cols-4 shrink-0">
 {/* Calls Card */}
 <div className="bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl p-space-4.5 soft- flex justify-between items-center transition-all duration-300 hover:scale-[1.01]">
 <div className="space-y-space-0.5">
 <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground/60">Calls Handled</span>
 <span className="text-title-md font-semibold text-foreground mt-space-0.5 block tracking-tight tabular-nums">148</span>
 <span className="text-caption text-muted-foreground/80 flex items-center gap-space-1">
 <Clock className="h-3 w-3 text-indigo-500 shrink-0"/> Lifetime calls log
 </span>
 </div>
 <div className="h-9.5 w-9.5 radius-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 ring-1 ring-indigo-500/15">
 <PhoneCall className="h-4.5 w-4.5"/>
 </div>
 </div>

 {/* Conversion rate */}
 <div className="bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl p-space-4.5 soft- flex justify-between items-center transition-all duration-300 hover:scale-[1.01]">
 <div className="space-y-space-0.5">
 <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground/60">Conversion Rate</span>
 <span className="text-title-md font-semibold text-foreground mt-space-0.5 block tracking-tight tabular-nums">78.4%</span>
 <span className="text-caption text-emerald-500 font-semibold flex items-center gap-space-1">
 <TrendingUp className="h-3 w-3 shrink-0 text-emerald-500"/> Booking confirmations
 </span>
 </div>
 <div className="h-9.5 w-9.5 radius-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 ring-1 ring-emerald-500/15">
 <Calendar className="h-4.5 w-4.5"/>
 </div>
 </div>

 {/* Avg Duration */}
 <div className="bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl p-space-4.5 soft- flex justify-between items-center transition-all duration-300 hover:scale-[1.01]">
 <div className="space-y-space-0.5">
 <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground/60">Avg Duration</span>
 <span className="text-title-md font-semibold text-foreground mt-space-0.5 block tracking-tight tabular-nums">2m 14s</span>
 <span className="text-caption text-muted-foreground/80 flex items-center gap-space-1">
 <Clock className="h-3 w-3 text-amber-500 shrink-0"/> Call length metrics
 </span>
 </div>
 <div className="h-9.5 w-9.5 radius-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 ring-1 ring-amber-500/15">
 <Clock className="h-4.5 w-4.5"/>
 </div>
 </div>

 {/* Avg CSAT */}
 <div className="bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl p-space-4.5 soft- flex justify-between items-center transition-all duration-300 hover:scale-[1.01]">
 <div className="space-y-space-0.5">
 <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground/60">Avg CSAT Rating</span>
 <span className="text-title-md font-semibold text-foreground mt-space-0.5 block tracking-tight tabular-nums">4.8 / 5</span>
 <span className="text-caption text-muted-foreground/80 flex items-center gap-space-1">
 <Award className="h-3 w-3 text-purple-500 shrink-0"/> AI-generated reviews
 </span>
 </div>
 <div className="h-9.5 w-9.5 radius-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 ring-1 ring-purple-500/15">
 <Award className="h-4.5 w-4.5"/>
 </div>
 </div>
 </div>

 {/* Voice Analytics Charts */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-4 shrink-0">
 <div className="bg-card border border-border-default radius-xl overflow-hidden flex flex-col">
 <div className="p-space-5 pb-space-2 shrink-0">
 <h3 className="text-body-sm font-semibold">Call Volume & Duration</h3>
 <p className="text-caption text-muted-foreground">Daily call activity and average duration (mins)</p>
 </div>
 <div className="flex-1 p-space-5 pt-0">
 <AreaChartCard 
 data={[
 { date:"Mon", calls: 45, duration: 2.1 },
 { date:"Tue", calls: 52, duration: 2.4 },
 { date:"Wed", calls: 48, duration: 1.8 },
 { date:"Thu", calls: 61, duration: 2.7 },
 { date:"Fri", calls: 59, duration: 2.2 },
 { date:"Sat", calls: 30, duration: 1.5 },
 { date:"Sun", calls: 25, duration: 1.2 },
 ]}
 index="date"
 categories={["calls","duration"]}
 colors={["#6366f1","#10b981"]}
 height={260}
 />
 </div>
 </div>

 <div className="bg-card border border-border-default radius-xl overflow-hidden flex flex-col">
 <div className="p-space-5 pb-space-2 shrink-0">
 <h3 className="text-body-sm font-semibold">Sentiment Trend</h3>
 <p className="text-caption text-muted-foreground">Average customer sentiment over time</p>
 </div>
 <div className="flex-1 p-space-5 pt-0">
 <LineChartCard 
 data={[
 { date:"Mon", sentiment: 85 },
 { date:"Tue", sentiment: 88 },
 { date:"Wed", sentiment: 82 },
 { date:"Thu", sentiment: 91 },
 { date:"Fri", sentiment: 89 },
 { date:"Sat", sentiment: 94 },
 { date:"Sun", sentiment: 95 },
 ]}
 index="date"
 categories={["sentiment"]}
 colors={["#8b5cf6"]}
 height={260}
 />
 </div>
 </div>
 </div>
 {/* Main viewport area */}
 <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-space-4">
 {/* Left Column: Live Activity + Outbound AI Dialer (col-span-4) */}
 <div className="lg:col-span-4 flex flex-col gap-space-4 min-h-0">
 {/* Live Activity Monitoring Card */}
 <div className="flex flex-col bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft- shrink-0">
 <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex items-center justify-between">
 <div className="flex items-center gap-space-2">
 <Activity className="h-4 w-4 text-rose-500 animate-pulse"/>
 <h4 className="text-caption font-semibold text-foreground">Live Activity</h4>
 </div>
 <span className="relative flex h-2 w-2 shrink-0">
 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
 <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
 </span>
 </div>

 <div className="p-space-4 space-y-space-3.5 bg-[hsl(var(--foreground)/0.002)]">
 {/* Active call card with wave visualizer */}
 <div className="p-space-3 radius-lg bg-[hsl(var(--primary)/0.04)] border border-[hsl(var(--primary)/0.12)] flex items-center justify-between">
 <div className="space-y-space-1">
 <div className="flex items-center gap-space-1.5">
 <span className="text-caption font-semibold text-foreground">+1 (555) 309-8123</span>
 <span className="badge-status badge-primary text-caption px-space-1 py-space-0.25 font-mono uppercase">John Doe</span>
 </div>
 <p className="text-caption text-muted-foreground/85">Inbound Line ➜ AI Agent active</p>
 </div>
 
 <div className="flex items-center gap-space-3.5">
 <div className="flex items-center gap-space-0.5 h-3">
 <span className="w-0.75 bg-primary/70 rounded-full animate-bounce h-2 [animation-delay:0.1s]"/>
 <span className="w-0.75 bg-primary/70 rounded-full animate-bounce h-3 h-3.5 [animation-delay:0.3s]"/>
 <span className="w-0.75 bg-primary/70 rounded-full animate-bounce h-1.5 h-2 [animation-delay:0.5s]"/>
 <span className="w-0.75 bg-primary/70 rounded-full animate-bounce h-2.5 h-2.5 [animation-delay:0.2s]"/>
 </div>
 <span className="text-caption font-mono text-primary font-semibold">1m 45s</span>
 </div>
 </div>

 {/* Hold Queues */}
 <div className="space-y-space-2 pt-space-2.5 border-t border-[hsl(var(--foreground)/0.04)]">
 <div className="flex items-center justify-between text-caption uppercase font-semibold tracking-wider text-muted-foreground/55">
 <span>Hold Queue list</span>
 <span>0 in queue</span>
 </div>
 <p className="text-caption text-muted-foreground/60 text-center py-space-3 border border-dashed border-[hsl(var(--foreground)/0.08)] radius-lg bg-background/50">
 All active queues are clear. No callers on hold.
 </p>
 </div>
 </div>
 </div>

 {/* Outbound AI Dialer Card */}
 <div className="flex-1 min-h-0 flex flex-col bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
 <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0">
 <div className="flex items-center gap-space-2">
 <Phone className="h-4 w-4 text-primary"/>
 <h4 className="text-caption font-semibold text-foreground">Outbound AI Dialer</h4>
 </div>
 <p className="text-caption text-muted-foreground mt-space-0.5">Initiate an automated AI calling flow to remind or follow up with a lead.</p>
 </div>

 <div className="flex-1 overflow-y-auto p-space-4 space-y-space-4 bg-[hsl(var(--foreground)/0.002)] text-caption">
 <div className="space-y-space-3.5">
 <div className="space-y-space-1">
 <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">From Line</Label>
 <select
 value={selectedLineId}
 onChange={(e) => setSelectedLineId(e.target.value)}
 className="w-full h-9 radius-md border border-[hsl(var(--foreground)/0.08)] bg-background px-space-3 text-caption focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground"
 >
 {initialNumbers.map(num => (
 <option key={num.id} value={num.id}>{num.name} ({num.phoneNumber})</option>
 ))}
 {initialNumbers.length === 0 && <option value="">No active lines</option>}
 </select>
 </div>

 <div className="space-y-space-1">
 <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">To Number</Label>
 <Input
 placeholder="+15551234567"
 value={outboundTo}
 onChange={(e) => setOutboundTo(e.target.value)}
 className="h-9 bg-background text-caption border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20"
 />
 </div>
 </div>

 {outboundStatus && (
 <div className={cn(
 "p-space-3 radius-lg flex items-start gap-space-2 text-caption leading-relaxed",
 outboundStatus ==="success"
 ?"bg-emerald-500/10 text-emerald-600 border border-emerald-500/15"
 :"bg-primary/10 text-primary border border-primary/15"
 )}>
 {outboundStatus ==="success"
 ? <CheckCircle className="h-4 w-4 shrink-0 mt-space-0.5 text-emerald-500"/> 
 : <Loader2 className="h-4 w-4 shrink-0 mt-space-0.5 animate-spin text-primary"/>}
 <span>{outboundStatus ==="success"?"Campaign Call Triggered!":"Establishing outbound telephony trunk..."}</span>
 </div>
 )}
 </div>

 <div className="p-space-3 border-t border-[hsl(var(--foreground)/0.06)] bg-background flex justify-end shrink-0">
 <Button
 onClick={handleTriggerCampaign}
 disabled={outboundStatus ==="initiating"}
 className="h-8.5 text-caption font-semibold px-space-4 text-white bg-primary hover:bg-primary/95 hover:text-white cursor-pointer"
 >
 <Send className="h-3.5 w-3.5 mr-space-1"/>
 Trigger AI Call
 </Button>
 </div>
 </div>
 </div>

 {/* Center Column: Live Transcription Viewer (col-span-5) */}
 <div className="lg:col-span-5 flex flex-col min-h-0">
 <div className="flex-1 min-h-0 flex flex-col bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
 <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex flex-wrap items-center justify-between gap-space-3">
 <div>
 <div className="flex items-center gap-space-2">
 <MessageSquare className="h-4 w-4 text-primary"/>
 <h4 className="text-caption font-semibold text-foreground">Dialogue Stream</h4>
 </div>
 <p className="text-caption text-muted-foreground mt-space-0.5">Real-time conversational transcript output.</p>
 </div>

 {/* Control Action Buttons */}
 <div className="flex items-center gap-space-1">
 <Button size="sm"variant="ghost"className="h-8 text-caption font-semibold text-amber-500 hover:bg-amber-500/10 cursor-pointer">
 <VolumeX className="h-3.5 w-3.5"/>
 </Button>
 <Button size="sm"variant="ghost"className="h-8 text-caption font-semibold text-primary hover:bg-primary/10 cursor-pointer">
 <UserCheck className="h-3.5 w-3.5"/>
 </Button>
 <Button size="sm"variant="ghost"className="h-8 text-caption font-semibold text-rose-500 hover:bg-rose-500/10 cursor-pointer">
 <PhoneOff className="h-3.5 w-3.5"/>
 </Button>
 </div>
 </div>

 {/* Scrollable Dialogue viewport */}
 <div className="flex-1 overflow-y-auto p-space-4 space-y-space-4 bg-[hsl(var(--foreground)/0.02)] sidebar-scroll">
 {activeTranscript.map((line, idx) => (
 <div
 key={idx}
 className={cn(
 "flex flex-col gap-space-1 max-w-5/6 animate-fade-in",
 line.speaker ==="caller"?"mr-auto items-start":"ml-auto items-end"
 )}
 >
 <div className="flex items-center gap-space-1.5">
 <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground/60">
 {line.speaker ==="caller"?"Customer":"Operator AI"}
 </span>
 <span className="text-caption font-mono text-muted-foreground/45">{line.time}</span>
 </div>
 <div className={cn(
 "px-space-3 py-space-2 text-caption leading-relaxed border radius-lg",
 line.speaker ==="caller"
 ?"bg-card border-[hsl(var(--foreground)/0.06)] text-foreground rounded-tl-none"
 :"bg-[hsl(var(--primary)/0.08)] text-primary border-[hsl(var(--primary)/0.15)] rounded-tr-none"
 )}>
 {line.content}
 </div>
 </div>
 ))}
 </div>

 <div className="bg-[hsl(var(--foreground)/0.015)] border-t border-[hsl(var(--foreground)/0.06)] p-space-3 text-caption text-muted-foreground/80 flex items-center justify-between shrink-0">
 <span className="flex items-center gap-space-1"><span className="h-1.5 w-1.5 bg-emerald-500 rounded-full shrink-0"/> WebSockets Trunk</span>
 <span>Latency: ~210ms</span>
 </div>
 </div>
 </div>

 {/* Right Column: Voicemail Messages Inbox (col-span-3) */}
 <div className="lg:col-span-3 flex flex-col min-h-0">
 <div className="flex-1 min-h-0 flex flex-col bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
 <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex items-center justify-between">
 <div className="flex items-center gap-space-2">
 <Inbox className="h-4 w-4 text-primary"/>
 <h4 className="text-caption font-semibold text-foreground">Voicemail Box</h4>
 </div>
 <span className="text-caption bg-primary/10 text-primary font-semibold px-space-1.5 py-space-0.5 rounded-full">{voicemails.length}</span>
 </div>

 <ScrollArea className="flex-1 bg-[hsl(var(--foreground)/0.002)]" horizontal={false} vertical={voicemails.length > 2}>
 <div className="p-space-3 space-y-space-3">
 {voicemails.length === 0 ? (
 <div className="flex flex-col items-center justify-center text-center h-full min-h-48 py-space-6 text-muted-foreground/60 gap-space-1.5">
 <Inbox className="h-7 w-7 text-muted-foreground/35"/>
 <span className="text-caption font-medium text-foreground">Inbox is empty</span>
 <p className="text-caption text-muted-foreground/60 max-w-36">No voicemail messages received.</p>
 </div>
 ) : (
 voicemails.map((vm) => (
 <div key={vm.id} className="p-space-3 bg-background border border-[hsl(var(--foreground)/0.06)] radius-lg flex flex-col justify-between transition-all hover:border-[hsl(var(--primary)/0.15)]">
 <div className="flex items-start justify-between gap-space-2">
 <div className="space-y-space-0.5 min-w-0">
 <span className="text-caption font-semibold text-foreground block truncate">Inbound Call Voicemail</span>
 <span className="text-caption text-muted-foreground/75 flex items-center gap-space-1">
 <Clock className="h-2.5 w-2.5"/>
 {new Date(vm.createdAt).toLocaleString([], { dateStyle:'short', timeStyle:'short'})}
 </span>
 </div>
 <Button
 onClick={() => handleUpdateVoicemailStatus(vm.id, vm.callbackStatus)}
 disabled={isPending}
 className={cn(
 "inline-flex items-center gap-space-0.5 px-space-2 py-space-0.5 radius-md text-caption font-normal uppercase tracking-wider cursor-pointer border shrink-0",
 vm.callbackStatus ==="called"
 ?"bg-emerald-500/10 text-emerald-600 border-emerald-500/15"
 :"bg-amber-500/10 text-amber-600 border-amber-500/15"
 )}
 >
 {vm.callbackStatus ==="called"?"Done":"Triage"}
 </Button>
 </div>

 <div className="mt-space-2.5 space-y-space-2 text-caption">
 {vm.summaryText && (
 <div className="p-space-2 bg-[hsl(var(--foreground)/0.02)] border border-[hsl(var(--foreground)/0.04)] radius-md space-y-space-0.5 leading-normal">
 <span className="text-caption font-semibold text-primary uppercase tracking-wider flex items-center gap-space-1"><Sparkles className="h-2.5 w-2.5"/> AI Summary</span>
 <p className="text-foreground/90 font-medium italic">"{vm.summaryText}"</p>
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
 <Pause className="h-3 w-3 mr-space-1 animate-pulse"/>
 ) : (
 <Play className="h-3 w-3 mr-space-1"/>
 )}
 <span>{activePlayVoicemailId === vm.id ?"Pause":"Listen"}</span>
 </Button>

 {activePlayVoicemailId === vm.id && (
 <div className="flex-1 flex items-center gap-space-1.5">
 <div className="w-full bg-[hsl(var(--foreground)/0.06)] h-0.75 radius-md overflow-hidden">
 <div className="bg-primary h-full w-5/12 animate-pulse"/>
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
