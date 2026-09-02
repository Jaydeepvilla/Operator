import { eq, desc, and, isNull } from "drizzle-orm";
import { db } from "../db";
import { smartNotifications } from "../db/schema";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type NotificationRecord = InferSelectModel<typeof smartNotifications>;
export type NewNotification = InferInsertModel<typeof smartNotifications>;

export const notificationRepository = {
  async create(data: NewNotification) {
    const [notification] = await db.insert(smartNotifications).values(data).returning();
    return notification;
  },

  async list(organizationId: string, limit = 50) {
    const records = await db
      .select()
      .from(smartNotifications)
      .where(
        and(
          eq(smartNotifications.organizationId, organizationId),
          eq(smartNotifications.isDismissed, false)
        )
      )
      .orderBy(desc(smartNotifications.createdAt))
      .limit(limit);

    // Filter out and auto-dismiss legacy fake mock notifications (e.g. "Add FAQ: Pets", "Don't Forget: ...")
    const valid: NotificationRecord[] = [];
    const fakeIds: string[] = [];

    for (const r of records) {
      if (
        r.title.startsWith("Add FAQ:") ||
        r.title.startsWith("Don't Forget:") ||
        (r.metadata as any)?.sourceEngine === "knowledge" ||
        (r.metadata as any)?.ruleId?.startsWith("knowledge-outdated") ||
        (r.metadata as any)?.ruleId?.startsWith("setup-remaining")
      ) {
        fakeIds.push(r.id);
      } else {
        valid.push(r);
      }
    }

    if (fakeIds.length > 0) {
      // Async auto-dismiss legacy noisy rows in background
      Promise.all(fakeIds.map((id) => this.dismiss(id))).catch((err) =>
        console.warn("Error purging legacy notifications:", err)
      );
    }

    return valid;
  },

  async markAsRead(id: string) {
    const [notification] = await db
      .update(smartNotifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(eq(smartNotifications.id, id))
      .returning();
    return notification;
  },

  async dismiss(id: string) {
    const [notification] = await db
      .update(smartNotifications)
      .set({ isDismissed: true, updatedAt: new Date() })
      .where(eq(smartNotifications.id, id))
      .returning();
    return notification;
  },

  async snooze(id: string, until: Date) {
    const [notification] = await db
      .update(smartNotifications)
      .set({ snoozeUntil: until, updatedAt: new Date() })
      .where(eq(smartNotifications.id, id))
      .returning();
    return notification;
  },
};
