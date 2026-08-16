import { db } from "../../src/server/db";
import { users } from "../../src/server/db/schema";
import { faker } from "@faker-js/faker";

export async function seedUsers(): Promise<string[]> {
  console.log("👤 Seeding users...");
  
  const { hashPassword } = await import("../../src/lib/auth/password");
  const standardPasswordHash = await hashPassword("password123");
  const clerkDemoPasswordHash = await hashPassword("Dem0P@ssw0rd!2026_");

  const usersToSeed = [
    {
      id: "user_admin_operator_ai",
      email: "admin@operator.ai",
      name: "Alex Vance (Admin)",
      passwordHash: standardPasswordHash,
      isVerified: true,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop",
    },
    {
      id: "user_demo_example_com",
      email: "demo@example.com",
      name: "Demo Manager",
      passwordHash: standardPasswordHash,
      isVerified: true,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
    },
    {
      id: "user_2demo_admin_clerk_test",
      email: "demo+clerk_test@example.com",
      name: "Demo Admin",
      passwordHash: standardPasswordHash,
      isVerified: true,
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
    }
  ];

  const userIds: string[] = [];

  for (const user of usersToSeed) {
    await db.insert(users).values(user).onConflictDoUpdate({
      target: users.id,
      set: {
        passwordHash: user.passwordHash,
        isVerified: true,
        email: user.email,
        name: user.name,
      }
    });
    userIds.push(user.id);
  }

  console.log(`✅ Seeded demo accounts: ${userIds.join(", ")}`);
  return userIds;
}
