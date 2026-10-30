"use client";

import * as React from "react";
import Link from "next/link";
import { MessageSquare, Calendar, AlertTriangle, Phone, ArrowUpRight, Sparkles } from "lucide-react";
import { cn } from "@/components/shared/utils";
import { COPY } from "@/lib/copy/labels";

interface OutcomeNumbersGridProps {
  messagesCount: number;
  appointmentsCount: number;
  needsHumanCount: number;
  callsCount?: number;
  minutesUsed?: number;
  minutesLimit?: number;
  hasPhonePlan?: boolean;
  periodLabel?: string;
}

export function OutcomeNumbersGrid({
  messagesCount,
  appointmentsCount,
  needsHumanCount,
  callsCount = 0,
  minutesUsed = 0,
  minutesLimit = 250,
  hasPhonePlan = false,
  periodLabel = "today",
}: OutcomeNumbersGridProps) {
  const hasAnyActivity = messagesCount > 0 || appointmentsCount > 0 || needsHumanCount > 0 || callsCount > 0;

  return (
    <div className="space-y-space-3">
      {/* 3 or 4 Big Number Cards */}
      <div
        className={cn(
          "grid gap-space-4",
          hasPhonePlan ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-3"
        )}
      >
        {/* 1. Messages Answered */}
        <Link
          href="/inbox"
          className="group relative flex flex-col justify-between p-space-5 rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:bg-muted/20 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-caption font-bold text-muted-foreground uppercase tracking-wider">
              {COPY.home.metrics.messagesAnswered}
            </span>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>

          <div className="my-3">
            <div className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground tabular-nums">
              {messagesCount}
            </div>
            <p className="text-caption text-muted-foreground mt-1">
              {messagesCount === 1 ? "1 message handled by AI" : `${messagesCount} messages handled by AI`}
            </p>
          </div>

          <div className="flex items-center gap-1 text-xs font-semibold text-primary">
            <span>View messages</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </Link>

        {/* 2. Appointments Booked */}
        <Link
          href="/appointments"
          className="group relative flex flex-col justify-between p-space-5 rounded-2xl border border-border/80 bg-card hover:border-emerald-500/40 hover:bg-muted/20 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-caption font-bold text-muted-foreground uppercase tracking-wider">
              {COPY.home.metrics.appointmentsBooked}
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>

          <div className="my-3">
            <div className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground tabular-nums">
              {appointmentsCount}
            </div>
            <p className="text-caption text-muted-foreground mt-1">
              {appointmentsCount === 1 ? "1 confirmed booking" : `${appointmentsCount} confirmed bookings`}
            </p>
          </div>

          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
            <span>View calendar</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </Link>

        {/* 3. Customers who need a human */}
        <Link
          href="/escalations"
          className="group relative flex flex-col justify-between p-space-5 rounded-2xl border border-border/80 bg-card hover:border-amber-500/40 hover:bg-muted/20 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-caption font-bold text-muted-foreground uppercase tracking-wider">
              {COPY.home.metrics.needsHuman}
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>

          <div className="my-3">
            <div className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground tabular-nums">
              {needsHumanCount}
            </div>
            <p className="text-caption text-muted-foreground mt-1">
              {needsHumanCount === 0 ? "Zero pending escalations" : "Requires staff follow-up"}
            </p>
          </div>

          <div className="flex items-center gap-1 text-xs font-semibold text-amber-400">
            <span>Open attention queue</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </Link>

        {/* 4. Calls Answered (Pro / Business only) */}
        {hasPhonePlan && (
          <Link
            href="/voice/dashboard"
            className="group relative flex flex-col justify-between p-space-5 rounded-2xl border border-border/80 bg-card hover:border-indigo-500/40 hover:bg-muted/20 transition-all shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-caption font-bold text-muted-foreground uppercase tracking-wider">
                {COPY.home.metrics.callsAnswered}
              </span>
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                <Phone className="w-4 h-4" />
              </div>
            </div>

            <div className="my-3 space-y-1.5">
              <div className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground tabular-nums">
                {callsCount}
              </div>
              {/* Minutes usage progress */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{COPY.plans.minutesUsed(minutesUsed, minutesLimit)}</span>
                </div>
                <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(Math.round((minutesUsed / Math.max(minutesLimit, 1)) * 100), 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-semibold text-indigo-400">
              <span>View call logs</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </Link>
        )}
      </div>

      {/* Friendly empty advice if no activity yet */}
      {!hasAnyActivity && (
        <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 text-xs text-muted-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <span>
            {COPY.home.emptyMetrics} Try sending a test message below to see live updates.
          </span>
        </div>
      )}
    </div>
  );
}

