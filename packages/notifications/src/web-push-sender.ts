import type { PushSender } from "@tweetbrainam/core";
import webpush from "web-push";

const GONE_STATUS_CODES = [404, 410];

export type WebPushConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

export function createWebPushSender(config: WebPushConfig): PushSender {
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);

  return {
    async send(subscription, notification) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(notification),
          { TTL: 60 * 60 * 12 },
        );

        return { subscriptionId: subscription.id, outcome: "delivered" };
      } catch (cause) {
        const statusCode =
          typeof cause === "object" && cause !== null && "statusCode" in cause
            ? Number((cause as { statusCode: unknown }).statusCode)
            : 0;

        return {
          subscriptionId: subscription.id,
          outcome: GONE_STATUS_CODES.includes(statusCode) ? "expired" : "failed",
        };
      }
    },
  };
}

export function createNoopPushSender(): PushSender {
  return {
    async send(subscription) {
      return { subscriptionId: subscription.id, outcome: "failed" };
    },
  };
}
