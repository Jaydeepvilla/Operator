"use client";import { Badge } from "@/components/shared/badge";

import { useState, useEffect, useTransition } from "react";
import {
 Search,
 ArrowUpDown,
 Eye,
 PhoneCall,
 Calendar,
 Clock,
 CheckCircle2,
 XCircle,
 AlertTriangle,
 Play,
 FileText,
 Activity,
 User,
 Bot,
 ArrowDownLeft,
 ArrowUpRight,
 RefreshCw,
 Loader2,
 Sparkles,
 Inbox } from
"lucide-react";
import { Button } from "@/components/shared/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/shared/tabs";
import { Input } from "@/components/shared/input";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue } from
"@/components/shared/select";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
 SheetDescription } from
"@/components/shared/sheet";
import { getCallSessionDetailsAction } from "@/server/actions/voice";
import { cn } from "@/components/shared/utils";
import { NativeTable } from "@/components/shared/native";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CallSession {
 id: string;
 callerNumber: string;
 recipientNumber: string;
 status: string;
 durationSeconds: number;
 direction: string;
 endedReason: string | null;
 createdAt: Date;
}

export function VoiceHistoryClient({ initialSessions }: {initialSessions: any[];}) {
 const [sessions, setSessions] = useState<CallSession[]>(initialSessions as CallSession[]);

 // Filtering states
 const [search, setSearch] = useState("");
 const [directionFilter, setDirectionFilter] = useState("all");
 const [statusFilter, setStatusFilter] = useState("all");

 // Selected details state
 const [selectedSession, setSelectedSession] = useState<CallSession | null>(null);
 const [sessionDetails, setSessionDetails] = useState<any>(null);
 const [isLoadingDetails, setIsLoadingDetails] = useState(false);
 const [isSheetOpen, setIsSheetOpen] = useState(false);
 const [activeTab, setActiveTab] = useState<"summary" | "transcript" | "events">("summary");

 const handleOpenReview = async (session: CallSession) => {
 setSelectedSession(session);
 setIsSheetOpen(true);
 setIsLoadingDetails(true);
 setSessionDetails(null);
 setActiveTab("summary");

 try {
 const res = await getCallSessionDetailsAction(session.id);
 if (res.success && res.session) {
 setSessionDetails(res.session);
 } else {
 console.error("Failed to load details:", res.error);
 }
 } catch (e) {
 console.error(e);
 } finally {
 setIsLoadingDetails(false);
 }
 };

 // Filter logs
 const filteredSessions = sessions.filter((s) => {
 const matchesSearch = s.callerNumber.includes(search) || s.recipientNumber.includes(search);
 const matchesDirection = directionFilter === "all" || s.direction === directionFilter;
 const matchesStatus = statusFilter === "all" || s.status === statusFilter;
 return matchesSearch && matchesDirection && matchesStatus;
 });

 const formatDuration = (seconds: number) => {
 if (seconds <= 0) return "0s";
 const mins = Math.floor(seconds / 60);
 const secs = seconds % 60;
 return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
 };

 const getStatusBadge = (status: string) => {
 switch (status) {
 case "completed":
 return (
 <Badge variant="success">
 <CheckCircle2 className="h-3 w-3" />
 Completed
 </Badge>);

 case "failed":
 return (
 <Badge variant="destructive">
 <XCircle className="h-3 w-3" />
 Failed
 </Badge>);

 case "voicemail":
 return (
 <Badge variant="warning">
 <AlertTriangle className="h-3 w-3 animate-pulse" />
 Voicemail
 </Badge>);

 case "transferred":
 return (
 <Badge>
 <PhoneCall className="h-3 w-3" />
 Transferred
 </Badge>);

 case "ringing":
 case "in-progress":
 default:
 return (
 <Badge variant="info" className="animate-pulse">
 <Activity className="h-3 w-3" />
 Active
 </Badge>);

 }
 };

 return (
 <div className="flex-1 min-h-0 flex flex-col gap-space-4">
 {/* Filtering Controls */}
 <div className="flex flex-col gap-space-3 sm:flex-row sm:items-center sm:justify-between bg-card border border-[hsl(var(--foreground)/0.06)] p-space-3 radius-xl soft- shrink-0">
 <div className="relative flex-1 max-w-sm">
 <Search className="absolute left-space-3 top-space-2.5 h-4 w-4 text-muted-foreground/50" />
 <Input
 placeholder="Search number..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pl-space-9 h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20" />
 
 </div>

 <div className="flex items-center gap-space-3">
 <Select
 value={directionFilter}
 onValueChange={(val) => setDirectionFilter(val)}>
 
 <SelectTrigger className="h-9.5 w-36 text-caption bg-background border-[hsl(var(--foreground)/0.08)]">
 <SelectValue placeholder="Select Direction" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">All Directions</SelectItem>
 <SelectItem value="inbound">Inbound Calls</SelectItem>
 <SelectItem value="outbound">Outbound Calls</SelectItem>
 </SelectContent>
 </Select>

 <Select
 value={statusFilter}
 onValueChange={(val) => setStatusFilter(val)}>
 
 <SelectTrigger className="h-9.5 w-36 text-caption bg-background border-[hsl(var(--foreground)/0.08)]">
 <SelectValue placeholder="Select Status" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">All Statuses</SelectItem>
 <SelectItem value="completed">Completed</SelectItem>
 <SelectItem value="failed">Failed</SelectItem>
 <SelectItem value="voicemail">Voicemail</SelectItem>
 <SelectItem value="transferred">Transferred</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 {/* Logs Table */}
 <div className="flex-1 min-h-0 flex flex-col bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
 {filteredSessions.length === 0 ?
 <div className="flex flex-col items-center justify-center text-center h-full min-h-64 py-space-6 text-muted-foreground/60 gap-space-1.5">
 <Inbox className="h-8 w-8 text-muted-foreground/35 animate-pulse" />
 <span className="text-caption font-semibold text-foreground">No matching logs found</span>
 <p className="text-caption text-muted-foreground/60 max-w-60">
 No historical call sessions matching your search filter conditions.
 </p>
 </div> :

 <ScrollArea className="flex-1" horizontal={false}>
 <NativeTable className="w-full text-left border-collapse text-caption">
 <thead>
 <tr className="border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] text-caption uppercase tracking-widest font-semibold text-muted-foreground/60 sticky top-space-0 z-10">
 <th className="px-space-6 py-space-3 bg-[hsl(var(--card))]">Number</th>
 <th className="px-space-6 py-space-3 bg-[hsl(var(--card))]">Direction</th>
 <th className="px-space-6 py-space-3 bg-[hsl(var(--card))]">Duration</th>
 <th className="px-space-6 py-space-3 bg-[hsl(var(--card))]">Status</th>
 <th className="px-space-6 py-space-3 bg-[hsl(var(--card))]">Date & Time</th>
 <th className="px-space-6 py-space-3 text-right bg-[hsl(var(--card))]">Review</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[hsl(var(--foreground)/0.04)] bg-background/30">
 {filteredSessions.map((session) =>
 <tr key={session.id} className="hover:bg-[hsl(var(--foreground)/0.015)] transition-colors">
 <td className="px-space-6 py-space-3 font-mono font-semibold text-foreground">
 {session.direction === "inbound" ? session.callerNumber : session.recipientNumber}
 </td>
 <td className="px-space-6 py-space-3">
 {session.direction === "inbound" ?
 <span className="inline-flex items-center gap-space-1.5 text-caption font-medium text-indigo-500">
 <ArrowDownLeft className="h-3.5 w-3.5" />
 Inbound
 </span> :

 <span className="inline-flex items-center gap-space-1.5 text-caption font-medium text-emerald-500">
 <ArrowUpRight className="h-3.5 w-3.5" />
 Outbound
 </span>
 }
 </td>
 <td className="px-space-6 py-space-3 font-mono text-muted-foreground">{formatDuration(session.durationSeconds)}</td>
 <td className="px-space-6 py-space-3">{getStatusBadge(session.status)}</td>
 <td className="px-space-6 py-space-3 text-muted-foreground/80">
 {new Date(session.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
 </td>
 <td className="px-space-6 py-space-3 text-right">
 <Button variant="ghost" size="sm" onClick={() => handleOpenReview(session)}
 className="text-primary hover:text-primary/90 hover:bg-primary/5 gap-space-1.5 cursor-pointer h-7.5 px-space-3 rounded-md">
 
 <Eye className="h-3.5 w-3.5" />
 <span>Details</span>
 </Button>
 </td>
 </tr>
 )}
 </tbody>
 </NativeTable>
 </ScrollArea>
 }
 </div>

 {/* Slide-out Review Sheet */}
 <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
 <SheetContent className="sm:max-w-md bg-card border-l border-[hsl(var(--foreground)/0.08)] flex flex-col justify-between pr-space-3"><ScrollArea className="h-full w-full" horizontal={false}>
 <div>
 <SheetHeader className="pb-space-3 border-b border-[hsl(var(--foreground)/0.05)]">
 <SheetTitle className="text-body-sm font-semibold text-foreground flex items-center gap-space-2">
 <FileText className="h-4.5 w-4.5 text-primary" />
 Call Session Review
 </SheetTitle>
 <SheetDescription className="font-mono text-caption text-muted-foreground/60 mt-space-0.5">
 Session ID: {selectedSession?.id}
 </SheetDescription>
 </SheetHeader>

 {isLoadingDetails ?
 <div className="flex flex-col items-center justify-center py-space-20 gap-space-2.5 text-muted-foreground text-caption">
 <Loader2 className="h-6 w-6 animate-spin text-primary" />
 <span>Loading detailed session transcripts...</span>
 </div> :
 sessionDetails ?
 <div className="space-y-space-4 mt-space-4 text-caption">
 {/* Meta details */}
 <div className="grid grid-cols-2 gap-space-3 bg-[hsl(var(--foreground)/0.015)] p-space-3 radius-lg border border-[hsl(var(--foreground)/0.04)] font-mono text-caption">
 <div>
 <span className="text-muted-foreground/60 text-caption uppercase tracking-wider block">Origin Line</span>
 <p className="font-semibold text-foreground mt-space-0.5">{selectedSession?.direction === "inbound" ? selectedSession?.recipientNumber : selectedSession?.callerNumber}</p>
 </div>
 <div>
 <span className="text-muted-foreground/60 text-caption uppercase tracking-wider block">Duration</span>
 <p className="font-semibold text-foreground mt-space-0.5">{formatDuration(selectedSession?.durationSeconds || 0)}</p>
 </div>
 </div>

 {/* Tab Navigation */}
 <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} variant="segmented" className="w-full">
 <TabsList className="w-full bg-[hsl(var(--foreground)/0.005)] p-space-0.5 radius-lg border border-[hsl(var(--foreground)/0.06)]">
 {(["summary", "transcript", "events"] as const).map((tab) =>
 <TabsTrigger key={tab} value={tab}
 className="flex-1 text-center py-space-1.5 text-caption font-semibold uppercase tracking-wider transition-all cursor-pointer border-none"
 >
 
 {tab}
 </TabsTrigger>
 )}
 </TabsList>
 </Tabs>

 {/* Tab Panels */}
 {activeTab === "summary" &&
 <div className="space-y-space-4">
 <div className="space-y-space-1.5">
 <span className="text-caption font-semibold text-muted-foreground/60 uppercase tracking-wider block flex items-center gap-space-1"><Sparkles className="h-3 w-3 text-primary" /> AI Session Summary</span>
 <p className="leading-relaxed text-foreground/95 bg-background border border-[hsl(var(--foreground)/0.05)] p-space-3 radius-lg leading-relaxed italic">
 "{sessionDetails.summary?.summary || "No AI summary was generated for this empty session."}"
 </p>
 </div>

 <div className="space-y-space-1.5">
 <span className="text-caption font-semibold text-muted-foreground/60 uppercase tracking-wider block">Action Items Identified</span>
 <div className="bg-background border border-[hsl(var(--foreground)/0.05)] p-space-3 radius-lg">
 <ul className="list-disc pl-space-4 space-y-space-1 text-muted-foreground/90 leading-relaxed font-medium">
 {sessionDetails.summary?.actionItems && sessionDetails.summary.actionItems.length > 0 ?
 sessionDetails.summary.actionItems.map((item: string, i: number) =>
 <li key={i}>{item}</li>
 ) :

 <li className="list-none pl-space-0 italic text-muted-foreground/50 text-caption">No action items resolved.</li>
 }
 </ul>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-space-3 pt-space-2.5 border-t border-[hsl(var(--foreground)/0.04)] font-semibold text-caption">
 <div>
 <span className="text-muted-foreground/60 text-caption uppercase tracking-wider block">Outcome</span>
 <p className="capitalize text-foreground mt-space-0.5">{sessionDetails.summary?.outcome || "general-info"}</p>
 </div>
 <div>
 <span className="text-muted-foreground/60 text-caption uppercase tracking-wider block">Ended Reason</span>
 <p className="capitalize text-foreground mt-space-0.5">{selectedSession?.endedReason || "completed"}</p>
 </div>
 </div>
 </div>
 }

 {activeTab === "transcript" &&
 <ScrollArea className="space-y-space-3.5 max-h-96 pr-space-1" horizontal={false}>
 {sessionDetails.transcripts && sessionDetails.transcripts.length > 0 ?
 sessionDetails.transcripts.map((t: any) =>
 <div key={t.id} className="flex gap-space-2">
 <div className={cn(
 "h-6.5 w-6.5 radius-md flex items-center justify-center shrink-0 ring-1",
 t.speaker === "caller" ?
 "bg-[hsl(var(--foreground)/0.04)] text-foreground border-[hsl(var(--foreground)/0.08)]" :
 "bg-[hsl(var(--primary)/0.08)] text-primary border-[hsl(var(--primary)/0.15)]"
 )}>
 {t.speaker === "caller" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
 </div>
 <div className="space-y-space-1 min-w-0 flex-1">
 <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground/55">
 {t.speaker === "caller" ? "Customer" : "Operator AI"}
 </span>
 <p className={cn(
 "px-space-3 py-space-2 text-caption border leading-relaxed radius-lg",
 t.speaker === "caller" ?
 "bg-card border-[hsl(var(--foreground)/0.06)] text-foreground rounded-tl-none" :
 "bg-[hsl(var(--primary)/0.08)] text-primary border-[hsl(var(--primary)/0.15)] rounded-tr-none"
 )}>
 {t.content}
 </p>
 </div>
 </div>
 ) :

 <p className="text-center text-caption text-muted-foreground/50 py-space-8 italic">No transcript entries recorded.</p>
 }
 </ScrollArea>
 }

 {activeTab === "events" &&
 <ScrollArea className="space-y-space-3 pl-space-2 max-h-96" horizontal={false}>
 {sessionDetails.events && sessionDetails.events.length > 0 ?
 sessionDetails.events.map((e: any) =>
 <div key={e.id} className="relative pl-space-4 border-l border-[hsl(var(--foreground)/0.08)] pb-space-3">
 <div className="absolute -left-space-1 top-space-1.5 h-2 w-2 radius-md bg-primary" />
 <span className="capitalize font-semibold text-foreground">{e.eventType.replace("-", "")}</span>
 <span className="block text-caption text-muted-foreground/60 mt-space-0.5">
 {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
 </span>
 </div>
 ) :

 <p className="text-center text-caption text-muted-foreground/50 py-space-8 italic">No audit events generated.</p>
 }
 </ScrollArea>
 }
 </div> :

 <p className="text-center text-caption text-rose-500 py-space-12">Failed to load detailed record.</p>
 }
 </div>

 <div className="border-t border-[hsl(var(--foreground)/0.05)] pt-space-3 flex justify-end shrink-0">
 <Button variant="ghost" onClick={() => setIsSheetOpen(false)} className="text-caption font-semibold h-8.5 hover:bg-[hsl(var(--foreground)/0.05)] cursor-pointer">
 Close History Review
 </Button>
 </div>
 </ScrollArea></SheetContent>
 </Sheet>
 </div>);

}