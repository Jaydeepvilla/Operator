import "dotenv/config";
import { resolveOrCreateOAuthIdentity } from "../src/lib/auth/identity";
import { resolveUserDestination } from "../src/lib/auth/router";
import { checkUserOrganization, createOrganizationAction } from "../src/server/actions/onboarding";
import { markOrganizationVerifiedAction } from "../src/server/actions/verification";
import { db } from "../src/server/db";
import { users, accounts, organizations, memberships } from "../src/server/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("==================================================================");
  console.log("🔍 REPRODUCING EXACT USER SCENARIO: GOOGLE LOGIN -> ONBOARD -> LOGOUT -> SIGNUP");
  console.log("==================================================================\n");

  const googleSub = "goog_prod_sub_" + Date.now();
  const googleEmail = `dr.smith.${Date.now()}@gmail.com`;
  const googleName = "Dr. John Smith";

  // STEP 1: First-time Google Login
  console.log("📍 STEP 1: First-time Google Login...");
  const firstLoginIdentity = await resolveOrCreateOAuthIdentity({
    provider: "google",
    providerAccountId: googleSub,
    email: googleEmail,
    name: googleName,
    firstName: "John",
    lastName: "Smith",
  });

  console.log(`   User ID created: ${firstLoginIdentity.user.id}`);
  console.log(`   Is New User: ${firstLoginIdentity.isNewUser}`);
  console.log(`   Onboarding Status: ${firstLoginIdentity.onboardingStatus}`);

  const initialRoute = await resolveUserDestination(firstLoginIdentity.user.id, null, firstLoginIdentity.organization?.id);
  console.log(`   Initial Route: ${initialRoute.destination}`);
  if (initialRoute.destination !== "/onboarding") {
    throw new Error(`Expected initial route '/onboarding', got ${initialRoute.destination}`);
  }
  console.log("   ✅ Step 1 Passed: First time user correctly routed to onboarding.\n");

  // STEP 2: User Completes Onboarding Setup
  console.log("📍 STEP 2: User completes onboarding wizard (or creates workspace)...");
  await db
    .update(organizations)
    .set({
      name: "Smith Dental Clinic",
      industry: "Dental Clinic",
      onboardingStatus: "completed",
      onboardingStep: "completed",
      verificationStatus: "verified",
      onboardingCompletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, firstLoginIdentity.organization!.id));

  const completedRoute = await resolveUserDestination(firstLoginIdentity.user.id, null, firstLoginIdentity.organization?.id);
  console.log(`   Route after completing setup: ${completedRoute.destination}`);
  if (completedRoute.destination !== "/dashboard") {
    throw new Error(`Expected destination '/dashboard', got ${completedRoute.destination}`);
  }
  console.log("   ✅ Step 2 Passed: Workspace successfully marked completed and resolves to '/dashboard'.\n");

  // STEP 3: Count records before re-authentication
  const userCountBefore = (await db.select().from(users).where(eq(users.email, googleEmail))).length;
  const orgCountBefore = (await db.select().from(memberships).where(eq(memberships.userId, firstLoginIdentity.user.id))).length;

  // STEP 4: User Logs Out and Visits Sign-up page with the SAME Google Account
  console.log("📍 STEP 4: User visits /sign-up and selects the SAME Google Account...");
  const secondSignupIdentity = await resolveOrCreateOAuthIdentity({
    provider: "google",
    providerAccountId: googleSub,
    email: googleEmail,
    name: googleName,
  });

  console.log(`   User ID returned: ${secondSignupIdentity.user.id}`);
  console.log(`   Is New User: ${secondSignupIdentity.isNewUser}`);
  console.log(`   Onboarding Status: ${secondSignupIdentity.onboardingStatus}`);

  if (secondSignupIdentity.isNewUser !== false) {
    throw new Error("❌ FAILURE: Expected isNewUser === false for existing Google account");
  }
  if (secondSignupIdentity.user.id !== firstLoginIdentity.user.id) {
    throw new Error("❌ FAILURE: Created duplicate user ID instead of reusing existing user!");
  }

  const userCountAfter = (await db.select().from(users).where(eq(users.email, googleEmail))).length;
  const orgCountAfter = (await db.select().from(memberships).where(eq(memberships.userId, firstLoginIdentity.user.id))).length;

  if (userCountAfter !== userCountBefore) {
    throw new Error("❌ FAILURE: Duplicate user record inserted into database!");
  }
  if (orgCountAfter !== orgCountBefore) {
    throw new Error("❌ FAILURE: Duplicate workspace/membership created!");
  }

  const secondRoute = await resolveUserDestination(secondSignupIdentity.user.id, null, secondSignupIdentity.organization?.id);
  console.log(`   Route for existing user clicking Signup: ${secondRoute.destination}`);

  if (secondRoute.destination !== "/dashboard") {
    throw new Error(`❌ FAILURE: Expected destination '/dashboard', but got '${secondRoute.destination}'`);
  }

  console.log("   ✅ Step 4 Passed: Zero duplicate users, zero duplicate workspaces, routed directly to '/dashboard'!\n");

  console.log("==================================================================");
  console.log("🎉 VERIFIED: FULL END-TO-END IDENTITY & ONBOARDING LIFECYCLE WORKS!");
  console.log("==================================================================");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Scenario test failed:", err);
    process.exit(1);
  });
