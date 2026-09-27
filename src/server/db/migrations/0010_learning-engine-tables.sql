CREATE TYPE "public"."proposal_safety" AS ENUM('auto_safe', 'review_required');--> statement-breakpoint
CREATE TYPE "public"."proposal_status" AS ENUM('pending', 'approved', 'rejected', 'applied', 'rolled_back');--> statement-breakpoint
CREATE TYPE "public"."signal_category" AS ENUM('knowledge_gap', 'intent_gap', 'quality_degradation', 'ux_friction', 'conversion_drop', 'escalation_pattern');--> statement-breakpoint
CREATE TABLE "ai_improvement_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"signal_id" uuid,
	"proposal_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"safety_level" text DEFAULT 'review_required' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"proposed_changes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"impact_estimate" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"applied_at" timestamp,
	"applied_by" text,
	"rollback_data" jsonb,
	"reviewed_by" text,
	"review_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_learning_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"signal_category" text NOT NULL,
	"signal_type" text NOT NULL,
	"frequency" integer DEFAULT 1 NOT NULL,
	"sample_payloads" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"aggregation_window" text NOT NULL,
	"severity" text DEFAULT 'low' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_improvement_proposals" ADD CONSTRAINT "ai_improvement_proposals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_improvement_proposals" ADD CONSTRAINT "ai_improvement_proposals_signal_id_ai_learning_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."ai_learning_signals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_learning_signals" ADD CONSTRAINT "ai_learning_signals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_proposals_org_status" ON "ai_improvement_proposals" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_proposals_safety" ON "ai_improvement_proposals" USING btree ("safety_level");--> statement-breakpoint
CREATE INDEX "idx_learning_signals_org_category" ON "ai_learning_signals" USING btree ("organization_id","signal_category");--> statement-breakpoint
CREATE INDEX "idx_learning_signals_window" ON "ai_learning_signals" USING btree ("aggregation_window");