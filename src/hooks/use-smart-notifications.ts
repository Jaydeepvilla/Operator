import { useState, useTransition, useMemo } from "react";
import { SmartNotification } from "@/lib/notification-engine/types";
import { groupNotifications } from "@/lib/notification-engine/utils";
import {
  dismissNotificationAction,
  markNotificationAsReadAction,
  snoozeNotificationAction,
} from "@/server/actions/progress";

export function useSmartNotifications(initialNotifications: SmartNotification[]) {
  const [notifications, setNotifications] = useState<SmartNotification[]>(initialNotifications);
  const [isPending, startTransition] = useTransition();

  // Optimistically dismiss a notification
  const dismiss = (id: string) => {
    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    startTransition(async () => {
      const res = await dismissNotificationAction(id);
      if (!res.success) {
        // Rollback on failure
        setNotifications(initialNotifications);
      }
    });
  };

  // Optimistically mark a notification as read
  const markAsRead = (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );

    startTransition(async () => {
      const res = await markNotificationAsReadAction(id);
      if (!res.success) {
        // Rollback on failure
        setNotifications(initialNotifications);
      }
    });
  };

  // Optimistically snooze a notification
  const snooze = (id: string, minutes: number) => {
    const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000);
    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    startTransition(async () => {
      const res = await snoozeNotificationAction(id, minutes);
      if (!res.success) {
        // Rollback on failure
        setNotifications(initialNotifications);
      }
    });
  };

  // Compute grouped views from current state
  const grouped = useMemo(() => {
    return groupNotifications(notifications);
  }, [notifications]);

  return {
    notifications,
    grouped,
    isPending,
    dismiss,
    markAsRead,
    snooze,
  };
}
