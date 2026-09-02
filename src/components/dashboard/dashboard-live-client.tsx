"use client";

import * as React from "react";
import { OutcomeDashboardSnapshot } from "@/lib/dashboard-engine";
import { TimeRange } from "@/lib/dashboard-engine/daily-brief";
import { DashboardWidgets } from "@/components/dashboard/widget-registry";
import { ScrollReveal } from "@/components/motion";
import { DashboardVerificationBar } from "@/components/confidence-bridge/dashboard-verification-bar";
import { VerificationStatus } from "@/server/services/verification/types";

interface DashboardLiveClientProps {
  initialSnapshot: OutcomeDashboardSnapshot;
  businessName: string;
  verificationStatus: VerificationStatus;
  orgId: string;
}

export function DashboardLiveClient({
  initialSnapshot,
  businessName,
  verificationStatus,
  orgId,
}: DashboardLiveClientProps) {
  const [snapshot, setSnapshot] = React.useState<OutcomeDashboardSnapshot>(initialSnapshot);
  const [range, setRange] = React.useState<TimeRange>("today");
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isSimulating, setIsSimulating] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState<Date>(new Date());
  const [relativeTime, setRelativeTime] = React.useState("Just now");

  // Fetch updated metrics from the API for the selected range
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

  // Switch time horizon
  const handleRangeChange = (newRange: TimeRange) => {
    setRange(newRange);
    fetchMetrics(newRange, true);
  };

  // Manual refresh
  const handleManualRefresh = () => {
    fetchMetrics(range, true);
  };

  // Simulation handler: test a call or booking directly in live environment
  const handleSimulate = async (type: "conversation" | "booking") => {
    setIsSimulating(true);
    try {
      const res = await fetch("/api/dashboard/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        // Immediate refresh to display new activity and numbers
        await fetchMetrics(range, false);
      }
    } catch (e) {
      console.error("[DashboardLive] Simulation failed:", e);
    } finally {
      setIsSimulating(false);
    }
  };

  // Background real-time polling every 15 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      fetchMetrics(range, false);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchMetrics, range]);

  // Relative time updater ("Just now", "10s ago", "1m ago")
  React.useEffect(() => {
    const timeInterval = setInterval(() => {
      const diffSec = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      if (diffSec < 5) setRelativeTime("Just now");
      else if (diffSec < 60) setRelativeTime(`${diffSec}s ago`);
      else setRelativeTime(`${Math.floor(diffSec / 60)}m ago`);
    }, 5000);
    return () => clearInterval(timeInterval);
  }, [lastUpdated]);

  return (
    <div className="w-full pb-space-16">
      <div className="space-y-space-5 w-full">
        {/* Verification Status Banner (Rendered when unverified or needs review) */}
        <DashboardVerificationBar
          businessName={businessName}
          verificationStatus={verificationStatus}
          orgId={orgId}
        />

        {/* 1. Dynamic Hero Widget: Live Telemetry, Range Switcher & Natural Summary */}
        <ScrollReveal>
          <DashboardWidgets.DailyBrief
            brief={snapshot.dailyBrief}
            businessName={businessName}
            range={range}
            onRangeChange={handleRangeChange}
            onRefresh={handleManualRefresh}
            isRefreshing={isRefreshing}
            lastUpdatedText={relativeTime}
            onSimulate={handleSimulate}
            isSimulating={isSimulating}
          />
        </ScrollReveal>

        {/* 2. Setup Journey (Left 50%) & Quick Actions (Right 50%) */}
        <ScrollReveal className="grid grid-cols-1 lg:grid-cols-2 gap-space-5">
          <DashboardWidgets.SetupProgress progress={snapshot.setupProgress} />
          <DashboardWidgets.QuickActions onActionSuccess={() => fetchMetrics(range, true)} />
        </ScrollReveal>

        {/* 3. Headline Outcomes Row: Conversations, Bookings, Knowledge */}
        <ScrollReveal className="grid grid-cols-1 md:grid-cols-3 gap-space-5">
          <DashboardWidgets.ConversationPerf brief={snapshot.dailyBrief} />
          <DashboardWidgets.BookingPerf brief={snapshot.dailyBrief} />
          <DashboardWidgets.KnowledgeStatus knowledgeScore={snapshot.knowledgeScore} />
        </ScrollReveal>

        {/* 4. Outcomes & Gaps Row: AI Recommendations, Missing Requirements, Business Health */}
        <ScrollReveal className="grid grid-cols-1 lg:grid-cols-3 gap-space-5">
          <DashboardWidgets.AIRecommendations recommendations={snapshot.topRecommendations} />
          <DashboardWidgets.MissedOpps gapAnalysis={snapshot.gapAnalysis} />
          <DashboardWidgets.BusinessHealth health={snapshot.health} />
        </ScrollReveal>

        {/* 5. Operations Row: Real-time Recent Activity */}
        <ScrollReveal className="w-full">
          <DashboardWidgets.RecentActivity
            activity={snapshot.recentActivity || []}
          />
        </ScrollReveal>
      </div>
    </div>
  );
}
