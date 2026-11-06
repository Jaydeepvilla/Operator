"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Show, useAuth } from "@/lib/auth/client";
import { UserAvatarMenu } from "@/components/shared/user-avatar-menu";
import { Logo } from "@/components/shared/logo";
import { Menu, X, Sun, Moon, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/shared/button";

const NAV_LINKS = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Integrations", href: "/integrations" },
  { label: "Docs", href: "/docs" },
  { label: "Changelog", href: "/changelog" },
];

const MOBILE_EXTRA_LINKS = [
  { label: "Interactive Demo", href: "/demo" },
  { label: "Contact & Support", href: "/contact" },
];

export function MarketingNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll and handle Escape key when mobile menu is open
  useEffect(() => {
    if (!mobileOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  return (
    <>
      {/* ── Fixed Desktop & Mobile Top Bar ── */}
      <header
        className={`fixed top-0 inset-x-0 z-40 w-full transition-all duration-300 px-3 sm:px-6 ${
          isScrolled ? "pt-2 sm:pt-3" : "pt-3 sm:pt-5"
        }`}
      >
        <div
          className={`mx-auto max-w-5xl transition-all duration-300 ${
            isScrolled
              ? "bg-card/85 backdrop-blur-md border border-border-muted shadow-sm rounded-full px-4 sm:px-6"
              : "bg-transparent border border-transparent rounded-full px-4 sm:px-6"
          }`}
        >
          <div className="flex h-12 sm:h-14 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="shrink-0 flex items-center gap-2">
              <Logo />
            </Link>

            {/* Desktop Navigation (>= 1024px) */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 xl:px-4 xl:py-2 rounded-full text-body-sm transition-all ${
                    pathname === item.href
                      ? "text-primary bg-primary/10 font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--foreground)/0.04)]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Desktop Right Actions (>= 1024px) */}
            <div className="hidden lg:flex items-center gap-2">
              {/* Theme toggle */}
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
                aria-label="Toggle theme"
              >
                {mounted && resolvedTheme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>

              {/* Auth Controls */}
              <Show when="signed-out">
                <Button asChild size="sm">
                  <Link href="/sign-in" className="flex items-center gap-1.5 font-medium">
                    Get started <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </Show>

              <Show when="signed-in">
                {user?.onboardingCompleted ? (
                  <Link
                    href="/dashboard"
                    className="text-body-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/onboarding"
                    className="text-body-sm font-semibold text-primary hover:text-primary/80 transition-colors px-3 py-1.5 flex items-center gap-1"
                  >
                    Continue Setup <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
                <UserAvatarMenu avatarClass="h-8 w-8" />
              </Show>
            </div>

            {/* Mobile & Tablet Toggle Controls (< 1024px) */}
            <div className="flex lg:hidden items-center gap-1 sm:gap-2">
              {/* Theme toggle directly in header */}
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="h-10 w-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
                aria-label="Toggle theme"
              >
                {mounted && resolvedTheme === "dark" ? (
                  <Sun className="h-4 w-4 text-amber-500" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>

              {/* Native, reliable Hamburger Button (44x44px minimum touch target) */}
              <button
                type="button"
                className="h-10 w-10 rounded-full flex items-center justify-center text-foreground hover:bg-muted/40 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation menu"
                aria-expanded={mobileOpen}
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Fullscreen Mobile Drawer (< 1024px) ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex flex-col bg-background/98 dark:bg-[#080d19]/98 backdrop-blur-3xl animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Top Bar inside Drawer */}
          <div className="flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6 border-b border-border/70 shrink-0">
            <Link href="/" onClick={() => setMobileOpen(false)} className="shrink-0 flex items-center gap-2">
              <Logo />
            </Link>

            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="h-10 w-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
                aria-label="Toggle theme"
              >
                {mounted && resolvedTheme === "dark" ? (
                  <Sun className="h-4 w-4 text-amber-500" />
                ) : (
                  <Moon className="h-4 w-4 text-indigo-400" />
                )}
              </button>

              {/* Explicit, high-contrast Close (X) button */}
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="h-10 w-10 rounded-full flex items-center justify-center text-foreground hover:bg-muted/50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Close navigation menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Scrollable Nav Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 overscroll-contain">
            {/* Primary Navigation Links */}
            <div className="space-y-1">
              <p className="px-4 text-caption uppercase tracking-wider font-semibold text-muted-foreground/70 mb-1">
                Navigation
              </p>
              {NAV_LINKS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-4 py-3 rounded-xl text-base transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground/90 hover:text-foreground hover:bg-muted/50 font-medium active:bg-muted/70"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Extra Mobile Links */}
            <div className="space-y-1 border-t border-border/60 pt-4">
              <p className="px-4 text-caption uppercase tracking-wider font-semibold text-muted-foreground/70 mb-1">
                Explore
              </p>
              {MOBILE_EXTRA_LINKS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-4 py-2.5 rounded-xl text-sm transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium active:bg-muted/70"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Appearance Toggle Card */}
            <div className="border-t border-border/60 pt-4">
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 border border-border/50">
                <span className="text-sm font-medium text-muted-foreground">Appearance</span>
                <button
                  type="button"
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-caption font-semibold bg-background border border-border shadow-xs hover:bg-muted transition-colors cursor-pointer"
                >
                  {mounted && resolvedTheme === "dark" ? (
                    <>
                      <Sun className="h-3.5 w-3.5 text-amber-500" /> Light mode
                    </>
                  ) : (
                    <>
                      <Moon className="h-3.5 w-3.5 text-indigo-400" /> Dark mode
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Call-to-Actions for Mobile */}
            <div className="border-t border-border/60 pt-4 flex flex-col gap-3 pb-8">
              <Show when="signed-out">
                <Link
                  href="/sign-in"
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-center flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:scale-[0.98] transition-all"
                >
                  <Sparkles className="h-4 w-4" />
                  Get started free
                </Link>
                <Link
                  href="/demo"
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-center flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium border border-border hover:bg-muted/50 active:scale-[0.98] transition-all text-foreground"
                >
                  Watch live demo
                </Link>
              </Show>

              <Show when="signed-in">
                {user?.onboardingCompleted ? (
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3.5 text-sm font-semibold text-center text-primary-foreground bg-primary rounded-xl shadow-md hover:bg-primary/90 transition-colors"
                  >
                    Open Dashboard →
                  </Link>
                ) : (
                  <Link
                    href="/onboarding"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3.5 text-sm font-semibold text-center text-primary border border-primary/25 bg-primary/10 rounded-xl hover:bg-primary/15 transition-colors"
                  >
                    Complete Setup →
                  </Link>
                )}
                <div className="flex items-center justify-center pt-2">
                  <UserAvatarMenu />
                </div>
              </Show>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
