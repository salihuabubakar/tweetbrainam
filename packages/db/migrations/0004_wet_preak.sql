CREATE TYPE "public"."ingested_post_source" AS ENUM('x_api', 'manual');--> statement-breakpoint
ALTER TABLE "ingested_posts" ALTER COLUMN "posted_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ingested_posts" ADD COLUMN "source" "ingested_post_source" DEFAULT 'x_api' NOT NULL;