"use client";

import { Badge } from "@/components/shared/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import {
 getEscalationsAction,
 resolveEscalationAction
} from"@/server/actions/admin";
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
} from"lucide-react";
import { Button } from"@/components/shared/button";
import { Card, CardHeader, CardTitle, CardContent } from"@/components/shared/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from"@/components/shared/dialog";
import { Input } from"@/components/shared/input";
import { Label } from"@/components/shared/label";
import { PageTitle } from"@/components/shared/page-title";
import { StatCard } from"@/components/shared/stat-card";
import { EmptyState } from"@/components/shared/empty-state";
import { LoadingState } from"@/components/shared/loading-state";
import { cn } from"@/components/shared/utils";

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

export default function EscalationsPage() {
 const [escalations, setEscalations] = useState<EscalationItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [selectedEsc, setSelectedEsc] = useState<EscalationItem | null>(null);
 const [resolutionNotes, setResolutionNotes] = useState("");
 const [resolvingId, setResolvingId] = useState<string | null>(null);
 const [dialogOpen, setDialogOpen] = useState(false);
 const [errorMsg, setErrorMsg] = useState("");

 const loadEscalations = async () => {
 try {
 setLoading(true);
 const res = await getEscalationsAction();
 if (res.success && res.data) {
 setEscalations(res.data as any[]);
 } else {
 setErrorMsg(res.error ||"Failed to load escalations");
 }
 } catch (e: any) {
 setErrorMsg(e.message ||"An unexpected error occurred");
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadEscalations();
 }, []);

 const openResolveDialog = (esc: EscalationItem) => {
 setSelectedEsc(esc);
 setResolutionNotes("");
 setDialogOpen(true);
 };

 const handleResolve = async () => {
 if (!selectedEsc) return;

 try {
 setResolvingId(selectedEsc.id);
 const res = await resolveEscalationAction(selectedEsc.id, resolutionNotes);
 if (res.success) {
 setDialogOpen(false);
 await loadEscalations();
 } else {
 setErrorMsg(res.error ||"Failed to resolve escalation");
 }
 } catch (e: any) {
 setErrorMsg(e.message ||"Failed to resolve escalation");
 } finally {
 setResolvingId(null);
 }
 };

 const getReasonBadge = (reason: string) => {
 switch (reason) {
 case"emergency":
 return <span className="badge-status badge-error text-caption px-space-1.5 py-space-0.5 rounded uppercase font-semibold tracking-wider">Emergency</span>;
 case"user_request":
 return <span className="badge-status badge-primary text-caption px-space-1.5 py-space-0.5 rounded uppercase font-semibold tracking-wider">User Request</span>;
 case"repeated_failure":
 return <span className="badge-status badge-warning text-caption px-space-1.5 py-space-0.5 rounded uppercase font-semibold tracking-wider">Repeated Failure</span>;
 default:
 return <span className="badge-status badge-neutral text-caption px-space-1.5 py-space-0.5 rounded uppercase font-semibold tracking-wider">{reason}</span>;
 }
 };

 const getStatusBadge = (status: string) => {
 switch (status) {
 case"pending":
 return <span className="badge-status badge-error text-caption px-space-1.5 py-space-0.5 rounded flex items-center gap-space-1"><Clock className="h-3 w-3 animate-pulse"/> Pending Triage</span>;
 case"resolved":
 return <span className="badge-status badge-success text-caption px-space-1.5 py-space-0.5 rounded flex items-center gap-space-1"><CheckCircle className="h-3 w-3"/> Resolved</span>;
 default:
 return <span className="badge-status badge-neutral text-caption px-space-1.5 py-space-0.5 rounded">{status}</span>;
 }
 };

 const getInitials = (name: string) => {
 if (!name) return"ES";
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
 "from-amber-500 to-orange-500",
 ];
 return gradients[hash % gradients.length];
 };

 const pendingCount = escalations.filter((e) => e.status ==="pending").length;
 const resolvedCount = escalations.filter((e) => e.status ==="resolved").length;

 return (
 <div className="space-y-space-4 animate-fade-in w-full h-full flex flex-col">
 {/* Header */}
 <PageTitle
 title="Escalations"
 description="Conversations the AI couldn't handle. Review and respond to these first."
 />

 {errorMsg && (
 <div className="flex items-center gap-space-2 radius-lg bg-state-error-bg border border-state-error-text/15 px-space-4 py-space-2.5 text-caption text-state-error-text shrink-0 animate-fade-in">
 <AlertCircle className="h-4 w-4 shrink-0"/>
 <span className="flex-1 font-medium">{errorMsg}</span>
 <Button className="hover:opacity-70 transition-opacity font-semibold px-space-1 text-body-sm cursor-pointer"onClick={() => setErrorMsg("")}>×</Button>
 </div>
 )}

 {/* Triage Overview Metrics */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-4 shrink-0">
 <StatCard label="Pending Escalations"value={pendingCount} icon={AlertTriangle} />
 <StatCard label="Resolved Handoffs"value={resolvedCount} icon={ShieldCheck} />
 </div>

 {/* Escalation Queue List Container */}
 <div className="flex-1 min-h-0 flex flex-col bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
 <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] flex items-center justify-between shrink-0">
 <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground/60">Triage Tickets Queue ({escalations.length})</span>
 <Button 
 size="icon"
 variant="ghost"
 className="h-8.5 w-8.5 radius-full hover:bg-[hsl(var(--foreground)/0.05)] cursor-pointer"
 onClick={loadEscalations}
 title="Refresh queue"
 >
 <RotateCw className={cn("h-4 w-4 text-muted-foreground/65 transition-transform duration-500", loading &&"animate-spin")} />
 </Button>
 </div>

 <ScrollArea className="flex-1 bg-[hsl(var(--foreground)/0.002)]" horizontal={false} vertical={escalations.length > 2}>
    <div className="p-space-4 space-y-space-3">
      {loading ? (
        <LoadingState message="Loading triage queue"/>
      ) : escalations.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Queue is clean!"
          description="No customer escalations requiring human attention found."
          className="border-none bg-transparent"
        />
      ) : (
        escalations.map((esc) => {
          const leadName = esc.leadProfile?.name ||"Anonymous Guest";
          const isPending = esc.status ==="pending";
          const initials = getInitials(leadName);
          const gradient = getAvatarGradient(leadName);

          return (
            <div 
              key={esc.id} 
              className={cn(
                "p-space-4 radius-lg border transition-all duration-200 bg-background/50",
                isPending 
                  ?"border-[hsl(var(--primary)/0.12)] hover:border-[hsl(var(--primary)/0.25)]"
                  :"border-[hsl(var(--foreground)/0.05)] hover:border-[hsl(var(--foreground)/0.1)]"
              )}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-4">
                <div className="space-y-space-3 flex-1 min-w-0">
                  {/* Badge / Status Row */}
                  <div className="flex flex-wrap items-center gap-space-2">
                    {getReasonBadge(esc.reason)}
                    {getStatusBadge(esc.status)}
                    <span className="text-caption text-muted-foreground/60 flex items-center gap-space-1">
                      <Clock className="h-3 w-3"/>
                      {new Date(esc.createdAt).toLocaleString([], { dateStyle:'short', timeStyle:'short'})}
                    </span>
                  </div>

                  {/* Content details */}
                  <div className="space-y-space-2">
                    <div className="flex items-center gap-space-2 text-caption font-semibold text-foreground">
                      <div className={`h-6.5 w-6.5 radius-full bg-gradient-to-br ${gradient} text-white text-caption font-semibold flex items-center justify-center shrink-0`}>
                        {initials}
                      </div>
                      <span>Customer: {leadName}</span>
                    </div>
                    
                    {esc.notes && (
                      <div className="bg-background border border-[hsl(var(--foreground)/0.05)] radius-md p-space-3 text-caption text-muted-foreground/90 max-w-2xl leading-relaxed">
                        <span className="text-caption font-semibold uppercase tracking-wider text-foreground/50 block mb-space-1">Issue Details</span>
                        "{esc.notes}"
                      </div>
                    )}
                  </div>

                  {/* Contact metadata profile */}
                  {esc.leadProfile && (
                    <div className="flex flex-wrap gap-x-space-4 gap-y-space-1 pt-space-2.5 border-t border-[hsl(var(--foreground)/0.04)] text-caption text-muted-foreground/75 leading-none">
                      {esc.leadProfile.email && <span className="flex items-center gap-space-1.5"><Mail className="h-3 w-3 text-muted-foreground/45"/>{esc.leadProfile.email}</span>}
                      {esc.leadProfile.phone && <span className="flex items-center gap-space-1.5"><Phone className="h-3 w-3 text-muted-foreground/45"/>{esc.leadProfile.phone}</span>}
                      <span className="font-medium">Score: <strong className="text-primary">{esc.leadProfile.leadScore}/100</strong></span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-space-2 shrink-0 md:pl-space-4">
                  {isPending ? (
                    <>
                      <Button
                        onClick={() => openResolveDialog(esc)}
                        size="sm"
                        className="text-caption font-semibold px-space-3 h-8"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 mr-space-1"/> Mark Resolved
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-caption font-semibold px-space-3 h-8 border-[hsl(var(--foreground)/0.06)] opacity-40 cursor-not-allowed"
                        disabled
                      >
                        Ignore
                      </Button>
                    </>
                  ) : (
                    <span className="text-caption text-muted-foreground/80 font-semibold italic flex items-center gap-space-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/15 py-space-1 px-space-2.5 radius-full">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500"/> Resolved Action Saved
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  </ScrollArea>
 </div>

 {/* Resolution notes dialog popup */}
 <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
 <DialogContent className="sm:max-w-md bg-card border-[hsl(var(--foreground)/0.08)] radius-xl">
 <DialogHeader>
 <DialogTitle className="text-body-sm font-semibold text-foreground">Resolve Escalation Ticket</DialogTitle>
 <DialogDescription className="text-caption text-muted-foreground mt-space-1 leading-normal">
 Add review notes outlining what actions were taken. This returns the receptionist chatbot back to active.
 </DialogDescription>
 </DialogHeader>
 <div className="space-y-space-4 py-space-3 text-caption">
 <div className="space-y-space-1.5">
 <Label htmlFor="notes"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Resolution Notes</Label>
 <Input
 id="notes"
 value={resolutionNotes}
 onChange={(e) => setResolutionNotes(e.target.value)}
 placeholder="e.g. Called client directly, booked appointment for tomorrow at 10 AM."
 className="text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 h-9.5"
 disabled={resolvingId !== null}
 />
 </div>
 </div>
 <DialogFooter className="flex gap-space-2 border-t border-[hsl(var(--foreground)/0.05)] pt-space-3">
 <Button variant="outline"size="sm"onClick={() => setDialogOpen(false)} disabled={resolvingId !== null} className="h-8.5 text-caption font-semibold">
 Cancel
 </Button>
 <Button size="sm"onClick={handleResolve} disabled={resolvingId !== null || !resolutionNotes.trim()} className="h-8.5 text-caption font-semibold">
 {resolvingId ? (
 <>
 <Loader2 className="h-3.5 w-3.5 animate-spin mr-space-1"/>
 <span>Resolving...</span>
 </>
 ) : (
 <span>Confirm Resolve</span>
 )}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
