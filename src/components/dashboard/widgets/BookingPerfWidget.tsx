"use client";

import { m } from "framer-motion";
import { hoverScale } from "@/components/motion/hover";

import { DailyBriefData } from "@/lib/dashboard-engine/daily-brief";
import { KPICard } from "../shared/kpi-card";
import { MetricBar } from "../shared/metric-bar";
import { CalendarCheck, XCircle } from "lucide-react";

interface BookingPerfWidgetProps {
  brief: DailyBriefData;
}

export function BookingPerfWidget({ brief }: BookingPerfWidgetProps) {
  const {
    appointmentsBooked,
    appointmentsCancelled,
    appointmentsNoShow,
    revenueGenerated,
    range = "today",
  } = brief;

  const totalAttempts = appointmentsBooked + appointmentsCancelled + appointmentsNoShow;
  const hasActivity = totalAttempts > 0;
  const conversionRate =
    hasActivity ? Math.round((appointmentsBooked / totalAttempts) * 100) : 0;

  const issues = appointmentsCancelled + appointmentsNoShow;

  const periodLabel =
    range === "7d" ? "past 7 days" :
    range === "30d" ? "past 30 days" :
    range === "all" ? "all time" : "today";

  const revenueText =
    revenueGenerated > 0
      ? `$${revenueGenerated.toLocaleString()} revenue (${periodLabel})`
      : hasActivity
      ? `0 revenue recorded (${periodLabel})`
      : `Booking engine online · Slots available (${periodLabel})`;

  return (
    <KPICard
      title="Bookings"
      href="/appointments"
      icon={CalendarCheck}
      score={hasActivity ? conversionRate : 0}
      empty={!hasActivity}
      displayValue={hasActivity ? `${conversionRate}%` : "0"}
      statusLabel={
        hasActivity
          ? `${appointmentsBooked} booked (${periodLabel})`
          : "0 Bookings (Ready)"
      }
      alertCount={issues}
      alertText="issue"
      alertIcon={XCircle}
      alertType={issues > 2 ? "error" : issues > 0 ? "warning" : "success"}
      metaText={revenueText}
    >
      <div className="space-y-space-2">
        <MetricBar
          label="Conversion Rate"
          value={hasActivity ? conversionRate : 0}
          empty={!hasActivity}
          displayValue={hasActivity ? undefined : "Ready"}
          showDot
        />
        {appointmentsCancelled > 0 ? (
          <MetricBar
            label="Cancellations"
            value={Math.round(
              (appointmentsCancelled / Math.max(totalAttempts, 1)) * 100
            )}
            showDot
          />
        ) : (
          <MetricBar
            label="Fulfillment Rate"
            value={hasActivity ? 100 : 0}
            empty={!hasActivity}
            displayValue={hasActivity ? undefined : "Ready"}
            showDot
          />
        )}
      </div>
    </KPICard>
  );
}
