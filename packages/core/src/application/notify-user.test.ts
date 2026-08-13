import { describe, expect, it } from "vitest";
import {
  type PushSubscription,
  draftReadyNotification,
  weekPlannedNotification,
} from "../domain/notifications";
import type { NotificationRepository } from "../ports/notification-repository";
import type { PushDelivery, PushSender } from "../ports/push-sender";
import { notifyUser } from "./notify-user";

const subscription = (id: string): PushSubscription => ({
  id,
  endpoint: `https://push.example/${id}`,
  p256dh: "key",
  auth: "auth",
  createdAt: new Date("2026-08-01T00:00:00Z"),
});

function makeDeps(options: { devices?: string[]; outcomes?: PushDelivery["outcome"][] } = {}) {
  const devices = options.devices ?? ["s1"];
  const deleted: string[] = [];
  let call = 0;

  const notifications = {
    listSubscriptions: async () => devices.map(subscription),
    deleteSubscriptionById: async (id: string) => {
      deleted.push(id);
    },
  } as unknown as NotificationRepository;

  const push: PushSender = {
    send: async (sub) => {
      const outcome = options.outcomes?.[call] ?? "delivered";
      call += 1;
      return { subscriptionId: sub.id, outcome };
    },
  };

  return { deps: { notifications, push }, deleted };
}

describe("notifyUser", () => {
  it("sends to every device the person has registered", async () => {
    const { deps } = makeDeps({ devices: ["phone", "laptop"] });

    const result = await notifyUser(deps, {
      userId: "u1",
      notification: weekPlannedNotification(4),
    });

    expect(result.delivered).toBe(2);
  });

  it("forgets a subscription the push service says is gone", async () => {
    const { deps, deleted } = makeDeps({ devices: ["stale"], outcomes: ["expired"] });

    const result = await notifyUser(deps, {
      userId: "u1",
      notification: draftReadyNotification("Shipping"),
    });

    expect(result.expired).toBe(1);
    expect(deleted).toEqual(["stale"]);
  });

  it("keeps a subscription that merely failed to deliver", async () => {
    const { deps, deleted } = makeDeps({ devices: ["flaky"], outcomes: ["failed"] });

    const result = await notifyUser(deps, {
      userId: "u1",
      notification: draftReadyNotification("Shipping"),
    });

    expect(result.failed).toBe(1);
    expect(deleted).toEqual([]);
  });

  it("keeps sending to the other devices when one fails", async () => {
    const { deps } = makeDeps({
      devices: ["phone", "laptop"],
      outcomes: ["failed", "delivered"],
    });

    const result = await notifyUser(deps, {
      userId: "u1",
      notification: weekPlannedNotification(3),
    });

    expect(result).toEqual({ delivered: 1, expired: 0, failed: 1 });
  });

  it("does nothing when nobody has turned notifications on", async () => {
    const { deps } = makeDeps({ devices: [] });

    const result = await notifyUser(deps, {
      userId: "u1",
      notification: weekPlannedNotification(4),
    });

    expect(result).toEqual({ delivered: 0, expired: 0, failed: 0 });
  });
});

describe("notification copy", () => {
  it("does not say 1 posts", () => {
    expect(weekPlannedNotification(1).body).toContain("One post");
    expect(weekPlannedNotification(4).body).toContain("4 posts");
  });

  it("falls back gracefully when a draft has no topic", () => {
    expect(draftReadyNotification(null).body).not.toContain("null");
  });
});
