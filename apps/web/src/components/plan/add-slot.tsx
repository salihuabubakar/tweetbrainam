"use client";

import { readApiError } from "@/lib/api-error";
import { apiUrl } from "@/lib/api-url";
import { useDurableState } from "@/lib/durable-state";
import type { PostFormatValue } from "@tweetbrainam/contracts";
import { Button, cn } from "@tweetbrainam/ui";
import { useState } from "react";

const DEFAULT_HOUR = "09:00";

function defaultDay(weekStart: string): string {
  return weekStart.slice(0, 10);
}

export function AddSlot({
  planId,
  weekStart,
  onAdded,
}: {
  planId: string;
  weekStart: string;
  onAdded: () => void;
}) {
  const {
    value: form,
    setValue: setForm,
    clear,
  } = useDurableState(`plan.add-slot.${planId}`, {
    topic: "",
    angle: "",
    format: "single" as PostFormatValue,
    day: defaultDay(weekStart),
    time: DEFAULT_HOUR,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    form.topic.trim().length >= 3 && form.angle.trim().length >= 10 && form.day && form.time;

  async function submit() {
    setIsBusy(true);
    setError(null);

    const targetAt = new Date(`${form.day}T${form.time}`);

    const response = await fetch(`${apiUrl}/v1/plans/${planId}/slots`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        topic: form.topic.trim(),
        angle: form.angle.trim(),
        format: form.format,
        targetAt: targetAt.toISOString(),
      }),
    });

    setIsBusy(false);
    if (!response.ok) {
      setError(await readApiError(response, "We couldn't add that."));
      return;
    }

    clear();
    setIsOpen(false);
    onAdded();
  }

  if (!isOpen) {
    return (
      <Button variant="outline" className="self-start" onClick={() => setIsOpen(true)}>
        Add a post to this week
      </Button>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <h2 className="font-medium text-sm">Add a post to this week</h2>

      <label className="flex flex-col gap-1 text-sm" htmlFor="add-slot-topic">
        Topic
        <input
          id="add-slot-topic"
          value={form.topic}
          placeholder="What the migration actually cost us"
          onChange={(event) => setForm({ ...form, topic: event.target.value })}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm" htmlFor="add-slot-angle">
        The point to make
        <textarea
          id="add-slot-angle"
          value={form.angle}
          rows={2}
          placeholder="Two days of downtime we could have avoided by reading the release notes"
          onChange={(event) => setForm({ ...form, angle: event.target.value })}
          className="rounded-md border border-border bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm" htmlFor="add-slot-day">
          Day
          <input
            id="add-slot-day"
            type="date"
            value={form.day}
            onChange={(event) => setForm({ ...form, day: event.target.value })}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm" htmlFor="add-slot-time">
          Time
          <input
            id="add-slot-time"
            type="time"
            value={form.time}
            onChange={(event) => setForm({ ...form, time: event.target.value })}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>

      <div className="flex gap-2">
        {(["single", "thread"] as PostFormatValue[]).map((format) => (
          <button
            key={format}
            type="button"
            aria-pressed={form.format === format}
            onClick={() => setForm({ ...form, format })}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              form.format === format
                ? "border-primary bg-accent"
                : "border-border hover:bg-accent/50",
            )}
          >
            {format === "single" ? "Single post" : "Thread"}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button disabled={!canSubmit || isBusy} onClick={submit}>
          {isBusy ? "Adding…" : "Add it"}
        </Button>
        <Button variant="ghost" disabled={isBusy} onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
      </div>
    </section>
  );
}
