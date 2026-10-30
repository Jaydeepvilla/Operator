import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../src/server/db";

async function main() {
  console.log("Creating new tables for Progress & Notification Engines...");
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "business_activity_log" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "organization_id" uuid NOT NULL,
        "task" text NOT NULL,
        "category" text NOT NULL,
        "impact" text NOT NULL,
        "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "smart_notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "organization_id" uuid NOT NULL,
        "title" text NOT NULL,
        "description" text NOT NULL,
        "priority" text NOT NULL,
        "severity" text NOT NULL,
        "category" text NOT NULL,
        "is_read" boolean DEFAULT false NOT NULL,
        "is_dismissed" boolean DEFAULT false NOT NULL,
        "action_url" text,
        "snooze_until" timestamp,
        "expires_at" timestamp,
        "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    
    // Attempt adding constraints (might fail if already exist, so wrap in separate try-catch or just omit if it's local dev, but let's try)
    try {
      await db.execute(sql`ALTER TABLE "business_activity_log" ADD CONSTRAINT "business_activity_log_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;`);
      await db.execute(sql`ALTER TABLE "smart_notifications" ADD CONSTRAINT "smart_notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;`);
    } catch (e: any) {
      console.log("Constraints likely already exist or skipped:", e.message);
    }

    console.log("Tables created successfully.");
  } catch (error) {
    console.error("Error creating tables:", error);
  }
  process.exit(0);
}

main();
