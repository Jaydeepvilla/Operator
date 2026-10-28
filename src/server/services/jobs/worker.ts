import { eq, and, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { backgroundJobs, smartNotifications, organizations, appointments } from "@/server/db/schema";
import { logger } from "@/lib/logger";
import { sanitizeErrorMessage } from "@/lib/observability/redaction";
import { notificationService } from "@/server/services/notification";

export type JobPayload = Record<string, unknown>;

export interface JobDefinition<T extends JobPayload> {
  name: string;
  timeoutMs?: number;
  process: (payload: T) => Promise<void>;
}

export interface ClaimedJob {
  id: string;
  queue_name: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
  run_at: Date;
  locked_at: Date | null;
  status: string;
  error: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface EnqueueOptions {
  runAt?: Date;
  maxAttempts?: number;
  idempotencyKey?: string;
  organizationId?: string;
}

export interface QueueMetrics {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  oldestPendingAgeSeconds: number | null;
}

export class BackgroundWorker {
  private handlers = new Map<string, JobDefinition<JobPayload>>();
  private readonly LEASE_DURATION_MS = 5 * 60 * 1000; // 5 minute lock lease before recovery
  private readonly PER_JOB_TIMEOUT_MS = 25 * 1000; // 25s timeout to protect serverless budget

  constructor() {
    this.registerDefaultHandlers();
  }

  /**
   * Register standard platform queue handlers.
   */
  private registerDefaultHandlers() {
    // 1. Built-in notifications queue (emails and SMS)
    this.register({
      name: "notifications",
      process: async (payload: JobPayload) => {
        const jobType = (payload.jobType as string) || "send_email";
        const orgId = payload.organizationId as string | undefined;

        // Verify tenant exists if organizationId is present
        if (orgId) {
          const [org] = await db
            .select({ id: organizations.id })
            .from(organizations)
            .where(eq(organizations.id, orgId))
            .limit(1);

          if (!org) {
            throw new Error(`Tenant authorization failed: Organization '${orgId}' does not exist.`);
          }
        }

        if (jobType === "send_email" || jobType === "email") {
          if (!payload.to || !payload.body) {
            throw new Error("Missing recipient address or email body");
          }
          const success = await notificationService.sendEmail(
            String(payload.to),
            (payload.subject as string) || "Notification",
            String(payload.body)
          );
          if (!success) {
            throw new Error("SMTP notification delivery returned failure response");
          }
        } else if (jobType === "send_sms" || jobType === "sms") {
          if (!payload.to || !payload.body) {
            throw new Error("Missing recipient phone number or SMS body");
          }
          const success = await notificationService.sendSMS(String(payload.to), String(payload.body));
          if (!success) {
            throw new Error("SMS delivery provider returned failure response");
          }
        }
      },
    });

    // 2. Built-in website ingestion queue (long-running crawling & document chunking)
    this.register({
      name: "website_ingestion",
      timeoutMs: 120 * 1000, // 2-minute timeout for multi-page crawling
      process: async (payload: JobPayload) => {
        const orgId = String(payload.organizationId || "");
        const importId = String(payload.importId || "");
        const selectedPages = (payload.selectedPages as any[]) || [];
        const duplicateHandling = String(payload.duplicateHandling || "skip");

        if (!orgId || !importId) {
          throw new Error("Missing organizationId or importId for website_ingestion");
        }

        // Validate organization exists (tenant isolation)
        const [org] = await db
          .select({ id: organizations.id })
          .from(organizations)
          .where(eq(organizations.id, orgId))
          .limit(1);

        if (!org) {
          throw new Error(`Tenant authorization failed: Organization '${orgId}' does not exist.`);
        }

        const { WebsiteIngestionPipeline } = await import("@/server/services/crawler/ingestion");
        await WebsiteIngestionPipeline.runIngestion(orgId, importId, selectedPages, duplicateHandling);
      },
    });

    // 3. Built-in appointment reminders queue (scheduled customer notifications)
    this.register({
      name: "appointment_reminders",
      process: async (payload: JobPayload) => {
        const reminderId = String(payload.reminderId || "");
        const appointmentId = String(payload.appointmentId || "");
        const orgId = String(payload.organizationId || "");
        const type = String(payload.type || "email");

        if (!reminderId || !appointmentId) {
          throw new Error("Missing reminderId or appointmentId");
        }

        // Authoritatively verify business authorization for appointment
        if (orgId) {
          const [org] = await db
            .select({ id: organizations.id })
            .from(organizations)
            .where(eq(organizations.id, orgId))
            .limit(1);

          if (!org) {
            throw new Error(`Tenant authorization failed: Organization '${orgId}' does not exist.`);
          }

          const [apt] = await db
            .select({ id: appointments.id })
            .from(appointments)
            .where(and(eq(appointments.id, appointmentId), eq(appointments.organizationId, orgId)))
            .limit(1);

          if (!apt) {
            throw new Error(`Business authorization failed: Appointment '${appointmentId}' does not belong to organization '${orgId}'.`);
          }
        }

        const { notificationService } = await import("@/server/services/notification");
        const success = await notificationService.processReminderJob({
          reminderId,
          appointmentId,
          organizationId: orgId,
          type,
        });

        if (!success) {
          throw new Error(`Failed to send reminder ${reminderId}`);
        }
      },
    });

    // 4. Built-in daily billing reconciliation queue (Stripe and Razorpay discrepancy auditor)
    this.register({
      name: "billing_reconciliation",
      timeoutMs: 120 * 1000,
      process: async (payload: JobPayload) => {
        const { billingReconciliationService } = await import("@/server/services/billing/reconciliation");
        const batchSize = Number(payload.batchSize) || 100;
        await billingReconciliationService.runDailyReconciliation({ batchSize });
      },
    });
  }

  /**
   * Register a job handler for a specific queue name.
   */
  register<T extends JobPayload>(job: JobDefinition<T>) {
    this.handlers.set(job.name, job as unknown as JobDefinition<JobPayload>);
  }

  /**
   * Enqueue a new job with optional idempotency key, tenant ID, and custom run schedule.
   * If an idempotencyKey is supplied and a matching job is already pending or processing,
   * returns the existing job ID without creating duplicate work.
   */
  async enqueue<T extends JobPayload>(
    queueName: string,
    payload: T,
    options: EnqueueOptions = {}
  ): Promise<string> {
    const runAt = options.runAt || new Date();
    const maxAttempts = options.maxAttempts || 3;
    const idempotencyKey = options.idempotencyKey;
    const organizationId = options.organizationId || (payload as Record<string, unknown>).organizationId as string | undefined;

    // Idempotency deduplication check: Prevents duplicate enqueueing
    if (idempotencyKey) {
      const existing = await db
        .select({ id: backgroundJobs.id })
        .from(backgroundJobs)
        .where(
          and(
            eq(backgroundJobs.queueName, queueName),
            sql`status IN ('pending', 'processing')`,
            sql`payload->>'idempotencyKey' = ${idempotencyKey}`
          )
        )
        .limit(1);

      if (existing.length > 0) {
        logger.info(`Duplicate background job skipped via idempotency key: ${idempotencyKey}`, {
          context: "BackgroundWorker",
          data: { queue: queueName, idempotencyKey, event: "job_duplicate_skipped" },
        });
        return existing[0].id;
      }
    }

    const fullPayload = {
      ...payload,
      ...(idempotencyKey ? { idempotencyKey } : {}),
      ...(organizationId ? { organizationId } : {}),
    };

    const [inserted] = await db
      .insert(backgroundJobs)
      .values({
        queueName,
        payload: fullPayload,
        runAt,
        maxAttempts,
        status: "pending",
      })
      .returning({ id: backgroundJobs.id });

    return inserted.id;
  }

  /**
   * Atomically claims pending or expired-lease jobs using PostgreSQL row-level locking (FOR UPDATE SKIP LOCKED).
   * Supports queue-name filtering to ensure workers only claim jobs they possess handlers for.
   */
  async claimJobs(limit = 10, queueNames?: string[], organizationId?: string): Promise<ClaimedJob[]> {
    const nowIso = new Date().toISOString();
    const leaseCutoffIso = new Date(Date.now() - this.LEASE_DURATION_MS).toISOString();

    // 1. Reconcile any dead abandoned jobs that exceeded max_attempts while stalled
    await this.reconcileDeadLeases(leaseCutoffIso);

    // 2. Build queue filter condition
    const targetQueues = queueNames && queueNames.length > 0 
      ? queueNames 
      : Array.from(this.handlers.keys());

    const queueCondition = targetQueues.length > 0
      ? sql`AND queue_name IN (${sql.join(targetQueues.map(q => sql`${q}`), sql`, `)})`
      : sql``;

    const tenantCondition = organizationId
      ? sql`AND payload->>'organizationId' = ${organizationId}`
      : sql``;

    // 3. Atomic CTE claim
    const result = await db.execute(sql`
      WITH claimable AS (
        SELECT id FROM background_jobs
        WHERE (
          (
            (status = 'pending' AND run_at <= ${nowIso}::timestamp AND (locked_at IS NULL OR locked_at <= ${leaseCutoffIso}::timestamp))
            OR
            (status = 'processing' AND locked_at <= ${leaseCutoffIso}::timestamp)
          )
          AND attempts < max_attempts
          ${queueCondition}
          ${tenantCondition}
        )
        ORDER BY run_at ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE background_jobs
      SET status = 'processing',
          locked_at = ${nowIso}::timestamp,
          attempts = attempts + 1,
          updated_at = ${nowIso}::timestamp
      FROM claimable
      WHERE background_jobs.id = claimable.id
      RETURNING 
        background_jobs.id,
        background_jobs.queue_name,
        background_jobs.payload,
        background_jobs.attempts,
        background_jobs.max_attempts,
        background_jobs.run_at,
        background_jobs.locked_at,
        background_jobs.status,
        background_jobs.error,
        background_jobs.created_at,
        background_jobs.updated_at;
    `);

    return (result || []) as unknown as ClaimedJob[];
  }

  /**
   * Reconciles expired leases for jobs that hit max_attempts while crashing or stalling.
   */
  private async reconcileDeadLeases(leaseCutoffIso: string) {
    try {
      await db.execute(sql`
        UPDATE background_jobs
        SET status = 'failed',
            error = 'Worker lease expired after reaching maximum execution attempts',
            locked_at = NULL,
            updated_at = NOW()
        WHERE status = 'processing'
          AND locked_at <= ${leaseCutoffIso}::timestamp
          AND attempts >= max_attempts;
      `);
    } catch {
      // Non-blocking maintenance failure
    }
  }

  /**
   * Process pending jobs. Intended to be called by a cron route or worker runner.
   * Wraps each job execution with a timeout to prevent single hanging tasks from exhausting
   * the serverless invocation budget.
   */
  async processPendingJobs(limit = 10, queueNames?: string[], organizationId?: string) {
    const claimedJobs = await this.claimJobs(limit, queueNames, organizationId);

    if (claimedJobs.length === 0) {
      return { processed: 0, failed: 0, succeeded: 0 };
    }

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const job of claimedJobs) {
      const queueName = job.queue_name;
      const handler = this.handlers.get(queueName);
      const startTime = Date.now();
      processed++;

      if (!handler) {
        logger.error(`No handler registered for queue: ${queueName}`, {
          context: "BackgroundWorker",
          correlationId: job.id,
          data: { queue: queueName, event: "job_handler_missing" },
        });

        await db
          .update(backgroundJobs)
          .set({
            status: "failed",
            error: `No handler found for queue: ${queueName}`,
            lockedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(backgroundJobs.id, job.id));
        failed++;
        continue;
      }

      try {
        // Enforce per-job execution timeout to protect batch from hanging
        const jobTimeoutMs = handler.timeoutMs || this.PER_JOB_TIMEOUT_MS;
        let timeoutHandle: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(new Error(`Execution timeout: Job exceeded limit of ${jobTimeoutMs}ms`));
          }, jobTimeoutMs);
        });

        await Promise.race([handler.process(job.payload as JobPayload), timeoutPromise]).finally(() => {
          clearTimeout(timeoutHandle!);
        });

        await db
          .update(backgroundJobs)
          .set({
            status: "completed",
            error: null,
            lockedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(backgroundJobs.id, job.id));

        succeeded++;

        logger.info(`Background job '${queueName}' completed successfully`, {
          context: "BackgroundWorker",
          correlationId: job.id,
          durationMs: Date.now() - startTime,
          data: { queue: queueName, attempts: job.attempts, event: "job_completed" },
        });
      } catch (error: unknown) {
        const currentAttempts = Number(job.attempts || 0);
        const maxAttempts = Number(job.max_attempts || 3);
        const err = error as Error;
        const rawMessage = err?.message || "Unknown worker processing error";
        const sanitizedMessage = sanitizeErrorMessage(rawMessage);
        const durationMs = Date.now() - startTime;
        const orgId = (job.payload as Record<string, unknown>)?.organizationId as string | undefined;

        if (currentAttempts >= maxAttempts) {
          // Terminal failure: Log error to Sentry & record in smartNotifications if tenant-associated
          logger.error(`Background job '${queueName}' reached terminal failure (${currentAttempts}/${maxAttempts}): ${sanitizedMessage}`, {
            context: "BackgroundWorker",
            correlationId: job.id,
            durationMs,
            error,
            data: { queue: queueName, attempts: currentAttempts, maxAttempts, event: "job_terminal_failure" },
          });

          await db
            .update(backgroundJobs)
            .set({
              status: "failed",
              error: sanitizedMessage,
              attempts: currentAttempts,
              lockedAt: null,
              updatedAt: new Date(),
            })
            .where(eq(backgroundJobs.id, job.id));

          // Post diagnostic alert for tenant if applicable
          if (orgId) {
            try {
              await db.insert(smartNotifications).values({
                organizationId: orgId,
                title: `Background Task Failed: ${queueName}`,
                description: `A background job reached maximum retries (${maxAttempts}) and could not complete: ${sanitizedMessage}`,
                priority: "high",
                severity: "error",
                category: "alert",
                actionUrl: "/settings",
                metadata: { jobId: job.id, queue: queueName, attempts: currentAttempts },
              });
            } catch {}
          }
        } else {
          // Retryable failure: Schedule with exponential backoff
          logger.warn(`Background job '${queueName}' attempt ${currentAttempts}/${maxAttempts} failed, retrying: ${sanitizedMessage}`, {
            context: "BackgroundWorker",
            correlationId: job.id,
            durationMs,
            error,
            data: { queue: queueName, attempts: currentAttempts, maxAttempts, event: "job_retry_scheduled" },
          });

          // Exponential backoff: 15s, 30s, 60s, max 1 hour
          const backoffDelaySeconds = Math.min(3600, Math.pow(2, currentAttempts) * 15);
          const nextRunAt = new Date(Date.now() + backoffDelaySeconds * 1000);

          await db
            .update(backgroundJobs)
            .set({
              status: "pending",
              lockedAt: null,
              error: sanitizedMessage,
              attempts: currentAttempts,
              runAt: nextRunAt,
              updatedAt: new Date(),
            })
            .where(eq(backgroundJobs.id, job.id));
        }
        failed++;
      }
    }

    return { processed, succeeded, failed };
  }

  /**
   * Retrieves operational health and backlog metrics for the background jobs queue.
   */
  async getQueueMetrics(organizationId?: string): Promise<QueueMetrics> {
    const now = new Date();

    const tenantFilter = organizationId
      ? sql`WHERE payload->>'organizationId' = ${organizationId}`
      : sql``;

    const counts = await db.execute(sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
        COUNT(*) FILTER (WHERE status = 'processing') AS processing_count,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
        MIN(run_at) FILTER (WHERE status = 'pending' AND run_at <= ${now.toISOString()}::timestamp) AS oldest_pending_run_at
      FROM background_jobs
      ${tenantFilter};
    `);

    const row = (counts[0] || {}) as Record<string, unknown>;
    const oldestRunAt = row.oldest_pending_run_at ? new Date(row.oldest_pending_run_at as string) : null;
    const oldestPendingAgeSeconds = oldestRunAt 
      ? Math.max(0, Math.round((now.getTime() - oldestRunAt.getTime()) / 1000))
      : null;

    return {
      pending: Number(row.pending_count || 0),
      processing: Number(row.processing_count || 0),
      completed: Number(row.completed_count || 0),
      failed: Number(row.failed_count || 0),
      oldestPendingAgeSeconds,
    };
  }
}

export const worker = new BackgroundWorker();
