CREATE TYPE "public"."publish_failure_reason" AS ENUM('connection_revoked', 'rate_limited', 'duplicate_content', 'content_rejected', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."publish_status" AS ENUM('scheduled', 'publishing', 'published', 'failed', 'canceled');--> statement-breakpoint
CREATE TABLE "scheduled_posts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"draft_id" uuid NOT NULL,
	"x_account_id" uuid NOT NULL,
	"publish_at" timestamp with time zone NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"status" "publish_status" DEFAULT 'scheduled' NOT NULL,
	"x_post_ids" text[],
	"failure_reason" "publish_failure_reason",
	"published_at" timestamp with time zone,
	"trigger_run_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scheduled_posts_draft_unique" UNIQUE("draft_id"),
	CONSTRAINT "scheduled_posts_idempotency_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_draft_id_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_x_account_id_x_accounts_id_fk" FOREIGN KEY ("x_account_id") REFERENCES "public"."x_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scheduled_posts_due_idx" ON "scheduled_posts" USING btree ("status","publish_at");--> statement-breakpoint
CREATE INDEX "scheduled_posts_account_idx" ON "scheduled_posts" USING btree ("x_account_id","publish_at");