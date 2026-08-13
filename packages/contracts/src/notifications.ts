import { z } from "zod";

export const notificationKindSchema = z.enum(["week_planned", "draft_ready", "publish_failed"]);

export const pushSubscriptionInputSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(255),
    auth: z.string().min(1).max(255),
  }),
});

export const unsubscribeInputSchema = z.object({
  endpoint: z.string().url().max(2000),
});

export const notificationPayloadSchema = z.object({
  kind: notificationKindSchema,
  title: z.string(),
  body: z.string(),
  url: z.string(),
});

export type NotificationKindValue = z.infer<typeof notificationKindSchema>;
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionInputSchema>;
export type UnsubscribeInput = z.infer<typeof unsubscribeInputSchema>;
export type NotificationPayload = z.infer<typeof notificationPayloadSchema>;
