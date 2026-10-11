"use client";

import { m } from "framer-motion";
import { hoverScale } from "@/components/motion/hover";
import { useState, useEffect } from "react";
import { SmartNotification } from "@/lib/notification-engine/types";
import { useSmartNotifications } from "@/hooks/use-smart-notifications";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/dialog";
import { NativeButton } from "@/components/shared/native";
import { Button } from "@/components/shared/button";
import {
  AlertTriangle,
  AlertCircle,
  Zap,
  Info,
  Clock,
  CheckCircle2,
  X,
  Activity,
  TerminalSquare,
  Sparkles,
  Check
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ActionCenterWidgetProps {
  notifications: SmartNotification[];
}

type Tab = "critical" | "warnings" | "insights" | "all";

/* ───── Notification Row ───── */
function NotificationRow({
  notif,
  onDismiss,
  onMarkRead,
  onSnooze,
  snoozeMenuId,
  setSnoozeMenuId,
  isPending,
}: {
  notif: SmartNotification;
  onDismiss: (id: string) => void;
  onMarkRead: (id: string) => void;
  onSnooze: (id: string, minutes: number) => void;
  snoozeMenuId: string | null;
  setSnoozeMenuId: (id: string | null) => void;
  isPending: boolean;
}) {
  const isCritical = notif.severity === "critical";
  const isWarning = notif.severity === "warning";
  const isAi = notif.category === "ai_improvement";

  const iconBg = isCritical
    ? "bg-state-error-bg border border-error-500/10"
    : isWarning
    ? "bg-state-warning-bg border border-warning-500/10"
    : isAi
    ? "bg-[hsl(var(--primary)/0.06)] border border-[hsl(var(--primary)/0.12)]"
    : "bg-card border border-border";

  const iconColor = isCritical
    ? "text-state-error-text"
    : isWarning
    ? "text-state-warning-text"
    : isAi
    ? "text-primary-500"
    : "text-neutral-500";

  const Icon = isCritical ? AlertCircle : isWarning ? AlertTriangle : isAi ? Zap : Info;

  return (
    <div
      className={`group relative flex items-start gap-space-3 px-space-4 py-space-4 hover:bg-bg-layer-2/50 border-b border-border-subtle last:border-0 interactive-card transition-all duration-200 ${
        snoozeMenuId === notif.id ? "z-10" : ""
      } ${
        !notif.isRead ? "bg-bg-layer-1" : "opacity-80 hover:opacity-100"
      }`}
    >
      {!notif.isRead && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-space-0.5 h-space-6 bg-primary radius-r-sm" />
      )}
      <div className={`mt-space-0.5 w-space-8 h-space-8 radius-lg flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className={`w-space-4 h-space-4 ${iconColor}`} />
      </div>

      <div className="flex-1 min-w-0">
        {/* Title and Metadata Group */}
        <div className="flex flex-wrap items-center gap-space-2 mb-space-1 pr-space-6">
          <p className="text-body-sm font-semibold text-foreground leading-tight">{notif.title}</p>
          {notif.metadata?.businessImpact && (
            <span className={`text-caption font-medium px-space-2 py-space-0.5 radius-sm ${iconBg} ${iconColor}`}>
              {notif.metadata.businessImpact}
            </span>
          )}
          <span className="text-caption text-neutral-400">
            • {new Date(notif.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
        
        {/* Description */}
        <p className="text-caption text-neutral-600 leading-relaxed pr-space-6">{notif.description}</p>

        {/* Unified Actions Bar (UX: Explicit Snooze Trigger) */}
        <div className="flex items-center gap-space-2 mt-space-3">
          {notif.actionUrl && (
            <Button
              variant="secondary"
              size="sm"
              className="h-space-7 text-caption font-semibold px-space-3 radius-lg interactive-button bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-space-1"
              onClick={() => {
                if (!notif.isRead) onMarkRead(notif.id);
                window.location.href = notif.actionUrl!;
              }}
            >
              <Sparkles className="w-space-3 h-space-3 shrink-0" />
              {notif.metadata?.actionText || "Resolve issue"}
            </Button>
          )}
          {!notif.isRead && (
            <Button
              variant="ghost"
              size="sm"
              className="h-space-7 text-caption font-medium text-neutral-500 hover:text-foreground radius-lg interactive-button flex items-center gap-space-1"
              onClick={() => onMarkRead(notif.id)}
            >
              <Check className="w-space-3 h-space-3 shrink-0" />
              Mark resolved
            </Button>
          )}
          {!notif.isRead && (
            <div className="relative">
              <NativeButton
                onClick={(e) => {
                  e.stopPropagation();
                  setSnoozeMenuId(snoozeMenuId === notif.id ? null : notif.id);
                }}
                className="h-space-7 text-caption font-medium text-neutral-500 hover:text-foreground hover:bg-bg-layer-3 border border-border-subtle px-space-2.5 radius-lg flex items-center gap-space-1 transition-colors cursor-pointer"
                aria-haspopup="true"
                aria-expanded={snoozeMenuId === notif.id}
              >
                <Clock className="w-space-3.5 h-space-3.5 text-neutral-400" />
                Snooze ▾
              </NativeButton>
              {snoozeMenuId === notif.id && (
                <div
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setSnoozeMenuId(null);
                  }}
                  className="absolute left-0 mt-space-1 z-50 radius-lg border border-border-subtle bg-bg-layer-1 p-space-1 min-w-space-32 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  {[
                    { label: "15 min", minutes: 15 },
                    { label: "1 hour", minutes: 60 },
                    { label: "1 day", minutes: 1440 },
                  ].map(opt => (
                    <NativeButton
                      key={opt.minutes}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSnooze(notif.id, opt.minutes);
                        setSnoozeMenuId(null);
                      }}
                      className="w-full text-left px-space-3 py-space-1.5 hover:bg-bg-layer-2/50 radius-lg text-caption text-foreground cursor-pointer transition-colors"
                    >
                      {opt.label}
                    </NativeButton>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Absolute Dismiss (X) Button */}
      <NativeButton
        onClick={() => onDismiss(notif.id)}
        disabled={isPending}
        className="absolute top-space-4 right-space-4 p-space-1 text-neutral-400 hover:text-error-500 radius-lg hover:bg-error-50/20 cursor-pointer transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-space-3.5 h-space-3.5" />
      </NativeButton>
    </div>
  );
}

export function SmartNotificationsWidget({ notifications: initialNotifications }: ActionCenterWidgetProps) {
  const {
    notifications,
    dismiss,
    markAsRead,
    snooze,
    isPending,
  } = useSmartNotifications(initialNotifications);

  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [snoozeMenuId, setSnoozeMenuId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Click outside to close snooze dropdown handler
  useEffect(() => {
    if (snoozeMenuId === null) return;
    const handleOutsideClick = () => {
      setSnoozeMenuId(null);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [snoozeMenuId]);

  // Group by severity
  const critical = notifications.filter(n => n.severity === "critical");
  const warnings = notifications.filter(n => n.severity === "warning");
  const insights = notifications.filter(n => n.severity === "info" || n.category === "ai_improvement");

  const filteredList = 
    activeTab === "critical" ? critical :
    activeTab === "warnings" ? warnings :
    activeTab === "insights" ? insights :
    notifications;

  const displayList = filteredList.slice(0, 3);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="os-card radius-lg overflow-hidden h-full flex flex-col gradient-hero border border-border-subtle relative">
      {/* Operations center header - Matches system light design theme */}
      <div className="p-space-5 bg-bg-layer-2/50 border-b border-border-subtle flex flex-col gap-space-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-2.5">
            <div className="w-space-8 h-space-8 radius-lg bg-bg-layer-1 flex items-center justify-center border border-border-subtle">
              <TerminalSquare className="w-space-4 h-space-4 text-neutral-500" />
            </div>
            <div>
              <h2 className="text-body-md font-semibold text-foreground tracking-wide">Action Center</h2>
              <div className="flex items-center gap-space-1.5 text-caption text-neutral-500 font-medium">
                <Activity className="w-space-3 h-space-3 text-success-500" />
                System monitoring active
              </div>
            </div>
          </div>
          {unreadCount > 0 && (
            <div className="px-space-3 py-space-1 radius-full bg-primary-50 border border-primary-200 text-primary-700 text-caption font-bold animate-pulse-soft">
              {unreadCount} pending
            </div>
          )}
        </div>

        {/* Severity Tabs - Fully mapped colors */}
        <ScrollArea className="flex items-center gap-space-2 pb-space-1" vertical={false}>
                        <NativeButton
                          onClick={() => setActiveTab("all")}
                          className={`px-space-3 py-space-1.5 radius-lg text-caption font-semibold whitespace-nowrap transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none ${
                            activeTab === "all"
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-neutral-500 hover:text-foreground hover:bg-bg-layer-2/50 border border-transparent"
                          }`}
                        >
                          All Actions
                        </NativeButton>
                        <NativeButton
                          onClick={() => setActiveTab("critical")}
                          className={`px-space-3 py-space-1.5 radius-lg text-caption font-semibold whitespace-nowrap transition-colors flex items-center gap-space-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none ${
                            activeTab === "critical"
                              ? "bg-state-error-bg border border-error-500/20 text-state-error-text shadow-sm"
                              : "text-neutral-500 hover:text-foreground hover:bg-bg-layer-2/50 border border-transparent"
                          }`}
                        >
                          {critical.length > 0 && <span className="w-space-1.5 h-space-1.5 radius-full bg-error-500 animate-pulse-soft" />}
                          Critical ({critical.length})
                        </NativeButton>
                        <NativeButton
                          onClick={() => setActiveTab("warnings")}
                          className={`px-space-3 py-space-1.5 radius-lg text-caption font-semibold whitespace-nowrap transition-colors flex items-center gap-space-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none ${
                            activeTab === "warnings"
                              ? "bg-state-warning-bg border border-warning-500/20 text-state-warning-text shadow-sm"
                              : "text-neutral-500 hover:text-foreground hover:bg-bg-layer-2/50 border border-transparent"
                          }`}
                        >
                          Warnings ({warnings.length})
                        </NativeButton>
                        <NativeButton
                          onClick={() => setActiveTab("insights")}
                          className={`px-space-3 py-space-1.5 radius-lg text-caption font-semibold whitespace-nowrap transition-colors flex items-center gap-space-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none ${
                            activeTab === "insights"
                              ? "bg-state-success-bg border border-success-500/20 text-state-success-text shadow-sm"
                              : "text-neutral-500 hover:text-foreground hover:bg-bg-layer-2/50 border border-transparent"
                          }`}
                        >
                          Insights ({insights.length})
                        </NativeButton>
                      </ScrollArea>
      </div>

      {/* List */}
      <ScrollArea className="flex-1 bg-bg-layer-1/30" horizontal={false}>
                  {displayList.length === 0 ? (
                    <div className="p-space-8 flex flex-col items-center justify-center text-center h-full">
                      <div className="w-space-12 h-space-12 radius-full bg-state-success-bg flex items-center justify-center mb-space-3">
                        <CheckCircle2 className="w-space-6 h-space-6 text-state-success-text" />
                      </div>
                      <p className="text-body-sm font-semibold text-foreground">All clear</p>
                      <p className="text-caption text-neutral-500 mt-space-1">No pending actions in this category.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {displayList.map(notif => (
                        <NotificationRow
                          key={notif.id}
                          notif={notif}
                          onDismiss={dismiss}
                          onMarkRead={markAsRead}
                          onSnooze={snooze}
                          snoozeMenuId={snoozeMenuId}
                          setSnoozeMenuId={setSnoozeMenuId}
                          isPending={isPending}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>

      {/* View All Footer */}
      {filteredList.length > 3 && (
        <div className="p-space-3 bg-bg-layer-2/50 border-t border-border-subtle text-center flex items-center justify-center shrink-0">
          <NativeButton
            onClick={() => setIsModalOpen(true)}
            className="text-caption font-semibold text-primary hover:text-primary-light transition-colors cursor-pointer"
          >
            View All ({filteredList.length})
          </NativeButton>
        </div>
      )}

      {/* Modal Dialog for View All */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl flex flex-col p-0 overflow-hidden border border-border-subtle bg-background action-center-modal-content">
          <DialogHeader className="p-space-5 border-b border-border-subtle text-left">
            <DialogTitle className="text-body-md font-semibold text-foreground">
              Action Center — All Actions
            </DialogTitle>
            <p className="text-caption text-neutral-500 mt-space-1">
              Review and manage all pending suggestions and alerts.
            </p>
          </DialogHeader>

          <ScrollArea className="flex-1 p-space-4 space-y-space-3 bg-bg-layer-1/30" horizontal={false}>
                              {filteredList.map(notif => (
                                <NotificationRow
                                  key={notif.id}
                                  notif={notif}
                                  onDismiss={dismiss}
                                  onMarkRead={markAsRead}
                                  onSnooze={snooze}
                                  snoozeMenuId={snoozeMenuId}
                                  setSnoozeMenuId={setSnoozeMenuId}
                                  isPending={isPending}
                                />
                              ))}
                            </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
