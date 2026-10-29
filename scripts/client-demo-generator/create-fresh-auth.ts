import { db } from "../../src/server/db";
import { users, sessions, organizations, memberships } from "../../src/server/db/schema";
import { eq } from "drizzle-orm";
import * as crypto from "crypto";
import * as fs from "fs";

async function createFreshAuth() {
  const [user] = await db.select().from(users).where(eq(users.email, "jaydeep.chandegara94@gmail.com")).limit(1);
  if (!user) throw new Error("User not found");

  const [membership] = await db.select().from(memberships).where(eq(memberships.userId, user.id)).limit(1);
  const orgId = membership?.organizationId || "11111111-1111-1111-1111-111111111111";

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.insert(sessions).values({
    id: token,
    userId: user.id,
    expiresAt: expiresAt,
    userAgent: "Playwright Automated Test Runner",
    ipAddress: "127.0.0.1",
    rememberMe: true,
  });

  const authData = {
    cookies: [
      {
        name: "session_token",
        value: token,
        domain: "localhost",
        path: "/",
        expires: Math.floor(expiresAt.getTime() / 1000),
        httpOnly: true,
        secure: false,
        sameSite: "Lax"
      },
      {
        name: "active_org_id",
        value: orgId,
        domain: "localhost",
        path: "/",
        expires: Math.floor(expiresAt.getTime() / 1000),
        httpOnly: true,
        secure: false,
        sameSite: "Lax"
      }
    ],
    origins: [
      {
        origin: "http://localhost:3000",
        localStorage: [
          {
            name: "operator_test_mode",
            value: "true"
          }
        ]
      }
    ]
  };

  fs.writeFileSync("playwright/.auth/user.json", JSON.stringify(authData, null, 2), "utf8");
  console.log("Successfully created fresh valid session and updated playwright/.auth/user.json!");
  process.exit(0);
}

createFreshAuth().catch(console.error);
