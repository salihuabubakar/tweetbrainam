import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";
import { planSlots } from "./plans";
import { xAccounts } from "./x-accounts";

export const draftStatusEnum = pgEnum("draft_status", [
  "generating",
  "needs_review",
  "approved",
  "rejected",
  "archived",
  "failed",
]);

export const draftAuthorEnum = pgEnum("draft_author", ["ai", "user"]);

export const learningSignalTypeEnum = pgEnum("learning_signal_type", [
  "edit_diff",
  "rejection",
  "regeneration_note",
]);

export type DraftSegments = { text: string }[];

export const drafts = pgTable(
  "drafts",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    xAccountId: uuid("x_account_id")
      .notNull()
      .references(() => xAccounts.id, { onDelete: "cascade" }),
    planSlotId: uuid("plan_slot_id").references(() => planSlots.id, { onDelete: "set null" }),
    status: draftStatusEnum("status").notNull().default("generating"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("drafts_account_status_idx").on(table.xAccountId, table.status)],
);

export const draftVersions = pgTable(
  "draft_versions",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => drafts.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    segments: jsonb("segments").$type<DraftSegments>().notNull(),
    author: draftAuthorEnum("author").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("draft_versions_draft_version_unique").on(table.draftId, table.version)],
);

export const learningSignals = pgTable(
  "learning_signals",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    xAccountId: uuid("x_account_id")
      .notNull()
      .references(() => xAccounts.id, { onDelete: "cascade" }),
    draftId: uuid("draft_id").references(() => drafts.id, { onDelete: "cascade" }),
    type: learningSignalTypeEnum("type").notNull(),
    payload: jsonb("payload").notNull(),
    processed: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("learning_signals_account_idx").on(table.xAccountId)],
);

export type DraftRow = typeof drafts.$inferSelect;
export type DraftVersionRow = typeof draftVersions.$inferSelect;
