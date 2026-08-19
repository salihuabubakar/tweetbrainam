"use client";

import { useToast } from "@/components/shared/toast";
import { readApiError } from "@/lib/api-error";
import { apiUrl } from "@/lib/api-url";
import { useDurableState } from "@/lib/durable-state";
import type { PostFormatValue } from "@tweetbrainam/contracts";
import { Button, cn } from "@tweetbrainam/ui";
import { useState } from "react";

const emptyDraft = {
  topic: "",
  angle: "",
  format: "single" as PostFormatValue,
};

export function ComposeDraft({ onQueued }: { onQueued: () => void }) {
  const toast = useToast();
  const { value: form, setValue: setForm, clear } = useDurableState("drafts.compose", emptyDraft);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = form.topic.trim().length >= 3 && form.angle.trim().length >= 10;

  async function submit() {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch(`${apiUrl}/v1/drafts`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        topic: form.topic.trim(),
        angle: form.angle.trim(),
        format: form.format,
      }),
    });

    if (!response.ok) {
      setIsSubmitting(false);
      setError(await readApiError(response, "We couldn't start that draft. Try again."));
      return;
    }

    toast({
      message: "Writing it now — it'll appear under Needs review in a few seconds.",
    });

    clear();
    setIsOpen(false);
    setIsSubmitting(false);
    onQueued();
  }

  if (!isOpen) {
    return (
      <Button variant="outline" className="self-start" onClick={() => setIsOpen(true)}>
        Write something
      </Button>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-medium text-sm">Write something</h2>
        <p className="text-muted-foreground text-sm">
          Outside this week's plan. We'll write it in your voice and put it in your review queue —
          it doesn't count against your weekly rhythm.
        </p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm" htmlFor="compose-topic">
        What's it about?
        <input
          id="compose-topic"
          value={form.topic}
          placeholder="Why we moved off serverless"
          onChange={(event) => setForm({ ...form, topic: event.target.value })}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm" htmlFor="compose-angle">
        What's the point you want to make?
        <textarea
          id="compose-angle"
          value={form.angle}
          rows={3}
          placeholder="The cold starts were fine — it was the local dev story that killed it"
          onChange={(event) => setForm({ ...form, angle: event.target.value })}
          className="rounded-md border border-border bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm">Shape</legend>
        <div className="flex gap-2">
          {(["single", "thread"] as PostFormatValue[]).map((format) => (
            <button
              key={format}
              type="button"
              aria-pressed={form.format === format}
              onClick={() => setForm({ ...form, format })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                form.format === format
                  ? "border-primary bg-accent"
                  : "border-border hover:bg-accent/50",
              )}
            >
              {format === "single" ? "Single post" : "Thread"}
            </button>
          ))}
        </div>
      </fieldset>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button disabled={!canSubmit || isSubmitting} onClick={submit}>
          {isSubmitting ? "Starting…" : "Write it"}
        </Button>
        <span className="self-center text-muted-foreground text-xs">
          It appears in your queue as it's written.
        </span>
        <Button variant="ghost" disabled={isSubmitting} onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
      </div>
    </section>
  );
}
