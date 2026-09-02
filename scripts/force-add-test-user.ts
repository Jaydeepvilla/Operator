import "dotenv/config";
import { db } from "../src/server/db";
import { users, memberships, organizations } from "../src/server/db/schema";
import { faker } from "@faker-js/faker";
import { hashPassword } from "../src/lib/auth/password";

async function main() {
  const demoUserId = "user_2demo_admin_clerk_test";
  const passwordHash = await hashPassword("Dem0P@ssw0rd!2026_");

  await db.insert(users).values({
    id: demoUserId,
    email: "demo+clerk_test@example.com",
    name: "Demo Admin",
    passwordHash,
    isVerified: true,
    avatar: faker.image.avatar(),
  }).onConflictDoUpdate({
    target: users.id,
    set: { passwordHash }
  });

  const orgId = "11111111-1111-1111-1111-111111111111";
  await db.insert(organizations).values({
    id: orgId,
    name: "Demo Organization",
    slug: "demo-organization",
    industry: "Other",
    email: "demo+clerk_test@example.com",
    phone: "15552345678",
    timezone: "America/New_York",
    verificationStatus: "verified",
  }).onConflictDoNothing();

  await db.insert(memberships).values({
    id: faker.string.uuid(),
    organizationId: orgId,
    userId: demoUserId,
    role: "owner",
  }).onConflictDoNothing();

  console.log(`✅ Seeded default user: ${demoUserId} with membership for ${orgId}`);
  process.exit(0);
}

main().catch(console.error);
