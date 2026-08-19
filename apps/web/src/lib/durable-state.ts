"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const NAMESPACE = "tb:";
const WRITE_DEBOUNCE_MS = 250;

const storageKey = (key: string) => `${NAMESPACE}${key}`;

// The browser's own storage event only fires in *other* tabs, so two components
// sharing a key in this tab would never see each other's writes. Every hook
// instance subscribes here instead.
type Listener = (value: unknown) => void;

const listeners = new Map<string, Set<Listener>>();

function subscribe(key: string, listener: Listener): () => void {
  const forKey = listeners.get(key) ?? new Set<Listener>();
  forKey.add(listener);
  listeners.set(key, forKey);

  return () => {
    forKey.delete(listener);
    if (forKey.size === 0) listeners.delete(key);
  };
}

function broadcast(key: string, value: unknown, origin: Listener | null): void {
  const forKey = listeners.get(key);
  if (!forKey) return;
  for (const listener of forKey) {
    if (listener !== origin) listener(value);
  }
}

function readStored<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(storageKey(key));
    return raw === null ? undefined : (JSON.parse(raw) as T);
  } catch {
    return undefined;
  }
}

function writeStored<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(value));
  } catch {
    return;
  }
}

export function clearDurableState(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(key));
  } catch {
    return;
  }
}

export function clearAllDurableState(): void {
  if (typeof window === "undefined") return;
  try {
    const keys = Object.keys(window.localStorage).filter((key) => key.startsWith(NAMESPACE));
    for (const key of keys) window.localStorage.removeItem(key);
  } catch {
    return;
  }
}

export type DurableState<T> = {
  value: T;
  setValue: (next: T) => void;
  clear: () => void;
  isRestored: boolean;
};

export function useDurableState<T>(key: string, initial: T): DurableState<T> {
  const [value, setValue] = useState<T>(initial);
  const [isRestored, setIsRestored] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listener = useRef<Listener | null>(null);

  useEffect(() => {
    const stored = readStored<T>(key);
    if (stored !== undefined) setValue(stored);
    setIsRestored(true);
  }, [key]);

  useEffect(() => {
    const receive: Listener = (next) => setValue(next as T);
    listener.current = receive;
    const unsubscribe = subscribe(key, receive);

    return () => {
      unsubscribe();
      listener.current = null;
    };
  }, [key]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      // Peers update now; only the disk write is debounced.
      broadcast(key, next, listener.current);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => writeStored(key, next), WRITE_DEBOUNCE_MS);
    },
    [key],
  );

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    clearDurableState(key);
    setValue(initial);
    broadcast(key, initial, listener.current);
  }, [key, initial]);

  return { value, setValue: update, clear, isRestored };
}
