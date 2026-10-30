import { db } from "../src/server/db";
import { sessions } from "../src/server/db/schema";
import { eq } from "drizzle-orm";

async function checkSession() {
  const token = "b7950cb4ab967ced33ac595789ee4293f7675aee45d680ac916ed8802c21d651";
  const s = await db.select().from(sessions).where(eq(sessions.id, token));
  console.log("Session in DB count:", s.length);
  if (s.length > 0) {
    console.log("Session user:", s[0].userId, "Expires:", s[0].expiresAt);
  }
}

checkSession().then(() => process.exit(0)).catch(console.error);
