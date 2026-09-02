"use client";
import { Badge } from "@/components/shared/badge";
import Image from "next/image";
import { useState, useEffect } from "react";
import {
 getConversationsAction,
 getConversationDetailsAction } from
"@/server/actions/admin";
import { sendMessageAction } from "@/server/actions/chat";
import {
 MessageSquare,
 Sparkles,
 User,
 Bot,
 Send,
 Clock,
 AlertTriangle,
 CheckCircle2,
 FileText,
 Tag,
 Calendar,
 AlertCircle,
 CornerDownRight,
 RotateCw,
 TrendingUp,
 Loader2 } from
"lucide-react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { Label } from "@/components/shared/label";
import { PageTitle } from "@/components/shared/page-title";
import { cn } from "@/components/shared/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ConversationItem {
 id: string;
 status: string;
 metadata: any;
 createdAt: Date;
 updatedAt: Date;
 leadProfile: {
 id: string | null;
 name: string | null;
 email: string | null;
 phone: string | null;
 status: string | null;
 leadScore: number | null;
 } | null;
}

export default function ConversationsPage() {
 const [conversationsList, setConversationsList] = useState<ConversationItem[]>([]);
 const [selectedId, setSelectedId] = useState<string | null>(null);
 const [activeDetails, setActiveDetails] = useState<any | null>(null);
 const [loadingList, setLoadingList] = useState(true);
 const [loadingDetails, setLoadingDetails] = useState(false);
 const [testMessage, setTestMessage] = useState("");
 const [sendingMessage, setSendingMessage] = useState(false);
 const [errorMsg, setErrorMsg] = useState("");

 // Load conversations list
 const loadList = async () => {
 setLoadingList(true);
 const res = await getConversationsAction();
 if (res.success && res.data) {
 setConversationsList(res.data as any[]);
 if (res.data.length > 0 && !selectedId) {
 setSelectedId(res.data[0].id);
 }
 } else {
 setErrorMsg(res.error || "Failed to load conversations");
 }
 setLoadingList(false);
 };

 useEffect(() => {
 loadList();
 }, []);

 // Load details when selected conversation changes
 useEffect(() => {
 if (!selectedId) return;

 const loadDetails = async () => {
 setLoadingDetails(true);
 const res = await getConversationDetailsAction(selectedId);
 if (res.success && res.data) {
 setActiveDetails(res.data);
 } else {
 setErrorMsg(res.error || "Failed to load conversation details");
 }
 setLoadingDetails(false);
 };

 loadDetails();
 }, [selectedId]);

 const handleSendMessage = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedId || !testMessage.trim() || !activeDetails) return;

 try {
 setSendingMessage(true);
 const orgId = activeDetails.conversation.organizationId;
 const res = await sendMessageAction({
 organizationId: orgId,
 conversationId: selectedId,
 message: testMessage
 });

 if (res.success && res.data) {
 setTestMessage("");
 const detailsRes = await getConversationDetailsAction(selectedId);
 if (detailsRes.success && detailsRes.data) {
 setActiveDetails(detailsRes.data);
 }
 await loadList();
 } else {
 setErrorMsg(res.error || "Failed to send message");
 }
 } catch (err: any) {
 setErrorMsg(err.message || "Failed to deliver message");
 } finally {
 setSendingMessage(false);
 }
 };

 const getStatusBadge = (status: string) => {
 switch (status) {
 case "active":
 return <Badge variant="success">Active</Badge>;
 case "escalated":
 return <Badge variant="destructive">Escalated</Badge>;
 case "closed":
 return <Badge>Closed</Badge>;
 default:
 return <Badge>{status}</Badge>;
 }
 };

 const getLeadStatusBadge = (status: string) => {
 switch (status) {
 case "New":
 return <Badge variant="info">New</Badge>;
 case "Qualified":
 return <Badge variant="success">Qualified</Badge>;
 case "Hot":
 return <Badge variant="warning">Hot</Badge>;
 case "Escalated":
 return <Badge variant="destructive">Escalated</Badge>;
 default:
 return <Badge>{status}</Badge>;
 }
 };

 const getInitials = (name: string) => {
 if (!name) return "AC";
 const parts = name.trim().split(/\s+/);
 if (parts.length >= 2 && parts[0] && parts[1]) {
 return (parts[0][0] + parts[1][0]).toUpperCase();
 }
 return name.slice(0, 2).toUpperCase();
 };

 const getAvatarGradient = (name: string) => {
 const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
 const gradients = [
 "from-indigo-500 to-purple-500",
 "from-blue-500 to-cyan-500",
 "from-purple-500 to-pink-500",
 "from-emerald-500 to-teal-500",
 "from-amber-500 to-orange-500"];

 return gradients[hash % gradients.length];
 };

 return (
 <div className="space-y-space-4 animate-fade-in w-full h-full flex flex-col">
 {/* Header */}
 <PageTitle
 title="Conversations"
 description="See what your AI is saying to customers. Review, test, and replay conversations." />
 

 {errorMsg &&
 <Badge variant="destructive" className="animate-fade-in">
 <AlertCircle className="h-4 w-4 shrink-0" />
 <span className="flex-1 font-medium">{errorMsg}</span>
 <Button className="hover:opacity-70 transition-opacity px-space-1 text-body-sm" onClick={() => setErrorMsg("")}>×</Button>
 </Badge>
 }

 {/* Main Grid Layout with three separate card columns */}
 <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-space-4">

 {/* Card 1: Active Sessions list (Left Panel) */}
 <div className="lg:col-span-3 flex flex-col h-full bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
 <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] flex items-center justify-between shrink-0">
 <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground/60">Active Sessions</span>
 <Button size="icon" variant="ghost" className=" hover:bg-[hsl(var(--foreground)/0.05)]" onClick={loadList} title="Refresh sessions">
 <RotateCw className={cn("h-4 w-4 text-muted-foreground/65 transition-transform duration-500", loadingList && "animate-spin")} />
 </Button>
 </div>

 <ScrollArea className="flex-1 p-space-2 space-y-space-1.5 bg-[hsl(var(--foreground)/0.005)]" horizontal={false}>
 {loadingList ?
 <div className="flex h-40 flex-col items-center justify-center text-caption text-muted-foreground gap-space-2">
 <Loader2 className="h-5 w-5 animate-spin text-primary" />
 <span>Loading sessions...</span>
 </div> :
 conversationsList.length === 0 ?
 <div className="p-space-6 text-center flex flex-col items-center justify-center h-full min-h-64">
 <MessageSquare className="h-8 w-8 text-muted-foreground/20 mb-space-2 animate-float" />
 <span className="text-caption font-semibold text-foreground">No sessions</span>
 <p className="text-caption text-muted-foreground/60 max-w-40 mx-auto mt-space-1 leading-normal">
 No active conversation sessions found.
 </p>
 </div> :

 conversationsList.map((item) => {
 const isSelected = item.id === selectedId;
 const leadName = item.leadProfile?.name || "Anonymous Guest";
 const initials = getInitials(leadName);
 const gradient = getAvatarGradient(leadName);
 const leadScore = item.leadProfile?.leadScore ?? 0;

 return (
 <div
 key={item.id}
 onClick={() => setSelectedId(item.id)}
 className={cn(
 "p-space-3 radius-lg cursor-pointer transition-all duration-200 border flex gap-space-2.5 items-start relative",
 isSelected ?
 "bg-background border-[hsl(var(--primary)/0.25)] scale-[1.01]" :
 "bg-transparent border-transparent hover:bg-[hsl(var(--foreground)/0.03)] hover:border-[hsl(var(--foreground)/0.05)]"
 )} tabIndex={0} onKeyDown={() => {}}>
 
 {isSelected &&
 <span className="absolute left-space-0 top-1/4 bottom-1/4 w-0.75 bg-primary radius-r-full" />
 }

 <div className={`h-7.5 w-7.5 radius-full bg-gradient-to-br ${gradient} text-white text-caption font-semibold flex items-center justify-center shrink-0`}>
 {initials}
 </div>

 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between gap-space-2 mb-space-0.5">
 <span className="text-caption font-medium text-foreground truncate">{leadName}</span>
 {getStatusBadge(item.status)}
 </div>
 <div className="flex items-center justify-between text-caption text-muted-foreground/80 mb-space-1">
 <span className="truncate max-w-32">
 {item.leadProfile?.email || "No email"}
 </span>
 {item.leadProfile?.status && getLeadStatusBadge(item.leadProfile.status)}
 </div>
 <div className="flex items-center justify-between text-caption text-muted-foreground/50 border-t border-[hsl(var(--foreground)/0.03)] pt-space-1.5 mt-space-1">
 <span className="flex items-center gap-space-1">
 <Clock className="h-3 w-3" />
 {new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 </span>
 {leadScore > 0 &&
 <span className="font-semibold text-primary/75">Score: {leadScore}</span>
 }
 </div>
 </div>
 </div>);

 })
 }
 </ScrollArea>
 </div>

 {/* Card 2: Chat Pane (Center Panel) */}
 <div className="lg:col-span-6 flex flex-col h-full bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft- min-w-0">
 {loadingDetails ?
 <div className="flex-1 flex flex-col items-center justify-center text-caption text-muted-foreground gap-space-2">
 <Loader2 className="h-5 w-5 animate-spin text-primary" />
 <span>Loading dialogue context...</span>
 </div> :
 !activeDetails ?
 <div className="flex-1 flex flex-col items-center justify-center p-space-10 text-center gap-space-3 py-space-20">
 <div className="flex h-12 w-12 items-center justify-center radius-xl bg-[hsl(var(--primary)/0.08)] text-primary ring-1 ring-[hsl(var(--primary)/0.12)] animate-float">
 <Bot className="h-5 w-5" />
 </div>
 <h3 className="text-body-sm font-semibold text-foreground mt-space-2">Select a session</h3>
 <p className="max-w-xs text-caption text-muted-foreground/80 leading-normal">
 Choose a session from the list on the left to view timeline history.
 </p>
 </div> :

 <>
 {/* Chat Header */}
 <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] flex flex-wrap items-center justify-between gap-space-3 bg-[hsl(var(--foreground)/0.005)] shrink-0">
 <div className="flex items-center gap-space-2.5">
 <div className={`h-8 w-8 radius-full bg-gradient-to-br ${getAvatarGradient(activeDetails.leadProfile?.name || "Anonymous Guest")} text-white text-caption font-bold flex items-center justify-center shrink-0`}>
 {getInitials(activeDetails.leadProfile?.name || "Anonymous Guest")}
 </div>
 <div>
 <h4 className="text-caption font-semibold text-foreground">
 {activeDetails.leadProfile?.name || "Anonymous Guest"}
 </h4>
 <p className="text-caption text-muted-foreground mt-space-0.25">
 Session ID: <span className="font-mono text-muted-foreground/60">{activeDetails.conversation.id}</span>
 </p>
 </div>
 </div>

 <div className="flex items-center gap-space-2">
 {getStatusBadge(activeDetails.conversation.status)}
 </div>
 </div>

 {/* Message scroll area */}
 <ScrollArea className="flex-1 p-space-4 space-y-space-3.5 bg-[hsl(var(--foreground)/0.05)]" horizontal={false}>
 {activeDetails.messages.map((msg: any) => {
 const isUser = msg.sender === "user";
 const isSystem = msg.sender === "system";

 if (isSystem) {
 return (
 <div key={msg.id} className="flex justify-center my-space-2 animate-fade-in">
 <Badge variant="soft">
 System: {msg.content}
 </Badge>
 </div>);

 }

 return (
 <div key={msg.id} className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
 <div className="flex gap-space-2.5 max-w-5/6">
 {!isUser &&
 <div className="h-7.5 w-7.5 radius-full p-0.5 border border-primary/20 flex items-center justify-center shrink-0 select-none overflow-hidden bg-background">
 <Image
 src="/logo.png"
 alt="Operator AI"
 width={28}
 height={28}
 unoptimized
 className="w-full h-full object-contain"
 />
 </div>
 }
 <div className="space-y-space-1">
 <div className={cn(
 "radius-lg px-space-3.5 py-space-2 text-caption leading-relaxed border",
 isUser ?
 "bg-primary text-primary-foreground border-transparent rounded-tr-none" :
 "bg-card border-[hsl(var(--foreground)/0.06)] text-foreground rounded-tl-none"
 )}>
 <p className="whitespace-pre-wrap">{msg.content}</p>

 {/* Intent detected banner inside assistant */}
 {!isUser && msg.intentDetected &&
 <div className="mt-space-2 pt-space-2 border-t border-[hsl(var(--foreground)/0.04)] flex items-center gap-space-1.5 text-caption text-muted-foreground/80">
 <Tag className="h-3 w-3 text-primary" />
 <span>Intent: <strong>{msg.intentDetected}</strong> (Conf: {msg.confidenceScore})</span>
 </div>
 }
 </div>

 {/* Citations Card inside assistant bubble */}
 {!isUser && msg.citations && msg.citations.length > 0 &&
 <div className="space-y-space-1.5 mt-space-2 pl-space-2 border-l border-primary/20">
 <span className="text-caption text-muted-foreground/60 flex items-center gap-space-1 font-semibold uppercase tracking-wider">
 <FileText className="h-3 w-3 text-muted-foreground/45" /> Citations
 </span>
 <div className="grid grid-cols-1 gap-space-1">
 {msg.citations.map((cit: any, idx: number) =>
 <Badge key={idx} variant="soft">
 <span className="font-semibold text-foreground block truncate mb-space-0.5">{cit.name}</span>
 <span className="italic">"{cit.content}"</span>
 </Badge>
 )}
 </div>
 </div>
 }
 </div>
 </div>
 </div>);

 })}
 
 {/* Inline event triggers timeline */}
 {activeDetails.events && activeDetails.events.map((evt: any) =>
 <Badge key={evt.id} variant="soft" className="w-fit">
 {evt.eventType === "lead_qualified" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
 {evt.eventType === "escalated" && <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />}
 <span>Logged Event: <strong>{evt.eventType.toUpperCase()}</strong></span>
 <CornerDownRight className="h-2.5 w-2.5 text-muted-foreground/40" />
 <span>{new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
 </Badge>
 )}
 </ScrollArea>

 {/* Simulation Input Footer */}
 <div className="p-space-3 border-t border-[hsl(var(--foreground)/0.06)] bg-background shrink-0">
 <form onSubmit={handleSendMessage} className="flex gap-space-2">
 <Input
 value={testMessage}
 onChange={(e) => setTestMessage(e.target.value)}
 placeholder="Type a message to simulate customer response..."
 className="flex-1 bg-background text-caption border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20"
 disabled={sendingMessage || activeDetails.conversation.status === "closed"} />
 
 <Button type="submit" size="sm" className="px-space-3" disabled={sendingMessage || !testMessage.trim() || activeDetails.conversation.status === "closed"}>
 {sendingMessage ?
 <Loader2 className="h-3.5 w-3.5 animate-spin" /> :

 <>
 <Send className="h-3.5 w-3.5 mr-space-1" />
 <span>Simulate</span>
 </>
 }
 </Button>
 </form>
 </div>
 </>
 }
 </div>

 {/* Card 3: Summary details (Right Panel) */}
 <div className="lg:col-span-3 flex flex-col h-full bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
 <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0">
 <h4 className="text-caption font-semibold uppercase tracking-widest text-muted-foreground/50">Session Summary</h4>
 </div>

 <ScrollArea className="flex-1 p-space-4 space-y-space-4 bg-[hsl(var(--foreground)/0.002)]" horizontal={false}>
 {!activeDetails ?
 <div className="h-full flex flex-col items-center justify-center p-space-6 text-center text-caption text-muted-foreground gap-space-2.5 py-space-12">
 <div className="h-10 w-10 radius-full bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.06)] flex items-center justify-center text-muted-foreground/30">
 <User className="h-4.5 w-4.5" />
 </div>
 <span className="text-caption font-medium max-w-36 leading-normal text-muted-foreground/70">Select a session to view summary details</span>
 </div> :

 <>
 {/* Lead profile info */}
 <div className="space-y-space-2">
 <h5 className="text-caption font-semibold uppercase tracking-widest text-muted-foreground/55">Lead Profile Sheet</h5>
 <div className="bg-background border border-[hsl(var(--foreground)/0.05)] radius-lg p-space-3 space-y-space-2.5 text-caption">
 <div className="flex justify-between items-center">
 <span className="text-caption font-semibold text-foreground truncate pr-space-2">
 {activeDetails.leadProfile?.name || "Anonymous Guest"}
 </span>
 {activeDetails.leadProfile?.status && getLeadStatusBadge(activeDetails.leadProfile.status)}
 </div>
 <div className="space-y-space-1 text-muted-foreground text-caption border-t border-[hsl(var(--foreground)/0.03)] pt-space-2 leading-relaxed">
 <div className="truncate">Email: {activeDetails.leadProfile?.email || "Pending..."}</div>
 <div>Phone: {activeDetails.leadProfile?.phone || "Pending..."}</div>
 </div>
 {activeDetails.leadProfile?.leadScore !== null &&
 <div className="pt-space-2 border-t border-[hsl(var(--foreground)/0.03)] flex items-center justify-between text-caption">
 <span className="font-semibold text-muted-foreground/75">Lead Score:</span>
 <span className={cn(
 "font-bold",
 activeDetails.leadProfile.leadScore > 70 ? "text-emerald-500" : "text-primary"
 )}>{activeDetails.leadProfile.leadScore}/100</span>
 </div>
 }
 </div>
 </div>

 {/* Qualification answers list */}
 <div className="space-y-space-2 border-t border-[hsl(var(--foreground)/0.05)] pt-space-3.5">
 <h5 className="text-caption font-semibold uppercase tracking-widest text-muted-foreground/55">Captured Intent Data</h5>
 {activeDetails.leadAnswers && activeDetails.leadAnswers.length === 0 ?
 <p className="text-caption text-muted-foreground/60 leading-normal">No answers captured yet. Lead qualification is currently in progress.</p> :

 <div className="space-y-space-2">
 {activeDetails.leadAnswers.map((ans: any) =>
 <div key={ans.id} className="bg-background border border-[hsl(var(--foreground)/0.04)] radius-lg p-space-2.5 text-caption space-y-space-1">
 <span className="font-semibold text-foreground block leading-normal">{ans.questionText}</span>
 <span className="text-muted-foreground block pl-space-2 border-l border-primary/20 italic">
 {ans.answerValue}
 </span>
 </div>
 )}
 </div>
 }
 </div>

 {/* Summary & Action items */}
 <div className="space-y-space-2 border-t border-[hsl(var(--foreground)/0.05)] pt-space-3.5">
 <h5 className="text-caption font-semibold uppercase tracking-widest text-muted-foreground/55">AI Generated Triage</h5>
 {!activeDetails.summary ?
 <p className="text-caption text-muted-foreground/60 leading-normal">No automated summary compiled yet. Complete qualification flow questions to compile.</p> :

 <div className="space-y-space-3.5 text-caption">
 <div className="bg-background border border-[hsl(var(--foreground)/0.05)] radius-lg p-space-3 text-muted-foreground text-caption leading-relaxed">
 {activeDetails.summary.summaryText}
 </div>

 {/* Action items list */}
 {activeDetails.summary.actionItems && activeDetails.summary.actionItems.length > 0 &&
 <div className="space-y-space-2 bg-[hsl(var(--foreground)/0.015)] border border-[hsl(var(--foreground)/0.04)] radius-lg p-space-3">
 <span className="text-caption font-semibold uppercase tracking-wider text-foreground flex items-center gap-space-1">
 <TrendingUp className="h-3 w-3 text-emerald-500" /> Action Items
 </span>
 <ul className="space-y-space-1 list-disc pl-space-4 text-muted-foreground/85 text-caption leading-relaxed">
 {activeDetails.summary.actionItems.map((act: string, idx: number) =>
 <li key={idx}>{act}</li>
 )}
 </ul>
 </div>
 }
 </div>
 }
 </div>
 </>
 }
 </ScrollArea>
 </div>

 </div>
 </div>);

}