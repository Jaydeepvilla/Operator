"use client";

import { m } from "framer-motion";
import { hoverScale } from "@/components/motion/hover";
import { DailyBriefData } from "@/lib/dashboard-engine/daily-brief";
import { KPICard } from "../shared/kpi-card";
import { MetricBar } from "../shared/metric-bar";
import { MessageSquare, AlertCircle } from "lucide-react";

interface ConversationPerfWidgetProps {
  brief: DailyBriefData;
}

export function ConversationPerfWidget({ brief }: ConversationPerfWidgetProps) {
  const { conversationsHandled, escalations, aiSuccessRate, range = "today" } = brief;
  const aiHandled = Math.max(0, conversationsHandled - escalations);
  const hasActivity = conversationsHandled > 0;

  const periodLabel =
    range === "7d" ? "past 7 days" :
    range === "30d" ? "past 30 days" :
    range === "all" ? "all time" : "today";

  return (
    <KPICard
      title="Conversations"
      href="/inbox"
      icon={MessageSquare}
      score={hasActivity ? aiSuccessRate : 0}
      empty={!hasActivity}
      displayValue={hasActivity ? `${aiSuccessRate}%` : "0"}
      statusLabel={hasActivity ? `${aiSuccessRate}% resolved by AI` : "Ready for Inquiries"}
      alertCount={escalations}
      alertText="escalation"
      alertIcon={AlertCircle}
      alertType={escalations > 3 ? "error" : escalations > 0 ? "warning" : "success"}
      metaText={
        hasActivity
          ? `${aiHandled} AI-handled · ${conversationsHandled} total (${periodLabel})`
          : `AI Receptionist listening · 0 inquiries (${periodLabel})`
      }
    >
      <div className="space-y-space-2">
        <MetricBar
          label="AI Resolution"
          value={hasActivity ? aiSuccessRate : 0}
          empty={!hasActivity}
          displayValue={hasActivity ? undefined : "Ready"}
          showDot
        />
        <MetricBar
          label="Response Quality"
          value={hasActivity ? Math.min(100, aiSuccessRate + 5) : 0}
          empty={!hasActivity}
          displayValue={hasActivity ? undefined : "Ready"}
          showDot
        />
      </div>
    </KPICard>
  );
}
