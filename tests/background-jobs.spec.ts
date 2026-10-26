import { test, expect } from '@playwright/test';
import crypto from 'crypto';
import { db } from '../src/server/db';
import { backgroundJobs, organizations } from '../src/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { BackgroundWorker } from '../src/server/services/jobs/worker';
import { notificationQueueService } from '../src/server/services/jobs/notification-queue';

test.describe('Operator Phase 6 — Background Jobs & Distributed Workflow Reliability Suite', () => {
  const testQueue = `test_queue_${Date.now()}`;
  const validOrgId = '11111111-1111-1111-1111-111111111111';
  let worker: BackgroundWorker;

  test.beforeAll(async () => {
    worker = new BackgroundWorker();
    worker.register({
      name: testQueue,
      process: async (payload) => {
        if (payload?.shouldFail) {
          throw new Error('Simulated worker processing failure');
        }
        if (payload?.sleepMs) {
          await new Promise((resolve) => setTimeout(resolve, Number(payload.sleepMs)));
        }
      },
    });

    // Ensure valid test organization exists
    await db.insert(organizations).values({
      id: validOrgId,
      name: 'Demo Test Corporation',
      slug: 'demo-test-corporation',
      industry: 'Technology',
      email: 'demo+admin@example.com',
      phone: '15552345678',
      timezone: 'America/New_York',
      verificationStatus: 'verified',
      onboardingStatus: 'completed',
      onboardingStep: 'completed',
    }).onConflictDoNothing();
  });

  test.afterAll(async () => {
    // Cleanup jobs belonging to this test queue
    await db.delete(backgroundJobs).where(eq(backgroundJobs.queueName, testQueue));
  });

  test('Jobs A — Atomic Claim & Worker Safety: FOR UPDATE SKIP LOCKED prevents double-execution', async () => {
    const jobId1 = crypto.randomUUID();
    const jobId2 = crypto.randomUUID();

    // Insert 2 pending test jobs for our specific test queue
    await db.insert(backgroundJobs).values([
      {
        id: jobId1,
        queueName: testQueue,
        payload: { taskIndex: 1 },
        status: 'pending',
        runAt: new Date(Date.now() - 1000), // Ready to run
      },
      {
        id: jobId2,
        queueName: testQueue,
        payload: { taskIndex: 2 },
        status: 'pending',
        runAt: new Date(Date.now() - 1000), // Ready to run
      },
    ]);

    // Worker 1 claims up to 10 jobs specifically for testQueue
    const claimedByWorker1 = await worker.claimJobs(10, [testQueue]);
    const claimedIds1 = claimedByWorker1.map((j) => j.id);

    expect(claimedIds1).toContain(jobId1);
    expect(claimedIds1).toContain(jobId2);

    // Competing Worker 2 immediately attempts to claim jobs from the same queue
    const competingWorker = new BackgroundWorker();
    competingWorker.register({
      name: testQueue,
      process: async () => {},
    });

    const claimedByWorker2 = await competingWorker.claimJobs(10, [testQueue]);
    const claimedIds2 = claimedByWorker2.map((j) => j.id);

    // Worker 2 must NOT be able to claim jobId1 or jobId2 while they are locked
    expect(claimedIds2).not.toContain(jobId1);
    expect(claimedIds2).not.toContain(jobId2);
  });

  test('Jobs B — Expired Lease Recovery: Reclaims stalled jobs whose lease has expired', async () => {
    const stalledJobId = crypto.randomUUID();
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000); // Exceeds 5 min lease

    // Seed a job that was abandoned in 'processing' status 6 minutes ago
    await db.insert(backgroundJobs).values({
      id: stalledJobId,
      queueName: testQueue,
      payload: { data: 'stalled_task' },
      status: 'processing',
      lockedAt: sixMinutesAgo,
      runAt: sixMinutesAgo,
    });

    // Worker claims jobs: Must reclaim the stalled job
    const reclaimed = await worker.claimJobs(10, [testQueue]);
    const reclaimedJob = reclaimed.find((j) => j.id === stalledJobId);

    expect(reclaimedJob).toBeDefined();
    expect(reclaimedJob?.id).toBe(stalledJobId);

    // Verify in database that its lock timestamp was refreshed
    const [dbJob] = await db
      .select()
      .from(backgroundJobs)
      .where(eq(backgroundJobs.id, stalledJobId))
      .limit(1);

    expect(dbJob.status).toBe('processing');
    expect(new Date(dbJob.lockedAt!).getTime()).toBeGreaterThan(sixMinutesAgo.getTime());
  });

  test('Jobs C — Retry Limits & Terminal Failure: Transition to failed status after max_attempts', async () => {
    const failingJobId = crypto.randomUUID();

    // Seed a job on its final attempt
    await db.insert(backgroundJobs).values({
      id: failingJobId,
      queueName: testQueue,
      payload: { shouldFail: true, organizationId: validOrgId },
      status: 'pending',
      attempts: 2,
      maxAttempts: 3,
      runAt: new Date(Date.now() - 1000),
    });

    // Process jobs for testQueue
    await worker.processPendingJobs(10, [testQueue]);

    // Verify job transitioned to terminal 'failed' status in database
    const [finalJob] = await db
      .select()
      .from(backgroundJobs)
      .where(eq(backgroundJobs.id, failingJobId))
      .limit(1);

    expect(finalJob).toBeDefined();
    expect(finalJob.status).toBe('failed');
    expect(finalJob.attempts).toBe(3);
    expect(finalJob.error).toContain('Simulated worker processing failure');
  });

  test('Jobs D — Idempotency Key Deduplication: Second enqueue with identical key returns existing ID', async () => {
    const idemKey = `idem_${crypto.randomUUID()}`;

    // First enqueue
    const jobId1 = await worker.enqueue(
      testQueue,
      { action: 'sync_customer', customerId: 'cust_123' },
      { idempotencyKey: idemKey, organizationId: validOrgId }
    );

    // Second enqueue with identical idempotencyKey
    const jobId2 = await worker.enqueue(
      testQueue,
      { action: 'sync_customer', customerId: 'cust_123' },
      { idempotencyKey: idemKey, organizationId: validOrgId }
    );

    // Both IDs must match and only 1 job should exist with this key
    expect(jobId1).toBe(jobId2);

    const jobs = await db
      .select()
      .from(backgroundJobs)
      .where(sql`payload->>'idempotencyKey' = ${idemKey}`);

    expect(jobs.length).toBe(1);
    expect(jobs[0].id).toBe(jobId1);
  });

  test('Jobs E — Tenant Isolation & Authorization: Fails gracefully when tenant does not exist', async () => {
    const phantomOrgId = '00000000-0000-0000-0000-000000000000';
    
    // Enqueue a job into notifications queue with invalid tenant ID
    const jobId = await worker.enqueue(
      'notifications',
      {
        jobType: 'send_email',
        organizationId: phantomOrgId,
        to: 'target@example.com',
        body: 'Unauthorized notification',
      },
      { maxAttempts: 1 }
    );

    // Process notifications queue
    await worker.processPendingJobs(5, ['notifications']);

    // Verify job failed with tenant authorization error
    const [failedJob] = await db
      .select()
      .from(backgroundJobs)
      .where(eq(backgroundJobs.id, jobId))
      .limit(1);

    expect(failedJob).toBeDefined();
    expect(failedJob.status).toBe('failed');
    expect(failedJob.error).toContain('Tenant authorization failed');
  });

  test('Jobs F — Poison-Job & Error Isolation: A failing job does not prevent subsequent jobs in batch', async () => {
    const failingJobId = crypto.randomUUID();
    const successfulJobId = crypto.randomUUID();

    await db.insert(backgroundJobs).values([
      {
        id: failingJobId,
        queueName: testQueue,
        payload: { shouldFail: true },
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
        runAt: new Date(Date.now() - 1000),
      },
      {
        id: successfulJobId,
        queueName: testQueue,
        payload: { shouldFail: false },
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
        runAt: new Date(Date.now() - 1000),
      },
    ]);

    // Process both jobs in a single batch
    const batchResult = await worker.processPendingJobs(10, [testQueue]);

    expect(batchResult.processed).toBeGreaterThanOrEqual(2);
    expect(batchResult.failed).toBeGreaterThanOrEqual(1);
    expect(batchResult.succeeded).toBeGreaterThanOrEqual(1);

    // Verify successful job completed
    const [succJob] = await db
      .select()
      .from(backgroundJobs)
      .where(eq(backgroundJobs.id, successfulJobId))
      .limit(1);

    expect(succJob.status).toBe('completed');
  });

  test('Jobs G — Operational Queue Metrics: getQueueMetrics correctly computes backlog and status counts', async () => {
    const metrics = await worker.getQueueMetrics();

    expect(typeof metrics.pending).toBe('number');
    expect(typeof metrics.processing).toBe('number');
    expect(typeof metrics.completed).toBe('number');
    expect(typeof metrics.failed).toBe('number');
    expect(metrics.pending).toBeGreaterThanOrEqual(0);
    expect(metrics.completed).toBeGreaterThanOrEqual(1);
  });

  test('Jobs H — Unified Notification Queue Processing: notificationQueueService delegates correctly', async () => {
    const notifyId = await notificationQueueService.enqueue({
      organizationId: validOrgId,
      type: 'send_email',
      payload: {
        to: 'client@example.com',
        subject: 'Appointment Confirmed',
        body: 'Your appointment is confirmed for tomorrow.',
      },
      maxRetries: 2,
    });

    expect(notifyId).toBeDefined();

    // Verify job exists in DB under 'notifications' queue
    const [job] = await db
      .select()
      .from(backgroundJobs)
      .where(eq(backgroundJobs.id, notifyId))
      .limit(1);

    expect(job).toBeDefined();
    expect(job.queueName).toBe('notifications');
    expect(job.status).toBe('pending');
    expect(job.maxAttempts).toBe(2);

    // Process using notificationQueueService.processBatch
    const processResult = await notificationQueueService.processBatch(10);
    expect(processResult.processed).toBeGreaterThanOrEqual(1);
  });
});
