CREATE TYPE "public"."plan_status" AS ENUM('draft', 'active', 'completed');--> statement-breakpoint
CREATE TYPE "public"."post_format" AS ENUM('single', 'thread');--> statement-breakpoint
CREATE TYPE "public"."slot_status" AS ENUM('empty', 'drafting', 'ready', 'approved', 'published', 'skipped');--> statement-breakpoint
CREATE TABLE "content_plans" (
	"id" uuid PRIMARY KEY NOT NULL,
	"x_account_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"status" "plan_status" DEFAULT 'active' NOT NULL,
	"rationale" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_plans_account_week_unique" UNIQUE("x_account_id","week_start")
);
--> statement-breakpoint
CREATE TABLE "plan_slots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"content_plan_id" uuid NOT NULL,
	"topic" text NOT NULL,
	"format" "post_format" NOT NULL,
	"angle" text NOT NULL,
	"target_at" timestamp with time zone NOT NULL,
	"status" "slot_status" DEFAULT 'empty' NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_plans" ADD CONSTRAINT "content_plans_x_account_id_x_accounts_id_fk" FOREIGN KEY ("x_account_id") REFERENCES "public"."x_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_slots" ADD CONSTRAINT "plan_slots_content_plan_id_content_plans_id_fk" FOREIGN KEY ("content_plan_id") REFERENCES "public"."content_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_slots_plan_position_idx" ON "plan_slots" USING btree ("content_plan_id","position");