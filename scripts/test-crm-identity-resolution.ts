import { normalizePhoneNumber, normalizeEmail } from "../src/lib/identity";
import { identityResolverService } from "../src/server/services/identity";
import { crmDeduplicationService } from "../src/server/services/crm/deduplication";
import { leadsRepository } from "../src/server/repositories/leads";
import { appointmentsRepository } from "../src/server/repositories/appointments";
import { conversationsRepository } from "../src/server/repositories/conversations";
import { bookingService } from "../src/server/services/booking";
import { db } from "../src/server/db";
import { 
  organizations, 
  leadProfiles, 
  contactChannels, 
  conversations, 
  appointments, 
  leadAnswers, 
  leadScores, 
  services, 
  staffMembers,
  businessLocalization
} from "../src/server/db/schema";
import { eq, and } from "drizzle-orm";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ""}`);
  }
}

async function runIdentityResolutionTestSuite() {
  console.log("\n=======================================================");
  console.log("  CROSS-CHANNEL CRM IDENTITY RESOLUTION & DEDUPLICATION TEST SUITE");
  console.log("=======================================================\n");

  // -------------------------------------------------------------
  // Test Category 1: Canonical Phone Normalization
  // -------------------------------------------------------------
  console.log("--- Category 1: Phone Normalization Variations ---");

  const indiaVariations = [
    "+91 98765 43210",
    "+919876543210",
    "919876543210",
    "09876543210",
    "98765-43210",
    "(98765) 43210",
    "  +91 98765-43210  ",
  ];

  for (const variant of indiaVariations) {
    const res = normalizePhoneNumber(variant, { defaultCountry: "IN" });
    assert(
      res.success && res.e164 === "+919876543210",
      `India format: "${variant}" -> ${res.success ? res.e164 : "FAILED"}`,
      `Expected +919876543210, got ${res.success ? res.e164 : res.reason}`
    );
  }

  const usVariations = [
    "+1 (555) 234-5678",
    "+15552345678",
    "15552345678",
    "555-234-5678",
    "(555) 234-5678",
    "5552345678",
  ];

  for (const variant of usVariations) {
    const res = normalizePhoneNumber(variant, { defaultCountry: "US" });
    assert(
      res.success && res.e164 === "+15552345678",
      `US format: "${variant}" -> ${res.success ? res.e164 : "FAILED"}`,
      `Expected +15552345678, got ${res.success ? res.e164 : res.reason}`
    );
  }

  // Edge cases
  const emptyRes = normalizePhoneNumber("");
  assert(!emptyRes.success && emptyRes.reason === "EMPTY_PHONE", "Empty string rejected");

  const nullRes = normalizePhoneNumber(null);
  assert(!nullRes.success && nullRes.reason === "EMPTY_PHONE", "Null phone rejected");

  const shortRes = normalizePhoneNumber("123");
  assert(!shortRes.success, "Too short phone rejected");

  // -------------------------------------------------------------
  // Test Category 2: Canonical Email Normalization
  // -------------------------------------------------------------
  console.log("\n--- Category 2: Email Normalization ---");

  const emailTests = [
    { input: "  John.Doe@Example.COM ", expected: "john.doe@example.com" },
    { input: "USER+tag@DOMAIN.org", expected: "user+tag@domain.org" },
    { input: "Alice@Sub.Domain.Co.UK", expected: "alice@sub.domain.co.uk" },
  ];

  for (const t of emailTests) {
    const res = normalizeEmail(t.input);
    assert(
      res.success && res.normalizedEmail === t.expected,
      `Email format: "${t.input}" -> ${res.success ? res.normalizedEmail : "FAILED"}`,
      `Expected ${t.expected}, got ${res.success ? res.normalizedEmail : res.reason}`
    );
  }

  const invalidEmail = normalizeEmail("not-an-email");
  assert(!invalidEmail.success, "Invalid email string rejected");

  // -------------------------------------------------------------
  // Test Category 3: Database & Cross-Channel Resolution
  // -------------------------------------------------------------
  console.log("\n--- Category 3: Database & Cross-Channel Identity Resolution ---");

  // Setup Test Organizations
  const testOrgAId = "00000000-0000-0000-0000-0000000000a1";
  const testOrgBId = "00000000-0000-0000-0000-0000000000b2";

  // Clean up any previous test records
  await db.delete(leadProfiles).where(eq(leadProfiles.organizationId, testOrgAId));
  await db.delete(leadProfiles).where(eq(leadProfiles.organizationId, testOrgBId));
  await db.delete(organizations).where(eq(organizations.id, testOrgAId));
  await db.delete(organizations).where(eq(organizations.id, testOrgBId));

  // Insert test organizations
  await db.insert(organizations).values([
    {
      id: testOrgAId,
      name: "Nexus Clinic Org A",
      slug: "nexus-clinic-a",
      industry: "Healthcare",
      timezone: "Asia/Kolkata",
    },
    {
      id: testOrgBId,
      name: "Apex Spa Org B",
      slug: "apex-spa-b",
      industry: "Wellness",
      timezone: "America/New_York",
    },
  ]);

  // Channel 1: WhatsApp message arrives with format "09876543210"
  const waResult = await identityResolverService.resolveCustomerIdentity({
    organizationId: testOrgAId,
    channel: "whatsapp",
    channelUserId: "09876543210",
    phone: "09876543210",
    name: "Ravi Kumar",
  });

  assert(waResult.isNew === true, "First inbound WhatsApp contact creates profile");
  assert(waResult.normalizedPhone === "+919876543210", "WhatsApp contact normalized to E.164 (+919876543210)");
  const canonicalProfileId = waResult.leadProfileId;

  // Channel 2: SMS arrives from SAME customer formatted as "+91 98765 43210"
  const smsResult = await identityResolverService.resolveCustomerIdentity({
    organizationId: testOrgAId,
    channel: "sms",
    channelUserId: "+919876543210",
    phone: "+91 98765 43210",
    name: "Ravi K",
  });

  assert(smsResult.isNew === false, "Inbound SMS with spaced formatting resolves to EXISTING profile");
  assert(smsResult.leadProfileId === canonicalProfileId, "SMS maps to SAME leadProfileId as WhatsApp");

  // Channel 3: Voice call arrives formatted as "919876543210"
  const voiceResult = await identityResolverService.resolveCustomerIdentity({
    organizationId: testOrgAId,
    channel: "voice",
    channelUserId: "919876543210",
    phone: "919876543210",
  });

  assert(voiceResult.isNew === false, "Inbound Voice call resolves to EXISTING profile");
  assert(voiceResult.leadProfileId === canonicalProfileId, "Voice maps to SAME leadProfileId");

  // Channel 4: Web widget appointment booking with format "(98765) 43210" and email "ravi.kumar@example.com"
  const widgetResult = await identityResolverService.resolveCustomerIdentity({
    organizationId: testOrgAId,
    channel: "widget",
    phone: "(98765) 43210",
    email: "Ravi.Kumar@Example.COM",
    name: "Ravi Kumar",
  });

  assert(widgetResult.isNew === false, "Web widget with bracket formatting resolves to SAME profile");
  assert(widgetResult.leadProfileId === canonicalProfileId, "Widget maps to SAME leadProfileId");
  assert(widgetResult.normalizedEmail === "ravi.kumar@example.com", "Email is attached and normalized");

  // Channel 5: Inbound Email only from "ravi.kumar@example.com"
  const emailResult = await identityResolverService.resolveCustomerIdentity({
    organizationId: testOrgAId,
    channel: "email",
    channelUserId: "ravi.kumar@example.com",
    email: "ravi.kumar@example.com",
  });

  assert(emailResult.isNew === false, "Inbound email resolves to SAME profile via email match");
  assert(emailResult.leadProfileId === canonicalProfileId, "Email maps to SAME leadProfileId");

  // Verify only 1 lead profile exists in DB for Org A
  const orgAProfiles = await leadsRepository.listProfiles(testOrgAId);
  assert(orgAProfiles.length === 1, `Org A has exactly 1 customer profile (Found: ${orgAProfiles.length})`);

  // -------------------------------------------------------------
  // Test Category 4: Multi-Tenant Isolation
  // -------------------------------------------------------------
  console.log("\n--- Category 4: Multi-Tenant Isolation ---");

  // Customer with same phone contacts Org B
  const orgBResult = await identityResolverService.resolveCustomerIdentity({
    organizationId: testOrgBId,
    channel: "sms",
    channelUserId: "+919876543210",
    phone: "+919876543210",
    name: "Ravi Kumar (Org B client)",
  });

  assert(orgBResult.isNew === true, "Org B creates a separate tenant profile for same phone");
  assert(orgBResult.leadProfileId !== canonicalProfileId, "Org B leadProfileId is isolated from Org A");

  const orgBProfiles = await leadsRepository.listProfiles(testOrgBId);
  assert(orgBProfiles.length === 1, "Org B has its own distinct profile");

  // -------------------------------------------------------------
  // Test Category 5: Profile Deduplication & Transactional Merging
  // -------------------------------------------------------------
  console.log("\n--- Category 5: CRM Deduplication & Merge ---");

  // Create an intentional legacy un-normalized duplicate profile
  const [legacyDup] = await db
    .insert(leadProfiles)
    .values({
      organizationId: testOrgAId,
      name: "Ravi K Legacy",
      phone: "09876543210",
      normalizedPhone: null, // Legacy un-normalized
      status: "Qualified",
      leadScore: 80,
    })
    .returning();

  // Create conversation and answer for legacy duplicate
  const [dupConv] = await db
    .insert(conversations)
    .values({
      organizationId: testOrgAId,
      leadProfileId: legacyDup.id,
      status: "closed",
    })
    .returning();

  await db.insert(leadAnswers).values({
    organizationId: testOrgAId,
    leadProfileId: legacyDup.id,
    questionText: "What service are you interested in?",
    answerValue: "Dental Checkup",
  });

  // Find duplicate candidate groups
  const duplicates = await crmDeduplicationService.findDuplicateCandidates(testOrgAId);
  assert(duplicates.length > 0, `Found duplicate candidate groups (${duplicates.length} groups found)`);
  assert(duplicates.some((d) => d.matchType === "phone"), "Duplicate candidate identified by phone match");

  // Execute Merge
  const mergeRes = await crmDeduplicationService.mergeProfiles(
    testOrgAId,
    canonicalProfileId,
    [legacyDup.id]
  );

  assert(mergeRes.success === true, "Merge profiles executed successfully");
  assert(mergeRes.mergedCount === 1, "1 duplicate profile merged into master");

  // Verify legacy profile is deleted and conversation re-parented
  const [reparentedConv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, dupConv.id));
  assert(reparentedConv.leadProfileId === canonicalProfileId, "Conversation re-parented to canonical master profile");

  const [mergedMaster] = await db
    .select()
    .from(leadProfiles)
    .where(eq(leadProfiles.id, canonicalProfileId));
  assert(mergedMaster.leadScore === 80, "Master profile retained highest lead score (80)");

  // Clean up test data
  await db.delete(leadProfiles).where(eq(leadProfiles.organizationId, testOrgAId));
  await db.delete(leadProfiles).where(eq(leadProfiles.organizationId, testOrgBId));
  await db.delete(organizations).where(eq(organizations.id, testOrgAId));
  await db.delete(organizations).where(eq(organizations.id, testOrgBId));

  // -------------------------------------------------------------
  // Test Summary
  // -------------------------------------------------------------
  console.log("\n=======================================================");
  console.log(`  TEST RESULTS: ${passedTests} Passed, ${failedTests} Failed (Total: ${totalTests})`);
  console.log("=======================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runIdentityResolutionTestSuite().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
