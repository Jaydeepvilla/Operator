CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "appointment_waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"staff_member_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"lead_profile_id" uuid,
	"customer_name" text NOT NULL,
	"customer_email" text,
	"customer_phone" text,
	"preferred_date" timestamp NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"offered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_rule_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"rule_id" uuid NOT NULL,
	"trigger_event" text NOT NULL,
	"event_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'success' NOT NULL,
	"actions_executed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error_message" text,
	"executed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trigger_type" text NOT NULL,
	"trigger_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"conditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"execution_count" integer DEFAULT 0 NOT NULL,
	"last_executed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_channels" ADD COLUMN "normalized_identifier" text;--> statement-breakpoint
ALTER TABLE "inbox_threads" ADD COLUMN "ai_autonomy" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "inbox_threads" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "lead_profiles" ADD COLUMN "normalized_phone" text;--> statement-breakpoint
ALTER TABLE "lead_profiles" ADD COLUMN "normalized_email" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "verification_status" text DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "verification_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "onboarding_status" text DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "onboarding_step" text DEFAULT 'url' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "onboarding_data" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "onboarding_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_waitlist" ADD CONSTRAINT "appointment_waitlist_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_waitlist" ADD CONSTRAINT "appointment_waitlist_staff_member_id_staff_members_id_fk" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_waitlist" ADD CONSTRAINT "appointment_waitlist_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_waitlist" ADD CONSTRAINT "appointment_waitlist_lead_profile_id_lead_profiles_id_fk" FOREIGN KEY ("lead_profile_id") REFERENCES "public"."lead_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rule_executions" ADD CONSTRAINT "automation_rule_executions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rule_executions" ADD CONSTRAINT "automation_rule_executions_rule_id_automation_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."automation_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_accounts_provider_account" ON "accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "idx_accounts_user_id" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "appointments_org_staff_time_idx" ON "appointments" USING btree ("organization_id","staff_member_id","start_time");--> statement-breakpoint
CREATE INDEX "appointments_status_idx" ON "appointments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_channels_org_type_user_idx" ON "contact_channels" USING btree ("organization_id","channel_type","channel_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_profiles_org_norm_phone_idx" ON "lead_profiles" USING btree ("organization_id","normalized_phone");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_memberships_user_org" ON "memberships" USING btree ("user_id","organization_id");