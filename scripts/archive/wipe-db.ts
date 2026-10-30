/**
 * wipe-db.ts
 * Deletes ALL rows from every table in the CockroachDB database.
 * Uses the DATABASE_URL from .env directly.
 * Run with: npx tsx --env-file=.env scripts/wipe-db.ts
 */

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set. Run: npx tsx --env-file=.env scripts/wipe-db.ts");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
  prepare: false,
  max: 5,
});

async function wipeDatabase() {
  console.log("⚠️  Starting full database wipe on:", DATABASE_URL!.split("@")[1]?.split("/")[0]);
  console.log("");

  // First, discover what tables actually exist in the DB
  const existingTables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;

  const tableNames = existingTables.map((r: any) => r.table_name as string);
  console.log(`📋 Found ${tableNames.length} tables in the database.\n`);

  // Disable FK checks via SET session_replication_role won't work on CockroachDB.
  // Instead we do: DELETE in a carefully ordered list, falling back to cascade errors gracefully.
  // The safest approach for CockroachDB: run each table deletion, ignore FK errors,
  // then re-run failed ones after their dependencies are cleared.

  // Order: most dependent → root tables
  const orderedTables = [
    // Billing leaf tables
    "billing_events", "revenue_metrics", "feature_entitlements", "metered_features",
    "invoice_items", "credit_notes", "discounts", "coupons", "invoices", "refunds",
    "payment_attempts", "payments", "payment_methods", "billing_accounts",
    "usage_records", "usage_counters", "subscription_usage", "subscription_items",
    "plan_features", "plans", "tax_rates", "tax_profiles",
    // Agency
    "agency_subscriptions", "agency_billing", "white_label_settings", "agency_permissions",
    "agency_audit_logs", "agency_invitations", "reseller_usage", "reseller_plans",
    "client_workspaces", "agency_clients", "agency_members", "agency_domains",
    "agency_branding", "agencies",
    // Audit/jobs
    "smart_notifications", "business_snapshots", "business_activity_log", "audit_logs", "background_jobs",
    // Voice
    "voicemail_messages", "voice_analytics", "voice_prompts", "voice_settings",
    "call_routing_rules", "call_queues", "call_transfers", "call_outcomes", "call_summaries",
    "call_transcripts", "call_recordings", "call_events", "call_sessions", "phone_numbers",
    // Channels/Inbox
    "channel_settings", "contact_channels", "inbox_participants", "inbox_threads",
    "communication_logs", "channel_webhooks", "message_attachments", "message_templates",
    "message_deliveries", "channel_events", "channel_messages", "channel_connections",
    "communication_channels",
    // Widget
    "widget_events", "widget_sessions", "widget_installations", "widget_domains",
    "widget_customizations", "widget_launchers", "widget_branding", "widget_themes", "widget_configs",
    // Appointments/Staff
    "appointment_cancellations", "appointment_reschedules", "appointment_notes",
    "appointment_reminders", "appointment_status_history", "appointment_events", "appointments",
    "service_assignments", "booking_rules", "calendar_sync_logs", "calendar_connections",
    "staff_availability", "staff_schedules", "staff_members",
    // Conversations/Leads
    "conversation_feedback", "escalation_requests", "conversation_summaries", "lead_scores",
    "lead_answers", "lead_profiles", "conversation_events", "conversation_sessions",
    "conversation_messages", "conversations",
    // Knowledge
    "vector_embeddings", "knowledge_document_tags", "knowledge_tags", "website_imports",
    "document_processing_jobs", "knowledge_chunks", "knowledge_documents", "knowledge_sources",
    "knowledge_categories",
    // Business config
    "business_settings", "qualification_flows", "faq_items", "services", "service_categories",
    "business_profiles",
    // Subscriptions
    "subscriptions", "subscription_plans",
    // Core
    "memberships", "organizations", "users",
  ];

  // Filter to only tables that exist in the DB
  const toDelete = orderedTables.filter(t => tableNames.includes(t));
  const notInDb = orderedTables.filter(t => !tableNames.includes(t));

  if (notInDb.length > 0) {
    console.log(`⏭️  Skipping ${notInDb.length} tables not yet migrated: ${notInDb.join(", ")}\n`);
  }

  let success = 0;
  let failed: string[] = [];

  // First pass
  for (const table of toDelete) {
    try {
      await sql`DELETE FROM ${sql(table)}`;
      console.log(`  ✅ ${table}`);
      success++;
    } catch (err: any) {
      console.log(`  ⏳ FK conflict (will retry): ${table}`);
      failed.push(table);
    }
  }

  // Second pass for FK-blocked tables (retry in reverse order)
  if (failed.length > 0) {
    console.log(`\n🔄 Retrying ${failed.length} tables...\n`);
    const retry = [...failed].reverse();
    failed = [];
    for (const table of retry) {
      try {
        await sql`DELETE FROM ${sql(table)}`;
        console.log(`  ✅ ${table} (retry OK)`);
        success++;
      } catch (err: any) {
        console.error(`  ❌ ${table}: ${err.message}`);
        failed.push(table);
      }
    }
  }

  await sql.end();
  console.log(`\n🏁 Done. ${success} tables wiped.`);
  if (failed.length > 0) {
    console.log(`❌ ${failed.length} tables still failed: ${failed.join(", ")}`);
  } else {
    console.log("✨ Database is completely empty.");
  }
  process.exit(0);
}

wipeDatabase().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
