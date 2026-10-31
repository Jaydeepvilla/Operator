"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Phone, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/shared/button";

interface VoiceLockedViewProps {
  children: React.ReactNode;
}

export function VoiceLockedView({ children }: VoiceLockedViewProps) {
  const router = useRouter();

  return (
    <div className="relative min-h-[calc(100vh-10rem)] w-full overflow-hidden">
      {/* Blurred background preview */}
      <div 
        aria-hidden="true" 
        className="filter blur-md opacity-35 select-none pointer-events-none transition-all duration-300"
      >
        {children}
      </div>

      {/* Locked overlay & Upgrade Modal */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-md z-30 flex items-center justify-center p-4">
        <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-sm">
            <Phone className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              Pro & Business Feature
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Upgrade to Pro to Access Voice AI Phone Answering
            </h2>
            <p className="text-body-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              Operator AI picks up your business phone calls 24/7, answers customer questions, qualifies leads, and schedules bookings autonomously.
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 text-left space-y-2.5">
            <div className="flex items-center gap-2.5 text-xs text-foreground font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>250 Voice AI call minutes included per month</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-foreground font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Autonomous appointment booking & smart calendar locking</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-foreground font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Instant call transcripts, summary logs, and SMS recaps</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-foreground font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Dedicated business phone number with smart call routing</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 text-body-sm font-semibold cursor-pointer"
              onClick={() => router.push("/dashboard")}
            >
              Back to Dashboard
            </Button>
            <Button
              type="button"
              className="flex-1 h-11 text-body-sm font-semibold cursor-pointer gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
              onClick={() => router.push("/billing?upgrade=pro&feature=voice")}
            >
              <span>Upgrade to Pro</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

