"use client";

import { useDurableState } from "@/lib/durable-state";
import type { TrialState } from "@/lib/session";
import { cn } from "@tweetbrainam/ui";
import Link from "next/link";

const WARN_FROM_DAYS = 3;

export function TrialBanner({ trial }: { trial: TrialState }) {
  const { value: dismissedAt, setValue: dismiss } = useDurableState<number | null>(
    "trial.dismissed-days",
    null,
  );

  if (trial.planCode !== "trial") return null;

  const isEndingSoon = !trial.isExpired && trial.daysRemaining <= WARN_FROM_DAYS;
  if (!trial.isExpired && !isEndingSoon) return null;
  if (isEndingSoon && dismissedAt === trial.daysRemaining) return null;

  const message = trial.isExpired
    ? "Your trial has ended. Everything you made is still here to read, but new drafts and posts are paused."
    : trial.daysRemaining === 1
      ? "Last day of your trial."
      : `${trial.daysRemaining} days left in your trial.`;

  return (
    <div
      role={trial.isExpired ? "alert" : undefined}
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 text-sm sm:px-6",
        trial.isExpired
          ? "border-destructive/40 bg-destructive/10 text-foreground"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      <span>{message}</span>

      <Link href="/settings" className="font-medium underline underline-offset-4">
        {trial.isExpired ? "See what you have" : "See your usage"}
      </Link>

      {isEndingSoon ? (
        <button
          type="button"
          onClick={() => dismiss(trial.daysRemaining)}
          className="ml-auto text-muted-foreground text-xs hover:text-foreground"
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
