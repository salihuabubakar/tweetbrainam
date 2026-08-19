"use client";

import {
  type EnablePushFailure,
  type PushSupport,
  detectPushSupport,
  disablePush,
  enablePush,
  hasLocalSubscription,
} from "@/lib/push";
import { Button } from "@tweetbrainam/ui";
import { useEffect, useState } from "react";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

const explanations: Record<PushSupport["state"], string> = {
  unsupported: "This browser can't show notifications. Try Chrome, Edge or Firefox.",
  "needs-install":
    "On iPhone and iPad, notifications only work once TweetBrainam is on your Home Screen. Tap Share, then Add to Home Screen, and open it from there.",
  blocked:
    "You've blocked notifications for this site. Your browser's site settings are the only place that can undo it.",
  ready: "We'll tell you when your week is planned and when a draft is waiting. Nothing else.",
};

const failures: Record<EnablePushFailure, string> = {
  "permission-denied": "Your browser didn't grant permission, so nothing was turned on.",
  "no-service-worker":
    "The background worker that receives notifications didn't start. Reload the page and try again.",
  "subscribe-failed":
    "Your browser refused the subscription. This usually means the notification key on this deployment is wrong.",
  "server-rejected": "We couldn't save this device. Try again in a moment.",
};

export function NotificationsCard() {
  const [support, setSupport] = useState<PushSupport | null>(null);
  const [isOn, setIsOn] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupport(detectPushSupport());
    void hasLocalSubscription().then(setIsOn);
  }, []);

  async function turnOn() {
    setIsBusy(true);
    setError(null);

    const result = await enablePush(publicKey);
    setIsBusy(false);

    if (!result.ok) {
      setError(failures[result.reason]);
      setSupport(detectPushSupport());
      return;
    }

    setIsOn(true);
  }

  async function turnOff() {
    setIsBusy(true);
    await disablePush();
    setIsBusy(false);
    setIsOn(false);
  }

  if (!support) return null;

  const canToggle = support.state === "ready" && publicKey.length > 0;

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-medium text-sm">Notifications</h2>
        <p className="text-muted-foreground text-sm">
          {publicKey.length === 0
            ? "Notifications aren't configured on this deployment."
            : explanations[support.state]}
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      {canToggle ? (
        <Button
          variant={isOn ? "outline" : "primary"}
          className="self-start"
          disabled={isBusy}
          onClick={isOn ? turnOff : turnOn}
        >
          {isBusy ? "Working…" : isOn ? "Turn off on this device" : "Turn on notifications"}
        </Button>
      ) : null}

      {isOn ? (
        <p className="text-muted-foreground text-xs">
          On for this device. Turn it on separately on your phone or laptop.
        </p>
      ) : null}
    </section>
  );
}
