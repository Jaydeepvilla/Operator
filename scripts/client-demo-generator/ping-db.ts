import { db } from "../../src/server/db";
import { sql } from "drizzle-orm";

async function test() {
  const t0 = Date.now();
  await db.execute(sql`SELECT 1`);
  console.log("DB ping success:", Date.now() - t0, "ms");
  process.exit(0);
}

test().catch(console.error);

