"use client";

import { apiUrl } from "@/lib/api-url";
import { cadenceOptions, goalOptions } from "@/lib/content-options";
import { useDurableState } from "@/lib/durable-state";
import type { ContentGoal, SettingsSummaryValue } from "@tweetbrainam/contracts";
import { Button, cn } from "@tweetbrainam/ui";
import { useState } from "react";

type Cadence = SettingsSummaryValue["cadence"];

const optionClass = (selected: boolean) =>
  cn(
    "rounded-lg border p-4 text-left transition-colors",
    selected ? "border-primary bg-accent" : "border-border hover:bg-accent/50",
  );

export function CadenceForm({ cadence, onSaved }: { cadence: Cadence; onSaved: () => void }) {
  const {
    value: goal,
    setValue: setGoal,
    clear: clearGoal,
  } = useDurableState<ContentGoal>("settings.goal", cadence.goal ?? "build_in_public");
  const {
    value: postsPerWeek,
    setValue: setPostsPerWeek,
    clear: clearCadence,
  } = useDurableState("settings.posts-per-week", cadence.postsPerWeek);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const isDirty = goal !== cadence.goal || postsPerWeek !== cadence.postsPerWeek;
  const cadenceChanged = postsPerWeek !== cadence.postsPerWeek;

  async function handleSave() {
    setIsSaving(true);
    setStatus("idle");

    const response = await fetch(`${apiUrl}/v1/settings/preferences`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        goal,
        postsPerWeek,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });

    setIsSaving(false);
    if (!response.ok) {
      setStatus("error");
      return;
    }
    clearGoal();
    clearCadence();
    setStatus("saved");
    onSaved();
  }

  return (
    <section className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 font-medium text-sm">What are you here to do?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {goalOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={goal === option.value}
              onClick={() => setGoal(option.value)}
              className={optionClass(goal === option.value)}
            >
              <span className="block font-medium text-sm">{option.label}</span>
              <span className="block text-muted-foreground text-xs">{option.description}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-medium text-sm">How much should we plan each week?</legend>
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
      </fieldset>

      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-xs">
          Posting times: {cadence.timezone}. We keep your existing plan for this week — the new
          rhythm starts with next Sunday's plan.
        </p>

        {cadenceChanged ? (
          <p className="text-muted-foreground text-xs">
            Changing the number resets your posting times, so we'll work them out again from when
            you actually post.
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <Button disabled={!isDirty || isSaving} onClick={handleSave}>
          {isSaving ? "Saving…" : "Save changes"}
        </Button>
        {status === "saved" && !isDirty ? (
          <span className="text-muted-foreground text-sm">Saved.</span>
        ) : null}
        {status === "error" ? (
          <span role="alert" className="text-destructive text-sm">
            We couldn't save that. Try again.
          </span>
        ) : null}
      </div>
    </section>
  );
}
