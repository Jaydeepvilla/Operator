import { db } from "../../src/server/db";
import { sessions } from "../../src/server/db/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";

async function checkSession() {
  const authData = JSON.parse(fs.readFileSync("playwright/.auth/user.json", "utf8"));
  const token = authData.cookies.find((c: any) => c.name === "session_token")?.value;
  console.log("Cookie session_token:", token?.slice(0, 16));

  const allSessions = await db.select().from(sessions);
  console.log("All sessions count:", allSessions.length);
  const found = allSessions.find(s => s.id === token);
  console.log("Is current session token in DB (s.id === token)?", !!found, found?.expiresAt);

  process.exit(0);
}

checkSession().catch(console.error);
