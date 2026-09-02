import * as React from "react";
import Link from "next/link";
import { AuthFooter } from "./auth-footer";
import { Logo } from "@/components/shared/logo";

interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * AuthLayout — Full-width centered form
 *
 * No showcase panel. Form is perfectly centered horizontally
 * and vertically within the full viewport. Logo pinned top-left.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div
      className="flex min-h-screen w-full flex-col bg-background"
      style={{
        /* Force light-mode tokens regardless of ThemeProvider on <html> */
        "--background": "250 20% 99%",
        "--foreground": "222 47% 8%",
        "--card": "250 15% 98%",
        "--card-foreground": "222 47% 8%",
        "--primary": "250 75% 52%",
        "--primary-light": "250 75% 58%",
        "--primary-foreground": "0 0% 100%",
        "--border": "250 12% 91%",
        "--input": "250 12% 91%",
        "--border-subtle": "250 12% 94%",
        "--border-default": "250 12% 88%",
        "--border-strong": "250 12% 82%",
        "--border-hover": "250 12% 76%",
        "--border-active": "250 75% 52%",
        "--border-muted": "250 12% 91%",
        "--bg-layer-0": "250 20% 99%",
        "--bg-layer-1": "0 0% 100%",
        "--bg-layer-2": "250 12% 95%",
        "--state-success-text": "154 75% 24%",
        "--state-success-bg": "147 79% 96%",
        "--state-error-text": "3 76% 40%",
        "--state-error-bg": "6 100% 97%",
        "--state-warning-text": "21 90% 37%",
        "--state-warning-bg": "33 100% 96%",
      } as React.CSSProperties}
    >
      {/* Subtle ambient orb */}
      <div
        className="pointer-events-none fixed -top-32 -right-32 h-96 w-96 rounded-full mesh-glow opacity-20 animate-pulse-soft"
        style={{ animationDuration: "8s" }}
        aria-hidden="true"
      />

      {/* Pinned brand logo — top-left */}
      <div className="absolute top-8 left-10 z-20">
        <Link
          href="/"
          aria-label="Return to Operator homepage"
          className="group inline-flex items-center transition-all duration-200 hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-lg"
        >
          <Logo
            iconClassName="text-primary h-6 w-6 transition-transform duration-200 group-hover:scale-105"
            className="gap-2 text-foreground font-black text-lg"
          />
        </Link>
      </div>

      {/* Form — full width, centered horizontally + vertically */}
      <main
        className="relative z-10 flex flex-1 flex-col items-center justify-center px-space-6 py-space-16"
        id="auth-form-panel"
      >
        <div className="w-full max-w-[420px]">
          {children}
        </div>
      </main>

      <AuthFooter className="relative z-10" />
    </div>
  );
}
