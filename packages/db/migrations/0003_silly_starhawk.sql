CREATE TYPE "public"."analysis_failure_reason" AS ENUM('access_denied', 'rate_limited', 'connection_revoked', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."analysis_state" AS ENUM('idle', 'running', 'complete', 'failed');--> statement-breakpoint
ALTER TABLE "x_accounts" ADD COLUMN "analysis_state" "analysis_state" DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE "x_accounts" ADD COLUMN "analysis_failure_reason" "analysis_failure_reason";--> statement-breakpoint
ALTER TABLE "x_accounts" ADD COLUMN "analysis_updated_at" timestamp with time zone;