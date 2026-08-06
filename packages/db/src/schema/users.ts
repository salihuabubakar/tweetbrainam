import type { UserPreferences } from "@tweetbrainam/contracts";
import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";

export const onboardingStepEnum = pgEnum("onboarding_step", [
  "consent",
  "analyzing",
  "voice",
  "goals",
  "plan",
  "first_draft",
  "done",
]);

export const userStatusEnum = pgEnum("user_status", ["active", "suspended", "deleted"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  email: text("email").unique(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  onboardingStep: onboardingStepEnum("onboarding_step").notNull().default("consent"),
  preferences: jsonb("preferences").$type<UserPreferences>(),
  status: userStatusEnum("status").notNull().default("active"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
