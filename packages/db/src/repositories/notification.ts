import type { NotificationRepository } from "@tweetbrainam/core";
import { and, eq } from "drizzle-orm";
import type { Database } from "../client";
import { pushSubscriptions } from "../schema";

export function createNotificationRepository(db: Database): NotificationRepository {
  return {
    async listSubscriptions(userId) {
      return db
        .select({
          id: pushSubscriptions.id,
          endpoint: pushSubscriptions.endpoint,
          p256dh: pushSubscriptions.p256dh,
          auth: pushSubscriptions.auth,
          createdAt: pushSubscriptions.createdAt,
        })
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, userId));
    },

    async saveSubscription(userId, subscription) {
      await db
        .insert(pushSubscriptions)
        .values({
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        })
        .onConflictDoUpdate({
          target: pushSubscriptions.endpoint,
          set: { userId, p256dh: subscription.p256dh, auth: subscription.auth },
        });
    },

    async deleteSubscription(userId, endpoint) {
      await db
        .delete(pushSubscriptions)
        .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
    },

    async deleteSubscriptionById(subscriptionId) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscriptionId));
    },
  };
}
