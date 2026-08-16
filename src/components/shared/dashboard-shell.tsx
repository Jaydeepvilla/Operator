"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
import { UserAvatarMenu } from "./user-avatar-menu";
import {
  Bot,
  Menu,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/shared/sheet";
import { SidebarNavGroup } from "@/components/shared/sidebar-nav";
import { useSidebar } from "@/components/shared/sidebar-context";
import { cn } from "@/components/shared/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { m, AnimatePresence } from "framer-motion";
import { pageTransition } from "@/components/motion";

import { getButtonClasses } from '@/design-system/button-tokens';

// ─── Sidebar Section Definitions ─────────────────────────────────────────────
// 4 clear groups that map to how business owners think.

const HOME_LINKS = [
  { href: "/dashboard", icon: "LayoutDashboard" as const, label: "Dashboard" },
  { href: "/intelligence", icon: "Brain" as const, label: "Intelligence" },
  { href: "/inbox", icon: "Inbox" as const, label: "Inbox" },
  { href: "/analytics", icon: "LineChart" as const, label: "Analytics" },
];

const CUSTOMERS_LINKS = [
  { href: "/contacts", icon: "Users" as const, label: "Contacts" },
  { href: "/appointments", icon: "Calendar" as const, label: "Appointments" },
  { href: "/escalations", icon: "AlertTriangle" as const, label: "Escalations" },
];

const AI_LINKS = [
  { href: "/channels", icon: "Radio" as const, label: "Channels" },
  { href: "/voice/dashboard", icon: "PhoneCall" as const, label: "Voice" },
  { href: "/kb", icon: "BookOpen" as const, label: "Knowledge" },
  { href: "/faqs", icon: "HelpCircle" as const, label: "FAQs" },
  { href: "/automations", icon: "Zap" as const, label: "Automations" },
  { href: "/flows", icon: "ClipboardList" as const, label: "Intake Questions" },
  { href: "/templates", icon: "LayoutTemplate" as const, label: "Templates" },
];

const SETTINGS_LINKS = [
  { href: "/profile", icon: "Building" as const, label: "Business Profile" },
  { href: "/settings/account", icon: "UserCog" as const, label: "Account Settings" },
  { href: "/admin/users", icon: "Contact" as const, label: "User Directory" },
  { href: "/services", icon: "Briefcase" as const, label: "Services" },
  { href: "/staff", icon: "UserCheck" as const, label: "Staff" },
  { href: "/settings", icon: "Clock" as const, label: "Hours & Booking" },
  { href: "/team", icon: "Users" as const, label: "Team" },
  { href: "/billing", icon: "CreditCard" as const, label: "Billing" },
];

// ─── Breadcrumb Mapping ──────────────────────────────────────────────────────
// Maps pathnames to human-readable breadcrumb segments.

const BREADCRUMB_MAP: Record<string, { group: string; label: string }> = {
  "/dashboard": { group: "Home", label: "Dashboard" },
  "/inbox": { group: "Home", label: "Inbox" },
  "/conversations": { group: "Home", label: "Conversations" },
  "/analytics": { group: "Home", label: "Analytics" },
  "/contacts": { group: "Customers", label: "Contacts" },
  "/leads": { group: "Customers", label: "Leads" },
  "/appointments": { group: "Customers", label: "Appointments" },
  "/escalations": { group: "Customers", label: "Escalations" },
  "/channels": { group: "Operator AI", label: "Channels" },
  "/widget": { group: "Operator AI", label: "Website Widget" },
  "/voice": { group: "Operator AI", label: "Phone Lines" },
  "/voice/dashboard": { group: "Operator AI", label: "Voice" },
  "/voice/settings": { group: "Operator AI", label: "Voice Settings" },
  "/voice/history": { group: "Operator AI", label: "Call Logs" },
  "/kb": { group: "Operator AI", label: "Knowledge" },
  "/faqs": { group: "Operator AI", label: "FAQs" },
  "/automations": { group: "Operator AI", label: "Automations" },
  "/flows": { group: "Operator AI", label: "Intake Questions" },
  "/templates": { group: "Operator AI", label: "Templates" },
  "/profile": { group: "Settings", label: "Business Profile" },
  "/settings/account": { group: "Settings", label: "Account Settings" },
  "/admin/users": { group: "Settings", label: "User Directory" },
  "/services": { group: "Settings", label: "Services" },
  "/staff": { group: "Settings", label: "Staff" },
  "/settings": { group: "Settings", label: "Hours & Booking" },
  "/team": { group: "Settings", label: "Team" },
  "/billing": { group: "Settings", label: "Billing" },
};

const AGENCY_LINKS = [
  { href: "/agency/dashboard", icon: "Building" as const, label: "Agency Portal" },
  { href: "/agency/clients", icon: "Briefcase" as const, label: "Clients" },
  { href: "/agency/branding", icon: "Palette" as const, label: "Branding Studio" },
  { href: "/agency/domains", icon: "Globe" as const, label: "Custom Domains" },
  { href: "/agency/team", icon: "Users" as const, label: "Agency Team" },
  { href: "/agency/billing", icon: "CreditCard" as const, label: "Reseller Billing" },
];

// ─── Breadcrumb Component ────────────────────────────────────────────────────

function Breadcrumb() {
  const pathname = usePathname();
  const crumb = BREADCRUMB_MAP[pathname];

  if (!crumb) {
    // Fallback: try to match the first two segments for nested routes
    const segments = pathname.split("/").filter(Boolean);
    const parentPath = "/" + segments.slice(0, 2).join("/");
    const parentCrumb = BREADCRUMB_MAP[parentPath] || BREADCRUMB_MAP["/" + segments[0]];
    
    if (parentCrumb) {
      return (
        <div className="hidden sm:flex items-center gap-space-1.5 text-body-sm">
          <span className="text-muted-foreground/50">{parentCrumb.group}</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
          <span className="text-foreground/80 font-medium">{parentCrumb.label}</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="hidden sm:flex items-center gap-space-1.5 text-body-sm">
      <span className="text-muted-foreground/50">{crumb.group}</span>
      <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
      <span className="text-foreground/80 font-medium">{crumb.label}</span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DashboardShellProps {
  children: React.ReactNode;
  orgName: string;
  orgIndustry: string | null;
  roleLabel: string;
  isAgency: boolean;
  headerActions: React.ReactNode;
  trialBanner: React.ReactNode;
}

export function DashboardShell({
  children,
  orgName,
  orgIndustry,
  roleLabel,
  isAgency,
  headerActions,
  trialBanner,
}: DashboardShellProps) {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const { user } = useAuth();

  // ─── Sidebar Content ─────────────────────────────────────────────────────────

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const collapsed = isMobile ? false : isCollapsed;

    return (
      <div className="flex h-full flex-col overflow-hidden">
        {/* Org Header */}
        <div
          className={cn(
            "flex items-center border-b border-[hsl(var(--foreground)/0.06)] shrink-0 sidebar-transition",
            collapsed
              ? "justify-center px-space-2 py-space-4"
              : "gap-space-3 px-space-4 py-space-4"
          )}
        >
          <div
            onClick={collapsed ? toggleSidebar : undefined}
            className={cn(
              "flex h-8 w-8 items-center justify-center radius-lg bg-[hsl(var(--primary)/0.10)] ring-1 ring-[hsl(var(--primary)/0.15)] shrink-0 transition-all duration-200",
              collapsed && "cursor-pointer hover:bg-[hsl(var(--primary)/0.18)] hover:scale-105"
            )}
            title={collapsed ? "Expand sidebar" : undefined} tabIndex={0} onKeyDown={() => {}}
          >
            <Bot className="size-[18px] text-primary" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0 flex-1 animate-fade-in">
              <span className="text-caption text-foreground truncate tracking-tight-lg">
                {orgName}
              </span>
              <span className="text-caption text-muted-foreground truncate capitalize">
                {orgIndustry?.toLowerCase() ?? "Operator"}
              </span>
            </div>
          )}
          {/* Collapse toggle — desktop only, shown only when expanded */}
          {!isMobile && !collapsed && (
            <button
              onClick={toggleSidebar}
              className="shrink-0 h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-[hsl(var(--foreground)/0.05)] transition-all duration-150 cursor-pointer"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {/* Scrollable Nav */}
        <ScrollArea className="flex flex-col flex-1 min-h-0" horizontal={false}>
          <div
            className={cn(
              "flex flex-col gap-space-0 py-space-3",
              collapsed ? "px-space-1" : "px-space-3"
            )}
          >
            <SidebarNavGroup title="Home" links={HOME_LINKS} />
            <SidebarNavGroup title="Customers" links={CUSTOMERS_LINKS} />
            <SidebarNavGroup title="Operator AI" links={AI_LINKS} />
            <SidebarNavGroup title="Settings" links={SETTINGS_LINKS} />

            {isAgency && (
              <>
                <div className="h-px bg-[hsl(var(--foreground)/0.06)] my-space-2 mx-space-3" />
                <SidebarNavGroup title="Agency" links={AGENCY_LINKS} />
              </>
            )}
          </div>
        </ScrollArea>
        {/* User Footer */}
        <div className="border-t border-[hsl(var(--foreground)/0.06)] p-space-3 shrink-0">
          <div
            className={cn(
              "flex items-center min-w-0 group radius-md transition-colors duration-150 cursor-default",
              collapsed
                ? "justify-center py-space-2"
                : "gap-space-3 px-space-2 py-space-2 -mx-space-1 hover:bg-[hsl(var(--foreground)/0.04)]"
            )}
          >
            <UserAvatarMenu
              avatarClass={collapsed ? "h-8 w-8" : "h-7 w-7"}
              roleLabel={roleLabel}
              orgName={orgName}
            />
            {!collapsed && (
              <>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-caption font-medium text-foreground truncate">
                    {user?.name || "Account"}
                  </span>
                  <span className="text-[11px] text-muted-foreground/70 truncate capitalize">
                    {roleLabel}
                  </span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 group-hover:text-muted-foreground/60 transition-colors" />
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar */}
      <m.aside
        layout
        className={cn(
          "fixed inset-y-0 left-0 z-20 hidden border-r border-[hsl(var(--foreground)/0.06)] bg-background md:flex md:flex-col",
          isCollapsed ? "w-18" : "w-64"
        )}
      >
        <SidebarContent />
      </m.aside>

      {/* Main content column */}
      <m.div
        layout
        className={cn(
          "flex flex-1 flex-col min-h-0 overflow-hidden",
          isCollapsed ? "md:pl-[72px]" : "md:pl-[var(--sidebar-width)]"
        )}
      >
        {/* Trial Banner */}
        {trialBanner}

        {/* Top Header */}
        <header className="sticky top-0 z-10 flex h-14 shrink-0 w-full items-center justify-between page-header px-space-5">
          {/* Left: Mobile menu + breadcrumb */}
          <div className="flex items-center gap-space-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" aria-label="Open navigation menu">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-space-0">
                <SidebarContent isMobile />
              </SheetContent>
            </Sheet>

            {/* Breadcrumb */}
            <Breadcrumb />
          </div>

          {/* Right: actions */}
          {headerActions}
        </header>

        {/* Page Content — scrolls within the shell, never the browser */}
        <AnimatePresence mode="wait">
          <m.main
            key={pathname}
            variants={pageTransition}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 min-h-0 overflow-y-auto p-space-6 md:p-space-8 sidebar-scroll flex flex-col"
          >
            {children}
          </m.main>
        </AnimatePresence>
      </m.div>
    </div>
  );
}
