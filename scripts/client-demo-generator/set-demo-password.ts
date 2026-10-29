import { db } from "../../src/server/db";
import { users } from "../../src/server/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../../src/lib/auth/password";

async function setPassword() {
  const hash = await hashPassword("SecureOperator2026!");
  await db
    .update(users)
    .set({ passwordHash: hash })
    .where(eq(users.email, "jaydeep.chandegara94@gmail.com"));
  console.log("Updated password for jaydeep.chandegara94@gmail.com to SecureOperator2026!");
  process.exit(0);
}

setPassword().catch(console.error);

