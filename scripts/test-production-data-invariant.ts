/**
 * OPERATOR — PRODUCTION DATA INVARIANT TEST SUITE
 * 
 * Invariant: A completely new user / workspace / business starts with ZERO fake production data:
 * - 0 customers / lead profiles
 * - 0 conversations
 * - 0 messages
 * - 0 appointments / bookings
 * - 0 services (unless explicitly chosen during onboarding)
 * - 0 FAQs
 * - 0 knowledge documents
 * - 0 staff members
 * - 0 fake availability slots ("Dr. Sarah", etc.)
 * - 0 fake dashboard metrics (0 revenue, 0 conversations handled, 0 booked)
 * - 0 fake activity logs
 * - 0 fake notifications
 * 
 * Run with: npx tsx scripts/test-production-data-invariant.ts
 */

import { db } from "../src/server/db";
import { 
  users, 
  organizations, 
  memberships, 
  leadProfiles, 
  conversations, 
  conversationMessages,
  appointments, 
  services, 
  faqItems, 
  knowledgeDocuments, 
  staffMembers,
  calendarConnections,
  businessActivityLog,
  smartNotifications
} from "../src/server/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { getDailyBrief } from "../src/lib/dashboard-engine/daily-brief";
import { availabilityService } from "../src/server/services/availability";
import { scenarioGenerator } from "../src/server/services/verification/scenarios";
import { promptService } from "../src/server/services/prompt";

async function runProductionDataInvariantSuite() {
  console.log("\n=======================================================");
  console.log("🛡️  OPERATOR NEW USER ZERO-FAKE-DATA INVARIANT TEST");
  console.log("=======================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ""}`);
      failed++;
    }
  }

  const testUserId = "usr_test_invariant_" + crypto.randomBytes(6).toString("hex");
  const testEmail = `test_invariant_${Date.now()}@example.com`;
  let testOrgId: string | null = null;

  try {
    // 1. Simulate new user registration & workspace creation (matching production auth flow)
    console.log("--- Phase 1: Creating fresh new user & business workspace ---");
    
    await db.insert(users).values({
      id: testUserId,
      email: testEmail,
      name: "New Business Owner",
      isVerified: true,
      status: "active",
      acceptTerms: true,
      acceptPrivacy: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const [testOrg] = await db
      .insert(organizations)
      .values({
        name: "Acme Fresh Start LLC",
        slug: "acme-fresh-" + Math.floor(1000 + Math.random() * 9000),
        industry: "general",
        timezone: "America/New_York",
        verificationStatus: "unverified",
        onboardingStatus: "not_started",
        onboardingStep: "url",
        onboardingData: {},
      })
      .returning();

    testOrgId = testOrg.id;

    await db.insert(memberships).values({
      userId: testUserId,
      organizationId: testOrgId,
      role: "owner",
    });

    console.log(`  User created: ${testUserId}`);
    console.log(`  Workspace created: ${testOrgId}`);

    // 2. Direct DB verification: Zero fake production records
    console.log("\n--- Phase 2: Verifying database zero-state for new workspace ---");

    const customers = await db.select().from(leadProfiles).where(eq(leadProfiles.organizationId, testOrgId));
    assert(customers.length === 0, "Zero customer/lead records exist", `Found: ${customers.length}`);

    const convos = await db.select().from(conversations).where(eq(conversations.organizationId, testOrgId));
    assert(convos.length === 0, "Zero conversation records exist", `Found: ${convos.length}`);

    const msgs = await db.select().from(conversationMessages).where(eq(conversationMessages.organizationId, testOrgId));
    assert(msgs.length === 0, "Zero conversation message records exist", `Found: ${msgs.length}`);

    const appts = await db.select().from(appointments).where(eq(appointments.organizationId, testOrgId));
    assert(appts.length === 0, "Zero appointment records exist", `Found: ${appts.length}`);

    const svcs = await db.select().from(services).where(eq(services.organizationId, testOrgId));
    assert(svcs.length === 0, "Zero service records exist (clean slate)", `Found: ${svcs.length}`);

    const faqs = await db.select().from(faqItems).where(eq(faqItems.organizationId, testOrgId));
    assert(faqs.length === 0, "Zero FAQ records exist", `Found: ${faqs.length}`);

    const docs = await db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.organizationId, testOrgId));
    assert(docs.length === 0, "Zero knowledge documents exist", `Found: ${docs.length}`);

    const staff = await db.select().from(staffMembers).where(eq(staffMembers.organizationId, testOrgId));
    assert(staff.length === 0, "Zero staff member records exist", `Found: ${staff.length}`);

    const calConns = await db.select().from(calendarConnections).where(eq(calendarConnections.organizationId, testOrgId));
    assert(calConns.length === 0, "Zero calendar connections exist", `Found: ${calConns.length}`);

    const activities = await db.select().from(businessActivityLog).where(eq(businessActivityLog.organizationId, testOrgId));
    assert(activities.length === 0, "Zero fake activity logs exist", `Found: ${activities.length}`);

    const notifs = await db.select().from(smartNotifications).where(eq(smartNotifications.organizationId, testOrgId));
    assert(notifs.length === 0, "Zero fake notifications exist", `Found: ${notifs.length}`);

    // 3. Dashboard metrics honesty verification
    console.log("\n--- Phase 3: Verifying dashboard metrics engine returns true zero-state ---");

    const dailyBrief = await getDailyBrief(testOrgId, "today");
    assert(dailyBrief.conversationsHandled === 0, "Dashboard: 0 conversations handled", `Got: ${dailyBrief.conversationsHandled}`);
    assert(dailyBrief.appointmentsBooked === 0, "Dashboard: 0 appointments booked", `Got: ${dailyBrief.appointmentsBooked}`);
    assert(dailyBrief.appointmentsCancelled === 0, "Dashboard: 0 appointments cancelled", `Got: ${dailyBrief.appointmentsCancelled}`);
    assert(dailyBrief.appointmentsNoShow === 0, "Dashboard: 0 appointments no-show", `Got: ${dailyBrief.appointmentsNoShow}`);
    assert(dailyBrief.revenueGenerated === 0, "Dashboard: $0 revenue generated", `Got: ${dailyBrief.revenueGenerated}`);
    assert(dailyBrief.missedOpportunities === 0, "Dashboard: 0 missed opportunities", `Got: ${dailyBrief.missedOpportunities}`);
    assert(dailyBrief.aiSuccessRate === 0, "Dashboard: 0% AI success rate when 0 conversations", `Got: ${dailyBrief.aiSuccessRate}%`);
    assert(dailyBrief.conversionRate === 0, "Dashboard: 0% conversion rate when 0 appointments", `Got: ${dailyBrief.conversionRate}%`);
    assert(dailyBrief.hasConversations === false, "Dashboard: hasConversations is false", `Got: ${dailyBrief.hasConversations}`);
    assert(dailyBrief.hasAppointments === false, "Dashboard: hasAppointments is false", `Got: ${dailyBrief.hasAppointments}`);

    // 4. Availability slots honesty verification
    console.log("\n--- Phase 4: Verifying availability service returns empty slots (no 'Dr. Sarah') ---");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];

    const slots = await availabilityService.getAvailableSlots(testOrgId, "nonexistent-svc", dateStr);

    assert(slots.length === 0, "Availability slots are empty for unconfigured business", `Got: ${slots.length} slots`);

    // 5. Verification scenarios honesty check
    console.log("\n--- Phase 5: Verifying verification scenario generator does not inject fake services ---");

    const scenarios = await scenarioGenerator.generateScenarios(testOrgId);
    const hasFakePricing = scenarios.some(s => s.id === "pricing_hours");
    const hasFakeBooking = scenarios.some(s => s.id === "booking_availability");

    assert(!hasFakePricing, "No pricing verification scenario generated when 0 services exist", `Found pricing_hours: ${hasFakePricing}`);
    assert(!hasFakeBooking, "No calendar booking scenario generated when 0 staff exist", `Found booking_availability: ${hasFakeBooking}`);

    const hasDrSarah = JSON.stringify(scenarios).includes("Dr. Sarah");
    const hasFakePrice = JSON.stringify(scenarios).includes("75.00");
    assert(!hasDrSarah, "Verification scenarios do not mention 'Dr. Sarah'", `Contains Dr. Sarah: ${hasDrSarah}`);
    assert(!hasFakePrice, "Verification scenarios do not mention fake '75.00' price", `Contains 75.00: ${hasFakePrice}`);

    // 6. Receptionist prompt honesty check
    console.log("\n--- Phase 6: Verifying AI prompt service handles empty business truthfully ---");

    const systemPrompt = await promptService.buildSystemPrompt({
      organizationId: testOrgId,
      ragContext: "",
      isEscalated: false,
    });
    assert(!systemPrompt.includes("Dr. Sarah"), "AI system prompt does not contain 'Dr. Sarah'");
    assert(!systemPrompt.includes("75.00"), "AI system prompt does not contain fake '$75.00'");

  } catch (err: any) {
    console.error("Test execution exception:", err);
    failed++;
  } finally {
    // Cleanup test data
    console.log("\n--- Teardown: Cleaning up test artifacts ---");
    if (testOrgId) {
      await db.delete(organizations).where(eq(organizations.id, testOrgId)).catch(() => {});
    }
    await db.delete(users).where(eq(users.id, testUserId)).catch(() => {});
    console.log("  Cleaned up test organization and user.");
  }

  console.log("\n=======================================================");
  console.log(`FINAL RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runProductionDataInvariantSuite().catch(err => {
  console.error("Fatal error running invariant suite:", err);
  process.exit(1);
});
