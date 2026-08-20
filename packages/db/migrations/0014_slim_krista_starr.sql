ALTER TYPE "public"."publish_failure_reason" ADD VALUE 'trial_expired' BEFORE 'unknown';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tour_completed_at" timestamp with time zone;