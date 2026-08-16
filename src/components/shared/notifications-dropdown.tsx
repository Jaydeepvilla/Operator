"use client";

import * as React from "react";
import Link from "next/link";
import { useSmartNotifications } from "@/hooks/use-smart-notifications";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell, Check, Trash2, AlertTriangle, Info, Zap, CheckSquare } from "lucide-react";
import { cn } from "@/components/shared/utils";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NotificationsDropdownProps {
  initialNotifications: any[];
}

export function NotificationsDropdown({ initialNotifications }: NotificationsDropdownProps) {
  const { notifications, dismiss, markAsRead } = useSmartNotifications(initialNotifications);
  const [activeTab, setActiveTab] = React.useState<"all" | "unread" | "read">("all");

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const readNotifications = notifications.filter(n => n.isRead);
  const count = unreadNotifications.length;

  const markAllAsRead = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    unreadNotifications.forEach(n => markAsRead(n.id));
  };

  const filteredNotifications = React.useMemo(() => {
    if (activeTab === "unread") return unreadNotifications;
    if (activeTab === "read") return readNotifications;
    return notifications;
  }, [notifications, activeTab, unreadNotifications, readNotifications]);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="relative text-muted-foreground hover:text-foreground h-8 w-8 rounded-md flex items-center justify-center hover:bg-[hsl(var(--foreground)/0.05)] transition-all cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.3)]"
          aria-label="Notifications"
          id="notifications-btn"
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute top-1 right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--state-error-text))] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(var(--state-error-text))]"></span>
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-[100] w-[380px] overflow-hidden rounded-xl border border-border bg-popover shadow-lg animate-in fade-in-50 zoom-in-95 duration-100 flex flex-col max-h-[480px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.01)] shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-body-sm font-semibold text-foreground">Notifications</span>
              {count > 0 && (
                <span className="text-[10px] font-bold bg-[hsl(var(--state-error-bg))] text-[hsl(var(--state-error-text))] px-2 py-0.5 rounded-full">
                  {count} new
                </span>
              )}
            </div>
            {count > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[10px] font-semibold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors cursor-pointer"
              >
                <CheckSquare className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Tab Filters */}
          <div className="flex gap-1 p-1.5 border-b border-[hsl(var(--foreground)/0.05)] bg-[hsl(var(--foreground)/0.005)] shrink-0">
            <button
              onClick={() => setActiveTab("all")}
              className={cn(
                "flex-1 py-1.5 text-center text-caption font-semibold rounded-lg transition-all cursor-pointer",
                activeTab === "all"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--foreground)/0.03)]"
              )}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab("unread")}
              className={cn(
                "flex-1 py-1.5 text-center text-caption font-semibold rounded-lg transition-all cursor-pointer",
                activeTab === "unread"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--foreground)/0.03)]"
              )}
            >
              Unread ({unreadNotifications.length})
            </button>
            <button
              onClick={() => setActiveTab("read")}
              className={cn(
                "flex-1 py-1.5 text-center text-caption font-semibold rounded-lg transition-all cursor-pointer",
                activeTab === "read"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--foreground)/0.03)]"
              )}
            >
              Read ({readNotifications.length})
            </button>
          </div>

          {/* List using perfect-scrollbar wrapper (ScrollArea) */}
          <ScrollArea className="flex-1 min-h-0" horizontal={false}>
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-[hsl(var(--foreground)/0.04)] flex items-center justify-center mb-3">
                  <Check className="w-5 h-5 text-muted-foreground/60" />
                </div>
                <p className="text-body-sm font-semibold text-foreground">No notifications</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1 max-w-[240px]">
                  {activeTab === "unread" 
                    ? "You don't have any unread notifications."
                    : activeTab === "read"
                    ? "You don't have any read notifications."
                    : "You have no active alerts or system notifications."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[hsl(var(--foreground)/0.05)]">
                {filteredNotifications.map((notif) => {
                  const isCritical = notif.severity === "critical";
                  const isWarning = notif.severity === "warning";
                  const isAi = notif.category === "ai_improvement";
                  
                  return (
                    <div
                      key={notif.id}
                      className={cn(
                        "p-3.5 transition-colors relative flex items-start gap-3 group hover:bg-[hsl(var(--foreground)/0.025)]",
                        !notif.isRead ? "bg-[hsl(var(--foreground)/0.015)]" : "bg-transparent"
                      )}
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          "shrink-0 mt-0.5 p-1.5 rounded-lg",
                          isCritical
                            ? "bg-[hsl(var(--state-error-bg))] text-[hsl(var(--state-error-text))]"
                            : isWarning
                            ? "bg-[hsl(var(--state-warning-bg))] text-[hsl(var(--state-warning-text))]"
                            : isAi
                            ? "bg-primary/10 text-primary"
                            : "bg-[hsl(var(--foreground)/0.05)] text-muted-foreground"
                        )}
                      >
                        {isCritical ? (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        ) : isWarning ? (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        ) : isAi ? (
                          <Zap className="w-3.5 h-3.5" />
                        ) : (
                          <Info className="w-3.5 h-3.5" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={cn(
                              "text-body-xs font-semibold truncate flex items-center gap-1.5 min-w-0",
                              !notif.isRead ? "text-foreground font-bold" : "text-muted-foreground"
                            )}
                          >
                            {!notif.isRead && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse-soft" />
                            )}
                            <span className="truncate">{notif.title}</span>
                          </span>

                          {/* Right Header Area: Timestamp on idle, Action Controls on hover */}
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-muted-foreground/60 group-hover:hidden transition-opacity">
                              {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                            </span>

                            {/* Hover Actions (Mark as Read / Dismiss) */}
                            <div className="hidden group-hover:flex items-center gap-0.5 transition-opacity">
                              {!notif.isRead && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notif.id);
                                  }}
                                  className="p-1 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-[hsl(var(--foreground)/0.05)] transition-all cursor-pointer"
                                  title="Mark as read"
                                >
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  dismiss(notif.id);
                                }}
                                className="p-1 rounded-md text-muted-foreground/70 hover:text-[hsl(var(--state-error-text))] hover:bg-[hsl(var(--state-error-bg))] transition-all cursor-pointer"
                                title="Dismiss"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground/80 mt-1 leading-relaxed">
                          {notif.description}
                        </p>

                        {/* Action Button */}
                        {notif.actionUrl && (
                          <div className="mt-2.5 flex items-center gap-2">
                            <Link
                              href={notif.actionUrl}
                              className="inline-flex h-6 items-center justify-center rounded-lg bg-primary px-3 text-[10px] font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-all duration-150"
                            >
                              {notif.metadata?.actionText || "Review"}
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
