"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Mail,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthHeader } from "@/components/shared/auth-forms";
import { AuthErrorBanner } from "@/components/auth/auth-error-banner";
import { verifyEmailAction, resendVerificationAction } from "@/server/actions/auth";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";
  const devToken = searchParams.get("devToken") || "";

  const [verifying, setVerifying] = React.useState(!!token);
  const [success, setSuccess] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [resending, setResending] = React.useState(false);
  const [resendSuccess, setResendSuccess] = React.useState(false);

  // Auto-verify on mount if token present
  React.useEffect(() => {
    if (!token) return;
    const run = async () => {
      try {
        const result = await verifyEmailAction({ token });
        if (result.success) {
          setSuccess(true);
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 2000);
        } else {
          setErrorMsg(result.error || "The verification link is invalid or has expired.");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "An unexpected error occurred.");
      } finally {
        setVerifying(false);
      }
    };
    run();
  }, [token, router]);

  const handleResend = async () => {
    if (!email) {
      setErrorMsg("No email address found. Please go back and register again.");
      return;
    }
    setResending(true);
    setResendSuccess(false);
    setErrorMsg(null);
    try {
      const result = await resendVerificationAction({ email });
      if (result.success) {
        setResendSuccess(true);
      } else {
        setErrorMsg(result.error || "Failed to resend the verification email.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setResending(false);
    }
  };

  // ── Verifying state ──────────────────────────────────────────────────────
  if (verifying) {
    return (
      <div className="flex flex-col items-center gap-space-6 text-center py-space-8 animate-fade-in">
        <div className="flex h-14 w-14 items-center justify-center radius-full bg-primary/10 border border-primary/20">
          <Loader2 className="h-7 w-7 text-primary animate-spin" aria-label="Verifying" />
        </div>
        <div className="space-y-space-2">
          <h2 className="text-title-lg font-semibold text-foreground">Verifying your email…</h2>
          <p className="text-body-sm text-foreground/50 leading-body">
            Please wait while we confirm your verification token.
          </p>
        </div>
      </div>
    );
  }

  // ── Success state ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex flex-col items-center gap-space-6 text-center animate-scale-in">
        <div className="flex h-14 w-14 items-center justify-center radius-full bg-state-success-bg border border-state-success-text/20">
          <CheckCircle className="h-7 w-7 text-state-success-text" aria-hidden="true" />
        </div>
        <div className="space-y-space-2">
          <h2 className="text-title-lg font-semibold text-foreground">Email verified!</h2>
          <p className="text-body-sm text-foreground/50 leading-body">
            Your email has been verified. Redirecting to your dashboard…
          </p>
        </div>
      </div>
    );
  }

  // ── Token verification failed ────────────────────────────────────────────
  if (token && errorMsg) {
    return (
      <div className="flex flex-col items-center gap-space-6 text-center animate-fade-in">
        <div className="flex h-14 w-14 items-center justify-center radius-full bg-state-error-bg border border-state-error-text/20">
          <AlertCircle className="h-7 w-7 text-state-error-text" aria-hidden="true" />
        </div>
        <div className="space-y-space-2">
          <h2 className="text-title-lg font-semibold text-foreground">Verification failed</h2>
          <p className="text-body-sm text-foreground/50 leading-body">{errorMsg}</p>
        </div>
        <div className="flex flex-col gap-space-3 w-full">
          {email && (
            <Button onClick={handleResend} disabled={resending} data-loading={resending} className="w-full">
              {resending ? (
                <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Resending…</>
              ) : (
                <><ArrowRight className="h-4 w-4" aria-hidden="true" /> Request new link</>
              )}
            </Button>
          )}
          <Link href="/sign-in" className="text-caption font-semibold text-primary hover:text-primary-light transition-colors">
            ← Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  // ── Waiting for verification (no token) ─────────────────────────────────
  return (
    <div className="space-y-space-6 animate-fade-up" style={{ animationDelay: "80ms", animationFillMode: "both" }}>
      {/* Icon */}
      <div className="flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center radius-full bg-primary/10 border border-primary/20 animate-float">
          <Mail className="h-7 w-7 text-primary" aria-hidden="true" />
        </div>
      </div>

      <div className="space-y-space-2 text-center">
        <h2 className="text-title-lg font-semibold text-foreground">Check your inbox</h2>
        <p className="text-body-sm text-foreground/50 leading-body">
          We sent a verification link to{" "}
          {email ? (
            <strong className="text-foreground/80 font-semibold">{email}</strong>
          ) : (
            "your email address"
          )}
          . Click the link inside to activate your account.
        </p>
      </div>

      {/* Resend success */}
      {resendSuccess && (
        <div className="flex items-center gap-space-3 bg-state-success-bg border border-state-success-text/20 text-state-success-text px-space-4 py-space-3 radius-xl animate-fade-in">
          <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="text-caption font-semibold">A new verification link has been sent.</span>
        </div>
      )}

      {/* Dev Mode Bypass */}
      {devToken && (
        <div className="mt-space-4 p-space-4 bg-state-warning-bg border border-state-warning-text/20 radius-lg text-center">
          <p className="text-caption font-semibold text-state-warning-text mb-space-2">
            Since you are testing locally without SMTP credentials configured, here is your auto-generated link:
          </p>
          <Link href={`/verify-email?token=${devToken}`} className="text-body-sm font-semibold text-primary underline">
            Click here to verify your account
          </Link>
        </div>
      )}

      <AuthErrorBanner message={errorMsg} />

      <div className="flex flex-col gap-space-3">
        <Button
          onClick={handleResend}
          variant="outline"
          disabled={resending || resendSuccess}
          data-loading={resending}
          className="w-full"
        >
          {resending ? (
            <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Resending…</>
          ) : (
            <>Resend verification email</>
          )}
        </Button>
        <Link
          href="/sign-in"
          className="text-center text-caption font-semibold text-primary hover:text-primary-light transition-colors"
        >
          ← Back to sign in
        </Link>
      </div>

      <p className="text-center text-caption text-foreground/30">
        Check your spam folder if you don&apos;t see it within a few minutes.
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthLayout>
      <div className="space-y-space-8">
        <AuthHeader
          heading="Verify your email."
          subheading="One last step before you access your workspace."
        />
        <React.Suspense
          fallback={
            <div className="flex items-center justify-center py-space-12">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            </div>
          }
        >
          <VerifyEmailContent />
        </React.Suspense>
      </div>
    </AuthLayout>
  );
}
