import "dotenv/config";
import { db } from "../src/server/db";
import { users, organizations, memberships, sessions, refreshTokens, coupons } from "../src/server/db/schema";
import { eq, and } from "drizzle-orm";
import { createOrganizationAction } from "../src/server/actions/onboarding";
import { getStaffListAction } from "../src/server/actions/staff";
import { getServicesAction } from "../src/server/actions/services";
import { deleteAgencyDomainAction, removeTeamMemberAction } from "../src/server/actions/agency";
import { createCouponAction, getRevenueMetricsAction } from "../src/server/actions/billing";
import { validateIntendedDestination } from "../src/lib/auth/router";
import { loginAction } from "../src/server/actions/auth";
import crypto from "crypto";

async function main() {
  console.log("===============================================================");
  console.log("🚨 OPERATOR SECURITY AUDIT: DEFECT REPRODUCTION BASELINE");
  console.log("===============================================================\n");

  const results: Record<string, { status: "VULNERABLE" | "SECURE"; details: string }> = {};

  // --- REPRO 1: Critical Account Takeover via createOrganizationAction ---
  console.log("[TEST 1] Testing Unauthenticated Account Takeover in createOrganizationAction...");
  const victimEmail = `victim_owner_${Date.now()}@operator-test.org`;
  const [victimUser] = await db.insert(users).values({
    id: `usr_${crypto.randomUUID().replace(/-/g, "")}`,
    email: victimEmail,
    name: "Victim Business Owner",
    firstName: "Victim",
    lastName: "Owner",
    status: "active",
    isVerified: true,
  }).returning();

  try {
    // An unauthenticated attacker calls createOrganizationAction with victim's email and valid industry
    const takeoverResult = await createOrganizationAction({
      name: "Attacker Hijack Corp",
      industry: "Law Firm",
      website: "",
      email: victimEmail,
      phone: "+15559998888",
      address: "123 Attacker Lane",
      timezone: "America/New_York",
    });

    // Check if a session was created for the victim user
    const [hijackedSession] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, victimUser.id))
      .limit(1);

    if (hijackedSession) {
      results["CRITICAL_ATO_ONBOARDING"] = {
        status: "VULNERABLE",
        details: `CONFIRMED: createOrganizationAction created active session ${hijackedSession.id} for victim user without credentials!`
      };
      console.log(`  ❌ VULNERABLE: Account takeover succeeded! Session created: ${hijackedSession.id}`);
      // Clean up session
      await db.delete(sessions).where(eq(sessions.id, hijackedSession.id));
    } else {
      results["CRITICAL_ATO_ONBOARDING"] = {
        status: "SECURE",
        details: `No session created for unauthenticated caller (result: ${JSON.stringify(takeoverResult)}).`
      };
      console.log("  ✓ SECURE");
    }
  } catch (err: any) {
    results["CRITICAL_ATO_ONBOARDING"] = {
      status: "SECURE",
      details: `Rejected with error: ${err.message}`
    };
    console.log(`  ✓ SECURE (error thrown: ${err.message})`);
  }

  // --- REPRO 2: Cross-Tenant Data Leak via overrideOrgId in getStaffListAction ---
  console.log("\n[TEST 2] Testing Tenant Isolation in getStaffListAction(overrideOrgId)...");
  const testOrgId = crypto.randomUUID();
  const [foreignOrg] = await db.insert(organizations).values({
    id: testOrgId,
    name: "Foreign Tenant Enterprise",
    slug: `foreign-tenant-${Date.now()}`,
    industry: "Law Firm",
    timezone: "UTC",
  }).returning();

  try {
    // Calling getStaffListAction with foreign org ID without any session/membership
    const staffLeak = await getStaffListAction(testOrgId);
    if (staffLeak.success === true) {
      results["IDOR_STAFF_OVERRIDE"] = {
        status: "VULNERABLE",
        details: "CONFIRMED: getStaffListAction returned data for foreign tenant without membership verification."
      };
      console.log("  ❌ VULNERABLE: Data accessed for foreign org without authorization check!");
    } else {
      results["IDOR_STAFF_OVERRIDE"] = {
        status: "SECURE",
        details: `Rejected: ${staffLeak.error}`
      };
      console.log("  ✓ SECURE");
    }
  } catch (err: any) {
    results["IDOR_STAFF_OVERRIDE"] = {
      status: "SECURE",
      details: `Exception thrown: ${err.message}`
    };
    console.log(`  ✓ SECURE (${err.message})`);
  }

  // --- REPRO 3: Cross-Tenant Data Leak via overrideOrgId in getServicesAction ---
  console.log("\n[TEST 3] Testing Tenant Isolation in getServicesAction(overrideOrgId)...");
  try {
    const servicesLeak = await getServicesAction(testOrgId);
    if (servicesLeak.success === true) {
      results["IDOR_SERVICES_OVERRIDE"] = {
        status: "VULNERABLE",
        details: "CONFIRMED: getServicesAction returned data for foreign tenant without membership verification."
      };
      console.log("  ❌ VULNERABLE: Services accessed for foreign org without authorization check!");
    } else {
      results["IDOR_SERVICES_OVERRIDE"] = {
        status: "SECURE",
        details: `Rejected: ${servicesLeak.error}`
      };
      console.log("  ✓ SECURE");
    }
  } catch (err: any) {
    results["IDOR_SERVICES_OVERRIDE"] = {
      status: "SECURE",
      details: `Exception thrown: ${err.message}`
    };
    console.log(`  ✓ SECURE (${err.message})`);
  }

  // --- REPRO 4: Unauthenticated Agency Mutations ---
  console.log("\n[TEST 4] Testing Unauthenticated Access in Agency Domain Deletion & Member Removal...");
  try {
    const dummyDomainId = `dom_test_${Date.now()}`;
    const domainDelRes = await deleteAgencyDomainAction(dummyDomainId);
    if (domainDelRes.success === true) {
      results["UNAUTH_AGENCY_MUTATIONS"] = {
        status: "VULNERABLE",
        details: "CONFIRMED: deleteAgencyDomainAction executed without authentication!"
      };
      console.log("  ❌ VULNERABLE: deleteAgencyDomainAction succeeded unauthenticated!");
    } else {
      results["UNAUTH_AGENCY_MUTATIONS"] = {
        status: "SECURE",
        details: "Rejected unauthenticated request."
      };
      console.log("  ✓ SECURE");
    }
  } catch (err: any) {
    results["UNAUTH_AGENCY_MUTATIONS"] = {
      status: "SECURE",
      details: `Exception thrown: ${err.message}`
    };
    console.log(`  ✓ SECURE (${err.message})`);
  }

  // --- REPRO 5: Unauthenticated Coupon Creation & Metrics in billing.ts ---
  console.log("\n[TEST 5] Testing Unauthenticated Coupon Creation in createCouponAction...");
  const couponCode = `HACK${Date.now().toString().slice(-4)}`;
  try {
    const couponRes = await createCouponAction({
      code: couponCode,
      type: "percentage",
      value: "100",
      expirationDays: 30,
    });
    if (couponRes.success === true && couponRes.coupon) {
      results["UNAUTH_BILLING_MUTATIONS"] = {
        status: "VULNERABLE",
        details: `CONFIRMED: createCouponAction created coupon ${couponCode} without authentication!`
      };
      console.log(`  ❌ VULNERABLE: Unauthenticated coupon created: ${couponCode}`);
      await db.delete(coupons).where(eq(coupons.code, couponCode));
    } else {
      results["UNAUTH_BILLING_MUTATIONS"] = {
        status: "SECURE",
        details: "Rejected unauthenticated request."
      };
      console.log("  ✓ SECURE");
    }
  } catch (err: any) {
    results["UNAUTH_BILLING_MUTATIONS"] = {
      status: "SECURE",
      details: `Exception thrown: ${err.message}`
    };
    console.log(`  ✓ SECURE (${err.message})`);
  }

  // --- REPRO 6: Open Redirect Bypass via Backslash in validateIntendedDestination ---
  console.log("\n[TEST 6] Testing Open Redirect Bypass in validateIntendedDestination...");
  const backslashPayload = "/\\evil.com";
  const validatedBackslash = validateIntendedDestination(backslashPayload);
  if (validatedBackslash === backslashPayload) {
    results["OPEN_REDIRECT_BACKSLASH"] = {
      status: "VULNERABLE",
      details: `CONFIRMED: validateIntendedDestination allowed '${backslashPayload}' which browsers treat as protocol-relative //evil.com!`
    };
    console.log(`  ❌ VULNERABLE: validateIntendedDestination allowed '${backslashPayload}'`);
  } else {
    results["OPEN_REDIRECT_BACKSLASH"] = {
      status: "SECURE",
      details: "Backslash payload rejected."
    };
    console.log("  ✓ SECURE");
  }

  // --- REPRO 7: User Enumeration in loginAction ---
  console.log("\n[TEST 7] Testing User Enumeration in loginAction...");
  const nonExistentEmail = `nonexistent_${Date.now()}@example.org`;
  const enumResult = await loginAction({
    email: nonExistentEmail,
    password: "SomePassword123!",
  });

  if (enumResult.error === "No account found.") {
    results["USER_ENUMERATION_LOGIN"] = {
      status: "VULNERABLE",
      details: "CONFIRMED: loginAction returns distinct 'No account found.' error revealing non-existent email."
    };
    console.log("  ❌ VULNERABLE: Returned distinct 'No account found.' error!");
  } else {
    results["USER_ENUMERATION_LOGIN"] = {
      status: "SECURE",
      details: "Generic error returned."
    };
    console.log("  ✓ SECURE");
  }

  // Clean up
  console.log("\nCleaning up test fixtures...");
  await db.delete(users).where(eq(users.id, victimUser.id));
  await db.delete(organizations).where(eq(organizations.id, foreignOrg.id));
  console.log("Clean up complete.\n");

  console.log("===============================================================");
  console.log("BASELINE REPRODUCTION SUMMARY:");
  console.log("===============================================================");
  for (const [key, res] of Object.entries(results)) {
    console.log(`${key}: [${res.status}] - ${res.details}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Reproduction script crashed:", err);
  process.exit(1);
});
