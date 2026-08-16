"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Mail,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { Label } from "@/components/shared/label";
import { Logo } from "@/components/shared/logo";
import { AuthSocialButtons } from "@/components/auth/auth-social-buttons";
import { useToast } from "@/components/shared/toast";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthErrorBanner } from "@/components/auth/auth-error-banner";
import { AuthFieldError } from "@/components/auth/auth-error-banner";
import { PasswordStrength } from "@/components/auth/password-strength";
import { cn } from "@/components/shared/utils";
import {
  loginAction,
  registerAction,
  forgotPasswordAction,
  resetPasswordAction,
} from "@/server/actions/auth";
import { analyzePasswordStrength } from "@/lib/auth/security-checks";

// ── Shared field wrapper ──────────────────────────────────────────────────
function Field({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-space-1.5", className)}>{children}</div>
  );
}

// ── Password show / hide toggle ───────────────────────────────────────────
function PasswordToggle({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? "Hide password" : "Show password"}
      className={cn(
        "absolute right-space-3 top-1/2 -translate-y-1/2",
        "text-foreground/30 hover:text-foreground/60",
        "transition-colors duration-fast",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded"
      )}
    >
      {visible ? (
        <EyeOff className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Eye className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}

// ── Custom animated checkbox ──────────────────────────────────────────────
function Checkbox({
  id,
  checked,
  onChange,
  disabled,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: React.ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-center gap-space-2.5 cursor-pointer select-none group",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <div
        className={cn(
          "relative flex h-4 w-4 shrink-0 items-center justify-center",
          "radius-sm border transition-all duration-fast",
          checked
            ? "bg-primary border-primary"
            : "bg-transparent border-border-default group-hover:border-primary/50"
        )}
        aria-hidden="true"
      >
        {checked && (
          <svg
            viewBox="0 0 10 8"
            className="h-2.5 w-2.5 animate-scale-in"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="1 4 4 7 9 1" className="text-background" />
          </svg>
        )}
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
      </div>
      <span className="text-caption text-foreground/55 leading-snug">
        {label}
      </span>
    </label>
  );
}

// ── Email validation indicator ────────────────────────────────────────────
function EmailIndicator({
  checking,
  valid,
  invalid,
}: {
  checking: boolean;
  valid: boolean;
  invalid: boolean;
}) {
  if (checking) {
    return (
      <Loader2
        className="absolute right-space-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30 animate-spin pointer-events-none"
        aria-hidden="true"
      />
    );
  }
  if (valid) {
    return (
      <CheckCircle2
        className="absolute right-space-3 top-1/2 -translate-y-1/2 h-4 w-4 text-state-success-text pointer-events-none animate-scale-in"
        aria-hidden="true"
      />
    );
  }
  if (invalid) {
    return (
      <XCircle
        className="absolute right-space-3 top-1/2 -translate-y-1/2 h-4 w-4 text-state-error-text pointer-events-none animate-scale-in"
        aria-hidden="true"
      />
    );
  }
  return null;
}

// ── Email format check ────────────────────────────────────────────────────
const isEmailFormat = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

// ────────────────────────────────────────────────────────────────────────────
// AUTH HEADER
// ────────────────────────────────────────────────────────────────────────────
export function AuthHeader({
  heading,
  subheading,
}: {
  heading: string;
  subheading: string;
}) {
  return (
    <div
      className="space-y-space-8 animate-fade-up"
      style={{ animationDelay: "0ms", animationFillMode: "both" }}
    >
      {/* Logo — left aligned, linked home */}
      <Link
        href="/"
        aria-label="Go to Operator home"
        className="inline-block transition-opacity duration-fast hover:opacity-70 lg:hidden"
      >
        <Logo />
      </Link>

      {/* Headline block */}
      <div className="space-y-space-2">
        <h1 className="text-heading-lg font-semibold tracking-tight text-foreground leading-heading">
          {heading}
        </h1>
        <p className="text-body-sm text-foreground/45 leading-body">
          {subheading}
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// SIGN IN FORM  — ground-up redesign with full micro-interactions
// ────────────────────────────────────────────────────────────────────────────
export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const toast = useToast();

  const handleGoogleClick = () => {
    toast.info("Google Authentication", "Google sign-in is currently not active in this environment.");
  };

  const handleAppleClick = () => {
    toast.info("Apple Authentication", "Apple sign-in is currently not active in this environment.");
  };

  const [email, setEmail] = React.useState(initialEmail);
  const [password, setPassword] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(true);
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [userNotFound, setUserNotFound] = React.useState(false);

  // Email validation state
  const [emailTouched, setEmailTouched] = React.useState(false);
  const emailFormatOk = emailTouched && isEmailFormat(email);
  const emailFormatBad = emailTouched && email.length > 0 && !isEmailFormat(email);

  // Shake the form on error
  const [shake, setShake] = React.useState(false);
  React.useEffect(() => {
    if (errorMsg) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 400);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setUserNotFound(false);

    if (!email || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginAction({ email, password, rememberMe });
      if (result.success) {
        setIsSuccess(true);
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 600);
      } else {
        setErrorMsg(result.error || "Invalid email or password.");
        if (result.code === "USER_NOT_FOUND") setUserNotFound(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const result = await loginAction({ email: demoEmail, password: demoPass, rememberMe: true });
      if (result.success) {
        setIsSuccess(true);
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 500);
      } else {
        setErrorMsg(result.error || "Login failed.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn(
        "space-y-space-6 animate-fade-up",
        shake && "animate-error-shake"
      )}
      style={{ animationDelay: "80ms", animationFillMode: "both" }}
    >
      {/* ── 1-Click Quick Demo Login ──────────────────────────────────── */}
      <div className="p-space-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-space-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wider uppercase text-primary flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            1-Click Demo Login
          </span>
          <span className="text-[10px] text-muted-foreground">password: password123</span>
        </div>
        <div className="grid grid-cols-2 gap-space-2">
          <button
            type="button"
            disabled={isLoading || isSuccess}
            onClick={() => handleDemoLogin("admin@operator.ai", "password123")}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-background border border-border shadow-2xs hover:border-primary/50 hover:bg-primary/5 transition-all text-foreground cursor-pointer disabled:opacity-50"
          >
            <span>👤 Admin</span>
          </button>
          <button
            type="button"
            disabled={isLoading || isSuccess}
            onClick={() => handleDemoLogin("demo@example.com", "password123")}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-background border border-border shadow-2xs hover:border-primary/50 hover:bg-primary/5 transition-all text-foreground cursor-pointer disabled:opacity-50"
          >
            <span>👔 Manager</span>
          </button>
        </div>
      </div>

      <AuthDivider label="Or sign in with email" />

      {/* ── Error banner ─────────────────────────────────────────────── */}
      <AuthErrorBanner
        message={errorMsg}
        action={
          userNotFound ? (
            <Link
              href={`/sign-up?email=${encodeURIComponent(email)}`}
              className="font-semibold text-primary underline hover:opacity-80 transition-opacity"
            >
              Create an account instead →
            </Link>
          ) : null
        }
      />

      {/* ── Form fields ──────────────────────────────────────────────── */}
      <div className="space-y-space-4">
        {/* Email */}
        <Field>
          <Label htmlFor="signin-email">Email address</Label>
          <div className="relative">
            <Mail
              className="absolute left-space-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30 pointer-events-none"
              aria-hidden="true"
            />
            <Input
              id="signin-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              placeholder="name@company.com"
              disabled={isLoading || isSuccess}
              error={emailFormatBad}
              success={emailFormatOk}
              className="pl-space-10 pr-space-10"
              aria-invalid={emailFormatBad}
            />
            <EmailIndicator
              checking={false}
              valid={emailFormatOk}
              invalid={emailFormatBad}
            />
          </div>
        </Field>

        {/* Password */}
        <Field>
          <div className="flex items-center justify-between">
            <Label htmlFor="signin-password">Password</Label>
            <Link
              href="/forgot-password"
              tabIndex={0}
              className="text-caption font-semibold text-primary hover:opacity-70 transition-opacity"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock
              className="absolute left-space-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30 pointer-events-none"
              aria-hidden="true"
            />
            <Input
              id="signin-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading || isSuccess}
              className="pl-space-10 pr-space-10"
            />
            <PasswordToggle
              visible={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
            />
          </div>
        </Field>

        {/* Remember me */}
        <Checkbox
          id="signin-remember"
          checked={rememberMe}
          onChange={setRememberMe}
          disabled={isLoading || isSuccess}
          label="Remember me for 30 days"
        />
      </div>

      {/* ── Submit ───────────────────────────────────────────────────── */}
      <Button
        type="submit"
        loading={isLoading}
        disabled={isLoading || isSuccess}
        shape="pill"
        size="lg"
        className={cn(
          "w-full transition-all duration-base",
          isSuccess &&
            "bg-state-success-bg border-state-success-text/20 text-state-success-text"
        )}
      >
        {isSuccess ? (
          <span className="flex items-center gap-space-2 animate-scale-in">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Signed in
          </span>
        ) : !isLoading ? (
          <>
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </>
        ) : null}
      </Button>

      {/* ── Footer link ──────────────────────────────────────────────── */}
      <p className="text-center text-caption text-foreground/40 mt-space-4">
        New to Operator?{" "}
        <Link
          href="/sign-up"
          className="font-semibold text-primary hover:underline hover:opacity-80 transition-opacity"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// SIGN UP FORM
// ────────────────────────────────────────────────────────────────────────────
export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const toast = useToast();

  const handleGoogleClick = () => {
    toast.info("Google Authentication", "Google sign-up is currently not active in this environment.");
  };

  const handleAppleClick = () => {
    toast.info("Apple Authentication", "Apple sign-up is currently not active in this environment.");
  };

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState(initialEmail);
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [acceptTerms, setAcceptTerms] = React.useState(true);
  const [acceptPrivacy, setAcceptPrivacy] = React.useState(true);
  const [marketingConsent, setMarketingConsent] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [passwordFocused, setPasswordFocused] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Live email validation
  const [emailChecking, setEmailChecking] = React.useState(false);
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [emailRegistered, setEmailRegistered] = React.useState(false);

  const strength = React.useMemo(
    () => analyzePasswordStrength(password, email, firstName, lastName),
    [password, email, firstName, lastName]
  );

  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  // Debounced email check
  React.useEffect(() => {
    if (!email || !email.includes("@") || !email.includes(".")) {
      setEmailError(null);
      setEmailRegistered(false);
      return;
    }
    setEmailChecking(true);
    const h = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/check-email?email=${encodeURIComponent(email)}`
        );
        if (!res.ok) return;
        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) return;
        const data = await res.json();
        if (data.registered) {
          setEmailError("This email is already registered.");
          setEmailRegistered(true);
        } else if (data.reserved) {
          setEmailError("This email prefix is reserved.");
          setEmailRegistered(false);
        } else if (data.disposable) {
          setEmailError("Temporary addresses are not allowed.");
          setEmailRegistered(false);
        } else {
          setEmailError(null);
          setEmailRegistered(false);
        }
      } catch {
        // Fail silently
      } finally {
        setEmailChecking(false);
      }
    }, 500);
    return () => clearTimeout(h);
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!firstName || !lastName || !email || !password) {
      setErrorMsg("All fields are required.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (!acceptTerms || !acceptPrivacy) {
      setErrorMsg(
        "Please accept the Terms of Service and Privacy Policy."
      );
      return;
    }
    if (emailError) {
      setErrorMsg(emailError);
      return;
    }
    if (strength.score < 4) {
      setErrorMsg("Please choose a stronger password.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerAction({
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email,
        password,
        acceptTerms,
        acceptPrivacy,
        marketingConsent,
      });
      if (result.success) {
        if (result.requiresVerification) {
          const devParams = result.devToken ? `&devToken=${result.devToken}` : "";
          router.push(`/verify-email?email=${encodeURIComponent(email)}${devParams}`);
        } else {
          router.push("/onboarding");
        }
        router.refresh();
      } else {
        setErrorMsg(result.error || "Failed to create account.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-space-5 animate-fade-up"
      style={{ animationDelay: "80ms", animationFillMode: "both" }}
      noValidate
    >
      {/* Social login */}
      <AuthSocialButtons
        disabled={isLoading}
        onGoogleClick={handleGoogleClick}
      />

      {/* Error banner */}
      <AuthErrorBanner
        message={errorMsg}
        action={
          emailRegistered ? (
            <Link
              href={`/sign-in?email=${encodeURIComponent(email)}`}
              className="font-semibold text-primary underline hover:opacity-80 transition-opacity"
            >
              Sign in instead →
            </Link>
          ) : null
        }
      />

      {/* Name row */}
      <div className="grid grid-cols-2 gap-space-3">
        <Field>
          <Label htmlFor="signup-firstname">First name</Label>
          <div className="relative">
            <User
              className="absolute left-space-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30 pointer-events-none"
              aria-hidden="true"
            />
            <Input
              id="signup-firstname"
              type="text"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Sarah"
              disabled={isLoading}
              className="pl-space-10"
            />
          </div>
        </Field>
        <Field>
          <Label htmlFor="signup-lastname">Last name</Label>
          <Input
            id="signup-lastname"
            type="text"
            autoComplete="family-name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Connor"
            disabled={isLoading}
          />
        </Field>
      </div>

      {/* Email */}
      <Field>
        <Label htmlFor="signup-email">Email address</Label>
        <div className="relative">
          <Mail
            className="absolute left-space-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30 pointer-events-none"
            aria-hidden="true"
          />
          {emailChecking && (
            <Loader2
              className="absolute right-space-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30 animate-spin"
              aria-hidden="true"
            />
          )}
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            disabled={isLoading}
            error={!!emailError}
            aria-describedby={emailError ? "signup-email-error" : undefined}
            className="pl-space-10 pr-space-10"
          />
        </div>
        <AuthFieldError id="signup-email-error" message={emailError} />
      </Field>

      {/* Password */}
      <Field>
        <Label htmlFor="signup-password">Password</Label>
        <div className="relative">
          <Lock
            className="absolute left-space-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30 pointer-events-none"
            aria-hidden="true"
          />
          <Input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            placeholder="••••••••"
            disabled={isLoading}
            className="pl-space-10 pr-space-10"
          />
          <PasswordToggle
            visible={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
          />
          {passwordFocused && (
            <PasswordStrength
              password={password}
              email={email}
              firstName={firstName}
              lastName={lastName}
            />
          )}
        </div>
      </Field>

      {/* Confirm password */}
      <Field>
        <Label htmlFor="signup-confirm">Confirm password</Label>
        <div className="relative">
          <Lock
            className="absolute left-space-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30 pointer-events-none"
            aria-hidden="true"
          />
          <Input
            id="signup-confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isLoading}
            error={passwordMismatch}
            success={confirmPassword.length > 0 && !passwordMismatch}
            aria-describedby={
              passwordMismatch ? "confirm-error" : undefined
            }
            className="pl-space-10 pr-space-10"
          />
          <PasswordToggle
            visible={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
          />
        </div>
        {passwordMismatch && (
          <AuthFieldError id="confirm-error" message="Passwords do not match" />
        )}
      </Field>

      {/* Submit */}
      <Button
        type="submit"
        loading={isLoading}
        disabled={
          emailChecking || !!emailError || strength.score < 4 || passwordMismatch
        }
        shape="pill"
        size="lg"
        className="w-full"
      >
        {!isLoading && (
          <>
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </Button>

      {/* ── Footer disclaimer and links ── */}
      <div className="space-y-space-4 text-center mt-space-4">
        <p className="text-[11px] text-foreground/45 leading-normal max-w-[340px] mx-auto">
          By registering, you agree to the{" "}
          <Link href="/terms" target="_blank" className="font-semibold text-primary hover:underline hover:opacity-80 transition-opacity">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" target="_blank" className="font-semibold text-primary hover:underline hover:opacity-80 transition-opacity">
            Privacy Policy
          </Link>
        </p>
        <p className="text-caption text-foreground/40">
          Already using Operator?{" "}
          <Link
            href="/sign-in"
            className="font-semibold text-primary hover:underline hover:opacity-80 transition-opacity"
          >
            Login
          </Link>
        </p>
      </div>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD FORM
// ────────────────────────────────────────────────────────────────────────────
export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const result = await forgotPasswordAction({ email });
      if (result.success) {
        setSuccess(true);
      } else {
        setErrorMsg(result.error || "Failed to send reset link.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-space-6 text-center animate-scale-in">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center radius-full bg-state-success-bg border border-state-success-text/20 animate-success">
            <CheckCircle
              className="h-7 w-7 text-state-success-text"
              aria-hidden="true"
            />
          </div>
        </div>
        <div className="space-y-space-2">
          <h2 className="text-title-lg font-semibold text-foreground">
            Check your inbox
          </h2>
          <p className="text-body-sm text-foreground/50 leading-body">
            We sent a reset link to{" "}
            <strong className="text-foreground/80 font-semibold">{email}</strong>{" "}
            if it matches our records. Check spam too.
          </p>
        </div>
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-space-1 text-caption font-semibold text-primary hover:opacity-70 transition-opacity"
        >
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-space-5 animate-fade-up"
      style={{ animationDelay: "80ms", animationFillMode: "both" }}
    >
      <AuthErrorBanner message={errorMsg} />

      <Field>
        <Label htmlFor="forgot-email">Email address</Label>
        <div className="relative">
          <Mail
            className="absolute left-space-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30 pointer-events-none"
            aria-hidden="true"
          />
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            disabled={isLoading}
            className="pl-space-10"
          />
        </div>
      </Field>

      <Button type="submit" loading={isLoading} className="w-full">
        {!isLoading && (
          <>
            Send reset link
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </Button>

      <p className="text-center text-caption text-foreground/40">
        Remember your password?{" "}
        <Link
          href="/sign-in"
          className="font-semibold text-primary hover:opacity-70 transition-opacity"
        >
          Sign in →
        </Link>
      </p>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// RESET PASSWORD FORM
// ────────────────────────────────────────────────────────────────────────────
export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [passwordFocused, setPasswordFocused] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const strength = React.useMemo(
    () => analyzePasswordStrength(password),
    [password]
  );
  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (strength.score < 4) {
      setErrorMsg("Please choose a stronger password.");
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const result = await resetPasswordAction({ token, password });
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/sign-in");
          router.refresh();
        }, 3000);
      } else {
        setErrorMsg(result.error || "Failed to reset password.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-space-6 text-center animate-scale-in">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center radius-full bg-state-success-bg border border-state-success-text/20 animate-success">
            <CheckCircle
              className="h-7 w-7 text-state-success-text"
              aria-hidden="true"
            />
          </div>
        </div>
        <div className="space-y-space-2">
          <h2 className="text-title-lg font-semibold text-foreground">
            Password updated
          </h2>
          <p className="text-body-sm text-foreground/50 leading-body">
            Your password has been changed. Redirecting to sign in…
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-space-5 animate-fade-up"
      style={{ animationDelay: "80ms", animationFillMode: "both" }}
      noValidate
    >
      <AuthErrorBanner message={errorMsg} />

      <Field>
        <Label htmlFor="reset-password">New password</Label>
        <div className="relative">
          <Lock
            className="absolute left-space-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30 pointer-events-none"
            aria-hidden="true"
          />
          <Input
            id="reset-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            placeholder="••••••••"
            disabled={isLoading}
            className="pl-space-10 pr-space-10"
          />
          <PasswordToggle
            visible={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
          />
          {passwordFocused && <PasswordStrength password={password} />}
        </div>
      </Field>

      <Field>
        <Label htmlFor="reset-confirm">Confirm new password</Label>
        <div className="relative">
          <Lock
            className="absolute left-space-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30 pointer-events-none"
            aria-hidden="true"
          />
          <Input
            id="reset-confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isLoading}
            error={passwordMismatch}
            success={confirmPassword.length > 0 && !passwordMismatch}
            className="pl-space-10 pr-space-10"
          />
          <PasswordToggle
            visible={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
          />
        </div>
        {passwordMismatch && (
          <AuthFieldError message="Passwords do not match" />
        )}
      </Field>

      <Button
        type="submit"
        loading={isLoading}
        disabled={strength.score < 4 || passwordMismatch}
        className="w-full"
      >
        {!isLoading && (
          <>
            Update password
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </Button>
    </form>
  );
}
