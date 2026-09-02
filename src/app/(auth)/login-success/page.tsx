"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ArrowRight, Sparkles, Building2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthHeader } from "@/components/shared/auth-forms";
import { Button } from "@/components/shared/button";
import { Suspense } from "react";

function LoginSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/onboarding";
  const mode = searchParams.get("mode") || "signin";
  const isFirstTime = searchParams.get("firstTime") !== "false" || mode === "signup";
  
  const [secondsLeft, setSecondsLeft] = React.useState(4);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    // Smooth progress bar update
    const startTime = Date.now();
    const duration = 4000; // 4 seconds

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(currentProgress);

      const remaining = Math.max(Math.ceil((duration - elapsed) / 1000), 0);
      setSecondsLeft(remaining);

      if (elapsed >= duration) {
        clearInterval(progressInterval);
        router.push(redirectTarget);
        router.refresh();
      }
    }, 50);

    return () => clearInterval(progressInterval);
  }, [redirectTarget, router]);

  const handleImmediateNavigate = () => {
    router.push(redirectTarget);
    router.refresh();
  };

  const isSignup = mode === "signup";

  return (
    <div className="space-y-space-8 animate-fade-up">
      <AuthHeader
        heading={isSignup ? "Account Created! 🎉" : isFirstTime ? "Welcome to Operator! 🎉" : "Welcome Back! 👋"}
        subheading={
          isFirstTime
            ? "Your account is created and ready for workspace setup."
            : "Your session has been verified and activated."
        }
      />

      <div className="space-y-space-6">
        {/* Animated Success Badge */}
        <div className="flex justify-center">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-scale-in" aria-hidden="true" />
            <span
              className="absolute inset-0 rounded-2xl border border-emerald-500/30 animate-ping opacity-40"
              style={{ animationDuration: "2.5s" }}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Informative Guidance Card */}
        <div className="glass-panel radius-xl p-space-6 space-y-space-4 text-center border border-border/60 bg-bg-layer-1/80 backdrop-blur-md">
          <div className="flex items-center justify-center gap-2 text-primary font-semibold text-sm">
            <Sparkles className="h-4 w-4 animate-pulse" />
            <span>{isFirstTime ? "Operator AI Workspace Setup" : "Operator AI Active Workspace"}</span>
          </div>

          <p className="text-body-sm text-foreground/75 leading-relaxed">
            {isFirstTime ? (
              <>
                You are now being directed to the <strong>Operator Onboarding</strong> wizard to configure your business profile, AI receptionist, and communication channels.
              </>
            ) : (
              <>
                Welcome back! Navigating directly to your Operator Workspace and live dashboard...
              </>
            )}
          </p>

          {/* 4-Second Animated Progress Bar */}
          <div className="space-y-2 pt-2">
            <div className="w-full bg-border-default/40 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary to-indigo-500 h-full rounded-full transition-all duration-75 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-caption text-foreground/50">
              Navigating automatically in <span className="font-bold text-primary">{secondsLeft}s</span>...
            </p>
          </div>
        </div>

        {/* Action Button */}
        <Button
          type="button"
          onClick={handleImmediateNavigate}
          shape="pill"
          size="lg"
          className="w-full gap-2 shadow-md shadow-primary/10"
        >
          <span>{isFirstTime ? "Continue to Onboarding Now" : "Continue to Dashboard Now"}</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function LoginSuccessPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<div className="text-center py-12 text-sm text-muted-foreground">Loading workspace...</div>}>
        <LoginSuccessContent />
      </Suspense>
    </AuthLayout>
  );
}
