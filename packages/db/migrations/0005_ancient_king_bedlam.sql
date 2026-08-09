CREATE TYPE "public"."voice_profile_source" AS ENUM('analysis', 'user_edit', 'refinement');--> statement-breakpoint
CREATE TABLE "voice_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"x_account_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"traits" jsonb NOT NULL,
	"topics" jsonb NOT NULL,
	"sample_sentences" jsonb NOT NULL,
	"source" "voice_profile_source" NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"posts_analyzed" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voice_profiles_account_version_unique" UNIQUE("x_account_id","version")
);
--> statement-breakpoint
ALTER TABLE "voice_profiles" ADD CONSTRAINT "voice_profiles_x_account_id_x_accounts_id_fk" FOREIGN KEY ("x_account_id") REFERENCES "public"."x_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "voice_profiles_one_active_per_account" ON "voice_profiles" USING btree ("x_account_id") WHERE "voice_profiles"."is_active";