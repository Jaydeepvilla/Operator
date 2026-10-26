import { worker } from "./worker";

export interface EnqueueNotificationParams {
  organizationId: string;
  type: "send_email" | "send_sms";
  payload: {
    to: string;
    subject?: string;
    body: string;
    metadata?: Record<string, unknown>;
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
   * Utilizes BackgroundWorker with idempotency deduplication and structured payload.
   */
  async enqueue(params: EnqueueNotificationParams): Promise<string> {
    const { organizationId, type, payload, scheduledFor, maxRetries = 5 } = params;

    const jobId = await worker.enqueue(
      "notifications",
      {
        organizationId,
        jobType: type,
        ...payload,
      },
      {
        organizationId,
        runAt: scheduledFor,
        maxAttempts: maxRetries,
        idempotencyKey: payload.metadata?.idempotencyKey as string | undefined,
      }
    );

    return jobId;
  },

  /**
   * Processes a batch of pending and retryable notification jobs from the queue.
   * Delegates to unified BackgroundWorker with FOR UPDATE SKIP LOCKED atomic claiming,
   * lease recovery, and per-job timeout enforcement.
   */
  async processBatch(batchSize: number = 20): Promise<QueueProcessingResult> {
    const result = await worker.processPendingJobs(batchSize, ["notifications"]);

    return {
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      deadLettered: 0,
    };
  },
};

