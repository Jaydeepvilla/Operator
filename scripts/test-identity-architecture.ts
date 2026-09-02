import "dotenv/config";
import { resolveOrCreateOAuthIdentity } from "../src/lib/auth/identity";
import { resolveUserDestination, validateIntendedDestination } from "../src/lib/auth/router";
import { hasPermission } from "../src/lib/auth/permissions";
import { db } from "../src/server/db";
import { users, accounts, organizations, memberships } from "../src/server/db/schema";
import { eq } from "drizzle-orm";

async function runAcceptanceTests() {
  console.log("=================================================");
  console.log("🧪 RUNNING IDENTITY, ROUTING & SECURITY AUDIT TESTS");
  console.log("=================================================\n");

  const testGoogleId = "goog_test_sub_" + Date.now();
  const testEmail = `test.operator.${Date.now()}@example.com`;

  // ----------------------------------------------------
  // TEST 1: New Google User Registration & Workspace Setup
  // ----------------------------------------------------
  console.log("🔹 Test 1: New Google User Registration...");
  const identity1 = await resolveOrCreateOAuthIdentity({
    provider: "google",
    providerAccountId: testGoogleId,
    email: testEmail,
    name: "Alex Johnson",
    firstName: "Alex",
    lastName: "Johnson",
  });

  if (!identity1.isNewUser) throw new Error("Test 1 Failed: Expected isNewUser === true");
  if (identity1.onboardingStatus !== "not_started") throw new Error("Test 1 Failed: Expected onboardingStatus === 'not_started'");

  const route1 = await resolveUserDestination(identity1.user.id, null, identity1.organization?.id);
  if (route1.destination !== "/onboarding") throw new Error(`Test 1 Failed: Expected destination '/onboarding', got '${route1.destination}'`);
  console.log("   ✅ Passed: New user recognized, workspace created with onboardingStatus='not_started', routed to '/onboarding'.\n");

  // ----------------------------------------------------
  // TEST 2: Resumable Onboarding Progress Persistence
  // ----------------------------------------------------
  console.log("🔹 Test 2: Resumable Onboarding Step Tracking...");
  await db
    .update(organizations)
    .set({
      onboardingStatus: "in_progress",
      onboardingStep: "verify",
      onboardingData: { businessName: "Apex Medical Clinic", industry: "Medical Clinic" },
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, identity1.organization!.id));

  const route2 = await resolveUserDestination(identity1.user.id, null, identity1.organization?.id);
  if (route2.destination !== "/onboarding?step=verify") {
    throw new Error(`Test 2 Failed: Expected destination '/onboarding?step=verify', got '${route2.destination}'`);
  }
  console.log("   ✅ Passed: In-progress step saved server-side, user resumes at '/onboarding?step=verify'.\n");

  // ----------------------------------------------------
  // TEST 3: Onboarding Completion
  // ----------------------------------------------------
  console.log("🔹 Test 3: Onboarding Completion State...");
  await db
    .update(organizations)
    .set({
      onboardingStatus: "completed",
      onboardingStep: "completed",
      verificationStatus: "verified",
      onboardingCompletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, identity1.organization!.id));

  const route3 = await resolveUserDestination(identity1.user.id, null, identity1.organization?.id);
  if (route3.destination !== "/dashboard") {
    throw new Error(`Test 3 Failed: Expected destination '/dashboard', got '${route3.destination}'`);
  }
  console.log("   ✅ Passed: Completed organization resolves directly to '/dashboard'.\n");

  // ----------------------------------------------------
  // TEST 4: Existing User Re-authentication (The Primary Bug Fix)
  // ----------------------------------------------------
  console.log("🔹 Test 4: Existing User Re-authentication (Google Login/Signup)...");
  const identity2 = await resolveOrCreateOAuthIdentity({
    provider: "google",
    providerAccountId: testGoogleId,
    email: testEmail,
    name: "Alex Johnson",
  });

  if (identity2.isNewUser) throw new Error("Test 4 Failed: Expected isNewUser === false for returning Google user");
  if (identity2.user.id !== identity1.user.id) throw new Error("Test 4 Failed: User ID changed, duplicate created!");

  const route4 = await resolveUserDestination(identity2.user.id, null, identity2.organization?.id);
  if (route4.destination !== "/dashboard") {
    throw new Error(`Test 4 Failed: Expected returning completed user to route to '/dashboard', but got '${route4.destination}'`);
  }
  console.log("   ✅ Passed: Single identity recognized, existing user reused, routed to '/dashboard', NEVER restart onboarding.\n");

  // ----------------------------------------------------
  // TEST 5: Intended Destination & Open-Redirect Protection
  // ----------------------------------------------------
  console.log("🔹 Test 5: Intended Deep-Link Return & Open-Redirect Protection...");
  const safeLink = validateIntendedDestination("/leads");
  if (safeLink !== "/leads") throw new Error("Test 5 Failed: Valid deep link rejected");

  const evilLink1 = validateIntendedDestination("//evil.com");
  if (evilLink1 !== null) throw new Error("Test 5 Failed: Open redirect //evil.com was not blocked");

  const evilLink2 = validateIntendedDestination("https://phishing-site.com");
  if (evilLink2 !== null) throw new Error("Test 5 Failed: External URL was not blocked");

  const route5 = await resolveUserDestination(identity1.user.id, "/appointments", identity1.organization?.id);
  if (route5.destination !== "/appointments") {
    throw new Error(`Test 5 Failed: Expected deep link '/appointments', got '${route5.destination}'`);
  }
  console.log("   ✅ Passed: Deep links safely restored, open-redirect attacks strictly blocked.\n");

  // ----------------------------------------------------
  // TEST 6: Account Linking
  // ----------------------------------------------------
  console.log("🔹 Test 6: Account Linking for Existing Email...");
  const linkingEmail = `link.test.${Date.now()}@example.com`;
  const existingUserId = "usr_link_" + Date.now();
  
  // Seed an existing credentials user
  await db.insert(users).values({
    id: existingUserId,
    email: linkingEmail,
    name: "Existing Person",
    isVerified: true,
    acceptTerms: true,
    acceptPrivacy: true,
  });

  // Now Google OAuth arrives with the same email
  const identityLinked = await resolveOrCreateOAuthIdentity({
    provider: "google",
    providerAccountId: "goog_link_sub_" + Date.now(),
    email: linkingEmail,
    name: "Existing Person",
  });

  if (identityLinked.user.id !== existingUserId) {
    throw new Error(`Test 6 Failed: Expected account to link to ${existingUserId}, but got ${identityLinked.user.id}`);
  }
  console.log("   ✅ Passed: OAuth account atomically linked to existing user record.\n");

  // ----------------------------------------------------
  // TEST 7: Role-Based Access Control Assertions
  // ----------------------------------------------------
  console.log("🔹 Test 7: Centralized RBAC Permissions...");
  if (!hasPermission("owner", "workspace:delete")) throw new Error("RBAC Failed: Owner must have workspace:delete");
  if (hasPermission("admin", "workspace:delete")) throw new Error("RBAC Failed: Admin should NOT have workspace:delete");
  if (!hasPermission("admin", "billing:manage")) throw new Error("RBAC Failed: Admin must have billing:manage");
  if (hasPermission("staff", "billing:manage")) throw new Error("RBAC Failed: Staff should NOT have billing:manage");
  if (!hasPermission("staff", "calls:manage")) throw new Error("RBAC Failed: Staff must have calls:manage");
  console.log("   ✅ Passed: All role permissions strictly validated.\n");

  console.log("=================================================");
  console.log("🎉 ALL 7 AUDIT & ARCHITECTURAL ACCEPTANCE TESTS PASSED!");
  console.log("=================================================");
}

runAcceptanceTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Acceptance test failure:", err);
    process.exit(1);
  });
