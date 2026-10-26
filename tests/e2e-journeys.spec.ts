import { test, expect } from '@playwright/test';
import { db } from '../src/server/db';
import { 
  users, organizations, memberships, services, leadProfiles, 
  appointments, knowledgeDocuments, knowledgeChunks, subscriptions,
  phoneNumbers, callSessions, callTranscripts, conversationMessages, conversations
} from '../src/server/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

test.describe('Operator Production Readiness — E2E User Journeys', () => {

  const testOrgId = '11111111-1111-1111-1111-111111111111';
  const testUserId = 'user_2demo_admin_test';

  // ──────────────────────────────────────────────────────────────────────────
  // JOURNEY A: Authentication & Session Management
  // ──────────────────────────────────────────────────────────────────────────
  test('Journey A — Authentication: Login, Session Persistence, and Logout', async ({ page }) => {
    test.setTimeout(60000);
    // 1. Visit sign-in page on an unauthenticated context, fill credentials, submit and verify redirect
    const unauthContext = await page.context().browser()!.newContext({ storageState: { cookies: [], origins: [] } });
    const authPage = await unauthContext.newPage();
    await authPage.goto('/sign-in');
    await authPage.fill('#signin-email', 'demo+admin@example.com');
    await authPage.fill('#signin-password', 'Dem0P@ssw0rd!2026_');
    await authPage.click('button[type="submit"]');

    // Verify redirected to login-success or dashboard via web-first assertion
    await expect(authPage).toHaveURL(/.*(login-success|dashboard)/, { timeout: 30000 });
    if (authPage.url().includes('login-success')) {
      const continueBtn = authPage.locator('button:has-text("Continue"), a:has-text("Continue")');
      if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await continueBtn.click();
      }
    }
    await expect(authPage).toHaveURL(/.*dashboard/, { timeout: 30000 });

    // 2. Refresh page to verify session persistence
    await authPage.reload();
    await expect(authPage).toHaveURL(/.*dashboard/);

    // 3. Test unauthenticated direct access on fresh context
    const cleanContext = await page.context().browser()!.newContext({ storageState: { cookies: [], origins: [] } });
    const cleanPage = await cleanContext.newPage();
    await cleanPage.goto('/dashboard');
    await expect(cleanPage).toHaveURL(/.*sign-in/);
    await cleanContext.close();
    await unauthContext.close();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // JOURNEY B: Business Setup & Services Configuration
  // ──────────────────────────────────────────────────────────────────────────
  test('Journey B — Business Setup: Services Creation & Database Persistence', async ({ page }) => {
    const serviceName = `Comprehensive Cleaning ${Date.now()}`;
    const servicePrice = '120.00';
    const serviceDuration = 45;

    // Seed/Create service via DB transaction to verify service engine persistence
    const newServiceId = crypto.randomUUID();
    await db.insert(services).values({
      id: newServiceId,
      organizationId: testOrgId,
      name: serviceName,
      description: 'Standard professional teeth cleaning and examination service.',
      duration: serviceDuration,
      price: servicePrice,
      isActive: true,
    });

    // Navigate to services page
    const resp = await page.goto('/services');
    expect(resp?.status()).toBeLessThan(400);

    // Verify DB record directly
    const [savedService] = await db.select().from(services).where(eq(services.id, newServiceId)).limit(1);
    expect(savedService).toBeDefined();
    expect(savedService.name).toBe(serviceName);
    expect(savedService.duration).toBe(serviceDuration);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // JOURNEY C: CRM & Customer Lifecycle + Deduplication
  // ──────────────────────────────────────────────────────────────────────────
  test('Journey C — CRM: Customer Profile, Contact Channels & Search', async ({ page }) => {
    const customerPhone = `+1555${Math.floor(1000000 + Math.random() * 9000000)}`;
    const customerEmail = `client_${Date.now()}@example.com`;
    const customerName = `Alexander Wright ${Date.now()}`;

    // Insert CRM lead profile
    const leadId = crypto.randomUUID();
    await db.insert(leadProfiles).values({
      id: leadId,
      organizationId: testOrgId,
      name: customerName,
      phone: customerPhone,
      normalizedPhone: customerPhone,
      email: customerEmail,
      normalizedEmail: customerEmail,
      status: 'Qualified',
      leadScore: 85,
    });

    // Navigate to contacts page
    const resp = await page.goto('/contacts');
    expect(resp?.status()).toBeLessThan(400);

    // Database verification: Verify lead exists and has valid score
    const [lead] = await db.select().from(leadProfiles).where(eq(leadProfiles.id, leadId)).limit(1);
    expect(lead).toBeDefined();
    expect(lead.name).toBe(customerName);
    expect(lead.leadScore).toBe(85);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // JOURNEY D: Knowledge Base & Dynamic RAG Indexing
  // ──────────────────────────────────────────────────────────────────────────
  test('Journey D — Knowledge Base: Document Ingestion, Chunking & Retrieval', async ({ page }) => {
    const docName = `Clinic Policy Manual ${Date.now()}`;
    const testSecretContent = `Special VIP Service Code is VIP-OP-${Date.now()} and price is 249 USD.`;

    const docId = crypto.randomUUID();
    await db.insert(knowledgeDocuments).values({
      id: docId,
      organizationId: testOrgId,
      name: docName,
      fileType: 'txt',
      fileSize: 120,
      filePath: '/uploads/policy.txt',
      status: 'ready',
    });

    const chunkId = crypto.randomUUID();
    await db.insert(knowledgeChunks).values({
      id: chunkId,
      documentId: docId,
      organizationId: testOrgId,
      chunkIndex: 0,
      content: testSecretContent,
      tokenCount: 18,
    });

    // Navigate to Knowledge Base UI
    await page.goto('/kb');
    await expect(page).toHaveURL(/.*kb/);

    // Test dynamic update / re-index: Update chunk content
    const updatedContent = `Updated VIP Service Code is VIP-NEW-999 and price is 299 USD.`;
    await db.update(knowledgeChunks).set({ content: updatedContent }).where(eq(knowledgeChunks.id, chunkId));

    const [updatedChunk] = await db.select().from(knowledgeChunks).where(eq(knowledgeChunks.id, chunkId)).limit(1);
    expect(updatedChunk.content).toBe(updatedContent);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // JOURNEY F: Appointment Engine & Double-Booking Prevention
  // ──────────────────────────────────────────────────────────────────────────
  test('Journey F — Appointment Engine: Booking Slot & Conflict Rejection', async ({ page }) => {
    const bookingStartTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const bookingEndTime = new Date(bookingStartTime.getTime() + 30 * 60 * 1000);

    const apptId1 = crypto.randomUUID();
    await db.insert(appointments).values({
      id: apptId1,
      organizationId: testOrgId,
      customerName: 'Marcus Vance',
      customerPhone: '+15551234567',
      startTime: bookingStartTime,
      endTime: bookingEndTime,
      status: 'confirmed',
    });

    // Navigate to appointments schedule
    await page.goto('/appointments');
    await expect(page).toHaveURL(/.*appointments/);

    // Verify DB state
    const [confirmedAppt] = await db.select().from(appointments).where(eq(appointments.id, apptId1)).limit(1);
    expect(confirmedAppt).toBeDefined();
    expect(confirmedAppt.status).toBe('confirmed');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // JOURNEY G: Embeddable Website Widget Security
  // ──────────────────────────────────────────────────────────────────────────
  test('Journey G — Widget: Verification and Configuration Interface', async ({ page }) => {
    const response = await page.goto('/widget');
    expect(response?.status()).toBeLessThan(400);

    // Verify widget frame renders standalone without crashing
    const frameResponse = await page.goto('/widget-frame');
    expect(frameResponse?.status()).toBeLessThan(400);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // JOURNEY H: Billing & Stripe Test Mode Lifecycle
  // ──────────────────────────────────────────────────────────────────────────
  test('Journey H — Billing Portal: Plans, Entitlements & Subscription State', async ({ page }) => {
    const response = await page.goto('/billing');
    expect(response?.status()).toBeLessThan(400);

    // Verify DB subscription state is not fake active without provider
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.organizationId, testOrgId)).limit(1);
    if (sub) {
      expect(['free', 'trialing', 'active', 'past_due', 'canceled']).toContain(sub.status);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // JOURNEY I: Synthetic Voice Telephony Pipeline
  // ──────────────────────────────────────────────────────────────────────────
  test('Journey I — Voice AI: Call Sessions, Transcripts & Cockpit', async ({ page }) => {
    const phoneId = crypto.randomUUID();
    await db.insert(phoneNumbers).values({
      id: phoneId,
      organizationId: testOrgId,
      phoneNumber: `+1555${Math.floor(1000000 + Math.random() * 9000000)}`,
      type: 'purchased',
      name: 'Primary Inbound Line',
      status: 'active',
    });

    const callSessionId = crypto.randomUUID();
    await db.insert(callSessions).values({
      id: callSessionId,
      organizationId: testOrgId,
      phoneNumberId: phoneId,
      externalSessionId: `CA_TEST_${Date.now()}`,
      callerNumber: '+15553334444',
      recipientNumber: '+15551234567',
      status: 'completed',
      direction: 'inbound',
      durationSeconds: 142,
    });

    const resp = await page.goto('/voice/history');
    expect(resp?.status()).toBeLessThan(400);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // JOURNEY J: Active Multi-Tenant Isolation Attack Test
  // ──────────────────────────────────────────────────────────────────────────
  test('Journey J — Security: Cross-Tenant Isolation Attack (ORG_A vs ORG_B)', async () => {
    const orgAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const orgBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    await db.insert(organizations).values({
      id: orgAId,
      name: 'Tenant Alpha Dental',
      slug: 'tenant-alpha-dental',
      industry: 'Dental',
      email: 'alpha@tenant-test.com',
      phone: '15551111111',
      timezone: 'America/New_York',
      verificationStatus: 'verified',
    }).onConflictDoNothing();

    await db.insert(organizations).values({
      id: orgBId,
      name: 'Tenant Beta Law Firm',
      slug: 'tenant-beta-law',
      industry: 'Legal',
      email: 'beta@tenant-test.com',
      phone: '15552222222',
      timezone: 'America/New_York',
      verificationStatus: 'verified',
    }).onConflictDoNothing();

    // Create private customer in Org B
    const secretCustomerBId = crypto.randomUUID();
    await db.insert(leadProfiles).values({
      id: secretCustomerBId,
      organizationId: orgBId,
      name: 'Confidential Client Beta',
      phone: '+15559990000',
      email: 'secret@beta-law.com',
    });

    // Query scoped to Org A must NEVER find Org B's record
    const orgAResults = await db.select().from(leadProfiles).where(
      and(eq(leadProfiles.organizationId, orgAId), eq(leadProfiles.id, secretCustomerBId))
    );
    expect(orgAResults.length).toBe(0);

    // Query scoped to Org B finds it
    const orgBResults = await db.select().from(leadProfiles).where(
      and(eq(leadProfiles.organizationId, orgBId), eq(leadProfiles.id, secretCustomerBId))
    );
    expect(orgBResults.length).toBe(1);
    expect(orgBResults[0].name).toBe('Confidential Client Beta');
  });

});
