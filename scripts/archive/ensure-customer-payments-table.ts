import { db } from "../src/server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Checking customer_payments table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS customer_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
      lead_profile_id UUID REFERENCES lead_profiles(id) ON DELETE SET NULL,
      service_id UUID REFERENCES services(id) ON DELETE SET NULL,
      amount TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      type TEXT NOT NULL DEFAULT 'deposit',
      status TEXT NOT NULL DEFAULT 'pending',
      provider TEXT NOT NULL DEFAULT 'stripe',
      provider_payment_id TEXT,
      provider_order_id TEXT,
      payment_link TEXT,
      idempotency_key TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      failure_reason TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS customer_payments_org_idx ON customer_payments(organization_id);
    CREATE INDEX IF NOT EXISTS customer_payments_appointment_idx ON customer_payments(appointment_id);
    CREATE INDEX IF NOT EXISTS customer_payments_status_idx ON customer_payments(status);
  `);

  console.log("customer_payments table verified/created successfully.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
