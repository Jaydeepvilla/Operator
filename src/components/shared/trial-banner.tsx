"use client";

import { useRouter } from "next/navigation";
import { Clock, Zap } from "lucide-react";
import { Button } from "./button";
import { cn } from "./utils";

interface TrialBannerProps {
  trialEndsAt: Date | string | null | undefined;
  planId: string;
}

export function TrialBanner({ trialEndsAt, planId }: TrialBannerProps) {
  const router = useRouter();

  if (!trialEndsAt || planId === "pro" || planId === "business" || planId === "enterprise") {
    return null;
  }

  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  const isExpiringSoon = daysRemaining <= 3;
  const isExpired = daysRemaining === 0;

  return (
    <div
      className={cn(
        "flex items-center gap-space-3 px-space-5 py-space-2 text-caption  border-b",
        isExpired
          ? "bg-destructive/8 border-destructive/15 text-destructive"
          : isExpiringSoon
            ? "bg-warning-500/8 border-warning-500/15 text-warning-500"
            : "bg-[hsl(var(--primary)/0.06)] border-[hsl(var(--primary)/0.12)] text-primary"
      )}
    >
      <Clock className="h-3 w-3 shrink-0 opacity-70" />
      <span className="flex-1">
        {isExpired ? (
          <>Your free trial has <strong>ended</strong>.</>
        ) : (
          <>
            <strong>{daysRemaining} day{daysRemaining !== 1 ? "s" : ""}</strong> remaining in your free trial.
          </>
        )}
        {" "}Upgrade to keep Operator active.
      </span>
      <Button
        size="xs"
        variant={isExpired || isExpiringSoon ? "warning" : "soft"}
        onClick={() => router.push("/billing")}
        id="trial-banner-upgrade-btn"
        className="shrink-0"
      >
        <Zap className="h-2.5 w-2.5" />
        Upgrade
      </Button>
    </div>
  );
}
