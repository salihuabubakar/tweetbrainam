"use client";

import { cn } from "@tweetbrainam/ui";
import Link from "next/link";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type ToastTone = "success" | "error";

export type ToastInput = {
  message: string;
  tone?: ToastTone;
  action?: { label: string; href: string };
};

type Toast = ToastInput & { id: number; tone: ToastTone };

// Long enough to read a sentence and reach the link, short enough not to linger.
const DISMISS_AFTER_MS = 6000;
const DISMISS_WITH_ACTION_MS = 9000;

const ToastContext = createContext<((input: ToastInput) => void) | null>(null);

export function useToast(): (input: ToastInput) => void {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside ToastProvider.");
  return show;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((input: ToastInput) => {
    nextId.current += 1;
    const id = nextId.current;
    setToasts((current) => [...current, { ...input, tone: input.tone ?? "success", id }]);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+5rem)] sm:items-end sm:px-6 sm:pb-6"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, toast.action ? DISMISS_WITH_ACTION_MS : DISMISS_AFTER_MS);
    return () => clearTimeout(timer);
  }, [onDismiss, toast.action]);

  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-4 py-3 shadow-lg",
        toast.tone === "error"
          ? "border-destructive/40 bg-card text-foreground"
          : "border-border bg-card text-foreground",
      )}
    >
      <p className="flex-1 text-sm leading-relaxed">{toast.message}</p>

      {toast.action ? (
        <Link
          href={toast.action.href}
          onClick={onDismiss}
          className="shrink-0 font-medium text-sm underline underline-offset-4"
        >
          {toast.action.label}
        </Link>
      ) : null}

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 text-muted-foreground text-sm hover:text-foreground"
      >
        ×
      </button>
    </div>
  );
}
