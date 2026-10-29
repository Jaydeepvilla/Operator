import "dotenv/config";
import { db } from "../src/server/db";
import { users } from "../src/server/db/schema";
import { hashPassword } from "../src/lib/auth/password";

export async function seedOnboardingUser() {
  console.log("👤 Seeding fresh user ready for Business Onboarding...");
  
  const standardPasswordHash = await hashPassword("password123");
  const testUser = {
    id: "user_fresh_business_owner",
    email: "owner@operatordemosalon.test",
    name: "Rohan Malhotra",
    passwordHash: standardPasswordHash,
    isVerified: true,
  };

  await db.insert(users).values(testUser).onConflictDoUpdate({
    target: users.id,
    set: {
      email: testUser.email,
      name: testUser.name,
      passwordHash: standardPasswordHash,
      isVerified: true,
    }
  });

  console.log("✅ Fresh business owner created:");
  console.log("   Email: owner@operatordemosalon.test");
  console.log("   Password: password123");
  console.log("   Status: Unonboarded (navigating to /dashboard or /onboarding will open the Onboarding Wizard)");
}

if (require.main === module) {
  seedOnboardingUser()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
