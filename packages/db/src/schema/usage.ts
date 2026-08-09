import { integer, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";
import { users } from "./users";

export const planCodeEnum = pgEnum("plan_code", ["free_beta", "pro", "team"]);

export const usageMetricEnum = pgEnum("usage_metric", [
  "draft_generated",
  "plan_generated",
  "post_published",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
]);

export const paymentProviderEnum = pgEnum("payment_provider", [
  "paystack",
  "flutterwave",
  "stripe",
  "lemonsqueezy",
]);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planCode: planCodeEnum("plan_code").notNull().default("free_beta"),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    paymentProvider: paymentProviderEnum("payment_provider"),
    providerCustomerId: text("provider_customer_id"),
    providerSubscriptionId: text("provider_subscription_id"),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("subscriptions_user_unique").on(table.userId)],
);

export const usageRecords = pgTable(
  "usage_records",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    metric: usageMetricEnum("metric").notNull(),
    period: text("period").notNull(),
    quantity: integer("quantity").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("usage_records_user_metric_period").on(table.userId, table.metric, table.period),
  ],
);

export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type UsageRecordRow = typeof usageRecords.$inferSelect;
