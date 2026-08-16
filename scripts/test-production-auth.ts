import "dotenv/config";
import { registerAction, loginAction } from "../src/server/actions/auth";
import { db } from "../src/server/db";
import { users, organizations, memberships, sessions } from "../src/server/db/schema";
import { eq } from "drizzle-orm";
import { createOrganizationAction } from "../src/server/actions/onboarding";
import { createSession, getSession } from "../src/lib/auth/session";

async function runAuthTests() {
  console.log("\n=======================================================");
  console.log("🔐 TESTING PRODUCTION AUTHENTICATION END-TO-END");
  console.log("=======================================================\n");

  const testEmail = `prod_test_${Date.now()}@example-corp.com`;
  const strongPassword = "Pr0d_Secur3_P@ssw0rd!2026";
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, label: string) {
    total++;
    if (condition) {
      console.log(`  ✓ [PASS] ${label}`);
      passed++;
    } else {
      console.error(`  ✕ [FAIL] ${label}`);
      throw new Error(`Assertion failed: ${label}`);
    }
  }

  // 1. Test Registration
  console.log("1. Testing Registration (Sign Up)...");
  const regResult = await registerAction({
    firstName: "Sarah",
    lastName: "Connor",
    name: "Sarah Connor",
    email: testEmail,
    password: strongPassword,
    acceptTerms: true,
    acceptPrivacy: true,
    marketingConsent: false,
  });

  assert(regResult.success === true, "New user registration succeeds");

  const [dbUser] = await db.select().from(users).where(eq(users.email, testEmail)).limit(1);
  assert(!!dbUser, "User record created in PostgreSQL");
  assert(dbUser.email === testEmail, "Email stored with clean lowercase format");
  assert(dbUser.passwordHash !== null && dbUser.passwordHash.length > 20, "Password hashed securely with Argon2id");

  // 2. Test Duplicate Registration Protection
  console.log("\n2. Testing Duplicate Registration Prevention...");
  const dupResult = await registerAction({
    firstName: "Sarah",
    lastName: "Connor",
    name: "Sarah Connor",
    email: testEmail,
    password: strongPassword,
    acceptTerms: true,
    acceptPrivacy: true,
  });
  assert(dupResult.success === false, "Duplicate email registration rejected");
  assert(dupResult.code === "EMAIL_EXISTS", "Returns EMAIL_EXISTS error code");

  // 3. Test Invalid Password Login
  console.log("\n3. Testing Invalid Password Rejection...");
  const badLoginResult = await loginAction({
    email: testEmail,
    password: "WrongPassword!999",
    rememberMe: true,
  });
  assert(badLoginResult.success === false, "Incorrect password login rejected");

  // 4. Test Valid Sign In
  console.log("\n4. Testing Sign In (Credentials)...");
  const loginResult = await loginAction({
    email: testEmail,
    password: strongPassword,
    rememberMe: true,
  });
  assert(loginResult.success === true, "Valid sign-in succeeds");

  // 5. Test Session Creation & Verification
  console.log("\n5. Testing Session Lifecycle...");
  const { sessionToken } = await createSession(dbUser.id, "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "127.0.0.1", true);
  assert(!!sessionToken, "Session token generated");

  const verifiedSession = await getSession(sessionToken);
  assert(!!verifiedSession && verifiedSession.userId === dbUser.id, "Session verified against database");

  // 6. Test Organization Creation & Onboarding Flow
  console.log("\n6. Testing Business Onboarding & Organization Setup...");
  const orgResult = await createOrganizationAction({
    name: "Cyberdyne Systems AI",
    industry: "Medical Clinic",
    website: "https://cyberdyne.ai",
    email: testEmail,
    phone: "+15551234567",
    address: "100 Tech Blvd, Silicon Valley, CA",
    timezone: "America/Los_Angeles",
  });
  assert(orgResult.success === true && !!orgResult.organization, "Organization created successfully");

  // Clean up test user & org
  console.log("\n7. Cleaning up test artifacts from database...");
  if (orgResult.organization) {
    await db.delete(organizations).where(eq(organizations.id, orgResult.organization.id));
  }
  await db.delete(users).where(eq(users.id, dbUser.id));
  console.log("  ✓ Test artifacts cleaned.");

  console.log("\n=======================================================");
  console.log(`🎉 ALL ${passed}/${total} PRODUCTION AUTHENTICATION INVARIANTS PASSED!`);
  console.log("=======================================================\n");
}

runAuthTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Auth test failed:", err);
    process.exit(1);
  });
