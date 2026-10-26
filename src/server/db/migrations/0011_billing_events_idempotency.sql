ALTER TABLE "billing_events" ADD COLUMN IF NOT EXISTS "provider" text;
ALTER TABLE "billing_events" ADD COLUMN IF NOT EXISTS "provider_event_id" text;
ALTER TABLE "billing_events" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'received' NOT NULL;
ALTER TABLE "billing_events" ADD COLUMN IF NOT EXISTS "error" text;
ALTER TABLE "billing_events" ADD COLUMN IF NOT EXISTS "processed_at" timestamp;

CREATE UNIQUE INDEX IF NOT EXISTS "billing_events_provider_event_unique" 
ON "billing_events" ("provider", "provider_event_id") 
WHERE "provider" IS NOT NULL AND "provider_event_id" IS NOT NULL;
