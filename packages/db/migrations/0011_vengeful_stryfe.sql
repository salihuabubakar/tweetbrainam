CREATE TYPE "public"."memory_category" AS ENUM('project', 'audience', 'expertise', 'goal', 'opinion', 'preference');--> statement-breakpoint
CREATE TYPE "public"."memory_source" AS ENUM('extracted', 'user_provided');--> statement-breakpoint
CREATE TYPE "public"."memory_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TABLE "memory_facts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"category" "memory_category" NOT NULL,
	"content" text NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL,
	"source" "memory_source" NOT NULL,
	"status" "memory_status" DEFAULT 'active' NOT NULL,
	"source_post_ids" uuid[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memory_facts" ADD CONSTRAINT "memory_facts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memory_facts_user_status_idx" ON "memory_facts" USING btree ("user_id","status");