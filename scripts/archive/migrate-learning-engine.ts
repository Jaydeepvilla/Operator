import { sql } from "drizzle-orm";
import { db } from "../src/server/db/index";

async function main() {
  console.log("Applying continuous learning engine database tables...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "ai_knowledge_gaps" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "query_text" text NOT NULL,
      "normalized_topic" text NOT NULL,
      "frequency" integer NOT NULL DEFAULT 1,
      "gap_type" text NOT NULL DEFAULT 'unknown',
      "status" text NOT NULL DEFAULT 'open',
      "resolved_faq_id" uuid REFERENCES "faq_items"("id") ON DELETE SET NULL,
      "sample_conversations" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "last_seen_at" timestamp NOT NULL DEFAULT now(),
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS "idx_knowledge_gaps_org_topic" ON "ai_knowledge_gaps" ("organization_id", "normalized_topic");
    CREATE INDEX IF NOT EXISTS "idx_knowledge_gaps_org_status" ON "ai_knowledge_gaps" ("organization_id", "status");

    CREATE TABLE IF NOT EXISTS "ai_knowledge_conflicts" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "topic" text NOT NULL,
      "description" text NOT NULL,
      "source_a" text NOT NULL,
      "source_b" text NOT NULL,
      "status" text NOT NULL DEFAULT 'open',
      "severity" text NOT NULL DEFAULT 'medium',
      "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "resolved_at" timestamp,
      "created_at" timestamp NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS "idx_knowledge_conflicts_org_status" ON "ai_knowledge_conflicts" ("organization_id", "status");

    CREATE TABLE IF NOT EXISTS "ai_regression_tests" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "name" text NOT NULL,
      "query" text NOT NULL,
      "expected_intent" text NOT NULL,
      "forbidden_keywords" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "required_keywords" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "is_active" boolean NOT NULL DEFAULT true,
      "created_at" timestamp NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS "idx_regression_tests_org" ON "ai_regression_tests" ("organization_id", "is_active");

    CREATE TABLE IF NOT EXISTS "ai_evaluation_runs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "run_type" text NOT NULL DEFAULT 'scheduled',
      "total_tests" integer NOT NULL DEFAULT 0,
      "passed_count" integer NOT NULL DEFAULT 0,
      "failed_count" integer NOT NULL DEFAULT 0,
      "accuracy" text NOT NULL DEFAULT '0.0',
      "groundedness_score" text NOT NULL DEFAULT '1.0',
      "results" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "created_at" timestamp NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS "idx_eval_runs_org" ON "ai_evaluation_runs" ("organization_id", "created_at");
  `);

  console.log("Continuous learning engine database tables created successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
