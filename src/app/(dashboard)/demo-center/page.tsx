"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/shared/button";
import { Badge } from "@/components/shared/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/shared/card";
import {
  PlayCircle,
  RotateCcw,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Building,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import {
  getDemoStatusAction,
  switchDemoIndustryAction,
  resetDemoDataAction,
} from "@/server/actions/demo";
import { DEMO_SCRIPTS, type DemoIndustryScript } from "@/lib/constants/demo-scripts";
import { cn } from "@/components/shared/utils";
import { useConfirm } from "@/components/shared/confirm-dialog";

function parseMetric(val: string | number) {
  if (typeof val === "number") {
    return { main: `${val} hrs`, sub: "manual labor saved/mo" };
  }
  const str = String(val).trim();
  // Match "From 16% down to 2%"
  const fromMatch = str.match(/^From\s+([0-9.]+%?)\s+down to\s+([0-9.]+%?)$/i);
  if (fromMatch) {
    return { main: `${fromMatch[1]} → ${fromMatch[2]}`, sub: "reduction in no-shows" };
  }
  // Match "Zero no-shows on paid consultations"
  if (/^zero/i.test(str)) {
    return { main: "0 No-Shows", sub: "on paid consultations" };
  }
  // Match number/percentage at start e.g. "24 appointments/month", "42% of all new bookings"
  const match = str.match(/^([0-9]+%?|[0-9]+\.[0-9]+%?)\s+(.*)$/);
  if (match) {
    return { main: match[1], sub: match[2] };
  }
  return { main: str, sub: "" };
}

export default function DemoCenterPage() {
  const confirm = useConfirm();
  const [selectedScriptId, setSelectedScriptId] = useState<string>("salon-spa");
  const [demoStatus, setDemoStatus] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setLoading(true);
    try {
      const res = await getDemoStatusAction();
      if (res.success && res.data) {
        setDemoStatus(res.data);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSwitchIndustry(industryId: string) {
    setActionLoading(true);
    setFeedbackMessage(null);
    try {
      const res = await switchDemoIndustryAction(industryId);
      if (res.success) {
        setFeedbackMessage(res.message || "Demo business configured successfully.");
        setSelectedScriptId(industryId);
        await loadStatus();
      } else {
        alert(res.error || "Failed to switch industry template.");
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResetData() {
    const ok = await confirm({
      title: "Reset Demo Environment?",
      description: "This will clear all test appointments, reset schedule exceptions, and restore clean sample data for your next customer demonstration.",
      confirmText: "Reset Environment",
      cancelText: "Cancel",
      variant: "danger",
      isDestructive: true,
    });
    if (!ok) return;

    setActionLoading(true);
    setFeedbackMessage(null);
    try {
      const res = await resetDemoDataAction();
      if (res.success) {
        setFeedbackMessage(res.message || "Environment reset successfully.");
        await loadStatus();
      }
    } finally {
      setActionLoading(false);
    }
  }

  const currentScript = DEMO_SCRIPTS.find((s) => s.id === selectedScriptId) || DEMO_SCRIPTS[0];
  const recovered = parseMetric(currentScript.businessOutcome.recoveredAppointments);
  const afterHours = parseMetric(currentScript.businessOutcome.afterHoursCapture);
  const laborSaved = parseMetric(currentScript.businessOutcome.manualWorkSavedHours);
  const noShow = parseMetric(currentScript.businessOutcome.noShowReduction);

  return (
    <div className="space-y-space-6 w-full pb-space-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-4">
        <PageTitle
          title="Founder Demo Control Center"
          description="Prepare, rehearse, and present live customer demonstrations across 4 industry verticals. Seamlessly switch templates, launch public booking pages, and reset demo data."
        />
        <div className="flex flex-wrap items-center gap-space-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetData}
            disabled={actionLoading}
            className="text-body-sm shadow-xs"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset Demo Data
          </Button>
          <Link href="/academy">
            <Button size="sm" variant="outline" className="text-body-sm shadow-xs">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Founder Academy
            </Button>
          </Link>
          {demoStatus?.bookingUrl && (
            <Link href={demoStatus.bookingUrl} target="_blank">
              <Button size="sm" className="text-body-sm bg-primary text-primary-foreground shadow-sm shadow-primary/20">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Launch Live Booking Page
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Feedback banner */}
      {feedbackMessage && (
        <div className="p-space-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-body-sm text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-[12px] underline hover:opacity-80 cursor-pointer font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Demo Status Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
            <Building className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-body-md font-bold text-foreground">
                {demoStatus?.name || "Active Demo Organization"}
              </h3>
              <Badge variant="outline" className="text-caption font-mono border-primary/30 text-primary">
                {demoStatus?.industry || "Salon & Spa"}
              </Badge>
              <Badge variant="secondary" className="text-caption bg-muted/60">
                SANDBOX / DEMO MODE
              </Badge>
            </div>
            <p className="text-body-sm text-muted-foreground mt-0.5">
              Public Booking URL:{" "}
              <code className="text-primary font-mono text-[12px] bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">
                {demoStatus?.bookingUrl || "/book/demo"}
              </code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-space-4 text-body-sm text-muted-foreground shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-border/60">
          <div>
            <span className="font-bold text-foreground">{demoStatus?.servicesCount ?? 3}</span> Services
          </div>
          <div className="h-4 w-px bg-border" />
          <div>
            <span className="font-bold text-foreground">{demoStatus?.staffCount ?? 2}</span> Staff
          </div>
          <div className="h-4 w-px bg-border" />
          <div>
            <span className="font-bold text-foreground">{demoStatus?.appointmentsCount ?? 0}</span> Bookings
          </div>
        </div>
      </div>

      {/* 4 Industry Selectors */}
      <div>
        <div className="text-caption font-semibold text-muted-foreground uppercase tracking-wider mb-space-3">
          Select Customer Demonstration Industry
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {DEMO_SCRIPTS.map((script) => {
            const isSelected = selectedScriptId === script.id;

            return (
              <button
                key={script.id}
                type="button"
                onClick={() => handleSwitchIndustry(script.id)}
                disabled={actionLoading}
                className={cn(
                  "w-full p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[114px] group relative overflow-hidden",
                  isSelected
                    ? "bg-primary/10 border-primary shadow-sm shadow-primary/15 ring-1 ring-primary/40"
                    : "bg-card hover:bg-muted/40 border-border/80 hover:border-primary/40"
                )}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <Badge
                    variant={isSelected ? "default" : "outline"}
                    className={cn(
                      "text-caption font-semibold",
                      isSelected ? "bg-primary text-primary-foreground shadow-xs" : "border-border text-foreground/80"
                    )}
                  >
                    {script.industry}
                  </Badge>
                  {isSelected && (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
                <div className="w-full">
                  <h4 className="text-body-md font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                    {script.businessName}
                  </h4>
                  <p className="text-caption text-muted-foreground line-clamp-2 mt-1 leading-normal">
                    {script.tagline}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Script & Presentation Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-6">
        {/* Left Column: Script Narrative & Value Breakdown */}
        <div className="lg:col-span-8 space-y-space-5">
          <Card className="rounded-2xl border-border shadow-xs">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-caption font-semibold border-primary/30 text-primary">
                  Guided Customer Demo Script
                </Badge>
                <span className="text-[12px] text-muted-foreground font-medium">
                  Estimated Demo Time: 5 Minutes
                </span>
              </div>
              <CardTitle className="text-heading-md mt-1 font-bold">{currentScript.businessName}</CardTitle>
              <CardDescription className="text-body-sm">
                {currentScript.tagline}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-space-5">
              {/* Problem Statement */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25">
                <div className="text-caption font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-1 tracking-wide">
                  <AlertTriangle className="h-4 w-4" />
                  Customer Problem Being Solved
                </div>
                <p className="text-body-sm text-foreground/90 leading-relaxed">
                  {currentScript.customerProblem}
                </p>
              </div>

              {/* Step-by-Step Demo Journey */}
              <div>
                <h4 className="text-body-md font-bold text-foreground mb-3 flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-primary" />
                  Live Walkthrough Sequence
                </h4>
                <div className="space-y-space-3">
                  {currentScript.demoJourney.map((step) => (
                    <div
                      key={step.step}
                      className="p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-2 hover:border-primary/20 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-caption font-bold text-primary">
                          Step {step.step}: {step.title}
                        </span>
                        <Badge variant="outline" className="text-caption bg-primary/5 border-primary/20 text-primary">
                          Automated Action
                        </Badge>
                      </div>

                      <div className="text-body-sm text-foreground/90">
                        <span className="font-semibold text-muted-foreground">Trigger: </span>
                        {step.action}
                      </div>

                      <div className="text-body-sm text-foreground/90 bg-muted/40 p-3 rounded-lg border border-border/60">
                        <span className="font-semibold text-primary">Operator Action: </span>
                        {step.operatorResponse}
                      </div>

                      <div className="text-[12px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <span>✨ Pitch To Client:</span>
                        <span>{step.businessValue}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Business ROI Proof (Responsive & Accessible) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-body-md font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Measurable Business Value / ROI
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
                  {/* Card 1: Recovered Bookings */}
                  <div className="p-4 rounded-xl bg-card border border-border/80 hover:border-violet-500/30 transition-all flex flex-col justify-between min-h-[105px] text-center sm:text-left shadow-xs">
                    <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
                      Recovered Bookings
                    </p>
                    <div className="my-1.5">
                      <span className="text-2xl sm:text-3xl font-extrabold text-violet-400 dark:text-violet-300 tracking-tight">
                        {recovered.main}
                      </span>
                    </div>
                    <p className="text-caption text-muted-foreground truncate font-medium">
                      {recovered.sub || "appointments / month"}
                    </p>
                  </div>

                  {/* Card 2: After-Hours Capture */}
                  <div className="p-4 rounded-xl bg-card border border-border/80 hover:border-indigo-500/30 transition-all flex flex-col justify-between min-h-[105px] text-center sm:text-left shadow-xs">
                    <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
                      After-Hours Capture
                    </p>
                    <div className="my-1.5">
                      <span className="text-2xl sm:text-3xl font-extrabold text-indigo-400 dark:text-indigo-300 tracking-tight">
                        {afterHours.main}
                      </span>
                    </div>
                    <p className="text-caption text-muted-foreground truncate font-medium">
                      {afterHours.sub || "of all new bookings"}
                    </p>
                  </div>

                  {/* Card 3: Labor Saved */}
                  <div className="p-4 rounded-xl bg-card border border-border/80 hover:border-sky-500/30 transition-all flex flex-col justify-between min-h-[105px] text-center sm:text-left shadow-xs">
                    <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
                      Labor Saved
                    </p>
                    <div className="my-1.5">
                      <span className="text-2xl sm:text-3xl font-extrabold text-sky-400 dark:text-sky-300 tracking-tight">
                        {laborSaved.main}
                      </span>
                    </div>
                    <p className="text-caption text-muted-foreground truncate font-medium">
                      {laborSaved.sub || "manual labor saved / mo"}
                    </p>
                  </div>

                  {/* Card 4: No-Show Reduction */}
                  <div className="p-4 rounded-xl bg-card border border-border/80 hover:border-emerald-500/30 transition-all flex flex-col justify-between min-h-[105px] text-center sm:text-left shadow-xs">
                    <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
                      No-Show Reduction
                    </p>
                    <div className="my-1.5">
                      <span className="text-2xl sm:text-3xl font-extrabold text-emerald-500 dark:text-emerald-400 tracking-tight">
                        {noShow.main}
                      </span>
                    </div>
                    <p className="text-caption text-muted-foreground truncate font-medium">
                      {noShow.sub || "automated reminder rate"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-4">
              <span className="text-[12px] text-muted-foreground text-center sm:text-left">
                All numbers derive from modeled industry benchmark data.
              </span>
              {demoStatus?.bookingUrl && (
                <Link href={demoStatus.bookingUrl} target="_blank">
                  <Button size="sm" className="text-body-sm shadow-xs">
                    Open Public Booking Link
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </Link>
              )}
            </CardFooter>
          </Card>
        </div>

        {/* Right Column: Demo Checklist & Quick Actions */}
        <div className="lg:col-span-4 space-y-space-5">
          {/* Demo Readiness Checklist */}
          <Card className="rounded-2xl border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-body-md font-bold">Demo Presentation Checklist</CardTitle>
              <CardDescription className="text-[12px]">
                Verify these 5 steps before starting your prospect call.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-space-3 text-body-sm">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>Selected prospect's vertical ({currentScript.industry}).</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>Verified working staff hours and pricing schedule.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>Opened public booking URL on mobile or separate browser tab.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>Tested appointment reservation and deposit flow.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>Ready to reset data afterwards for the next client call.</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetData}
                disabled={actionLoading}
                className="w-full text-body-sm shadow-xs"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Clean Slate: Reset For Next Demo
              </Button>
            </CardFooter>
          </Card>

          {/* Quick Deep Links */}
          <Card className="rounded-2xl border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-body-md font-bold">Operator Live Workspaces</CardTitle>
              <CardDescription className="text-[12px]">
                Jump straight to live features during your pitch.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/appointments" className="block">
                <Button variant="ghost" size="sm" className="w-full justify-between text-body-sm hover:text-primary">
                  <span>📅 Calendar & Appointments</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/inbox" className="block">
                <Button variant="ghost" size="sm" className="w-full justify-between text-body-sm hover:text-primary">
                  <span>💬 Omnichannel Inbox</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/escalations" className="block">
                <Button variant="ghost" size="sm" className="w-full justify-between text-body-sm hover:text-primary">
                  <span>⚠️ Tasks & Exceptions Center</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/kb" className="block">
                <Button variant="ghost" size="sm" className="w-full justify-between text-body-sm hover:text-primary">
                  <span>📚 Business Knowledge Base</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
