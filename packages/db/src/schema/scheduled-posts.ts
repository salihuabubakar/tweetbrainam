import { index, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";
import { drafts } from "./drafts";
import { xAccounts } from "./x-accounts";

export const publishStatusEnum = pgEnum("publish_status", [
  "scheduled",
  "publishing",
  "published",
  "failed",
  "canceled",
]);

export const publishFailureReasonEnum = pgEnum("publish_failure_reason", [
  "connection_revoked",
  "rate_limited",
  "duplicate_content",
  "content_rejected",
  "trial_expired",
  "unknown",
]);

export const scheduledPosts = pgTable(
  "scheduled_posts",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => drafts.id, { onDelete: "cascade" }),
    xAccountId: uuid("x_account_id")
      .notNull()
      .references(() => xAccounts.id, { onDelete: "cascade" }),
    publishAt: timestamp("publish_at", { withTimezone: true }).notNull(),
    idempotencyKey: uuid("idempotency_key").notNull().$defaultFn(uuidv7),
    status: publishStatusEnum("status").notNull().default("scheduled"),
    xPostIds: text("x_post_ids").array(),
    failureReason: publishFailureReasonEnum("failure_reason"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    triggerRunId: text("trigger_run_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("scheduled_posts_draft_unique").on(table.draftId),
    unique("scheduled_posts_idempotency_unique").on(table.idempotencyKey),
    index("scheduled_posts_due_idx").on(table.status, table.publishAt),
    index("scheduled_posts_account_idx").on(table.xAccountId, table.publishAt),
  ],
);

export type ScheduledPostRow = typeof scheduledPosts.$inferSelect;
