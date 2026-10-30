import { db } from "../src/server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Creating/verifying operational_exceptions and founder_learning_progress tables...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS operational_exceptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'pending',
      title TEXT NOT NULL,
      explanation TEXT NOT NULL,
      correlation_id TEXT,
      related_record_type TEXT,
      related_record_id TEXT,
      safe_next_action TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      retry_history JSONB NOT NULL DEFAULT '[]'::jsonb,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      resolution_notes TEXT,
      resolved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      resolved_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS operational_exceptions_org_idx ON operational_exceptions(organization_id);
    CREATE INDEX IF NOT EXISTS operational_exceptions_status_idx ON operational_exceptions(status);
    CREATE INDEX IF NOT EXISTS operational_exceptions_severity_idx ON operational_exceptions(severity);
    CREATE INDEX IF NOT EXISTS operational_exceptions_category_idx ON operational_exceptions(category);
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS founder_learning_progress (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      current_module_id TEXT NOT NULL DEFAULT 'module-1',
      modules_started TEXT[] NOT NULL DEFAULT ARRAY['module-1'],
      lessons_completed TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
      exercises_passed TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
      workflows_practiced TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
      unresolved_blockers JSONB NOT NULL DEFAULT '[]'::jsonb,
      recommended_next_lesson TEXT NOT NULL DEFAULT 'module-1-lesson-1',
      simulator_results JSONB NOT NULL DEFAULT '{}'::jsonb,
      last_activity_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS founder_progress_user_org_idx ON founder_learning_progress(user_id, organization_id);
    CREATE INDEX IF NOT EXISTS founder_progress_org_idx ON founder_learning_progress(organization_id);
  `);

  console.log("✓ operational_exceptions and founder_learning_progress tables verified successfully.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
