"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Show, useAuth } from "@/lib/auth/client";
import { UserAvatarMenu } from "@/components/shared/user-avatar-menu";
import { Logo } from "@/components/shared/logo";
import { Menu, X, Sun, Moon, ArrowRight, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/shared/button";
import { getButtonClasses } from "@/design-system/button-tokens";

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
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/70 dark:bg-black/75 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <header
        className={`fixed top-0 inset-x-0 z-50 w-full transition-all duration-300 px-3 sm:px-6 ${
          isScrolled || mobileOpen ? "pt-2 sm:pt-3" : "pt-3 sm:pt-5"
        }`}
      >
        <div
          className={`mx-auto max-w-5xl transition-all duration-300 ${
            mobileOpen
              ? "bg-card/98 dark:bg-[#0c101d]/98 backdrop-blur-2xl border border-border shadow-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-5"
              : isScrolled
              ? "bg-card/85 backdrop-blur-md border border-border-muted shadow-sm rounded-full px-4 sm:px-6"
              : "bg-transparent border border-transparent rounded-full px-4 sm:px-6"
          }`}
        >
          {/* Top Bar inside Nav */}
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
              <Button
                variant="ghost"
                size="icon"
                shape="circle"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                aria-label="Toggle theme"
              >
                {mounted && resolvedTheme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>

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

            {/* Mobile & Tablet Toggle Button (< 1024px) */}
            <div className="flex lg:hidden items-center gap-2">
              {/* Theme toggle directly in header for quick access */}
              <Button
                variant="ghost"
                size="icon"
                shape="circle"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                aria-label="Toggle theme"
              >
                {mounted && resolvedTheme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>

              {/* Hamburger / Close Icon */}
              <Button
                variant="ghost"
                size="icon"
                shape="circle"
                className="h-10 w-10 text-foreground hover:bg-muted/40 transition-colors"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? "Close menu" : "Open navigation menu"}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile & Tablet Dropdown Content (< 1024px) */}
          {mobileOpen && (
            <div className="lg:hidden border-t border-border/80 pt-4 mt-2 space-y-3 max-h-[calc(100dvh-5.5rem)] overflow-y-auto overscroll-contain pr-1">
              {/* Primary Navigation Links */}
              <div className="space-y-1">
                {NAV_LINKS.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-body-sm transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-foreground/90 hover:text-foreground hover:bg-muted/50 font-medium"
                      }`}
                    >
                      <span>{item.label}</span>
                      <ChevronRight className="h-4 w-4 opacity-40" />
                    </Link>
                  );
                })}
              </div>

              {/* Extra Mobile Links */}
              <div className="space-y-1 border-t border-border/60 pt-2">
                {MOBILE_EXTRA_LINKS.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-body-sm transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium"
                      }`}
                    >
                      <span>{item.label}</span>
                      <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                    </Link>
                  );
                })}
              </div>

              {/* Theme Switcher Banner inside menu */}
              <div className="border-t border-border/60 pt-3">
                <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-muted/30 border border-border/50">
                  <span className="text-caption font-medium text-muted-foreground">Appearance</span>
                  <button
                    type="button"
                    onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-caption font-semibold bg-background border border-border shadow-2xs hover:bg-muted transition-colors cursor-pointer"
                  >
                    {mounted && resolvedTheme === "dark" ? (
                      <>
                        <Sun className="h-3.5 w-3.5 text-amber-500" /> Light mode
                      </>
                    ) : (
                      <>
                        <Moon className="h-3.5 w-3.5 text-indigo-500" /> Dark mode
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Call-to-Actions for Mobile */}
              <div className="border-t border-border/60 pt-3 flex flex-col gap-2 pb-1">
                <Show when="signed-out">
                  <Link
                    href="/sign-in"
                    onClick={() => setMobileOpen(false)}
                    className={getButtonClasses(
                      "primary",
                      "filled",
                      "medium",
                      "w-full text-center flex items-center justify-center gap-2 py-3 rounded-xl font-semibold shadow-sm"
                    )}
                  >
                    <Sparkles className="h-4 w-4" />
                    Get started free
                  </Link>
                  <Button asChild variant="outline" size="md" className="w-full">
                    <Link href="/demo" onClick={() => setMobileOpen(false)} className="flex items-center justify-center gap-1.5">
                      Watch live demo
                    </Link>
                  </Button>
                </Show>

                <Show when="signed-in">
                  {user?.onboardingCompleted ? (
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="block px-4 py-3 text-body-sm font-semibold text-center text-primary-foreground bg-primary rounded-xl shadow-sm hover:bg-primary/90 transition-colors"
                    >
                      Open Dashboard →
                    </Link>
                  ) : (
                    <Link
                      href="/onboarding"
                      onClick={() => setMobileOpen(false)}
                      className="block px-4 py-3 text-body-sm font-semibold text-center text-primary border border-primary/25 bg-primary/10 rounded-xl hover:bg-primary/15 transition-colors"
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
          )}
        </div>
      </header>
    </>
  );
}
