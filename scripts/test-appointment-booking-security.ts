/**
 * OPERATOR — PUBLIC APPOINTMENT BOOKING SECURITY & REGRESSION SUITE
 *
 * Verifies all 12 appointment booking security scenarios:
 * 1. Authenticated member books for authorized organization.
 * 2. Authenticated user attempts to book for foreign organization.
 * 3. Unauthenticated user books through legitimate, enabled public booking flow.
 * 4. Unauthenticated user supplies an arbitrary/non-existent organization ID.
 * 5. Public booking is disabled for the target organization.
 * 6. An invalid or unpublished service is submitted.
 * 7. A staff member who cannot provide the selected service is submitted.
 * 8. A requested time falls outside business hours.
 * 9. The requested slot is already booked.
 * 10. Two concurrent requests attempt to reserve the same slot.
 * 11. The submitted timezone differs from the business timezone.
 * 12. Request attempts to manipulate tenant ownership through additional payload fields.
 */

import { db } from "../src/server/db";
import {
  users,
  organizations,
  memberships,
  services,
  staffMembers,
  serviceAssignments,
  businessSettings,
  appointments,
} from "../src/server/db/schema";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";
import { serverAuthStorage } from "../src/lib/auth/server";
import { createSession } from "../src/lib/auth/session";
import { createAppointmentAction } from "../src/server/actions/appointments";
import { bookingService } from "../src/server/services/booking";
import { orchestratorService } from "../src/server/services/orchestrator";

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

async function runAppointmentSecuritySuite() {
  console.log("================================================================================");
  console.log("   OPERATOR APPOINTMENT BOOKING SECURITY & REGRESSION MATRIX                    ");
  console.log("================================================================================\n");

  const cleanupUserIds: string[] = [];
  const cleanupOrgIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // SETUP FIXTURES: TENANT ALPHA (Public enabled), TENANT BETA (Foreign), TENANT GAMMA (Public disabled)
    // -------------------------------------------------------------------------
    const tenantAlphaId = crypto.randomUUID();
    await db.insert(organizations).values({
      id: tenantAlphaId,
      name: "Alpha Clinic (Public Enabled)",
      slug: `alpha-clinic-${Date.now()}`,
      industry: "Healthcare",
      timezone: "UTC",
    });
    cleanupOrgIds.push(tenantAlphaId);

    // Business settings for Alpha: public booking ENABLED
    await db.insert(businessSettings).values({
      organizationId: tenantAlphaId,
      businessHours: {
        monday: { open: "09:00", close: "17:00", closed: false },
        tuesday: { open: "09:00", close: "17:00", closed: false },
        wednesday: { open: "09:00", close: "17:00", closed: false },
        thursday: { open: "09:00", close: "17:00", closed: false },
        friday: { open: "09:00", close: "17:00", closed: false },
        saturday: { open: "09:00", close: "17:00", closed: true },
        sunday: { open: "09:00", close: "17:00", closed: true },
      },
      bookingPreferences: {
        publicBookingEnabled: true,
        slotIntervalMinutes: 30,
        bufferMinutes: 0,
      },
    });

    const tenantBetaId = crypto.randomUUID();
    await db.insert(organizations).values({
      id: tenantBetaId,
      name: "Beta Dental (Foreign Org)",
      slug: `beta-dental-${Date.now()}`,
      industry: "Healthcare",
      timezone: "UTC",
    });
    cleanupOrgIds.push(tenantBetaId);

    const tenantGammaId = crypto.randomUUID();
    await db.insert(organizations).values({
      id: tenantGammaId,
      name: "Gamma Private Care (Public Disabled)",
      slug: `gamma-private-${Date.now()}`,
      industry: "Healthcare",
      timezone: "UTC",
    });
    cleanupOrgIds.push(tenantGammaId);

    // Business settings for Gamma: public booking DISABLED
    await db.insert(businessSettings).values({
      organizationId: tenantGammaId,
      businessHours: {
        monday: { open: "09:00", close: "17:00", closed: false },
      },
      bookingPreferences: {
        publicBookingEnabled: false,
      },
    });

    // Tenant Delta: businessSettings exist, but bookingPreferences is empty (missing publicBookingEnabled)
    const tenantDeltaId = crypto.randomUUID();
    await db.insert(organizations).values({
      id: tenantDeltaId,
      name: "Delta Clinic (Missing Setting)",
      slug: `delta-clinic-${Date.now()}`,
      industry: "Healthcare",
      timezone: "UTC",
    });
    cleanupOrgIds.push(tenantDeltaId);
    await db.insert(businessSettings).values({
      organizationId: tenantDeltaId,
      businessHours: { monday: { open: "09:00", close: "17:00", closed: false } },
      bookingPreferences: {},
    });

    // Tenant Epsilon: bookingPreferences has publicBookingEnabled: null
    const tenantEpsilonId = crypto.randomUUID();
    await db.insert(organizations).values({
      id: tenantEpsilonId,
      name: "Epsilon Care (Null Setting)",
      slug: `epsilon-care-${Date.now()}`,
      industry: "Healthcare",
      timezone: "UTC",
    });
    cleanupOrgIds.push(tenantEpsilonId);
    await db.insert(businessSettings).values({
      organizationId: tenantEpsilonId,
      businessHours: { monday: { open: "09:00", close: "17:00", closed: false } },
      bookingPreferences: { publicBookingEnabled: null },
    });

    // Tenant Zeta: bookingPreferences has malformed publicBookingEnabled: "true" (string)
    const tenantZetaId = crypto.randomUUID();
    await db.insert(organizations).values({
      id: tenantZetaId,
      name: "Zeta Care (String Setting)",
      slug: `zeta-care-${Date.now()}`,
      industry: "Healthcare",
      timezone: "UTC",
    });
    cleanupOrgIds.push(tenantZetaId);
    await db.insert(businessSettings).values({
      organizationId: tenantZetaId,
      businessHours: { monday: { open: "09:00", close: "17:00", closed: false } },
      bookingPreferences: { publicBookingEnabled: "true" as any },
    });

    // Tenant Eta: bookingPreferences has malformed publicBookingEnabled: 1 (number)
    const tenantEtaId = crypto.randomUUID();
    await db.insert(organizations).values({
      id: tenantEtaId,
      name: "Eta Care (Numeric Setting)",
      slug: `eta-care-${Date.now()}`,
      industry: "Healthcare",
      timezone: "UTC",
    });
    cleanupOrgIds.push(tenantEtaId);
    await db.insert(businessSettings).values({
      organizationId: tenantEtaId,
      businessHours: { monday: { open: "09:00", close: "17:00", closed: false } },
      bookingPreferences: { publicBookingEnabled: 1 as any },
    });

    // Users
    const userAlphaId = `usr_${crypto.randomUUID().replace(/-/g, "")}`;
    await db.insert(users).values({
      id: userAlphaId,
      email: `alice_alpha_${Date.now()}@test.org`,
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

    const sessionAlpha = await createSession(userAlphaId, "Alpha Test Suite", "127.0.0.1", false);

    const userBetaId = `usr_${crypto.randomUUID().replace(/-/g, "")}`;
    await db.insert(users).values({
      id: userBetaId,
      email: `bob_beta_${Date.now()}@test.org`,
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

    const sessionBeta = await createSession(userBetaId, "Beta Test Suite", "127.0.0.1", false);

    // Gamma User, Staff & Service (Organization with public booking DISABLED)
    const userGammaId = `usr_${crypto.randomUUID().replace(/-/g, "")}`;
    await db.insert(users).values({
      id: userGammaId,
      email: `grace_gamma_${Date.now()}@test.org`,
      firstName: "Grace",
      lastName: "Gamma",
      status: "active",
      isVerified: true,
    });
    cleanupUserIds.push(userGammaId);

    await db.insert(memberships).values({
      userId: userGammaId,
      organizationId: tenantGammaId,
      role: "owner",
    });

    const sessionGamma = await createSession(userGammaId, "Gamma Test Suite", "127.0.0.1", false);

    const [gammaStaffQualified] = await db.insert(staffMembers).values({
      organizationId: tenantGammaId,
      name: "Dr. Qualified Gamma",
      role: "Lead Clinician",
      isActive: true,
    }).returning();

    const [gammaServiceActive] = await db.insert(services).values({
      organizationId: tenantGammaId,
      name: "Private Clinical Consultation",
      duration: 45,
      price: "150.00",
      isActive: true,
      isArchived: false,
    }).returning();

    await db.insert(serviceAssignments).values({
      organizationId: tenantGammaId,
      serviceId: gammaServiceActive.id,
      staffMemberId: gammaStaffQualified.id,
    });

    // Alpha Staff Members
    const [alphaStaffQualified] = await db.insert(staffMembers).values({
      organizationId: tenantAlphaId,
      name: "Dr. Qualified Alpha",
      role: "Specialist",
      isActive: true,
    }).returning();

    const [alphaStaffUnqualified] = await db.insert(staffMembers).values({
      organizationId: tenantAlphaId,
      name: "Trainee Staff",
      role: "Trainee",
      isActive: true,
    }).returning();

    // Alpha Published Active Service
    const [alphaServiceActive] = await db.insert(services).values({
      organizationId: tenantAlphaId,
      name: "General Health Checkup",
      duration: 30,
      price: "60.00",
      isActive: true,
      isArchived: false,
    }).returning();

    // Assign Dr. Qualified Alpha to Active Service (Trainee is NOT assigned)
    await db.insert(serviceAssignments).values({
      organizationId: tenantAlphaId,
      serviceId: alphaServiceActive.id,
      staffMemberId: alphaStaffQualified.id,
    });

    // Alpha Unpublished/Archived Service
    const [alphaServiceArchived] = await db.insert(services).values({
      organizationId: tenantAlphaId,
      name: "Discontinued VIP Treatment",
      duration: 60,
      price: "250.00",
      isActive: false,
      isArchived: true,
    }).returning();

    console.log("Fixtures created successfully. Executing test scenarios...\n");

    // -------------------------------------------------------------------------
    // SCENARIO 1: Authenticated member books for authorized organization
    // -------------------------------------------------------------------------
    let res1: any;
    await serverAuthStorage.run({ sessionToken: sessionAlpha.sessionToken, activeOrgId: tenantAlphaId }, async () => {
      res1 = await createAppointmentAction({
        serviceId: alphaServiceActive.id,
        staffMemberId: alphaStaffQualified.id,
        startTime: "2027-04-12T10:00:00.000Z", // Monday at 10:00 AM (Within 9-17)
        customerName: "Alice Client",
        customerEmail: "client@test.org",
        organizationId: tenantAlphaId,
      });
    });
    assert(
      res1?.success === true && !!res1?.appointment?.id,
      "SCEN-01",
      "Authenticated member successfully books appointment for authorized organization",
      res1
    );

    // -------------------------------------------------------------------------
    // SCENARIO 2: Authenticated user attempts to book for foreign organization
    // -------------------------------------------------------------------------
    let res2: any;
    await serverAuthStorage.run({ sessionToken: sessionBeta.sessionToken, activeOrgId: tenantBetaId }, async () => {
      res2 = await createAppointmentAction({
        serviceId: alphaServiceActive.id,
        staffMemberId: alphaStaffQualified.id,
        startTime: "2027-04-12T11:00:00.000Z",
        customerName: "Attacker Injected Booking",
        customerEmail: "attacker@beta.com",
        organizationId: tenantAlphaId, // Malicious target: Tenant Alpha!
      });
    });
    assert(
      res2?.success === false && res2?.error?.includes("Access denied: You are not authorized to book appointments in this organization."),
      "SCEN-02",
      "Authenticated user rejected when attempting to book into foreign organization without membership",
      res2
    );

    // -------------------------------------------------------------------------
    // SCENARIO 3: Unauthenticated user books through legitimate enabled public booking flow
    // -------------------------------------------------------------------------
    const res3 = await createAppointmentAction({
      serviceId: alphaServiceActive.id,
      staffMemberId: alphaStaffQualified.id,
      startTime: "2027-04-12T14:00:00.000Z", // Monday at 2:00 PM (Within 9-17)
      customerName: "Public Customer Walk-in",
      customerEmail: "public@guest.com",
      organizationId: tenantAlphaId,
    });
    assert(
      res3?.success === true && !!res3?.appointment?.id,
      "SCEN-03",
      "Unauthenticated user succeeds through legitimate enabled public booking flow",
      res3
    );

    // -------------------------------------------------------------------------
    // SCENARIO 4: Unauthenticated user supplies arbitrary non-existent organization ID
    // -------------------------------------------------------------------------
    const fakeOrgId = crypto.randomUUID();
    const res4 = await createAppointmentAction({
      serviceId: alphaServiceActive.id,
      staffMemberId: alphaStaffQualified.id,
      startTime: "2027-04-12T15:00:00.000Z",
      customerName: "Anonymous Spammer",
      organizationId: fakeOrgId,
    });
    assert(
      res4?.success === false && (res4?.error?.includes("Target organization not found") || res4?.error?.includes("Organization not found")),
      "SCEN-04",
      "Unauthenticated user supplying arbitrary non-existent organization ID is rejected",
      res4
    );

    // -------------------------------------------------------------------------
    // SCENARIO 5: Public booking configuration matrix (Fail-Closed Enforcement)
    // -------------------------------------------------------------------------
    // 5a: Target organization has NO businessSettings row at all (absent settings)
    const res5a = await createAppointmentAction({
      serviceId: alphaServiceActive.id,
      staffMemberId: alphaStaffQualified.id,
      startTime: "2027-04-12T10:00:00.000Z",
      customerName: "Public Visitor",
      organizationId: tenantBetaId,
    });
    assert(
      res5a?.success === false && res5a?.error?.includes("Public booking is disabled for this organization."),
      "SCEN-05a",
      "Public booking fails closed when target organization has NO businessSettings row",
      res5a
    );

    // 5b: Missing publicBookingEnabled in preferences (empty object {})
    const res5b = await createAppointmentAction({
      serviceId: alphaServiceActive.id,
      staffMemberId: alphaStaffQualified.id,
      startTime: "2027-04-12T10:00:00.000Z",
      customerName: "Public Visitor",
      organizationId: tenantDeltaId,
    });
    assert(
      res5b?.success === false && res5b?.error?.includes("Public booking is disabled for this organization."),
      "SCEN-05b",
      "Public booking fails closed when publicBookingEnabled field is missing/empty",
      res5b
    );

    // 5c: Null publicBookingEnabled in preferences
    const res5c = await createAppointmentAction({
      serviceId: alphaServiceActive.id,
      staffMemberId: alphaStaffQualified.id,
      startTime: "2027-04-12T10:00:00.000Z",
      customerName: "Public Visitor",
      organizationId: tenantEpsilonId,
    });
    assert(
      res5c?.success === false && res5c?.error?.includes("Public booking is disabled for this organization."),
      "SCEN-05c",
      "Public booking fails closed when publicBookingEnabled is explicitly null",
      res5c
    );

    // 5d: Malformed string publicBookingEnabled ("true")
    const res5d = await createAppointmentAction({
      serviceId: alphaServiceActive.id,
      staffMemberId: alphaStaffQualified.id,
      startTime: "2027-04-12T10:00:00.000Z",
      customerName: "Public Visitor",
      organizationId: tenantZetaId,
    });
    assert(
      res5d?.success === false && res5d?.error?.includes("Public booking is disabled for this organization."),
      "SCEN-05d",
      "Public booking fails closed when publicBookingEnabled is non-boolean string 'true'",
      res5d
    );

    // 5e: Malformed numeric publicBookingEnabled (1)
    const res5e = await createAppointmentAction({
      serviceId: alphaServiceActive.id,
      staffMemberId: alphaStaffQualified.id,
      startTime: "2027-04-12T10:00:00.000Z",
      customerName: "Public Visitor",
      organizationId: tenantEtaId,
    });
    assert(
      res5e?.success === false && res5e?.error?.includes("Public booking is disabled for this organization."),
      "SCEN-05e",
      "Public booking fails closed when publicBookingEnabled is non-boolean number 1",
      res5e
    );

    // 5f: Explicitly disabled publicBookingEnabled: false (Gamma)
    const res5 = await createAppointmentAction({
      serviceId: alphaServiceActive.id,
      staffMemberId: alphaStaffQualified.id,
      startTime: "2027-04-12T10:00:00.000Z",
      customerName: "Public Visitor",
      organizationId: tenantGammaId,
    });
    assert(
      res5?.success === false && res5?.error?.includes("Public booking is disabled for this organization."),
      "SCEN-05",
      "Public booking rejected when target organization has publicBookingEnabled disabled (false)",
      res5
    );

    // 5g: Bypass attempt via caller-controlled flag manipulation (isPublic: false on service)
    let res5FlagBypassA: any = null;
    let err5FlagBypassA: any = null;
    try {
      res5FlagBypassA = await bookingService.createAppointment({
        organizationId: tenantGammaId,
        serviceId: gammaServiceActive.id,
        staffMemberId: gammaStaffQualified.id,
        startTime: new Date("2027-04-12T10:00:00.000Z"),
        customerName: "Sneaky Public Caller",
        customerEmail: "sneaky@public.com",
        isPublic: false, // Attempting to trick service by passing isPublic: false without staff session!
      });
    } catch (e: any) {
      err5FlagBypassA = e;
    }
    assert(
      !res5FlagBypassA && err5FlagBypassA?.message?.includes("Public booking is disabled for this organization."),
      "SCEN-05-FLAG-BYPASS-A",
      "Public caller cannot bypass public booking check by passing isPublic: false to bookingService",
      err5FlagBypassA?.message
    );

    // 5h: Bypass attempt via omitted isPublic flag on lower-level bookingService
    let res5FlagBypassB: any = null;
    let err5FlagBypassB: any = null;
    try {
      res5FlagBypassB = await bookingService.createAppointment({
        organizationId: tenantGammaId,
        serviceId: gammaServiceActive.id,
        staffMemberId: gammaStaffQualified.id,
        startTime: new Date("2027-04-12T11:00:00.000Z"),
        customerName: "Omitted Flag Public Caller",
        customerEmail: "omitted@public.com",
        // isPublic flag omitted entirely!
      });
    } catch (e: any) {
      err5FlagBypassB = e;
    }
    assert(
      !res5FlagBypassB && err5FlagBypassB?.message?.includes("Public booking is disabled for this organization."),
      "SCEN-05-FLAG-BYPASS-B",
      "Public caller cannot bypass public booking check by omitting isPublic flag on bookingService",
      err5FlagBypassB?.message
    );

    // 5i: Public visitor booking attempt via AI receptionist orchestrator flow
    const aiOrchestratorRes = await orchestratorService.processMessage({
      organizationId: tenantGammaId,
      userMessage: "I want to schedule an appointment for consultation",
    });
    const [gammaAppointments] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(appointments)
      .where(eq(appointments.organizationId, tenantGammaId));

    assert(
      aiOrchestratorRes.assistantMessage.includes("Online booking is currently disabled") &&
      (gammaAppointments?.count === 0 || !gammaAppointments),
      "SCEN-05-AI-WIDGET",
      "AI receptionist strictly refuses booking when publicBookingEnabled is false and creates 0 appointments",
      aiOrchestratorRes.assistantMessage
    );

    // 5j: Authorized internal staff booking succeeds even when public booking is disabled (Gamma)
    let res5InternalAction: any = null;
    await serverAuthStorage.run({ sessionToken: sessionGamma.sessionToken, activeOrgId: tenantGammaId }, async () => {
      res5InternalAction = await createAppointmentAction({
        serviceId: gammaServiceActive.id,
        staffMemberId: gammaStaffQualified.id,
        startTime: "2027-04-12T10:00:00.000Z",
        customerName: "Walk-in Patient via Staff",
        customerEmail: "walkin@patient.com",
        organizationId: tenantGammaId,
      });
    });
    assert(
      res5InternalAction?.success === true && !!res5InternalAction?.appointment?.id,
      "SCEN-05-INTERNAL-ACTION",
      "Legitimate internal staff booking preserved via createAppointmentAction when public booking is disabled",
      res5InternalAction
    );

    // 5k: Authorized internal staff booking succeeds directly via bookingService
    let res5InternalService: any = null;
    await serverAuthStorage.run({ sessionToken: sessionGamma.sessionToken, activeOrgId: tenantGammaId }, async () => {
      res5InternalService = await bookingService.createAppointment({
        organizationId: tenantGammaId,
        serviceId: gammaServiceActive.id,
        staffMemberId: gammaStaffQualified.id,
        startTime: new Date("2027-04-12T11:00:00.000Z"),
        customerName: "VIP Patient via Staff Service",
        customerEmail: "vip@patient.com",
      });
    });
    assert(
      !!res5InternalService?.id,
      "SCEN-05-INTERNAL-SERVICE",
      "Legitimate internal staff booking preserved directly via bookingService when public booking is disabled",
      res5InternalService
    );

    // -------------------------------------------------------------------------
    // SCENARIO 6: An invalid or unpublished/archived service is submitted
    // -------------------------------------------------------------------------
    const res6 = await createAppointmentAction({
      serviceId: alphaServiceArchived.id, // Archived service!
      staffMemberId: alphaStaffQualified.id,
      startTime: "2027-04-12T10:30:00.000Z",
      customerName: "VIP Customer",
      organizationId: tenantAlphaId,
    });
    assert(
      res6?.success === false && res6?.error?.includes("Service is unavailable or unpublished."),
      "SCEN-06",
      "Rejected when submitting an unpublished or archived service",
      res6
    );

    // -------------------------------------------------------------------------
    // SCENARIO 7: Staff member who cannot provide selected service is submitted
    // -------------------------------------------------------------------------
    const res7 = await createAppointmentAction({
      serviceId: alphaServiceActive.id,
      staffMemberId: alphaStaffUnqualified.id, // Unassigned trainee!
      startTime: "2027-04-12T11:30:00.000Z",
      customerName: "Patient Seeking Specialist",
      organizationId: tenantAlphaId,
    });
    assert(
      res7?.success === false && res7?.error?.includes("The selected staff member is not eligible to provide this service."),
      "SCEN-07",
      "Rejected when submitting a staff member not eligible/assigned to the service",
      res7
    );

    // 7b: Cross-tenant service submitted (Tenant Alpha booking with Tenant Gamma service)
    const res7CrossService = await createAppointmentAction({
      serviceId: gammaServiceActive.id, // Foreign service from Gamma!
      staffMemberId: alphaStaffQualified.id,
      startTime: "2027-04-12T12:00:00.000Z",
      customerName: "Cross Tenant Attacker",
      organizationId: tenantAlphaId,
    });
    assert(
      res7CrossService?.success === false && res7CrossService?.error?.includes("Service not found or unauthorized"),
      "SCEN-07-CROSS-SERVICE",
      "Rejected when submitting a service belonging to a foreign tenant",
      res7CrossService
    );

    // 7c: Cross-tenant staff submitted (Tenant Alpha booking with Tenant Gamma staff)
    const res7CrossStaff = await createAppointmentAction({
      serviceId: alphaServiceActive.id,
      staffMemberId: gammaStaffQualified.id, // Foreign staff from Gamma!
      startTime: "2027-04-12T12:30:00.000Z",
      customerName: "Cross Staff Attacker",
      organizationId: tenantAlphaId,
    });
    assert(
      res7CrossStaff?.success === false && res7CrossStaff?.error?.includes("Staff member not found or access denied."),
      "SCEN-07-CROSS-STAFF",
      "Rejected when submitting a staff member belonging to a foreign tenant",
      res7CrossStaff
    );

    // -------------------------------------------------------------------------
    // SCENARIO 8: Requested time falls outside business hours (e.g. 03:00 AM)
    // -------------------------------------------------------------------------
    const res8 = await createAppointmentAction({
      serviceId: alphaServiceActive.id,
      staffMemberId: alphaStaffQualified.id,
      startTime: "2027-04-12T03:00:00.000Z", // 3:00 AM (Outside 9-17)
      customerName: "Midnight Caller",
      organizationId: tenantAlphaId,
    });
    assert(
      res8?.success === false && res8?.error?.includes("outside business hours"),
      "SCEN-08",
      "Rejected when requested time falls outside organization business hours (03:00 AM)",
      res8
    );

    // -------------------------------------------------------------------------
    // SCENARIO 9: The requested slot is already booked (double-booking attempt)
    // -------------------------------------------------------------------------
    // res1 booked Monday 2027-04-12T10:00:00.000Z with alphaStaffQualified.
    // Try to book the exact same slot again:
    const res9 = await createAppointmentAction({
      serviceId: alphaServiceActive.id,
      staffMemberId: alphaStaffQualified.id,
      startTime: "2027-04-12T10:00:00.000Z", // Duplicate slot!
      customerName: "Conflicting Customer",
      organizationId: tenantAlphaId,
    });
    assert(
      res9?.success === false && (res9?.error?.includes("Concurrency Conflict") || res9?.error?.includes("no longer available")),
      "SCEN-09",
      "Rejected when attempting to double-book an already reserved slot",
      res9
    );

    // -------------------------------------------------------------------------
    // SCENARIO 10: Two concurrent requests attempt to reserve the same slot
    // -------------------------------------------------------------------------
    const concurrentSlot = "2027-04-12T16:00:00.000Z";
    const [c1, c2] = await Promise.all([
      createAppointmentAction({
        serviceId: alphaServiceActive.id,
        staffMemberId: alphaStaffQualified.id,
        startTime: concurrentSlot,
        customerName: "Racer One",
        organizationId: tenantAlphaId,
      }),
      createAppointmentAction({
        serviceId: alphaServiceActive.id,
        staffMemberId: alphaStaffQualified.id,
        startTime: concurrentSlot,
        customerName: "Racer Two",
        organizationId: tenantAlphaId,
      }),
    ]);

    const successes = [c1, c2].filter((r) => r.success);
    const conflicts = [c1, c2].filter((r) => !r.success);
    assert(
      successes.length === 1 && conflicts.length === 1,
      "SCEN-10",
      `Concurrent booking collision safely resolved: 1 booked, 1 rejected with conflict (successes: ${successes.length}, conflicts: ${conflicts.length})`
    );

    // -------------------------------------------------------------------------
    // SCENARIO 11: Submitted timezone differs from business timezone
    // -------------------------------------------------------------------------
    // Business is in UTC. Caller submits ISO string with IST offset (+05:30):
    // 15:30 IST is 10:00 UTC (valid business hours: 10:00)
    const res11 = await createAppointmentAction({
      serviceId: alphaServiceActive.id,
      staffMemberId: alphaStaffQualified.id,
      startTime: "2027-04-13T15:30:00.000+05:30", // Translates to 10:00:00 UTC Tuesday
      customerName: "Indian Customer",
      organizationId: tenantAlphaId,
    });
    assert(
      res11?.success === true && !!res11?.appointment?.id,
      "SCEN-11",
      "Timezone offset (+05:30) correctly normalized to business UTC timezone (10:00 UTC)",
      res11
    );

    // -------------------------------------------------------------------------
    // SCENARIO 12: Request attempts to manipulate tenant ownership through payload
    // -------------------------------------------------------------------------
    let res12: any;
    await serverAuthStorage.run({ sessionToken: sessionBeta.sessionToken, activeOrgId: tenantBetaId }, async () => {
      // Attacker attempts to book under their tenantBetaId but tries to inject organizationId: tenantAlphaId
      res12 = await createAppointmentAction({
        serviceId: alphaServiceActive.id,
        staffMemberId: alphaStaffQualified.id,
        startTime: "2027-04-13T14:00:00.000Z",
        customerName: "Injected Payload Attacker",
        organizationId: tenantAlphaId,
      });
    });

    // Verify database record was NOT created in Tenant Alpha
    const [tamperedApt] = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.organizationId, tenantAlphaId),
          eq(appointments.customerName, "Injected Payload Attacker")
        )
      );

    assert(
      res12?.success === false && !tamperedApt,
      "SCEN-12",
      "Payload manipulation blocked and zero records created in foreign tenant database"
    );

  } catch (error: any) {
    console.error("Unexpected failure in appointment security suite:", error);
    failed++;
  } finally {
    console.log("\nCleaning up test fixtures...");
    for (const orgId of cleanupOrgIds) {
      await db.delete(organizations).where(eq(organizations.id, orgId));
    }
    for (const userId of cleanupUserIds) {
      await db.delete(users).where(eq(users.id, userId));
    }
    console.log("Cleanup complete.\n");
  }

  console.log("================================================================================");
  console.log(`TOTAL APPOINTMENT SECURITY SCENARIOS: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAppointmentSecuritySuite().catch((err) => {
  console.error("Fatal error running appointment security suite:", err);
  process.exit(1);
});
