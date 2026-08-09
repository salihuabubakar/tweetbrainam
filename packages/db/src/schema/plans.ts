import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";
import { xAccounts } from "./x-accounts";

export const planStatusEnum = pgEnum("plan_status", ["draft", "active", "completed"]);

export const slotStatusEnum = pgEnum("slot_status", [
  "empty",
  "drafting",
  "ready",
  "approved",
  "published",
  "skipped",
]);

export const postFormatEnum = pgEnum("post_format", ["single", "thread"]);

export const contentPlans = pgTable(
  "content_plans",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    xAccountId: uuid("x_account_id")
      .notNull()
      .references(() => xAccounts.id, { onDelete: "cascade" }),
    weekStart: date("week_start").notNull(),
    status: planStatusEnum("status").notNull().default("active"),
    rationale: text("rationale").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("content_plans_account_week_unique").on(table.xAccountId, table.weekStart)],
);

export const planSlots = pgTable(
  "plan_slots",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    contentPlanId: uuid("content_plan_id")
      .notNull()
      .references(() => contentPlans.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    format: postFormatEnum("format").notNull(),
    angle: text("angle").notNull(),
    targetAt: timestamp("target_at", { withTimezone: true }).notNull(),
    status: slotStatusEnum("status").notNull().default("empty"),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("plan_slots_plan_position_idx").on(table.contentPlanId, table.position)],
);

export type ContentPlanRow = typeof contentPlans.$inferSelect;
export type PlanSlotRow = typeof planSlots.$inferSelect;
