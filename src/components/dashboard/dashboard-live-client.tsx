"use client";

import * as React from "react";
import { OutcomeDashboardSnapshot } from "@/lib/dashboard-engine";
import { TimeRange } from "@/lib/dashboard-engine/daily-brief";
import { ScrollReveal } from "@/components/motion";
import { DashboardVerificationBar } from "@/components/confidence-bridge/dashboard-verification-bar";
import { VerificationStatus } from "@/server/services/verification/types";
import { HomeStatusHero } from "./v2/HomeStatusHero";
import { NextStepCard, NextStepItem } from "./v2/NextStepCard";
import { SetupChecklistCard, ChecklistStep } from "./v2/SetupChecklistCard";
import { OutcomeNumbersGrid } from "./v2/OutcomeNumbersGrid";
import { NeedsAttentionList, AttentionItem } from "./v2/NeedsAttentionList";
import { TryItYourselfCard } from "./v2/TryItYourselfCard";

interface DashboardLiveClientProps {
  initialSnapshot: OutcomeDashboardSnapshot;
  businessName: string;
  verificationStatus: VerificationStatus;
  orgId: string;
  planId?: string;
  initialPaused?: boolean;
  voiceMinutesLimit?: number;
  voiceMinutesUsed?: number;
}

export function DashboardLiveClient({
  initialSnapshot,
  businessName,
  verificationStatus,
  orgId,
  planId = "starter",
  initialPaused = false,
  voiceMinutesLimit = 0,
  voiceMinutesUsed = 0,
}: DashboardLiveClientProps) {
  const [snapshot, setSnapshot] = React.useState<OutcomeDashboardSnapshot>(initialSnapshot);
  const [range, setRange] = React.useState<TimeRange>("today");
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState<Date>(new Date());
  const [relativeTime, setRelativeTime] = React.useState("Just now");
  const [isPaused, setIsPaused] = React.useState(initialPaused);

  // Determine if phone plan is enabled
  const normalizedPlan = (planId || "starter").toLowerCase();
  const hasPhonePlan =
    normalizedPlan.includes("pro") ||
    normalizedPlan.includes("biz") ||
    normalizedPlan.includes("business") ||
    normalizedPlan.includes("trial");

  // Fetch updated metrics
  const fetchMetrics = React.useCallback(
    async (selectedRange: TimeRange = range, showSpinner = false) => {
      if (showSpinner) setIsRefreshing(true);
      try {
        const res = await fetch(`/api/dashboard/metrics?range=${selectedRange}`);
        if (res.ok) {
          const data = await res.json();
          if (data.snapshot) {
            setSnapshot(data.snapshot);
            setLastUpdated(new Date());
            setRelativeTime("Just now");
          }
        }
      } catch (err) {
        console.warn("[DashboardLive] Failed to fetch metrics:", err);
      } finally {
        if (showSpinner) setIsRefreshing(false);
      }
    },
    [range]
  );

  const handleRangeChange = (newRange: TimeRange) => {
    setRange(newRange);
    fetchMetrics(newRange, true);
  };

  const handleManualRefresh = () => {
    fetchMetrics(range, true);
  };

  // Background polling every 15s
  React.useEffect(() => {
    const interval = setInterval(() => {
      fetchMetrics(range, false);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchMetrics, range]);

  // Relative time updater
  React.useEffect(() => {
    const timeInterval = setInterval(() => {
      const diffSec = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      if (diffSec < 5) setRelativeTime("Just now");
      else if (diffSec < 60) setRelativeTime(`${diffSec}s ago`);
      else setRelativeTime(`${Math.floor(diffSec / 60)}m ago`);
    }, 5000);
    return () => clearInterval(timeInterval);
  }, [lastUpdated]);

  // ─── 5-Step Unified Checklist (Step 3.3) ──────────────────────────────────
  const setupItems = snapshot.setupProgress?.items || [];
  const hasServices = setupItems.some((i) => i.id === "services" && i.completed);
  const hasHours = setupItems.some((i) => i.id === "hours" && i.completed);
  const hasFaqs = setupItems.some((i) => (i.id === "faqs" || i.id === "knowledge") && i.completed);
  const hasChannels = setupItems.some((i) => i.id === "channels" && i.completed);
  const hasProfile = setupItems.some((i) => i.id === "profile" && i.completed);

  const checklistSteps: ChecklistStep[] = [
    {
      id: "profile",
      title: "Business profile & contact info",
      whyItMatters: "Your assistant needs your business name, address, and phone number to tell customers where you are.",
      timeNeeded: "1 min",
      isComplete: hasProfile,
      href: "/profile",
      actionText: "Edit profile",
      exampleText: "E.g. Luxe Wellness & Spa, 124 Market St, Suite 200, Austin TX.",
    },
    {
      id: "services",
      title: "Add what you offer & pricing",
      whyItMatters: "Your assistant needs your services and pricing so customers can book appointments.",
      timeNeeded: "2 mins",
      isComplete: hasServices,
      href: "/services",
      actionText: "Add services",
      exampleText: "E.g. Haircut & Style — 45 mins, $65. Initial Dental Exam — 60 mins, $120.",
    },
    {
      id: "hours",
      title: "Set opening hours & holidays",
      whyItMatters: "Your assistant checks these hours so appointments are never booked when you are closed.",
      timeNeeded: "2 mins",
      isComplete: hasHours,
      href: "/settings",
      actionText: "Add hours",
      exampleText: "E.g. Monday–Friday 9:00 AM – 6:00 PM, Saturday 10:00 AM – 4:00 PM.",
    },
    {
      id: "faqs",
      title: "Add answers to common questions",
      whyItMatters: "Teach your assistant your cancellation policy, parking info, and payment methods.",
      timeNeeded: "2 mins",
      isComplete: hasFaqs,
      href: "/faqs",
      actionText: "Add questions",
      exampleText: "E.g. 'Can I cancel?' -> 'Free cancellation up to 24 hours before your booking.'",
    },
    {
      id: "channels",
      title: "Connect WhatsApp or Website Chat",
      whyItMatters: "Where your customers find you. Connect your channels so Operator can answer immediately.",
      timeNeeded: "2 mins",
      isComplete: hasChannels,
      href: "/channels",
      actionText: "Connect channels",
      exampleText: "E.g. Add the website chat button or scan the WhatsApp Business QR code.",
    },
  ];

  // ─── Single "Your Next Step" (Step 3.2) ────────────────────────────────────
  const firstIncompleteStep = checklistSteps.find((s) => !s.isComplete);
  const nextStepItem: NextStepItem | null = firstIncompleteStep
    ? {
        id: firstIncompleteStep.id,
        title: firstIncompleteStep.title,
        reason: firstIncompleteStep.whyItMatters,
        timeNeeded: firstIncompleteStep.timeNeeded,
        actionText: firstIncompleteStep.actionText,
        actionHref: firstIncompleteStep.href,
        exampleText: firstIncompleteStep.exampleText,
      }
    : null;

  // ─── Attention List Items (Step 3.5) ───────────────────────────────────────
  // Map escalations or recent exceptions into plain human items
  const attentionItems: AttentionItem[] = (snapshot.recentActivity || [])
    .filter((a) => a.type === "escalation" || a.type === "issue")
    .map((a) => ({
      id: a.id,
      customerName: a.description.split(":")[0] || "Customer Inquiry",
      summary: a.description,
      timeAgo: "Recently",
      actionText: "Review",
      actionHref: "/escalations",
      priority: "urgent",
    }));

  // If none from recent activity, check escalations count
  if (attentionItems.length === 0 && snapshot.dailyBrief.escalations > 0) {
    attentionItems.push({
      id: "pending-escalations",
      customerName: "Customer message needs human review",
      summary: "A customer asked a question requiring staff follow-up.",
      timeAgo: "Today",
      actionText: "Reply to customer",
      actionHref: "/escalations",
      priority: "urgent",
    });
  }

  return (
    <div className="w-full pb-space-16 space-y-space-6">
      {/* Verification Status Banner (Rendered when unverified) */}
      <DashboardVerificationBar
        businessName={businessName}
        verificationStatus={verificationStatus}
        orgId={orgId}
      />

      {/* 1. Greeting & Status with Pause Switch (Step 3.1) */}
      <ScrollReveal>
        <HomeStatusHero
          businessName={businessName}
          messagesAnsweredToday={snapshot.dailyBrief.conversationsHandled}
          isPaused={isPaused}
          onPauseToggle={setIsPaused}
          range={range}
          onRangeChange={handleRangeChange}
          onRefresh={handleManualRefresh}
          isRefreshing={isRefreshing}
          lastUpdatedText={relativeTime}
        />
      </ScrollReveal>

      {/* 2. ONE "Your Next Step" Card (Step 3.2) */}
      <ScrollReveal>
        <NextStepCard step={nextStepItem} />
      </ScrollReveal>

      {/* 3. Setup Checklist (Max 5 steps with progress) (Step 3.3) */}
      <ScrollReveal>
        <SetupChecklistCard steps={checklistSteps} />
      </ScrollReveal>

      {/* 4. Three Big Numbers (+ Calls on Pro/Business) (Step 3.4) */}
      <ScrollReveal>
        <OutcomeNumbersGrid
          messagesCount={snapshot.dailyBrief.conversationsHandled}
          appointmentsCount={snapshot.dailyBrief.appointmentsBooked}
          needsHumanCount={snapshot.dailyBrief.escalations}
          callsCount={0}
          minutesUsed={voiceMinutesUsed}
          minutesLimit={voiceMinutesLimit}
          hasPhonePlan={hasPhonePlan}
          periodLabel={range === "7d" ? "past 7 days" : range === "30d" ? "past 30 days" : "today"}
        />
      </ScrollReveal>

      {/* 5. Needs Your Attention List (Max 5 items, one button each) (Step 3.5) */}
      <ScrollReveal>
        <NeedsAttentionList items={attentionItems} />
      </ScrollReveal>

      {/* 6. Try It Yourself Card (Step 3.6) */}
      <ScrollReveal>
        <TryItYourselfCard hasPhonePlan={hasPhonePlan} />
      </ScrollReveal>
    </div>
  );
}
