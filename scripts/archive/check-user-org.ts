import { db } from "../src/server/db";
import { organizations, memberships } from "../src/server/db/schema";
import { eq } from "drizzle-orm";

async function checkOrg() {
  const userId = "user_2demo_admin_test";
  const m = await db.select().from(memberships).where(eq(memberships.userId, userId));
  console.log("Memberships count:", m.length);
  if (m.length > 0) {
    const org = await db.select().from(organizations).where(eq(organizations.id, m[0].organizationId));
    console.log("Organization:", org[0]?.id, "Name:", org[0]?.name, "onboardingStatus:", org[0]?.onboardingStatus);
  }
}

checkOrg().then(() => process.exit(0)).catch(console.error);
