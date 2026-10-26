import { eq, and, lte, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { appointmentReminders } from "../db/schema";

export interface NewAppointmentReminder {
  organizationId: string;
  appointmentId: string;
  type: "email" | "sms";
  sendAt: Date;
  status?: string;
}

export const remindersRepository = {
  async getById(id: string) {
    const [reminder] = await db
      .select()
      .from(appointmentReminders)
      .where(eq(appointmentReminders.id, id))
      .limit(1);
    return reminder || null;
  },

  async listPending(now: Date = new Date()) {
    return db
      .select()
      .from(appointmentReminders)
      .where(
        and(
          eq(appointmentReminders.status, "pending"),
          lte(appointmentReminders.sendAt, now)
        )
      );
  },

  /**
   * Atomically claims due pending reminders using FOR UPDATE SKIP LOCKED.
   * Also reclaims abandoned reminders left in 'processing' for over 5 minutes.
   */
  async claimPendingReminders(limit: number = 50, now: Date = new Date()) {
    const staleThreshold = new Date(now.getTime() - 5 * 60 * 1000);
    const nowIso = now.toISOString();
    const staleThresholdIso = staleThreshold.toISOString();

    return await db.transaction(async (tx) => {
      const result = await tx.execute(
        sql`SELECT id, organization_id, appointment_id, type, send_at, status 
            FROM appointment_reminders 
            WHERE (status = 'pending' AND send_at <= ${nowIso}::timestamp)
               OR (status = 'processing' AND updated_at < ${staleThresholdIso}::timestamp)
            ORDER BY send_at ASC 
            LIMIT ${limit} 
            FOR UPDATE SKIP LOCKED`
      );

      const rows = ((result as any).rows || result) as any[];
      if (rows.length > 0) {
        const ids = rows.map((r) => r.id);
        await tx
          .update(appointmentReminders)
          .set({ status: "processing", updatedAt: new Date() })
          .where(inArray(appointmentReminders.id, ids));
      }
      return rows;
    });
  },

  async create(reminder: NewAppointmentReminder) {
    const [newReminder] = await db.insert(appointmentReminders).values(reminder).returning();
    return newReminder;
  },

  async update(id: string, updates: Partial<NewAppointmentReminder>) {
    const [updated] = await db
      .update(appointmentReminders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(appointmentReminders.id, id))
      .returning();
    return updated;
  },

  async deleteByAppointment(appointmentId: string) {
    await db
      .delete(appointmentReminders)
      .where(eq(appointmentReminders.appointmentId, appointmentId));
  },

  async listByOrganization(organizationId: string) {
    return db
      .select()
      .from(appointmentReminders)
      .where(eq(appointmentReminders.organizationId, organizationId));
  }
};
