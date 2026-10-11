/**
 * OPERATOR — ADVERSARIAL AUTHENTICATED TENANT ISOLATION SUITE
 * 
 * Verifies that an AUTHENTICATED user belonging to Tenant Beta CANNOT read,
 * mutate, delete, search, or access resources belonging to Tenant Alpha.
 * 
 * Strict Requirement: The attacker must be fully authenticated with a valid
 * server-side database session. "Authentication required" is NOT accepted as proof.
 */

import { db } from "../src/server/db";
import { 
  users, 
  organizations, 
  memberships, 
  sessions, 
  services, 
  staffMembers, 
  appointments, 
  phoneNumbers, 
  callSessions, 
  knowledgeDocuments, 
  billingAccounts, 
  payments 
} from "../src/server/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { serverAuthStorage } from "../src/lib/auth/server";
import { createSession } from "../src/lib/auth/session";
import { getStaffListAction, getStaffDetailsAction } from "../src/server/actions/staff";
import { getServicesAction, updateServiceAction, deleteServiceAction } from "../src/server/actions/services";
import { getAppointmentDetailsAction, rescheduleAppointmentAction, createAppointmentAction } from "../src/server/actions/appointments";
import { getCallSessionDetailsAction } from "../src/server/actions/voice";
import { performGlobalSearchAction } from "../src/server/actions/search";
import { financialMetricsService } from "../src/server/services/billing/financial-metrics";
import { assertResourceOwnership } from "../src/lib/auth/authorization";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testId: string, description: string, actualResult?: any) {
  if (condition) {
    console.log(`  ✓ [PASS] [${testId}] ${description}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] [${testId}] ${description}`);
    if (actualResult !== undefined) {
      console.error(`    Actual:`, actualResult);
    }
    failed++;
  }
}

async function runAdversarialIsolationSuite() {
  console.log("================================================================================");
  console.log("   OPERATOR ADVERSARIAL AUTHENTICATED TENANT ISOLATION TEST MATRIX             ");
  console.log("================================================================================\n");

  const cleanupUserIds: string[] = [];
  const cleanupOrgIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // 1. PROVISION TENANT ALPHA (Victim) & TENANT BETA (Attacker)
    // -------------------------------------------------------------------------
    const tenantAlphaId = crypto.randomUUID();
    const [orgAlpha] = await db.insert(organizations).values({
      id: tenantAlphaId,
      name: "Alpha Corp (Victim)",
      slug: `victim-alpha-${Date.now()}`,
      industry: "Legal",
      timezone: "UTC",
    }).returning();
    cleanupOrgIds.push(tenantAlphaId);

    const tenantBetaId = crypto.randomUUID();
    const [orgBeta] = await db.insert(organizations).values({
      id: tenantBetaId,
      name: "Beta LLC (Attacker)",
      slug: `attacker-beta-${Date.now()}`,
      industry: "Healthcare",
      timezone: "UTC",
    }).returning();
    cleanupOrgIds.push(tenantBetaId);

    // User Alpha (Legitimate Owner of Alpha)
    const userAlphaId = `usr_${crypto.randomUUID().replace(/-/g, "")}`;
    await db.insert(users).values({
      id: userAlphaId,
      email: `victim_alpha_${Date.now()}@test.org`,
      firstName: "Alice",
      lastName: "Alpha",
      status: "active",
      isVerified: true,
    });
    cleanupUserIds.push(userAlphaId);

    await db.insert(memberships).values({
      userId: userAlphaId,
      organizationId: tenantAlphaId,
      role: "owner",
    });

    // User Beta (Authenticated Attacker belonging only to Beta)
    const userBetaId = `usr_${crypto.randomUUID().replace(/-/g, "")}`;
    await db.insert(users).values({
      id: userBetaId,
      email: `attacker_beta_${Date.now()}@test.org`,
      firstName: "Bob",
      lastName: "Beta",
      status: "active",
      isVerified: true,
    });
    cleanupUserIds.push(userBetaId);

    await db.insert(memberships).values({
      userId: userBetaId,
      organizationId: tenantBetaId,
      role: "owner",
    });

    // Create real server-side database session for Attacker (User Beta)
    const sessionBeta = await createSession(userBetaId, "Adversarial Test Suite", "127.0.0.1", false);

    // -------------------------------------------------------------------------
    // 2. SEED VICTIM'S RESOURCES IN TENANT ALPHA
    // -------------------------------------------------------------------------
    // Alpha Staff Member
    const [alphaStaff] = await db.insert(staffMembers).values({
      organizationId: tenantAlphaId,
      name: "Dr. Alice Alpha",
      email: "alice@alphacorp.com",
      role: "Lead Attorney",
      isActive: true,
    }).returning();

    // Alpha Confidential Service
    const [alphaService] = await db.insert(services).values({
      organizationId: tenantAlphaId,
      name: "Alpha Confidential Legal Consultation",
      description: "Classified M&A legal advisory",
      duration: 60,
      price: "750.00",
      isActive: true,
    }).returning();

    // Alpha Appointment
    const appointmentDate = new Date(Date.now() + 86400000);
    const [alphaAppointment] = await db.insert(appointments).values({
      organizationId: tenantAlphaId,
      serviceId: alphaService.id,
      staffMemberId: alphaStaff.id,
      customerName: "Secret Client Alpha",
      customerEmail: "client@classified.org",
      customerPhone: "+15559998888",
      startTime: appointmentDate,
      endTime: new Date(appointmentDate.getTime() + 3600000),
      status: "confirmed",
    }).returning();

    // Alpha Phone Line & Call Session
    const [alphaLine] = await db.insert(phoneNumbers).values({
      organizationId: tenantAlphaId,
      phoneNumber: "+15551112222",
      name: "Alpha Hotline",
      type: "registered",
      status: "active",
    }).returning();

    const [alphaCall] = await db.insert(callSessions).values({
      organizationId: tenantAlphaId,
      phoneNumberId: alphaLine.id,
      direction: "inbound",
      callerNumber: "+15559990000",
      recipientNumber: alphaLine.phoneNumber,
      externalSessionId: `call_alpha_${Date.now()}`,
      status: "completed",
      durationSeconds: 145,
    }).returning();

    // Alpha Knowledge Document
    const [alphaDoc] = await db.insert(knowledgeDocuments).values({
      organizationId: tenantAlphaId,
      name: "Alpha Corporate Trade Secret Document",
      fileType: "txt",
      status: "completed",
    }).returning();

    // Alpha Billing Account & Payment ($1,500)
    const [alphaBillingAccount] = await db.insert(billingAccounts).values({
      organizationId: tenantAlphaId,
      email: "billing@alphacorp.com",
      currency: "USD",
    }).returning();

    const [alphaPayment] = await db.insert(payments).values({
      billingAccountId: alphaBillingAccount.id,
      amount: "1500.00",
      currency: "USD",
      status: "succeeded",
      createdAt: new Date(),
    }).returning();

    console.log("Victim (Tenant Alpha) resources seeded successfully.");
    console.log("Attacker (User Beta) authenticated with sessionToken:", sessionBeta.sessionToken.slice(0, 12) + "...");
    console.log("\nExecuting Authenticated Cross-Tenant Exploitation Attempts:\n");

    // -------------------------------------------------------------------------
    // 3. EXECUTE ATTACK SCENARIOS UNDER ATTACKER'S AUTHENTICATED SESSION CONTEXT
    // -------------------------------------------------------------------------
    await serverAuthStorage.run({ sessionToken: sessionBeta.sessionToken, activeOrgId: tenantBetaId }, async () => {
      
      // VECTOR 1: Cross-Tenant Staff List Access (overrideOrgId attack)
      const staffListRes = await getStaffListAction(tenantAlphaId);
      assert(
        staffListRes.success === false && 
        staffListRes.error?.includes("not a member of this organization"),
        "AUTH-IDOR-01",
        "Authenticated User Beta cannot read Tenant Alpha staff list via overrideOrgId",
        staffListRes
      );

      // VECTOR 2: Direct Resource Access to Foreign Staff Details
      const staffDetailsRes = await getStaffDetailsAction(alphaStaff.id);
      assert(
        staffDetailsRes.success === false &&
        (staffDetailsRes.error?.includes("not found") || staffDetailsRes.error?.includes("access denied")),
        "AUTH-IDOR-02",
        "Authenticated User Beta cannot access Tenant Alpha staff details by staffId",
        staffDetailsRes
      );

      // VECTOR 3: Cross-Tenant Services Query (overrideOrgId attack)
      const servicesListRes = await getServicesAction(tenantAlphaId);
      assert(
        servicesListRes.success === false &&
        servicesListRes.error?.includes("not a member of this organization"),
        "AUTH-IDOR-03",
        "Authenticated User Beta cannot read Tenant Alpha services via overrideOrgId",
        servicesListRes
      );

      // VECTOR 4: Cross-Tenant Service Mutation / Tampering
      const serviceUpdateRes = await updateServiceAction(alphaService.id, {
        name: "Hacked by Beta",
        categoryName: "Tampered",
        description: "Injected description",
        duration: 30,
        price: "1.00",
        isActive: false,
      });
      assert(
        serviceUpdateRes.success === false &&
        (serviceUpdateRes.error?.includes("not found") || serviceUpdateRes.error?.includes("access denied")),
        "AUTH-IDOR-04",
        "Authenticated User Beta cannot mutate Tenant Alpha service record",
        serviceUpdateRes
      );

      // Verify in DB that Alpha's service was NOT altered
      const [unchangedService] = await db.select().from(services).where(eq(services.id, alphaService.id));
      assert(
        unchangedService.name === "Alpha Confidential Legal Consultation",
        "AUTH-IDOR-05",
        "Database integrity verified: Tenant Alpha service retained original values",
        unchangedService.name
      );

      // VECTOR 5: Cross-Tenant Service Deletion
      const serviceDeleteRes = await deleteServiceAction(alphaService.id);
      assert(
        serviceDeleteRes.success === false &&
        (serviceDeleteRes.error?.includes("not found") || serviceDeleteRes.error?.includes("access denied")),
        "AUTH-IDOR-06",
        "Authenticated User Beta cannot delete Tenant Alpha service record",
        serviceDeleteRes
      );

      // VECTOR 6: Cross-Tenant Appointment Details Access
      const appointmentDetailsRes = await getAppointmentDetailsAction(alphaAppointment.id);
      assert(
        appointmentDetailsRes.success === false &&
        (appointmentDetailsRes.error?.includes("not found") || appointmentDetailsRes.error?.includes("access denied")),
        "AUTH-IDOR-07",
        "Authenticated User Beta cannot read Tenant Alpha appointment by ID",
        appointmentDetailsRes
      );

      // VECTOR 7: Cross-Tenant Appointment Rescheduling
      const rescheduleRes = await rescheduleAppointmentAction({
        appointmentId: alphaAppointment.id,
        newStartTime: new Date(Date.now() + 172800000).toISOString(),
        reason: "Malicious reschedule",
      });
      assert(
        rescheduleRes.success === false &&
        (rescheduleRes.error?.includes("not found") || rescheduleRes.error?.includes("access denied")),
        "AUTH-IDOR-08",
        "Authenticated User Beta cannot reschedule Tenant Alpha appointment",
        rescheduleRes
      );

      // VECTOR 8: Cross-Tenant Appointment Creation Injection
      const appointmentInjectRes = await createAppointmentAction({
        organizationId: tenantAlphaId,
        serviceId: alphaService.id,
        staffMemberId: alphaStaff.id,
        startTime: new Date(Date.now() + 86400000 * 3).toISOString(),
        customerName: "Injected Customer",
        customerEmail: "hacker@beta.com",
      });
      assert(
        appointmentInjectRes.success === false &&
        appointmentInjectRes.error?.includes("not authorized to book appointments in this organization"),
        "AUTH-IDOR-09",
        "Authenticated User Beta cannot inject appointments into Tenant Alpha",
        appointmentInjectRes
      );

      // VECTOR 9: Cross-Tenant Call Session Details Access
      const callDetailsRes = await getCallSessionDetailsAction(alphaCall.id);
      assert(
        callDetailsRes.success === false &&
        (callDetailsRes.error?.includes("not found") || callDetailsRes.error?.includes("access denied")),
        "AUTH-IDOR-10",
        "Authenticated User Beta cannot read Tenant Alpha call session details",
        callDetailsRes
      );

      // VECTOR 10: Cross-Tenant Global Search Leakage
      const searchRes = await performGlobalSearchAction("Confidential Legal");
      const searchResultsCount = 
        searchRes.results.contacts.length +
        searchRes.results.appointments.length +
        searchRes.results.services.length +
        searchRes.results.calls.length +
        searchRes.results.knowledge.length;
      assert(
        searchRes.success === true && searchResultsCount === 0,
        "AUTH-IDOR-11",
        "Global search strictly scopes to caller's tenant (0 foreign Alpha results returned)",
        searchResultsCount
      );

      // VECTOR 11: Cross-Tenant Financial Revenue Metrics Isolation
      const betaMetrics = await financialMetricsService.calculateRealtimeMetrics(tenantBetaId);
      assert(
        betaMetrics.grossRevenue === 0 && betaMetrics.netRevenue === 0 && betaMetrics.mrr === 0,
        "AUTH-IDOR-12",
        "Financial KPIs strictly scoped: Tenant Alpha's $1,500 payment does not leak into Beta",
        `Beta gross revenue: $${betaMetrics.grossRevenue}`
      );

      // VECTOR 12: Generic assertResourceOwnership Enforcement
      let ownershipBlocked = false;
      try {
        await assertResourceOwnership(services, alphaService.id, tenantBetaId, "Service");
      } catch (e: any) {
        ownershipBlocked = e.name === "AuthorizationError" && e.message.includes("not found or access denied");
      }
      assert(
        ownershipBlocked,
        "AUTH-IDOR-13",
        "assertResourceOwnership helper safely rejects foreign resource ID without disclosure",
        ownershipBlocked
      );

      // VECTOR 13: Concurrent Exploitation Resistance
      const concurrentAttempts = await Promise.all(
        Array.from({ length: 10 }).map(() => getAppointmentDetailsAction(alphaAppointment.id))
      );
      const allRejected = concurrentAttempts.every((r) => r.success === false);
      assert(
        allRejected,
        "AUTH-IDOR-14",
        "10 concurrent cross-tenant appointment requests all rejected without race leak",
        allRejected
      );
    });

  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP TEST FIXTURES
    // -------------------------------------------------------------------------
    console.log("\nTearing down test fixtures...");
    for (const orgId of cleanupOrgIds) {
      await db.delete(organizations).where(eq(organizations.id, orgId));
    }
    for (const userId of cleanupUserIds) {
      await db.delete(users).where(eq(users.id, userId));
    }
    console.log("Cleanup complete.");
  }

  console.log("\n================================================================================");
  console.log(`TOTAL ADVERSARIAL ISOLATION CHECKS: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAdversarialIsolationSuite().catch((err) => {
  console.error("Adversarial suite runtime error:", err);
  process.exit(1);
});
