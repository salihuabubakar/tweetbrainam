CREATE TYPE "public"."draft_author" AS ENUM('ai', 'user');--> statement-breakpoint
CREATE TYPE "public"."draft_status" AS ENUM('generating', 'needs_review', 'approved', 'rejected', 'archived', 'failed');--> statement-breakpoint
CREATE TYPE "public"."learning_signal_type" AS ENUM('edit_diff', 'rejection', 'regeneration_note');--> statement-breakpoint
CREATE TABLE "draft_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"draft_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"segments" jsonb NOT NULL,
	"author" "draft_author" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "draft_versions_draft_version_unique" UNIQUE("draft_id","version")
);
--> statement-breakpoint
CREATE TABLE "drafts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"x_account_id" uuid NOT NULL,
	"plan_slot_id" uuid,
	"status" "draft_status" DEFAULT 'generating' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_signals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"x_account_id" uuid NOT NULL,
	"draft_id" uuid,
	"type" "learning_signal_type" NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "draft_versions" ADD CONSTRAINT "draft_versions_draft_id_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_x_account_id_x_accounts_id_fk" FOREIGN KEY ("x_account_id") REFERENCES "public"."x_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_plan_slot_id_plan_slots_id_fk" FOREIGN KEY ("plan_slot_id") REFERENCES "public"."plan_slots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_signals" ADD CONSTRAINT "learning_signals_x_account_id_x_accounts_id_fk" FOREIGN KEY ("x_account_id") REFERENCES "public"."x_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_signals" ADD CONSTRAINT "learning_signals_draft_id_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "drafts_account_status_idx" ON "drafts" USING btree ("x_account_id","status");--> statement-breakpoint
CREATE INDEX "learning_signals_account_idx" ON "learning_signals" USING btree ("x_account_id");