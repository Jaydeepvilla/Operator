import "dotenv/config";
import { db } from "../src/server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Making user table empty (DELETE FROM)...");
  await db.execute(sql`DELETE FROM users;`);
  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
