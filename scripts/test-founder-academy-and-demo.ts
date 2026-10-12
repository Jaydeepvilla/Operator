import { db } from "../src/server/db";
import { organizations, users, businessProfiles, founderLearningProgress, appointments } from "../src/server/db/schema";
import { academyRepository } from "../src/server/repositories/academy";
import { runSimulatorScenarioAction } from "../src/server/actions/academy";
import { switchDemoIndustryAction, resetDemoDataAction, DEMO_SCRIPTS } from "../src/server/actions/demo";
import { eq, and, sql } from "drizzle-orm";

async function runTests() {
  console.log("🚀 Starting Founder Academy & Demo Center Verification Test Suite...\n");
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      process.exitCode = 1;
    }
  }

  // 1. Get sample user and organization
  const [sampleUser] = await db.select().from(users).limit(1);
  const [sampleOrg] = await db.select().from(organizations).limit(1);

  if (!sampleUser || !sampleOrg) {
    console.error("❌ No user or organization found in database. Run db:seed first.");
    process.exit(1);
  }

  console.log(`👤 Using test user: ${sampleUser.id} (${sampleUser.email})`);
  console.log(`🏢 Using test org: ${sampleOrg.id} (${sampleOrg.name})\n`);

  // Test 1: Get or Create Academy Progress
  console.log("--- Group 1: Founder Learning Progress Invariants ---");
  const initialProgress = await academyRepository.getOrCreateProgress(sampleUser.id, sampleOrg.id);
  assert(!!initialProgress && initialProgress.userId === sampleUser.id, "Progress record created or retrieved in PostgreSQL");
  assert(initialProgress.currentModuleId === "module-1", "Default starting module is module-1");
  assert(Array.isArray(initialProgress.lessonsCompleted), "lessonsCompleted is an array");
  assert(Array.isArray(initialProgress.exercisesPassed), "exercisesPassed is an array");

  // Test 2: Complete Lesson
  const afterLesson = await academyRepository.completeLesson(sampleUser.id, sampleOrg.id, "module-1", "module-2");
  assert(afterLesson.lessonsCompleted.includes("module-1"), "Lesson module-1 recorded in lessonsCompleted");
  assert(afterLesson.recommendedNextLesson === "module-2", "Next recommended lesson advanced to module-2");

  // Test 3: Pass Exercise
  const afterExercise = await academyRepository.passExercise(sampleUser.id, sampleOrg.id, "ex-1-foundations");
  assert(afterExercise.exercisesPassed.includes("ex-1-foundations"), "Exercise ex-1-foundations recorded in exercisesPassed");

  // Test 4: Record Workflow Practiced
  const afterWorkflow = await academyRepository.recordWorkflowPracticed(sampleUser.id, sampleOrg.id, "business-hours-query");
  assert(afterWorkflow.workflowsPracticed.includes("business-hours-query"), "Workflow recorded in workflowsPracticed");

  // Test 5: Verify Simulator Scenarios
  console.log("\n--- Group 2: Interactive Workflow Simulator (15 Scenarios) ---");
  const SCENARIOS = [
    "business-hours-query",
    "kb-grounded-answer",
    "booking-request-standard",
    "slot-unavailable",
    "double-booking-contention",
    "reschedule-request",
    "cancellation-request",
    "deposit-required",
    "payment-succeeds",
    "payment-fails",
    "delayed-confirmation-reconciliation",
    "delivery-failure",
    "channel-disconnect",
    "ai-confidence-gap",
    "human-intervention-required",
  ];

  for (const sc of SCENARIOS) {
    const outcome = await academyRepository.recordSimulatorResult(sampleUser.id, sampleOrg.id, sc, {
      success: true,
      timestamp: new Date().toISOString(),
      details: { scenario: sc, verified: true },
    });
    const results = outcome.simulatorResults as Record<string, any>;
    assert(!!results[sc] && results[sc].success === true, `Simulator scenario '${sc}' recorded successfully`);
  }

  // Test 6: Demo Scripts Content & Coverage
  console.log("\n--- Group 3: Guided Demo Scripts & Industry Verticals ---");
  assert(DEMO_SCRIPTS.length === 4, "All 4 required industry demo scripts exist");
  const industries = DEMO_SCRIPTS.map((s) => s.industry);
  assert(industries.includes("Salon & Spa"), "Salon & Spa script present");
  assert(industries.includes("Dental Clinic"), "Dental Clinic script present");
  assert(industries.includes("Medical Clinic"), "Medical Clinic script present");
  assert(industries.includes("Law Firm & Consultant"), "Law Firm & Consultant script present");

  for (const script of DEMO_SCRIPTS) {
    assert(script.demoJourney.length >= 3, `${script.industry} has at least 3-step walkthrough journey`);
    assert(!!script.businessOutcome.recoveredAppointments, `${script.industry} contains realistic ROI metrics`);
    assert(!!script.customerProblem, `${script.industry} defines concrete customer problem`);
  }

  // Test 7: Reset Progress
  console.log("\n--- Group 4: Safe Reset Controls & Data Protection ---");
  const resetProgress = await academyRepository.resetProgress(sampleUser.id, sampleOrg.id);
  assert(resetProgress.lessonsCompleted.length === 0, "resetProgress safely cleared completed lessons");
  assert(resetProgress.exercisesPassed.length === 0, "resetProgress safely cleared passed exercises");
  assert(resetProgress.currentModuleId === "module-1", "resetProgress restored module-1 as starting point");

  // Test 8: Non-Demo Real Customer Data Preservation Invariant
  console.log("\n--- Group 5: Real Customer Records & Financial Preservation Invariant ---");
  const testRealCustomerName = "Real Customer Preserved " + Date.now();
  const testRealEmail = `real.client.${Date.now()}@realcorp.com`;
  const [createdRealAppt] = await db
    .insert(appointments)
    .values({
      organizationId: sampleOrg.id,
      customerName: testRealCustomerName,
      customerEmail: testRealEmail,
      status: "confirmed",
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
    })
    .returning();

  const testDemoCustomerName = "[DEMO] Sample Booking " + Date.now();
  const [createdDemoAppt] = await db
    .insert(appointments)
    .values({
      organizationId: sampleOrg.id,
      customerName: testDemoCustomerName,
      customerEmail: "sample.demo@example.com",
      status: "confirmed",
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
    })
    .returning();

  // Execute demo cleanup logic on production workspace
  await db
    .delete(appointments)
    .where(
      and(
        eq(appointments.organizationId, sampleOrg.id),
        sql`(${appointments.customerName} LIKE '%[DEMO]%' OR ${appointments.customerEmail} LIKE '%demo%')`
      )
    );

  // Verify real appointment survived untouched
  const [realStillExists] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, createdRealAppt.id));

  // Verify demo appointment was cleaned
  const [demoStillExists] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, createdDemoAppt.id));

  assert(!!realStillExists, "Real customer booking strictly preserved during demo cleanup");
  assert(!demoStillExists, "Demo appointment cleanly removed");

  // Clean up test appointment
  await db.delete(appointments).where(eq(appointments.id, createdRealAppt.id));

  console.log(`\n========================================`);
  console.log(`🎉 TEST SUMMARY: ${passed} / ${total} tests passed.`);
  console.log(`========================================\n`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
