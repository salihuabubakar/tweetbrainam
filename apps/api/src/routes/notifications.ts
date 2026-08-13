import { zValidator } from "@hono/zod-validator";
import { pushSubscriptionInputSchema, unsubscribeInputSchema } from "@tweetbrainam/contracts";
import { Hono } from "hono";
import type { AppDeps } from "../deps";
import { env } from "../env";
import { requireUserId } from "../middleware/session";
import type { AppEnv } from "../types";

export function createNotificationRoutes(deps: AppDeps) {
  return new Hono<AppEnv>()
    .get("/v1/notifications", async (c) => {
      const userId = requireUserId(c.get("userId"));
      const subscriptions = await deps.notifications.listSubscriptions(userId);

      return c.json({
        enabled: Boolean(env.VAPID_PUBLIC_KEY),
        devices: subscriptions.length,
        endpoints: subscriptions.map((subscription) => subscription.endpoint),
      });
    })

    .post(
      "/v1/notifications/subscribe",
      zValidator("json", pushSubscriptionInputSchema),
      async (c) => {
        const userId = requireUserId(c.get("userId"));
        const { endpoint, keys } = c.req.valid("json");

        await deps.notifications.saveSubscription(userId, {
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        });

        return c.json({ ok: true }, 201);
      },
    )

    .post(
      "/v1/notifications/unsubscribe",
      zValidator("json", unsubscribeInputSchema),
      async (c) => {
        const userId = requireUserId(c.get("userId"));
        await deps.notifications.deleteSubscription(userId, c.req.valid("json").endpoint);
        return c.json({ ok: true });
      },
    );
}
