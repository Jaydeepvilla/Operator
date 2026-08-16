"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { UserAvatarMenu } from "./user-avatar-menu";
import { useAuth } from "@/lib/auth/client";
import { Bell, Sun, Moon } from "lucide-react";
import { Button } from "./button";
import { NotificationsDropdown } from "./notifications-dropdown";
import { OrgSwitcher } from "./org-switcher";

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

  const userName = user?.name || "User";

  return (
    <div className="flex items-center gap-space-2.5">
      {/* Multi-Tenant Org Switcher */}
      <OrgSwitcher 
        currentOrgName={orgName}
        currentOrgIndustry={orgIndustry}
        roleLabel={roleLabel}
      />

      <div className="h-4 w-px bg-[hsl(var(--foreground)/0.08)] hidden sm:block" />

      {/* Theme Toggle */}
      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-transparent radius-md" onClick={toggleTheme} aria-label="Toggle theme">
        {mounted && resolvedTheme === "dark" ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>

      {/* Notifications Dropdown */}
      <NotificationsDropdown initialNotifications={initialNotifications} />

      <div className="h-4 w-px bg-[hsl(var(--foreground)/0.08)] hidden sm:block" />

      {isLoading ? (
        <div className="hidden sm:flex flex-col text-right gap-y-1 select-none min-w-[80px]">
          <div className="h-3.5 w-24 bg-[hsl(var(--foreground)/0.08)] rounded animate-pulse" />
          <div className="h-2.5 w-12 bg-[hsl(var(--foreground)/0.08)] rounded animate-pulse self-end" />
        </div>
      ) : (
        <div className="hidden sm:flex flex-col text-right select-none">
          <span className="text-[12px] font-semibold text-foreground leading-tight">
            {userName}
          </span>
          <span className="text-[10px] text-muted-foreground/75 leading-tight mt-0.5">
            {roleLabel}
          </span>
        </div>
      )}

      {/* Profile Avatar (User Button) - separator between name and avatar removed */}
      <div className="flex items-center ml-space-3">
        <UserAvatarMenu />
      </div>
    </div>
  );
}
