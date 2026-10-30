import "dotenv/config";
import { db } from "../src/server/db";
import { users, passwordResetTokens } from "../src/server/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

async function main() {
  const email = "flywithmah@gmail.com";
  
  const [user] = await db
    .select({ id: users.id, email: users.email, firstName: users.firstName })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    console.error(`User with email ${email} not found.`);
    process.exit(1);
  }

  // Invalidate old tokens
  await db
    .update(passwordResetTokens)
    .set({ isUsed: true })
    .where(and(eq(passwordResetTokens.userId, user.id), eq(passwordResetTokens.isUsed, false)));

  // Generate new token valid for 24 hours
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.insert(passwordResetTokens).values({
    token,
    userId: user.id,
    expiresAt,
  });

  const localUrl = `http://localhost:3000/reset-password?token=${token}`;
  const prodUrl = `https://operator.nexxtechnologies.com/reset-password?token=${token}`;

  console.log("=== FRESH PASSWORD RESET TOKEN CREATED ===");
  console.log(`User: ${user.email} (${user.id})`);
  console.log(`Token: ${token}`);
  console.log(`Expires At: ${expiresAt.toISOString()}`);
  console.log(`Local URL: ${localUrl}`);
  console.log(`Production URL: ${prodUrl}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error creating token:", err);
  process.exit(1);
});

