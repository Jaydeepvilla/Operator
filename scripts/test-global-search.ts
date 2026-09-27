import { db } from "../src/server/db";
import {
  organizations,
  users,
  leadProfiles,
  appointments,
  knowledgeDocuments,
  faqItems,
  services,
  callSessions,
  phoneNumbers,
} from "../src/server/db/schema";
import { eq } from "drizzle-orm";
import {
  executeGlobalSearch,
  sanitizeSearchQuery,
  escapeLikePattern,
} from "../src/server/services/search/global-search";
import { searchNavigation } from "../src/lib/search/navigation-registry";

async function runGlobalSearchTests() {
  console.log("=== OPERATOR GLOBAL SEARCH AUTOMATED TEST SUITE ===\n");

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      testsPassed++;
    } else {
      console.error(`❌ FAIL: ${testName}${details ? ` -> ${details}` : ""}`);
      testsFailed++;
    }
  }

  // ── TEST 1: Query Sanitization ──────────────────────────────────
  console.log("\n--- Suite 1: Query Sanitization & Injection Prevention ---");
  const nullByteInput = "john\0smith";
  const sanitizedNull = sanitizeSearchQuery(nullByteInput);
  assert(sanitizedNull === "johnsmith", "Sanitizes null bytes from search queries");

  const longInput = "a".repeat(200);
  const sanitizedLong = sanitizeSearchQuery(longInput);
  assert(
    sanitizedLong.length === 100,
    "Clamps excessively long search queries to 100 characters",
    `Length was ${sanitizedLong.length}`
  );

  const wildcardInput = "test%_\\val";
  const escaped = escapeLikePattern(wildcardInput);
  assert(
    escaped === "test\\%\\_\\\\val",
    "Escapes SQL LIKE/ILIKE wildcards (%, _, \\)",
    `Escaped: ${escaped}`
  );

  // ── TEST 2: Navigation Registry ─────────────────────────────────
  console.log("\n--- Suite 2: Quick Navigation Search ---");
  const billingNav = searchNavigation("billing");
  assert(
    billingNav.some((n) => n.href === "/billing" && n.type === "navigation"),
    "Finds /billing route when searching 'billing'"
  );

  const calendarNav = searchNavigation("calendar");
  assert(
    calendarNav.some((n) => n.href === "/appointments"),
    "Finds /appointments when searching keyword 'calendar'"
  );

  const voiceNav = searchNavigation("voice");
  assert(
    voiceNav.some((n) => n.href === "/voice"),
    "Finds /voice when searching 'voice'"
  );

  // ── TEST 3: Short Query Boundary ────────────────────────────────
  console.log("\n--- Suite 3: Short Query Boundaries ---");
  const dummyOrgId = "00000000-0000-0000-0000-000000000001";
  const zeroCharRes = await executeGlobalSearch(dummyOrgId, "");
  assert(
    zeroCharRes.success && zeroCharRes.totalResults === 0,
    "0-character query returns 0 results without database query"
  );

  const oneCharRes = await executeGlobalSearch(dummyOrgId, "b");
  assert(
    oneCharRes.success &&
      oneCharRes.results.contacts.length === 0 &&
      oneCharRes.results.appointments.length === 0,
    "1-character query skips database resource queries"
  );

  // ── TEST 4: Real Database & Multi-Tenant Isolation ──────────────
  console.log("\n--- Suite 4: Database Search & Cross-Business Isolation ---");

  // Create two distinct test organizations in DB
  const testOrgAId = "11111111-2222-3333-4444-555555555551";
  const testOrgBId = "11111111-2222-3333-4444-555555555552";

  try {
    // Clean up any remnants first
    await db.delete(organizations).where(eq(organizations.id, testOrgAId));
    await db.delete(organizations).where(eq(organizations.id, testOrgBId));

    // Insert Org A and Org B
    await db.insert(organizations).values([
      {
        id: testOrgAId,
        name: "Test Tenant Alpha Law",
        slug: "test-tenant-alpha-law",
        industry: "legal",
        timezone: "America/New_York",
      },
      {
        id: testOrgBId,
        name: "Test Tenant Beta Clinic",
        slug: "test-tenant-beta-clinic",
        industry: "healthcare",
        timezone: "America/New_York",
      },
    ]);

    // Insert unique Lead Profile into Org A
    const uniqueContactNameOrgA = "Eleanor Vance Secret Alpha";
    const [insertedLeadA] = await db
      .insert(leadProfiles)
      .values({
        organizationId: testOrgAId,
        name: uniqueContactNameOrgA,
        email: "eleanor.alpha@example.com",
        phone: "+15551002000",
        status: "Qualified",
        summary: "High value legal consultation prospect",
      })
      .returning();

    // Insert unique Appointment into Org A
    await db.insert(appointments).values({
      organizationId: testOrgAId,
      customerName: "Eleanor Vance Secret Alpha",
      customerEmail: "eleanor.alpha@example.com",
      startTime: new Date("2026-10-15T14:00:00Z"),
      endTime: new Date("2026-10-15T15:00:00Z"),
      status: "confirmed",
    });

    // Insert unique FAQ into Org A
    await db.insert(faqItems).values({
      organizationId: testOrgAId,
      question: "What is Alpha Law cancellation protocol?",
      answer: "Alpha clients can reschedule 24h prior.",
      category: "Billing & Policy",
    });

    // Insert unique Service into Org A
    await db.insert(services).values({
      organizationId: testOrgAId,
      name: "Alpha Premium Legal Retainer",
      description: "Comprehensive corporate advisory service",
      duration: 60,
      price: "450.00",
    });

    // ── SEARCH AS ORG A ──
    const searchOrgARes = await executeGlobalSearch(testOrgAId, "Alpha");
    assert(
      searchOrgARes.success,
      "Search executes successfully for Org A"
    );
    assert(
      searchOrgARes.results.contacts.some((c) => c.title === uniqueContactNameOrgA),
      "Org A finds its own contact"
    );
    assert(
      searchOrgARes.results.appointments.some((a) => a.title.includes("Eleanor")),
      "Org A finds its own appointment"
    );
    assert(
      searchOrgARes.results.faqs.some((f) => f.title.includes("Alpha Law")),
      "Org A finds its own FAQ"
    );
    assert(
      searchOrgARes.results.services.some((s) => s.title.includes("Alpha Premium")),
      "Org A finds its own Service"
    );

    // ── CRITICAL SECURITY TEST: SEARCH AS ORG B ──
    console.log("\n--- CRITICAL SECURITY BOUNDARY TEST ---");
    const searchOrgBRes = await executeGlobalSearch(testOrgBId, "Alpha");
    assert(
      searchOrgBRes.success,
      "Search executes successfully for Org B"
    );
    assert(
      searchOrgBRes.results.contacts.length === 0,
      "CRITICAL: Org B CANNOT see Org A contacts (Cross-tenant isolation verified!)"
    );
    assert(
      searchOrgBRes.results.appointments.length === 0,
      "CRITICAL: Org B CANNOT see Org A appointments (Zero cross-tenant leakage)"
    );
    assert(
      searchOrgBRes.results.faqs.length === 0,
      "CRITICAL: Org B CANNOT see Org A FAQs"
    );
    assert(
      searchOrgBRes.results.services.length === 0,
      "CRITICAL: Org B CANNOT see Org A Services"
    );

    // ── NORMALIZED RESULT CONTRACT AUDIT ──
    console.log("\n--- Suite 5: Result Normalization & Route Integrity ---");
    const sampleResult = searchOrgARes.results.contacts[0];
    assert(
      Boolean(sampleResult && sampleResult.id && sampleResult.type === "contact"),
      "Result contains valid normalized id and type"
    );
    assert(
      sampleResult.href.startsWith("/contacts"),
      "Contact result strictly routes to /contacts (no routing to /inbox)",
      `Actual href: ${sampleResult?.href}`
    );

    const aptResult = searchOrgARes.results.appointments[0];
    assert(
      aptResult.href.startsWith("/appointments"),
      "Appointment result strictly routes to /appointments (no routing to /inbox)",
      `Actual href: ${aptResult?.href}`
    );

    const faqResult = searchOrgARes.results.faqs[0];
    assert(
      faqResult.href === "/faqs",
      "FAQ result strictly routes to /faqs"
    );

    const svcResult = searchOrgARes.results.services[0];
    assert(
      svcResult.href === "/services",
      "Service result strictly routes to /services"
    );

  } catch (err) {
    console.error("Test execution error:", err);
    testsFailed++;
  } finally {
    // Cleanup test fixtures
    try {
      await db.delete(organizations).where(eq(organizations.id, testOrgAId));
      await db.delete(organizations).where(eq(organizations.id, testOrgBId));
    } catch {
      // Ignored
    }
  }

  console.log("\n==================================================");
  console.log(`TOTAL TESTS RUN: ${testsPassed + testsFailed}`);
  console.log(`PASSED: ${testsPassed}`);
  console.log(`FAILED: ${testsFailed}`);
  console.log("==================================================");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runGlobalSearchTests();
