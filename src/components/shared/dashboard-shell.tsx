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
import { SidebarNavGroup, SidebarLinkProps } from "@/components/shared/sidebar-nav";
import { useSidebar } from "@/components/shared/sidebar-context";
import { cn } from "@/components/shared/utils";
import { LogoIcon } from "@/components/shared/logo";
import { m } from "framer-motion";
import { isWhiteLabelEnabled } from "@/lib/config/feature-flags";
import { COPY } from "@/lib/copy/labels";

// ─── Breadcrumb Mapping ──────────────────────────────────────────────────────
const BREADCRUMB_MAP: Record<string, { group: string; label: string }> = {
  "/dashboard": { group: "Operator", label: "Home" },
  "/inbox": { group: "Communications", label: "Messages" },
  "/conversations": { group: "Communications", label: "Messages" },
  "/appointments": { group: "Schedule", label: "Appointments" },
  "/contacts": { group: "Audience", label: "Customers" },
  "/leads": { group: "Audience", label: "Customers" },
  "/escalations": { group: "Inbox", label: "Needs Your Attention" },
  "/settings/ai": { group: "Train Your Assistant", label: "Tone of Voice" },
  "/kb": { group: "Train Your Assistant", label: "Documents" },
  "/faqs": { group: "Train Your Assistant", label: "Questions & Answers" },
  "/profile": { group: "Train Your Assistant", label: "Business Info" },
  "/channels": { group: "Connect", label: "Channels" },
  "/widget": { group: "Connect", label: "Website Chat" },
  "/voice": { group: "Connect", label: "Phone" },
  "/voice/dashboard": { group: "Connect", label: "Phone" },
  "/voice/settings": { group: "Advanced", label: "Call Routing & Voice" },
  "/voice/history": { group: "Reports", label: "Call History" },
  "/automations": { group: "Advanced", label: "Automations" },
  "/flows": { group: "Advanced", label: "Automations" },
  "/analytics": { group: "Business", label: "Reports" },
  "/intelligence": { group: "Business", label: "Reports" },
  "/services": { group: "Settings", label: "Services & Prices" },
  "/staff": { group: "Settings", label: "Staff & Hours" },
  "/team": { group: "Settings", label: "Staff & Hours" },
  "/settings": { group: "Settings", label: "Business Settings" },
  "/settings/account": { group: "Settings", label: "Account" },
  "/settings/booking": { group: "Settings", label: "Booking Rules" },
  "/settings/rules": { group: "Advanced", label: "Automations & Rules" },
  "/settings/audit-logs": { group: "Advanced", label: "Audit Logs" },
  "/billing": { group: "Settings", label: "Billing & Plans" },
  "/help": { group: "Help", label: "Guides & Support" },
  "/academy": { group: "Help", label: "Founder Academy" },
  "/demo-center": { group: "Help", label: "Demo Center" },
};

const AGENCY_LINKS: SidebarLinkProps[] = [
  { href: "/agency/dashboard", icon: "Building", label: "Agency Portal" },
  { href: "/agency/clients", icon: "Briefcase", label: "Clients" },
  { href: "/agency/branding", icon: "Palette", label: "Branding Studio" },
  { href: "/agency/domains", icon: "Globe", label: "Custom Domains" },
  { href: "/agency/team", icon: "Users", label: "Agency Team" },
  { href: "/agency/billing", icon: "CreditCard", label: "Reseller Billing" },
];

// ─── Breadcrumb Component ────────────────────────────────────────────────────
function Breadcrumb() {
  const pathname = usePathname();
  const crumb = BREADCRUMB_MAP[pathname];

  if (!crumb) {
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
  planId?: string;
  attentionCount?: number;
}

export function DashboardShell({
  children,
  orgName,
  orgIndustry,
  roleLabel,
  isAgency,
  headerActions,
  trialBanner,
  planId = "starter",
  attentionCount = 0,
}: DashboardShellProps) {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Auto-close mobile drawer on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Determine if phone calling is included in current plan
  const normalizedPlan = (planId || "starter").toLowerCase();
  const hasPhone =
    normalizedPlan.includes("pro") ||
    normalizedPlan.includes("biz") ||
    normalizedPlan.includes("business") ||
    normalizedPlan.includes("trial");

  // ─── 8-Item Core Navigation Definition (Step 2) ──────────────────────────
  const PRIMARY_NAV_LINKS: SidebarLinkProps[] = [
    {
      href: "/dashboard",
      icon: "LayoutDashboard",
      label: COPY.nav.home,
    },
    {
      href: "/inbox",
      icon: "MessageSquare",
      label: COPY.nav.messages,
    },
    {
      href: "/appointments",
      icon: "Calendar",
      label: COPY.nav.appointments,
    },
    {
      href: "/contacts",
      icon: "Users",
      label: COPY.nav.customers,
    },
    {
      href: "/escalations",
      icon: "AlertTriangle",
      label: COPY.nav.needsAttention,
      badge: attentionCount > 0 ? attentionCount : undefined,
      badgeVariant: "warning",
    },
    {
      href: "/settings/ai",
      icon: "Brain",
      label: COPY.nav.trainAssistant,
      subLinks: [
        { href: "/profile", label: "Business Info", icon: "Building" },
        { href: "/faqs", label: "Questions & Answers", icon: "HelpCircle" },
        { href: "/settings/ai", label: "Tone of Voice", icon: "Sparkles" },
        { href: "/kb", label: "Documents", icon: "BookOpen" },
      ],
    },
    {
      href: "/channels",
      icon: "Radio",
      label: COPY.nav.connect,
      subLinks: [
        { href: "/widget", label: "Website Chat", icon: "MessageSquare" },
        { href: "/channels", label: "WhatsApp", icon: "MessageCircle" },
        {
          href: hasPhone ? "/voice/dashboard" : "/billing",
          label: "Phone",
          icon: "Phone",
          locked: !hasPhone,
          lockLabel: !hasPhone ? COPY.plans.phoneLockedBadge : undefined,
        },
        { href: "/settings/booking", label: "Calendar", icon: "Calendar" },
        { href: "/settings/booking/deposits", label: "Payments", icon: "CreditCard" },
      ],
    },
    {
      href: "/analytics",
      icon: "LineChart",
      label: COPY.nav.reports,
    },
    {
      href: "/settings",
      icon: "Settings",
      label: COPY.nav.settings,
      subLinks: [
        { href: "/settings", label: "Business Profile", icon: "Building" },
        { href: "/services", label: "Services & Prices", icon: "Briefcase" },
        { href: "/staff", label: "Staff & Hours", icon: "UserCheck" },
        { href: "/billing", label: "Billing & Plans", icon: "CreditCard" },
      ],
    },
    {
      href: "/help",
      icon: "HelpCircle",
      label: COPY.nav.help,
      subLinks: [
        { href: "/help", label: "Guides & Tour", icon: "BookOpen" },
        { href: "/academy", label: "Founder Academy", icon: "GraduationCap" },
        { href: "/demo-center", label: "Demo Center", icon: "PlayCircle" },
      ],
    },
  ];

  // ─── Collapsed Advanced Group (Step 2) ──────────────────────────────────
  const ADVANCED_NAV_LINKS: SidebarLinkProps[] = [
    { href: "/automations", icon: "Zap", label: "Automations" },
    { href: "/channels", icon: "Radio", label: "Integrations & Webhooks" },
    { href: "/voice/settings", icon: "PhoneCall", label: "Voice Settings & Routing" },
    { href: "/settings/audit-logs", icon: "ClipboardList", label: "Audit Logs" },
  ];

  // ─── Sidebar Content Renderer ───────────────────────────────────────────
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
              <span className="text-caption text-foreground font-semibold truncate tracking-tight">
                {orgName}
              </span>
              <span className="text-[11px] text-muted-foreground truncate capitalize">
                {orgIndustry?.toLowerCase() ?? "Front Desk"}
              </span>
            </div>
          )}
          {/* Collapse toggle — desktop only */}
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

        {/* Scrollable Nav Items */}
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className={cn("flex flex-col gap-1 py-2", collapsed ? "px-1" : "px-2")}>
            {/* Primary 8-Item Nav */}
            <SidebarNavGroup links={PRIMARY_NAV_LINKS} onNavigate={onNavigate} />

            {/* Collapsed Advanced Section */}
            <div className="pt-2 border-t border-[hsl(var(--foreground)/0.06)] mt-2">
              <SidebarNavGroup
                title="Advanced"
                links={ADVANCED_NAV_LINKS}
                onNavigate={onNavigate}
                collapsible={true}
                defaultOpen={false}
              />
            </div>

            {/* Optional Agency Platform (Gated behind feature flag) */}
            {isWhiteLabelEnabled() && isAgency && (
              <div className="pt-2 border-t border-[hsl(var(--foreground)/0.06)] mt-2">
                <SidebarNavGroup
                  title="Agency Platform"
                  links={AGENCY_LINKS}
                  onNavigate={onNavigate}
                  collapsible={true}
                  defaultOpen={false}
                />
              </div>
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

            <Breadcrumb />
          </div>

          {/* Right: actions */}
          {headerActions}
        </header>

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto px-space-4 py-space-6 sm:px-space-6 lg:px-space-8"
          id="main-content"
        >
          {children}
        </main>
      </m.div>
    </div>
  );
}
