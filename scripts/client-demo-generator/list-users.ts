import { db } from "../../src/server/db";
import { users } from "../../src/server/db/schema";

async function run() {
  const allUsers = await db.select({ id: users.id, email: users.email, name: users.name }).from(users);
  console.log("All users in DB:", allUsers);
  process.exit(0);
}

run().catch(console.error);

