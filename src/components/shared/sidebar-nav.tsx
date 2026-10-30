"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/shared/utils";
import { useSidebar } from "@/components/shared/sidebar-context";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/shared/tooltip";
import {
  LayoutDashboard,
  Inbox,
  MessageSquare,
  LineChart,
  TrendingUp,
  Users,
  Calendar,
  AlertTriangle,
  Zap,
  ClipboardList,
  PhoneCall,
  Phone,
  Volume2,
  History,
  Building,
  Briefcase,
  HelpCircle,
  Settings,
  BookOpen,
  Code,
  Radio,
  CreditCard,
  Palette,
  Globe,
  Brain,
  LayoutTemplate,
  UserCog,
  Contact,
  UserCheck,
  Clock,
  GraduationCap,
  PlayCircle,
  Lock,
  ChevronDown,
  Sparkles,
  Sliders,
  FileText,
  MessageCircle,
  ShieldAlert,
} from "lucide-react";

export const IconMap = {
  LayoutDashboard,
  Inbox,
  MessageSquare,
  LineChart,
  TrendingUp,
  Users,
  Calendar,
  AlertTriangle,
  Zap,
  ClipboardList,
  PhoneCall,
  Phone,
  Volume2,
  History,
  Building,
  Briefcase,
  HelpCircle,
  Settings,
  BookOpen,
  Code,
  Radio,
  CreditCard,
  Palette,
  Globe,
  Brain,
  LayoutTemplate,
  UserCog,
  Contact,
  UserCheck,
  Clock,
  GraduationCap,
  PlayCircle,
  Lock,
  Sparkles,
  Sliders,
  FileText,
  MessageCircle,
  ShieldAlert,
};

export type SidebarIconName = keyof typeof IconMap;

export interface SidebarSubLink {
  href: string;
  label: string;
  icon?: SidebarIconName;
  locked?: boolean;
  lockLabel?: string;
  badge?: string | number;
}

export interface SidebarLinkProps {
  href: string;
  icon: SidebarIconName;
  label: string;
  badge?: string | number;
  badgeVariant?: "default" | "warning" | "locked";
  locked?: boolean;
  lockLabel?: string;
  subLinks?: SidebarSubLink[];
}

export interface SidebarGroupProps {
  title?: string;
  links: SidebarLinkProps[];
  onNavigate?: () => void;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function SidebarNavGroup({
  title,
  links,
  onNavigate,
  collapsible = false,
  defaultOpen = false,
}: SidebarGroupProps) {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  // Auto-expand if current route matches one of the group's links or sub-links
  React.useEffect(() => {
    if (collapsible) {
      const isRouteInGroup = links.some((link) => {
        if (pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href + "/"))) {
          return true;
        }
        return link.subLinks?.some(
          (sub) => pathname === sub.href || pathname.startsWith(sub.href + "/")
        );
      });
      if (isRouteInGroup) {
        setIsOpen(true);
      }
    }
  }, [pathname, links, collapsible]);

  return (
    <TooltipProvider>
      <nav className="space-y-space-0.5" aria-label={title || "Navigation"}>
        {/* Section title or Collapsible Header */}
        {title && (
          isCollapsed ? (
            <div className="h-px bg-[hsl(var(--sidebar-border))] my-1.5 mx-2" />
          ) : collapsible ? (
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-2.5 pb-1 pt-2.5 text-caption uppercase tracking-widest text-[hsl(var(--sidebar-section-label))] hover:text-foreground font-semibold select-none transition-colors"
            >
              <span>{title}</span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200 text-muted-foreground/80",
                  isOpen && "rotate-180"
                )}
              />
            </button>
          ) : (
            <p
              className="px-2.5 pb-1 pt-2.5 text-caption uppercase tracking-widest text-[hsl(var(--sidebar-section-label))] font-semibold select-none"
              aria-hidden="true"
            >
              {title}
            </p>
          )
        )}

        {/* Links list */}
        {(!collapsible || isOpen || isCollapsed) &&
          links.map((link) => {
            const Icon = IconMap[link.icon] || LayoutDashboard;
            const isExact = pathname === link.href;
            const isChild =
              link.href !== "/dashboard" &&
              link.href !== "/voice" &&
              link.href !== "/settings" &&
              link.href !== "/help" &&
              pathname.startsWith(link.href + "/");
            const hasActiveSub = link.subLinks?.some(
              (sub) => pathname === sub.href || pathname.startsWith(sub.href + "/")
            );
            const isActive = isExact || isChild || hasActiveSub;

            const content = (
              <div key={link.href} className="space-y-0.5">
                <Link
                  href={link.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center radius-md transition-all duration-150 group relative select-none w-full my-0.5 cursor-pointer text-left",
                    isCollapsed
                      ? "justify-center mx-1 px-0 py-1.5"
                      : "gap-2.5 px-2.5 py-1.5",
                    isActive
                      ? "bg-[hsl(var(--sidebar-item-active-bg))] text-[hsl(var(--sidebar-item-active-fg))] font-medium shadow-xs"
                      : "text-[hsl(var(--sidebar-item-fg))] hover:bg-[hsl(var(--sidebar-item-hover-bg))] hover:text-foreground active:bg-[hsl(var(--sidebar-item-active-bg))]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.3)] focus-visible:ring-inset"
                  )}
                >
                  <Icon
                    className={cn(
                      "shrink-0 transition-colors duration-150 size-4",
                      isActive
                        ? "text-[hsl(var(--sidebar-item-active-fg))]"
                        : "text-[hsl(var(--sidebar-item-fg))] group-hover:text-foreground"
                    )}
                  />
                  {!isCollapsed && (
                    <div className="flex-1 flex items-center justify-between min-w-0 gap-1.5">
                      <span
                        className={cn(
                          "truncate text-body-sm transition-opacity duration-150",
                          isActive ? "font-semibold" : "font-normal"
                        )}
                      >
                        {link.label}
                      </span>

                      {/* Live Badge (e.g. for Needs Attention count) */}
                      {link.badge !== undefined && link.badge !== null && (
                        <span
                          className={cn(
                            "px-1.5 py-0.2 rounded-full text-xs font-bold leading-none shrink-0",
                            link.badgeVariant === "warning" || Number(link.badge) > 0
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {link.badge}
                        </span>
                      )}

                      {/* Locked Badge (e.g. Phone on Starter) */}
                      {link.locked && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-light bg-primary/15 border border-primary/25 px-1.5 py-0.5 rounded-full shrink-0">
                          <Lock className="w-2.5 h-2.5" />
                          <span>{link.lockLabel || "Pro"}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Active indicator dot for collapsed mode */}
                  {isActive && isCollapsed && (
                    <span className="absolute -right-space-0.5 top-space-1/2 -translate-y-space-1/2 h-1.5 w-1.5 radius-md bg-foreground" />
                  )}
                </Link>

                {/* Sub-links when expanded (indented 2-level clean list) */}
                {!isCollapsed && link.subLinks && link.subLinks.length > 0 && (
                  <div className="ml-5 pl-2.5 border-l border-border/40 space-y-0.5 py-0.5">
                    {link.subLinks.map((sub) => {
                      const isSubActive =
                        pathname === sub.href || pathname.startsWith(sub.href + "/");
                      const SubIcon = sub.icon ? IconMap[sub.icon] : null;

                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={onNavigate}
                          className={cn(
                            "flex items-center justify-between px-2 py-1 rounded-md text-xs transition-colors cursor-pointer select-none",
                            isSubActive
                              ? "text-primary font-semibold bg-primary/10"
                              : "text-muted-foreground/80 hover:text-foreground hover:bg-muted/40"
                          )}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {SubIcon && <SubIcon className="w-3.5 h-3.5 shrink-0 opacity-70" />}
                            <span className="truncate">{sub.label}</span>
                          </div>

                          {sub.locked && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-primary-light bg-primary/15 px-1.5 py-0.2 rounded-full shrink-0">
                              <Lock className="w-2 h-2" />
                              <span>{sub.lockLabel || "Pro"}</span>
                            </span>
                          )}

                          {sub.badge && (
                            <span className="px-1.5 py-0.2 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400">
                              {sub.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={link.href} delayDuration={50}>
                  <TooltipTrigger asChild>{content}</TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="font-semibold">{link.label}</p>
                    {link.locked && (
                      <p className="text-xs text-primary-light">{link.lockLabel || "Available on Pro"}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return content;
          })}
      </nav>
    </TooltipProvider>
  );
}
