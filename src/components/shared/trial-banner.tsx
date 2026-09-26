"use client";

import { useRouter } from "next/navigation";
import { Clock, Zap, AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Button } from "./button";
import { cn } from "./utils";

interface TrialBannerProps {
  trialEndsAt?: Date | string | null;
  planId?: string;
  planName?: string;
  status?: string; // "TRIALING", "ACTIVE", "PAST_DUE", "CANCELING", "SUSPENDED", "EXPIRED"
  trialDaysRemaining?: number;
  currentPeriodEnd?: Date | string | null;
  gracePeriodDaysRemaining?: number | null;
  convUsage?: number;
  convLimit?: number | null;
  voiceUsage?: number;
  voiceLimit?: number | null;
}

export function TrialBanner({
  trialEndsAt,
  planId = "starter",
  planName = "Starter",
  status = "TRIALING",
  trialDaysRemaining,
  currentPeriodEnd,
  gracePeriodDaysRemaining,
  convUsage = 0,
  convLimit = 500,
  voiceUsage = 0,
  voiceLimit = 100,
}: TrialBannerProps) {
  const router = useRouter();

  // If trialDaysRemaining is not passed, compute dynamically
  const daysRemaining =
    typeof trialDaysRemaining === "number"
      ? trialDaysRemaining
      : trialEndsAt
      ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 14;

  const normalizedStatus = (status || "TRIALING").toUpperCase();
  const convPercent = convLimit ? Math.min(100, Math.round((convUsage / convLimit) * 100)) : 0;

  // Don't render banner if active, healthy, and below 80% usage
  if (normalizedStatus === "ACTIVE" && convPercent < 80) {
    return null;
  }

  // 1. Suspended or Expired State
  if (normalizedStatus === "SUSPENDED" || normalizedStatus === "EXPIRED") {
    return (
      <div className="flex items-center gap-space-3 px-space-5 py-space-2.5 text-caption bg-destructive/10 border-b border-destructive/20 text-destructive">
        <ShieldAlert className="h-4 w-4 shrink-0 text-destructive" />
        <span className="flex-1 font-medium">
          <strong>Subscription Suspended:</strong> Your Operator live AI calling services are currently restricted. Historical data and settings remain safe.
        </span>
        <Button
          size="xs"
          variant="destructive"
          onClick={() => router.push("/billing")}
          className="shrink-0 cursor-pointer font-semibold"
        >
          Reactivate Subscription
        </Button>
      </div>
    );
  }

  // 2. Past Due / Grace Period State
  if (normalizedStatus === "PAST_DUE") {
    const graceDays = gracePeriodDaysRemaining ?? 5;
    return (
      <div className="flex items-center gap-space-3 px-space-5 py-space-2.5 text-caption bg-warning-500/10 border-b border-warning-500/20 text-warning-500">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="flex-1 font-medium">
          <strong>Payment Failed:</strong> You have <strong>{graceDays} day{graceDays !== 1 ? "s" : ""} remaining</strong> in your grace period before operational suspension.
        </span>
        <Button
          size="xs"
          variant="warning"
          onClick={() => router.push("/billing")}
          className="shrink-0 cursor-pointer font-semibold"
        >
          Update Payment Method
        </Button>
      </div>
    );
  }

  // 3. Cancellation Scheduled State
  if (normalizedStatus === "CANCELING") {
    const periodEndFormatted = currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleDateString() : "period end";
    return (
      <div className="flex items-center gap-space-3 px-space-5 py-space-2.5 text-caption bg-muted/40 border-b border-border/40 text-muted-foreground">
        <Clock className="h-4 w-4 shrink-0 text-primary" />
        <span className="flex-1">
          Your <strong>{planName}</strong> plan is active until <strong>{periodEndFormatted}</strong>. Cancellation scheduled.
        </span>
        <Button
          size="xs"
          variant="secondary"
          onClick={() => router.push("/billing")}
          className="shrink-0 cursor-pointer"
        >
          Reactivate Subscription
        </Button>
      </div>
    );
  }

  // 4. Active with High Usage (>= 80%)
  if (normalizedStatus === "ACTIVE" && convPercent >= 80) {
    return (
      <div className="flex items-center gap-space-3 px-space-5 py-space-2 text-caption bg-warning-500/8 border-b border-warning-500/20 text-warning-500">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="flex-1">
          You've used <strong>{convPercent}%</strong> of your monthly conversation allowance ({convUsage.toLocaleString()} / {convLimit?.toLocaleString()}). Consider upgrading.
        </span>
        <Button
          size="xs"
          variant="warning"
          onClick={() => router.push("/billing")}
          className="shrink-0 cursor-pointer"
        >
          <Zap className="h-2.5 w-2.5" />
          Upgrade Plan
        </Button>
      </div>
    );
  }

  // 5. Dynamic 14-Day Free Trial State
  const isExpiringSoon = daysRemaining <= 3;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-space-3 px-space-5 py-space-2 text-caption border-b transition-colors",
        isExpiringSoon
          ? "bg-warning-500/10 border-warning-500/20 text-warning-500"
          : "bg-[hsl(var(--primary)/0.06)] border-[hsl(var(--primary)/0.12)] text-primary"
      )}
    >
      <Clock className="h-3.5 w-3.5 shrink-0 opacity-80" />
      <span className="flex-1">
        <strong>{planName} Trial:</strong>{" "}
        {daysRemaining === 0 ? (
          <span>Trial ending today.</span>
        ) : (
          <span>
            <strong>{daysRemaining} day{daysRemaining !== 1 ? "s" : ""}</strong> remaining.
          </span>
        )}
        {" "}
        <span className="opacity-80">
          ({convUsage.toLocaleString()} / {convLimit?.toLocaleString()} conversations · {voiceUsage} / {voiceLimit} voice mins used)
        </span>
      </span>
      <Button
        size="xs"
        variant={isExpiringSoon ? "warning" : "soft"}
        onClick={() => router.push("/billing")}
        id="trial-banner-upgrade-btn"
        className="shrink-0 cursor-pointer"
      >
        <Zap className="h-2.5 w-2.5" />
        Continue {planName}
      </Button>
    </div>
  );
}
