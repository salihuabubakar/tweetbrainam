"use client";

import { apiUrl } from "@/lib/api-url";
import { cadenceOptions, goalOptions } from "@/lib/content-options";
import { useDurableState } from "@/lib/durable-state";
import type { ContentGoal } from "@tweetbrainam/contracts";
import { Button, cn } from "@tweetbrainam/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function GoalsStep() {
  const router = useRouter();
  const {
    value: goal,
    setValue: setGoal,
    clear: clearGoal,
  } = useDurableState<ContentGoal>("onboarding.goal", "build_in_public");
  const {
    value: postsPerWeek,
    setValue: setPostsPerWeek,
    clear: clearCadence,
  } = useDurableState("onboarding.posts-per-week", 5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);
    const response = await fetch(`${apiUrl}/v1/onboarding/goals`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        goal,
        postsPerWeek,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });
    if (!response.ok) {
      setError("We couldn't save your goals. Please try again.");
      setIsSubmitting(false);
      return;
    }
    clearGoal();
    clearCadence();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 font-medium text-sm">What are you here to do?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {goalOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={goal === option.value}
              onClick={() => setGoal(option.value)}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors",
                goal === option.value
                  ? "border-primary bg-accent"
                  : "border-border hover:bg-accent/50",
              )}
            >
              <span className="block font-medium text-sm">{option.label}</span>
              <span className="block text-muted-foreground text-xs">{option.description}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-medium text-sm">How much should we plan each week?</legend>
        <p className="mb-1 text-muted-foreground text-xs">
          Each piece is either a single tweet or a full thread — we choose whichever suits the idea,
          and you can change it. Your replies and spur-of-the-moment tweets aren't counted; those
          stay entirely yours.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {cadenceOptions.map((option) => (
            <button
              key={option.perWeek}
              type="button"
              aria-pressed={postsPerWeek === option.perWeek}
              onClick={() => setPostsPerWeek(option.perWeek)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left transition-colors",
                postsPerWeek === option.perWeek
                  ? "border-primary bg-accent"
                  : "border-border hover:bg-accent/50",
              )}
            >
              <span className="block font-medium text-sm">{option.perWeek} pieces a week</span>
              <span className="block text-muted-foreground text-xs">{option.hint}</span>
            </button>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          This is a baseline, not a limit. You can write extra posts any day you feel like it, and
          change this number later in Settings.
        </p>
      </fieldset>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <Button size="lg" disabled={isSubmitting} onClick={handleSubmit}>
        {isSubmitting ? "Saving…" : "Continue"}
      </Button>
    </div>
  );
}
