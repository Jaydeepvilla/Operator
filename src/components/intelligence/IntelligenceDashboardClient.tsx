"use client";;
import React, { useState } from "react";
import Link from "next/link";
import { 
  Activity, ArrowRight, ArrowUpRight, CheckCircle2, AlertTriangle, 
  DollarSign, Users, Sparkles, Clock, Calendar, MessageSquare, 
  BookOpen, Zap, CreditCard, Layers, X, Info, Flame
} from "lucide-react";
import { Card, CardContent } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { cn } from "@/components/shared/utils";
import { BIReport } from "@/lib/business-intelligence/types";
import { OverallHealthResult } from "@/lib/health-engine/overall";

import { getButtonClasses } from '@/design-system/button-tokens';

// Helper for status classes
function getScoreStatusColor(score: number) {
  if (score >= 90) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  if (score >= 70) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
  return "text-rose-500 bg-rose-500/10 border-rose-500/20";
}

interface IntelligenceDashboardClientProps {
  orgName: string;
  report: BIReport;
  overallHealth: OverallHealthResult;
  aiReadiness: { overallScore: number; status?: string };
  conversationsCount: number;
  leadsCount: number;
  criticalIssuesCount: number;
}

export function IntelligenceDashboardClient({
  orgName,
  report,
  overallHealth,
  aiReadiness,
  conversationsCount,
  leadsCount,
  criticalIssuesCount
}: IntelligenceDashboardClientProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // ─── 1. Build Executive Actions Checklist ───
  // We collect items from critical issues, audit findings, operations, customer experience, and revenue
  const allActions: Array<{
    id: string;
    title: string;
    description: string;
    impact: string;
    severity: string;
    estimatedTime: string;
    actionText: string;
    actionHref: string;
  }> = [];

  // Add Critical/Blocker findings first
  report.audit.findings.forEach(f => {
    allActions.push({
      id: f.id,
      title: f.title,
      description: f.description,
      impact: f.impact,
      severity: f.severity,
      estimatedTime: "5 min",
      actionText: f.actionText,
      actionHref: f.actionHref
    });
  });

  // Add revenue gaps
  report.revenue.opportunities.forEach(opp => {
    allActions.push({
      id: opp.id,
      title: opp.title,
      description: opp.description,
      impact: opp.businessImpact,
      severity: opp.severity,
      estimatedTime: opp.estimatedEffort === "quick" ? "5 min" : "15 min",
      actionText: opp.actionText,
      actionHref: opp.actionHref
    });
  });

  // Add operations advisor bottlenecks
  report.operations.bottlenecks.forEach(bot => {
    allActions.push({
      id: bot.id,
      title: `${bot.area}: Bottleneck Detected`,
      description: bot.description,
      impact: bot.suggestedFix,
      severity: bot.severity,
      estimatedTime: "10 min",
      actionText: "Fix Now",
      actionHref: bot.actionHref
    });
  });

  // Add CX friction points
  report.customerExperience.frictionPoints.forEach(fp => {
    allActions.push({
      id: fp.id,
      title: `CX Friction in ${fp.area}`,
      description: fp.description,
      impact: fp.suggestedFix,
      severity: fp.severity,
      estimatedTime: "8 min",
      actionText: fp.actionText,
      actionHref: fp.actionHref
    });
  });

  // Deduplicate actions by title/id
  const seenTitles = new Set<string>();
  const deduplicatedActions = allActions.filter(action => {
    if (seenTitles.has(action.title.toLowerCase())) return false;
    seenTitles.add(action.title.toLowerCase());
    return true;
  });

  // Sort by severity (critical/warning first)
  deduplicatedActions.sort((a, b) => {
    const sevMap: Record<string, number> = { critical: 0, warning: 1, opportunity: 2, info: 3 };
    return (sevMap[a.severity] ?? 3) - (sevMap[b.severity] ?? 3);
  });

  const priorityActions = deduplicatedActions.slice(0, 5);
  const remainingActionsCount = Math.max(0, deduplicatedActions.length - 5);

  // ─── 2. Build Business Modules status mapping ───
  // Booking, Communication, Knowledge Base, Automation, Billing, Integrations
  const bookingHealth = overallHealth.modules.booking?.score ?? 0;
  const communicationHealth = overallHealth.modules.channels?.score ?? 0;
  const kbHealth = overallHealth.modules.knowledge?.score ?? 0;
  const staffHealth = overallHealth.modules.staff?.score ?? 0;
  const billingHealth = overallHealth.modules.billing?.score ?? 0;

  // Derive Automation Health: penalize for workflow bottlenecks
  const automationHealth = Math.max(0, 100 - (report.operations.bottlenecks.length * 15));
  // Derive Integrations Health: check channels & connected calendars
  const integrationsHealth = Math.min(100, Math.max(40, staffHealth * 0.5 + communicationHealth * 0.5));

  const businessModules = [
    {
      name: "Booking",
      score: bookingHealth,
      status: bookingHealth >= 90 ? "Optimized" : bookingHealth >= 70 ? "Needs Review" : "Incomplete",
      quickFix: { text: "Manage Calendar", href: "/settings/booking" },
      icon: Calendar,
      color: "text-blue-500 bg-blue-500/10"
    },
    {
      name: "Communication",
      score: communicationHealth,
      status: communicationHealth >= 90 ? "Active" : communicationHealth >= 60 ? "Warning" : "Inactive",
      quickFix: { text: "Link Channels", href: "/channels" },
      icon: MessageSquare,
      color: "text-indigo-500 bg-indigo-500/10"
    },
    {
      name: "Knowledge Base",
      score: kbHealth,
      status: kbHealth >= 90 ? "Comprehensive" : kbHealth >= 70 ? "Good" : "Needs Content",
      quickFix: { text: "Add FAQs", href: "/faqs" },
      icon: BookOpen,
      color: "text-purple-500 bg-purple-500/10"
    },
    {
      name: "Automation",
      score: automationHealth,
      status: automationHealth >= 90 ? "Sleek" : automationHealth >= 75 ? "Active Gaps" : "Restricted",
      quickFix: { text: "View Workflows", href: "/flows" },
      icon: Zap,
      color: "text-amber-500 bg-amber-500/10"
    },
    {
      name: "Billing",
      score: billingHealth,
      status: billingHealth >= 90 ? "Verified" : "Payment Due",
      quickFix: { text: "Update Billing", href: "/billing" },
      icon: CreditCard,
      color: "text-rose-500 bg-rose-500/10"
    },
    {
      name: "Integrations",
      score: integrationsHealth,
      status: integrationsHealth >= 80 ? "Fully Integrated" : "Partial Link",
      quickFix: { text: "Connect Integrations", href: "/integrations" },
      icon: Layers,
      color: "text-emerald-500 bg-emerald-500/10"
    }
  ];

  // ─── 3. Build Growth Opportunities ───
  const growthIdeasMap = {
    revenue: report.growth.ideas.find(i => i.type === "new_service" || i.type === "membership") || {
      title: "Introduce Tiered Packages",
      businessImpact: "Increases CLV by 25%",
      actionText: "Build Packages",
      actionHref: "/services"
    },
    retention: report.growth.ideas.find(i => i.type === "retention") || {
      title: "Win-back Re-engagement Flow",
      businessImpact: "Recover 10-15% churned accounts",
      actionText: "Launch Flow",
      actionHref: "/flows"
    },
    automation: report.growth.ideas.find(i => i.type === "referral" || i.type === "upsell") || {
      title: "Refer-a-Friend Program",
      businessImpact: "Acquire customers at 0 acquisition cost",
      actionText: "Setup Referrals",
      actionHref: "/flows"
    },
    crossSell: report.growth.ideas.find(i => i.type === "upsell") || {
      title: "Post-booking Cross-sells",
      businessImpact: "+18% average appointment value",
      actionText: "Add Cross-Sells",
      actionHref: "/flows"
    }
  };

  // ─── 4. Dynamic AI Summary Construction ───
  const activeBlockersText = criticalIssuesCount > 0 
    ? `Your booking system is incomplete with ${criticalIssuesCount} critical blocker${criticalIssuesCount > 1 ? "s" : ""}.`
    : "Your booking system and live settings are fully configured.";
  
  const increasePercentage = report.revenue.opportunities.length > 0 
    ? Math.min(35, 12 + report.revenue.opportunities.length * 4) 
    : 15;

  const totalActionsTime = deduplicatedActions.length * 2;
  const setupTimeText = totalActionsTime <= 0 ? "2 minutes" : `${totalActionsTime} minutes`;

  return (
    <div className="space-y-space-6 w-full animate-page-enter pb-space-8 text-foreground">
      {/* ─── SCREEN 1: ABOVE THE FOLD KPI ROW ─── */}
      <section aria-label="Command Center Metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-4">
        
        {/* Business Health Score */}
        <Card className="relative overflow-hidden border border-border-default hover:border-primary/30 transition-all duration-200">
          <CardContent className="p-space-5 pt-space-5 space-y-space-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest">Health Score</span>
              <Activity className="h-4 w-4 text-emerald-500 shrink-0" />
            </div>
            <div className="flex items-center gap-space-2">
              <span className="text-title-lg font-bold tabular-nums leading-none">{overallHealth.overallScore}%</span>
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0", getScoreStatusColor(overallHealth.overallScore))}>
                {overallHealth.overallStatus}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* AI Readiness */}
        <Card className="relative overflow-hidden border border-border-default hover:border-primary/30 transition-all duration-200">
          <CardContent className="p-space-5 pt-space-5 space-y-space-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest">AI Readiness</span>
              <Sparkles className="h-4 w-4 text-violet-500 shrink-0" />
            </div>
            <div className="flex items-center gap-space-2">
              <span className="text-title-lg font-bold tabular-nums leading-none">{aiReadiness.overallScore}%</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400">
                Optimized
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Opportunity */}
        <Card className="relative overflow-hidden border border-border-default hover:border-primary/30 transition-all duration-200">
          <CardContent className="p-space-5 pt-space-5 space-y-space-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest">Revenue Gaps</span>
              <DollarSign className="h-4 w-4 text-amber-500 shrink-0" />
            </div>
            <div className="flex items-center gap-space-2">
              <span className="text-title-lg font-bold tabular-nums leading-none">{report.revenue.opportunities.length}</span>
              <span className="text-caption text-muted-foreground font-semibold">Levers Active</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Customers */}
        <Card className="relative overflow-hidden border border-border-default hover:border-primary/30 transition-all duration-200">
          <CardContent className="p-space-5 pt-space-5 space-y-space-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest">Active Customers</span>
              <Users className="h-4 w-4 text-indigo-500 shrink-0" />
            </div>
            <div className="flex items-center gap-space-2">
              <span className="text-title-lg font-bold tabular-nums leading-none">{leadsCount}</span>
              <span className="text-caption text-muted-foreground font-semibold">Profiles</span>
            </div>
          </CardContent>
        </Card>

        {/* Critical Issues */}
        <Card className="relative overflow-hidden border border-border-default hover:border-primary/30 transition-all duration-200">
          <CardContent className="p-space-5 pt-space-5 space-y-space-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest">Critical Issues</span>
              <AlertTriangle className={cn("h-4 w-4 shrink-0", criticalIssuesCount > 0 ? "text-rose-500" : "text-muted-foreground/40")} />
            </div>
            <div className="flex items-center gap-space-2">
              <span className={cn("text-title-lg font-bold tabular-nums leading-none", criticalIssuesCount > 0 ? "text-rose-500" : "text-foreground")}>
                {criticalIssuesCount}
              </span>
              <span className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
                criticalIssuesCount > 0 ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              )}>
                {criticalIssuesCount > 0 ? "Action Required" : "All Clear"}
              </span>
            </div>
          </CardContent>
        </Card>

      </section>
      {/* ─── CENTER: AI EXECUTIVE SUMMARY ─── */}
      <section aria-label="AI Executive Summary">
        <div className="relative overflow-hidden radius-lg border border-primary/20 bg-card p-space-6 shadow-[radial-gradient(ellipse_60%_50%_at_0%_0%,hsl(250_75%_60%/0.08),transparent)]">
          <div className="flex items-center gap-space-2 mb-space-3">
            <Sparkles className="h-4.5 w-4.5 text-primary" />
            <h2 className="text-body-sm font-bold uppercase tracking-wider text-primary">AI Executive Digest</h2>
          </div>
          <div className="space-y-space-4">
            <p className="text-body-md font-medium text-foreground/90 leading-relaxed max-w-none">
              "This week, Operator AI handled <span className="text-primary font-bold">{conversationsCount}</span> conversations.{" "}
              <span className="font-semibold text-foreground">{activeBlockersText}</span>{" "}
              Fixing outstanding booking and reminder configuration could increase appointments by up to{" "}
              <span className="text-emerald-500 font-bold">{increasePercentage}%</span>.{" "}
              Estimated setup time is <span className="font-bold text-foreground">{setupTimeText}</span>."
            </p>
          </div>
        </div>
      </section>
      {/* ─── NEXT: PRIORITY ACTIONS & BUSINESS MODULES (2 Columns) ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-space-6 items-start">
        
        {/* Left Column: Priority Actions (7 Columns) */}
        <div className="lg:col-span-7 space-y-space-4">
          <div className="flex items-center justify-between">
            <h3 className="text-body-md font-bold text-foreground flex items-center gap-space-2">
              <Zap className="h-4.5 w-4.5 text-amber-500" />
              Priority Action Items
            </h3>
            {remainingActionsCount > 0 && (
              <button 
                onClick={() => setIsDrawerOpen(true)} 
                className={getButtonClasses(
                  'primary',
                  'link',
                  'medium',
                  'text-primary text-[11px] hover:underline cursor-pointer transition-colors shrink-0'
                )}
              >
                View All ({deduplicatedActions.length})
              </button>
            )}
          </div>

          <div className="space-y-space-3">
            {priorityActions.length > 0 ? (
              priorityActions.map((action) => {
                const isCritical = action.severity === "critical";
                const isWarning = action.severity === "warning";

                return (
                  <Card key={action.id} className={cn(
                    "border transition-all duration-200",
                    isCritical ? "border-rose-500/20 hover:border-rose-500/40 bg-rose-500/[0.02]" :
                    isWarning ? "border-amber-500/20 hover:border-amber-500/40 bg-amber-500/[0.01]" :
                    "border-border-default hover:border-primary/20 bg-muted/[0.03]"
                  )}>
                    <CardContent className="p-space-4 pt-space-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-4">
                      <div className="space-y-space-1 min-w-0">
                        <div className="flex items-center gap-space-2 flex-wrap">
                          <span className={cn(
                            "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0",
                            isCritical ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
                            isWarning ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                            "bg-primary/10 border-primary/20 text-primary"
                          )}>
                            {action.severity}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60 flex items-center gap-space-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            {action.estimatedTime}
                          </span>
                        </div>
                        <h4 className="text-body-sm font-bold text-foreground">{action.title}</h4>
                        <p className="text-[11px] text-muted-foreground/85 leading-snug line-clamp-1">
                          Impact: <span className="font-semibold text-foreground/80">{action.impact}</span>
                        </p>
                      </div>

                      <Button asChild variant={isCritical ? "default" : "outline"} size="sm" className="shrink-0 font-bold self-end sm:self-center">
                        <Link href={action.actionHref}>
                          <span>{action.actionText}</span>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center p-space-8 text-center border border-border-default radius-lg bg-bg-layer-1">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-space-2.5" />
                <h4 className="text-body-sm font-bold text-foreground">All Core Tasks Completed</h4>
                <p className="text-caption text-muted-foreground mt-space-1">Your AI Command Center shows no pending priority actions.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Business Modules (5 Columns) */}
        <div className="lg:col-span-5 space-y-space-4">
          <h3 className="text-body-md font-bold text-foreground flex items-center gap-space-2">
            <Layers className="h-4.5 w-4.5 text-primary" />
            Business Modules Status
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-3">
            {businessModules.map((mod) => {
              const ModIcon = mod.icon;
              const scoreColor = mod.score >= 90 ? "text-emerald-500" : mod.score >= 70 ? "text-amber-500" : "text-rose-500";

              return (
                <Card key={mod.name} className="border border-border-default hover:border-primary/20 transition-all duration-200">
                  <CardContent className="p-space-4 pt-space-4 flex flex-col justify-between h-full space-y-space-4">
                    <div className="space-y-space-2">
                      <div className="flex justify-between items-center">
                        <div className={cn("p-2 radius-md shrink-0", mod.color)}>
                          <ModIcon className="h-4.5 w-4.5" />
                        </div>
                        <span className={cn("text-body-sm font-bold tabular-nums", scoreColor)}>
                          {mod.score}%
                        </span>
                      </div>
                      <div>
                        <h4 className="text-caption font-bold text-foreground leading-none">{mod.name}</h4>
                        <span className="text-[10px] text-muted-foreground/60 font-semibold block mt-space-1">
                          {mod.status}
                        </span>
                      </div>
                    </div>

                    <Link href={mod.quickFix.href} className="text-[11px] font-semibold text-primary hover:text-primary-light transition-colors flex items-center gap-space-1 pt-space-2 border-t border-border-subtle shrink-0">
                      <span>{mod.quickFix.text}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

      </section>
      {/* ─── NEXT: GROWTH OPPORTUNITIES ─── */}
      <section aria-label="Growth Opportunities" className="space-y-space-4">
        <h3 className="text-body-md font-bold text-foreground flex items-center gap-space-2">
          <Flame className="h-4.5 w-4.5 text-rose-500" />
          Growth Opportunities
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-4">
          
          {/* Revenue Ideas */}
          <Card className="border border-border-default hover:border-primary/30 transition-all duration-200">
            <CardContent className="p-space-5 pt-space-5 flex flex-col justify-between h-full space-y-space-4">
              <div className="space-y-space-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 block">Revenue Idea</span>
                <h4 className="text-body-sm font-bold text-foreground leading-snug">{growthIdeasMap.revenue.title}</h4>
                <p className="text-caption text-emerald-500 font-medium flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5 shrink-0" />
                  {growthIdeasMap.revenue.businessImpact}
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full font-bold">
                <Link href={growthIdeasMap.revenue.actionHref}>
                  <span>{growthIdeasMap.revenue.actionText}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Retention Ideas */}
          <Card className="border border-border-default hover:border-primary/30 transition-all duration-200">
            <CardContent className="p-space-5 pt-space-5 flex flex-col justify-between h-full space-y-space-4">
              <div className="space-y-space-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 block">Retention Idea</span>
                <h4 className="text-body-sm font-bold text-foreground leading-snug">{growthIdeasMap.retention.title}</h4>
                <p className="text-caption text-emerald-500 font-medium flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5 shrink-0" />
                  {growthIdeasMap.retention.businessImpact}
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full font-bold">
                <Link href={growthIdeasMap.retention.actionHref}>
                  <span>{growthIdeasMap.retention.actionText}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Automation Ideas */}
          <Card className="border border-border-default hover:border-primary/30 transition-all duration-200">
            <CardContent className="p-space-5 pt-space-5 flex flex-col justify-between h-full space-y-space-4">
              <div className="space-y-space-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 block">Automation Idea</span>
                <h4 className="text-body-sm font-bold text-foreground leading-snug">{growthIdeasMap.automation.title}</h4>
                <p className="text-caption text-emerald-500 font-medium flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5 shrink-0" />
                  {growthIdeasMap.automation.businessImpact}
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full font-bold">
                <Link href={growthIdeasMap.automation.actionHref}>
                  <span>{growthIdeasMap.automation.actionText}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Cross Sell Ideas */}
          <Card className="border border-border-default hover:border-primary/30 transition-all duration-200">
            <CardContent className="p-space-5 pt-space-5 flex flex-col justify-between h-full space-y-space-4">
              <div className="space-y-space-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 block">Cross-Sell Idea</span>
                <h4 className="text-body-sm font-bold text-foreground leading-snug">{growthIdeasMap.crossSell.title}</h4>
                <p className="text-caption text-emerald-500 font-medium flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5 shrink-0" />
                  {growthIdeasMap.crossSell.businessImpact}
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full font-bold">
                <Link href={growthIdeasMap.crossSell.actionHref}>
                  <span>{growthIdeasMap.crossSell.actionText}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                </Link>
              </Button>
            </CardContent>
          </Card>

        </div>
      </section>
      {/* ─── PROGRESSIVE DISCLOSURE MODAL (Centered overlay) ─── */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-space-4 animate-fade-in"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div 
            className="w-full max-w-2xl max-h-[80vh] bg-card border border-border-default p-space-6 rounded-xl flex flex-col space-y-space-5 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-space-4 border-b border-border-default shrink-0">
              <div>
                <h3 className="text-body-md font-bold text-foreground">AI Intelligence Findings</h3>
                <p className="text-caption text-muted-foreground">Comprehensive optimization guidelines for your setup</p>
              </div>
              <Button 
                onClick={() => setIsDrawerOpen(false)}
                variant="ghost" 
                size="icon-sm" 
                className="radius-full h-8 w-8 hover:bg-muted/80 shrink-0"
                aria-label="Close modal"
              >
                <X className="h-4.5 w-4.5 text-foreground" />
              </Button>
            </div>

            {/* Findings List */}
            <div className="flex-1 overflow-y-auto space-y-space-4 pr-space-1">
              {deduplicatedActions.map((action) => {
                const isCritical = action.severity === "critical";
                const isWarning = action.severity === "warning";

                return (
                  <div 
                    key={action.id} 
                    className={cn(
                      "p-space-4 radius-lg border flex flex-col space-y-space-2.5",
                      isCritical ? "border-rose-500/25 bg-rose-500/[0.02]" :
                      isWarning ? "border-amber-500/25 bg-amber-500/[0.02]" :
                      "border-border-default bg-muted/[0.04]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-space-3">
                      <div className="space-y-space-0.5">
                        <div className="flex items-center gap-space-2">
                          <span className={cn(
                            "text-[8px] font-bold uppercase px-2 py-0.5 rounded-full border",
                            isCritical ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
                            isWarning ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                            "bg-primary/10 border-primary/20 text-primary"
                          )}>
                            {action.severity}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60 flex items-center gap-space-0.5">
                            <Clock className="h-3.5 w-3.5" />
                            {action.estimatedTime}
                          </span>
                        </div>
                        <h4 className="text-body-sm font-bold text-foreground mt-space-1">{action.title}</h4>
                      </div>
                      
                      <Button asChild size="xs" variant={isCritical ? "default" : "outline"} className="shrink-0 font-bold">
                        <Link href={action.actionHref}>
                          <span>{action.actionText}</span>
                          <ArrowRight className="h-3 w-3 shrink-0" />
                        </Link>
                      </Button>
                    </div>

                    <p className="text-caption text-muted-foreground/80 leading-relaxed">{action.description}</p>
                    <div className="text-[11px] text-muted-foreground/60 pt-space-2 border-t border-border-subtle/50 flex items-center gap-space-1 italic">
                      <Info className="h-3 w-3 text-primary shrink-0" />
                      <span>Impact: {action.impact}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="pt-space-4 border-t border-border-default shrink-0 flex justify-end">
              <Button onClick={() => setIsDrawerOpen(false)} variant="secondary" size="sm" className="font-bold">
                Close
              </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
