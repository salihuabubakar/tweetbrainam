import type { VoiceTraitsValue } from "@tweetbrainam/contracts";
import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";
import { xAccounts } from "./x-accounts";

export const voiceProfileSourceEnum = pgEnum("voice_profile_source", [
  "analysis",
  "user_edit",
  "refinement",
]);

export const voiceProfiles = pgTable(
  "voice_profiles",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    xAccountId: uuid("x_account_id")
      .notNull()
      .references(() => xAccounts.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    traits: jsonb("traits").$type<VoiceTraitsValue>().notNull(),
    topics: jsonb("topics").$type<string[]>().notNull(),
    sampleSentences: jsonb("sample_sentences").$type<string[]>().notNull(),
    source: voiceProfileSourceEnum("source").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    postsAnalyzed: integer("posts_analyzed").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("voice_profiles_account_version_unique").on(table.xAccountId, table.version),
    uniqueIndex("voice_profiles_one_active_per_account")
      .on(table.xAccountId)
      .where(sql`${table.isActive}`),
  ],
);

export type VoiceProfileRow = typeof voiceProfiles.$inferSelect;
export type NewVoiceProfileRow = typeof voiceProfiles.$inferInsert;
