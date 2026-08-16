import { db } from "../../db";
import { backgroundJobs, smartNotifications } from "../../db/schema";
import { eq, and, inArray, lte, sql, isNull } from "drizzle-orm";
import { notificationService } from "../notification";

export interface EnqueueNotificationParams {
  organizationId: string;
  type: "send_email" | "send_sms";
  payload: {
    to: string;
    subject?: string;
    body: string;
    metadata?: Record<string, any>;
  };
  scheduledFor?: Date;
  maxRetries?: number;
}

export interface QueueProcessingResult {
  processed: number;
  succeeded: number;
  failed: number;
  deadLettered: number;
}

export const notificationQueueService = {
  /**
   * Enqueues an email or SMS notification into the background jobs queue.
   */
  async enqueue(params: EnqueueNotificationParams): Promise<string> {
    const { organizationId, type, payload, scheduledFor, maxRetries = 5 } = params;

    const [job] = await db
      .insert(backgroundJobs)
      .values({
        queueName: "notifications",
        payload: {
          organizationId,
          jobType: type,
          ...payload,
        },
        status: "pending",
        attempts: 0,
        maxAttempts: maxRetries,
        runAt: scheduledFor || new Date(),
      })
      .returning();

    return job.id;
  },

  /**
   * Processes a batch of pending and retryable notification jobs from the queue.
   */
  async processBatch(batchSize: number = 20): Promise<QueueProcessingResult> {
    const now = new Date();

    // 1. Fetch eligible notification jobs
    const jobs = await db
      .select()
      .from(backgroundJobs)
      .where(
        and(
          eq(backgroundJobs.queueName, "notifications"),
          inArray(backgroundJobs.status, ["pending", "failed"]),
          lte(backgroundJobs.runAt, now),
          sql`${backgroundJobs.attempts} < ${backgroundJobs.maxAttempts}`,
          isNull(backgroundJobs.lockedAt)
        )
      )
      .limit(batchSize);

    if (jobs.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0, deadLettered: 0 };
    }

    let succeeded = 0;
    let failed = 0;
    let deadLettered = 0;

    for (const job of jobs) {
      // Lock and mark as processing
      await db
        .update(backgroundJobs)
        .set({ status: "processing", lockedAt: new Date(), updatedAt: new Date() })
        .where(eq(backgroundJobs.id, job.id));

      const payload = (job.payload || {}) as any;
      const jobType = payload.jobType || "send_email";
      const orgId = payload.organizationId;
      let isSuccess = false;
      let errorMsg = "";

      try {
        if (jobType === "send_email" || jobType === "email") {
          if (!payload.to || !payload.body) {
            throw new Error("Missing recipient or email body");
          }
          isSuccess = await notificationService.sendEmail(
            payload.to,
            payload.subject || "Notification",
            payload.body
          );
          if (!isSuccess) throw new Error("SMTP service returned failure response");
        } else if (jobType === "send_sms" || jobType === "sms") {
          if (!payload.to || !payload.body) {
            throw new Error("Missing phone number or SMS body");
          }
          isSuccess = await notificationService.sendSMS(payload.to, payload.body);
          if (!isSuccess) throw new Error("SMS provider returned failure response");
        }
      } catch (err: any) {
        isSuccess = false;
        errorMsg = err.message || "Execution exception";
      }

      if (isSuccess) {
        succeeded++;
        await db
          .update(backgroundJobs)
          .set({
            status: "completed",
            lockedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(backgroundJobs.id, job.id));
      } else {
        const nextAttempts = (job.attempts || 0) + 1;
        const maxAttempts = job.maxAttempts || 5;

        if (nextAttempts >= maxAttempts) {
          // Dead letter the job
          deadLettered++;
          await db
            .update(backgroundJobs)
            .set({
              status: "dead_letter",
              attempts: nextAttempts,
              error: errorMsg || "Exceeded maximum retry attempts",
              lockedAt: null,
              updatedAt: new Date(),
            })
            .where(eq(backgroundJobs.id, job.id));

          // Log alert to admin notifications
          if (orgId) {
            await db.insert(smartNotifications).values({
              organizationId: orgId,
              title: `Delivery Failed: ${jobType.toUpperCase()}`,
              description: `Permanent delivery failure to ${payload.to || "recipient"}: ${errorMsg}`,
              priority: "high",
              severity: "error",
              category: "alert",
              actionUrl: "/billing",
              metadata: { jobId: job.id, payload },
            });
          }
        } else {
          // Exponential backoff: 30s, 60s, 120s, 240s, 480s... max 1 hour
          failed++;
          const backoffSeconds = Math.min(3600, Math.pow(2, nextAttempts) * 30);
          const nextRunAt = new Date(Date.now() + backoffSeconds * 1000);

          await db
            .update(backgroundJobs)
            .set({
              status: "failed",
              attempts: nextAttempts,
              error: errorMsg,
              runAt: nextRunAt,
              lockedAt: null,
              updatedAt: new Date(),
            })
            .where(eq(backgroundJobs.id, job.id));
        }
      }
    }

    return {
      processed: jobs.length,
      succeeded,
      failed,
      deadLettered,
    };
  },
};
