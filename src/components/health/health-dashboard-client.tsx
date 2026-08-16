"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Activity, AlertTriangle, PhoneCall, 
  BookOpen, Calendar, Users, CreditCard, ArrowRight, Clock, 
  Sparkles, CheckCircle2, Info, ChevronRight, Calculator, Check, ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { Card, CardContent } from "@/components/shared/card";
import { OverallHealthResult } from "@/lib/health-engine/overall";
import { HealthScoreResult } from "@/lib/health-engine/types";
import { QualityScoreResult } from "@/lib/quality-engine/knowledge-quality";
import { cn } from "@/components/shared/utils";

interface BlockerIssue {
  id: string;
  category: string;
  priority: string;
  reason: string;
  impact: string;
  href: string;
  ctaText: string;
  estimatedFixTimeMinutes: number;
}

interface HealthDashboardClientProps {
  orgName: string;
  orgIndustry: string | null;
  overallHealth: OverallHealthResult;
  criticalIssues: BlockerIssue[];
  aiReadiness: any;
  gapAnalysis: any;
  industryBenchmark: any;
  automationOpportunities: any;
  nextBestAction: any;
  qualityScores: {
    knowledge: QualityScoreResult;
    channels: QualityScoreResult;
    crm: QualityScoreResult;
    appointment: HealthScoreResult;
    staff: HealthScoreResult;
    billing: HealthScoreResult;
  };
  stats: {
    faqCount: number;
    docCount: number;
    staffCount: number;
    servicesCount: number;
    channelCount: number;
    hasBilling: boolean;
    planName: string;
  };
}

export function HealthDashboardClient({
  orgName,
  overallHealth,
  industryBenchmark,
  nextBestAction,
  qualityScores,
  stats
}: HealthDashboardClientProps) {
  const [activeCapability, setActiveCapability] = useState<string | null>(null);

  const overallScore = overallHealth.overallScore;
  const isHealthy = overallScore >= 80;
  const isWarning = overallScore >= 50 && overallScore < 80;
  
  // Status definitions
  const statusText = isHealthy 
    ? "Operator AI Active & Healthy" 
    : isWarning 
    ? "Configuration Optimization Suggested" 
    : "Blockers Preventing AI Operations";

  // Dynamic grouped missing requirements computed traceably from individual calculators
  const groupedMissing = [
    { category: "Knowledge Base Context", items: qualityScores.knowledge.missingRequirements || [], href: "/kb" },
    { category: "Inbox & Channels", items: qualityScores.channels.missingRequirements || [], href: "/channels" },
    { category: "Booking & Cancellation Policies", items: qualityScores.appointment.missingRequirements || [], href: "/settings/booking" },
    { category: "Staff & Calendars", items: qualityScores.staff.missingRequirements || [], href: "/staff" },
    { category: "Billing & Stripe", items: qualityScores.billing.missingRequirements || [], href: "/billing" },
  ].filter(g => g.items.length > 0);

  const totalMissingRequirementsCount = groupedMissing.reduce((acc, curr) => acc + curr.items.length, 0);

  // Core Capabilities Mapping
  const capabilities = [
    {
      id: "knowledge",
      title: "Context & Knowledge",
      desc: "How well the AI understands your business details & policies.",
      score: qualityScores.knowledge.score,
      maxScore: qualityScores.knowledge.maxScore,
      formula: qualityScores.knowledge.formula,
      whyLow: qualityScores.knowledge.whyLow,
      missingRequirements: qualityScores.knowledge.missingRequirements || [],
      exactActions: qualityScores.knowledge.exactActions || [],
      icon: BookOpen,
      metric: `${stats.docCount} Docs / ${stats.faqCount} FAQs`,
      href: "/kb",
      color: "from-blue-500/20 to-indigo-500/20",
      borderHover: "hover:border-blue-500/30",
      strongPoints: qualityScores.knowledge.strongAreas,
      weakPoints: qualityScores.knowledge.weakAreas,
    },
    {
      id: "channels",
      title: "Omnichannel Inbox",
      desc: "Status of connected channels (SMS, Web Widget, WhatsApp).",
      score: qualityScores.channels.score,
      maxScore: qualityScores.channels.maxScore,
      formula: qualityScores.channels.formula,
      whyLow: qualityScores.channels.whyLow,
      missingRequirements: qualityScores.channels.missingRequirements || [],
      exactActions: qualityScores.channels.exactActions || [],
      icon: PhoneCall,
      metric: `${stats.channelCount} Channels Connected`,
      href: "/channels",
      color: "from-purple-500/20 to-pink-500/20",
      borderHover: "hover:border-purple-500/30",
      strongPoints: qualityScores.channels.strongAreas,
      weakPoints: qualityScores.channels.weakAreas,
    },
    {
      id: "booking",
      title: "Calendar & Scheduling",
      desc: "Appointment rules, calendar connections, and timing limits.",
      score: qualityScores.appointment.score,
      maxScore: qualityScores.appointment.maxScore,
      formula: qualityScores.appointment.formula,
      whyLow: qualityScores.appointment.whyLow,
      missingRequirements: qualityScores.appointment.missingRequirements || [],
      exactActions: qualityScores.appointment.exactActions || [],
      icon: Calendar,
      metric: `${stats.servicesCount} Services Configured`,
      href: "/settings/booking",
      color: "from-amber-500/20 to-orange-500/20",
      borderHover: "hover:border-amber-500/30",
      strongPoints: qualityScores.appointment.recommendations || [],
      weakPoints: qualityScores.appointment.missingRequirements || [],
    },
    {
      id: "staff",
      title: "Staff Availability",
      desc: "Assigned staff profiles, shifts, and working schedules.",
      score: qualityScores.staff.score,
      maxScore: qualityScores.staff.maxScore,
      formula: qualityScores.staff.formula,
      whyLow: qualityScores.staff.whyLow,
      missingRequirements: qualityScores.staff.missingRequirements || [],
      exactActions: qualityScores.staff.exactActions || [],
      icon: Users,
      metric: `${stats.staffCount} Staff Members Active`,
      href: "/staff",
      color: "from-teal-500/20 to-emerald-500/20",
      borderHover: "hover:border-teal-500/30",
      strongPoints: qualityScores.staff.recommendations || [],
      weakPoints: qualityScores.staff.missingRequirements || [],
    },
    {
      id: "billing",
      title: "Billing & Subscriptions",
      desc: "Linked card verification and active SaaS plan level.",
      score: qualityScores.billing.score,
      maxScore: qualityScores.billing.maxScore,
      formula: qualityScores.billing.formula,
      whyLow: qualityScores.billing.whyLow,
      missingRequirements: qualityScores.billing.missingRequirements || [],
      exactActions: qualityScores.billing.exactActions || [],
      icon: CreditCard,
      metric: stats.planName,
      href: "/billing",
      color: "from-rose-500/20 to-red-500/20",
      borderHover: "hover:border-rose-500/30",
      strongPoints: qualityScores.billing.recommendations || [],
      weakPoints: qualityScores.billing.missingRequirements || [],
    }
  ];

  return (
    <div className="space-y-space-6 w-full pb-space-8 animate-page-enter">
      
      {/* ─── 1. INTEGRATED HEADER HERO & COMMAND CENTER STATUS ─── */}
      <section className="relative overflow-hidden border border-border-default radius-lg bg-bg-layer-1 p-space-6 md:p-space-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-primary/10 via-transparent to-transparent opacity-60 pointer-events-none" />
        
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-6 items-center">
          
          {/* AI Operational Pulse & Big Metrics (7 columns) */}
          <div className="xl:col-span-7 space-y-space-5">
            <div className="flex items-start gap-space-3">
              <div className="relative flex items-center justify-center w-4 h-4 shrink-0 mt-space-0.5">
                <span className={cn(
                  "absolute inset-0 rounded-full opacity-75 animate-ping",
                  isHealthy ? "bg-success-500" : isWarning ? "bg-warning-500" : "bg-error-500"
                )} />
                <span className={cn(
                  "relative rounded-full h-2.5 w-2.5",
                  isHealthy ? "bg-success-500" : isWarning ? "bg-warning-500" : "bg-error-500"
                )} />
              </div>
              <div>
                <span className="text-caption font-semibold tracking-widest uppercase text-muted-foreground block mb-space-0.5">{orgName}</span>
                <h1 className="text-title-md font-bold text-foreground tracking-tight leading-tight">{statusText}</h1>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-space-6 pt-space-2">
              {/* Giant Health Ring */}
              <div className="flex items-center gap-space-4">
                <div className="relative flex items-center justify-center">
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" fill="transparent" stroke="hsl(var(--border))" strokeWidth="5.5" />
                    <circle cx="40" cy="40" r="32" fill="transparent" stroke="currentColor" strokeWidth="5.5" 
                      strokeDasharray="201.06" 
                      strokeDashoffset={201.06 - (201.06 * overallScore) / 100}
                      className={cn(
                        "transition-all duration-1000 ease-out",
                        isHealthy ? "text-success-500" : isWarning ? "text-warning-500" : "text-error-500"
                      )} 
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-body-sm font-bold leading-none">{overallScore}%</span>
                    <span className="text-caption text-muted-foreground font-bold scale-75 tracking-wider mt-space-0.5 block">HEALTH</span>
                  </div>
                </div>
                <div>
                  <div className="text-title-md font-bold text-foreground">AI Readiness Score</div>
                  <div className="flex items-center gap-space-1.5 mt-space-1 text-caption text-muted-foreground">
                    <Calculator className="h-3.5 w-3.5" />
                    <span>Formula: Weighted average of capabilities</span>
                  </div>
                </div>
              </div>

              {/* Business Completion Progress */}
              <div className="flex-1 w-full sm:max-w-xs space-y-space-1.5 border-t sm:border-t-0 sm:border-l border-border-subtle pt-space-4 sm:pt-0 sm:pl-space-6">
                <div className="flex justify-between text-body-sm font-medium text-muted-foreground">
                  <span>{overallHealth.completionPercentage}% Onboarding Completed</span>
                </div>
                <div className="w-full bg-muted/40 border border-border-subtle radius-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-500 ease-out radius-full" 
                    style={{ width: `${overallHealth.completionPercentage}%` }} 
                  />
                </div>
                <p className="text-caption text-muted-foreground">Calculated traceably from 9 setup tasks.</p>
              </div>
            </div>
          </div>

          {/* AI Coach Directive (5 columns) */}
          <div className="xl:col-span-5 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 radius-lg p-space-5 space-y-space-4 relative">
            <div className="flex items-center gap-space-2 text-primary font-semibold text-body-sm uppercase tracking-wide">
              <Sparkles className="h-4 w-4 shrink-0" />
              AI Coach Directive
            </div>
            
            <div className="space-y-space-1">
              <h3 className="text-body-md font-semibold text-foreground tracking-tight">
                {nextBestAction?.title || "Optimize Receptionist Setup"}
              </h3>
              <p className="text-body-sm text-muted-foreground leading-relaxed">
                {nextBestAction?.description || "Your AI assistant is configured and operational. Review the action list below to maximize conversion rate."}
              </p>
            </div>

            {nextBestAction?.href && (
              <Link href={nextBestAction.href === "/settings/booking/deposits" ? "/settings/booking" : nextBestAction.href} passHref>
                <Button className="w-full justify-between group mt-space-2 radius-full" variant="default">
                  <span>{nextBestAction.ctaText || "Configure System"}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-150 group-hover:translate-x-space-1" />
                </Button>
              </Link>
            )}
          </div>

        </div>
      </section>

      {/* ─── 2. TWO-COLUMN COMMAND CENTER LAYOUT ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-6 items-start">
        
        {/* LEFT COLUMN: CORE CAPABILITIES MATRIX (8 Columns) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-space-4">
          <div className="flex items-center justify-between px-space-1">
            <h2 className="text-title-lg font-bold text-foreground tracking-tight">Core AI Capabilities</h2>
            <span className="text-caption text-muted-foreground font-medium">Click a card to view formula & details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-4">
            {capabilities.map((cap) => {
              const Icon = cap.icon;
              const hasAlerts = cap.missingRequirements.length > 0;
              const isSelected = activeCapability === cap.id;

              return (
                <div 
                  key={cap.id} 
                  onClick={() => setActiveCapability(isSelected ? null : cap.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveCapability(isSelected ? null : cap.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "cursor-pointer border radius-lg p-space-5 bg-bg-layer-1 transition-all duration-200 relative overflow-hidden flex flex-col h-full",
                    cap.borderHover,
                    isSelected ? "border-primary shadow-sm bg-gradient-to-b from-bg-layer-1 to-primary/5" : "border-border-default"
                  )}
                >
                  <div className="flex items-start justify-between gap-space-3 mb-space-2.5">
                    <div className={cn("p-space-2.5 radius-lg bg-gradient-to-br border border-border-subtle shrink-0", cap.color)}>
                      <Icon className="h-5 w-5 text-foreground" />
                    </div>
                    
                    <div className="flex flex-col items-end shrink-0">
                      <span className={cn(
                        "text-body-md font-bold",
                        cap.score >= 80 ? "text-success-500" : cap.score >= 50 ? "text-warning-500" : "text-error-500"
                      )}>
                        {cap.score} / {cap.maxScore}
                      </span>
                      <span className="text-caption text-muted-foreground font-medium">SCORE</span>
                    </div>
                  </div>

                  <div className="space-y-space-1 flex-1">
                    <h3 className="text-body-sm font-bold text-foreground flex items-center gap-space-1.5">
                      {cap.title}
                      {hasAlerts && (
                        <span className="w-2 h-2 radius-full bg-warning-500 shrink-0" title="Missing Requirements" />
                      )}
                    </h3>
                    <p className="text-caption text-muted-foreground leading-snug line-clamp-2">
                      {cap.desc}
                    </p>
                  </div>

                  <div className="mt-space-4 pt-space-2.5 border-t border-border-subtle flex justify-between items-center text-caption font-medium">
                    <span className="text-muted-foreground truncate max-w-36 sm:max-w-none">{cap.metric}</span>
                    <span className="text-primary flex items-center gap-space-0.5 shrink-0">
                      Breakdown <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200", isSelected && "rotate-90")} />
                    </span>
                  </div>

                  {/* Expandable breakdown panel directly inside the card */}
                  {isSelected && (
                    <div 
                      className="mt-space-4 pt-space-4 border-t border-border-subtle space-y-space-4 animate-fade-in text-left cursor-default"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      tabIndex={-1}
                    >
                      <div className="flex items-center justify-between border-b border-border-subtle pb-space-2.5">
                        <span className={cn(
                          "text-caption px-space-2 py-space-0.5 radius-full font-semibold uppercase",
                          cap.score >= 80 ? "bg-success-500/10 text-success-500" : cap.score >= 50 ? "bg-warning-500/10 text-warning-500" : "bg-error-500/10 text-error-500"
                        )}>
                          {cap.score >= 80 ? "Optimized" : cap.score >= 50 ? "Needs Work" : "Critical"}
                        </span>
                        <Link href={cap.id === "booking" ? "/settings/booking" : cap.href} passHref onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="outline" className="gap-space-1 h-7 px-space-2.5 text-caption font-semibold">
                            Configure Settings <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>

                      {/* Formula display */}
                      <div className="p-space-3 bg-[hsl(var(--foreground)/0.03)] border border-border-subtle radius-lg space-y-space-1">
                        <div className="text-caption font-bold text-foreground flex items-center gap-space-1">
                          <Calculator className="h-3.5 w-3.5 text-primary" />
                          <span>Calculation Formula</span>
                        </div>
                        <code className="text-caption text-muted-foreground font-mono block leading-relaxed break-words">
                          {cap.formula}
                        </code>
                      </div>

                      {/* Low explanation */}
                      <div className="space-y-space-1">
                        <h4 className="text-caption font-bold text-muted-foreground uppercase tracking-wide">Status Diagnostic</h4>
                        <p className="text-caption text-foreground leading-relaxed">
                          {cap.whyLow}
                        </p>
                      </div>

                      <div className="space-y-space-3 pt-space-2 border-t border-border-subtle">
                        {/* Actions checklist */}
                        <div className="space-y-space-1.5">
                          <h4 className="text-caption font-bold text-muted-foreground uppercase tracking-wide">Actions to reach 100%</h4>
                          {cap.exactActions.length > 0 ? (
                            <ul className="space-y-space-2">
                              {cap.exactActions.map((act, i) => (
                                <li key={i} className="flex items-start gap-space-2 text-caption text-foreground font-medium">
                                  <div className="p-space-0.5 bg-warning-500/10 border border-warning-500/20 radius-md mt-space-0.5 shrink-0">
                                    <AlertTriangle className="h-3 w-3 text-warning-500" />
                                  </div>
                                  <span>{act}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="flex items-center gap-space-2 text-caption text-success-500 font-semibold">
                              <Check className="h-4 w-4" />
                              <span>Requirements fully complete!</span>
                            </div>
                          )}
                        </div>

                        {/* Configured Strengths */}
                        <div className="space-y-space-1.5">
                          <h4 className="text-caption font-bold text-muted-foreground uppercase tracking-wide">Configured Parameters</h4>
                          {cap.strongPoints && cap.strongPoints.length > 0 ? (
                            <ul className="space-y-space-1">
                              {cap.strongPoints.map((str, i) => (
                                <li key={i} className="flex items-start gap-space-2 text-caption text-muted-foreground">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-success-500 shrink-0 mt-space-0.5" />
                                  <span>{str}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-caption text-muted-foreground italic">No setup metrics active yet.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTION CENTER BLOCKERS & INSIGHTS (4 Columns) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-space-6">
          
          {/* DETERMINISTIC MISSING REQUIREMENTS QUEUE */}
          <div className="border border-border-default radius-lg bg-bg-layer-1 overflow-hidden">
            <div className="border-b border-border-subtle p-space-5 flex items-center justify-between">
              <h2 className="text-body-md font-bold text-foreground flex items-center gap-space-2">
                <AlertTriangle className="h-4 w-4 text-warning-500 shrink-0" />
                Missing Requirements
              </h2>
              {totalMissingRequirementsCount > 0 && (
                <span className="text-caption bg-warning-500/10 text-warning-500 px-space-2.5 py-space-0.5 radius-full font-bold">
                  {totalMissingRequirementsCount} Pending
                </span>
              )}
            </div>

            <div className="p-space-5 space-y-space-5">
              {totalMissingRequirementsCount > 0 ? (
                groupedMissing.map((group, idx) => (
                  <div key={idx} className="space-y-space-2.5">
                    <div className="flex justify-between items-center text-caption font-bold tracking-wider text-muted-foreground uppercase">
                      <span>{group.category}</span>
                      <Link href={group.href} passHref>
                        <span className="text-primary flex items-center gap-space-0.5 cursor-pointer hover:underline normal-case font-semibold">
                          Configure <ArrowUpRight className="h-3 w-3" />
                        </span>
                      </Link>
                    </div>

                    <div className="space-y-space-1.5 pl-space-1">
                      {group.items.map((item, i) => (
                        <div key={i} className="flex gap-space-2 items-center text-body-sm font-semibold text-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-warning-500 shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center p-space-6 text-center space-y-space-3">
                  <div className="p-space-3 bg-success-500/10 border border-success-500/20 radius-full">
                    <CheckCircle2 className="h-8 w-8 text-success-500" />
                  </div>
                  <div>
                    <h3 className="text-body-sm font-bold text-foreground">AI Fully Configured</h3>
                    <p className="text-caption text-muted-foreground max-w-48 mt-space-1 leading-snug">
                      Zero missing requirements found. Operator AI is operating at 100% capability.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* INSIGHTS & BENCHMARKS */}
          <div className="border border-border-default radius-lg bg-bg-layer-1 p-space-5 space-y-space-4">
            <h2 className="text-body-md font-bold text-foreground flex items-center gap-space-2 border-b border-border-subtle pb-space-3">
              <Activity className="h-4 w-4 text-primary shrink-0" />
              Industry Benchmarks
            </h2>

            <div className="space-y-space-4">
              <div className="space-y-space-1.5">
                <div className="flex justify-between text-body-sm font-medium text-muted-foreground">
                  <span>AI Competitiveness</span>
                  <span className="text-foreground font-semibold">{industryBenchmark.readinessScore}% vs 50% Industry Avg</span>
                </div>
                <div className="w-full bg-muted/40 border border-border-subtle radius-full h-2 overflow-hidden">
                  <div 
                    className="bg-success-500 h-full radius-full" 
                    style={{ width: `${industryBenchmark.readinessScore}%` }} 
                  />
                </div>
              </div>

              {/* Opportunities list */}
              <div className="space-y-space-3">
                <h4 className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">Suggested Enhancements</h4>
                
                <div className="space-y-space-2.5">
                  {industryBenchmark.missingGuidelines?.slice(0, 3).map((item: string, idx: number) => (
                    <div key={idx} className="flex gap-space-2.5 items-start text-body-sm">
                      <div className="p-space-1 bg-primary/10 border border-primary/20 radius-md mt-space-0.5 shrink-0">
                        <Sparkles className="h-3 w-3 text-primary" />
                      </div>
                      <div className="space-y-space-0.5">
                        <p className="font-semibold text-foreground leading-none">{item}</p>
                        <p className="text-caption text-muted-foreground leading-normal">
                          Adds context for the AI scheduler. (+10% score potential)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
