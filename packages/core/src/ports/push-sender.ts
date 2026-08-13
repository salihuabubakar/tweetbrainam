import type { Notification, PushSubscription } from "../domain/notifications";

export type PushDelivery = {
  subscriptionId: string;
  outcome: "delivered" | "expired" | "failed";
};

export type PushSender = {
  send(subscription: PushSubscription, notification: Notification): Promise<PushDelivery>;
};
