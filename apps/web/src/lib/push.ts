import { apiUrl } from "./api-url";

export type PushSupport =
  | { state: "unsupported" }
  | { state: "needs-install" }
  | { state: "blocked" }
  | { state: "ready"; permission: NotificationPermission };

export type EnablePushFailure =
  | "permission-denied"
  | "no-service-worker"
  | "subscribe-failed"
  | "server-rejected";

export type EnablePushResult = { ok: true } | { ok: false; reason: EnablePushFailure };

// Asset caching is opt-in through the script URL: in dev the Next chunks under
// /_next/static change on every edit, and a cache-first worker would serve stale
// ones and break HMR. Push needs a registered worker in dev all the same.
const SW_URL = process.env.NODE_ENV === "production" ? "/sw.js?assets=1" : "/sw.js";
const READY_TIMEOUT_MS = 10_000;

function isStandalone(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return "standalone" in navigator && Boolean((navigator as { standalone?: boolean }).standalone);
}

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function detectPushSupport(): PushSupport {
  if (typeof window === "undefined") return { state: "unsupported" };
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return isIos() && !isStandalone() ? { state: "needs-install" } : { state: "unsupported" };
  }

  if (Notification.permission === "denied") return { state: "blocked" };
  return { state: "ready", permission: Notification.permission };
}

export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.register(SW_URL).catch(() => undefined);
}

// navigator.serviceWorker.ready never settles when nothing is registered, so it
// can't be awaited before we know a registration exists.
async function activeRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  if (!(await navigator.serviceWorker.getRegistration())) {
    try {
      await navigator.serviceWorker.register(SW_URL);
    } catch {
      return null;
    }
  }

  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), READY_TIMEOUT_MS);
    }),
  ]);
}

function urlBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const raw = window.atob(padded.replace(/-/g, "+").replace(/_/g, "/"));

  const buffer = new ArrayBuffer(raw.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }

  return buffer;
}

export async function enablePush(publicKey: string): Promise<EnablePushResult> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "permission-denied" };

  const registration = await activeRegistration();
  if (!registration) return { ok: false, reason: "no-service-worker" };

  let subscription: PushSubscription;
  try {
    subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(publicKey),
      }));
  } catch {
    return { ok: false, reason: "subscribe-failed" };
  }

  const response = await fetch(`${apiUrl}/v1/notifications/subscribe`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });

  return response.ok ? { ok: true } : { ok: false, reason: "server-rejected" };
}

export async function disablePush(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  await fetch(`${apiUrl}/v1/notifications/unsubscribe`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });

  await subscription.unsubscribe();
}

export async function hasLocalSubscription(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;
  return (await registration.pushManager.getSubscription()) !== null;
}
