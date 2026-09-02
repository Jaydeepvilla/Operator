import "dotenv/config";
import { db } from "../src/server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("🚀 Running database migration for Identity & Onboarding tables...");

  // 1. Create accounts table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "accounts" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "provider" text NOT NULL,
      "provider_account_id" text NOT NULL,
      "email" text,
      "access_token" text,
      "refresh_token" text,
      "id_token" text,
      "expires_at" timestamp,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "idx_accounts_provider_account" ON "accounts" ("provider", "provider_account_id");
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "idx_accounts_user_id" ON "accounts" ("user_id");
  `);

  // 2. Add onboarding columns to organizations
  await db.execute(sql`
    ALTER TABLE "organizations" 
    ADD COLUMN IF NOT EXISTS "onboarding_status" text DEFAULT 'not_started' NOT NULL,
    ADD COLUMN IF NOT EXISTS "onboarding_step" text DEFAULT 'url' NOT NULL,
    ADD COLUMN IF NOT EXISTS "onboarding_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
    ADD COLUMN IF NOT EXISTS "onboarding_completed_at" timestamp;
  `);

  console.log("✅ Identity and Onboarding database schema migration executed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Migration error:", err);
    process.exit(1);
  });
