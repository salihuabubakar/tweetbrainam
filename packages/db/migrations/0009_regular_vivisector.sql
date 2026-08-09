CREATE TYPE "public"."payment_provider" AS ENUM('paystack', 'flutterwave', 'stripe', 'lemonsqueezy');--> statement-breakpoint
CREATE TYPE "public"."plan_code" AS ENUM('free_beta', 'pro', 'team');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'past_due');--> statement-breakpoint
CREATE TYPE "public"."usage_metric" AS ENUM('draft_generated', 'plan_generated', 'post_published');--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_code" "plan_code" DEFAULT 'free_beta' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"payment_provider" "payment_provider",
	"provider_customer_id" text,
	"provider_subscription_id" text,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "usage_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"metric" "usage_metric" NOT NULL,
	"period" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usage_records_user_metric_period" UNIQUE("user_id","metric","period")
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;