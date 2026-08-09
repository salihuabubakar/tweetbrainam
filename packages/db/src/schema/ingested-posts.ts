import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";
import { xAccounts } from "./x-accounts";

export const ingestedPostTypeEnum = pgEnum("ingested_post_type", ["post", "reply", "quote"]);

export const ingestedPostSourceEnum = pgEnum("ingested_post_source", ["x_api", "manual"]);

export type IngestedPostMetrics = {
  likes: number;
  replies: number;
  reposts: number;
  impressions: number | null;
};

export const ingestedPosts = pgTable(
  "ingested_posts",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    xAccountId: uuid("x_account_id")
      .notNull()
      .references(() => xAccounts.id, { onDelete: "cascade" }),
    xPostId: text("x_post_id").notNull(),
    type: ingestedPostTypeEnum("type").notNull(),
    text: text("text").notNull(),
    source: ingestedPostSourceEnum("source").notNull().default("x_api"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    metricsAtIngest: jsonb("metrics_at_ingest").$type<IngestedPostMetrics>(),
    characterCount: integer("character_count").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("ingested_posts_account_post_unique").on(table.xAccountId, table.xPostId),
    index("ingested_posts_account_posted_at_idx").on(table.xAccountId, table.postedAt),
    index("ingested_posts_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ],
);

export type IngestedPostRow = typeof ingestedPosts.$inferSelect;
export type NewIngestedPostRow = typeof ingestedPosts.$inferInsert;
