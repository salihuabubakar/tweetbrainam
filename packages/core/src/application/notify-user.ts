import type { Notification } from "../domain/notifications";
import type { NotificationRepository } from "../ports/notification-repository";
import type { PushSender } from "../ports/push-sender";

export type NotifyUserDeps = {
  notifications: NotificationRepository;
  push: PushSender;
};

export type NotifyUserOutput = {
  delivered: number;
  expired: number;
  failed: number;
};

export async function notifyUser(
  deps: NotifyUserDeps,
  input: { userId: string; notification: Notification },
): Promise<NotifyUserOutput> {
  const subscriptions = await deps.notifications.listSubscriptions(input.userId);
  const result: NotifyUserOutput = { delivered: 0, expired: 0, failed: 0 };

  for (const subscription of subscriptions) {
    const delivery = await deps.push.send(subscription, input.notification);

    if (delivery.outcome === "expired") {
      await deps.notifications.deleteSubscriptionById(subscription.id);
      result.expired += 1;
      continue;
    }

    if (delivery.outcome === "failed") {
      result.failed += 1;
      continue;
    }

    result.delivered += 1;
  }

  return result;
}
