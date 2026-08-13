export const notificationKinds = ["week_planned", "draft_ready", "publish_failed"] as const;

export type NotificationKind = (typeof notificationKinds)[number];

export type PushSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: Date;
};

export type NewPushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type Notification = {
  kind: NotificationKind;
  title: string;
  body: string;
  url: string;
};

export function weekPlannedNotification(slots: number): Notification {
  return {
    kind: "week_planned",
    title: "Your week is planned",
    body:
      slots === 1
        ? "One post is ready for you to look at."
        : `${slots} posts are lined up. Have a look before Monday.`,
    url: "/plan",
  };
}

export function draftReadyNotification(topic: string | null): Notification {
  return {
    kind: "draft_ready",
    title: "A draft is waiting",
    body: topic ? `"${topic}" is written and ready for your review.` : "Written in your voice.",
    url: "/drafts",
  };
}

export function publishFailedNotification(reason: string): Notification {
  return {
    kind: "publish_failed",
    title: "A post didn't go out",
    body: reason,
    url: "/today",
  };
}
