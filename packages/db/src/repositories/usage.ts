import type { UsageMetric, UsageRepository } from "@tweetbrainam/core";
import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../client";
import { subscriptions, usageRecords } from "../schema";

export function createUsageRepository(db: Database): UsageRepository {
  return {
    async findPlanCode(userId) {
      const rows = await db
        .select({ planCode: subscriptions.planCode })
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1);
      return rows[0]?.planCode ?? "free_beta";
    },

    async countUsage(userId, metric, period) {
      const rows = await db
        .select({ quantity: usageRecords.quantity })
        .from(usageRecords)
        .where(
          and(
            eq(usageRecords.userId, userId),
            eq(usageRecords.metric, metric),
            eq(usageRecords.period, period),
          ),
        )
        .limit(1);
      return rows[0]?.quantity ?? 0;
    },

    async countUsageByMetric(userId, period) {
      const rows = await db
        .select({ metric: usageRecords.metric, quantity: usageRecords.quantity })
        .from(usageRecords)
        .where(and(eq(usageRecords.userId, userId), eq(usageRecords.period, period)));

      const counts: Record<UsageMetric, number> = {
        draft_generated: 0,
        plan_generated: 0,
        post_published: 0,
      };
      for (const row of rows) counts[row.metric] = row.quantity;
      return counts;
    },

    async recordUsage(userId, metric, period, quantity) {
      await db
        .insert(usageRecords)
        .values({ userId, metric, period, quantity })
        .onConflictDoUpdate({
          target: [usageRecords.userId, usageRecords.metric, usageRecords.period],
          set: { quantity: sql`${usageRecords.quantity} + ${quantity}` },
        });
    },
  };
}
