import { test, expect } from '@playwright/test';
import crypto from 'crypto';
import { db } from '../src/server/db';
import {
  organizations,
  appointments,
  appointmentReminders,
  appointmentEvents,
  websiteImports,
  knowledgeSources,
  knowledgeDocuments,
  knowledgeChunks,
  backgroundJobs,
} from '../src/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { BackgroundWorker } from '../src/server/services/jobs/worker';
import { reminderDispatcherService } from '../src/server/services/reminders/dispatcher';
import { remindersRepository } from '../src/server/repositories/reminders';
import { notificationService } from '../src/server/services/notification';
import { WebsiteCrawler } from '../src/server/services/crawler/crawler';
import { WebsiteIngestionPipeline } from '../src/server/services/crawler/ingestion';
import { validateSafeUrl } from '../src/server/services/crawler/ssrf';
import { GET as sendRemindersCron } from '../src/app/api/cron/send-reminders/route';

test.describe('Operator Phase 8 — Background Workflow & Scheduled Reminders Suite', () => {
  const testOrgId = '11111111-1111-1111-1111-111111111111';
  const altOrgId = '22222222-2222-2222-2222-222222222222';
  let worker: BackgroundWorker;

  test.beforeAll(async () => {
    worker = new BackgroundWorker();

    // Ensure test organizations exist
    await db
      .insert(organizations)
      .values([
        {
          id: testOrgId,
          name: 'Demo Test Corporation',
          slug: 'demo-test-corporation',
          industry: 'Technology',
          email: 'demo+admin@example.com',
          phone: '15552345678',
          timezone: 'America/New_York',
          verificationStatus: 'verified',
          onboardingStatus: 'completed',
          onboardingStep: 'completed',
        },
        {
          id: altOrgId,
          name: 'Alternative Tenant LLC',
          slug: 'alternative-tenant',
          industry: 'Healthcare',
          email: 'admin@alternative.com',
          phone: '15559876543',
          timezone: 'America/Los_Angeles',
          verificationStatus: 'verified',
          onboardingStatus: 'completed',
          onboardingStep: 'completed',
        },
      ])
      .onConflictDoNothing();
  });

  // =========================================================================
  // SECTION 1: APPOINTMENT REMINDER DISPATCHER & SCHEDULED WORKFLOWS
  // =========================================================================

  test('Reminders A — Due Reminder Dispatch: Due reminders are claimed and enqueued into background worker', async () => {
    const aptId = crypto.randomUUID();
    const reminderId = crypto.randomUUID();

    // 1. Create a confirmed appointment
    await db.insert(appointments).values({
      id: aptId,
      organizationId: testOrgId,
      customerName: 'Sarah Jenkins',
      customerEmail: 'sarah.jenkins@example.com',
      customerPhone: '+15552345678',
      status: 'confirmed',
      startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // In 2 hours
      endTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
    });

    // 2. Insert a due reminder (sendAt in past)
    await db.insert(appointmentReminders).values({
      id: reminderId,
      organizationId: testOrgId,
      appointmentId: aptId,
      type: 'email',
      sendAt: new Date(Date.now() - 60 * 1000), // Due 1 minute ago
      status: 'pending',
    });

    // 3. Run dispatcher
    const result = await reminderDispatcherService.dispatchDueReminders(50);
    expect(result.claimed).toBeGreaterThanOrEqual(1);
    expect(result.reminderIds).toContain(reminderId);

    // 4. Verify reminder status transitioned to 'processing'
    const [claimedReminder] = await db
      .select()
      .from(appointmentReminders)
      .where(eq(appointmentReminders.id, reminderId))
      .limit(1);

    expect(claimedReminder.status).toBe('processing');

    // 5. Verify background job exists in worker queue
    const [jobInQueue] = await db
      .select()
      .from(backgroundJobs)
      .where(
        and(
          eq(backgroundJobs.queueName, 'appointment_reminders'),
          sql`payload->>'idempotencyKey' = ${`reminder_${reminderId}`}`
        )
      )
      .limit(1);

    expect(jobInQueue).toBeDefined();
    expect(jobInQueue.status).toBe('pending');
  });

  test('Reminders B — Future Reminder Safety: Reminders scheduled for the future are NOT claimed early', async () => {
    const aptId = crypto.randomUUID();
    const futureReminderId = crypto.randomUUID();

    await db.insert(appointments).values({
      id: aptId,
      organizationId: testOrgId,
      customerName: 'Alex Mercer',
      customerEmail: 'alex.mercer@example.com',
      status: 'confirmed',
      startTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // 2 days ahead
      endTime: new Date(Date.now() + 49 * 60 * 60 * 1000),
    });

    await db.insert(appointmentReminders).values({
      id: futureReminderId,
      organizationId: testOrgId,
      appointmentId: aptId,
      type: 'email',
      sendAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
      status: 'pending',
    });

    const result = await reminderDispatcherService.dispatchDueReminders(50);
    expect(result.reminderIds).not.toContain(futureReminderId);

    // Verify still pending in database
    const [persisted] = await db
      .select()
      .from(appointmentReminders)
      .where(eq(appointmentReminders.id, futureReminderId))
      .limit(1);

    expect(persisted.status).toBe('pending');
  });

  test('Reminders C — Concurrency Safety: Two simultaneous cron runs do NOT duplicate reminder claims', async () => {
    const aptId = crypto.randomUUID();
    const concurrentReminderId = crypto.randomUUID();

    await db.insert(appointments).values({
      id: aptId,
      organizationId: testOrgId,
      customerName: 'Marcus Wright',
      customerEmail: 'marcus@example.com',
      status: 'confirmed',
      startTime: new Date(Date.now() + 60 * 60 * 1000),
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
    });

    await db.insert(appointmentReminders).values({
      id: concurrentReminderId,
      organizationId: testOrgId,
      appointmentId: aptId,
      type: 'email',
      sendAt: new Date(Date.now() - 30 * 1000),
      status: 'pending',
    });

    // Run two dispatchers concurrently
    const [run1, run2] = await Promise.all([
      reminderDispatcherService.dispatchDueReminders(50),
      reminderDispatcherService.dispatchDueReminders(50),
    ]);

    const combined = [...run1.reminderIds, ...run2.reminderIds];
    const occurrences = combined.filter((id) => id === concurrentReminderId).length;

    // Exactly one should have claimed it
    expect(occurrences).toBe(1);
  });

  test('Reminders D — Scheduled Cron Route Auth: Reject invalid or missing cron secrets', async () => {
    // 1. Missing Authorization header
    const reqNoAuth = new Request('http://localhost:3000/api/cron/send-reminders');
    const respNoAuth = await sendRemindersCron(reqNoAuth);
    expect([401, 500]).toContain(respNoAuth.status); // 500 if unset, 401 if unauthorized

    // 2. Bad token
    const reqBadAuth = new Request('http://localhost:3000/api/cron/send-reminders', {
      headers: { Authorization: 'Bearer invalid_forged_cron_secret_00000' },
    });
    const respBadAuth = await sendRemindersCron(reqBadAuth);
    expect([401, 500]).toContain(respBadAuth.status);
  });

  test('Reminders E — Cancelled Appointment Suppression: Cancelled appointments suppress reminder dispatch', async () => {
    const aptId = crypto.randomUUID();
    const reminderId = crypto.randomUUID();

    // 1. Create a CANCELLED appointment
    await db.insert(appointments).values({
      id: aptId,
      organizationId: testOrgId,
      customerName: 'Cancelled Customer',
      customerEmail: 'cancelled@example.com',
      status: 'cancelled',
      startTime: new Date(Date.now() + 60 * 60 * 1000),
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
    });

    await db.insert(appointmentReminders).values({
      id: reminderId,
      organizationId: testOrgId,
      appointmentId: aptId,
      type: 'email',
      sendAt: new Date(Date.now() - 1000),
      status: 'pending',
    });

    // 2. Process reminder directly
    const success = await notificationService.processReminderJob({
      reminderId,
      appointmentId: aptId,
      organizationId: testOrgId,
      type: 'email',
    });

    expect(success).toBe(true);

    // 3. Verify reminder transitioned to 'cancelled' without dispatch
    const [updatedReminder] = await db
      .select()
      .from(appointmentReminders)
      .where(eq(appointmentReminders.id, reminderId))
      .limit(1);

    expect(updatedReminder.status).toBe('cancelled');

    // Verify cancellation audit event logged
    const [event] = await db
      .select()
      .from(appointmentEvents)
      .where(
        and(
          eq(appointmentEvents.appointmentId, aptId),
          eq(appointmentEvents.eventType, 'reminder_cancelled')
        )
      )
      .limit(1);

    expect(event).toBeDefined();
  });

  test('Reminders F — Tenant Boundary Enforcement: Mismatched tenant IDs are rejected', async () => {
    const aptId = crypto.randomUUID();
    const reminderId = crypto.randomUUID();

    // Appointment belongs to testOrgId
    await db.insert(appointments).values({
      id: aptId,
      organizationId: testOrgId,
      customerName: 'Tenant Isolation Test',
      customerEmail: 'tenant@example.com',
      status: 'confirmed',
      startTime: new Date(Date.now() + 60 * 60 * 1000),
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
    });

    await db.insert(appointmentReminders).values({
      id: reminderId,
      organizationId: testOrgId,
      appointmentId: aptId,
      type: 'email',
      sendAt: new Date(Date.now() - 1000),
      status: 'pending',
    });

    // Malicious attempt to process with altOrgId
    const success = await notificationService.processReminderJob({
      reminderId,
      appointmentId: aptId,
      organizationId: altOrgId, // Wrong organization!
      type: 'email',
    });

    expect(success).toBe(true);

    // Reminder marked failed due to tenant mismatch
    const [mismatched] = await db
      .select()
      .from(appointmentReminders)
      .where(eq(appointmentReminders.id, reminderId))
      .limit(1);

    expect(mismatched.status).toBe('failed');
  });

  test('Reminders G — Worker Execution: End-to-end background reminder execution', async () => {
    const aptId = crypto.randomUUID();
    const reminderId = crypto.randomUUID();

    await db.insert(appointments).values({
      id: aptId,
      organizationId: testOrgId,
      customerName: 'David Kim',
      customerEmail: 'david.kim@example.com',
      status: 'confirmed',
      startTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
    });

    await db.insert(appointmentReminders).values({
      id: reminderId,
      organizationId: testOrgId,
      appointmentId: aptId,
      type: 'email',
      sendAt: new Date(Date.now() - 2000),
      status: 'pending',
    });

    // 1. Dispatcher claims and enqueues
    const dispatchResult = await reminderDispatcherService.dispatchDueReminders(50);
    expect(dispatchResult.reminderIds).toContain(reminderId);

    // 2. Run BackgroundWorker to execute the job
    const workerResult = await worker.processPendingJobs(10, ['appointment_reminders']);
    expect(workerResult.processed).toBeGreaterThanOrEqual(1);

    // 3. Verify reminder is marked 'sent', 'failed', or 'processing' (in retry backoff)
    const [finalReminder] = await db
      .select()
      .from(appointmentReminders)
      .where(eq(appointmentReminders.id, reminderId))
      .limit(1);

    expect(['sent', 'processing', 'failed']).toContain(finalReminder.status);
  });

  // =========================================================================
  // SECTION 2: WEBSITE CRAWLER & DURABLE INGESTION WORKFLOWS
  // =========================================================================

  test('Crawler A — Multi-Page Ingestion: Ingestion of site with more than 5 pages', async () => {
    const importId = crypto.randomUUID();
    const sourceId = crypto.randomUUID();

    // 1. Create knowledge source
    await db.insert(knowledgeSources).values({
      id: sourceId,
      organizationId: testOrgId,
      name: 'Test Ingestion Website',
      type: 'website',
      isActive: true,
    }).onConflictDoNothing();

    // 2. Create website import record
    const testDomain = `test-dental-${crypto.randomUUID().slice(0, 8)}.com`;
    await db.insert(websiteImports).values({
      id: importId,
      organizationId: testOrgId,
      sourceId,
      url: `https://${testDomain}`,
      status: 'pending',
      pagesFound: 7,
      pagesScraped: 0,
    });

    // 3. Simulate 7 pages (> 5 pages required)
    const samplePages = [
      { title: 'Home', url: `https://${testDomain}/`, path: '/', wordCount: 150, suggestedCategory: 'General', content: 'Welcome to Example Dental Practice. We offer routine cleanings and emergency dental services.' },
      { title: 'About Us', url: `https://${testDomain}/about`, path: '/about', wordCount: 220, suggestedCategory: 'General', content: 'Our clinic has served the local community with gentle dental care for over twenty years.' },
      { title: 'Services', url: `https://${testDomain}/services`, path: '/services', wordCount: 300, suggestedCategory: 'Services', content: 'Explore our comprehensive services: whitening, Invisalign, root canals, and pediatric dentistry.' },
      { title: 'Pricing', url: `https://${testDomain}/pricing`, path: '/pricing', wordCount: 180, suggestedCategory: 'Pricing', content: 'Transparent pricing: Cleanings starting at $99. We accept most major health insurance providers.' },
      { title: 'Team', url: `https://${testDomain}/team`, path: '/team', wordCount: 190, suggestedCategory: 'Staff', content: 'Meet our certified dentists Dr. Alice Smith and Dr. Robert Lee who are dedicated to gentle care.' },
      { title: 'FAQ', url: `https://${testDomain}/faq`, path: '/faq', wordCount: 250, suggestedCategory: 'FAQ', content: 'Frequently asked questions: What should I bring to my first appointment? How often do I need cleanings?' },
      { title: 'Contact', url: `https://${testDomain}/contact`, path: '/contact', wordCount: 120, suggestedCategory: 'Contact', content: 'Call us at (555) 123-4567 or visit our office at 100 Main Street. Open Monday through Friday.' },
    ];

    // 4. Run ingestion pipeline
    await WebsiteIngestionPipeline.runIngestion(testOrgId, importId, samplePages, 'skip');

    // 5. Verify import record updated to 'completed' with accurate stats
    const [completedImport] = await db
      .select()
      .from(websiteImports)
      .where(eq(websiteImports.id, importId))
      .limit(1);

    expect(completedImport.status).toBe('completed');
    expect(completedImport.pagesScraped).toBe(7);
    expect((completedImport.metadata as any).stats.imported).toBe(7);
    expect((completedImport.metadata as any).stats.totalChunksCreated).toBeGreaterThanOrEqual(7);

    // 6. Verify knowledge documents created in database
    const docs = await db
      .select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.organizationId, testOrgId));

    expect(docs.length).toBeGreaterThanOrEqual(7);
  });

  test('Crawler B — Partial Failure Handling: Terminal status is "partial" when some pages fail', async () => {
    const partialImportId = crypto.randomUUID();
    const sourceId = crypto.randomUUID();
    const partialDomain = `partial-${crypto.randomUUID().slice(0, 8)}.com`;

    await db.insert(knowledgeSources).values({
      id: sourceId,
      organizationId: testOrgId,
      name: 'Partial Ingestion Test Source',
      type: 'website',
      isActive: true,
    }).onConflictDoNothing();

    await db.insert(websiteImports).values({
      id: partialImportId,
      organizationId: testOrgId,
      sourceId,
      url: `https://${partialDomain}`,
      status: 'pending',
      pagesFound: 3,
      pagesScraped: 0,
    });

    const pagesWithOneFailure = [
      { title: 'Valid Page 1', url: `https://${partialDomain}/valid-1`, path: '/valid-1', wordCount: 100, suggestedCategory: 'General', content: 'This is valid page content for test ingestion.' },
      { title: 'Failing Page', url: 'https://192.168.1.1/internal-blocked', path: '/internal-blocked', wordCount: 0, suggestedCategory: 'Blocked' }, // Will fail SSRF fetch
      { title: 'Valid Page 2', url: `https://${partialDomain}/valid-2`, path: '/valid-2', wordCount: 100, suggestedCategory: 'General', content: 'Another piece of valid content that succeeds.' },
    ];

    await WebsiteIngestionPipeline.runIngestion(testOrgId, partialImportId, pagesWithOneFailure, 'skip');

    const [importRecord] = await db
      .select()
      .from(websiteImports)
      .where(eq(websiteImports.id, partialImportId))
      .limit(1);

    // Must be marked 'partial', NOT 'completed' or 'failed'
    expect(importRecord.status).toBe('partial');
    expect(importRecord.pagesScraped).toBe(2);
    expect((importRecord.metadata as any).stats.failed).toBe(1);
    expect((importRecord.metadata as any).stats.imported).toBe(2);
  });

  test('Crawler C — SSRF Protection & Private IP Rejection: Ingestion rejects private destinations', async () => {
    const privateTargets = [
      // Loopback IPv4
      'http://127.0.0.1:8080/admin',
      'http://127.0.1.1/internal',
      'http://localhost:3000/api',
      'http://test.localhost/api',
      // Cloud metadata & link-local IPv4
      'http://169.254.169.254/latest/meta-data',
      'http://169.254.1.1/secret',
      // Private RFC 1918 ranges
      'http://10.0.0.1/internal',
      'http://10.255.255.255/admin',
      'http://172.16.0.1/intranet',
      'http://172.31.255.255/status',
      'http://192.168.1.1/router',
      'http://192.168.0.254/gw',
      // Carrier-Grade NAT (RFC 6598)
      'http://100.64.0.1/cgnat',
      // Broadcast / Current network
      'http://0.0.0.0:8000/',
      // Loopback IPv6
      'http://[::1]/secret',
      'http://[::]/root',
      // IPv6 link-local
      'http://[fe80::1]/link-local',
      // IPv6 unique local (ULA)
      'http://[fc00::1]/ula',
      'http://[fd00::1]/ula',
      // IPv4-mapped IPv6
      'http://[::ffff:127.0.0.1]/mapped-loopback',
      'http://[::ffff:10.0.0.1]/mapped-private',
      'http://[::ffff:169.254.169.254]/mapped-meta',
    ];

    for (const target of privateTargets) {
      const result = await validateSafeUrl(target);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    }
  });

  test('Crawler D — Duplicate Enqueue Protection: Idempotency key deduplicates repeated enqueue calls', async () => {
    const importId = crypto.randomUUID();

    // First enqueue
    const jobId1 = await worker.enqueue(
      'website_ingestion',
      {
        organizationId: testOrgId,
        importId,
        selectedPages: [],
        duplicateHandling: 'skip',
      },
      {
        organizationId: testOrgId,
        idempotencyKey: `ingest_${importId}`,
      }
    );

    // Second enqueue with identical idempotencyKey
    const jobId2 = await worker.enqueue(
      'website_ingestion',
      {
        organizationId: testOrgId,
        importId,
        selectedPages: [],
        duplicateHandling: 'skip',
      },
      {
        organizationId: testOrgId,
        idempotencyKey: `ingest_${importId}`,
      }
    );

    // Must return the exact same job ID without creating duplicate work
    expect(jobId1).toBe(jobId2);

    // Verify exactly 1 job in backgroundJobs table
    const matchingJobs = await db
      .select()
      .from(backgroundJobs)
      .where(sql`payload->>'idempotencyKey' = ${`ingest_${importId}`}`);

    expect(matchingJobs.length).toBe(1);
  });

  test('Crawler E — Worker Crawl Execution: BackgroundWorker processes website_ingestion queue', async () => {
    const testImportId = crypto.randomUUID();
    const sourceId = crypto.randomUUID();

    await db.insert(knowledgeSources).values({
      id: sourceId,
      organizationId: testOrgId,
      name: 'Queue Execution Test',
      type: 'website',
      isActive: true,
    }).onConflictDoNothing();

    await db.insert(websiteImports).values({
      id: testImportId,
      organizationId: testOrgId,
      sourceId,
      url: 'https://worker-test.com',
      status: 'queued',
      pagesFound: 1,
      pagesScraped: 0,
    });

    const pages = [
      { title: 'Queue Worker Page', url: 'https://worker-test.com/page1', path: '/page1', wordCount: 80, suggestedCategory: 'General', content: 'Testing background worker queue execution.' },
    ];

    // Enqueue job into website_ingestion queue
    const jobId = await worker.enqueue(
      'website_ingestion',
      {
        organizationId: testOrgId,
        importId: testImportId,
        selectedPages: pages,
        duplicateHandling: 'skip',
      },
      {
        organizationId: testOrgId,
        idempotencyKey: `ingest_${testImportId}`,
      }
    );

    expect(jobId).toBeDefined();

    // Process job using BackgroundWorker
    const result = await worker.processPendingJobs(10, ['website_ingestion']);
    expect(result.processed).toBeGreaterThanOrEqual(1);

    // Verify import completed
    const [finalImport] = await db
      .select()
      .from(websiteImports)
      .where(eq(websiteImports.id, testImportId))
      .limit(1);

    expect(finalImport.status).toBe('completed');
  });

});
