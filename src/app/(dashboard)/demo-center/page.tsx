"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { PageTitle } from "@/components/shared/page-title";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/shared/button";
import { Badge } from "@/components/shared/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/shared/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/shared/tabs";
import {
  PlayCircle,
  RotateCcw,
  ExternalLink,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Users,
  ShieldCheck,
  Building,
  ArrowRight,
  Stethoscope,
  Scissors,
  Scale,
  HeartPulse,
  Briefcase,
  AlertTriangle,
  Loader2,
  Check,
} from "lucide-react";
import Link from "next/link";
import {
  getDemoStatusAction,
  switchDemoIndustryAction,
  resetDemoDataAction,
} from "@/server/actions/demo";
import { DEMO_SCRIPTS, type DemoIndustryScript } from "@/lib/constants/demo-scripts";

export default function DemoCenterPage() {
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
    if (!await confirm("Reset demo environment? This clears demo appointments and exceptions for a clean demonstration.")) {
      return;
    }
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

  return (
    <div className="space-y-space-6 max-w-7xl mx-auto pb-space-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-4">
        <PageTitle
          title="Founder Demo Control Center"
          description="Prepare, rehearse, and present live customer demonstrations across 4 industry verticals. Seamlessly switch templates, launch public booking pages, and reset demo data."
        />
        <div className="flex items-center gap-space-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetData}
            disabled={actionLoading}
            className="text-body-sm"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset Demo Data
          </Button>
          <Link href="/academy">
            <Button size="sm" variant="outline" className="text-body-sm">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Founder Academy
            </Button>
          </Link>
          {demoStatus?.bookingUrl && (
            <Link href={demoStatus.bookingUrl} target="_blank">
              <Button size="sm" className="text-body-sm bg-primary text-primary-foreground">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Launch Live Booking Page
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Feedback banner */}
      {feedbackMessage && (
        <div className="p-space-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-body-sm text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <Button
            onClick={() => setFeedbackMessage(null)}
            className="text-[12px] underline hover:opacity-80"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Demo Status Banner */}
      <div className="p-space-4 rounded-lg bg-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
            <Building className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-body-md font-semibold text-foreground">
                {demoStatus?.name || "Active Demo Organization"}
              </h3>
              <Badge variant="outline" className="text-caption font-mono">
                {demoStatus?.industry || "Salon & Spa"}
              </Badge>
              <Badge variant="secondary" className="text-caption">
                SANDBOX / DEMO MODE
              </Badge>
            </div>
            <p className="text-body-sm text-muted-foreground mt-0.5">
              Public Booking URL:{" "}
              <code className="text-primary font-mono text-[12px]">
                {demoStatus?.bookingUrl || "/book/demo"}
              </code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-space-4 text-body-sm text-muted-foreground">
          <div>
            <span className="font-semibold text-foreground">{demoStatus?.servicesCount ?? 3}</span> Services
          </div>
          <div className="h-4 w-px bg-border" />
          <div>
            <span className="font-semibold text-foreground">{demoStatus?.staffCount ?? 2}</span> Staff
          </div>
          <div className="h-4 w-px bg-border" />
          <div>
            <span className="font-semibold text-foreground">{demoStatus?.appointmentsCount ?? 0}</span> Bookings
          </div>
        </div>
      </div>

      {/* 4 Industry Selectors */}
      <div>
        <div className="text-caption font-semibold text-muted-foreground uppercase tracking-wider mb-space-3">
          Select Customer Demonstration Industry
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-3">
          {DEMO_SCRIPTS.map((script) => {
            const isSelected = selectedScriptId === script.id;

            return (
              <Button
                key={script.id}
                onClick={() => handleSwitchIndustry(script.id)}
                disabled={actionLoading}
                className={`p-space-4 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? "bg-accent border-primary shadow-sm"
                    : "bg-card hover:bg-muted/40 border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={isSelected ? "default" : "outline"} className="text-caption">
                    {script.industry}
                  </Badge>
                  {isSelected && (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                </div>
                <h4 className="text-body-md font-semibold text-foreground truncate">
                  {script.businessName}
                </h4>
                <p className="text-[12px] text-muted-foreground line-clamp-2 mt-1">
                  {script.tagline}
                </p>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Current Script & Presentation Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-6">
        {/* Left Column: Script Narrative & Value Breakdown */}
        <div className="lg:col-span-8 space-y-space-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-caption">
                  Guided Customer Demo Script
                </Badge>
                <span className="text-[12px] text-muted-foreground">
                  Estimated Demo Time: 5 Minutes
                </span>
              </div>
              <CardTitle className="text-heading-md mt-1">{currentScript.businessName}</CardTitle>
              <CardDescription className="text-body-sm">
                {currentScript.tagline}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-space-5">
              {/* Problem Statement */}
              <div className="p-space-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="text-caption font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  Customer Problem Being Solved
                </div>
                <p className="text-body-sm text-foreground/90 leading-relaxed">
                  {currentScript.customerProblem}
                </p>
              </div>

              {/* Step-by-Step Demo Journey */}
              <div>
                <h4 className="text-body-md font-semibold text-foreground mb-3 flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-primary" />
                  Live Walkthrough Sequence
                </h4>
                <div className="space-y-space-3">
                  {currentScript.demoJourney.map((step) => (
                    <div
                      key={step.step}
                      className="p-space-3.5 rounded-lg bg-card border border-border shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-caption font-semibold text-primary">
                          Step {step.step}: {step.title}
                        </span>
                        <Badge variant="outline" className="text-caption">
                          Automated Action
                        </Badge>
                      </div>

                      <div className="text-body-sm text-foreground/90">
                        <span className="font-semibold text-muted-foreground">Trigger: </span>
                        {step.action}
                      </div>

                      <div className="text-body-sm text-foreground/90 bg-muted/30 p-2.5 rounded border border-border">
                        <span className="font-semibold text-primary">Operator Action: </span>
                        {step.operatorResponse}
                      </div>

                      <div className="text-[12px] text-emerald-700 dark:text-emerald-400 font-medium">
                        ✨ Pitch To Client: {step.businessValue}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Business ROI Proof */}
              <div>
                <h4 className="text-body-md font-semibold text-foreground mb-3">
                  Measurable Business Value / ROI
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-3">
                  <div className="p-space-3 rounded-lg bg-muted/40 border border-border text-center">
                    <p className="text-caption text-muted-foreground uppercase font-semibold">
                      Recovered Bookings
                    </p>
                    <p className="text-title-md font-bold text-primary mt-1">
                      {currentScript.businessOutcome.recoveredAppointments}
                    </p>
                  </div>
                  <div className="p-space-3 rounded-lg bg-muted/40 border border-border text-center">
                    <p className="text-caption text-muted-foreground uppercase font-semibold">
                      After-Hours Capture
                    </p>
                    <p className="text-title-md font-bold text-primary mt-1">
                      {currentScript.businessOutcome.afterHoursCapture}
                    </p>
                  </div>
                  <div className="p-space-3 rounded-lg bg-muted/40 border border-border text-center">
                    <p className="text-caption text-muted-foreground uppercase font-semibold">
                      Labor Saved
                    </p>
                    <p className="text-title-md font-bold text-primary mt-1">
                      {currentScript.businessOutcome.manualWorkSavedHours} hrs/mo
                    </p>
                  </div>
                  <div className="p-space-3 rounded-lg bg-muted/40 border border-border text-center">
                    <p className="text-caption text-muted-foreground uppercase font-semibold">
                      No-Show Reduction
                    </p>
                    <p className="text-title-md font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      {currentScript.businessOutcome.noShowReduction}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex items-center justify-between border-t border-border pt-space-3">
              <span className="text-[12px] text-muted-foreground">
                All numbers derive from modeled industry benchmark data.
              </span>
              {demoStatus?.bookingUrl && (
                <Link href={demoStatus.bookingUrl} target="_blank">
                  <Button size="sm" className="text-body-sm">
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
          <Card>
            <CardHeader>
              <CardTitle className="text-body-md">Demo Presentation Checklist</CardTitle>
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
                className="w-full text-body-sm"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Clean Slate: Reset For Next Demo
              </Button>
            </CardFooter>
          </Card>

          {/* Quick Deep Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-body-md">Operator Live Workspaces</CardTitle>
              <CardDescription className="text-[12px]">
                Jump straight to live features during your pitch.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/appointments" className="block">
                <Button variant="ghost" size="sm" className="w-full justify-between text-body-sm">
                  <span>📅 Calendar & Appointments</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/inbox" className="block">
                <Button variant="ghost" size="sm" className="w-full justify-between text-body-sm">
                  <span>💬 Omnichannel Inbox</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/escalations" className="block">
                <Button variant="ghost" size="sm" className="w-full justify-between text-body-sm">
                  <span>⚠️ Tasks & Exceptions Center</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/kb" className="block">
                <Button variant="ghost" size="sm" className="w-full justify-between text-body-sm">
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
