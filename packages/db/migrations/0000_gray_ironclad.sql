CREATE TYPE "public"."onboarding_step" AS ENUM('consent', 'analyzing', 'voice', 'goals', 'plan', 'first_draft', 'done');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."connection_status" AS ENUM('connected', 'token_expired', 'revoked', 'rate_limited');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"onboarding_step" "onboarding_step" DEFAULT 'consent' NOT NULL,
	"preferences" jsonb,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "x_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"x_user_id" text NOT NULL,
	"handle" text NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"access_token_enc" "bytea" NOT NULL,
	"refresh_token_enc" "bytea" NOT NULL,
	"token_expires_at" timestamp with time zone NOT NULL,
	"scopes" text[] NOT NULL,
	"connection_status" "connection_status" DEFAULT 'connected' NOT NULL,
	"last_ingested_post_id" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "x_accounts_x_user_id_unique" UNIQUE("x_user_id")
);
--> statement-breakpoint
ALTER TABLE "x_accounts" ADD CONSTRAINT "x_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "x_accounts_user_id_idx" ON "x_accounts" USING btree ("user_id");