"use client";

import * as React from "react";
import Link from "next/link";
import { MessageSquare, Phone, Lock, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/shared/button";
import { COPY } from "@/lib/copy/labels";

interface TryItYourselfCardProps {
  hasPhonePlan?: boolean;
}

export function TryItYourselfCard({ hasPhonePlan = false }: TryItYourselfCardProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-space-6 shadow-sm space-y-space-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-body-md font-bold text-foreground">{COPY.home.tryItTitle}</h3>
        </div>
        <p className="text-body-sm text-muted-foreground">
          Test your assistant right now to experience exactly how your customers will interact with it.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-4 pt-1">
        {/* Test 1: Web Chat / WhatsApp Message */}
        <div className="p-space-4 rounded-xl border border-border/70 bg-muted/20 flex flex-col justify-between gap-3">
          <div className="space-y-1.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h4 className="text-body-sm font-semibold text-foreground">
              Chat & Messaging
            </h4>
            <p className="text-caption text-muted-foreground leading-relaxed">
              Open the live chatbot to ask questions about your opening hours, pricing, and booking.
            </p>
          </div>

          <Button asChild size="sm" className="w-full gap-1.5 font-semibold text-xs cursor-pointer">
            <Link href="/widget">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{COPY.home.testMessageButton}</span>
            </Link>
          </Button>
        </div>

        {/* Test 2: Phone Call (Plan-Aware) */}
        <div className="p-space-4 rounded-xl border border-border/70 bg-muted/20 flex flex-col justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Phone className="w-4 h-4" />
              </div>
              {!hasPhonePlan && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-light bg-primary/15 border border-primary/25 px-2 py-0.5 rounded-full">
                  <Lock className="w-2.5 h-2.5" />
                  <span>{COPY.plans.phoneLockedBadge}</span>
                </span>
              )}
            </div>

            <h4 className="text-body-sm font-semibold text-foreground">
              Phone Receptionist
            </h4>
            <p className="text-caption text-muted-foreground leading-relaxed">
              {hasPhonePlan
                ? "Simulate a live phone call to test speaking voice, greeting speed, and appointment intake."
                : COPY.plans.phoneLockedExplanation}
            </p>
          </div>

          {hasPhonePlan ? (
            <Button asChild size="sm" variant="outline" className="w-full gap-1.5 font-semibold text-xs cursor-pointer">
              <Link href="/voice/settings">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>{COPY.home.testCallButton}</span>
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline" className="w-full gap-1.5 font-semibold text-xs border-primary/30 text-primary-light hover:bg-primary/10 cursor-pointer">
              <Link href="/billing">
                <span>{COPY.plans.upgradeToPro}</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

