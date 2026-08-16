"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/client";
import { LogOut, User, Settings, Building, Users, CreditCard, ChevronDown } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Avatar from "@radix-ui/react-avatar";
import { cn } from "@/components/shared/utils";

interface UserAvatarMenuProps {
  className?: string;
  avatarClass?: string;
  variant?: "avatar" | "pill";
  roleLabel?: string;
  orgName?: string;
}

export function UserAvatarMenu({
  className,
  avatarClass,
  variant = "avatar",
  roleLabel = "Owner",
  orgName = "Glow & Grace Esthetics",
}: UserAvatarMenuProps) {
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className={cn("h-8 w-8 rounded-full bg-[hsl(var(--foreground)/0.08)] animate-pulse shrink-0", className)} />
    );
  }

  if (!user) {
    return null;
  }

  const name = user.name || "User";
  const email = user.email;
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {variant === "pill" ? (
          <button
            className={cn(
              "group flex items-center gap-2.5 px-2.5 py-1.5 rounded-full border border-border/80 bg-background/80 hover:bg-accent/60 hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-all duration-200 cursor-pointer shadow-2xs select-none",
              className
            )}
            aria-label="User menu"
          >
            <div className="relative shrink-0">
              <Avatar.Root className={cn("h-7 w-7 rounded-full overflow-hidden border border-primary/20 bg-primary/10 select-none flex items-center justify-center font-bold text-caption text-primary", avatarClass)}>
                {user.avatar ? (
                  <Avatar.Image
                    src={user.avatar}
                    alt={name}
                    className="h-full w-full object-cover"
                  />
                ) : null}
                <Avatar.Fallback className="flex h-full w-full items-center justify-center bg-primary/15 text-primary font-bold uppercase text-[11px]">
                  {initials || "U"}
                </Avatar.Fallback>
              </Avatar.Root>
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-1.5 ring-background" />
            </div>

            <div className="hidden md:flex flex-col text-left leading-none">
              <span className="text-[12px] font-semibold text-foreground group-hover:text-primary transition-colors truncate max-w-[120px]">
                {name}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium mt-0.5 capitalize">
                {roleLabel}
              </span>
            </div>

            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </button>
        ) : (
          <button
            className={cn(
              "flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 cursor-pointer active:scale-95 transition-all duration-200 shrink-0",
              className
            )}
            aria-label="User menu"
          >
            <Avatar.Root className={cn("h-8 w-8 rounded-full overflow-hidden border border-border bg-secondary select-none flex items-center justify-center font-semibold text-caption text-foreground/80", avatarClass)}>
              {user.avatar ? (
                <Avatar.Image
                  src={user.avatar}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              ) : null}
              <Avatar.Fallback className="flex h-full w-full items-center justify-center bg-primary/10 text-primary font-bold uppercase text-[11px]">
                {initials || "U"}
              </Avatar.Fallback>
            </Avatar.Root>
          </button>
        )}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-[100] min-w-[260px] overflow-hidden rounded-2xl border border-border bg-popover/95 backdrop-blur-md p-1.5 shadow-xl animate-in fade-in-50 zoom-in-95 duration-150"
        >
          {/* User Profile Header */}
          <div className="flex flex-col px-3 py-2.5 rounded-xl bg-accent/40 mb-1 border border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground truncate">{name}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                {roleLabel}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground truncate mt-0.5">{email}</span>
            {orgName && (
              <span className="text-[10px] font-medium text-muted-foreground/80 truncate mt-1 pt-1 border-t border-border/40 flex items-center gap-1">
                <Building className="h-3 w-3 text-primary/70 shrink-0" />
                {orgName}
              </span>
            )}
          </div>

          <div className="p-0.5 space-y-0.5">
            <DropdownMenu.Item asChild>
              <Link
                href="/profile"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-foreground/85 hover:text-foreground hover:bg-accent transition-colors cursor-pointer select-none outline-none"
              >
                <Building className="h-4 w-4 text-muted-foreground" />
                <span>Business Profile</span>
              </Link>
            </DropdownMenu.Item>

            <DropdownMenu.Item asChild>
              <Link
                href="/settings/account"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-foreground/85 hover:text-foreground hover:bg-accent transition-colors cursor-pointer select-none outline-none"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Account & Security</span>
              </Link>
            </DropdownMenu.Item>

            <DropdownMenu.Item asChild>
              <Link
                href="/settings"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-foreground/85 hover:text-foreground hover:bg-accent transition-colors cursor-pointer select-none outline-none"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span>Hours & Booking</span>
              </Link>
            </DropdownMenu.Item>

            <DropdownMenu.Item asChild>
              <Link
                href="/team"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-foreground/85 hover:text-foreground hover:bg-accent transition-colors cursor-pointer select-none outline-none"
              >
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Team & Staff</span>
              </Link>
            </DropdownMenu.Item>

            <DropdownMenu.Item asChild>
              <Link
                href="/billing"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-foreground/85 hover:text-foreground hover:bg-accent transition-colors cursor-pointer select-none outline-none"
              >
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>Billing & Subscription</span>
              </Link>
            </DropdownMenu.Item>
          </div>

          <div className="h-px bg-border/60 my-1 mx-1" />

          <div className="p-0.5">
            <DropdownMenu.Item
              onClick={() => logout()}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-colors cursor-pointer select-none outline-none"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
