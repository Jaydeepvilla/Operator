import "dotenv/config";
import { db } from "../src/server/db";
import { 
  organizations, 
  services, 
  businessSettings, 
  staffMembers, 
  appointments, 
  leadProfiles, 
  conversations, 
  conversationEvents, 
  channelMessages 
} from "../src/server/db/schema";
import { verificationEngine } from "../src/server/services/verification/engine";
import { evaluators } from "../src/server/services/verification/evaluators";
import { eq, sql } from "drizzle-orm";

async function runConfidenceBridgeVerificationTests() {
  console.log("\n=======================================================");
  console.log("🛡️  STARTING CONFIDENCE BRIDGE AUTOMATED VALIDATION SUITE");
  console.log("=======================================================\n");

  const testOrgSlug = `test-conf-org-${Date.now()}`;
  
  // 1. Create a dummy test organization
  console.log("1. Provisioning Test Organization & Invariants...");
  const [testOrg] = await db
    .insert(organizations)
    .values({
      name: "Apex Smiles Dental Lab",
      slug: testOrgSlug,
      industry: "Dental",
      timezone: "America/New_York",
      verificationStatus: "unverified",
      verificationMetadata: {},
    })
    .returning();

  const [testService] = await db
    .insert(services)
    .values({
      organizationId: testOrg.id,
      name: "Comprehensive Dental Exam",
      description: "Full mouth exam with digital X-rays",
      duration: 45,
      price: "150.00",
      isActive: true,
    })
    .returning();

  const [testStaff] = await db
    .insert(staffMembers)
    .values({
      organizationId: testOrg.id,
      name: "Dr. Rachel Green",
      role: "Lead Dentist",
      isActive: true,
      email: `rachel-${Date.now()}@apexsmiles.com`,
    })
    .returning();

  await db
    .insert(businessSettings)
    .values({
      organizationId: testOrg.id,
      businessHours: {
        monday: { isOpen: true, openTime: "8:00 AM", closeTime: "5:00 PM" },
        saturday: { isOpen: true, openTime: "9:00 AM", closeTime: "1:00 PM" },
      },
      holidays: [],
      languages: ["en"],
    });

  console.log(`   ✓ Org provisioned: ${testOrg.id} (${testOrg.name})`);

  // 2. Capture Initial DB Row Counts to prove ZERO side-effects
  console.log("\n2. Capturing Pre-Test DB State...");
  const countTable = async (table: any) => {
    const [res] = await db.select({ count: sql<number>`count(*)` }).from(table);
    return Number(res.count);
  };

  const initialAppointments = await countTable(appointments);
  const initialLeads = await countTable(leadProfiles);
  const initialConversations = await countTable(conversations);
  const initialEvents = await countTable(conversationEvents);
  const initialMessages = await countTable(channelMessages);

  console.log(`   Initial Appointments: ${initialAppointments}`);
  console.log(`   Initial Leads:        ${initialLeads}`);
  console.log(`   Initial Convs:        ${initialConversations}`);
  console.log(`   Initial Events:       ${initialEvents}`);

  // 3. Run Scenario 1: Pricing & Hours
  console.log("\n3. Testing Scenario 1: Pricing & Hours Invariant...");
  const pricingRes = await verificationEngine.runScenario(testOrg.id, "pricing_hours");
  console.log(`   Result: ${pricingRes.result.status.toUpperCase()}`);
  console.log(`   Evidence: ${pricingRes.result.humanEvidence}`);
  if (pricingRes.result.status !== "passed") {
    throw new Error("Pricing scenario failed invariant check.");
  }

  // 4. Run Scenario 2: Calendar Availability Dry-Run
  console.log("\n4. Testing Scenario 2: Calendar Availability Dry-Run Invariant...");
  const bookingRes = await verificationEngine.runScenario(testOrg.id, "booking_availability");
  console.log(`   Result: ${bookingRes.result.status.toUpperCase()}`);
  console.log(`   Evidence: ${bookingRes.result.humanEvidence}`);
  if (bookingRes.result.status !== "passed") {
    throw new Error("Booking scenario failed invariant check.");
  }

  // 5. Run Scenario 3: Safety & Medical Disclaimer
  console.log("\n5. Testing Scenario 3: Safety / Refusal Boundary Invariant...");
  const safetyRes = await verificationEngine.runScenario(testOrg.id, "safety_boundary");
  console.log(`   Result: ${safetyRes.result.status.toUpperCase()}`);
  console.log(`   Evidence: ${safetyRes.result.humanEvidence}`);
  if (safetyRes.result.status !== "passed") {
    throw new Error("Safety scenario failed invariant check.");
  }

  // 6. Assert Zero DB Mutations (Rule 2 & Rule 3 Verification)
  console.log("\n6. Validating Mutation Isolation (P0 Safeguard)...");
  const postAppointments = await countTable(appointments);
  const postLeads = await countTable(leadProfiles);
  const postConversations = await countTable(conversations);
  const postEvents = await countTable(conversationEvents);
  const postMessages = await countTable(channelMessages);

  const deltaAppointments = postAppointments - initialAppointments;
  const deltaLeads = postLeads - initialLeads;
  const deltaConversations = postConversations - initialConversations;
  const deltaEvents = postEvents - initialEvents;

  console.log(`   Delta Appointments:   ${deltaAppointments} (Expected: 0)`);
  console.log(`   Delta Leads:          ${deltaLeads} (Expected: 0)`);
  console.log(`   Delta Conversations:  ${deltaConversations} (Expected: 0)`);
  console.log(`   Delta Events:         ${deltaEvents} (Expected: 0)`);

  if (deltaAppointments !== 0 || deltaLeads !== 0 || deltaConversations !== 0 || deltaEvents !== 0) {
    throw new Error("P0 VIOLATION: Dry-run simulation wrote persistent customer/appointment records to database!");
  }
  console.log("   ✅ PASSED: Pure read-only simulation verified with 0 DB side-effects!");

  // 7. Verify Status Promotion
  console.log("\n7. Validating State Promotion to VERIFIED...");
  const { verificationStatus } = await verificationEngine.getScenarios(testOrg.id);
  console.log(`   Current Org Status: ${verificationStatus}`);
  if (verificationStatus !== "verified") {
    throw new Error(`Expected org status to be 'verified', got '${verificationStatus}'`);
  }
  console.log("   ✅ PASSED: Org automatically promoted to VERIFIED after 3/3 passing tests!");

  // 8. Test Targeted Invalidation on Price Update
  console.log("\n8. Validating Targeted Invalidation on Inline Service Edit...");
  await verificationEngine.updateInlineService(testOrg.id, testService.id, { price: "185.00" });
  
  const updatedData = await verificationEngine.getScenarios(testOrg.id);
  console.log(`   Status After Price Change: ${updatedData.verificationStatus}`);
  const pricingScenario = updatedData.scenarios.find(s => s.id === "pricing_hours");
  console.log(`   Pricing Scenario Status:  ${pricingScenario?.lastResult?.status}`);

  if (updatedData.verificationStatus !== "needs_review" || pricingScenario?.lastResult?.status !== "stale") {
    throw new Error("Invalidation check failed: price update did not invalidate pricing scenario.");
  }
  console.log("   ✅ PASSED: Invalidation accurately transitioned org to NEEDS_REVIEW and marked scenario STALE!");

  // 9. Clean up test org
  console.log("\n9. Cleaning up test fixtures...");
  await db.delete(organizations).where(eq(organizations.id, testOrg.id));
  console.log("   ✓ Cleaned up test org.");

  console.log("\n=======================================================");
  console.log("🎉 ALL CONFIDENCE BRIDGE TESTS COMPLETED SUCCESSFULLY!");
  console.log("=======================================================\n");
}

runConfidenceBridgeVerificationTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ TEST SUITE FAILED:", err);
    process.exit(1);
  });
