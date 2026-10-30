import "dotenv/config";
import { db } from "../src/server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Removing specific users...");
  const deleteResult = await db.execute(sql`
    DELETE FROM users 
    WHERE email IN ('jaydeep.chandegara94@gmail.com', 'flywithmah@gmail.com')
  `);
  console.log("Deleted specific users.");

  console.log("Making user table empty (TRUNCATE)...");
  await db.execute(sql`TRUNCATE TABLE users CASCADE;`);
  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
