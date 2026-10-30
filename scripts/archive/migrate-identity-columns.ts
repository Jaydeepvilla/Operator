import { db } from "../src/server/db";
import { sql } from "drizzle-orm";

async function runIdentityMigration() {
  console.log("Applying identity resolution database columns and indexes...");
  
  await db.execute(sql`ALTER TABLE "lead_profiles" ADD COLUMN IF NOT EXISTS "normalized_phone" text;`);
  await db.execute(sql`ALTER TABLE "lead_profiles" ADD COLUMN IF NOT EXISTS "normalized_email" text;`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "lead_profiles_org_norm_phone_idx" ON "lead_profiles" ("organization_id", "normalized_phone");`);
  
  await db.execute(sql`ALTER TABLE "contact_channels" ADD COLUMN IF NOT EXISTS "normalized_identifier" text;`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "contact_channels_org_type_user_idx" ON "contact_channels" ("organization_id", "channel_type", "channel_user_id");`);

  console.log("Identity migration completed successfully!");
  process.exit(0);
}

runIdentityMigration().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
