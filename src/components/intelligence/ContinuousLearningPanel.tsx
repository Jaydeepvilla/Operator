"use client";

import React, { useState, useEffect } from "react";
import { 
  Sparkles, RefreshCw, CheckCircle2, AlertTriangle, XCircle, 
  RotateCcw, ArrowRight, ShieldCheck, HelpCircle, FileText, Check, Clock, AlertCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { cn } from "@/components/shared/utils";

interface KnowledgeGap {
  id: string;
  queryText: string;
  normalizedTopic: string;
  frequency: number;
  gapType: string;
  status: string;
  lastSeenAt: string;
}

interface Proposal {
  id: string;
  proposalType: string;
  title: string;
  description: string;
  safetyLevel: string;
  status: string;
  proposedChanges: any;
  impactEstimate: any;
  appliedAt?: string;
  createdAt: string;
}

interface KnowledgeConflict {
  id: string;
  topic: string;
  description: string;
  sourceA: string;
  sourceB: string;
  severity: string;
}

interface LearningSummary {
  recentSignals: any[];
  pendingProposals: Proposal[];
  appliedProposals: Proposal[];
  knowledgeGaps: KnowledgeGap[];
  knowledgeConflicts: KnowledgeConflict[];
  evaluationHistory: any[];
  totalPending: number;
  totalApplied: number;
  totalGaps: number;
  totalConflicts: number;
}

export function ContinuousLearningPanel() {
  const [data, setData] = useState<LearningSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/dashboard/learning");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      }
    } catch (err) {
      console.error("Failed to load learning summary:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleRunCycle = async () => {
    try {
      setIsProcessing(true);
      setActionMessage("Running continuous learning cycle...");
      const res = await fetch("/api/dashboard/learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_cycle" }),
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage(`Learning cycle complete: ${json.cycleResult?.signals || 0} signals processed, ${json.cycleResult?.proposals || 0} proposals generated.`);
        await fetchSummary();
      }
    } catch {
      setActionMessage("Failed to execute learning cycle.");
    } finally {
      setIsProcessing(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleApplyProposal = async (proposalId: string) => {
    try {
      setIsProcessing(true);
      const res = await fetch("/api/dashboard/learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply", proposalId }),
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage("Improvement successfully applied with active rollback snapshot.");
        await fetchSummary();
      }
    } catch {
      setActionMessage("Failed to apply improvement.");
    } finally {
      setIsProcessing(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleRollbackProposal = async (proposalId: string) => {
    try {
      setIsProcessing(true);
      const res = await fetch("/api/dashboard/learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rollback", proposalId }),
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage("Improvement successfully rolled back.");
        await fetchSummary();
      }
    } catch {
      setActionMessage("Failed to rollback improvement.");
    } finally {
      setIsProcessing(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleResolveGap = async (gapId: string) => {
    try {
      const res = await fetch("/api/dashboard/learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve_gap", gapId }),
      });
      if (res.ok) {
        await fetchSummary();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <Card className="border border-border-default bg-card p-space-6 radius-lg animate-pulse">
        <div className="h-6 w-48 bg-muted rounded mb-space-4" />
        <div className="h-4 w-72 bg-muted/60 rounded" />
      </Card>
    );
  }

  const openGaps = (data?.knowledgeGaps || []).filter((g) => g.status === "open");
  const pendingProposals = data?.pendingProposals || [];
  const appliedProposals = data?.appliedProposals || [];
  const conflicts = data?.knowledgeConflicts || [];

  return (
    <section className="space-y-space-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-space-4 border-b border-border-default pb-space-4">
        <div>
          <div className="flex items-center gap-space-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-body-lg font-bold text-foreground">Self-Learning AI Engine</h3>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Active Closed Loop
            </span>
          </div>
          <p className="text-caption text-muted-foreground mt-space-1">
            Autonomous detection of unanswered questions, customer corrections, knowledge conflicts, and candidate improvements.
          </p>
        </div>

        <div className="flex items-center gap-space-3">
          <Button
            onClick={handleRunCycle}
            disabled={isProcessing}
            variant="outline"
            size="sm"
            className="font-bold flex items-center gap-space-2"
          >
            <RefreshCw className={cn("h-4 w-4", isProcessing && "animate-spin text-primary")} />
            <span>{isProcessing ? "Analyzing Signals..." : "Run Learning Cycle"}</span>
          </Button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-space-3 radius-md bg-primary/10 border border-primary/20 text-body-sm text-foreground flex items-center gap-space-2 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Real Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-space-4">
        <Card className="border border-border-default bg-card">
          <CardContent className="p-space-4 space-y-space-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Unanswered Gaps</span>
            <div className="text-display-xs font-bold text-foreground">{openGaps.length}</div>
            <p className="text-[11px] text-muted-foreground">Clustered customer questions</p>
          </CardContent>
        </Card>

        <Card className="border border-border-default bg-card">
          <CardContent className="p-space-4 space-y-space-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Pending Candidates</span>
            <div className="text-display-xs font-bold text-amber-500">{pendingProposals.length}</div>
            <p className="text-[11px] text-muted-foreground">Level 3 review required</p>
          </CardContent>
        </Card>

        <Card className="border border-border-default bg-card">
          <CardContent className="p-space-4 space-y-space-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Applied Improvements</span>
            <div className="text-display-xs font-bold text-emerald-500">{appliedProposals.length}</div>
            <p className="text-[11px] text-muted-foreground">With rollback snapshots</p>
          </CardContent>
        </Card>

        <Card className="border border-border-default bg-card">
          <CardContent className="p-space-4 space-y-space-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Knowledge Conflicts</span>
            <div className={cn("text-display-xs font-bold", conflicts.length > 0 ? "text-rose-500" : "text-foreground")}>
              {conflicts.length}
            </div>
            <p className="text-[11px] text-muted-foreground">Contradictions detected</p>
          </CardContent>
        </Card>
      </div>

      {/* Contradictory Knowledge Alerts */}
      {conflicts.length > 0 && (
        <div className="p-space-4 radius-lg border border-rose-500/25 bg-rose-500/[0.03] space-y-space-3">
          <div className="flex items-center gap-space-2 text-rose-500 font-bold text-body-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>Contradictory Knowledge Detected</span>
          </div>
          <div className="space-y-space-2">
            {conflicts.map((c) => (
              <div key={c.id} className="p-space-3 radius-md bg-card border border-border-default text-caption space-y-1">
                <span className="font-bold text-foreground">{c.topic}</span>
                <p className="text-muted-foreground">{c.description}</p>
                <div className="flex gap-space-4 text-[11px] pt-1">
                  <span className="text-rose-400">Source A: {c.sourceA}</span>
                  <span className="text-amber-400">Source B: {c.sourceB}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout: Candidates & Gaps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-6">
        {/* Left Column: Learning Candidates Pending Review */}
        <div className="space-y-space-4">
          <div className="flex items-center justify-between">
            <h4 className="text-body-md font-bold text-foreground flex items-center gap-space-2">
              <ShieldCheck className="h-4 w-4 text-amber-500" />
              <span>Improvement Candidates (Level 3 Review)</span>
            </h4>
            <span className="text-caption text-muted-foreground">{pendingProposals.length} awaiting review</span>
          </div>

          {pendingProposals.length === 0 ? (
            <Card className="border border-border-dashed bg-muted/10 p-space-6 radius-lg text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500/60 mx-auto mb-space-2" />
              <h5 className="text-body-sm font-bold text-foreground">No Pending Improvement Proposals</h5>
              <p className="text-caption text-muted-foreground max-w-sm mx-auto mt-space-1">
                Operator will automatically formulate candidate improvements when repeated customer questions or corrections occur.
              </p>
            </Card>
          ) : (
            <div className="space-y-space-3">
              {pendingProposals.map((prop) => {
                const changes = prop.proposedChanges as any;
                return (
                  <Card key={prop.id} className="border border-border-default bg-card hover:border-primary/30 transition-all">
                    <CardContent className="p-space-4 space-y-space-3">
                      <div className="flex items-start justify-between gap-space-2">
                        <div>
                          <div className="flex items-center gap-space-2">
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              {prop.proposalType.replace("_", " ")}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Impact: {prop.impactEstimate?.affectedConversations || 1} turns
                            </span>
                          </div>
                          <h5 className="text-body-sm font-bold text-foreground mt-space-1">{prop.title}</h5>
                        </div>
                      </div>

                      <p className="text-caption text-muted-foreground leading-relaxed">{prop.description}</p>

                      {changes?.question && changes?.suggestedAnswer && (
                        <div className="p-space-3 radius-md bg-muted/20 border border-border-subtle text-caption space-y-1">
                          <span className="font-bold text-foreground block">Q: {changes.question}</span>
                          <span className="text-muted-foreground block">A: {changes.suggestedAnswer}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-space-2 pt-space-2 border-t border-border-subtle">
                        <Button
                          onClick={() => handleApplyProposal(prop.id)}
                          disabled={isProcessing}
                          size="xs"
                          className="font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          <span>Approve & Apply</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Unanswered Knowledge Gaps */}
        <div className="space-y-space-4">
          <div className="flex items-center justify-between">
            <h4 className="text-body-md font-bold text-foreground flex items-center gap-space-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              <span>Unanswered Knowledge Gaps</span>
            </h4>
            <span className="text-caption text-muted-foreground">{openGaps.length} gaps open</span>
          </div>

          {openGaps.length === 0 ? (
            <Card className="border border-border-dashed bg-muted/10 p-space-6 radius-lg text-center">
              <FileText className="h-8 w-8 text-primary/40 mx-auto mb-space-2" />
              <h5 className="text-body-sm font-bold text-foreground">No Knowledge Gaps Detected</h5>
              <p className="text-caption text-muted-foreground max-w-sm mx-auto mt-space-1">
                All customer queries in recent conversations were successfully answered by your business profile, service catalog, or knowledge base documents.
              </p>
            </Card>
          ) : (
            <div className="space-y-space-3">
              {openGaps.map((gap) => (
                <Card key={gap.id} className="border border-border-default bg-card">
                  <CardContent className="p-space-4 flex items-start justify-between gap-space-3">
                    <div className="space-y-space-1">
                      <div className="flex items-center gap-space-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          Asked {gap.frequency} {gap.frequency === 1 ? "time" : "times"}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(gap.lastSeenAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h5 className="text-body-sm font-bold text-foreground mt-space-1">
                        &quot;{gap.queryText}&quot;
                      </h5>
                      <span className="text-[11px] text-muted-foreground block">
                        Topic cluster: <code className="text-primary font-mono">{gap.normalizedTopic}</code>
                      </span>
                    </div>

                    <Button
                      onClick={() => handleResolveGap(gap.id)}
                      variant="outline"
                      size="xs"
                      className="shrink-0 text-muted-foreground hover:text-foreground font-bold"
                    >
                      <span>Dismiss / Resolve</span>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Applied Improvements with Rollback */}
      {appliedProposals.length > 0 && (
        <div className="space-y-space-3 pt-space-4 border-t border-border-default">
          <h4 className="text-body-sm font-bold text-foreground flex items-center gap-space-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Active Applied Improvements & Version Snapshots</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-3">
            {appliedProposals.map((prop) => (
              <div
                key={prop.id}
                className="p-space-3 radius-md bg-muted/20 border border-border-default flex items-center justify-between gap-space-3"
              >
                <div>
                  <h6 className="text-caption font-bold text-foreground">{prop.title}</h6>
                  <span className="text-[10px] text-muted-foreground">
                    Applied on {prop.appliedAt ? new Date(prop.appliedAt).toLocaleDateString() : "auto"}
                  </span>
                </div>

                <Button
                  onClick={() => handleRollbackProposal(prop.id)}
                  disabled={isProcessing}
                  variant="outline"
                  size="xs"
                  className="shrink-0 text-rose-500 hover:bg-rose-500/10 border-rose-500/20 font-bold flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Roll Back</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
