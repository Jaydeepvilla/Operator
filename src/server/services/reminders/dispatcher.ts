import { remindersRepository } from "../../repositories/reminders";
import { worker } from "../jobs/worker";
import { logger } from "@/lib/logger";

export interface DispatchRemindersResult {
  claimed: number;
  enqueued: number;
  reminderIds: string[];
}

export class ReminderDispatcherService {
  /**
   * Atomically claims due reminders and enqueues durable background worker jobs.
   * Concurrent cron runs are safe because claiming uses PostgreSQL FOR UPDATE SKIP LOCKED.
   */
  async dispatchDueReminders(
    batchSize: number = 50,
    now: Date = new Date()
  ): Promise<DispatchRemindersResult> {
    const claimedRows = await remindersRepository.claimPendingReminders(batchSize, now);

    if (claimedRows.length === 0) {
      return { claimed: 0, enqueued: 0, reminderIds: [] };
    }

    const reminderIds: string[] = [];
    let enqueuedCount = 0;

    for (const row of claimedRows) {
      const reminderId = row.id as string;
      const appointmentId = row.appointment_id as string;
      const organizationId = row.organization_id as string;
      const type = (row.type as string) || "email";

      try {
        await worker.enqueue(
          "appointment_reminders",
          {
            reminderId,
            appointmentId,
            organizationId,
            type,
          },
          {
            organizationId,
            idempotencyKey: `reminder_${reminderId}`,
            maxAttempts: 3,
          }
        );

        reminderIds.push(reminderId);
        enqueuedCount++;
      } catch (err: unknown) {
        logger.error(`Failed to enqueue appointment reminder job for reminder ${reminderId}`, {
          context: "ReminderDispatcherService",
          correlationId: reminderId,
          error: err,
        });
      }
    }

    logger.info(`Dispatched ${enqueuedCount} appointment reminder jobs`, {
      context: "ReminderDispatcherService",
      data: { claimed: claimedRows.length, enqueued: enqueuedCount },
    });

    return {
      claimed: claimedRows.length,
      enqueued: enqueuedCount,
      reminderIds,
    };
  }
}

export const reminderDispatcherService = new ReminderDispatcherService();
