"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ArrowRight, Sparkles, AlertTriangle, UserCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthHeader } from "@/components/shared/auth-forms";
import { Button } from "@/components/shared/button";
import { Suspense } from "react";

function LoginSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const redirectTarget = React.useMemo(() => {
    if (!rawRedirect) return "/onboarding";
    const trimmed = rawRedirect.trim();
    if (
      !trimmed.startsWith("/") ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("/\\") ||
      trimmed.includes("\\") ||
      trimmed.includes("://") ||
      /[\x00-\x1f\x7f]/.test(trimmed) ||
      trimmed.startsWith("/api/")
    ) {
      return "/dashboard";
    }
    return trimmed;
  }, [rawRedirect]);
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

  // ─── Account Already Exists UX ───────────────────────────────────────────
  if (isAccountExists) {
    return (
      <div className="space-y-space-8 animate-fade-up">
        <AuthHeader
          align="center"
          heading="Account Already Exists"
          subheading="This Google account is already associated with an Operator workspace."
        />

        <div className="space-y-space-6">
          {/* Info Badge */}
          <div className="flex justify-center">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-b from-amber-500/15 to-amber-500/5 border border-amber-500/30 shadow-lg shadow-amber-500/10">
              <UserCheck className="h-10 w-10 text-amber-400 animate-scale-in" aria-hidden="true" />
            </div>
          </div>

          {/* Explanation Card */}
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/60 backdrop-blur-xl p-space-6 space-y-space-4 text-center shadow-2xl shadow-black/40">
            {/* Top Amber Highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
            
            <div className="inline-flex items-center justify-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold text-xs tracking-wide">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <span>Existing Account Detected</span>
            </div>

            <p className="text-body-sm text-foreground/80 leading-relaxed max-w-sm mx-auto">
              You clicked <strong>Sign Up</strong>, but an Operator account already exists with this Google identity. 
              No duplicate account was created. You can continue directly to your existing workspace.
            </p>

            <div className="pt-2 px-2 space-y-2">
              <div className="flex items-center gap-3 text-left text-xs text-foreground/60">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Identity verified — no duplicate account created</span>
              </div>
              <div className="flex items-center gap-3 text-left text-xs text-foreground/60">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
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
              className="w-full gap-2 font-semibold shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-light hover:to-indigo-500 transition-all duration-200"
            >
              <span>Continue to Your Account</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="text-center text-caption text-foreground/50">
              Need a different account?{" "}
              <Link
                href="/sign-up"
                className="font-semibold text-primary-light hover:underline hover:opacity-90 transition-opacity"
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
        align="center"
        heading={isSignup ? "Account Created!" : isFirstTime ? "Welcome to Operator" : "Welcome Back"}
        subheading={
          isFirstTime
            ? "Your account is created and ready for workspace setup."
            : "Your session has been verified and activated."
        }
      />

      <div className="space-y-space-6">
        {/* Animated Success Badge */}
        <div className="flex justify-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_25px_-5px_rgba(16,185,129,0.3)]">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 animate-scale-in" aria-hidden="true" />
            <span
              className="absolute inset-0 rounded-2xl border border-emerald-500/25 animate-ping opacity-25"
              style={{ animationDuration: "2.8s" }}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Informative Guidance Card */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl p-space-6 space-y-space-4 text-center shadow-2xl shadow-black/80">
          {/* Subtle Top Purple Highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          
          {/* Ambient Glow */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-20 bg-primary/15 blur-2xl rounded-full pointer-events-none" />

          {/* Status Pill Badge */}
          <div className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 border border-primary/40 text-primary-light text-xs font-semibold tracking-wide shadow-sm shadow-primary/25">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <Sparkles className="h-3.5 w-3.5 text-primary-light" />
            <span>{isFirstTime ? "Operator AI Workspace Setup" : "Operator AI Active Workspace"}</span>
          </div>

          <p className="relative text-body-sm text-foreground/90 leading-relaxed max-w-sm mx-auto">
            {isFirstTime ? (
              <>
                You are now being directed to the <strong className="text-foreground font-semibold">Operator Onboarding</strong> wizard to configure your business profile, AI receptionist, and communication channels.
              </>
            ) : (
              <>
                Welcome back! Navigating directly to your Operator Workspace and live dashboard...
              </>
            )}
          </p>

          {/* 4-Second Animated Progress Bar */}
          <div className="relative space-y-2 pt-2">
            <div className="w-full bg-muted/60 border border-border/60 rounded-full h-2 overflow-hidden p-0.5">
              <div
                className="bg-gradient-to-r from-violet-600 via-primary to-indigo-400 h-full rounded-full shadow-[0_0_12px_rgba(124,58,237,0.5)] transition-all duration-75 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-caption text-muted-foreground">
              Navigating automatically in <span className="font-bold text-primary-light">{secondsLeft}s</span>...
            </p>
          </div>
        </div>

        {/* Action Button */}
        <Button
          type="button"
          onClick={handleImmediateNavigate}
          shape="pill"
          size="lg"
          className="w-full gap-2 font-semibold shadow-lg shadow-primary/25 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-light hover:to-indigo-500 transition-all duration-200"
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
