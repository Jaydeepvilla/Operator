"use client";

import { Badge } from "@/components/shared/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import {
 getEscalationsAction,
 resolveEscalationAction,
} from "@/server/actions/admin";
import {
 getOperationalExceptionsAction,
 resolveOperationalExceptionAction,
 retryOperationalExceptionAction,
} from "@/server/actions/exceptions";
import {
 AlertTriangle,
 CheckCircle,
 Clock,
 MessageSquare,
 User,
 Mail,
 Phone,
 FileText,
 CornerDownRight,
 ShieldCheck,
 AlertCircle,
 RotateCw,
 Loader2,
 RefreshCw,
 Layers,
 Activity,
 ArrowRight,
 ExternalLink,
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/shared/dialog";
import { Label } from "@/components/shared/label";
import { PageTitle } from "@/components/shared/page-title";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/shared/tabs";
import { cn } from "@/components/shared/utils";

interface EscalationItem {
 id: string;
 conversationId: string;
 reason: string;
 status: string;
 notes: string | null;
 createdAt: Date;
 updatedAt: Date;
 conversation: any;
 leadProfile: {
 id: string;
 name: string | null;
 email: string | null;
 phone: string | null;
 status: string;
 leadScore: number;
 } | null;
}

interface OperationalExceptionItem {
 id: string;
 category: string;
 severity: "critical" | "high" | "medium" | "low";
 status: "pending" | "investigating" | "resolved" | "ignored";
 title: string;
 explanation: string;
 correlationId: string | null;
 relatedRecordType: string | null;
 relatedRecordId: string | null;
 safeNextAction: string | null;
 retryCount: number;
 retryHistory: any[];
 metadata: any;
 resolutionNotes: string | null;
 createdAt: Date;
 updatedAt: Date;
}

export default function EscalationsPage() {
 const [activeTab, setActiveTab] = useState("exceptions");
 const [escalations, setEscalations] = useState<EscalationItem[]>([]);
 const [exceptions, setExceptions] = useState<OperationalExceptionItem[]>([]);
 const [loading, setLoading] = useState(true);
 
 // Dialog state for customer escalation
 const [selectedEsc, setSelectedEsc] = useState<EscalationItem | null>(null);
 const [escResolutionNotes, setEscResolutionNotes] = useState("");
 const [escDialogOpen, setEscDialogOpen] = useState(false);
 const [resolvingEscId, setResolvingEscId] = useState<string | null>(null);

 // Dialog state for operational exception
 const [selectedExc, setSelectedExc] = useState<OperationalExceptionItem | null>(null);
 const [excResolutionNotes, setExcResolutionNotes] = useState("");
 const [excDialogOpen, setExcDialogOpen] = useState(false);
 const [resolvingExcId, setResolvingExcId] = useState<string | null>(null);
 const [retryingExcId, setRetryingExcId] = useState<string | null>(null);

 const [errorMsg, setErrorMsg] = useState("");

 const loadData = async () => {
 try {
 setLoading(true);
 setErrorMsg("");
 const [escRes, excRes] = await Promise.all([
 getEscalationsAction(),
 getOperationalExceptionsAction(),
 ]);

 if (escRes.success && escRes.data) {
 setEscalations(escRes.data as any[]);
 }
 if (excRes.success && excRes.data) {
 setExceptions(excRes.data as any[]);
 }
 } catch (e: any) {
 setErrorMsg(e.message || "An unexpected error occurred loading exceptions.");
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, []);

 const handleResolveEscalation = async () => {
 if (!selectedEsc) return;
 try {
 setResolvingEscId(selectedEsc.id);
 const res = await resolveEscalationAction(selectedEsc.id, escResolutionNotes);
 if (res.success) {
 setEscDialogOpen(false);
 await loadData();
 } else {
 setErrorMsg(res.error || "Failed to resolve escalation");
 }
 } catch (e: any) {
 setErrorMsg(e.message || "Failed to resolve escalation");
 } finally {
 setResolvingEscId(null);
 }
 };

 const handleResolveException = async () => {
 if (!selectedExc) return;
 try {
 setResolvingExcId(selectedExc.id);
 const res = await resolveOperationalExceptionAction(selectedExc.id, excResolutionNotes);
 if (res.success) {
 setExcDialogOpen(false);
 await loadData();
 } else {
 setErrorMsg(res.error || "Failed to resolve operational exception");
 }
 } catch (e: any) {
 setErrorMsg(e.message || "Failed to resolve operational exception");
 } finally {
 setResolvingExcId(null);
 }
 };

 const handleRetryException = async (exc: OperationalExceptionItem) => {
 try {
 setRetryingExcId(exc.id);
 const res = await retryOperationalExceptionAction(exc.id);
 if (res.success) {
 await loadData();
 } else {
 setErrorMsg(res.error || "Retry failed");
 }
 } catch (e: any) {
 setErrorMsg(e.message || "Retry failed");
 } finally {
 setRetryingExcId(null);
 }
 };

 const getSeverityBadge = (severity: string) => {
 switch (severity) {
 case "critical":
 return <Badge variant="destructive" className="uppercase font-semibold text-caption tracking-wider">Critical</Badge>;
 case "high":
 return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 uppercase font-semibold text-caption">High</Badge>;
 case "medium":
 return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 uppercase font-semibold text-caption">Medium</Badge>;
 default:
 return <Badge variant="secondary" className="uppercase font-semibold text-caption">Low</Badge>;
 }
 };

 const getCategoryLabel = (category: string) => {
 switch (category) {
 case "booking_failure": return "Booking Concurrency";
 case "payment_reconciliation": return "Payment Reconcile";
 case "webhook_failure": return "Webhook Processing";
 case "delivery_failure": return "Message Delivery";
 case "channel_disconnected": return "Integration Health";
 case "calendar_sync": return "Calendar Sync";
 case "knowledge_gap": return "Knowledge Coverage";
 case "human_escalation": return "Customer Handoff";
 default: return category.replace(/_/g, " ");
 }
 };

 // Metrics
 const pendingExceptions = exceptions.filter((e) => e.status === "pending" || e.status === "investigating");
 const criticalExceptions = pendingExceptions.filter((e) => e.severity === "critical" || e.severity === "high");
 const pendingEscalations = escalations.filter((e) => e.status === "pending");

 return (
 <div className="space-y-space-5 animate-fade-in w-full h-full flex flex-col pb-space-12">
 {/* Header */}
 <PageTitle
 title="Tasks & Exceptions"
 description="Unified incident management queue for autonomous recovery, payment discrepancies, and human escalations."
 actions={
 <Button
 variant="outline"
 size="sm"
 onClick={loadData}
 disabled={loading}
 className="flex items-center gap-space-2"
 >
 <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
 <span>Refresh Queue</span>
 </Button>
 }
 />

 {errorMsg && (
 <div className="p-space-4 bg-destructive/10 border-destructive/20 text-destructive text-body-sm rounded-card flex items-center justify-between">
 <div className="flex items-center gap-space-2">
 <AlertCircle className="h-4 w-4 shrink-0" />
 <span>{errorMsg}</span>
 </div>
 <Button variant="ghost" size="sm" onClick={() => setErrorMsg("")}>Dismiss</Button>
 </div>
 )}

 {/* KPI Headline Bar */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-space-4">
 <StatCard
 label="Pending Operational Exceptions"
 value={pendingExceptions.length}
 subtitle="Automated system incidents"
 icon={AlertTriangle}
 />
 <StatCard
 label="High / Critical Severity"
 value={criticalExceptions.length}
 subtitle="Requires immediate triage"
 icon={AlertCircle}
 />
 <StatCard
 label="Customer Handoffs"
 value={pendingEscalations.length}
 subtitle="Awaiting staff contact"
 icon={MessageSquare}
 />
 <StatCard
 label="Resolved Today"
 value={exceptions.filter((e) => e.status === "resolved").length + escalations.filter((e) => e.status === "resolved").length}
 subtitle="Audited and cleared"
 icon={ShieldCheck}
 />
 </div>

 {/* Tabs */}
 <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
 <TabsList className="mb-space-4">
 <TabsTrigger value="exceptions" className="flex items-center gap-space-2">
 <Activity className="h-4 w-4" />
 <span>Operational Exceptions</span>
 {pendingExceptions.length > 0 && (
 <Badge variant="destructive" className="ml-1 text-caption px-1.5 py-0.2">
 {pendingExceptions.length}
 </Badge>
 )}
 </TabsTrigger>
 <TabsTrigger value="escalations" className="flex items-center gap-space-2">
 <User className="h-4 w-4" />
 <span>Customer Escalations</span>
 {pendingEscalations.length > 0 && (
 <Badge variant="secondary" className="ml-1 text-caption px-1.5 py-0.2">
 {pendingEscalations.length}
 </Badge>
 )}
 </TabsTrigger>
 </TabsList>

 {/* Tab 1: Operational Exceptions */}
 <TabsContent value="exceptions" className="space-y-space-4">
 {loading ? (
 <LoadingState message="Inspecting operational exception queue..." />
 ) : exceptions.length === 0 ? (
 <EmptyState
 title="All systems operational"
 description="No unresolved operational exceptions. Bookings, payments, and background jobs are running smoothly."
 icon={ShieldCheck}
 />
 ) : (
 <div className="space-y-space-3">
 {exceptions.map((exc) => (
 <Card
 key={exc.id}
 className={cn(
 "transition-all border-l",
 exc.status === "resolved"
 ? "border-l-emerald-500 opacity-75"
 : exc.severity === "critical"
 ? "border-l-destructive shadow-sm"
 : exc.severity === "high"
 ? "border-l-amber-500"
 : "border-l-blue-500"
 )}
 >
 <CardContent className="p-space-5">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-4">
 <div className="space-y-space-2 flex-1">
 <div className="flex flex-wrap items-center gap-space-2">
 {getSeverityBadge(exc.severity)}
 <Badge variant="outline" className="text-caption">
 {getCategoryLabel(exc.category)}
 </Badge>
 <span className="text-caption text-muted-foreground flex items-center gap-1">
 <Clock className="h-3 w-3" />
 {new Date(exc.createdAt).toLocaleString()}
 </span>
 {exc.status === "resolved" && (
 <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-caption">
 Resolved
 </Badge>
 )}
 </div>

 <div>
 <h3 className="font-semibold text-body text-foreground">
 {exc.title}
 </h3>
 <p className="text-body-sm text-muted-foreground mt-0.5">
 {exc.explanation}
 </p>
 </div>

 {exc.safeNextAction && (
 <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md text-caption text-foreground">
 <span className="font-semibold text-primary">Recommended Action:</span>
 <span>{exc.safeNextAction}</span>
 </div>
 )}

 {exc.correlationId && (
 <div className="text-caption text-muted-foreground font-mono">
 Ref: {exc.relatedRecordType ? `${exc.relatedRecordType} / ` : ""}{exc.correlationId}
 </div>
 )}

 {exc.resolutionNotes && (
 <div className="text-caption bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 p-2 rounded">
 <span className="font-semibold">Resolution Note:</span> {exc.resolutionNotes}
 </div>
 )}
 </div>

 {/* Action buttons */}
 <div className="flex items-center gap-space-2 shrink-0">
 {exc.status !== "resolved" && (
 <>
 <Button
 variant="outline"
 size="sm"
 onClick={() => handleRetryException(exc)}
 disabled={retryingExcId === exc.id}
 className="flex items-center gap-1.5"
 >
 {retryingExcId === exc.id ? (
 <Loader2 className="h-3.5 w-3.5 animate-spin" />
 ) : (
 <RotateCw className="h-3.5 w-3.5" />
 )}
 <span>Safe Retry</span>
 </Button>
 <Button
 size="sm"
 onClick={() => {
 setSelectedExc(exc);
 setExcResolutionNotes("");
 setExcDialogOpen(true);
 }}
 >
 Resolve
 </Button>
 </>
 )}
 </div>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 )}
 </TabsContent>

 {/* Tab 2: Customer Escalations */}
 <TabsContent value="escalations" className="space-y-space-4">
 {loading ? (
 <LoadingState message="Loading customer escalations..." />
 ) : escalations.length === 0 ? (
 <EmptyState
 title="No customer escalations"
 description="All inbound customer conversations have been resolved autonomously or completed successfully."
 icon={ShieldCheck}
 />
 ) : (
 <div className="space-y-space-3">
 {escalations.map((esc) => (
 <Card
 key={esc.id}
 className={cn(
 "transition-all border-l",
 esc.status === "resolved" ? "border-l-emerald-500 opacity-75" : "border-l-primary"
 )}
 >
 <CardContent className="p-space-5">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-4">
 <div className="space-y-space-2 flex-1">
 <div className="flex flex-wrap items-center gap-space-2">
 <Badge variant={esc.reason === "emergency" ? "destructive" : "secondary"} className="uppercase text-caption font-semibold">
 {esc.reason.replace(/_/g, " ")}
 </Badge>
 <span className="text-caption text-muted-foreground flex items-center gap-1">
 <Clock className="h-3 w-3" />
 {new Date(esc.createdAt).toLocaleString()}
 </span>
 {esc.status === "resolved" ? (
 <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-caption">
 Resolved
 </Badge>
 ) : (
 <Badge variant="outline" className="text-caption text-amber-600 border-amber-500/20">
 Pending Triage
 </Badge>
 )}
 </div>

 <div>
 <div className="flex items-center gap-space-2">
 <h3 className="font-semibold text-body text-foreground">
 {esc.leadProfile?.name || "Customer Caller"}
 </h3>
 {esc.leadProfile?.phone && (
 <span className="text-caption font-mono text-muted-foreground">
 {esc.leadProfile.phone}
 </span>
 )}
 {esc.leadProfile?.email && (
 <span className="text-caption text-muted-foreground">
 • {esc.leadProfile.email}
 </span>
 )}
 </div>
 <p className="text-body-sm text-muted-foreground mt-0.5">
 {esc.notes || "Customer requested human front-desk contact during conversation."}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-space-2 shrink-0">
 {esc.status !== "resolved" && (
 <Button
 size="sm"
 onClick={() => {
 setSelectedEsc(esc);
 setEscResolutionNotes("");
 setEscDialogOpen(true);
 }}
 >
 Mark Handled
 </Button>
 )}
 </div>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 )}
 </TabsContent>
 </Tabs>

 {/* Exception Resolution Dialog */}
 <Dialog open={excDialogOpen} onOpenChange={setExcDialogOpen}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>Resolve Operational Exception</DialogTitle>
 <DialogDescription>
 Record the corrective action taken to verify and clear this operational incident.
 </DialogDescription>
 </DialogHeader>
 <div className="space-y-space-4 py-space-2">
 <div>
 <Label className="text-caption">Incident Summary</Label>
 <p className="text-body-sm font-medium mt-1">{selectedExc?.title}</p>
 <p className="text-caption text-muted-foreground">{selectedExc?.explanation}</p>
 </div>
 <div className="space-y-space-2">
 <Label htmlFor="exc-notes">Resolution Notes</Label>
 <textarea
 id="exc-notes"
 className="w-full rounded-md border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
 placeholder="e.g. Manually verified payment captured in Stripe and confirmed booking on calendar..."
 value={excResolutionNotes}
 onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setExcResolutionNotes(e.target.value)}
 rows={3}
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setExcDialogOpen(false)}>
 Cancel
 </Button>
 <Button onClick={handleResolveException} disabled={Boolean(resolvingExcId)}>
 {resolvingExcId ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
 Confirm Resolution
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Escalation Resolution Dialog */}
 <Dialog open={escDialogOpen} onOpenChange={setEscDialogOpen}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>Complete Customer Handoff</DialogTitle>
 <DialogDescription>
 Mark this customer handoff as handled and record notes for your team.
 </DialogDescription>
 </DialogHeader>
 <div className="space-y-space-4 py-space-2">
 <div>
 <Label className="text-caption">Customer</Label>
 <p className="text-body-sm font-medium mt-1">{selectedEsc?.leadProfile?.name || "Customer Caller"}</p>
 <p className="text-caption text-muted-foreground">{selectedEsc?.notes}</p>
 </div>
 <div className="space-y-space-2">
 <Label htmlFor="esc-notes">Notes</Label>
 <textarea
 id="esc-notes"
 className="w-full rounded-md border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
 placeholder="e.g. Called client back, answered pricing query, booked appointment..."
 value={escResolutionNotes}
 onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEscResolutionNotes(e.target.value)}
 rows={3}
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setEscDialogOpen(false)}>
 Cancel
 </Button>
 <Button onClick={handleResolveEscalation} disabled={Boolean(resolvingEscId)}>
 {resolvingEscId ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
