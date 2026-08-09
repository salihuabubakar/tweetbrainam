CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."ingested_post_type" AS ENUM('post', 'reply', 'quote');--> statement-breakpoint
CREATE TABLE "ingested_posts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"x_account_id" uuid NOT NULL,
	"x_post_id" text NOT NULL,
	"type" "ingested_post_type" NOT NULL,
	"text" text NOT NULL,
	"posted_at" timestamp with time zone NOT NULL,
	"metrics_at_ingest" jsonb,
	"character_count" integer NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingested_posts_account_post_unique" UNIQUE("x_account_id","x_post_id")
);
--> statement-breakpoint
ALTER TABLE "ingested_posts" ADD CONSTRAINT "ingested_posts_x_account_id_x_accounts_id_fk" FOREIGN KEY ("x_account_id") REFERENCES "public"."x_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ingested_posts_account_posted_at_idx" ON "ingested_posts" USING btree ("x_account_id","posted_at");