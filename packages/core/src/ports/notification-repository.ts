import type { NewPushSubscription, PushSubscription } from "../domain/notifications";

export type NotificationRepository = {
  listSubscriptions(userId: string): Promise<PushSubscription[]>;
  saveSubscription(userId: string, subscription: NewPushSubscription): Promise<void>;
  deleteSubscription(userId: string, endpoint: string): Promise<void>;
  deleteSubscriptionById(subscriptionId: string): Promise<void>;
};
