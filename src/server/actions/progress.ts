"use server";

import { revalidatePath } from "next/cache";
import { NotificationEngine } from "@/lib/notification-engine";

export async function dismissNotificationAction(notificationId: string) {
  try {
    await NotificationEngine.dismiss(notificationId);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to dismiss notification:", error);
    return { success: false, error: error.message };
  }
}

export async function markNotificationAsReadAction(notificationId: string) {
  try {
    await NotificationEngine.markAsRead(notificationId);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to mark notification as read:", error);
    return { success: false, error: error.message };
  }
}

export async function snoozeNotificationAction(notificationId: string, minutes: number) {
  try {
    const until = new Date(Date.now() + minutes * 60 * 1000);
    await NotificationEngine.snooze(notificationId, until);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to snooze notification:", error);
    return { success: false, error: error.message };
  }
}
