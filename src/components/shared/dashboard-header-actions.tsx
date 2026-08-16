"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { UserAvatarMenu } from "./user-avatar-menu";
import { useAuth } from "@/lib/auth/client";
import { Bell, Sun, Moon, Search, Sparkles, Radio } from "lucide-react";
import { Button } from "./button";
import { NotificationsDropdown } from "./notifications-dropdown";

interface DashboardHeaderActionsProps {
  roleLabel: string;
  orgName?: string;
  orgIndustry?: string | null;
  initialNotifications?: any[];
}

export function DashboardHeaderActions({ 
  roleLabel, 
  orgName, 
  orgIndustry, 
  initialNotifications = [] 
}: DashboardHeaderActionsProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const { user, isLoading } = useAuth();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* ── AI Operational Status Pill ──────────────────────────────── */}
      <Link
        href="/channels"
        className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 hover:border-emerald-500/30 transition-all duration-200 group cursor-pointer"
        title="Operator AI is online and auto-answering customer inquiries across Voice, WhatsApp, and Web"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 group-hover:underline">
          Operator AI Active (24/7)
        </span>
        <Radio className="h-3 w-3 text-emerald-500/70 shrink-0 ml-0.5" />
      </Link>

      {/* ── Quick Search / Command Palette Trigger ───────────────────── */}
      <Link
        href="/inbox"
        className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground bg-accent/40 hover:bg-accent hover:text-foreground border border-border/60 rounded-full transition-all duration-150 cursor-pointer shadow-2xs select-none"
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground/70" />
        <span className="hidden xl:inline">Search contacts, leads, calls...</span>
        <span className="xl:hidden">Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono bg-background/80 px-1.5 py-0.5 rounded border border-border/80 text-muted-foreground/80 shadow-2xs">
          ⌘K
        </kbd>
      </Link>

      <div className="h-4 w-px bg-border/60 hidden sm:block" />

      {/* ── Notifications Center ─────────────────────────────────────── */}
      <NotificationsDropdown initialNotifications={initialNotifications} />

      {/* ── Theme Switcher ──────────────────────────────────────────── */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/60 rounded-full transition-colors cursor-pointer" 
        onClick={toggleTheme} 
        aria-label="Toggle theme"
      >
        {mounted && resolvedTheme === "dark" ? (
          <Sun className="h-4 w-4 text-amber-400 transition-transform rotate-0 hover:rotate-45 duration-300" />
        ) : (
          <Moon className="h-4 w-4 text-slate-700 transition-transform rotate-0 hover:-rotate-12 duration-300" />
        )}
      </Button>

      <div className="h-4 w-px bg-border/60 hidden sm:block" />

      {/* ── Smart User Menu Pill ────────────────────────────────────── */}
      <UserAvatarMenu 
        variant="pill"
        roleLabel={roleLabel}
        orgName={orgName}
      />
    </div>
  );
}
