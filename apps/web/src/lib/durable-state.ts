"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const NAMESPACE = "tb:";
const WRITE_DEBOUNCE_MS = 250;

const storageKey = (key: string) => `${NAMESPACE}${key}`;

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

  useEffect(() => {
    const stored = readStored<T>(key);
    if (stored !== undefined) setValue(stored);
    setIsRestored(true);
  }, [key]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => writeStored(key, next), WRITE_DEBOUNCE_MS);
    },
    [key],
  );

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    clearDurableState(key);
    setValue(initial);
  }, [key, initial]);

  return { value, setValue: update, clear, isRestored };
}
