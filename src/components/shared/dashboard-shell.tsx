"use client";

import * as React from "react";
import Link from "next/link";
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
import { LogoIcon } from "@/components/shared/logo";
import { ScrollArea } from "@/components/ui/scroll-area";
import { m } from "framer-motion";

import { getButtonClasses } from '@/design-system/button-tokens';

// ─── Sidebar Section Definitions ─────────────────────────────────────────────
// 5 clear task-oriented groups adhering to Hick's Law and Jakob's Law:

const OVERVIEW_LINKS = [
  { href: "/dashboard", icon: "LayoutDashboard" as const, label: "Overview" },
  { href: "/inbox", icon: "Inbox" as const, label: "Omnichannel Inbox" },
];

const OPERATIONS_LINKS = [
  { href: "/appointments", icon: "Calendar" as const, label: "Bookings & Calendar" },
  { href: "/contacts", icon: "Users" as const, label: "Customers & Activity" },
  { href: "/escalations", icon: "AlertTriangle" as const, label: "Tasks & Exceptions" },
];

const AI_LINKS = [
  { href: "/settings/ai", icon: "Brain" as const, label: "AI Persona & Prompts" },
  { href: "/kb", icon: "BookOpen" as const, label: "Business Knowledge" },
  { href: "/faqs", icon: "HelpCircle" as const, label: "Business FAQs" },
  { href: "/voice/dashboard", icon: "PhoneCall" as const, label: "Voice AI Lines" },
  { href: "/channels", icon: "Radio" as const, label: "Channels & Integrations" },
  { href: "/automations", icon: "Zap" as const, label: "Automations" },
  { href: "/widget", icon: "MessageSquare" as const, label: "Website Widget" },
];

const LEARNING_LINKS = [
  { href: "/academy", icon: "GraduationCap" as const, label: "Founder Academy" },
  { href: "/demo-center", icon: "PlayCircle" as const, label: "Demo Center" },
];

const BUSINESS_LINKS = [
  { href: "/services", icon: "Briefcase" as const, label: "Services & Pricing" },
  { href: "/staff", icon: "UserCheck" as const, label: "Staff & Schedules" },
  { href: "/analytics", icon: "LineChart" as const, label: "Analytics & Reports" },
  { href: "/settings", icon: "Settings" as const, label: "Business Settings" },
  { href: "/billing", icon: "CreditCard" as const, label: "Billing & Plans" },
];

// ─── Breadcrumb Mapping ──────────────────────────────────────────────────────
// Maps pathnames to human-readable breadcrumb segments.

const BREADCRUMB_MAP: Record<string, { group: string; label: string }> = {
  "/dashboard": { group: "Overview", label: "Dashboard" },
  "/inbox": { group: "Overview", label: "Omnichannel Inbox" },
  "/conversations": { group: "Overview", label: "Omnichannel Inbox" },
  "/academy": { group: "Learning", label: "Founder Academy" },
  "/demo-center": { group: "Learning", label: "Demo Control Center" },
  "/appointments": { group: "Operations", label: "Bookings & Calendar" },
  "/contacts": { group: "Operations", label: "Customers & Activity" },
  "/leads": { group: "Operations", label: "Customers & Activity" },
  "/escalations": { group: "Operations", label: "Tasks & Exceptions" },
  "/settings/ai": { group: "Operator AI", label: "AI Persona & Prompts" },
  "/kb": { group: "Operator AI", label: "Business Knowledge" },
  "/faqs": { group: "Operator AI", label: "Business Knowledge" },
  "/voice": { group: "Operator AI", label: "Phone Lines" },
  "/voice/dashboard": { group: "Operator AI", label: "Voice AI Lines" },
  "/voice/settings": { group: "Operator AI", label: "Voice Settings" },
  "/voice/history": { group: "Operator AI", label: "Call Logs" },
  "/channels": { group: "Operator AI", label: "Channels & Integrations" },
  "/automations": { group: "Operator AI", label: "Automations" },
  "/flows": { group: "Operator AI", label: "Automations" },
  "/templates": { group: "Operator AI", label: "Templates" },
  "/widget": { group: "Operator AI", label: "Website Widget" },
  "/services": { group: "Business", label: "Services & Pricing" },
  "/staff": { group: "Business", label: "Staff & Schedules" },
  "/team": { group: "Business", label: "Staff & Schedules" },
  "/analytics": { group: "Business", label: "Analytics & Reports" },
  "/intelligence": { group: "Business", label: "Intelligence" },
  "/settings": { group: "Business", label: "Business Settings" },
  "/profile": { group: "Business", label: "Business Profile" },
  "/settings/account": { group: "Business", label: "Account Settings" },
  "/admin/users": { group: "Business", label: "User Directory" },
  "/billing": { group: "Business", label: "Billing & Plans" },
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
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Auto-close mobile drawer whenever pathname changes
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // ─── Sidebar Content ─────────────────────────────────────────────────────────

  const SidebarContent = ({
    isMobile = false,
    onNavigate,
  }: {
    isMobile?: boolean;
    onNavigate?: () => void;
  }) => {
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
          <Link
            href="/"
            onClick={onNavigate}
            className={cn(
              "flex h-8 w-8 items-center justify-center radius-lg shrink-0 transition-all duration-200 cursor-pointer hover:scale-105",
              collapsed && "hover:opacity-90"
            )}
            title="Navigate to Home"
          >
            <LogoIcon className="h-8 w-8" />
          </Link>
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
        {/* Scrollable Nav — Clean fit without visible scrollbar */}
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div
            className={cn(
              "flex flex-col gap-0 py-1.5",
              collapsed ? "px-1" : "px-2"
            )}
          >
            <SidebarNavGroup title="Overview" links={OVERVIEW_LINKS} onNavigate={onNavigate} />
            <SidebarNavGroup title="Operations" links={OPERATIONS_LINKS} onNavigate={onNavigate} />
            <SidebarNavGroup title="Operator AI" links={AI_LINKS} onNavigate={onNavigate} />
            <SidebarNavGroup title="Business" links={BUSINESS_LINKS} onNavigate={onNavigate} />
            <SidebarNavGroup title="Learning & Demo" links={LEARNING_LINKS} onNavigate={onNavigate} />

            {isAgency && (
              <>
                <div className="h-px bg-[hsl(var(--foreground)/0.06)] my-1.5 mx-2" />
                <SidebarNavGroup title="Agency" links={AGENCY_LINKS} onNavigate={onNavigate} />
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
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
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" aria-label="Open navigation menu">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-space-0">
                <SidebarContent isMobile onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>

            {/* Breadcrumb */}
            <Breadcrumb />
          </div>

          {/* Right: actions */}
          {headerActions}
        </header>

        {/* Page Content — instant mount without blocking exit wait */}
        <main
          key={pathname}
          className="flex-1 min-h-0 overflow-y-auto p-space-6 md:p-space-8 sidebar-scroll flex flex-col animate-fade-in"
        >
          {children}
        </main>
      </m.div>
    </div>
  );
}
