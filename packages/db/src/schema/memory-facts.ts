import { index, pgEnum, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";
import { users } from "./users";

export const memoryCategoryEnum = pgEnum("memory_category", [
  "project",
  "audience",
  "expertise",
  "goal",
  "opinion",
  "preference",
]);

export const memorySourceEnum = pgEnum("memory_source", ["extracted", "user_provided"]);

export const memoryStatusEnum = pgEnum("memory_status", ["active", "archived"]);

export const memoryFacts = pgTable(
  "memory_facts",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: memoryCategoryEnum("category").notNull(),
    content: text("content").notNull(),
    confidence: real("confidence").notNull().default(1),
    source: memorySourceEnum("source").notNull(),
    status: memoryStatusEnum("status").notNull().default("active"),
    sourcePostIds: uuid("source_post_ids").array(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("memory_facts_user_status_idx").on(table.userId, table.status)],
);

export type MemoryFactRow = typeof memoryFacts.$inferSelect;
