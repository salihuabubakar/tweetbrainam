ALTER TYPE "public"."plan_code" ADD VALUE 'trial' BEFORE 'free_beta';--> statement-breakpoint
ALTER TYPE "public"."subscription_status" ADD VALUE 'trialing' BEFORE 'active';--> statement-breakpoint
ALTER TYPE "public"."subscription_status" ADD VALUE 'expired' BEFORE 'canceled';--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "trial_ends_at" timestamp with time zone;
