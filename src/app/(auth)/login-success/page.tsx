"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ArrowRight, Sparkles, Building2, AlertTriangle, UserCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthHeader } from "@/components/shared/auth-forms";
import { Button } from "@/components/shared/button";
import { Suspense } from "react";

function LoginSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/onboarding";
  const mode = searchParams.get("mode") || "signin"; // "signin" | "signup" | "account_exists"
  const isFirstTime = searchParams.get("firstTime") !== "false" || mode === "signup";
  const isAccountExists = mode === "account_exists";
  
  const [secondsLeft, setSecondsLeft] = React.useState(4);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    // account_exists mode: do NOT auto-redirect — require user acknowledgment
    if (isAccountExists) return;

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
  }, [redirectTarget, router, isAccountExists]);

  const handleImmediateNavigate = () => {
    router.push(redirectTarget);
    router.refresh();
  };

  // ─── Account Already Exists UX (BUG #2 FIX) ─────────────────────────────
  if (isAccountExists) {
    return (
      <div className="space-y-space-8 animate-fade-up">
        <AuthHeader
          heading="Account Already Exists"
          subheading="This Google account is already associated with an Operator workspace."
        />

        <div className="space-y-space-6">
          {/* Info Badge */}
          <div className="flex justify-center">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-lg shadow-amber-500/5">
              <UserCheck className="h-10 w-10 text-amber-500 animate-scale-in" aria-hidden="true" />
            </div>
          </div>

          {/* Explanation Card */}
          <div className="glass-panel radius-xl p-space-6 space-y-space-4 text-center border border-border/60 bg-bg-layer-1/80 backdrop-blur-md">
            <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>Existing Account Detected</span>
            </div>

            <p className="text-body-sm text-foreground/75 leading-relaxed">
              You clicked <strong>Sign Up</strong>, but an Operator account already exists with this Google identity. 
              No duplicate account was created. You can continue directly to your existing workspace.
            </p>

            <div className="pt-2 px-4">
              <div className="flex items-center gap-3 text-left text-xs text-foreground/50">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Identity verified — no duplicate account created</span>
              </div>
              <div className="flex items-center gap-3 text-left text-xs text-foreground/50 mt-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Your existing workspace and data are intact</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              type="button"
              onClick={handleImmediateNavigate}
              shape="pill"
              size="lg"
              className="w-full gap-2 shadow-md shadow-primary/10"
            >
              <span>Continue to Your Account</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="text-center text-caption text-foreground/40">
              Need a different account?{" "}
              <Link
                href="/sign-up"
                className="font-semibold text-primary hover:underline hover:opacity-80 transition-opacity"
              >
                Use a different email
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Normal Signup / Signin UX ───────────────────────────────────────────
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
