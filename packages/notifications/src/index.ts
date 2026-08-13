import type { PushSender } from "@tweetbrainam/core";
import { createNoopPushSender, createWebPushSender } from "./web-push-sender";

export type PushKeys = {
  publicKey: string | undefined;
  privateKey: string | undefined;
  subject: string;
};

export function resolvePushSender(keys: PushKeys): PushSender | null {
  if (!keys.publicKey || !keys.privateKey) return null;

  return createWebPushSender({
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
    subject: keys.subject,
  });
}

export {
  createNoopPushSender,
  createWebPushSender,
  type WebPushConfig,
} from "./web-push-sender";
