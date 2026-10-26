"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Loader2, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/shared/button";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthHeader } from "@/components/shared/auth-forms";
import { AuthErrorBanner } from "@/components/auth/auth-error-banner";
import { cn } from "@/components/shared/utils";
import { Input } from "@/components/shared/input";

// ── OTP digit input ─────────────────────────────────────────────────────────
function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const digits = 6;
  const refs = React.useRef<Array<HTMLInputElement | null>>([]);
  const chars = value.split("").slice(0, digits);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (chars[i]) {
        const next = [...chars];
        next[i] = "";
        onChange(next.join(""));
      } else if (i > 0) {
        refs.current[i - 1]?.focus();
      }
    }
  };

  const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return;
    const next = [...chars];
    // Handle paste
    if (raw.length > 1) {
      const pasted = raw.slice(0, digits - i);
      pasted.split("").forEach((ch, j) => {
        if (i + j < digits) next[i + j] = ch;
      });
      onChange(next.join(""));
      refs.current[Math.min(i + pasted.length, digits - 1)]?.focus();
      return;
    }
    next[i] = raw[0];
    onChange(next.join(""));
    if (i < digits - 1) refs.current[i + 1]?.focus();
  };

  return (
    <div className="flex items-center justify-center gap-space-2" role="group" aria-label="One-time password input">
      {Array.from({ length: digits }).map((_, i) => (
        <Input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]"
          maxLength={1}
          value={chars[i] ?? ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of ${digits}`}
          className={cn(
            "h-12 w-10 text-center text-title-md font-semibold tracking-tight",
            "radius-lg border border-border-default bg-bg-layer-1",
            "text-foreground placeholder-transparent",
            "transition-all duration-fast",
            "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            chars[i] ? "border-primary/40 bg-primary/5" : ""
          )}
        />
      ))}
    </div>
  );
}

export default function TwoFactorPage() {
  const router = useRouter();
  const [otp, setOtp] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [resending, setResending] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(0);

  // Cooldown timer for resend
  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setErrorMsg("Please enter the full 6-digit code.");
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);

    // Placeholder — wire to real 2FA verification action when implemented
    await new Promise((r) => setTimeout(r, 1200));
    setErrorMsg("Two-factor authentication is not yet configured for this workspace.");
    setIsLoading(false);
  };

  const handleResend = async () => {
    setResending(true);
    // Placeholder — wire to real resend action
    await new Promise((r) => setTimeout(r, 800));
    setResending(false);
    setResendCooldown(60);
  };

  return (
    <AuthLayout>
      <div className="space-y-space-8">
        <AuthHeader
          heading="Two-factor authentication."
          subheading="Enter the 6-digit code from your authenticator app or SMS."
        />

        <form
          onSubmit={handleSubmit}
          className="space-y-space-6 animate-fade-up"
          style={{ animationDelay: "80ms", animationFillMode: "both" }}
          noValidate
        >
          {/* Icon */}
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center radius-full bg-primary/10 border border-primary/20">
              <Shield className="h-7 w-7 text-primary" aria-hidden="true" />
            </div>
          </div>

          <AuthErrorBanner message={errorMsg} />

          {/* OTP input */}
          <OtpInput value={otp} onChange={setOtp} disabled={isLoading} />

          {/* Submit */}
          <Button
            type="submit"
            disabled={isLoading || otp.length < 6}
            data-loading={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Verifying…</>
            ) : (
              <>Verify code <ArrowRight className="h-4 w-4" aria-hidden="true" /></>
            )}
          </Button>

          {/* Resend */}
          <div className="flex items-center justify-center gap-space-2">
            <Button
              type="button"
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
              className={cn(
                "inline-flex items-center gap-space-1 text-caption font-semibold transition-colors",
                resendCooldown > 0 || resending
                  ? "text-foreground/30 cursor-not-allowed"
                  : "text-primary hover:text-primary-light"
              )}
            >
              {resending ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
              )}
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
            </Button>
          </div>

          <p className="text-center text-caption text-foreground/40">
            Having trouble?{" "}
            <Link href="/sign-in" className="font-semibold text-primary hover:text-primary-light transition-colors">
              Sign in with another method
            </Link>
          </p>
        </form>
      </div>
    </AuthLayout>
  );
}
