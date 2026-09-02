"use client";

import * as React from "react";
import { cn } from "@/components/shared/utils";

// ── Google "G" logo ───────────────────────────────────────────────────────
function GoogleIcon({ className }: { className?: string }) {
 return (
 <svg
 className={className}
 viewBox="0 0 24 24"
 aria-hidden="true"
 role="img"
 >
 <path
 d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
 fill="#4285F4"
 />
 <path
 d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
 fill="#34A853"
 />
 <path
 d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
 fill="#FBBC05"
 />
 <path
 d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
 fill="#EA4335"
 />
 </svg>
 );
}

// ── Apple logo ────────────────────────────────────────────────────────────
function AppleIcon({ className }: { className?: string }) {
 return (
 <svg
 className={className}
 viewBox="0 0 814 1000"
 aria-hidden="true"
 role="img"
 fill="currentColor"
 >
 <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.3-164-39.3c-76.5 0-103.7 40.8-165.9 40.8s-105-43.4-150.3-109.2c-52.1-73.2-96.1-185.2-96.1-291.3 0-192.3 125.4-294.1 248.4-294.1 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
 </svg>
 );
}

// ── Individual social button ──────────────────────────────────────────────
interface SocialButtonProps
 extends React.ButtonHTMLAttributes<HTMLButtonElement> {
 provider: "google" | "apple";
 isLoading?: boolean;
}

export function SocialButton({
 provider,
 isLoading = false,
 className,
 onClick,
 ...props
}: SocialButtonProps) {
 const config = {
 google: {
 Icon: GoogleIcon,
 label: "Continue with Google",
 iconClass: "h-[18px] w-[18px]",
 href: "/api/auth/login/google",
 },
 apple: {
 Icon: AppleIcon,
 label: "Continue with Apple",
 iconClass: "h-[17px] w-[17px]",
 href: undefined,
 },
 };

 const { Icon, label, iconClass, href } = config[provider];

 const buttonClasses = cn(
 // Layout
 "relative flex w-full items-center justify-center gap-space-3 cursor-pointer",
 // Size
 "h-space-10 px-space-4",
 // Type
 "text-body-sm font-semibold tracking-tight text-foreground no-underline",
 // Surface
 "bg-bg-layer-1 border-border-default radius-full",
 // Hover — lift + border brightens
 "hover:-translate-y-px hover:bg-foreground/[0.03] hover:border-border-hover",
 // Active — press down
 "active:scale-[0.98] active:translate-y-0",
 // Motion
 "transition-all duration-fast",
 // Focus ring
 "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
 // Disabled
 "disabled:opacity-50 disabled:pointer-events-none",
 className
 );

 if (href && !onClick) {
 return (
 <a
 href={href}
 aria-label={label}
 className={buttonClasses}
 >
 {isLoading ? (
 <div
 className="h-4 w-4 rounded-full border-foreground/20 border-t-foreground/60 animate-spin"
 aria-hidden="true"
 />
 ) : (
 <Icon className={cn("shrink-0", iconClass)} />
 )}
 <span>{label}</span>
 </a>
 );
 }

 return (
 <button
 type="button"
 disabled={isLoading}
 aria-label={label}
 onClick={onClick || (() => { if (href) window.location.href = href; })}
 className={buttonClasses}
 {...props}
 >
 {isLoading ? (
 <div
 className="h-4 w-4 rounded-full border-foreground/20 border-t-foreground/60 animate-spin"
 aria-hidden="true"
 />
 ) : (
 <Icon className={cn("shrink-0", iconClass)} />
 )}
 <span>{label}</span>
 </button>
 );
}

// ── Pair of social buttons ────────────────────────────────────────────────
interface AuthSocialButtonsProps {
 onGoogleClick?: () => void;
 isLoading?: boolean;
 /** Legacy: keeps API compatible with pages that pass `disabled` */
 disabled?: boolean;
}

export function AuthSocialButtons({
 onGoogleClick,
 isLoading,
 disabled,
}: AuthSocialButtonsProps) {
 return (
 <div className="space-y-space-3">
 <SocialButton
 provider="google"
        onClick={onGoogleClick}
        isLoading={isLoading}
        disabled={disabled || isLoading}
      />
    </div>
  );
}
